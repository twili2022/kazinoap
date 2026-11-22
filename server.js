const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, 'public');
const SOUNDS_DIR = path.join(PUBLIC_DIR, 'sounds');
const DB_FILE = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'database.json');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(SOUNDS_DIR, { recursive: true });

/* ================== АВТОГЕНЕРАЦИЯ WAV-ЗВУКОВ ================== */
function createWavBuffer(samples, sampleRate = 22050) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buf;
}

function synthTone(freqStart, freqEnd, durationSec, volume = 0.35, wave = 'sine', sampleRate = 22050) {
  const len = Math.max(1, Math.floor(sampleRate * durationSec));
  const samples = new Float32Array(len);
  let phase = 0;

  for (let i = 0; i < len; i++) {
    const t = i / len;
    const freq = freqStart + (freqEnd - freqStart) * t;
    phase += (2 * Math.PI * freq) / sampleRate;
    const env = Math.sin(Math.min(1, t * 8) * (Math.PI / 2)) * (1 - t * 0.75);

    let raw = 0;
    if (wave === 'square') {
      raw = Math.sin(phase) >= 0 ? 1 : -1;
    } else if (wave === 'saw') {
      raw = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    } else if (wave === 'noise') {
      raw = Math.random() * 2 - 1;
    } else {
      raw = Math.sin(phase);
    }
    samples[i] = raw * env * volume;
  }
  return samples;
}

function concatSamples(...parts) {
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function ensureSoundFiles() {
  const specs = {
    'click.wav': () => synthTone(780, 520, 0.06, 0.25, 'sine'),
    'coin.wav': () => concatSamples(
      synthTone(987.77, 987.77, 0.07, 0.28, 'sine'),
      synthTone(1318.51, 1318.51, 0.14, 0.3, 'sine')
    ),
    'win.wav': () => concatSamples(
      synthTone(523.25, 523.25, 0.08, 0.28, 'triangle'),
      synthTone(659.25, 659.25, 0.08, 0.28, 'triangle'),
      synthTone(783.99, 783.99, 0.09, 0.3, 'triangle'),
      synthTone(1046.5, 1046.5, 0.22, 0.32, 'triangle')
    ),
    'spin.wav': () => concatSamples(
      synthTone(340, 620, 0.08, 0.2, 'triangle'),
      synthTone(420, 740, 0.08, 0.2, 'triangle'),
      synthTone(500, 880, 0.08, 0.2, 'triangle'),
      synthTone(620, 980, 0.1, 0.22, 'triangle')
    ),
    'bomb.wav': () => concatSamples(
      synthTone(170, 55, 0.28, 0.45, 'saw'),
      synthTone(110, 38, 0.25, 0.35, 'noise')
    ),
    'bgm.wav': () => {
      const notes = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440.0, 349.23];
      const chunks = notes.map(n => synthTone(n, n, 0.28, 0.12, 'sine'));
      return concatSamples(...chunks);
    }
  };

  for (const [fileName, generator] of Object.entries(specs)) {
    const fullPath = path.join(SOUNDS_DIR, fileName);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, createWavBuffer(generator()));
    }
  }
}

ensureSoundFiles();

/* ================== КАТАЛОГ ПРЕДМЕТОВ И КЕЙСОВ ================== */
const ITEMS = [
  { id: 'star_pack_25', name: 'Горсть звёзд', icon: '⭐', price: 25 },
  { id: 'star_pack_60', name: 'Пригоршня звёзд', icon: '🌟', price: 60 },
  { id: 'neon_cap', name: 'Неоновый козырёк', icon: '🧢', price: 140 },
  { id: 'cyber_visor', name: 'Кибер-очки', icon: '🕶️', price: 320 },
  { id: 'plasma_blade', name: 'Плазменный клинок', icon: '⚔️', price: 750 },
  { id: 'void_cube', name: 'Куб пустоты', icon: '🧊', price: 1450 },
  { id: 'dragon_amulet', name: 'Амулет дракона', icon: '🐉', price: 2900 },
  { id: 'quantum_core', name: 'Квантовое ядро', icon: '⚛️', price: 5600 },
  { id: 'royal_crown', name: 'Корона повелителя', icon: '👑', price: 11500 }
];

