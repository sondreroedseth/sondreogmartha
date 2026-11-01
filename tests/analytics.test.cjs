const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../analytics.js'), 'utf8');

function setup(address, embedded = false) {
  const scripts = [];
  const window = { location: new URL(address) };
  window.self = window;
  window.top = embedded ? {} : window;
  const document = { createElement: () => ({}), head: { appendChild: s => scripts.push(s) } };
  vm.runInNewContext(source, { window, document, URL });
  return { scripts, sanitize: window.vaq?.[0][1] };
}

test('only production top-level visits load analytics', () => {
  for (const address of ['http://127.0.0.1:8787/', 'http://marthaogsondre.no/', 'https://preview.vercel.app/']) {
    assert.equal(setup(address).scripts.length, 0);
  }
  assert.equal(setup('https://marthaogsondre.no/', true).scripts.length, 0);
  assert.equal(setup('https://marthaogsondre.no/').scripts[0].src, '/_vercel/insights/script.js');
});

test('page counts remove names, invitation tokens, and arbitrary event data', () => {
  const { sanitize } = setup('https://marthaogsondre.no/');
  const event = sanitize({ type: 'pageview', url: 'https://marthaogsondre.no/invitasjon.html?gjest=Testgjest#invitasjon=secret', data: { name: 'private' } });
  assert.equal(JSON.stringify(event), JSON.stringify({ type: 'pageview', url: 'https://marthaogsondre.no/invitasjon.html' }));
  assert.equal(sanitize({ type: 'event', url: 'https://marthaogsondre.no/', data: { answer: 'private' } }), null);
  assert.equal(sanitize({ type: 'pageview', url: 'https://marthaogsondre.no/private-rsvp/secret' }), null);
  assert.equal(sanitize({ type: 'pageview', url: 'https://other.example/' }), null);
  assert.equal(sanitize({ type: 'pageview', url: 'invalid' }), null);
});
