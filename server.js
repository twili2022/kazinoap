const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ================== АВТОГЕНЕРАЦИЯ ЗВУКОВ ДЛЯ РЕПОЗИТОРИЯ ================== */
const SOUNDS_DIR = path.join(__dirname, 'public', 'sounds');

function writeWavFile(filePath, samples, sampleRate = 22050) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function generateSoundAssets() {
  fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  const sr = 22050;

  // 1. Клик / безопасная клетка
  const clickPath = path.join(SOUNDS_DIR, 'click.wav');
  if (!fs.existsSync(clickPath)) {
    const len = Math.floor(sr * 0.08);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 48);
      const freq = 620 + t * 2800;
      out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.45;
    }
    writeWavFile(clickPath, out, sr);
  }

  // 2. Монета / звёзды
  const coinPath = path.join(SOUNDS_DIR, 'coin.wav');
  if (!fs.existsSync(coinPath)) {
    const len = Math.floor(sr * 0.34);
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const freq = t < 0.09 ? 987.77 : 1318.51;
      const localT = t < 0.09 ? t : t - 0.09;
      const env = Math.exp(-localT * 11);
      out[i] = (
        Math.sin(2 * Math.PI * freq * t) * 0.65 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.25
      ) * env * 0.45;
    }
    writeWavFile(coinPath, out, sr);
  }

  // 3. Победа в кейсе / апгрейде / выводе
  const winPath = path.join(SOUNDS_DIR, 'win.wav');
  if (!fs.existsSync(winPath)) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const stepSec = 0.11;
    const len = Math.floor(sr * (notes.length * stepSec + 0.35));
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const idx = Math.min(notes.length - 1, Math.floor(t / stepSec));
      const freq = notes[idx];
      const localT = t - idx * stepSec;
      const env = Math.exp(-localT * 6.5);
      out[i] = (
        Math.sin(2 * Math.PI * freq * t) * 0.6 +
        Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.2
      ) * env * 0.48;
    }
    writeWavFile(winPath, out, sr);
  }

  // 4. Кручение рулетки кейса / стрелки апгрейда
  const spinPath = path.join(SOUNDS_DIR, 'spin.wav');
  if (!fs.existsSync(spinPath)) {
    const dur = 3.8;
    const len = Math.floor(sr * dur);
    const out = new Float32Array(len);
    let tickCursor = 0;
    let tickInterval = 0.055;
    while (tickCursor < dur) {
      const startSample = Math.floor(tickCursor * sr);
      const tickLen = Math.floor(sr * 0.025);
      const progress = tickCursor / dur;
      const baseFreq = 920 - progress * 260;
      for (let j = 0; j < tickLen && startSample + j < len; j++) {
        const lt = j / sr;
        const env = Math.exp(-lt * 130);
        out[startSample + j] += Math.sin(2 * Math.PI * baseFreq * lt) * env * 0.35;
      }
      tickCursor += tickInterval;
      tickInterval = Math.min(0.24, tickInterval * 1.042);
    }
    writeWavFile(spinPath, out, sr);
  }

  // 5. Взрыв мины / неудача
  const bombPath = path.join(SOUNDS_DIR, 'bomb.wav');
  if (!fs.existsSync(bombPath)) {
    const len = Math.floor(sr * 0.45);
    const out = new Float32Array(len);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 9);
      const white = Math.random() * 2 - 1;
      lp = lp * 0.88 + white * 0.12;
      const sub = Math.sin(2 * Math.PI * Math.max(42, 130 - t * 220) * t) * 0.55;
      out[i] = (lp * 0.9 + sub) * env * 0.55;
    }
    writeWavFile(bombPath, out, sr);
  }

  // 6. Фоновая музыка (бесшовный 8-секундный зелёный чилл-синт цикл)
  const bgmPath = path.join(SOUNDS_DIR, 'bgm.wav');
  if (!fs.existsSync(bgmPath)) {
    const loopSec = 8;
    const len = sr * loopSec;
    const out = new Float32Array(len);
    const progression = [
      [130.81, 196.00, 246.94],
      [110.00, 164.81, 220.00],
      [146.83, 220.00, 261.63],
      [196.00, 246.94, 293.66]
    ];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const barIdx = Math.floor(t / 2) % progression.length;
      const chord = progression[barIdx];
      const barPhase = (t % 2) / 2;
      const swell = Math.sin(Math.PI * barPhase);
      let sample = 0;
      chord.forEach((f, idx) => {
        const detune = 1 + (idx - 1) * 0.002;
        sample += Math.sin(2 * Math.PI * f * detune * t) * 0.12;
      });
      const arpNote = chord[Math.floor(t * 4) % chord.length] * 2;
      const arpEnv = Math.exp(-((t * 4) % 1) * 5) * 0.06;
      sample += Math.sin(2 * Math.PI * arpNote * t) * arpEnv;
      out[i] = sample * (0.45 + 0.55 * swell);
    }
    writeWavFile(bgmPath, out, sr);
  }
}
generateSoundAssets();