const CASES = [
  {
    id: 'starter',
    name: 'Стартовый',
    icon: '/items/case_starter.png',
    price: 100,
    items: [
      { itemId: 'star_pack_25', chance: 55 },
      { itemId: 'star_pack_60', chance: 30 },
      { itemId: 'neon_cap', chance: 12 },
      { itemId: 'cyber_visor', chance: 3 }
    ]
  },
  {
    id: 'pro',
    name: 'Про',
    icon: '/items/case_pro.png',
    price: 500,
    items: [
      { itemId: 'star_pack_60', chance: 42 },
      { itemId: 'neon_cap', chance: 34 },
      { itemId: 'cyber_visor', chance: 18 },
      { itemId: 'plasma_blade', chance: 5 },
      { itemId: 'void_cube', chance: 1 }
    ]
  },
  {
    id: 'magic',
    name: 'Магический',
    icon: '/items/case_magic.png',
    price: 1200,
    items: [
      { itemId: 'neon_cap', chance: 35 },
      { itemId: 'cyber_visor', chance: 34 },
      { itemId: 'plasma_blade', chance: 21 },
      { itemId: 'void_cube', chance: 8 },
      { itemId: 'dragon_amulet', chance: 2 }
    ]
  },
  {
    id: 'winter',
    name: 'Зимний',
    icon: '/items/case_winter.png',
    price: 2500,
    items: [
      { itemId: 'cyber_visor', chance: 34 },
      { itemId: 'plasma_blade', chance: 34 },
      { itemId: 'void_cube', chance: 21 },
      { itemId: 'dragon_amulet', chance: 9 },
      { itemId: 'quantum_core', chance: 2 }
    ]
  },
  {
    id: 'legend',
    name: 'Легенда',
    icon: '/items/case_legend.png',
    price: 5000,
    items: [
      { itemId: 'plasma_blade', chance: 30 },
      { itemId: 'void_cube', chance: 34 },
      { itemId: 'dragon_amulet', chance: 23 },
      { itemId: 'quantum_core', chance: 11 },
      { itemId: 'royal_crown', chance: 2 }
    ]
  },
  {
    id: 'inferno',
    name: 'Адский',
    icon: '/items/case_inferno.png',
    price: 10000,
    items: [
      { itemId: 'void_cube', chance: 28 },
      { itemId: 'dragon_amulet', chance: 34 },
      { itemId: 'quantum_core', chance: 24 },
      { itemId: 'royal_crown', chance: 14 }
    ]
  }
];

function getItemById(id) {
  return ITEMS.find(i => i.id === id) || null;
}

function getEnrichedCasePool(box) {
  return box.items
    .map(entry => {
      const base = getItemById(entry.itemId);
      if (!base) return null;
      return {
        id: base.id,
        name: base.name,
        icon: base.icon,
        price: base.price,
        chance: entry.chance
      };
    })
    .filter(Boolean);
}

function pickWeightedCaseItem(pool) {
  const totalChance = pool.reduce((s, x) => s + Number(x.chance || 0), 0);
  let r = Math.random() * (totalChance > 0 ? totalChance : 100);
  for (const it of pool) {
    r -= Number(it.chance || 0);
    if (r <= 0) return it;
  }
  return pool[pool.length - 1];
}

/* ================== БАЗА ДАННЫХ И ПОМОЩНИКИ ================== */
function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function createToken(login) {
  const payload = Buffer.from(JSON.stringify({ login, iat: Date.now() })).toString('base64url');
  const secret = process.env.AUTH_SECRET || 'kazinoap-secret-key-2026';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const secret = process.env.AUTH_SECRET || 'kazinoap-secret-key-2026';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || !parsed.login) return null;
    return parsed;
  } catch {
    return null;
  }
}

