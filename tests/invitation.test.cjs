const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../invitasjon.html'), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function setup(search = '?gjest=Testgjest') {
  const nodes = new Map();
  const get = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      hidden: ['#openText', '#scrollHint'].includes(selector),
      disabled: selector === '#openInvitation',
      href: 'https://marthaogsondre.no', scrollTop: 0, scrollHeight: 2400, clientHeight: 800,
      handlers: {}, classList: {add() {}}, setAttribute() {}, focus() {},
      addEventListener(name, fn) { this.handlers[name] = fn; },
      scrollIntoView() { get('#invitation').scrollTop = 800; get('#invitation').handlers.scroll(); }
    });
    return nodes.get(selector);
  };
  let now = 0, id = 0;
  const timers = new Map();
  const window = {
    RsvpBridge: {hasToken: false}, matchMedia: () => ({matches: true}),
    setTimeout(fn, ms) { timers.set(++id, {fn, at: now + ms}); return id; },
    clearTimeout(id) { timers.delete(id); }, setInterval() {}
  };
  vm.runInNewContext(script, {window, document: {querySelector: get}, location: {search}, URL, URLSearchParams, requestAnimationFrame: fn => fn()});
  async function advance(ms) {
    const end = now + ms;
    for (;;) {
      await Promise.resolve(); await Promise.resolve();
      const next = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = end;
  }
  return {get, advance};
}
test('seal hint waits 15 seconds and is cancelled on opening', async () => {
  const {get, advance} = setup();
  await advance(14999); assert.equal(get('#openText').hidden, true);
  await advance(1); assert.equal(get('#openText').hidden, false);
  assert.match(get('#openText').textContent, /Trykk på seglet/);
  get('#openInvitation').handlers.click(); await advance(0);
  assert.equal(get('#openText').hidden, true);
});
test('arrow waits 15 seconds after opening, and hides on scrolling', async () => {
  const {get, advance} = setup();
  get('#openInvitation').handlers.click(); await advance(0);
  await advance(14999); assert.equal(get('#scrollHint').hidden, true);
  await advance(1); assert.equal(get('#scrollHint').hidden, false);
  get('#scrollHint').handlers.click(); assert.equal(get('#scrollHint').hidden, true);
});
test('early scroll cancels arrow; missing personal link never gets opening hint', async () => {
  const ready = setup(); ready.get('#openInvitation').handlers.click(); await ready.advance(0);
  ready.get('#invitation').scrollTop = 100; ready.get('#invitation').handlers.scroll();
  await ready.advance(30000); assert.equal(ready.get('#scrollHint').hidden, true);
  const missing = setup(''); await missing.advance(30000);
  assert.equal(missing.get('#openInvitation').disabled, true);
  assert.equal(missing.get('#openText').textContent, undefined);
});
test('website button occurs once, after venue content at the end', () => {
  assert.equal((html.match(/id="mainSiteLink"/g) || []).length, 1);
  assert.ok(html.indexOf('id="mainSiteLink"') > html.indexOf('class="venues"'));
  assert.match(html, /<footer[^>]*><a class="site-link" id="mainSiteLink"/);
});
