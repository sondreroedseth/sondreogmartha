// Temporary editor-only checks against fictional fixture rows. Never deploy this
// helper with real invitation codes. Replace markers in memory, then remove it.
function googleIntegrationChecks_() {
  const token = '__QA_TOKEN__';
  const expectedGuestId = '__QA_GUEST_ID__';
  const foreignGuestId = '__QA_FOREIGN_GUEST_ID__';
  const book = book_();
  const id = authorized_(book, token);
  const guests = table_(book, 'Guests', RSVP.guestHeaders);
  const index = guests.rows.findIndex(row => String(row[0]) === id && String(row[1]) === expectedGuestId && String(row[2]).startsWith('Testgjest RSVP '));
  if (index < 0) throw new Error('Missing fictional fixture. No rows changed.');
  const original = guests.rows[index].slice(0, 13);
  const invitationTable = table_(book, 'Invitations', RSVP.invitationHeaders);
  const invIndex = invitationTable.rows.findIndex(row => String(row[0]) === id);
  const originalActive = invitationTable.rows[invIndex][2];
  const realNow = Date.now;
  let passed = 0;
  const check = (value, label) => { if (!value) throw new Error('QA failed: ' + label); passed++; };
  const rejects = (fn, label) => { let rejected = false; try { fn(); } catch (_) { rejected = true; } check(rejected, label); };
  const request = () => Utilities.getUuid().replace(/-/g, '');
  try {
    check(getInvitation(token).guests.length === 2, 'own invitation only');
    rejects(() => getInvitation('f'.repeat(64)), 'unknown token');
    const payload = { guestId: expectedGuestId, revision: Number(original[10]) || 0, requestId: request(), wedding: 'Ja', friday: 'Ja', accommodation: 'Ja', allergies: 'TEST – fiktivt matbehov' };
    const first = saveGuest(token, payload);
    check(first.guest.revision === payload.revision + 1 && first.guest.wedding === 'Ja', 'first save');
    const duplicate = saveGuest(token, payload);
    check(duplicate.duplicate === true && duplicate.guest.revision === first.guest.revision && duplicate.guest.updated === first.guest.updated, 'idempotent retry');
    rejects(() => saveGuest(token, { ...payload, allergies: 'TEST – changed payload' }), 'changed duplicate payload');
    rejects(() => saveGuest(token, { ...payload, requestId: request() }), 'stale revision');
    rejects(() => saveGuest(token, { ...payload, guestId: foreignGuestId, requestId: request() }), 'foreign guest');
    rejects(() => saveGuest(token, { ...payload, wedding: 'Kanskje', requestId: request() }), 'invalid enumeration');
    rejects(() => saveGuest(token, { ...payload, allergies: 'x'.repeat(1001), requestId: request() }), 'length limit');
    Date.now = () => Date.parse(RSVP.deadline);
    check(getInvitation(token).closed === true, 'server closes at cutoff');
    rejects(() => saveGuest(token, { ...payload, revision: first.guest.revision, requestId: request() }), 'late update');
    check(saveGuest(token, payload).duplicate === true, 'already committed retry after cutoff');
    Date.now = realNow;
    const formulaPayload = { ...payload, revision: first.guest.revision, requestId: request(), allergies: '=1+1' };
    const formulaSaved = saveGuest(token, formulaPayload);
    check(guests.sheet.getRange(index + 2, 6).getFormula() === '', 'formula injection escaped');
    const declined = saveGuest(token, { ...payload, revision: formulaSaved.guest.revision, requestId: request(), wedding: 'Nei' });
    check(declined.guest.allergies === '' && declined.guest.accommodation === '', 'decline clears hidden fields');
    invitationTable.sheet.getRange(invIndex + 2, 3).setValue(false);
    SpreadsheetApp.flush();
    rejects(() => getInvitation(token), 'revoked read');
    rejects(() => saveGuest(token, { ...payload, revision: declined.guest.revision, requestId: request() }), 'revoked write');
  } finally {
    Date.now = realNow;
    guests.sheet.getRange(index + 2, 1, 1, 13).setValues([original]);
    invitationTable.sheet.getRange(invIndex + 2, 3).setValue(originalActive);
    SpreadsheetApp.flush();
  }
  console.log('Google integration QA: ' + passed + ' checks passed; fictional fixture restored. No real guest data used.');
}