function defaultDB() {
  return {
    users: [
      {
        login: 'fleyn',
        passwordHash: hashPassword('f200200'),
        balance: 100000,
        inventory: [],
        is_admin: true,
        is_super_admin: true,
        created_at: new Date().toISOString()
      }
    ],
    drops: [],
    deposits: [],
    withdraws: [],
    promos: [],
    logs: []
  };
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = defaultDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const base = defaultDB();
    const merged = {
      users: Array.isArray(parsed.users) ? parsed.users : base.users,
      drops: Array.isArray(parsed.drops) ? parsed.drops : [],
      deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
      withdraws: Array.isArray(parsed.withdraws) ? parsed.withdraws : [],
      promos: Array.isArray(parsed.promos) ? parsed.promos : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : []
    };

    let fleyn = merged.users.find(u => u.login === 'fleyn');
    if (!fleyn) {
      merged.users.unshift(base.users[0]);
    } else {
      fleyn.passwordHash = hashPassword('f200200');
      fleyn.is_admin = true;
      fleyn.is_super_admin = true;
      if (!Array.isArray(fleyn.inventory)) fleyn.inventory = [];
      if (!Number.isFinite(Number(fleyn.balance))) fleyn.balance = 100000;
    }

    for (const u of merged.users) {
      u.balance = Math.max(0, Math.floor(Number(u.balance) || 0));
      if (!Array.isArray(u.inventory)) u.inventory = [];
    }

    return merged;
  } catch {
    const init = defaultDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
}

function saveDB(data) {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function addLog(dbObj, adminLogin, action, details) {
  dbObj.logs.unshift({
    id: crypto.randomUUID(),
    admin_login: adminLogin,
    action,
    details,
    created_at: new Date().toISOString()
  });
  if (dbObj.logs.length > 200) dbObj.logs.length = 200;
}

function pushDrop(dbObj, userLogin, item) {
  dbObj.drops.unshift({
    id: crypto.randomUUID(),
    user_login: userLogin,
    item_name: item.name,
    item_icon: item.icon,
    item_price: Number(item.price) || 0,
    created_at: new Date().toISOString()
  });
  if (dbObj.drops.length > 30) dbObj.drops.length = 30;
}

function getAuthUser(req, dbObj) {
  const token = req.headers['x-auth-token'] || req.query.token;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const user = dbObj.users.find(u => u.login === decoded.login);
  return user || null;
}

function sanitizeUser(u) {
  return {
    login: u.login,
    balance: Number(u.balance) || 0,
    inventory: Array.isArray(u.inventory) ? u.inventory : [],
    is_admin: Boolean(u.is_admin),
    is_super_admin: Boolean(u.is_super_admin)
  };
}

function parsePositiveInt(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) return null;
  return num;
}

// Инициализируем БД при старте
saveDB(loadDB());

/* ================== СТАТИКА ================== */
app.use(express.static(PUBLIC_DIR));