/* ================== АВТОПОИСК КАРТИНОК ================== */
let FOUND_IMAGES = {};
const ITEMS_DIR = path.join(__dirname, 'public', 'items');

function scanImages() {
  FOUND_IMAGES = {};
  if (!fs.existsSync(ITEMS_DIR)) return;
  const entries = fs.readdirSync(ITEMS_DIR, { withFileTypes: true });
  entries.forEach(entry => {
    const fullPath = path.join(ITEMS_DIR, entry.name);
    if (entry.isFile() && /\.(png|jpe?g|webp|gif)$/i.test(entry.name)) {
      const baseName = path.parse(entry.name).name.toLowerCase().replace(/\s+/g, '_');
      FOUND_IMAGES[baseName] = '/items/' + encodeURIComponent(entry.name);
    }
    if (entry.isDirectory()) {
      const folderName = entry.name.toLowerCase().replace(/\s+/g, '_');
      const filesInFolder = fs.readdirSync(fullPath);
      const imageFile = filesInFolder.find(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
      if (imageFile) {
        FOUND_IMAGES[folderName] = '/items/' + encodeURIComponent(entry.name) + '/' + encodeURIComponent(imageFile);
      }
    }
  });
}
scanImages();

function getIconPath(id, fallbackEmoji) {
  if (FOUND_IMAGES[id]) return FOUND_IMAGES[id];
  return fallbackEmoji;
}

/* ================== ХРАНИЛИЩЕ ================== */
const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'database.json');
const EMPTY_DB = () => ({
  users: [], inventory: [], user_customization: [], drop_history: [],
  withdraw_requests: [], deposit_requests: [], promocodes: [], promo_history: [],
  admin_logs: [], admin_notes: [], broadcasts: [], sessions: []
});

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return EMPTY_DB();
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!d.sessions) d.sessions = [];
    if (!d.users) d.users = [];
    if (!d.inventory) d.inventory = [];
    if (!d.user_customization) d.user_customization = [];
    if (!d.drop_history) d.drop_history = [];
    if (!d.withdraw_requests) d.withdraw_requests = [];
    if (!d.deposit_requests) d.deposit_requests = [];
    if (!d.promocodes) d.promocodes = [];
    if (!d.admin_logs) d.admin_logs = [];
    return d;
  } catch (e) { return EMPTY_DB(); }
}
function saveDB(dbData) { fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2)); }

let db = loadDB();
let dbChanged = false;

function ensureAdmin(login, password) {
  let existing = db.users.find(u => u.login === login);
  if (!existing) {
    db.users.push({
      login: login,
      password: password,
      balance: 999999,
      is_admin: true,
      is_super_admin: true,
      last_seen: Date.now(),
      last_bonus: null
    });
    db.user_customization.push({ user_login: login, avatar: '👤', frame: 'none' });
    dbChanged = true;
    console.log(`👑 Создан супер-админ: ${login}`);
  } else {
    if (!existing.is_admin || !existing.is_super_admin) {
      existing.is_admin = true;
      existing.is_super_admin = true;
      dbChanged = true;
      console.log(`👑 Восстановлены права супер-админа: ${login}`);
    }
  }
}

