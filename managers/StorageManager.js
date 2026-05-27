import { STORAGE_KEYS } from '../config/constants.js';

class StorageManager {
  constructor() {
    this.keys = { ...STORAGE_KEYS };
  }

  save(keyName, data) {
    const key = this.keys[keyName];
    if (!key) { console.error(`StorageManager: unknown key "${keyName}"`); return; }
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('StorageManager save error:', e);
    }
  }

  load(keyName) {
    const key = this.keys[keyName];
    if (!key) { console.error(`StorageManager: unknown key "${keyName}"`); return []; }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('StorageManager load error:', e);
      return [];
    }
  }

  clear(keyName) {
    const key = this.keys[keyName];
    if (!key) { console.error(`StorageManager: unknown key "${keyName}"`); return; }
    localStorage.removeItem(key);
  }

  clearAll() {
    Object.values(this.keys).forEach(k => localStorage.removeItem(k));
  }

  hasData() {
    return Object.values(this.keys).some(k => localStorage.getItem(k) !== null);
  }
}

export default StorageManager;