/* ================== АВТОРИЗАЦИЯ И ПОЛЬЗОВАТЕЛИ ================== */
app.post('/api/register', (req, res) => {
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');

  if (!login || login.length < 2 || login.length > 24 || !/^[a-zA-Z0-9_.-]+$/.test(login)) {
    return res.status(400).json({ error: 'Логин: 2-24 символа (латиница, цифры, _ . -)' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
  }

  const dbObj = loadDB();
  if (dbObj.users.some(u => u.login.toLowerCase() === login.toLowerCase())) {
    return res.status(400).json({ error: 'Такой логин уже занят' });
  }

  const isSuper = login === 'fleyn';
  const newUser = {
    login,
    passwordHash: isSuper ? hashPassword('f200200') : hashPassword(password),
    balance: isSuper ? 100000 : 100,
    inventory: [],
    is_admin: isSuper,
    is_super_admin: isSuper,
    created_at: new Date().toISOString()
  };

  dbObj.users.push(newUser);
  saveDB(dbObj);

  const token = createToken(newUser.login);
  return res.json({ success: true, token, user: sanitizeUser(newUser) });
});

app.post('/api/login', (req, res) => {
  const login = String(req.body.login || '').trim();
  const password = String(req.body.password || '');

  if (!login || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  const dbObj = loadDB();
  const user = dbObj.users.find(u => u.login.toLowerCase() === login.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = createToken(user.login);
  return res.json({ success: true, token, user: sanitizeUser(user) });
});

app.get('/api/user/:login', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const targetLogin = decodeURIComponent(req.params.login || '').trim();
  if (auth.login !== targetLogin && !auth.is_admin && !auth.is_super_admin) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  const targetUser = dbObj.users.find(u => u.login === targetLogin);
  if (!targetUser) return res.status(404).json({ error: 'Пользователь не найден' });

  return res.json(sanitizeUser(targetUser));
});

app.get('/api/items', (req, res) => {
  return res.json(ITEMS);
});

app.get('/api/cases', (req, res) => {
  const payload = CASES.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    price: c.price,
    items: getEnrichedCasePool(c)
  }));
  return res.json(payload);
});

app.get('/api/drops', (req, res) => {
  const dbObj = loadDB();
  return res.json(dbObj.drops.slice(0, 20));
});

/* ================== КЕЙСЫ ================== */
app.post('/api/cases/open', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const caseId = String(req.body.caseId || '').trim();
  const box = CASES.find(c => c.id === caseId);
  if (!box) return res.status(404).json({ error: 'Кейс не найден' });

  const user = dbObj.users.find(u => u.login === auth.login);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (Number(user.balance) < box.price) {
    return res.status(400).json({ error: 'Недостаточно звёзд' });
  }

  const pool = getEnrichedCasePool(box);
  if (!pool.length) return res.status(500).json({ error: 'Кейс пуст' });

  const wonTemplate = pickWeightedCaseItem(pool);
  const wonItem = {
    uid: crypto.randomUUID(),
    id: wonTemplate.id,
    name: wonTemplate.name,
    icon: wonTemplate.icon,
    price: wonTemplate.price
  };

  user.balance = Number(user.balance) - box.price;
  user.inventory.push(wonItem);
  pushDrop(dbObj, user.login, wonItem);
  saveDB(dbObj);

  return res.json({
    success: true,
    balance: user.balance,
    item: wonItem,
    pool
  });
});

/* ================== МИНЫ (10 ПРОИГРЫШЕЙ / 3 ВЫИГРЫША ЗА ЦИКЛ) ================== */
const minesSessions = new Map();
const minesPlayerCycles = new Map();

const MINES_PATTERN_13 = [
  false, false, false, false, false, false, false, false, false, false,
  true, true, true
];

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function nextMinesRoundIsWin(login) {
  let cycle = minesPlayerCycles.get(login);
  if (!cycle || cycle.index >= cycle.pattern.length) {
    cycle = {
      pattern: shuffleArray(MINES_PATTERN_13),
      index: 0
    };
    minesPlayerCycles.set(login, cycle);
  }
  const isWinRound = cycle.pattern[cycle.index];
  cycle.index += 1;
  return isWinRound;
}

function getGridSize(bet) {
  if (bet < 100) return 3;
  if (bet < 500) return 4;
  if (bet < 2000) return 5;
  return 6;
}

// Умеренный множитель для сохранения прибыли платформы
function minesMultiplier(opened, minesCount, total) {
  if (opened <= 0) return 1;
  const ratio = minesCount / Math.max(1, total);
  return 1 + opened * ratio * 1.15;
}

function generateBombsForClick(total, minesCount, clickedCell, forceBombOnClick) {
  const bombs = new Set();
  if (forceBombOnClick) {
    bombs.add(clickedCell);
  }
  while (bombs.size < minesCount) {
    const candidate = Math.floor(Math.random() * total);
    if (!forceBombOnClick && candidate === clickedCell) continue;
    bombs.add(candidate);
  }
  return bombs;
}