ensureAdmin('tgweb', '202220222022');
ensureAdmin('tagen', 'tag20222022');

if (dbChanged) {
  saveDB(db);
}

const now = () => Date.now();
const uid = () => now() + '_' + Math.random().toString(36).slice(2);
const genToken = () => crypto.randomBytes(24).toString('hex');

function logAction(admin, action, details) {
  const currentDb = loadDB();
  currentDb.admin_logs.push({ admin_login: admin, action, details: String(details || ''), created_at: now() });
  saveDB(currentDb);
  db = currentDb;
}

function addBalance(login, amount) {
  const currentDb = loadDB();
  const u = currentDb.users.find(u => u.login === login);
  if (!u) return { error: 'Пользователь не найден' };
  u.balance = Number(u.balance) + Number(amount);
  saveDB(currentDb);
  db = currentDb;
  return { balance: u.balance };
}

/* === ТОКЕН-АВТОРИЗАЦИЯ === */
function createSession(login) {
  const currentDb = loadDB();
  const token = genToken();
  const weekAgo = now() - 7 * 24 * 60 * 60 * 1000;
  currentDb.sessions = (currentDb.sessions || []).filter(s => s.created_at >= weekAgo);
  const userSessions = currentDb.sessions.filter(s => s.login === login);
  if (userSessions.length >= 8) {
    const oldest = userSessions.sort((a, b) => a.created_at - b.created_at)[0];
    currentDb.sessions = currentDb.sessions.filter(s => s.token !== oldest.token);
  }
  currentDb.sessions.push({ token, login, created_at: now() });
  saveDB(currentDb);
  db = currentDb;
  return token;
}

function authUser(req) {
  const token = req.headers['x-auth-token'] || (req.body && req.body.token) || req.query.token;
  if (!token) return null;
  const currentDb = loadDB();
  const s = (currentDb.sessions || []).find(s => s.token === token);
  if (!s) return null;
  const u = currentDb.users.find(u => u.login === s.login);
  return u || null;
}

/* ================== ПРЕДМЕТЫ ================== */
const GAME_CASES = [
  { id:'starter', name:'Стартовый', icon:'📦', price:100, items:[
    {id:'heart',name:'Сердечко',icon:'💖',rarity:'common',price:15,chance:54},
    {id:'rose',name:'Роза',icon:'🌹',rarity:'common',price:25,chance:30},
    {id:'bear',name:'Мишка',icon:'🧸',rarity:'common',price:15,chance:10},
    {id:'skull',name:'Череп',icon:'💀',rarity:'rare',price:50,chance:5},
    {id:'ring',name:'Кольцо',icon:'💍',rarity:'rare',price:100,chance:1}
  ]},
  { id:'pro', name:'Про', icon:'🎁', price:1000, items:[
    {id:'gift',name:'Подарок',icon:'🎁',rarity:'common',price:25,chance:50},
    {id:'cake',name:'Торт',icon:'🎂',rarity:'common',price:50,chance:30},
    {id:'bouquet',name:'Букет',icon:'💐',rarity:'common',price:50,chance:19.99},
    {id:'dragon',name:'Дракон',icon:'🐉',rarity:'legendary',price:250000,chance:0.01}
  ]},
  { id:'legend', name:'Легенда', icon:'⚡', price:5000, items:[
    {id:'ring',name:'Кольцо',icon:'💍',rarity:'rare',price:100,chance:60},
    {id:'golden_cup',name:'Золотой Кубок',icon:'🏆',rarity:'legendary',price:100000,chance:5},
    {id:'dragon',name:'Дракон',icon:'🐉',rarity:'legendary',price:250000,chance:1},
    {id:'crown',name:'Корона',icon:'👑',rarity:'legendary',price:500000,chance:0.1},
    {id:'galaxy',name:'Галактика',icon:'🌌',rarity:'legendary',price:2000000,chance:0.001}
  ]},
  { id:'magic', name:'Магический', icon:'🔮', price:2500, items:[
    {id:'heart',name:'Сердечко',icon:'💖',rarity:'common',price:15,chance:40},
    {id:'skull',name:'Череп',icon:'💀',rarity:'rare',price:50,chance:30},
    {id:'ring',name:'Кольцо',icon:'💍',rarity:'rare',price:100,chance:20},
    {id:'dragon',name:'Дракон',icon:'🐉',rarity:'legendary',price:250000,chance:0.05}
  ]},
  { id:'winter', name:'Зимний', icon:'❄️', price:3000, items:[
    {id:'bear',name:'Мишка',icon:'🧸',rarity:'common',price:15,chance:40},
    {id:'cake',name:'Торт',icon:'🎂',rarity:'common',price:50,chance:35},
    {id:'golden_cup',name:'Золотой Кубок',icon:'🏆',rarity:'legendary',price:100000,chance:3},
    {id:'crown',name:'Корона',icon:'👑',rarity:'legendary',price:500000,chance:0.1},
    {id:'galaxy',name:'Галактика',icon:'🌌',rarity:'legendary',price:2000000,chance:0.01}
  ]},
  { id:'inferno', name:'Адский', icon:'🔥', price:7500, items:[
    {id:'skull',name:'Череп',icon:'💀',rarity:'rare',price:50,chance:50},
    {id:'ring',name:'Кольцо',icon:'💍',rarity:'rare',price:100,chance:25},
    {id:'golden_cup',name:'Золотой Кубок',icon:'🏆',rarity:'legendary',price:100000,chance:8},
    {id:'dragon',name:'Дракон',icon:'🐉',rarity:'legendary',price:250000,chance:2},
    {id:'crown',name:'Корона',icon:'👑',rarity:'legendary',price:500000,chance:0.1},
    {id:'galaxy',name:'Галактика',icon:'🌌',rarity:'legendary',price:2000000,chance:0.001}
  ]}
];

