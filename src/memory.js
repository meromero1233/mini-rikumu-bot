import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR?.trim() || './data';
const FILE = path.join(DATA_DIR, 'mini-memory.json');

let store = {}; // { [userId]: { name, profile, history: [{role, content}] } }

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch { /* ignore */ }
}

function load() {
  try {
    store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    console.log(`[memory] loaded ${Object.keys(store).length} user memories`);
  } catch {
    store = {};
    console.log('[memory] no existing memory file, starting fresh');
  }
}

let saveTimer = null;
function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ensureDir();
    try {
      fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
    } catch (e) {
      console.error('[memory] save failed:', e.message);
    }
  }, 1000);
}

export function initMemory() {
  ensureDir();
  load();
}

export function getUserMemory(userId, name) {
  if (!store[userId]) {
    store[userId] = { name, profile: '', history: [] };
  }
  if (name) store[userId].name = name;
  return store[userId];
}

export function pushHistory(userId, role, content) {
  const mem = store[userId];
  if (!mem) return;
  mem.history.push({ role, content });
  if (mem.history.length > 40) mem.history.splice(0, mem.history.length - 40);
  save();
}

export function updateProfile(userId, profile) {
  const mem = store[userId];
  if (!mem) return;
  mem.profile = profile;
  save();
}

export function getUserMessageCount(userId) {
  const mem = store[userId];
  if (!mem) return 0;
  return mem.history.filter((m) => m.role === 'user').length;
}

// その人の希望の呼び方を保存する
export function setNickname(userId, nickname) {
  const mem = store[userId];
  if (!mem) return;
  mem.nickname = nickname;
  save();
}

export function getNickname(userId) {
  return store[userId]?.nickname || null;
}