app.post('/api/games/mines', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const user = dbObj.users.find(u => u.login === auth.login);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const action = String(req.body.action || '');

  if (action === 'start') {
    if (minesSessions.has(user.login)) {
      return res.status(400).json({ error: 'Активная игра в мины уже идёт' });
    }
    const bet = parsePositiveInt(req.body.bet);
    if (!bet || bet < 10) return res.status(400).json({ error: 'Мин. ставка 10 ★' });
    if (bet > 1000000) return res.status(400).json({ error: 'Макс. ставка 1 000 000 ★' });
    if (Number(user.balance) < bet) return res.status(400).json({ error: 'Недостаточно средств' });

    const gridSize = getGridSize(bet);
    const total = gridSize * gridSize;
    let m = parsePositiveInt(req.body.minesCount) || 3;
    if (m < 1) m = 1;
    if (m >= total) m = total - 1;

    const isWinRound = nextMinesRoundIsWin(user.login);

    user.balance = Number(user.balance) - bet;
    saveDB(dbObj);

    minesSessions.set(user.login, {
      bombs: null,
      total,
      gridSize,
      minesCount: m,
      opened: new Set(),
      bet,
      isWinRound
    });

    return res.json({
      success: true,
      balance: user.balance,
      gridSize,
      totalCells: total,
      minesCount: m
    });
  }

  if (action === 'click') {
    const session = minesSessions.get(user.login);
    if (!session) return res.status(400).json({ error: 'Игра не найдена' });

    const cell = Number(req.body.cell);
    if (!Number.isInteger(cell) || cell < 0 || cell >= session.total) {
      return res.status(400).json({ error: 'Неверная клетка' });
    }
    if (session.opened.has(cell)) {
      return res.status(400).json({ error: 'Клетка уже открыта' });
    }

    if (!session.bombs) {
      const forceBomb = !session.isWinRound;
      session.bombs = generateBombsForClick(session.total, session.minesCount, cell, forceBomb);
    }

    if (session.bombs.has(cell)) {
      const bombs = Array.from(session.bombs);
      minesSessions.delete(user.login);
      return res.json({
        success: true,
        bomb: true,
        bombs,
        openedCount: session.opened.size
      });
    }

    session.opened.add(cell);
    const mult = minesMultiplier(session.opened.size, session.minesCount, session.total);
    const potentialWin = Math.floor(session.bet * mult);

    return res.json({
      success: true,
      bomb: false,
      cell,
      openedCount: session.opened.size,
      multiplier: mult,
      potentialWin
    });
  }

  if (action === 'cashout') {
    const session = minesSessions.get(user.login);
    if (!session) {
      return res.json({ success: true, win: 0, balance: user.balance, bombs: [] });
    }
    const bombs = session.bombs ? Array.from(session.bombs) : [];
    if (session.opened.size === 0) {
      minesSessions.delete(user.login);
      return res.json({ success: true, win: 0, balance: user.balance, bombs });
    }

    const mult = minesMultiplier(session.opened.size, session.minesCount, session.total);
    const winAmt = Math.floor(session.bet * mult);

    user.balance = Number(user.balance) + winAmt;
    saveDB(dbObj);
    minesSessions.delete(user.login);

    return res.json({
      success: true,
      win: winAmt,
      balance: user.balance,
      bombs
    });
  }

  return res.status(400).json({ error: 'Неизвестное действие' });
});