GAME_CASES.forEach(box => {
  box.icon = getIconPath(box.id, box.icon);
  box.icon = getIconPath('case_' + box.id, box.icon);
  box.items.forEach(item => { item.icon = getIconPath(item.id, item.icon); });
});

function buildItemCatalog() {
  const map = new Map();
  for (const box of GAME_CASES) {
    for (const it of box.items) {
      if (!map.has(it.id)) map.set(it.id, { ...it });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.price - b.price);
}
const ITEM_CATALOG = buildItemCatalog();
const ITEM_BY_ID = new Map(ITEM_CATALOG.map(i => [i.id, i]));

/* ================== АВТОРИЗАЦИЯ ================== */
app.post('/api/register', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password || password.length < 6) return res.status(400).json({ error: 'Логин и пароль (мин. 6 символов)' });
  const currentDb = loadDB();
  if (currentDb.users.find(u => u.login === login)) return res.status(400).json({ error: 'Логин уже занят' });
  currentDb.users.push({ login, password, balance: 100, is_admin: false, is_super_admin: false, last_seen: now(), last_bonus: null });
  currentDb.user_customization.push({ user_login: login, avatar: '👤', frame: 'none' });
  saveDB(currentDb);
  db = currentDb;
  const token = createSession(login);
  res.json({ success: true, token, user: { login, balance: 100 } });
});

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === login && u.password === password);
  if (!user) return res.status(400).json({ error: 'Неверный логин или пароль' });
  const token = createSession(user.login);
  res.json({ success: true, token, user: { login: user.login, balance: user.balance } });
});

app.get('/api/online', (req, res) => {
  const currentDb = loadDB();
  const fiveMinAgo = now() - 5 * 60000;
  const online = currentDb.users.filter(u => u.last_seen >= fiveMinAgo).length;
  res.json({ online: Math.max(online, 1) });
});

app.get('/api/user/:login', (req, res) => {
  const me = authUser(req);
  if (!me || me.login !== req.params.login) return res.status(401).json({ error: 'Не авторизован' });
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === me.login);
  if (!user) return res.status(404).json({ error: 'Юзер не найден' });
  user.last_seen = now();
  saveDB(currentDb);
  db = currentDb;
  const inventory = currentDb.inventory.filter(i => i.user_login === user.login);
  const custom = currentDb.user_customization.find(c => c.user_login === user.login);
  const totalValue = inventory.reduce((s, i) => s + (Number(i.price) || 0), 0);
  res.json({
    login: user.login,
    balance: Number(user.balance),
    inventory,
    is_admin: !!user.is_admin,
    is_super_admin: !!user.is_super_admin,
    stats: { totalItems: inventory.length, totalValue },
    avatar: custom ? custom.avatar : '👤',
    frame: custom ? custom.frame : 'none'
  });
});

