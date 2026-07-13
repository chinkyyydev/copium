/* Copium Clinic chat frontend.
 * Avatar layer: swaps expressions/expr-<name>.png per reply; falls back to the
 * built-in placeholder when art files aren't there yet. When the Live2D rig
 * lands, only this avatar layer changes — the chat flow stays identical. */

const log = document.getElementById('log');
const input = document.getElementById('input');
const composer = document.getElementById('composer');
const sendBtn = document.getElementById('send');
const statusEl = document.getElementById('status');
const stage = document.getElementById('stage');
const face = document.getElementById('face');
const placeholder = document.getElementById('placeholder');
const exprLabel = document.getElementById('exprLabel');
const voiceToggle = document.getElementById('voiceToggle');
const voiceState = document.getElementById('voiceState');

/** Conversation history sent to the server (roles only, no expressions). */
const messages = [];
let ttsAvailable = false;
let voiceOn = localStorage.getItem('copium-voice') === 'on';
let currentAudio = null;

// ---------- avatar ----------

/** Expressions that have a real PNG available (probed once per session). */
const artCache = new Map();

async function setExpression(name) {
  exprLabel.textContent = name;
  const src = `expressions/expr-${name}.png`;
  let ok = artCache.get(name);
  if (ok === undefined) {
    ok = await new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(true);
      probe.onerror = () => resolve(false);
      probe.src = src;
    });
    artCache.set(name, ok);
  }
  if (ok) {
    face.src = src;
    face.hidden = false;
    placeholder.hidden = true;
  } else {
    face.hidden = true;
    placeholder.hidden = false;
  }
}

// ---------- chat log ----------

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
  if (role === 'bot') {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = 'copium';
    div.appendChild(who);
  }
  div.appendChild(document.createTextNode(text));
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

function addTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot typing';
  div.innerHTML = 'rendering optimism<span class="d">.</span><span class="d">.</span><span class="d">.</span>';
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}

// ---------- voice ----------

async function speak(text) {
  if (!voiceOn || !ttsAvailable) return;
  try {
    const r = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return;
    const blob = await r.blob();
    if (currentAudio) { currentAudio.pause(); URL.revokeObjectURL(currentAudio.src); }
    const audio = new Audio(URL.createObjectURL(blob));
    currentAudio = audio;
    stage.classList.add('speaking');
    audio.onended = audio.onpause = () => stage.classList.remove('speaking');
    await audio.play().catch(() => stage.classList.remove('speaking'));
  } catch {
    /* voice is a garnish — never block the chat on it */
  }
}

function updateVoiceUi() {
  voiceToggle.setAttribute('aria-pressed', String(voiceOn));
  voiceState.textContent = ttsAvailable ? (voiceOn ? 'on' : 'off') : 'unavailable';
  voiceToggle.disabled = !ttsAvailable;
}

voiceToggle.addEventListener('click', () => {
  voiceOn = !voiceOn;
  localStorage.setItem('copium-voice', voiceOn ? 'on' : 'off');
  if (!voiceOn && currentAudio) currentAudio.pause();
  updateVoiceUi();
});

// ---------- send flow ----------

composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || sendBtn.disabled) return;

  input.value = '';
  sendBtn.disabled = true;
  addMessage('user', text);
  messages.push({ role: 'user', content: text });
  setExpression('loading');
  const typing = addTyping();

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await r.json();
    typing.remove();
    if (!r.ok) {
      addMessage('bot', data.error || 'something broke. adding this to the lore.');
      setExpression('systemerror');
      return;
    }
    messages.push({ role: 'assistant', content: data.reply });
    setExpression(data.expression || 'smug');
    addMessage('bot', data.reply);
    speak(data.reply);
  } catch {
    typing.remove();
    addMessage('bot', 'connection rugged. classic. try again.');
    setExpression('systemerror');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});

// ---------- boot ----------

(async function boot() {
  setExpression('smug');
  try {
    const r = await fetch('/api/health');
    const h = await r.json();
    ttsAvailable = Boolean(h.tts);
    updateVoiceUi();
    if (!h.claude) {
      statusEl.textContent = 'no api key';
      statusEl.classList.add('err');
      addMessage('bot', 'the clinic is unstaffed — set ANTHROPIC_API_KEY in web/.env and restart. (i would fix it myself but i am, famously, a coping mechanism.)');
      setExpression('sleepy');
      return;
    }
    statusEl.textContent = 'online';
    const greet = h.greeting || { reply: 'gm.', expression: 'smug' };
    messages.push({ role: 'assistant', content: greet.reply });
    setExpression(greet.expression);
    addMessage('bot', greet.reply);
  } catch {
    statusEl.textContent = 'offline';
    statusEl.classList.add('err');
    updateVoiceUi();
  }
  input.focus();
})();