/* ================== АПГРЕЙД ================== */
app.post('/api/upgrade', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const user = dbObj.users.find(u => u.login === auth.login);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const targetItem = getItemById(String(req.body.targetItemId || ''));
  if (!targetItem) return res.status(400).json({ error: 'Выберите целевой предмет' });

  let myValue = 0;
  let itemIndex = -1;

  if (req.body.betStars !== undefined && req.body.betStars !== null && req.body.betStars !== '') {
    const stars = parsePositiveInt(req.body.betStars);
    if (!stars || stars < 10) return res.status(400).json({ error: 'Мин. ставка звёздами 10 ★' });
    if (Number(user.balance) < stars) return res.status(400).json({ error: 'Недостаточно звёзд' });
    myValue = stars;
  } else {
    const uid = String(req.body.myUid || '');
    itemIndex = user.inventory.findIndex(it => it.uid === uid);
    if (itemIndex === -1) return res.status(400).json({ error: 'Выберите предмет из инвентаря или ставку звёздами' });
    myValue = Number(user.inventory[itemIndex].price) || 0;
  }

  if (myValue <= 0 || myValue >= Number(targetItem.price)) {
    return res.status(400).json({ error: 'Целевой предмет должен быть дороже ставки' });
  }

  // Потолок шанса 42% для стабильной маржинальности
  const rawChance = (myValue / Number(targetItem.price)) * 42;
  const chance = Math.min(42, Math.max(1, Number(rawChance.toFixed(2))));

  if (itemIndex !== -1) {
    user.inventory.splice(itemIndex, 1);
  } else {
    user.balance = Number(user.balance) - myValue;
  }

  const roll = Math.random() * 100;
  const win = roll < chance;

  let wonItem = null;
  if (win) {
    wonItem = {
      uid: crypto.randomUUID(),
      id: targetItem.id,
      name: targetItem.name,
      icon: targetItem.icon,
      price: targetItem.price
    };
    user.inventory.push(wonItem);
    pushDrop(dbObj, user.login, wonItem);
  }

  saveDB(dbObj);

  return res.json({
    success: true,
    win,
    chance,
    balance: user.balance,
    item: wonItem
  });
});

/* ================== ИНВЕНТАРЬ И ЭКСПОРТ ================== */
app.post('/api/inventory/sell', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const user = dbObj.users.find(u => u.login === auth.login);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const uid = String(req.body.uid || '');
  const idx = user.inventory.findIndex(it => it.uid === uid);
  if (idx === -1) return res.status(404).json({ error: 'Предмет не найден в инвентаре' });

  const [sold] = user.inventory.splice(idx, 1);
  const price = Math.max(0, Math.floor(Number(sold.price) || 0));
  user.balance = Number(user.balance) + price;
  saveDB(dbObj);

  return res.json({ success: true, balance: user.balance, soldPrice: price });
});

app.get('/api/export/my-data', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const user = dbObj.users.find(u => u.login === auth.login);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const myDeposits = dbObj.deposits.filter(d => d.user_login === user.login);
  const myWithdraws = dbObj.withdraws.filter(w => w.user_login === user.login);

  return res.json({
    exported_at: new Date().toISOString(),
    user: sanitizeUser(user),
    deposits: myDeposits,
    withdraws: myWithdraws
  });
});

/* ================== КОШЕЛЕК ================== */
app.post('/api/wallet/deposit', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const amount = parsePositiveInt(req.body.amount);
  if (!amount || amount < 10) return res.status(400).json({ error: 'Мин. сумма пополнения 10 ★' });

  const entry = {
    id: crypto.randomUUID(),
    user_login: auth.login,
    amount_stars: amount,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  dbObj.deposits.unshift(entry);
  saveDB(dbObj);

  return res.json({ success: true, deposit: entry });
});