app.get('/api/items', (req, res) => res.json(ITEM_CATALOG));
app.get('/api/cases', (req, res) => res.json(GAME_CASES));

app.post('/api/cases/open', (req, res) => {
  const me = authUser(req);
  if (!me) return res.status(401).json({ error: 'Не авторизован' });
  const { caseId } = req.body;
  const box = GAME_CASES.find(c => c.id === caseId);
  if (!box) return res.status(400).json({ error: 'Кейс не найден' });
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === me.login);
  if (!user) return res.status(404).json({ error: 'Юзер не найден' });
  if (Number(user.balance) < box.price) return res.status(400).json({ error: 'Недостаточно звёзд!' });

  user.balance = Number(user.balance) - box.price;
  const totalChance = box.items.reduce((s, i) => s + Number(i.chance), 0);
  let roll = Math.random() * totalChance;
  let dropped = box.items[0];
  for (const it of box.items) {
    if (roll < Number(it.chance)) { dropped = it; break; }
    roll -= Number(it.chance);
  }
  const itemUid = uid();
  currentDb.inventory.push({ uid: itemUid, user_login: user.login, item_id: dropped.id, name: dropped.name, icon: dropped.icon, rarity: dropped.rarity, price: dropped.price, status: 'inventory', created_at: now() });
  currentDb.drop_history.push({ user_login: user.login, item_name: dropped.name, item_icon: dropped.icon, item_price: dropped.price, rarity: dropped.rarity, created_at: now() });
  saveDB(currentDb);
  db = currentDb;
  res.json({ success: true, balance: user.balance, item: { ...dropped, uid: itemUid }, pool: box.items });
});

/* ================== МИНЫ (СЕРВЕРНАЯ ЛОГИКА) ================== */
const minesSessions = new Map();

function getGridSize(bet) {
  if (bet < 100) return 3;
  if (bet < 500) return 4;
  if (bet < 2000) return 5;
  return 6;
}
function minesMultiplier(opened, minesCount, total) {
  if (opened <= 0) return 1;
  return 1 + (opened * (minesCount / total) * 2);
}

app.post('/api/games/mines', (req, res) => {
  const me = authUser(req);
  if (!me) return res.status(401).json({ error: 'Не авторизован' });
  const { action } = req.body;
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === me.login);
  if (!user) return res.status(404).json({ error: 'Юзер не найден' });

  if (action === 'start') {
    if (minesSessions.has(user.login)) return res.status(400).json({ error: 'Игра уже идёт' });
    const bet = Number(req.body.bet);
    if (!bet || bet < 10) return res.status(400).json({ error: 'Мин. ставка 10 ★' });
    if (Number(user.balance) < bet) return res.status(400).json({ error: 'Недостаточно средств' });

    const gridSize = getGridSize(bet);
    const total = gridSize * gridSize;
    let m = Number(req.body.minesCount) || 3;
    if (m < 1) m = 1;
    if (m >= total) m = total - 1;

    const bombs = new Set();
    while (bombs.size < m) bombs.add(Math.floor(Math.random() * total));

    user.balance = Number(user.balance) - bet;
    saveDB(currentDb);
    db = currentDb;
    minesSessions.set(user.login, { bombs, total, gridSize, minesCount: m, opened: new Set(), bet });

    return res.json({ success: true, balance: user.balance, gridSize, totalCells: total, minesCount: m });
  }

  if (action === 'click') {
    const s = minesSessions.get(user.login);
    if (!s) return res.status(400).json({ error: 'Игра не найдена' });
    const c = Number(req.body.cell);
    if (!Number.isInteger(c) || c < 0 || c >= s.total) return res.status(400).json({ error: 'Неверная клетка' });
    if (s.opened.has(c)) return res.status(400).json({ error: 'Уже открыто' });

    if (s.bombs.has(c)) {
      const bombs = Array.from(s.bombs);
      minesSessions.delete(user.login);
      return res.json({ success: true, bomb: true, bombs, openedCount: s.opened.size });
    }

    s.opened.add(c);
    const mult = minesMultiplier(s.opened.size, s.minesCount, s.total);
    return res.json({ success: true, bomb: false, cell: c, openedCount: s.opened.size, multiplier: mult, potentialWin: Math.floor(s.bet * mult) });
  }

  if (action === 'cashout') {
    const s = minesSessions.get(user.login);
    if (!s) return res.json({ success: true, win: 0, balance: user.balance, bombs: [] });
    const bombs = Array.from(s.bombs);
    if (s.opened.size === 0) {
      minesSessions.delete(user.login);
      return res.json({ success: true, win: 0, balance: user.balance, bombs });
    }
    const mult = minesMultiplier(s.opened.size, s.minesCount, s.total);
    const winAmt = Math.floor(s.bet * mult);
    user.balance = Number(user.balance) + winAmt;
    saveDB(currentDb);
    db = currentDb;
    minesSessions.delete(user.login);
    return res.json({ success: true, win: winAmt, balance: user.balance, bombs });
  }

  return res.status(400).json({ error: 'Неизвестное действие' });
});

