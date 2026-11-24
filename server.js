const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'messenger_db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json({ limit: '12mb' }));
app.use(express.static(PUBLIC_DIR));

const GIFTS_CATALOG = [
  { id: 'plush_pepe', name: 'Plush Pepe', rarity: 'Legendary', tag: 'NFT', is_nft: true, price_ton: 2500, price_stars: 250000, bg: 'linear-gradient(145deg,#3b2d18,#1f180d)', svgType: 'pepe', icon: '/items/plush_pepe.png', popular: 100 },
  { id: 'algorithm_cup', name: 'Algorithm Cup', rarity: 'Legendary', tag: 'NFT', is_nft: true, price_ton: 1450, price_stars: 145000, bg: 'linear-gradient(145deg,#382c14,#1c160a)', svgType: 'cup_gold', icon: '/items/algorithm_cup.png', popular: 99 },
  { id: 'intelligence_cup', name: 'Intelligence Cup', rarity: 'Legendary', tag: 'NFT', is_nft: true, price_ton: 1320, price_stars: 132000, bg: 'linear-gradient(145deg,#2e323b,#171a21)', svgType: 'cup_silver', icon: '/items/intelligence_cup.png', popular: 98 },
  { id: 'heart_locket', name: 'Heart Locket', rarity: 'Legendary', tag: 'NFT', is_nft: true, price_ton: 890, price_stars: 89000, bg: 'linear-gradient(145deg,#521b2c,#290c15)', svgType: 'locket', icon: '/items/heart_locket.png', popular: 97 },
  { id: 'resistance_dog', name: 'Resistance Dog', rarity: 'Legendary', tag: 'NFT', is_nft: true, price_ton: 640, price_stars: 64000, bg: 'linear-gradient(145deg,#291c3d,#140d21)', svgType: 'dog', icon: '/items/resistance_dog.png', popular: 96 },
  { id: 'durovs_cap', name: "Durov's Cap", rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 455, price_stars: 45500, bg: 'linear-gradient(145deg,#1f3d26,#0e2113)', svgType: 'cap', icon: '/items/durovs_cap.png', popular: 95 },
  { id: 'durovs_glasses', name: "Durov's Glasses", rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 380, price_stars: 38000, bg: 'linear-gradient(145deg,#173552,#0a1a2b)', svgType: 'glasses', icon: '/items/durovs_glasses.png', popular: 94 },
  { id: 'precious_peach', name: 'Precious Peach', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 320, price_stars: 32000, bg: 'linear-gradient(145deg,#18364a,#0b1b26)', svgType: 'peach_gold', icon: '/items/precious_peach.png', popular: 93 },
  { id: 'heroic_helmet', name: 'Heroic Helmet', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 210, price_stars: 21000, bg: 'linear-gradient(145deg,#292524,#141211)', svgType: 'helmet_gold', icon: '/items/heroic_helmet.png', popular: 92 },
  { id: 'mighty_arm', name: 'Mighty Arm', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 175, price_stars: 17500, bg: 'linear-gradient(145deg,#1e3a5f,#0e1d33)', svgType: 'arm', icon: '/items/mighty_arm.png', popular: 91 },
  { id: 'nail_bracelet', name: 'Nail Bracelet', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 145, price_stars: 14500, bg: 'linear-gradient(145deg,#1c3d29,#0d2115)', svgType: 'bracelet', icon: '/items/nail_bracelet.png', popular: 90 },
  { id: 'artisan_brick', name: 'Artisan Brick', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 120, price_stars: 12000, bg: 'linear-gradient(145deg,#252847,#121426)', svgType: 'gpu', icon: '/items/artisan_brick.png', popular: 89 },
  { id: 'ion_gem', name: 'Ion Gem', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 95, price_stars: 9500, bg: 'linear-gradient(145deg,#224227,#102413)', svgType: 'ion_gem', icon: '/items/ion_gem.png', popular: 88 },
  { id: 'astral_shard', name: 'Astral Shard', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 89, price_stars: 8900, bg: 'linear-gradient(145deg,#2b2b2e,#141417)', svgType: 'shard', icon: '/items/astral_shard.png', popular: 87 },
  { id: 'perfume_bottle', name: 'Perfume Bottle', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 85, price_stars: 8500, bg: 'linear-gradient(145deg,#473c1b,#241e0c)', svgType: 'perfume', icon: '/items/perfume_bottle.png', popular: 86 },
  { id: 'mini_oscar', name: 'Mini Oscar', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 78, price_stars: 7800, bg: 'linear-gradient(145deg,#214226,#0f2112)', svgType: 'oscar', icon: '/items/mini_oscar.png', popular: 85 },
  { id: 'gem_signet', name: 'Gem Signet', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 72, price_stars: 7200, bg: 'linear-gradient(145deg,#27325c,#121830)', svgType: 'gem_ring', icon: '/items/gem_signet.png', popular: 84 },
  { id: 'westside_sign', name: 'Westside Sign', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 68, price_stars: 6800, bg: 'linear-gradient(145deg,#1d3d35,#0c1f1a)', svgType: 'westside', icon: '/items/westside_sign.png', popular: 83 },
  { id: 'sharp_tongue', name: 'Sharp Tongue', rarity: 'Epic', tag: 'NFT', is_nft: true, price_ton: 52, price_stars: 5200, bg: 'linear-gradient(145deg,#3d2645,#1f1224)', svgType: 'tongue', icon: '/items/sharp_tongue.png', popular: 82 },
  { id: 'voodoo_doll', name: 'Voodoo Doll', rarity: 'Rare', tag: 'NFT', is_nft: true, price_ton: 49, price_stars: 4900, bg: 'linear-gradient(145deg,#293d22,#131f0f)', svgType: 'voodoo', icon: '/items/voodoo_doll.png', popular: 81 },
  { id: 'loot_bag', name: 'Loot Bag', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 44, price_stars: 4400, bg: 'linear-gradient(145deg,#282c59,#13152e)', svgType: 'bag', icon: '/items/loot_bag.png', popular: 80 },
  { id: 'genie_lamp', name: 'Genie Lamp', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 39, price_stars: 3900, bg: 'linear-gradient(145deg,#1c3d29,#0d2115)', svgType: 'lamp', icon: '/items/genie_lamp.png', popular: 79 },
  { id: 'swiss_watch', name: 'Swiss Watch', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 32, price_stars: 3200, bg: 'linear-gradient(145deg,#1c4230,#0c2117)', svgType: 'watch', icon: '/items/swiss_watch.png', popular: 78 },
  { id: 'signet_ring', name: 'Signet Ring', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 28, price_stars: 2800, bg: 'linear-gradient(145deg,#472522,#241110)', svgType: 'signet', icon: '/items/signet_ring.png', popular: 77 },
  { id: 'neko_helmet', name: 'Neko Helmet', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 27, price_stars: 2700, bg: 'linear-gradient(145deg,#47391c,#241c0d)', svgType: 'neko', icon: '/items/neko_helmet.png', popular: 76 },
  { id: 'scared_cat', name: 'Scared Cat', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 25, price_stars: 2500, bg: 'linear-gradient(145deg,#253d22,#111f0f)', svgType: 'cat', icon: '/items/scared_cat.png', popular: 75 },
  { id: 'kissed_frog', name: 'Kissed Frog', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 23, price_stars: 2300, bg: 'linear-gradient(145deg,#1d3b4d,#0d1c26)', svgType: 'frog', icon: '/items/kissed_frog.png', popular: 74 },
  { id: 'diamond_ring', name: 'Diamond Ring', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 21, price_stars: 2100, bg: 'linear-gradient(145deg,#4a2724,#261311)', svgType: 'ring_box', icon: '/items/diamond_ring.png', popular: 73 },
  { id: 'crystal_ball', name: 'Crystal Ball', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 19, price_stars: 1900, bg: 'linear-gradient(145deg,#4a3d19,#261f0b)', svgType: 'ball', icon: '/items/crystal_ball.png', popular: 72 },
  { id: 'cupid_charm', name: 'Cupid Charm', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 18.5, price_stars: 1850, bg: 'linear-gradient(145deg,#4a2631,#261218)', svgType: 'cupid', icon: '/items/cupid_charm.png', popular: 71 },
  { id: 'toy_bear', name: 'Toy Bear', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 18, price_stars: 1800, bg: 'linear-gradient(145deg,#1b4230,#0c2117)', svgType: 'bear', icon: '/items/toy_bear.png', popular: 70 },
  { id: 'khabib_papakha', name: "Khabib's Papakha", rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 17.5, price_stars: 1750, bg: 'linear-gradient(145deg,#4d2819,#26130b)', svgType: 'papakha', icon: '/items/khabib_papakha.png', popular: 69 },
  { id: 'snow_globe', name: 'Snow Globe', rarity: 'Rare', tag: 'Зима', is_nft: false, price_ton: 17, price_stars: 1700, bg: 'linear-gradient(145deg,#1b4531,#0c2418)', svgType: 'globe', icon: '/items/snow_globe.png', popular: 68 },
  { id: 'love_potion', name: 'Love Potion', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 16.5, price_stars: 1650, bg: 'linear-gradient(145deg,#2a2b5c,#141530)', svgType: 'potion', icon: '/items/love_potion.png', popular: 67 },
  { id: 'mad_pumpkin', name: 'Mad Pumpkin', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 16, price_stars: 1600, bg: 'linear-gradient(145deg,#4a2822,#261310)', svgType: 'pumpkin', icon: '/items/mad_pumpkin.png', popular: 66 },
  { id: 'snow_mittens', name: 'Snow Mittens', rarity: 'Rare', tag: 'Зима', is_nft: false, price_ton: 15.5, price_stars: 1550, bg: 'linear-gradient(145deg,#323633,#181a19)', svgType: 'mittens', icon: '/items/snow_mittens.png', popular: 65 },
  { id: 'top_hat', name: 'Top Hat', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 15, price_stars: 1500, bg: 'linear-gradient(145deg,#223342,#101921)', svgType: 'tophat', icon: '/items/top_hat.png', popular: 64 },
  { id: 'vintage_cigar', name: 'Vintage Cigar', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 14.5, price_stars: 1450, bg: 'linear-gradient(145deg,#23294a,#101326)', svgType: 'cigar', icon: '/items/vintage_cigar.png', popular: 63 },
  { id: 'record_player', name: 'Record Player', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 11, price_stars: 1100, bg: 'linear-gradient(145deg,#422629,#211214)', svgType: 'player', icon: '/items/record_player.png', popular: 62 },
  { id: 'skull_flower', name: 'Skull Flower', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 10.5, price_stars: 1050, bg: 'linear-gradient(145deg,#263354,#121829)', svgType: 'flower', icon: '/items/skull_flower.png', popular: 61 },
  { id: 'ionic_dryer', name: 'Ionic Dryer', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 10.2, price_stars: 1020, bg: 'linear-gradient(145deg,#3d3322,#1f1910)', svgType: 'dryer', icon: '/items/ionic_dryer.png', popular: 60 },
  { id: 'joyful_bundle', name: 'Joyful Bundle', rarity: 'Rare', tag: 'Зима', is_nft: false, price_ton: 10, price_stars: 1000, bg: 'linear-gradient(145deg,#472834,#24131a)', svgType: 'bundle', icon: '/items/joyful_bundle.png', popular: 59 },
  { id: 'santa_hat', name: 'Santa Hat', rarity: 'Rare', tag: 'Зима', is_nft: false, price_ton: 9.5, price_stars: 950, bg: 'linear-gradient(145deg,#2d4222,#15210f)', svgType: 'santahat', icon: '/items/santa_hat.png', popular: 58 },
  { id: 'ufc_strike', name: 'UFC Strike', rarity: 'Rare', tag: 'Редкий', is_nft: false, price_ton: 9.4, price_stars: 940, bg: 'linear-gradient(145deg,#40243d,#21111f)', svgType: 'ufc', icon: '/items/ufc_strike.png', popular: 57 }
];

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function roundTon(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function makeSerial() {
  const num = Math.floor(1000 + Math.random() * 8999);
  return `#${num}`;
}

function buildUser(login, password, displayName, bio, balanceTon = 1500, balanceStars = 100000, isAdmin = false) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    login,
    display_name: displayName || login,
    bio: bio || 'Участник TagenGram ❄️ · NFT Collector',
    avatar_color: 'linear-gradient(145deg,#e0aaff,#7b2cbf)',
    avatar_url: '',
    banner_gradient: 'linear-gradient(135deg,#3b1668 0%,#190b2e 55%,#0e294b 100%)',
    status_emoji: '❄️',
    salt,
    passwordHash: hashPassword(password, salt),
    balance_ton: Number(balanceTon),
    balance: Number(balanceStars),
    gifts: [],
    favorites: ['plush_pepe', 'algorithm_cup', 'durovs_cap'],
    is_admin: Boolean(isAdmin),
    is_super_admin: Boolean(isAdmin),
    is_banned: false,
    last_seen: Date.now(),
    created_at: Date.now()
  };
}