app.post('/api/wallet/withdraw', (req, res) => {
  const dbObj = loadDB();
  const auth = getAuthUser(req, dbObj);
  if (!auth) return res.status(401).json({ error: 'Не авторизован' });

  const amount = parsePositiveInt(req.body.amount);
  if (!amount || amount < 50) return res.status(400).json({ error: 'Мин. сумма вывода 50 ★' });

  const user = dbObj.users.find(u => u.login === auth.login);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (Number(user.balance) < amount) {
    return res.status(400).json({ error: 'Недостаточно звёзд для вывода' });
  }

  // Списываем сразу при создании заявки, чтобы нельзя было вывести один и тот же баланс дважды
  user.balance = Number(user.balance) - amount;
  const entry = {
    id: crypto.randomUUID(),
    user_login: user.login,
    amount_stars: amount,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  dbObj.withdraws.unshift(entry);
  saveDB(dbObj);

  return res.json({ success: true, balance: user.balance, withdraw: entry });
});

/* ================== АДМИН-ПАНЕЛЬ ================== */
function requireAdmin(req, res, dbObj) {
  const auth = getAuthUser(req, dbObj);
  if (!auth) {
    res.status(401).json({ error: 'Не авторизован' });
    return null;
  }
  if (!auth.is_admin && !auth.is_super_admin) {
    res.status(403).json({ error: 'Нет прав администратора' });
    return null;
  }
  return auth;
}

function requireSuperAdmin(req, res, dbObj) {
  const auth = requireAdmin(req, res, dbObj);
  if (!auth) return null;
  if (!auth.is_super_admin) {
    res.status(403).json({ error: 'Доступно только главному администратору' });
    return null;
  }
  return auth;
}

app.get('/api/admin/players', (req, res) => {
  const dbObj = loadDB();
  const admin = requireAdmin(req, res, dbObj);
  if (!admin) return;

  const list = dbObj.users.map(u => ({
    login: u.login,
    balance: Number(u.balance) || 0,
    nft_count: Array.isArray(u.inventory) ? u.inventory.length : 0,
    is_admin: Boolean(u.is_admin),
    is_super_admin: Boolean(u.is_super_admin)
  }));
  return res.json(list);
});

app.post('/api/admin/give-stars', (req, res) => {
  const dbObj = loadDB();
  const admin = requireAdmin(req, res, dbObj);
  if (!admin) return;

  const targetLogin = String(req.body.targetLogin || '').trim();
  const amount = parsePositiveInt(req.body.amount);
  if (!targetLogin || !amount) return res.status(400).json({ error: 'Укажите логин и сумму' });

  const target = dbObj.users.find(u => u.login === targetLogin);
  if (!target) return res.status(404).json({ error: 'Игрок не найден' });

  target.balance = Number(target.balance) + amount;
  addLog(dbObj, admin.login, 'Выдача звёзд', `${targetLogin}: +${amount} ★`);
  saveDB(dbObj);

  return res.json({ success: true, balance: target.balance });
});

app.post('/api/admin/take-stars', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  const targetLogin = String(req.body.targetLogin || '').trim();
  const amount = parsePositiveInt(req.body.amount);
  if (!targetLogin || !amount) return res.status(400).json({ error: 'Укажите логин и сумму' });

  const target = dbObj.users.find(u => u.login === targetLogin);
  if (!target) return res.status(404).json({ error: 'Игрок не найден' });

  const actualTaken = Math.min(Number(target.balance) || 0, amount);
  target.balance = Math.max(0, Number(target.balance) - actualTaken);
  addLog(dbObj, superAdmin.login, 'Списание звёзд', `${targetLogin}: -${actualTaken} ★`);
  saveDB(dbObj);

  return res.json({ success: true, balance: target.balance, taken: actualTaken });
});

app.post('/api/admin/give-nft', (req, res) => {
  const dbObj = loadDB();
  const admin = requireAdmin(req, res, dbObj);
  if (!admin) return;

  const targetLogin = String(req.body.targetLogin || '').trim();
  const itemInput = req.body.item || {};
  const name = String(itemInput.name || '').trim();
  if (!targetLogin || !name) return res.status(400).json({ error: 'Укажите логин и название NFT' });

  const target = dbObj.users.find(u => u.login === targetLogin);
  if (!target) return res.status(404).json({ error: 'Игрок не найден' });

  const nftItem = {
    uid: crypto.randomUUID(),
    id: String(itemInput.id || 'custom_nft').trim() || 'custom_nft',
    name,
    icon: String(itemInput.icon || '💎').trim() || '💎',
    price: Math.max(0, Math.floor(Number(itemInput.price) || 100))
  };

  target.inventory.push(nftItem);
  addLog(dbObj, admin.login, 'Выдача NFT', `${targetLogin}: ${nftItem.name} (${nftItem.price} ★)`);
  saveDB(dbObj);

  return res.json({ success: true, item: nftItem });
});

