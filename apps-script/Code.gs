/* Only doGet, getInvitation, saveGuest and saveInvitation are callable from the guest web app.
   Every admin/helper function MUST retain its trailing underscore. */
const RSVP = Object.freeze({
  roomLimits: Object.freeze({ 'Dobbeltrom': 10, 'Superior Dobbeltrom': 30, 'Enkeltrom': 10 }),
  deadline: '2027-01-04T00:00:00+01:00',
  origins: ['https://marthaogsondre.no', 'https://www.marthaogsondre.no'],
  invitationHeaders: ['Invitation ID', 'Code hash', 'Active'],
  guestHeaders: ['Invitation ID', 'Guest ID', 'Name', 'Wedding', 'Friday', 'Allergies', 'Accommodation', 'Room type', 'RSVP status', 'Last updated', 'Revision', 'Last request ID', 'Last request hash', 'Personlig invitasjonslenke', 'Drikkepakke', 'Opphold']
});

function config_() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SPREADSHEET_ID');
  if (!sheetId) throw new Error('Løsningen er ikke ferdig konfigurert. Kontakt brudeparet.');
  return { sheetId, origins: RSVP.origins, deadline: Date.parse(RSVP.deadline) };
}

function doGet(e) {
  const p = e && e.parameter || {};
  const cfg = config_();
  if (!cfg.origins.includes(p.parent) || !/^[a-f0-9]{48}$/.test(p.channel || '')) {
    return HtmlService.createHtmlOutput('<p>Åpne svarskjemaet fra den personlige invitasjonen på marthaogsondre.no.</p>');
  }
  const template = HtmlService.createTemplateFromFile('Rsvp');
  // Safe values only; no name, invitation secret or guest answer is rendered here.
  template.bootstrap = JSON.stringify({ parent: p.parent, channel: p.channel, mode: p.mode === 'profile' ? 'profile' : 'form' }).replace(/</g, '\\u003c');
  return template.evaluate().setTitle('Svar på invitasjonen — Martha & Sondre')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function book_() { return SpreadsheetApp.openById(config_().sheetId); }
function table_(book, name, headers) {
  const sheet = book.getSheetByName(name);
  if (!sheet) throw new Error('Løsningen er ikke ferdig konfigurert. Kontakt brudeparet.');
  const values = sheet.getDataRange().getValues();
  if (!headers.every((h, i) => values[0] && values[0][i] === h)) throw new Error('Regnearket må kontrolleres av brudeparet.');
  return { sheet, rows: values.slice(1) };
}
function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(b => (b & 255).toString(16).padStart(2, '0')).join('');
}
function authorized_(book, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Ugyldig eller utløpt invitasjonslenke.');
  const digest = hash_(token);
  const matches = table_(book, 'Invitations', RSVP.invitationHeaders).rows.filter(r => r[1] === digest && (r[2] === true || r[2] === 'TRUE'));
  if (matches.length !== 1 || !matches[0][0]) throw new Error('Ugyldig eller utløpt invitasjonslenke.');
  return String(matches[0][0]);
}
function guestData_(row) {
  return { id: String(row[1]), name: String(row[2]), wedding: row[3] || '', friday: row[4] || '', allergies: row[5] || '', accommodation: row[6] || '', roomType: row[7] || '', stayPeriod: row[15] || '', drinkPackage: row[14] || '', status: row[8] || 'Ikke svart', updated: row[9] instanceof Date ? row[9].toISOString() : String(row[9] || ''), revision: Number(row[10]) || 0 };
}
function getInvitation(token) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Det er litt trafikk akkurat nå. Prøv igjen om et øyeblikk.');
  try {
    const book = book_();
    const id = authorized_(book, token);
    const rows = table_(book, 'Guests', RSVP.guestHeaders).rows;
    const guests = rows.filter(r => String(r[0]) === id && r[1]).map(guestData_);
    if (!guests.length) throw new Error('Invitasjonen mangler gjester. Kontakt brudeparet.');
    return { guests, roomAvailability: roomAvailability_(rows, id), closed: Date.now() >= config_().deadline, deadline: RSVP.deadline };
  } finally { lock.releaseLock(); }
}
function answer_(value) {
  if (value !== 'Ja' && value !== 'Nei') throw new Error('Velg ja eller nei på alle obligatoriske spørsmål.');
  return value;
}
function validate_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ugyldig svar.');
  if (typeof input.guestId !== 'string' || !/^[\w-]{1,80}$/.test(input.guestId)) throw new Error('Ugyldig gjest.');
  if (typeof input.requestId !== 'string' || !/^[a-f0-9]{32,64}$/.test(input.requestId)) throw new Error('Ugyldig innsending. Last siden på nytt.');
  if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw new Error('Ugyldig versjon. Last inn svarene på nytt.');
  const wedding = answer_(input.wedding);
  if (!['Ja', 'Nei', 'Usikker'].includes(input.friday)) throw new Error('Velg ja, nei eller usikker for sammenkomsten fredag.');
  const friday = input.friday;
  let allergies = '', accommodation = '', drinkPackage = '', stayPeriod = '', roomType = '';
  if (wedding === 'Ja') {
    if (!['Med alkohol', 'Uten alkohol'].includes(input.drinkPackage)) throw new Error('Velg drikkepakke med eller uten alkohol. Last siden på nytt hvis du ikke ser valget.');
    drinkPackage = input.drinkPackage;
    accommodation = answer_(input.accommodation);
    if (accommodation === 'Ja') {
      if (!['Fredag til søndag', 'Lørdag til søndag'].includes(input.stayPeriod)) throw new Error('Velg om du ønsker rom fra fredag til søndag eller fra lørdag til søndag.');
      stayPeriod = input.stayPeriod;
      if (!['Dobbeltrom', 'Superior Dobbeltrom', 'Enkeltrom'].includes(input.roomType)) throw new Error('Velg ønsket romtype.');
      roomType = input.roomType;
    }
    if (typeof input.allergies !== 'string' || input.allergies.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input.allergies)) throw new Error('Matbehov må være tekst på maksimalt 1000 tegn.');
    allergies = input.allergies.trim();
  }
  return { guestId: input.guestId, requestId: input.requestId, revision: input.revision, wedding, friday, allergies, accommodation, drinkPackage, stayPeriod, roomType };
}
function safeCell_(value) {
  // Prevent spreadsheet formulas from user-controlled text, including leading spaces.
  return /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
}
// Room usage is derived from the current Guests rows, never from browser counters.
// Every stay includes Saturday. Two guests on one invitation share a double room;
// single rooms count once per guest. Different invitations never share implicitly.
function roomUsage_(rows) {
  const groups = new Map();
  rows.forEach(row => {
    if (row[3] !== 'Ja' || row[6] !== 'Ja' || !row[0] || !row[1] || !RSVP.roomLimits[row[7]]) return;
    const key = JSON.stringify([String(row[0]), row[7]]);
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  const usage = Object.fromEntries(Object.keys(RSVP.roomLimits).map(type => [type, 0]));
  groups.forEach((people, key) => {
    const type = JSON.parse(key)[1];
    usage[type] += Math.ceil(people / (type === 'Enkeltrom' ? 1 : 2));
  });
  return usage;
}
function roomAvailability_(rows, invitationId) {
  const total = roomUsage_(rows);
  const others = roomUsage_(rows.filter(row => String(row[0]) !== invitationId));
  return Object.fromEntries(Object.entries(RSVP.roomLimits).map(([type, limit]) => [type, {
    remaining: Math.max(0, limit - total[type]),
    availableForInvitation: Math.max(0, limit - others[type])
  }]));
}
function saveGuest(token, input) {
  const result = saveAnswers_(token, [input]);
  return { guest: result.guests[0], duplicate: result.duplicate, roomAvailability: result.roomAvailability };
}
function saveInvitation(token, inputs) {
  return saveAnswers_(token, inputs);
}
function saveAnswers_(token, inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 100) throw new Error('Ugyldig innsending.');
  const answers = inputs.map(validate_);
  if (new Set(answers.map(data => data.guestId)).size !== answers.length) throw new Error('En gjest kan bare forekomme én gang.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Det er litt trafikk akkurat nå. Prøv igjen om et øyeblikk.');
  try {
    const book = book_(), invitationId = authorized_(book, token);
    const table = table_(book, 'Guests', RSVP.guestHeaders);
    const changes = answers.map(data => {
      const matching = table.rows.map((row, i) => ({ row, i })).filter(x => String(x.row[0]) === invitationId && String(x.row[1]) === data.guestId);
      if (matching.length !== 1) throw new Error('Denne gjesten tilhører ikke invitasjonen, eller gjestelisten må kontrolleres.');
      const { row, i } = matching[0];
      const requestHash = hash_(JSON.stringify(data));
      if (row[11] === data.requestId) {
        if (row[12] !== requestHash) throw new Error('Innsendingen er endret. Last inn svarene på nytt.');
        return { i, updated: row, duplicate: true };
      }
      if (Date.now() >= config_().deadline) throw new Error('Svarfristen 3. januar 2027 er passert. Kontakt oss hvis noe har endret seg.');
      if ((Number(row[10]) || 0) !== data.revision) throw new Error('Svaret er endret i et annet vindu. Hent siste svar før du prøver igjen.');
      const updated = Array.from({ length: RSVP.guestHeaders.length }, (_, index) => row[index] ?? '');
      updated[3] = data.wedding; updated[4] = data.friday; updated[5] = safeCell_(data.allergies);
      updated[6] = data.accommodation; updated[7] = data.roomType; updated[8] = 'Svart'; updated[9] = new Date();
      updated[10] = data.revision + 1; updated[11] = data.requestId; updated[12] = requestHash;
      updated[14] = data.drinkPackage; updated[15] = data.stayPeriod;
      return { i, updated, duplicate: false };
    });
    const candidate = table.rows.map(row => row.slice());
    changes.forEach(change => { candidate[change.i] = change.updated; });
    const before = roomUsage_(table.rows), after = roomUsage_(candidate);
    // Check the whole invitation under the same lock BEFORE writing any guest.
    // Existing reservations remain editable even if an administrator lowered a limit.
    Object.entries(RSVP.roomLimits).forEach(([type, limit]) => {
      if (after[type] > limit && after[type] > before[type]) throw new Error(type + ' er dessverre fullbooket. Velg en annen romtype og send inn på nytt.');
    });
    changes.filter(change => !change.duplicate).forEach(change => {
      table.sheet.getRange(change.i + 2, 1, 1, RSVP.guestHeaders.length).setValues([change.updated]);
    });
    SpreadsheetApp.flush();
    return { guests: changes.map(change => guestData_(change.updated)), duplicate: changes.every(change => change.duplicate), roomAvailability: roomAvailability_(candidate, invitationId) };
  } finally { lock.releaseLock(); }
}

// Run manually in the editor once. Private functions cannot be called by guests.
function setup_() {
  const book = book_();
  book.setSpreadsheetTimeZone('Europe/Oslo');
  [['Invitations', RSVP.invitationHeaders], ['Guests', RSVP.guestHeaders]].forEach(([name, headers]) => {
    let sheet = book.getSheetByName(name);
    if (!sheet) sheet = book.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    else {
      const existing = sheet.getDataRange().getValues()[0];
      if (name === 'Guests' && headers.slice(0, 15).every((h, i) => existing[i] === h) && !existing[15]) {
        sheet.getRange(1, 16).setValue('Opphold');
      }
      table_(book, name, headers);
    } // Never overwrite a pre-existing sheet with another schema.
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e9eddf').setFontColor('#353c2e');
    if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter();
    sheet.autoResizeColumns(1, headers.length);
    if (name === 'Guests') {
      sheet.getRange(2, 10, sheet.getMaxRows() - 1, 1).setNumberFormat('dd.MM.yyyy HH:mm:ss');
      sheet.hideColumns(11, 3);
    }
  });
  let summary = book.getSheetByName('Oversikt');
  if (!summary) {
    summary = book.insertSheet('Oversikt');
    summary.getRange(1, 1, 7, 2).setValues([
      ['Oversikt', 'Antall'],
      ['Kommer i bryllupet', '=COUNTIF(Guests!D2:D,"Ja")'],
      ['Kommer ikke i bryllupet', '=COUNTIF(Guests!D2:D,"Nei")'],
      ['Ikke svart', '=COUNTIF(Guests!I2:I,"Ikke svart")'],
      ['Deltar fredag', '=COUNTIF(Guests!E2:E,"Ja")'],
      ['Ønsker overnatting', '=COUNTIF(Guests!G2:G,"Ja")'],
      ['Oppgitte matbehov', '=COUNTIFS(Guests!D2:D,"Ja",Guests!F2:F,"<>")']
    ]);
    summary.setFrozenRows(1); summary.autoResizeColumns(1, 2);
  }
}