/* ================== ИНВЕНТАРЬ / АПГРЕЙД ================== */
app.post('/api/inventory/sell', (req, res) => {
  const me = authUser(req);
  if (!me) return res.status(401).json({ error: 'Не авторизован' });
  const { uid: itemUid } = req.body;
  const currentDb = loadDB();
  const idx = currentDb.inventory.findIndex(i => i.user_login === me.login && i.uid === itemUid);
  if (idx === -1) return res.status(410).json({ error: 'Уже продано' });
  const item = currentDb.inventory[idx];
  currentDb.inventory.splice(idx, 1);
  const user = currentDb.users.find(u => u.login === me.login);
  user.balance = Number(user.balance) + Number(item.price);
  saveDB(currentDb);
  db = currentDb;
  res.json({ success: true, balance: user.balance });
});

app.post('/api/upgrade', (req, res) => {
  const me = authUser(req);
  if (!me) return res.status(401).json({ error: 'Не авторизован' });
  const { myUid, targetItemId, betStars } = req.body;
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === me.login);
  if (!user) return res.status(404).json({ error: 'Юзер не найден' });

  let myValue = 0;
  let myItem = null;

  if (betStars) {
    if (Number(betStars) < 10) return res.status(400).json({ error: 'Мин. ставка 10 звезд' });
    if (Number(user.balance) < Number(betStars)) return res.status(400).json({ error: 'Мало звезд на балансе' });
    myValue = Number(betStars);
  } else {
    const myIdx = currentDb.inventory.findIndex(i => i.user_login === me.login && i.uid === myUid);
    if (myIdx === -1) return res.status(404).json({ error: 'Предмет не найден' });
    myItem = currentDb.inventory[myIdx];
    myValue = Number(myItem.price);
  }

  const target = ITEM_BY_ID.get(targetItemId);
  if (!target) return res.status(400).json({ error: 'Цель не найдена' });
  if (myValue >= Number(target.price)) return res.status(400).json({ error: 'Целевой предмет должен быть дороже' });

  let chance = (myValue / Number(target.price)) * 50;
  if (!isFinite(chance)) chance = 1;
  if (chance > 50) chance = 50;
  if (chance < 1) chance = 1;
  chance = Math.round(chance * 100) / 100;

  if (betStars) {
    user.balance = Number(user.balance) - Number(betStars);
  } else {
    currentDb.inventory.splice(currentDb.inventory.findIndex(i => i.uid === myUid), 1);
  }

  const win = Math.random() * 100 < chance;
  let newItem = null;
  if (win) {
    const itemUid = uid();
    newItem = { uid: itemUid, user_login: user.login, item_id: target.id, name: target.name, icon: target.icon, rarity: target.rarity, price: target.price, status: 'inventory', created_at: now() };
    currentDb.inventory.push(newItem);
    currentDb.drop_history.push({ user_login: user.login, item_name: target.name, item_icon: target.icon, item_price: target.price, rarity: target.rarity, created_at: now() });
  }
  saveDB(currentDb);
  db = currentDb;
  res.json({ success: true, win, chance, item: win ? { ...target, uid: newItem.uid } : target, myItem, newBalance: user.balance });
});

