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
<div class="hero"><small>BUILT FOR LAK SECURITY SERVICES BY NAHALABS</small><h1>Your WhatsApp answers customers 24 hours, and turns their questions into posts</h1><p>Any bot can reply to messages. Today: it answers your customers on WhatsApp and writes post ideas from their questions. Market watch and posting are planned for later and are not live yet.</p></div>

<section><h2>1. Content engine (preview): customer questions become posts</h2>
<p>This is a preview. Type a question a customer might send you. It writes a ready-to-post social post and tells you what the question says about demand.</p>
<textarea id="q" placeholder="e.g. My sliding gate motor is not opening and the remote is dead"></textarea>
<button class="btn" id="pb" type="button">Write my post</button>
<div class="card" id="po" style="display:none"></div>
<p style="margin-top:12px">Examples of posts it can write from common questions</p><p style="margin-top:2px;font-size:12px;color:#8696a0">Sample data. Fictional records.</p>
<div class="card">Gate motor not opening? Before you call anyone, check three things: is there power to the motor, is the manual release engaged, and has the remote battery gone flat. Still stuck? We are open 24 hours.<small>Built from: customers asking "my gate won't open".</small></div>
<div class="card">Garage door going up and down by itself, or stopping halfway? That is usually the springs or the sensor, not a new motor. Send us a message and we will tell you what it is before you spend money.<small>Built from: garage door repair questions.</small></div>
<div class="card">Is your CCTV recording, or only looking? A camera that is not saving footage will not help after a break-in. Ask us for a quick check of your cameras and recorder.<small>Built from: CCTV repair questions.</small></div></section>

<section><h2>2. Opportunity radar - coming next, not live yet</h2>
<p>This is not built yet. The plan is to show what people in your area ask about security. Nothing is running for you today.</p>
</section>

<section><h2>3. Posting - coming next, not live yet</h2>
<p>This is not built yet and nothing posts for you today. When it exists, nothing will go out without your yes.</p>
</section>

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

// ---- WhatsApp reply loop (linked account -> Operator webhook -> Gemini -> Operator /send) ----
const crypto = require('crypto');
const WH_SECRET = process.env.WEBHOOK_SECRET || '';
const CONVOS = new Map();      // chatId -> { msgs: [], at }
const SEEN = new Map();        // messageId -> ts (dedupe webhook retries)
const DAILY = new Map();       // chatId+day -> bot replies count
const MAX_REPLIES_PER_CHAT_PER_DAY = 40;
const QUOTA_MSG = 'Our automated assistant has reached its free usage limit for today. Your message has been noted and a member of the LAK team will attend to you directly. You can also call LAK any time - we are open 24 hours.';
const SLOW_MSG = 'Sorry, I am slow to answer right now. What do you need help with: gate motor, garage door or CCTV?';
const NOTEXT_MSG = 'Thanks. I can only read typed messages here. Please type what you need help with: gate motor, garage door or CCTV?';

function verifyWebhook(raw, sig) {
  if (!WH_SECRET || !sig) return false;
  try {
    const expected = crypto.createHmac('sha256', WH_SECRET).update(raw).digest();
    const got = Buffer.from(String(sig), 'hex');
    return got.length === expected.length && crypto.timingSafeEqual(expected, got);
  } catch (_) { return false; }
}

async function genReply(msgs) {
  const chatKey = (await getTenantKey()) || KEY;
  let quotaHit = false;
  const chain = [MODEL, 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', { method: 'POST', signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chatKey }, body: JSON.stringify({ model: chain[i % chain.length], messages: msgs }) });
      const j = await r.json();
      if (r.status === 429 || (j.error && /quota|rate.?limit|exhausted/i.test(String(j.error.message || '')))) quotaHit = true;
      const t = j.choices && j.choices[0] && j.choices[0].message.content;
      if (t) return { reply: String(t).slice(0, 1200), quotaHit: false };
    } catch (_) {}
  }
  return { reply: quotaHit ? QUOTA_MSG : SLOW_MSG, quotaHit };
}

