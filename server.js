const http = require('http');
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const OP = process.env.OPERATOR_BASE_URL || 'https://my-own-whatsapp-2z5h.onrender.com';
const OPKEY = process.env.OPERATOR_API_KEY || '';
const LAK_APP = 'lak-concierge';
const LAK_TENANT = 'lak-security';
const LAK_ACC = process.env.LAK_WA_ACCOUNT_ID || '';
let tenantKeyCache = { key: null, at: 0 };

function opFetch(path, method, body) {
  return fetch(OP + path, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', 'x-api-key': OPKEY, 'x-app-id': LAK_APP, 'x-tenant-id': LAK_TENANT },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));
}

async function getTenantKey() {
  if (tenantKeyCache.key && Date.now() - tenantKeyCache.at < 5 * 60 * 1000) return tenantKeyCache.key;
  try {
    const r = await opFetch('/tenant-secrets/' + LAK_APP + '/' + LAK_TENANT + '/gemini_api_key', 'GET');
    if (r.status === 200 && r.body.value) { tenantKeyCache = { key: r.body.value, at: Date.now() }; return r.body.value; }
  } catch (_) {}
  return null;
}

function readBody(req) {
  return new Promise(resolve => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (_) { resolve({}); } }); });
}

function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }

const SYSTEM = `You are the instant WhatsApp-style reply assistant for LAK Security Services, a South African business that installs and repairs gate motors, garage doors and CCTV. LAK is open 24 hours. Built by NahaLabs. Rules:
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
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAK Security - growth engine by NahaLabs</title>
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
<div class="hero"><small>BUILT FOR LAK SECURITY SERVICES BY NAHALABS</small><h1>Your WhatsApp should find you customers, not just answer them</h1><p>Any bot can reply to messages. This is the part it cannot do: it watches your market, writes your content from real customer questions, and posts for you. Below is what your upgrade does.</p></div>

<section><h2>1. Content engine: your customer chats become posts</h2>
<p>Type a question a customer might send you. It writes a ready-to-post social post and tells you what the question says about demand.</p>
<textarea id="q" placeholder="e.g. My sliding gate motor is not opening and the remote is dead"></textarea>
<button class="btn" id="pb" type="button">Write my post</button>
<div class="card" id="po" style="display:none"></div>
<p style="margin-top:12px">Examples of posts it writes from your common questions</p><p style="margin-top:2px;font-size:12px;color:#8696a0">Sample data. Fictional records.</p>
<div class="card">Gate motor not opening? Before you call anyone, check three things: is there power to the motor, is the manual release engaged, and has the remote battery gone flat. Still stuck? We are open 24 hours.<small>Built from: customers asking "my gate won't open".</small></div>
<div class="card">Garage door going up and down by itself, or stopping halfway? That is usually the springs or the sensor, not a new motor. Send us a message and we will tell you what it is before you spend money.<small>Built from: garage door repair questions.</small></div>
<div class="card">Is your CCTV recording, or only looking? A camera that is not saving footage will not help after a break-in. Ask us for a quick check of your cameras and recorder.<small>Built from: CCTV repair questions.</small></div></section>

<section><h2>2. Opportunity radar: what your area wants before it calls you</h2>
<p>Once connected to your area, it scouts what people search and ask about security and shows you where demand is rising. No figures are shown here because none are live.</p>
<div class="card">Competitor watch: new offers, prices and posts from other security companies near you, summarised weekly, with one suggested response.</div></section>

<section><h2>3. Posting: it publishes for you, you stay in control</h2>
<p>Each week you get a short list of drafted posts built from the radar and your chats. You tap approve, it posts to your pages. Nothing goes out without your yes.</p>
<div class="card">Monday: gate motor tips post  -  waiting for your approval<br>Wednesday: CCTV check offer  -  waiting for your approval<br>Friday: garage door springs post  -  waiting for your approval</div></section>

<section><h2>It also answers your customers</h2>
<p>The basics, in your hours and services. Type like a customer.</p>
<div id="log"></div>
<form id="f"><input id="t" placeholder="Type a message" autocomplete="off"><button>Send</button></form></section>
<div class="foot">Built by NahaLabs for LAK Security Services.</div></div>
<script>
const log=document.getElementById('log'),t=document.getElementById('t');let hist=[];
function add(c,x){const d=document.createElement('div');d.className='m '+c;d.textContent=x;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
add('b','Hi, thanks for contacting LAK Security Services. What do you need help with: gate motor, garage door or CCTV?');
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const v=t.value.trim();if(!v)return;t.value='';add('u',v);hist.push({role:'user',content:v});const w=add('b','...');
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist})});const j=await r.json();w.textContent=j.reply||'Sorry, something went wrong.';hist.push({role:'assistant',content:j.reply||''})}catch(_){w.textContent='Sorry, something went wrong.'}};
document.getElementById('pb').onclick=async()=>{const o=document.getElementById('po'),q=document.getElementById('q').value.trim();o.style.display='block';if(!q){o.textContent='Type a customer question first.';return}o.textContent='Writing... (the first one can take up to a minute while the free server wakes)';
try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'post',messages:[{role:'user',content:q},{role:'user',content:'Write the output now from the customer message above.'}]})});const j=await r.json();o.textContent=(j.reply||'Sorry, try again.')+'\\n\\n(On the upgrade this is drafted for you to approve, then posted to your pages.)'}catch(_){o.textContent='Sorry, try again.'}};
</script></body></html>`;
const ONBOARD = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAK Security concierge setup - NahaLabs</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b141a;color:#e9edef;line-height:1.5}
.w{max-width:640px;margin:0 auto;padding:24px 16px 48px}
.brand{display:flex;align-items:baseline;gap:10px;padding:8px 0 4px}.brand b{font-size:18px;letter-spacing:.02em}.brand span{color:#00a884;font-size:12px;font-weight:700;letter-spacing:.08em}
h1{font-size:22px;margin:12px 0 4px}p.sub{color:#aebac1;margin:0 0 8px;font-size:14px}
section{background:#111b21;border:1px solid #1f2c34;border-radius:12px;padding:18px;margin:16px 0}section h2{font-size:16px;margin:0 0 4px}section>p{color:#8696a0;font-size:13px;margin:2px 0 12px}
input{width:100%;padding:12px 14px;border-radius:8px;border:1px solid #2a3942;background:#202c33;color:#e9edef;font-size:16px;font-family:inherit}
.btn{background:#00a884;color:#fff;border:0;border-radius:8px;padding:12px 16px;font-size:15px;font-weight:600;margin-top:10px;cursor:pointer}.btn:disabled{opacity:.5;cursor:default}
.code{font-size:34px;letter-spacing:.14em;font-weight:700;text-align:center;background:#202c33;border:1px dashed #3b4a54;border-radius:10px;padding:16px;margin:12px 0 4px}
.small{font-size:12px;color:#8696a0;text-align:center}
.status{display:flex;align-items:center;gap:8px;font-size:14px;margin-top:8px}.dot{width:10px;height:10px;border-radius:50%;background:#f5c542}.dot.on{background:#4ade80}
ol{color:#aebac1;font-size:14px;padding-left:20px;margin:10px 0}ol li{margin:4px 0}
.ok{color:#4ade80;font-size:14px}.err{color:#f87171;font-size:13px;margin-top:8px}
.foot{color:#8696a0;font-size:12px;text-align:center;margin-top:24px}</style></head><body><div class="w">
<div class="brand"><b>NahaLabs</b><span>LAK SECURITY SERVICES</span></div>
<h1>Concierge setup</h1><p class="sub">Two steps and your WhatsApp concierge is live: link your business WhatsApp, then add your free Gemini key.</p>

<section><h2>Step 1 - Link your WhatsApp</h2>
<p>Enter the WhatsApp Business number your customers message. We show you a code; you enter it in WhatsApp on that phone. Nothing is posted or sent during setup.</p>
<input id="num" type="tel" placeholder="+27 ..." autocomplete="tel">
<button class="btn" id="getcode" type="button">Get my linking code</button>
<div id="codewrap" style="display:none">
<div class="code" id="code"></div>
<div class="small" id="exp"></div>
<ol><li>Open WhatsApp on the phone for that number</li><li>Go to <b>Linked devices</b></li><li>Tap <b>Link a device</b></li><li>Tap <b>Link with phone number instead</b></li><li>Enter this code</li></ol></div>
<div class="status"><span class="dot" id="dot"></span><span id="stext">Waiting for linking</span></div>
<div class="err" id="e1"></div></section>

<section><h2>Step 2 - Your Gemini key</h2>
<p>The concierge answers with your own free Google Gemini key, so your usage is yours alone. Get one at aistudio.google.com (Get API key) and paste it here. It is stored encrypted on NahaLabs servers, used only for your concierge, and never asked for in WhatsApp chat.</p>
<input id="gkey" type="password" placeholder="AIza..." autocomplete="off">
<button class="btn" id="savekey" type="button">Save my key</button>
<div class="err" id="e2"></div><div class="ok" id="ok2"></div>
<p style="margin-top:10px">If the free daily limit is reached, your customers get a clear message that the LAK team will attend to them directly - never silence.</p></section>

<div class="foot">Setup by NahaLabs for LAK Security Services. Your number and key are used only to run your concierge.</div></div>
<script>
var poll=null;
function err(id,m){document.getElementById(id).textContent=m||''}
document.getElementById('getcode').onclick=async function(){
  err('e1');var b=document.getElementById('getcode');b.disabled=true;
  try{
    var r=await fetch('/api/onboard/pairing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:document.getElementById('num').value})});
    var j=await r.json();
    if(j.status==='connected'){setConnected();return}
    if(j.code){document.getElementById('codewrap').style.display='block';document.getElementById('code').textContent=j.code;
      var exp=new Date(j.expiresAt).getTime();var t=setInterval(function(){var s=Math.max(0,Math.round((exp-Date.now())/1000));document.getElementById('exp').textContent=s>0?('Code expires in '+s+'s - get a new one if it lapses'):'Code lapsed - tap the button for a fresh one';if(s<=0)clearInterval(t)},1000);
      startPoll();}
    else err('e1',j.error||'Something went wrong. Try again.');
  }catch(_){err('e1','Network problem. Try again.')}finally{b.disabled=false}
};
function setConnected(){document.getElementById('dot').className='dot on';document.getElementById('stext').textContent='Connected - your WhatsApp is linked';document.getElementById('codewrap').style.display='none';if(poll)clearInterval(poll)}
function startPoll(){if(poll)clearInterval(poll);poll=setInterval(async function(){
  try{var r=await fetch('/api/onboard/status');var j=await r.json();if(j.connected)setConnected()}catch(_){}},4000)}
document.getElementById('savekey').onclick=async function(){
  err('e2');document.getElementById('ok2').textContent='';var b=document.getElementById('savekey');b.disabled=true;
  try{var r=await fetch('/api/onboard/gemini-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:document.getElementById('gkey').value})});
  var j=await r.json();
  if(j.stored){document.getElementById('ok2').textContent='Saved. Your key is stored encrypted and only your concierge can use it.';document.getElementById('gkey').value=''}
  else err('e2',j.error||'Could not save. Try again.')}catch(_){err('e2','Network problem. Try again.')}finally{b.disabled=false}
};
</script></body></html>`;
const POSTSYS = `You turn a customer chat with LAK Security Services (gate motors, garage doors, CCTV, open 24 hours) into marketing output for the owner. Output exactly two parts, plain text, no markdown:
SOCIAL POST: a ready-to-post Facebook/WhatsApp Status post (2-4 short sentences) that answers the customer's underlying question helpfully, never uses the customer's name or phone, never invents prices, guarantees or response times, and ends with a call to message LAK.
WHAT THIS CHAT TELLS YOU: one or two short lines on the demand signal (what the customer needed, what kind of customers ask this). If the chat has too little content, say so briefly and base the post on the topic the customer raised.`;
const HITS = [];
const POSTS = {};
http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/stats')) { const ok = process.env.STATS_KEY && req.url.includes('k=' + process.env.STATS_KEY); res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' }); res.end(ok ? JSON.stringify(HITS.slice(-100)) : '{}'); return; }
  if (req.method === 'GET' && req.url !== '/health' && !req.url.startsWith('/favicon')) { const h = { t: new Date().toISOString(), p: req.url.slice(0, 80), ua: String(req.headers['user-agent'] || '').slice(0, 90) }; HITS.push(h); console.log('HIT ' + JSON.stringify(h)); }
  if (req.url === '/health') { res.writeHead(200); return res.end('ok'); }
  if (req.method === 'POST' && req.url === '/api/chat') {
    let b = ''; req.on('data', c => b += c); req.on('end', async () => {
      try {
        const { messages, mode } = JSON.parse(b);
        if (mode === 'post') { const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); const d = new Date().toISOString().slice(0, 10); const k = ip + d; POSTS[k] = (POSTS[k] || 0) + 1; if (POSTS[k] > 3) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ reply: 'That is the 3 free post drafts for today. On the upgrade it writes your posts every week from your real customer chats. Message us and we will set up your first batch.' })); } } HITS.push({ t: new Date().toISOString(), chat: messages.length, last: String(messages[messages.length - 1].content).slice(0, 80) });
        const msgs = [{ role: 'system', content: mode === 'post' ? POSTSYS : SYSTEM }, ...messages.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 1000) }))];
        const chatKey = (await getTenantKey()) || KEY;
        let reply = null; let quotaHit = false;
        const chain = [MODEL, 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
        for (let i = 0; i < 6 && !reply; i++) {
          try {
            const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', { method: 'POST', signal: AbortSignal.timeout(9000), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chatKey }, body: JSON.stringify({ model: chain[i % chain.length], messages: msgs }) });
            const j = await r.json();
            if (r.status === 429 || (j.error && /quota|rate.?limit|exhausted/i.test(String(j.error.message || '')))) quotaHit = true;
            reply = j.choices && j.choices[0] && j.choices[0].message.content;
          } catch (_) {}
        }
        if (!reply && mode === 'post') { reply = 'That one took too long. Please press the button again.'; if (POSTS) { const ip2 = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); const k2 = ip2 + new Date().toISOString().slice(0, 10); if (POSTS[k2]) POSTS[k2]--; } }
        if (!reply && quotaHit) reply = 'Our automated assistant has reached its free usage limit for today. Your message has been noted and a member of the LAK team will attend to you directly. You can also call LAK any time - we are open 24 hours.';
        if (!reply) reply = 'Sorry, I am slow to answer right now. What do you need help with: gate motor, garage door or CCTV?';
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: reply || null }));
      } catch (e) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ reply: null })); }
    }); return;
  }
  if (req.method === 'GET' && req.url === '/onboard') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(ONBOARD); }

  if (req.method === 'POST' && req.url === '/api/onboard/pairing') {
    const body = await readBody(req);
    const phoneNumber = String(body.phoneNumber || '').trim();
    if (!/^\+?\d{8,15}$/.test(phoneNumber.replace(/[\s-]/g, ''))) return json(res, 400, { error: 'Enter the number in international format, e.g. +2782...' });
    if (!LAK_ACC) return json(res, 503, { error: 'Onboarding is not fully configured yet. NahaLabs has been notified.' });
    try {
      const r = await opFetch('/accounts/' + LAK_ACC + '/pairing-code', 'POST', { phoneNumber: phoneNumber.replace(/[\s-]/g, '') });
      if (r.status === 200) return json(res, 200, { status: r.body.status, code: r.body.pairingCodeDisplay, expiresAt: r.body.expiresAt });
      if (r.body && r.body.error === 'ALREADY_CONNECTED') return json(res, 200, { status: 'connected' });
      return json(res, 502, { error: (r.body && r.body.message) || 'Could not get a code right now. Try again in a moment.' });
    } catch (_) { return json(res, 502, { error: 'Could not reach the connection service. Try again in a moment.' }); }
  }

  if (req.method === 'GET' && req.url === '/api/onboard/status') {
    if (!LAK_ACC) return json(res, 503, { error: 'Onboarding is not fully configured yet.' });
    try {
      const r = await opFetch('/accounts/' + LAK_ACC + '/status', 'GET');
      if (r.status === 200) return json(res, 200, { connected: !!r.body.isConnected, status: r.body.status, phoneNumber: r.body.phoneNumber });
      return json(res, 502, { error: 'Status unavailable right now.' });
    } catch (_) { return json(res, 502, { error: 'Status unavailable right now.' }); }
  }

  if (req.method === 'POST' && req.url === '/api/onboard/gemini-key') {
    const body = await readBody(req);
    const key = String(body.key || '').trim();
    if (key.length < 20 || key.length > 200 || /\s/.test(key)) return json(res, 400, { error: 'That does not look like a Gemini API key. Paste the full key.' });
    try {
      const r = await opFetch('/tenant-secrets/' + LAK_APP + '/' + LAK_TENANT + '/gemini_api_key', 'PUT', { value: key });
      if (r.status === 200) { tenantKeyCache = { key, at: Date.now() }; return json(res, 200, { stored: true }); }
      return json(res, 502, { error: 'Could not store the key right now. Try again in a moment.' });
    } catch (_) { return json(res, 502, { error: 'Could not store the key right now. Try again in a moment.' }); }
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(PAGE);
}).listen(process.env.PORT || 3000);