app.get('/api/drops', (req, res) => {
  const currentDb = loadDB();
  const recent = currentDb.drop_history.slice(-20).reverse();
  res.json(recent);
});

/* ================== КОШЕЛЕК ================== */
app.post('/api/wallet/deposit', (req, res) => {
  const me = authUser(req);
  if (!me) return res.status(401).json({ error: 'Не авторизован' });
  const amount = req.body.amount;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Введите сумму' });
  const currentDb = loadDB();
  currentDb.deposit_requests.push({ id: uid(), user_login: me.login, amount_stars: Number(amount), status: 'pending', created_at: now() });
  saveDB(currentDb);
  db = currentDb;
  res.json({ success: true, message: 'Заявка на пополнение создана.' });
});

app.post('/api/wallet/withdraw', (req, res) => {
  const me = authUser(req);
  if (!me) return res.status(401).json({ error: 'Не авторизован' });
  const amount = req.body.amount;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Введите сумму' });
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === me.login);
  if (!user) return res.status(404).json({ error: 'Юзер не найден' });
  if (Number(user.balance) < Number(amount)) return res.status(400).json({ error: 'Мало звезд' });
  user.balance = Number(user.balance) - Number(amount);
  currentDb.withdraw_requests.push({ id: uid(), user_login: user.login, amount_stars: Number(amount), status: 'pending', created_at: now() });
  saveDB(currentDb);
  db = currentDb;
  res.json({ success: true, message: 'Заявка на вывод создана.' });
});

/* ================== ЭКСПОРТ ДАННЫХ И БД ================== */
app.get('/api/export/my-data', (req, res) => {
  const me = authUser(req);
  if (!me) return res.status(401).json({ error: 'Не авторизован' });
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === me.login);
  const inventory = currentDb.inventory.filter(i => i.user_login === me.login);
  const drops = currentDb.drop_history.filter(d => d.user_login === me.login);
  const payload = {
    exported_at: new Date().toISOString(),
    user: user ? { login: user.login, balance: user.balance, is_admin: !!user.is_admin, is_super_admin: !!user.is_super_admin } : null,
    inventory,
    drops
  };
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="kazinoap-${me.login}-data.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

/* ================== АДМИНКА ================== */
function requireAdmin(req, res) {
  const a = authUser(req);
  if (!a || (!a.is_admin && !a.is_super_admin)) { res.status(403).json({ error: 'Нет доступа' }); return null; }
  return a;
}
function requireSuper(req, res) {
  const a = authUser(req);
  if (!a || !a.is_super_admin) { res.status(403).json({ error: 'Только главный админ' }); return null; }
  return a;
}

app.get('/api/admin/download-db', (req, res) => {
  const a = requireAdmin(req, res); if (!a) return;
  const currentDb = loadDB();
  logAction(a.login, 'download_db', 'Экспорт database.json');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="database.json"');
  res.send(JSON.stringify(currentDb, null, 2));
});

app.get('/api/admin/players', (req, res) => {
  const a = requireAdmin(req, res); if (!a) return;
  const currentDb = loadDB();
  res.json(currentDb.users.map(u => ({ login: u.login, balance: u.balance, is_admin: u.is_admin, is_super_admin: u.is_super_admin, nft_count: currentDb.inventory.filter(i => i.user_login === u.login).length })));
});

app.get('/api/admin/withdraws', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const currentDb = loadDB(); res.json(currentDb.withdraw_requests.filter(w => w.status === 'pending'));
});
app.get('/api/admin/deposits', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const currentDb = loadDB(); res.json(currentDb.deposit_requests.filter(d => d.status === 'pending'));
});
app.get('/api/admin/logs', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const currentDb = loadDB(); res.json(currentDb.admin_logs.slice(-50).reverse());
});