function createInitialDB() {
  const now = Date.now();
  const uTagen = buildUser('tagen', 'admin123', 'Tagen', 'Founder & Admin · prod by tagen ❄️', 565712.62, 354668, true);
  uTagen.gifts.push(
    { ...GIFTS_CATALOG[0], uid: 'gift_init_1', serial: '#0001', from: 'tgweb', caption: 'Легендарный старт TagenGram!', pinned: true, hidden: false, received_at: now - 3600000 },
    { ...GIFTS_CATALOG[1], uid: 'gift_init_2', serial: '#0007', from: 'admin', caption: 'За развитие экосистемы', pinned: true, hidden: false, received_at: now - 2400000 },
    { ...GIFTS_CATALOG[5], uid: 'gift_init_3', serial: '#0042', from: 'tgweb', caption: 'Кепка в коллекцию', pinned: false, hidden: false, received_at: now - 1200000 }
  );

  const uTgweb = buildUser('tgweb', 'admin123', 'TGWeb', 'prod by tgweb · UI & NFT Core', 565712.62, 354668, true);
  uTgweb.status_emoji = '⚡';
  uTgweb.gifts.push(
    { ...GIFTS_CATALOG[3], uid: 'gift_init_4', serial: '#0012', from: 'tagen', caption: 'За топовый фронтенд!', pinned: true, hidden: false, received_at: now - 2000000 }
  );

  const uAdmin = buildUser('admin', 'admin123', 'System Admin', 'Официальный аккаунт TagenGram', 565712.62, 354668, true);
  uAdmin.status_emoji = '👑';

  return {
    users: { tagen: uTagen, tgweb: uTgweb, admin: uAdmin },
    sessions: {},
    catalog: GIFTS_CATALOG.slice(),
    chats: [
      { id: 'global_chat', type: 'group', title: '❄️ TagenGram Общий чат', avatar_emoji: '❄️', members: ['tagen', 'tgweb', 'admin'], updated_at: now },
      { id: 'dm_tagen_tgweb', type: 'dm', members: ['tagen', 'tgweb'], updated_at: now - 60000 }
    ],
    messages: [
      {
        id: 'msg_1',
        chat_id: 'global_chat',
        sender: 'tagen',
        type: 'text',
        text: 'Добро пожаловать в обновлённый TagenGram! Звуки включены, подарки в профиле работают как в Telegram — можно закреплять, передаривать и менять на TON ❄️🎁',
        created_at: now - 300000,
        read_by: ['tagen', 'tgweb', 'admin']
      },
      {
        id: 'msg_2',
        chat_id: 'global_chat',
        sender: 'tgweb',
        type: 'gift',
        text: 'Отправил Plush Pepe #0001!',
        gift: { ...GIFTS_CATALOG[0], uid: 'msg_gift_1', serial: '#0001' },
        gift_to: 'tagen',
        created_at: now - 120000,
        read_by: ['tagen', 'tgweb']
      }
    ],
    logs: []
  };
}

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const init = createInitialDB();
      writeDB(init);
      return init;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const db = {
      users: parsed.users || {},
      sessions: parsed.sessions || {},
      catalog: Array.isArray(parsed.catalog) && parsed.catalog.length ? parsed.catalog : GIFTS_CATALOG.slice(),
      chats: Array.isArray(parsed.chats) ? parsed.chats : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : []
    };
    if (!db.chats.find(c => c.id === 'global_chat')) {
      db.chats.unshift({ id: 'global_chat', type: 'group', title: '❄️ TagenGram Общий чат', avatar_emoji: '❄️', members: Object.keys(db.users), updated_at: Date.now() });
    }
    return db;
  } catch (err) {
    return createInitialDB();
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function getSessionUser(db, req) {
  const token = req.headers['x-auth-token'] || req.body?.token;
  if (!token || !db.sessions || !db.sessions[token]) return null;
  const sess = db.sessions[token];
  const login = typeof sess === 'string' ? sess : sess.login;
  return db.users[login] || null;
}

function requireAuth(req, res, next) {
  const db = readDB();
  const user = getSessionUser(db, req);
  if (!user) return res.status(401).json({ error: 'Требуется авторизация' });
  if (user.is_banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован' });
  user.last_seen = Date.now();
  if (!Array.isArray(user.gifts)) user.gifts = [];
  if (!Array.isArray(user.favorites)) user.favorites = [];
  req.db = db;
  req.user = user;
  next();
}

function sortProfileGifts(gifts) {
  return [...(gifts || [])].filter(g => !g.hidden).sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    return (Number(b.received_at) || 0) - (Number(a.received_at) || 0);
  });
}

