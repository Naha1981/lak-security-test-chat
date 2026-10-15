const http = require('http');
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const SYSTEM = `You are the instant WhatsApp-style reply assistant for LAK Security Services, a South African business that installs and repairs gate motors, garage doors and CCTV. LAK is open 24 hours. This is a TEST preview built by NahaLabs so the owner can see how enquiries would be handled. Rules:
- Reply in short, friendly, plain messages (1-3 sentences). One question at a time.
- Work out which service the customer needs (gate motor, garage door, CCTV, or other).
- Collect what a site visit needs, one detail at a time. Gate motor or garage door: make/brand if known, what is happening (not opening, noisy, remote not working, power cut), manual or sliding or swing. CCTV: new install or repair, number of cameras, house or business.
- Always collect: customer name, suburb or area, best phone number, preferred day/time for a visit.
- If asked about hours, say LAK is open 24 hours. If asked about a service outside gate motors, garage doors and CCTV, say the team will confirm whether they can help.
- Never invent prices, availability, brands, response times or guarantees. If asked about price say the team will confirm after a quick look, or after the site visit details are in.
- Never claim an appointment is booked. Say the details are noted and a person from LAK will confirm.
- When you have the service, issue, name, area, phone and preferred time, give a short summary in this format and say the team will confirm:
  SUMMARY FOR LAK: service | issue | name | area | phone | preferred time
- If the customer says it is an emergency (break-in), tell them to call the LAK team directly and local emergency services if there is danger.
- Stay on topic. If asked something unrelated, politely steer back.`;
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAK Security - test chat</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0b141a;color:#e9edef;display:flex;flex-direction:column;height:100vh}
header{background:#202c33;padding:12px 16px}header b{display:block}header small{color:#8696a0}
#log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.m{max-width:80%;padding:8px 12px;border-radius:8px;white-space:pre-wrap;line-height:1.35}.u{align-self:flex-end;background:#005c4b}.b{align-self:flex-start;background:#202c33}
form{display:flex;gap:8px;padding:10px;background:#202c33}input{flex:1;padding:12px;border-radius:20px;border:0;background:#2a3942;color:#e9edef;font-size:16px}button{border:0;border-radius:20px;padding:0 18px;background:#00a884;color:#fff;font-size:16px}
.note{background:#182229;color:#8696a0;font-size:12px;padding:6px 12px;text-align:center}</style></head><body>
<header><b>LAK Security Services</b><small>Test preview by NahaLabs - not live yet</small></header>
<div class="note">Pretend you are a customer. Type like you would on WhatsApp.</div>
<div id="log"></div>
<form id="f"><input id="t" placeholder="Type a message" autocomplete="off"><button>Send</button></form>
<script>
const log=document.getElementById('log'),t=document.getElementById('t');let hist=[];
function add(c,x){const d=document.createElement('div');d.className='m '+c;d.textContent=x;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
add('b','Hi, thanks for contacting LAK Security Services. What do you need help with: gate motor, garage door or CCTV?');
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const v=t.value.trim();if(!v)return;t.value='';add('u',v);hist.push({role:'user',content:v});const w=add('b','...');
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist})});const j=await r.json();w.textContent=j.reply||'Sorry, something went wrong.';hist.push({role:'assistant',content:j.reply||''})}catch(_){w.textContent='Sorry, something went wrong.'}};
</script></body></html>`;
const HITS = [];
http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/stats')) { const ok = process.env.STATS_KEY && req.url.includes('k=' + process.env.STATS_KEY); res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' }); res.end(ok ? JSON.stringify(HITS.slice(-100)) : '{}'); return; }
  if (req.method === 'GET' && req.url !== '/health' && !req.url.startsWith('/favicon')) { const h = { t: new Date().toISOString(), p: req.url.slice(0, 80), ua: String(req.headers['user-agent'] || '').slice(0, 90) }; HITS.push(h); console.log('HIT ' + JSON.stringify(h)); }
  if (req.url === '/health') { res.writeHead(200); return res.end('ok'); }
  if (req.method === 'POST' && req.url === '/api/chat') {
    let b = ''; req.on('data', c => b += c); req.on('end', async () => {
      try {
        const { messages } = JSON.parse(b); HITS.push({ t: new Date().toISOString(), chat: messages.length, last: String(messages[messages.length - 1].content).slice(0, 80) });
        const msgs = [{ role: 'system', content: SYSTEM }, ...messages.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 1000) }))];
        let reply = null;
        const chain = [MODEL, 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
        for (let i = 0; i < 6 && !reply; i++) {
          try {
            const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', { method: 'POST', signal: AbortSignal.timeout(9000), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY }, body: JSON.stringify({ model: chain[i % chain.length], messages: msgs }) });
            const j = await r.json();
            reply = j.choices && j.choices[0] && j.choices[0].message.content;
          } catch (_) {}
        }
        if (!reply) reply = 'Sorry, I am slow to answer right now. What do you need help with: gate motor, garage door or CCTV?';
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: reply || null }));
      } catch (e) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: null })); }
    }); return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PAGE);
}).listen(process.env.PORT || 3000);