app.post('/api/admin/deposit/accept', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const { id } = req.body;
  const currentDb = loadDB();
  const dep = currentDb.deposit_requests.find(d => d.id === id);
  if (!dep || dep.status !== 'pending') return res.status(400).json({ error: 'Не найдено или обработано' });
  const user = currentDb.users.find(u => u.login === dep.user_login);
  if (user) user.balance = Number(user.balance) + Number(dep.amount_stars);
  dep.status = 'accepted';
  saveDB(currentDb);
  db = currentDb;
  logAction(a.login, 'deposit_accept', `${dep.user_login} +${dep.amount_stars}`);
  res.json({ success: true });
});

app.post('/api/admin/withdraws/accept', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const { id } = req.body;
  const currentDb = loadDB();
  const idx = currentDb.withdraw_requests.findIndex(w => w.id === id && w.status === 'pending');
  if (idx === -1) return res.status(400).json({ error: 'Нет заявки' });
  currentDb.withdraw_requests.splice(idx, 1);
  saveDB(currentDb);
  db = currentDb;
  logAction(a.login, 'withdraw_accept', 'Выплата');
  res.json({ success: true });
});

app.post('/api/admin/give-stars', (req, res) => {
  const a = requireAdmin(req, res); if (!a) return;
  const { targetLogin, amount } = req.body;
  const r = addBalance(targetLogin, amount);
  if (r.error) return res.status(404).json({ error: r.error });
  logAction(a.login, 'give_stars', `${targetLogin} +${amount}`);
  res.json({ success: true });
});

app.post('/api/admin/take-stars', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const { targetLogin, amount } = req.body;
  const r = addBalance(targetLogin, -Math.abs(Number(amount)));
  if (r.error) return res.status(404).json({ error: r.error });
  logAction(a.login, 'take_stars', `${targetLogin} -${amount}`);
  res.json({ success: true });
});

app.post('/api/admin/give-nft', (req, res) => {
  const a = requireAdmin(req, res); if (!a) return;
  const { targetLogin, item } = req.body;
  const currentDb = loadDB();
  currentDb.inventory.push({ uid: uid(), user_login: targetLogin, item_id: item.id, name: item.name, icon: item.icon || '🎁', rarity: item.rarity || 'common', price: Number(item.price) || 0, status: 'inventory', created_at: now() });
  saveDB(currentDb);
  db = currentDb;
  logAction(a.login, 'give_nft', `${targetLogin} → ${item.name}`);
  res.json({ success: true });
});

app.post('/api/admin/create-promo', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const { code, stars, limit } = req.body;
  if (!code || !stars || !limit) return res.status(400).json({ error: 'Заполните поля' });
  const currentDb = loadDB();
  const up = String(code).toUpperCase();
  if (currentDb.promocodes.find(p => p.code === up)) return res.status(400).json({ error: 'Код уже есть' });
  currentDb.promocodes.push({ code: up, stars: Number(stars), max_uses: Number(limit), uses: 0 });
  saveDB(currentDb);
  db = currentDb;
  logAction(a.login, 'create_promo', up);
  res.json({ success: true });
});

app.post('/api/admin/make-admin', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const { targetLogin } = req.body;
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === targetLogin);
  if (user) user.is_admin = true;
  saveDB(currentDb);
  db = currentDb;
  logAction(a.login, 'make_admin', targetLogin);
  res.json({ success: true });
});

app.post('/api/admin/remove-admin', (req, res) => {
  const a = requireSuper(req, res); if (!a) return;
  const { targetLogin } = req.body;
  const currentDb = loadDB();
  const user = currentDb.users.find(u => u.login === targetLogin);
  if (user) user.is_admin = false;
  saveDB(currentDb);
  db = currentDb;
  logAction(a.login, 'remove_admin', targetLogin);
  res.json({ success: true });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.type('html').send('<h1>Положи index.html в public/</h1>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('✅ Сервер: http://localhost:' + PORT));