function sanitizePublicUser(u) {
  const isOnline = (Date.now() - (Number(u.last_seen) || 0)) < 120000;
  return {
    login: u.login,
    display_name: u.display_name || u.login,
    bio: u.bio || '',
    avatar_color: u.avatar_color || 'linear-gradient(145deg,#e0aaff,#7b2cbf)',
    avatar_url: u.avatar_url || '',
    banner_gradient: u.banner_gradient || 'linear-gradient(135deg,#3b1668 0%,#190b2e 55%,#0e294b 100%)',
    status_emoji: u.status_emoji || '❄️',
    is_admin: Boolean(u.is_admin),
    is_super_admin: Boolean(u.is_super_admin),
    is_online: isOnline,
    last_seen: u.last_seen || 0,
    gifts: sortProfileGifts(u.gifts)
  };
}

app.post('/api/register', (req, res) => {
  const login = String(req.body?.login || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const displayName = String(req.body?.display_name || login).trim();
  const password = String(req.body?.password || '');
  if (!login || login.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Юзернейм (от 3 лат. букв/цифр) и пароль (от 6 симв.)' });
  }
  const db = readDB();
  if (db.users[login]) return res.status(400).json({ error: 'Этот @username уже занят' });

  db.users[login] = buildUser(login, password, displayName || login, 'Новый пользователь TagenGram ❄️', 1500, 100000, false);
  const globalChat = db.chats.find(c => c.id === 'global_chat');
  if (globalChat && !globalChat.members.includes(login)) globalChat.members.push(login);

  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { login, created_at: Date.now() };
  writeDB(db);
  return res.json({ ok: true, token, login });
});

app.post('/api/login', (req, res) => {
  const login = String(req.body?.login || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const db = readDB();
  const user = db.users[login];
  if (!user) return res.status(401).json({ error: 'Неверный @username или пароль' });
  if (user.is_banned) return res.status(403).json({ error: 'Аккаунт заблокирован' });
  if (hashPassword(password, user.salt || '') !== user.passwordHash) {
    return res.status(401).json({ error: 'Неверный @username или пароль' });
  }
  user.last_seen = Date.now();
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { login: user.login, created_at: Date.now() };
  writeDB(db);
  return res.json({ ok: true, token, login: user.login });
});

app.get('/api/me', requireAuth, (req, res) => {
  writeDB(req.db);
  const u = req.user;
  return res.json({
    ...sanitizePublicUser(u),
    balance_ton: roundTon(u.balance_ton),
    balance: Number(u.balance) || 0,
    gifts: sortProfileGifts(u.gifts),
    favorites: u.favorites || []
  });
});

app.post('/api/profile/update', requireAuth, (req, res) => {
  const displayName = String(req.body?.display_name || '').trim();
  const bio = String(req.body?.bio || '').trim();
  const statusEmoji = String(req.body?.status_emoji || '❄️').trim().slice(0, 4);
  const avatarUrl = String(req.body?.avatar_url || '').trim();
  const bannerGradient = String(req.body?.banner_gradient || '').trim();

  if (displayName) req.user.display_name = displayName.slice(0, 32);
  req.user.bio = bio.slice(0, 140);
  req.user.status_emoji = statusEmoji || '❄️';
  if (bannerGradient.startsWith('linear-gradient(')) req.user.banner_gradient = bannerGradient;
  if (avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('http') || avatarUrl === '') req.user.avatar_url = avatarUrl;
  writeDB(req.db);
  return res.json({ ok: true, me: sanitizePublicUser(req.user) });
});

app.get('/api/users', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const list = Object.values(req.db.users)
    .filter(u => !u.is_banned && (!q || u.login.includes(q) || (u.display_name || '').toLowerCase().includes(q)))
    .map(sanitizePublicUser);
  return res.json(list);
});

app.get('/api/users/:login', requireAuth, (req, res) => {
  const target = req.db.users[String(req.params.login || '').toLowerCase()];
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' });
  return res.json(sanitizePublicUser(target));
});

app.get('/api/chats', requireAuth, (req, res) => {
  const me = req.user.login;
  const userChats = req.db.chats
    .filter(c => c.type === 'group' || (Array.isArray(c.members) && c.members.includes(me)))
    .map(c => {
      const msgs = req.db.messages.filter(m => m.chat_id === c.id);
      const lastMsg = msgs[msgs.length - 1] || null;
      const unread = msgs.filter(m => m.sender !== me && (!Array.isArray(m.read_by) || !m.read_by.includes(me))).length;

      let title = c.title || 'Чат';
      let peer = null;
      if (c.type === 'dm') {
        const peerLogin = (c.members || []).find(m => m !== me) || me;
        const peerUser = req.db.users[peerLogin];
        title = peerUser ? (peerUser.display_name || peerUser.login) : peerLogin;
        peer = peerUser ? sanitizePublicUser(peerUser) : { login: peerLogin, display_name: peerLogin, is_online: false };
      }

      return {
        id: c.id,
        type: c.type,
        title,
        avatar_emoji: c.avatar_emoji || '💬',
        peer,
        last_message: lastMsg,
        unread,
        updated_at: lastMsg ? lastMsg.created_at : (c.updated_at || 0)
      };
    })
    .sort((a, b) => b.updated_at - a.updated_at);

  return res.json(userChats);
});

app.post('/api/chats/dm', requireAuth, (req, res) => {
  const targetLogin = String(req.body?.login || '').trim().toLowerCase();
  const targetUser = req.db.users[targetLogin];
  if (!targetUser) return res.status(404).json({ error: 'Пользователь не найден' });

  const me = req.user.login;
  let chat = req.db.chats.find(c =>
    c.type === 'dm' &&
    c.members.includes(me) &&
    c.members.includes(targetLogin) &&
    (me === targetLogin ? c.members.filter(x => x === me).length === 2 : c.members.length === 2)
  );

  if (!chat) {
    chat = { id: `dm_${[me, targetLogin].sort().join('_')}_${Date.now()}`, type: 'dm', members: [me, targetLogin], updated_at: Date.now() };
    req.db.chats.push(chat);
    writeDB(req.db);
  }
  return res.json({ ok: true, chatId: chat.id });
});

app.get('/api/chats/:chatId/messages', requireAuth, (req, res) => {
  const chatId = String(req.params.chatId || '');
  const chat = req.db.chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });
  const me = req.user.login;
  if (chat.type === 'dm' && !chat.members.includes(me)) return res.status(403).json({ error: 'Нет доступа к чату' });

  let changed = false;
  const msgs = req.db.messages
    .filter(m => m.chat_id === chatId)
    .map(m => {
      if (!Array.isArray(m.read_by)) m.read_by = [];
      if (!m.read_by.includes(me)) {
        m.read_by.push(me);
        changed = true;
      }
      const senderUser = req.db.users[m.sender];
      return {
        ...m,
        sender_name: senderUser ? (senderUser.display_name || senderUser.login) : m.sender,
        sender_emoji: senderUser ? (senderUser.status_emoji || '❄️') : '❄️',
        sender_avatar: senderUser ? (senderUser.avatar_url || '') : ''
      };
    });

  if (changed) writeDB(req.db);
  return res.json(msgs.slice(-150));
});

