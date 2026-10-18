const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const tokenA = 'a'.repeat(64), tokenB = 'b'.repeat(64);
function backend() {
  let now = Date.parse('2026-10-18T12:00:00Z'), locked = false, busy = false, fail = false, writes = 0, onLock;
  const tables = {};
  const ctx = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-book' }) },
    Utilities: { DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }, computeDigest: (_a, value) => Array.from(crypto.createHash('sha256').update(value).digest()) },
    LockService: { getScriptLock: () => ({ tryLock() { if (busy || locked) return false; locked = true; onLock?.(); return true; }, releaseLock() { locked = false; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => tables[name] }), flush() { if (fail) throw new Error('Storage failure'); } },
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  });
  vm.runInContext(source, ctx);
  const headers = vm.runInContext('JSON.parse(JSON.stringify(RSVP))', ctx);
  function table(values) {
    return { values, getDataRange: () => ({ getValues: () => values.map(row => [...row]) }), getRange(row, _col, _n, width) { return { setValues(rows) { if (fail) throw new Error('Storage failure'); assert.equal(rows[0].length, width); values[row - 1] = [...rows[0]]; writes++; } }; } };
  }
  tables.Invitations = table([headers.invitationHeaders, ['invite-a', digest(tokenA), true], ['invite-b', digest(tokenB), true]]);
  tables.Guests = table([headers.guestHeaders,
    ['invite-a', 'guest-a1', 'Testgjest én', '', '', '', '', '', 'Ikke svart', '', 0, '', ''],
    ['invite-a', 'guest-a2', 'Testgjest to', '', '', '', '', '', 'Ikke svart', '', 0, '', ''],
    ['invite-b', 'guest-b1', 'Testgjest tre', '', '', '', '', '', 'Ikke svart', '', 0, '', '']]);
  return { api: ctx, tables, setTime(value) { now = Date.parse(value); }, setOnLock(fn) { onLock = fn; }, setBusy(value) { busy = value; }, failStorage(value) { fail = value; }, get writes() { return writes; }, get locked() { return locked; } };
}
function answer(overrides = {}) { return { guestId: 'guest-a1', revision: 0, requestId: '1'.repeat(32), wedding: 'Ja', friday: 'Ja', allergies: 'Nøtter', accommodation: 'Ja', drinkPackage: 'Med alkohol', ...overrides }; }

