// Local integration QA against the real, user-approved Apps Script deployment.
// The source configuration stays disabled. Never serve private-rsvp or tests.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const state = JSON.parse(fs.readFileSync(path.join(root,'private-rsvp/cloud-setup.private.json'),'utf8'));
if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(state.webAppUrl || '')) throw new Error('Set verified webAppUrl in private setup state first.');
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://127.0.0.1:8766');
  const name = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  if (!(/^(index|invitasjon|onskeliste)\.html$/.test(name) || /^(rsvp-config|rsvp-bridge|rsvp|onskeliste)\.js$/.test(name) || /^(images|vendor)\/[\w.-]+$/.test(name))) {res.writeHead(404).end();return;}
  let data;
  try {data = name === 'rsvp-config.js' ? 'window.RSVP_CONFIG='+JSON.stringify({enabled:true,endpoint:state.webAppUrl})+';' : fs.readFileSync(path.join(root,name));}
  catch {res.writeHead(404).end();return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif'})[path.extname(name)]||'application/octet-stream');
  res.end(data);
}).listen(8766,'127.0.0.1',()=>console.log('Real Google integration preview: http://127.0.0.1:8766'));