app.post('/api/chats/:chatId/send', requireAuth, (req, res) => {
  const chatId = String(req.params.chatId || '');
  const chat = req.db.chats.find(c => c.id === chatId);
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });
  const me = req.user.login;
  if (chat.type === 'dm' && !chat.members.includes(me)) return res.status(403).json({ error: 'Нет доступа к чату' });

  const text = String(req.body?.text || '').trim();
  const image = String(req.body?.image || '').trim();
  if (!text && !image) return res.status(400).json({ error: 'Пустое сообщение' });

  const msg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    chat_id: chatId,
    sender: me,
    type: image ? 'image' : 'text',
    text: text.slice(0, 2000),
    image: image.startsWith('data:image/') ? image : '',
    created_at: Date.now(),
    read_by: [me]
  };
  req.db.messages.push(msg);
  chat.updated_at = msg.created_at;
  if (req.db.messages.length > 2000) req.db.messages.splice(0, req.db.messages.length - 2000);
  writeDB(req.db);
  return res.json({ ok: true, message: msg });
});

app.get('/api/catalog', (req, res) => {
  const db = readDB();
  return res.json(db.catalog);
});

app.post('/api/gifts/send', requireAuth, (req, res) => {
  try {
    const itemId = String(req.body?.itemId || '');
    const currency = req.body?.currency === 'stars' ? 'stars' : 'ton';
    const recipientLogin = String(req.body?.to || req.user.login).trim().toLowerCase();
    const caption = String(req.body?.caption || '').trim().slice(0, 120);
    const chatId = String(req.body?.chatId || '').trim();

    const baseItem = req.db.catalog.find(it => String(it.id) === itemId);
    if (!baseItem) return res.status(404).json({ error: 'Подарок не найден' });

    const recipient = req.db.users[recipientLogin];
    if (!recipient) return res.status(404).json({ error: 'Получатель не найден' });

    if (currency === 'stars') {
      const priceStars = Number(baseItem.price_stars) || Math.round(Number(baseItem.price_ton) * 100);
      if ((Number(req.user.balance) || 0) < priceStars) return res.status(400).json({ error: 'Недостаточно ★' });
      req.user.balance = Number(req.user.balance) - priceStars;
    } else {
      const priceTon = roundTon(baseItem.price_ton);
      if (roundTon(req.user.balance_ton) < priceTon) return res.status(400).json({ error: 'Недостаточно TON' });
      req.user.balance_ton = roundTon(req.user.balance_ton - priceTon);
    }

    const giftObj = {
      ...baseItem,
      uid: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      serial: makeSerial(),
      from: req.user.login,
      caption: caption || (recipient.login === req.user.login ? 'Личный коллекционный NFT' : `Подарок от @${req.user.login}`),
      pinned: true,
      hidden: false,
      received_at: Date.now()
    };

    if (!Array.isArray(recipient.gifts)) recipient.gifts = [];
    recipient.gifts.unshift(giftObj);

    let targetChat = chatId ? req.db.chats.find(c => c.id === chatId) : null;
    if (!targetChat && recipient.login !== req.user.login) {
      targetChat = req.db.chats.find(c =>
        c.type === 'dm' && c.members.includes(req.user.login) && c.members.includes(recipient.login) && c.members.length === 2
      );
      if (!targetChat) {
        targetChat = { id: `dm_${[req.user.login, recipient.login].sort().join('_')}_${Date.now()}`, type: 'dm', members: [req.user.login, recipient.login], updated_at: Date.now() };
        req.db.chats.push(targetChat);
      }
    }

    if (targetChat) {
      req.db.messages.push({
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        chat_id: targetChat.id,
        sender: req.user.login,
        type: 'gift',
        text: caption || `Подарил(а) ${baseItem.name} ${giftObj.serial}`,
        gift: giftObj,
        gift_to: recipient.login,
        created_at: Date.now(),
        read_by: [req.user.login]
      });
      targetChat.updated_at = Date.now();
    }

    writeDB(req.db);
    return res.json({
      ok: true,
      balance_ton: req.user.balance_ton,
      balance: req.user.balance,
      gifts: sortProfileGifts(req.user.gifts),
      gift: giftObj,
      chatId: targetChat ? targetChat.id : null
    });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка отправки подарка' });
  }
});