async function handleWaMessage(payload, selfTest) {
  const d = payload.data || {};
  if (payload.event !== 'message') return { skipped: 'event' };
  if (d.fromMe) return { skipped: 'fromMe' };
  const chatId = String(d.chatId || '');
  if (!chatId || chatId.endsWith('@g.us') || chatId.startsWith('status@') || chatId.includes('broadcast') || chatId.endsWith('@newsletter')) return { skipped: 'not-a-customer-chat' };
  const mid = d.messageId || '';
  if (mid) { if (SEEN.has(mid)) return { skipped: 'duplicate' }; SEEN.set(mid, Date.now()); if (SEEN.size > 2000) { const cut = Date.now() - 6 * 3600 * 1000; for (const [k, v] of SEEN) if (v < cut) SEEN.delete(k); } }
  const dayKey = chatId + new Date().toISOString().slice(0, 10);
  const used = DAILY.get(dayKey) || 0;
  if (used >= MAX_REPLIES_PER_CHAT_PER_DAY) return { skipped: 'daily-cap' };
  let text = typeof d.text === 'string' ? d.text.trim() : '';
  let reply, quotaHit = false;
  if (!text) { reply = NOTEXT_MSG; }
  else {
    const c = CONVOS.get(chatId) && Date.now() - CONVOS.get(chatId).at < 24 * 3600 * 1000 ? CONVOS.get(chatId) : { msgs: [], at: Date.now() };
    recordQuestion(text).catch(() => {});
    c.msgs.push({ role: 'user', content: text.slice(0, 1000) }); c.msgs = c.msgs.slice(-20);
    const g = await genReply([{ role: 'system', content: SYSTEM }, ...c.msgs]);
    reply = g.reply; quotaHit = g.quotaHit;
    c.msgs.push({ role: 'assistant', content: reply }); c.at = Date.now(); CONVOS.set(chatId, c);
  }
  DAILY.set(dayKey, used + 1);
  if (selfTest) return { selfTest: true, wouldSend: reply, quotaHit };
  const r = await opFetch('/send', 'POST', { waAccountId: payload.waAccountId || LAK_ACC, to: chatId, text: reply });
  console.log('WA_REPLY chat=' + chatId.replace(/\d(?=\d{4})/g, '*') + ' status=' + r.status);
  return { sent: r.status >= 200 && r.status < 300, status: r.status };
}