app.get('/api/admin/deposits', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  return res.json(dbObj.deposits.filter(d => d.status === 'pending'));
});

app.post('/api/admin/deposit/accept', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  const id = String(req.body.id || '').trim();
  const dep = dbObj.deposits.find(d => d.id === id);
  if (!dep) return res.status(404).json({ error: 'Заявка на пополнение не найдена' });
  if (dep.status !== 'pending') return res.status(400).json({ error: 'Заявка уже обработана' });

  const target = dbObj.users.find(u => u.login === dep.user_login);
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' });

  dep.status = 'accepted';
  target.balance = Number(target.balance) + Number(dep.amount_stars);
  addLog(dbObj, superAdmin.login, 'Принято пополнение', `${dep.user_login}: +${dep.amount_stars} ★`);
  saveDB(dbObj);

  return res.json({ success: true, balance: target.balance });
});

app.get('/api/admin/withdraws', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  return res.json(dbObj.withdraws.filter(w => w.status === 'pending'));
});

app.post('/api/admin/withdraws/accept', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  const id = String(req.body.id || '').trim();
  const wd = dbObj.withdraws.find(w => w.id === id);
  if (!wd) return res.status(404).json({ error: 'Заявка на вывод не найдена' });
  if (wd.status !== 'pending') return res.status(400).json({ error: 'Заявка уже обработана' });

  wd.status = 'accepted';
  addLog(dbObj, superAdmin.login, 'Принят вывод', `${wd.user_login}: ${wd.amount_stars} ★`);
  saveDB(dbObj);

  return res.json({ success: true });
});

app.post('/api/admin/create-promo', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  const code = String(req.body.code || '').trim().toUpperCase();
  const stars = parsePositiveInt(req.body.stars);
  const limit = parsePositiveInt(req.body.limit) || 1;
  if (!code || !stars) return res.status(400).json({ error: 'Укажите код и количество звёзд' });

  const promo = {
    id: crypto.randomUUID(),
    code,
    stars,
    limit,
    used_count: 0,
    created_at: new Date().toISOString()
  };
  dbObj.promos.unshift(promo);
  addLog(dbObj, superAdmin.login, 'Создан промокод', `${code} (${stars} ★, лимит ${limit})`);
  saveDB(dbObj);

  return res.json({ success: true, promo });
});

app.post('/api/admin/make-admin', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  const targetLogin = String(req.body.targetLogin || '').trim();
  const target = dbObj.users.find(u => u.login === targetLogin);
  if (!target) return res.status(404).json({ error: 'Игрок не найден' });

  target.is_admin = true;
  addLog(dbObj, superAdmin.login, 'Выдана админка', targetLogin);
  saveDB(dbObj);

  return res.json({ success: true });
});

app.post('/api/admin/remove-admin', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  const targetLogin = String(req.body.targetLogin || '').trim();
  if (targetLogin === 'fleyn') return res.status(400).json({ error: 'Нельзя снять права у главного админа' });

  const target = dbObj.users.find(u => u.login === targetLogin);
  if (!target) return res.status(404).json({ error: 'Игрок не найден' });

  target.is_admin = false;
  addLog(dbObj, superAdmin.login, 'Сняты права админа', targetLogin);
  saveDB(dbObj);

  return res.json({ success: true });
});

app.get('/api/admin/logs', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  return res.json(dbObj.logs.slice(0, 50));
});

app.get('/api/admin/download-db', (req, res) => {
  const dbObj = loadDB();
  const superAdmin = requireSuperAdmin(req, res, dbObj);
  if (!superAdmin) return;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.send(JSON.stringify(dbObj, null, 2));
});

/* ================== ОБРАБОТКА ОШИБОК ================== */
app.use('/api', (req, res) => {
  return res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`KazinoAP server running on http://localhost:${PORT}`);
  console.log(`Database file: ${DB_FILE}`);
});
