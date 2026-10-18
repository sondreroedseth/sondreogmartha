// Local QA only. Uses fictitious guests and an in-memory mock Google bridge.
// No Google deployment or production configuration is changed by this server.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:8765';
const token = 'a'.repeat(64);
let guests = [1, 2].map(n => ({ id: 'demo-' + n, name: 'Testgjest ' + n, wedding: '', friday: '', allergies: '', accommodation: '', status: 'Ikke svart', revision: 0 }));
let failNext = false;
function mockScript() {
  return `<script>window.google={script:{run:{withSuccessHandler(success){return {withFailureHandler(failure){return new Proxy({}, {get(_target,name){return (...args)=>fetch('/mock-rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})}).then(r=>r.json()).then(r=>r.error?failure({message:r.error}):success(r.result)).catch(()=>failure({message:'Nettverksfeil'}));}})}}}}}};</script>`;
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  if (url.pathname === '/mock-rpc') {
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 20000) { res.writeHead(413).end(); return; } }
    let result;
    try {
      const { name, args } = JSON.parse(body);
      if (args[0] !== token) throw new Error('Ugyldig invitasjonslenke.');
      if (name === 'getInvitation') result = { guests, closed: false };
      else if (name === 'saveGuest') {
        if (failNext) { failNext = false; throw new Error('Test: lagringen mislyktes. Prøv igjen.'); }
        const input = args[1], guest = guests.find(g => g.id === input.guestId);
        if (!guest) throw new Error('Ugyldig gjest.');
        if (guest.revision !== input.revision) throw new Error('Svaret er endret i et annet vindu.');
        Object.assign(guest, input, { revision: guest.revision + 1, status: 'Svart', allergies: input.wedding === 'Ja' ? input.allergies : '', accommodation: input.wedding === 'Ja' ? input.accommodation : '' });
        result = { guest, duplicate: false };
      } else throw new Error('Ukjent kall.');
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ result }));
    } catch (error) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: error.message })); }
    return;
  }
  if (url.pathname === '/fail-next' && req.method === 'POST') { failNext = true; res.end('OK'); return; }
  if (url.pathname === '/reset' && req.method === 'POST') { guests = guests.map(g => ({ id:g.id, name:g.name, wedding:'', friday:'', allergies:'', accommodation:'', status:'Ikke svart', revision:0 })); res.end('OK'); return; }
  let content, type = 'text/html; charset=utf-8';
  if (url.pathname === '/rsvp-config.js') { type = 'application/javascript'; content = `window.RSVP_CONFIG={enabled:true,endpoint:'${origin}/mock-app'};`; }
  else if (url.pathname === '/mock-app') {
    const boot = JSON.stringify({ parent:origin, channel:url.searchParams.get('channel'), mode:url.searchParams.get('mode') }).replace(/</g,'\\u003c');
    content = fs.readFileSync(path.join(root,'apps-script/Rsvp.html'),'utf8').replace('<?!= bootstrap ?>',boot).replace('  <script>','  '+mockScript()+'<script>');
  } else {
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const target = path.resolve(root,relative);
    if (!target.startsWith(root + path.sep) || relative.includes('.git') || relative.startsWith('apps-script') || relative.startsWith('private-rsvp')) { res.writeHead(403).end(); return; }
    try { content = fs.readFileSync(target); } catch { res.writeHead(404).end(); return; }
    const ext = path.extname(target); type = ({'.html':'text/html; charset=utf-8','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})[ext] || 'application/octet-stream';
    if (relative === 'rsvp-bridge.js') content = content.toString()
      .replace(/const endpointOK = .*;/, 'const endpointOK = true; // LOCAL QA ONLY')
      .replace("url.protocol === 'https:' &&", `url.origin === '${origin}' || url.protocol === 'https:' &&`);
  }
  res.setHeader('Content-Type', type); res.end(content);
}).listen(8765,'127.0.0.1',()=>console.log('Local QA preview: '+origin+'/#invitasjon='+token));
