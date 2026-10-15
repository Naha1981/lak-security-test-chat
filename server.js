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
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAK Security - growth engine preview</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b141a;color:#e9edef;line-height:1.45}
.w{max-width:760px;margin:0 auto;padding:0 16px 40px}
.hero{padding:28px 0 8px}.hero small{color:#00a884;font-weight:700;letter-spacing:.06em}.hero h1{font-size:26px;margin:6px 0 8px}.hero p{color:#aebac1;margin:0}
.tag{display:inline-block;background:#3b2f0b;color:#f5c542;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle}.tag.live{background:#0b3b2a;color:#4ade80}
section{background:#111b21;border:1px solid #1f2c34;border-radius:12px;padding:16px;margin:16px 0}section h2{font-size:18px;margin:0 0 4px}section>p{color:#8696a0;font-size:14px;margin:2px 0 10px}
.card{background:#202c33;border-radius:8px;padding:10px 12px;margin:8px 0;font-size:14px;white-space:pre-wrap}.card small{display:block;color:#8696a0;margin-top:6px}
textarea{width:100%;min-height:64px;border-radius:8px;border:0;background:#2a3942;color:#e9edef;padding:10px;font-size:16px;font-family:inherit}
.btn{background:#00a884;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-size:15px;margin:8px 0}
.bar{height:10px;border-radius:5px;background:#2a3942;margin:6px 0}.bar i{display:block;height:100%;border-radius:5px;background:repeating-linear-gradient(45deg,#3b4a54,#3b4a54 6px,#2a3942 6px,#2a3942 12px)}
.row{display:flex;gap:8px;align-items:center;font-size:14px}.row b{width:190px;flex:none;font-weight:500}.row .bar{flex:1}
.m{max-width:85%;padding:8px 12px;border-radius:8px;white-space:pre-wrap;margin:6px 0}.u{margin-left:auto;background:#005c4b}.b{background:#202c33}
#log{max-height:260px;overflow:auto;display:flex;flex-direction:column}form{display:flex;gap:8px;margin-top:8px}input{flex:1;padding:12px;border-radius:20px;border:0;background:#2a3942;color:#e9edef;font-size:16px}form button{border:0;border-radius:20px;padding:0 18px;background:#2a3942;color:#e9edef;font-size:16px}
.foot{color:#8696a0;font-size:12px;text-align:center;margin-top:20px}</style></head><body><div class="w">
<div class="hero"><small>PREVIEW BUILT FOR LAK SECURITY SERVICES BY NAHALABS</small><h1>Your WhatsApp should find you customers, not just answer them</h1><p>Any bot can reply to messages. This is the part it cannot do: it watches your market, writes your content from real customer questions, and posts for you. Below is what your upgrade does. Anything marked EXAMPLE or ILLUSTRATIVE is not live data.</p></div>

<section><h2>1. Content engine: your customer chats become posts <span class="tag live">LIVE TEST</span></h2>
<p>Type a question a customer might send you. It writes a ready-to-post social post and tells you what the question says about demand.</p>
<textarea id="q" placeholder="e.g. My sliding gate motor is not opening and the remote is dead"></textarea>
<button class="btn" id="pb" type="button">Write my post</button>
<div class="card" id="po" style="display:none"></div>
<p style="margin-top:12px">Examples of posts it writes from your common questions <span class="tag">EXAMPLE</span></p>
<div class="card">Gate motor not opening? Before you call anyone, check three things: is there power to the motor, is the manual release engaged, and has the remote battery gone flat. Still stuck? We are open 24 hours.<small>Built from: customers asking "my gate won't open".</small></div>
<div class="card">Garage door going up and down by itself, or stopping halfway? That is usually the springs or the sensor, not a new motor. Send us a message and we will tell you what it is before you spend money.<small>Built from: garage door repair questions.</small></div>
<div class="card">Is your CCTV recording, or only looking? A camera that is not saving footage will not help after a break-in. Ask us for a quick check of your cameras and recorder.<small>Built from: CCTV repair questions.</small></div></section>

<section><h2>2. Opportunity radar: what your area wants before it calls you <span class="tag">ILLUSTRATIVE</span></h2>
<p>Once connected to your area, it scouts what people search and ask about security and shows you where demand is rising. No figures are shown here because none are live.</p>
<div class="row"><b>Gate motor repair</b><div class="bar"><i style="width:70%"></i></div></div>
<div class="row"><b>Garage door springs</b><div class="bar"><i style="width:45%"></i></div></div>
<div class="row"><b>CCTV installation</b><div class="bar"><i style="width:58%"></i></div></div>
<div class="row"><b>Remote not working</b><div class="bar"><i style="width:35%"></i></div></div>
<div class="card">Competitor watch: new offers, prices and posts from other security companies near you, summarised weekly, with one suggested response.<small>Example layout only. Bar lengths are placeholders, not data.</small></div></section>

<section><h2>3. Posting: it publishes for you, you stay in control <span class="tag">EXAMPLE</span></h2>
<p>Each week you get a short list of drafted posts built from the radar and your chats. You tap approve, it posts to your pages. Nothing goes out without your yes.</p>
<div class="card">Monday: gate motor tips post  -  waiting for your approval<br>Wednesday: CCTV check offer  -  waiting for your approval<br>Friday: garage door springs post  -  waiting for your approval<small>Example schedule only.</small></div></section>

<section><h2>It also answers your customers <span class="tag live">LIVE TEST</span></h2>
<p>The basics, in your hours and services. Type like a customer.</p>
<div id="log"></div>
<form id="f"><input id="t" placeholder="Type a message" autocomplete="off"><button>Send</button></form></section>
<div class="foot">Test preview by NahaLabs. Not connected to your WhatsApp or social pages yet.</div></div>
<script>
const log=document.getElementById('log'),t=document.getElementById('t');let hist=[];
function add(c,x){const d=document.createElement('div');d.className='m '+c;d.textContent=x;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
add('b','Hi, thanks for contacting LAK Security Services. What do you need help with: gate motor, garage door or CCTV?');
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const v=t.value.trim();if(!v)return;t.value='';add('u',v);hist.push({role:'user',content:v});const w=add('b','...');
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist})});const j=await r.json();w.textContent=j.reply||'Sorry, something went wrong.';hist.push({role:'assistant',content:j.reply||''})}catch(_){w.textContent='Sorry, something went wrong.'}};
document.getElementById('pb').onclick=async()=>{const o=document.getElementById('po'),q=document.getElementById('q').value.trim();o.style.display='block';if(!q){o.textContent='Type a customer question first.';return}o.textContent='Writing... (the first one can take up to a minute while the free server wakes)';
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'post',messages:[{role:'user',content:q},{role:'user',content:'Write the output now from the customer message above.'}]})});const j=await r.json();o.textContent=(j.reply||'Sorry, try again.')+'\\n\\n(Example output. On the upgrade this is drafted for you to approve, then posted to your pages.)'}catch(_){o.textContent='Sorry, try again.'}};
</script></body></html>`;
const POSTSYS = `You turn a customer chat with LAK Security Services (gate motors, garage doors, CCTV, open 24 hours) into marketing output for the owner. Output exactly two parts, plain text, no markdown:
SOCIAL POST: a ready-to-post Facebook/WhatsApp Status post (2-4 short sentences) that answers the customer's underlying question helpfully, never uses the customer's name or phone, never invents prices, guarantees or response times, and ends with a call to message LAK.
WHAT THIS CHAT TELLS YOU: one or two short lines on the demand signal (what the customer needed, what kind of customers ask this). If the chat has too little content, say so briefly and base the post on the topic the customer raised.`;
const HITS = [];
http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/stats')) { const ok = process.env.STATS_KEY && req.url.includes('k=' + process.env.STATS_KEY); res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' }); res.end(ok ? JSON.stringify(HITS.slice(-100)) : '{}'); return; }
  if (req.method === 'GET' && req.url !== '/health' && !req.url.startsWith('/favicon')) { const h = { t: new Date().toISOString(), p: req.url.slice(0, 80), ua: String(req.headers['user-agent'] || '').slice(0, 90) }; HITS.push(h); console.log('HIT ' + JSON.stringify(h)); }
  if (req.url === '/health') { res.writeHead(200); return res.end('ok'); }
  if (req.method === 'POST' && req.url === '/api/chat') {
    let b = ''; req.on('data', c => b += c); req.on('end', async () => {
      try {
        const { messages, mode } = JSON.parse(b); HITS.push({ t: new Date().toISOString(), chat: messages.length, last: String(messages[messages.length - 1].content).slice(0, 80) });
        const msgs = [{ role: 'system', content: mode === 'post' ? POSTSYS : SYSTEM }, ...messages.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 1000) }))];
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