test('drink packages persist, change and clear without exposing or overwriting invitation links', () => {
  const b = backend();
  b.tables.Guests.values[1][13] = 'private-link';
  assert.equal(b.api.saveGuest(tokenA, answer()).guest.drinkPackage, 'Med alkohol');
  assert.equal(b.api.saveGuest(tokenA, answer({ revision: 1, requestId: '2'.repeat(32), drinkPackage: 'Uten alkohol' })).guest.drinkPackage, 'Uten alkohol');
  assert.equal(b.tables.Guests.values[1][13], 'private-link');
  assert.equal(JSON.stringify(b.api.getInvitation(tokenA)).includes('private-link'), false);
  const no = b.api.saveGuest(tokenA, answer({ revision: 2, requestId: '3'.repeat(32), wedding: 'Nei' }));
  assert.equal(no.guest.drinkPackage, '');
  for (const drinkPackage of ['', 'Annet', null, true]) assert.throws(() => backend().api.saveGuest(tokenA, answer({ drinkPackage })), /drikkepakke/);
});
test('one invitation returns exactly its own guests and stable IDs', () => {
  const b = backend(), result = b.api.getInvitation(tokenA);
  assert.equal(result.guests.length, 2);
  assert.equal(result.guests[0].id, 'guest-a1');
  assert.equal(result.guests[0].status, 'Ikke svart');
  assert.equal(b.api.getInvitation(tokenB).guests.length, 1);
});
test('yes and no on the same invitation persist independently; hidden answers are cleared', () => {
  const b = backend();
  assert.equal(b.api.saveGuest(tokenA, answer()).guest.wedding, 'Ja');
  const no = b.api.saveGuest(tokenA, answer({ guestId: 'guest-a2', wedding: 'Nei', requestId: '2'.repeat(32) })).guest;
  assert.equal(no.wedding, 'Nei'); assert.equal(no.allergies, ''); assert.equal(no.accommodation, ''); assert.equal(no.friday, 'Ja');
  assert.equal(b.api.getInvitation(tokenA).guests[0].allergies, 'Nøtter');
});
test('editing updates the same row; duplicate retry is idempotent', () => {
  const b = backend(), payload = answer();
  b.api.saveGuest(tokenA, payload);
  assert.equal(b.api.saveGuest(tokenA, payload).duplicate, true);
  assert.equal(b.writes, 1);
  b.api.saveGuest(tokenA, answer({ revision: 1, requestId: '2'.repeat(32), friday: 'Nei' }));
  assert.equal(b.tables.Guests.values.length, 4); assert.equal(b.writes, 2);
  assert.equal(b.api.getInvitation(tokenA).guests[0].friday, 'Nei');
});
test('invalid, revoked, malformed and name-based codes cannot read or write', () => {
  const b = backend();
  for (const token of ['', 'Testgjest', 'c'.repeat(64), null, { token: tokenA }]) {
    assert.throws(() => b.api.getInvitation(token), /Ugyldig/);
    assert.throws(() => b.api.saveGuest(token, answer()), /Ugyldig/);
  }
  b.tables.Invitations.values[1][2] = false;
  assert.throws(() => b.api.getInvitation(tokenA), /Ugyldig/);
  assert.equal(b.writes, 0); assert.equal(b.locked, false);
});
test('foreign guest IDs, forged names and invitation IDs cannot change ownership', () => {
  const b = backend();
  assert.throws(() => b.api.saveGuest(tokenA, answer({ guestId: 'guest-b1' })), /tilhører ikke/);
  b.api.saveGuest(tokenA, answer({ name: 'Forged', invitationId: 'invite-b' }));
  assert.equal(b.tables.Guests.values[1][0], 'invite-a');
  assert.equal(b.tables.Guests.values[1][2], 'Testgjest én');
  assert.equal(b.tables.Guests.values[3][8], 'Ikke svart');
});
test('server validates enum values, length, type, revision and request identity', () => {
  const b = backend();
  for (const values of [{ wedding: 'Maybe' }, { friday: '' }, { accommodation: true }, { allergies: 'x'.repeat(1001) }, { allergies: {} }, { revision: -1 }, { revision: 0.5 }, { requestId: 'x' }, { guestId: {} }]) {
    assert.throws(() => b.api.saveGuest(tokenA, answer(values)));
  }
  assert.equal(b.writes, 0);
});
test('spreadsheet formulas in allergies are escaped', () => {
  const b = backend();
  b.api.saveGuest(tokenA, answer({ allergies: '  =IMPORTXML("bad")' }));
  assert.equal(b.tables.Guests.values[1][5], "'" + '=IMPORTXML("bad")');
});
test('stale updates and changed duplicate payloads cannot overwrite newer data', () => {
  const b = backend(); b.api.saveGuest(tokenA, answer());
  assert.throws(() => b.api.saveGuest(tokenA, answer({ wedding: 'Nei' })), /endret/);
  assert.throws(() => b.api.saveGuest(tokenA, answer({ requestId: '2'.repeat(32) })), /annet vindu/);
  assert.equal(b.writes, 1);
});
test('different invitations update without lost rows; contended locks fail safely', () => {
  const b = backend(); b.api.saveGuest(tokenA, answer());
  b.api.saveGuest(tokenB, answer({ guestId: 'guest-b1', requestId: '2'.repeat(32) }));
  b.setBusy(true);
  assert.throws(() => b.api.saveGuest(tokenA, answer({ revision: 1, requestId: '3'.repeat(32) })), /trafikk/);
  b.setBusy(false); assert.equal(b.writes, 2); assert.equal(b.tables.Guests.values[3][8], 'Svart');
});
test('deadline is enforced in Oslo time, after locking; reads and committed retries remain possible', () => {
  const b = backend(); b.setTime('2027-01-03T22:59:59Z'); b.api.saveGuest(tokenA, answer());
  b.setTime('2027-01-03T23:00:00Z');
  assert.equal(b.api.getInvitation(tokenA).closed, true);
  assert.throws(() => b.api.saveGuest(tokenA, answer({ revision: 1, requestId: '2'.repeat(32) })), /Svarfristen/);
  assert.equal(b.api.saveGuest(tokenA, answer()).duplicate, true);
  assert.throws(() => b.api.saveGuest(tokenA, answer({ guestId: 'guest-a2' })), /Svarfristen/);
});
test('storage failure is not reported as success and always releases the lock', () => {
  const b = backend(); b.failStorage(true);
  assert.throws(() => b.api.saveGuest(tokenA, answer()), /Storage failure/);
  assert.equal(b.locked, false); assert.equal(b.writes, 0);
});
test('a request started before the deadline cannot write if the lock is acquired after it', () => {
  const b = backend(); b.setTime('2027-01-03T22:59:59Z');
  b.setOnLock(() => b.setTime('2027-01-03T23:00:00Z'));
  assert.throws(() => b.api.saveGuest(tokenA, answer()), /Svarfristen/);
  assert.equal(b.writes, 0); assert.equal(b.locked, false);
});
test('ambiguous guest rows and invitation hashes fail closed', () => {
  const b = backend(); b.tables.Guests.values.push([...b.tables.Guests.values[1]]);
  assert.throws(() => b.api.saveGuest(tokenA, answer()), /gjestelisten/);
  b.tables.Invitations.values.push([...b.tables.Invitations.values[1]]);
  assert.throws(() => b.api.getInvitation(tokenA), /Ugyldig/);
});
test('only intended guest endpoints are public; no secret token is put in iframe URL', () => {
  const funcs = Array.from(source.matchAll(/^function (\w+)\(/gm), match => match[1]).filter(name => !name.endsWith('_'));
  assert.deepEqual(funcs, ['doGet', 'getInvitation', 'saveGuest']);
  const bridge = fs.readFileSync(path.join(root, 'rsvp-bridge.js'), 'utf8');
  assert.equal(/searchParams\.set\(['"](?:token|invitasjon)['"]/.test(bridge), false);
  const config = fs.readFileSync(path.join(root, 'rsvp-config.js'), 'utf8');
  assert.match(config, /enabled: true/);
  assert.match(config, /endpoint: 'https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec'/);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /docs.google.com\/forms/);
});
test('all delivered JavaScript and inline scripts parse', () => {
  for (const name of ['rsvp.js', 'rsvp-config.js', 'rsvp-bridge.js', 'onskeliste.js']) new vm.Script(fs.readFileSync(path.join(root, name), 'utf8'), { filename: name });
  for (const name of ['index.html', 'invitasjon.html', 'apps-script/Rsvp.html', 'tools/generate-invitations.html']) {
    const html = fs.readFileSync(path.join(root, name), 'utf8').replace('<?!= bootstrap ?>', JSON.stringify({ parent: 'https://marthaogsondre.no', channel: '0'.repeat(48), mode: 'form' }));
    for (const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(script[1], { filename: name });
  }
});
function bridgeEnv(nested = false) {
  const events = {}, docEvents = {}, callbacks = { profiles: 0, errors: 0 }, pushes = [];
  const window = { RSVP_CONFIG: { enabled: true, endpoint: 'https://script.google.com/macros/s/TEST/exec' }, addEventListener(name, fn) { events[name] = fn; }, removeEventListener(name) { delete events[name]; } };
  window.top = nested ? {} : window;
  const document = { addEventListener(name, fn) { docEvents[name] = fn; }, querySelectorAll: () => [], getElementById: () => ({ scrollIntoView() {} }) };
  vm.runInNewContext(fs.readFileSync(path.join(root,'rsvp-bridge.js'),'utf8'), {
    window, document, URL, URLSearchParams, location: { hash: '#invitasjon=' + tokenA, origin: 'https://marthaogsondre.no' },
    crypto: crypto.webcrypto, history: { pushState: (_state, _title, href) => pushes.push(href) }, matchMedia: () => ({ matches: true }), setTimeout: () => 1, clearTimeout() {}
  });
  const frame = { style: {}, removeAttribute() {} };
  const connection = window.RsvpBridge.connect(frame, 'form', { profile() { callbacks.profiles++; }, error() { callbacks.errors++; } });
  return { window, events, docEvents, callbacks, pushes, frame, connection };
}
test('bridge authenticates origin, channel and source; no token is in the frame URL', () => {
  const b = bridgeEnv(), channel = new URL(b.frame.src).searchParams.get('channel'), sent = [];
  const trusted = { postMessage: (...args) => sent.push(args) }, attacker = { postMessage() { throw new Error('Token leaked'); } };
  const data = { app: 'wedding-rsvp', type: 'hello', channel };
  b.events.message({ origin: 'https://evil.example', source: attacker, data });
  b.events.message({ origin: 'https://evil-script.googleusercontent.com.attacker.example', source: attacker, data });
  b.events.message({ origin: 'https://n-test-script.googleusercontent.com', source: attacker, data: { ...data, channel: 'wrong' } });
  assert.equal(sent.length, 0); assert.equal(b.frame.src.includes(tokenA), false);
  b.events.message({ origin: 'https://n-test-script.googleusercontent.com', source: trusted, data });
  assert.equal(sent[0][0].token, tokenA); assert.equal(sent[0][1], 'https://n-test-script.googleusercontent.com');
  b.events.message({ origin: 'https://n-test-script.googleusercontent.com', source: attacker, data: { ...data, type: 'profile', names: ['Bad'] } });
  assert.equal(b.callbacks.profiles, 0);
  b.events.message({ origin: 'https://n-test-script.googleusercontent.com', source: trusted, data: { ...data, type: 'profile', names: ['Testgjest'] } });
  assert.equal(b.callbacks.profiles, 1);
});
test('framed parent pages cannot start the private bridge; anchor navigation preserves the token', () => {
  const framed = bridgeEnv(true); assert.equal(framed.connection, null); assert.equal(framed.frame.src, undefined);
  const b = bridgeEnv(); let prevented = false;
  b.docEvents.click({ button: 0, target: { closest: () => ({ getAttribute: () => '#rsvp' }) }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.match(b.pushes[0], /section=rsvp/); assert.equal(new URLSearchParams(b.pushes[0].slice(1)).get('invitasjon'), tokenA);
});
test('doGet rejects arbitrary embedding origins and never embeds guest information in its shell', () => {
  const b = backend(); let bootstrap;
  const output = { setTitle() { return this; }, setXFrameOptionsMode() { return this; } };
  b.api.HtmlService = {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }, createHtmlOutput: html => html,
    createTemplateFromFile: () => ({ set bootstrap(value) { bootstrap = value; }, evaluate: () => output })
  };
  assert.match(b.api.doGet({ parameter: { parent: 'https://evil.example', channel: 'f'.repeat(48) } }), /Åpne/);
  assert.equal(bootstrap, undefined);
  b.api.doGet({ parameter: { parent: 'https://marthaogsondre.no', channel: 'f'.repeat(48), mode: 'form', token: tokenA } });
  assert.equal(bootstrap.includes(tokenA), false);
  assert.equal(JSON.parse(bootstrap).parent, 'https://marthaogsondre.no');
});