// ---- Chat-fed content engine + opportunity radar (persisted in the Operator's encrypted tenant store) ----
const TZ_OFF = 2 * 3600 * 1000; // SAST
const sastDay = (t) => new Date((t || Date.now()) + TZ_OFF).toISOString().slice(0, 10);
const sastHour = () => new Date(Date.now() + TZ_OFF).getUTCHours();
async function kvPut(name, obj) {
  const str = JSON.stringify(obj); const parts = [];
  for (let i = 0; i < str.length; i += 3800) parts.push(str.slice(i, i + 3800));
  for (let i = 0; i < parts.length; i++) { const r = await opFetch('/tenant-secrets/' + LAK_APP + '/' + LAK_TENANT + '/' + name + '-' + i, 'PUT', { value: parts[i] }); if (r.status !== 200) throw new Error('kv put ' + r.status); }
  const m = await opFetch('/tenant-secrets/' + LAK_APP + '/' + LAK_TENANT + '/' + name + '-n', 'PUT', { value: String(parts.length) }); if (m.status !== 200) throw new Error('kv meta ' + m.status);
}
async function kvGet(name) {
  const n = await opFetch('/tenant-secrets/' + LAK_APP + '/' + LAK_TENANT + '/' + name + '-n', 'GET'); if (n.status !== 200) return null;
  let str = ''; for (let i = 0; i < parseInt(n.body.value, 10); i++) { const r = await opFetch('/tenant-secrets/' + LAK_APP + '/' + LAK_TENANT + '/' + name + '-' + i, 'GET'); if (r.status !== 200) return null; str += r.body.value; }
  try { return JSON.parse(str); } catch (_) { return null; }
}
const QBUF = { day: '', items: [], dirty: false };
function scrub(t) { return String(t).replace(/\+?\d[\d\s\-()]{6,}\d/g, '[number]').replace(/\s+/g, ' ').trim().slice(0, 140); }
async function recordQuestion(text) {
  const day = sastDay();
  if (QBUF.day !== day) { QBUF.day = day; QBUF.items = (await kvGet('q' + day.replace(/-/g, ''))) || []; }
  QBUF.items.push(scrub(text)); while (QBUF.items.join('|').length > 3500) QBUF.items.shift();
  try { await kvPut('q' + day.replace(/-/g, ''), QBUF.items); } catch (e) { console.log('KV_ERR ' + e.message); }
}
async function geminiText(prompt, search) {
  const k = (await getTenantKey()) || KEY; let lastErr = '';
  for (const m of [MODEL, 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite']) {
    try {
      const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] }; if (search) body.tools = [{ google_search: {} }];
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify(body) });
      const j = await r.json(); const c = j.candidates && j.candidates[0];
      const txt = c && c.content && c.content.parts && c.content.parts.map(p => p.text || '').join('');
      if (txt) { const src = ((c.groundingMetadata && c.groundingMetadata.groundingChunks) || []).map(g => g.web && g.web.uri).filter(Boolean).slice(0, 6); return { text: txt, sources: src, model: m }; }
      lastErr = (j.error && j.error.message) || 'empty';
    } catch (e) { lastErr = String(e.message || e); }
  }
  throw new Error('gemini: ' + lastErr.slice(0, 120));
}
const POST_RULES = 'Rules: plain text, no markdown. Never use any customer name or phone number. Never invent prices, guarantees, response times or offers. LAK is open 24 hours and does gate motors, garage doors and CCTV (no electric fencing). Each post is 2-4 short sentences, helpful first, ends with a simple invitation to message LAK on WhatsApp.';
async function buildPosts(questions) {
  const g = await geminiText('You write social posts for LAK Security Services (Johannesburg). Below are real questions customers sent LAK on WhatsApp today. Group them into themes, then output exactly:\nDEMAND NOTE: 2 sentences on what customers asked about most today (use only counts you can see in the list).\nPOST 1: ...\nPOST 2: ...\nPOST 3: ...\nEach post answers a theme from the list. ' + POST_RULES + '\n\nQUESTIONS:\n- ' + questions.join('\n- '), false);
  return g.text;
}
async function runRadar() {
  const g = await geminiText('You are a market watcher for LAK Security Services, a gate motor, garage door and CCTV installer/repairer in Johannesburg, South Africa. Use web search to find what is current today: (1) demand signals - what Johannesburg homeowners and small businesses are asking about or reacting to for gate motors, garage doors and CCTV (load-shedding or power-related gate failures, crime trends, seasonal issues, new products); (2) competitor moves - offers, prices or posts from Johannesburg gate motor, garage door and CCTV companies. Output exactly:\nDEMAND NOTES: 3 bullets, each one sentence, each stating only what a source says.\nCOMPETITOR MOVES: up to 3 bullets with the company name and what it did. If you find nothing current, say "Nothing found today".\nSUGGESTED RESPONSE: one practical action for LAK this week.\nDo not invent figures, prices or companies. Plain text, no markdown.', true);
  const out = { at: new Date().toISOString(), text: g.text.slice(0, 2600), sources: g.sources };
  await kvPut('radar-latest', out); return out;
}
async function runDigest(testQs) {
  const day = sastDay(); const key = 'q' + day.replace(/-/g, '');
  const qs = testQs || (QBUF.day === day ? QBUF.items : (await kvGet(key)) || []);
  let out = { day, count: qs.length, test: !!testQs };
  if (!qs.length) out.text = 'No customer questions came in on WhatsApp today, so no posts were drafted.';
  else out.text = (await buildPosts(qs)).slice(0, 2800);
  if (!testQs) await kvPut('digest-latest', out);
  return out;
}
let lastAuto = '';
setInterval(async () => {
  try { const day = sastDay(); if (sastHour() >= 17 && lastAuto !== day) { lastAuto = day; const ex = await kvGet('digest-latest'); if (!ex || ex.day !== day) { await runDigest(); await runRadar(); console.log('AUTO_DIGEST_DONE ' + day); } } } catch (e) { console.log('AUTO_ERR ' + e.message); }
}, 10 * 60 * 1000);
function dashboardAuth(req) { const m = /[?&]k=([^&]+)/.exec(req.url); return !!(process.env.STATS_KEY && m && m[1] === process.env.STATS_KEY); }
const esc = (x) => String(x || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const HITS = [];
const POSTS = {};
http.createServer(async (req, res) => {
  if (req.url.startsWith('/digest') || req.url.startsWith('/api/digest') || req.url.startsWith('/api/radar')) {
    if (!dashboardAuth(req)) { res.writeHead(404); return res.end(); }
    (async () => {
      try {
        if (req.method === 'POST' && req.url.startsWith('/api/digest/run')) { const b = await readBody(req); return json(res, 200, await runDigest(Array.isArray(b.questions) ? b.questions.map(scrub) : null)); }
        if (req.method === 'POST' && req.url.startsWith('/api/radar/run')) return json(res, 200, await runRadar());
        if (req.url.startsWith('/api/digest/latest')) return json(res, 200, { digest: await kvGet('digest-latest'), radar: await kvGet('radar-latest') });
        const d = await kvGet('digest-latest'), r = await kvGet('radar-latest');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAK daily digest</title><body style="font-family:system-ui;max-width:640px;margin:20px auto;padding:0 14px;line-height:1.45"><h2>LAK daily digest</h2><h3>Posts from today\'s customer questions' + (d ? ' (' + esc(d.day) + ', ' + d.count + ' questions)' : '') + '</h3><pre style="white-space:pre-wrap;font-family:inherit">' + esc(d ? d.text : 'Nothing yet. The first digest is built after 17:00.') + '</pre><h3>Opportunity radar' + (r ? ' (' + esc(r.at.slice(0, 10)) + ')' : '') + '</h3><pre style="white-space:pre-wrap;font-family:inherit">' + esc(r ? r.text : 'Nothing yet.') + '</pre>' + (r && r.sources.length ? '<p style="font-size:12px">Sources: ' + r.sources.map(u => esc(u)).join('<br>') + '</p>' : '') + '</body>');
      } catch (e) { json(res, 500, { error: String(e.message || e) }); }
    })();
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/stats')) { const ok = process.env.STATS_KEY && req.url.includes('k=' + process.env.STATS_KEY); res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' }); res.end(ok ? JSON.stringify(HITS.slice(-100)) : '{}'); return; }
  if (req.method === 'GET' && req.url !== '/health' && !req.url.startsWith('/favicon')) { const h = { t: new Date().toISOString(), p: req.url.slice(0, 80), ua: String(req.headers['user-agent'] || '').slice(0, 90) }; HITS.push(h); console.log('HIT ' + JSON.stringify(h)); }
  if (req.method === 'POST' && req.url === '/api/wa/webhook') {
    let raw = ''; req.on('data', c => { raw += c; if (raw.length > 2e6) req.destroy(); });
    req.on('end', async () => {
      if (!verifyWebhook(raw, req.headers['x-webhook-signature'])) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":"bad signature"}'); }
      let p; try { p = JSON.parse(raw); } catch (_) { res.writeHead(400); return res.end('{}'); }
      if (p.appId !== LAK_APP || p.tenantId !== LAK_TENANT) { res.writeHead(403, { 'Content-Type': 'application/json' }); return res.end('{"error":"wrong tenant"}'); }
      if (p.selfTest === true) { const out = await handleWaMessage(p, true).catch(e => ({ error: String(e.message || e) })); res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(out)); }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
      handleWaMessage(p, false).catch(e => console.log('WA_ERR ' + String(e.message || e)));
    });
    return;
  }
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
