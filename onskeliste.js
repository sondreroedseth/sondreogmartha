(function () {
  'use strict';
  const text = value => value == null ? '' : String(value).trim();
  const normalize = value => text(value).toLocaleLowerCase('nb-NO');

  function safeLink(value) {
    try {
      const url = new URL(text(value));
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function readWishes(workbook, xlsx) {
    const name = workbook.SheetNames.find(name => normalize(name) === 'ønsker');
    if (!name) throw new Error('Excel-filen mangler fanen Ønsker.');
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '', blankrows: false });
    const headers = (rows.shift() || []).map(normalize);
    const fields = ['ønske', 'beskrivelse', 'lenke', 'antall'].map(name => headers.indexOf(name));
    if (fields.some(index => index < 0)) throw new Error('Excel-filen mangler en kolonneoverskrift.');
    return rows.filter(row => text(row[fields[0]])).map(row => {
      const quantity = Number(row[fields[3]]);
      return {
        title: text(row[fields[0]]),
        description: text(row[fields[1]]),
        link: safeLink(row[fields[2]]),
        quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : null
      };
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { readWishes, safeLink };
  if (typeof document === 'undefined') return;

  const list = document.querySelector('#wish-list');
  const status = document.querySelector('#wish-status');
  const retry = document.querySelector('#retry');
  const local = location.protocol === 'file:';

  function render(items) {
    list.replaceChildren();
    status.textContent = items.length ? '' : 'Vi fyller snart inn ønskene våre her. Tusen takk for at du vil feire sammen med oss!';
    status.hidden = items.length > 0;
    for (const item of items) {
      const article = document.createElement('article');
      article.className = 'wish';
      const title = document.createElement('h2');
      title.textContent = item.title;
      article.append(title);
      if (item.description) {
        const description = document.createElement('p');
        description.className = 'wish-description';
        description.textContent = item.description;
        article.append(description);
      }
      if (item.quantity) {
        const quantity = document.createElement('p');
        quantity.className = 'wish-quantity';
        quantity.textContent = 'Ønsket antall: ' + item.quantity;
        article.append(quantity);
      }
      if (item.link) {
        const link = document.createElement('a');
        link.className = 'btn';
        link.href = item.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Se ønsket i nettbutikken →';
        article.append(link);
      }
      list.append(article);
    }
  }

  function loadBytes(bytes) {
    if (!window.XLSX) throw new Error('Excel-leseren kunne ikke lastes.');
    const workbook = window.XLSX.read(bytes, { type: 'array', cellHTML: false });
    render(readWishes(workbook, window.XLSX));
    retry.hidden = true;
  }

  async function load() {
    status.hidden = false;
    status.textContent = 'Henter ønskelisten …';
    retry.hidden = true;
    try {
      const response = await fetch('onskeliste.xlsx', { cache: 'no-store' });
      if (!response.ok) throw new Error('Ønskelisten kunne ikke hentes.');
      loadBytes(await response.arrayBuffer());
    } catch (error) {
      list.replaceChildren();
      status.hidden = false;
      status.textContent = 'Ønskelisten kunne ikke lastes akkurat nå. Prøv igjen om litt.';
      retry.hidden = false;
      console.error('Kunne ikke lese ønskelisten:', error);
    }
  }

  retry.addEventListener('click', load);
  if (local) {
    document.querySelector('#local-preview').hidden = false;
    status.textContent = 'Velg Excel-filen for å se ønskelisten.';
    document.querySelector('#excel-file').addEventListener('change', async event => {
      const file = event.target.files[0];
      if (!file) return;
      try { loadBytes(await file.arrayBuffer()); }
      catch (error) {
        list.replaceChildren();
        status.hidden = false;
        status.textContent = 'Filen kunne ikke leses. Velg onskeliste.xlsx med fanen Ønsker og de fire kolonneoverskriftene.';
        console.error(error);
      }
    });
  } else load();
})();