app.post('/api/gifts/pin', requireAuth, (req, res) => {
  const uid = String(req.body?.uid || '');
  const gift = req.user.gifts.find(g => String(g.uid) === uid);
  if (!gift) return res.status(404).json({ error: 'Подарок не найден' });
  gift.pinned = !gift.pinned;
  writeDB(req.db);
  return res.json({ ok: true, pinned: gift.pinned, gifts: sortProfileGifts(req.user.gifts) });
});

app.post('/api/gifts/transfer', requireAuth, (req, res) => {
  const uid = String(req.body?.uid || '');
  const toLogin = String(req.body?.to || '').trim().toLowerCase();
  const caption = String(req.body?.caption || '').trim().slice(0, 120);
  const recipient = req.db.users[toLogin];
  if (!recipient) return res.status(404).json({ error: 'Получатель не найден' });
  if (recipient.login === req.user.login) return res.status(400).json({ error: 'Этот NFT уже у вас в профиле' });

  const idx = req.user.gifts.findIndex(g => String(g.uid) === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден в профиле' });

  const [gift] = req.user.gifts.splice(idx, 1);
  gift.from = req.user.login;
  gift.caption = caption || `Передано от @${req.user.login}`;
  gift.received_at = Date.now();
  gift.hidden = false;
  gift.pinned = true;

  if (!Array.isArray(recipient.gifts)) recipient.gifts = [];
  recipient.gifts.unshift(gift);

  let dm = req.db.chats.find(c =>
    c.type === 'dm' && c.members.includes(req.user.login) && c.members.includes(recipient.login) && c.members.length === 2
  );
  if (!dm) {
    dm = { id: `dm_${[req.user.login, recipient.login].sort().join('_')}_${Date.now()}`, type: 'dm', members: [req.user.login, recipient.login], updated_at: Date.now() };
    req.db.chats.push(dm);
  }
  req.db.messages.push({
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    chat_id: dm.id,
    sender: req.user.login,
    type: 'gift',
    text: gift.caption,
    gift,
    gift_to: recipient.login,
    created_at: Date.now(),
    read_by: [req.user.login]
  });
  dm.updated_at = Date.now();

  writeDB(req.db);
  return res.json({ ok: true, gifts: sortProfileGifts(req.user.gifts), chatId: dm.id });
});

app.post('/api/gifts/convert', requireAuth, (req, res) => {
  const uid = String(req.body?.uid || '');
  const idx = req.user.gifts.findIndex(g => String(g.uid) === uid);
  if (idx === -1) return res.status(404).json({ error: 'Подарок не найден' });
  const [gift] = req.user.gifts.splice(idx, 1);
  const gained = roundTon((Number(gift.price_ton) || 1) * 0.8);
  req.user.balance_ton = roundTon(req.user.balance_ton + gained);
  writeDB(req.db);
  return res.json({ ok: true, gained_ton: gained, balance_ton: req.user.balance_ton, gifts: sortProfileGifts(req.user.gifts) });
});

app.post('/api/wallet/exchange', requireAuth, (req, res) => {
  const stars = Math.floor(Number(req.body?.stars) || 0);
  if (stars < 100) return res.status(400).json({ error: 'Минимум 100 ★' });
  if ((Number(req.user.balance) || 0) < stars) return res.status(400).json({ error: 'Недостаточно ★' });
  const gained = roundTon(stars / 100);
  req.user.balance -= stars;
  req.user.balance_ton = roundTon(req.user.balance_ton + gained);
  writeDB(req.db);
  return res.json({ ok: true, balance: req.user.balance, balance_ton: req.user.balance_ton, gained_ton: gained });
});

app.get('/api/admin/users', requireAuth, (req, res) => {
  if (!req.user.is_admin && !req.user.is_super_admin) return res.status(403).json({ error: 'Нет прав' });
  return res.json(Object.values(req.db.users).map(u => ({
    login: u.login,
    display_name: u.display_name,
    balance_ton: roundTon(u.balance_ton),
    balance: Number(u.balance) || 0,
    gifts_count: (u.gifts || []).length,
    is_banned: Boolean(u.is_banned)
  })));
});

app.post('/api/admin/give', requireAuth, (req, res) => {
  if (!req.user.is_admin && !req.user.is_super_admin) return res.status(403).json({ error: 'Нет прав' });
  const target = req.db.users[String(req.body?.target || '').toLowerCase()];
  if (!target) return res.status(404).json({ error: 'Пользователь не найден' });
  const ton = roundTon(req.body?.ton);
  const stars = Math.floor(Number(req.body?.stars) || 0);
  const giftId = String(req.body?.giftId || '');
  if (ton) target.balance_ton = Math.max(0, roundTon((target.balance_ton || 0) + ton));
  if (stars) target.balance = Math.max(0, (Number(target.balance) || 0) + stars);
  if (giftId) {
    const base = req.db.catalog.find(g => g.id === giftId);
    if (base) {
      target.gifts.unshift({ ...base, uid: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, serial: makeSerial(), from: req.user.login, caption: 'Подарок от Администрации ❄️', pinned: true, received_at: Date.now() });
    }
  }
  writeDB(req.db);
  return res.json({ ok: true });
});

app.get('*', (req, res) => {
  const idx = path.join(__dirname, 'index.html');
  if (fs.existsSync(idx)) return res.sendFile(idx);
  return res.status(404).send('index.html not found');
});

app.listen(PORT, () => {
  console.log(`TagenGram Messenger running on port ${PORT}`);
});
