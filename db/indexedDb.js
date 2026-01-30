// IndexedDB wrapper for prAIvacy (MV3)
(function () {
  const DB_NAME = 'praivacyDB';
  const DB_VERSION = 1;
  const VISITED_STORE = 'visited_domains';
  const BLOCKED_STORE = 'blocked_domains';
  const STATS_STORE = 'stats';
  const RULES_STORE = 'rules';

  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const owner = e.target.result;
        if (!owner.objectStoreNames.contains(VISITED_STORE)) {
          const vs = owner.createObjectStore(VISITED_STORE, { keyPath: 'domain' });
          vs.createIndex('lastSeen', 'lastSeen', { unique: false });
          vs.createIndex('firstSeen', 'firstSeen', { unique: false });
          vs.createIndex('visitCount', 'visitCount', { unique: false });
        }
        if (!owner.objectStoreNames.contains(BLOCKED_STORE)) {
          owner.createObjectStore(BLOCKED_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!owner.objectStoreNames.contains(STATS_STORE)) {
          owner.createObjectStore(STATS_STORE, { keyPath: 'key' });
        }
        if (!owner.objectStoreNames.contains(RULES_STORE)) {
          owner.createObjectStore(RULES_STORE, { keyPath: 'ruleId' });
        }
      };
      req.onsuccess = () => {
        db = req.result;
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function ensure() {
    if (db) return db;
    return await openDB();
  }

  // 1) logVisitedDomain(domain)
  async function logVisitedDomain(domain) {
    const database = await ensure();
    const tx = database.transaction([VISITED_STORE], 'readwrite');
    const store = tx.objectStore(VISITED_STORE);
    const now = Date.now();
    const req = store.get(domain);
    req.onsuccess = () => {
      const existing = req.result;
      if (existing) {
        existing.lastSeen = now;
        existing.visitCount = (existing.visitCount || 0) + 1;
        store.put(existing);
      } else {
        store.add({ domain, firstSeen: now, lastSeen: now, visitCount: 1 });
      }
    };
    return tx.complete;
  }

  // 2) logBlockedDomain(domain, category, ruleType)
  async function logBlockedDomain(domain, category, ruleType) {
    const database = await ensure();
    const tx = database.transaction([BLOCKED_STORE], 'readwrite');
    const store = tx.objectStore(BLOCKED_STORE);
    store.add({ domain, category, blockedAt: Date.now(), ruleType });

    // Update stats (basic global counter)
    const sTx = database.transaction([STATS_STORE], 'readwrite');
    const sStore = sTx.objectStore(STATS_STORE);
    const getReq = sStore.get('global');
    getReq.onsuccess = () => {
      const s = getReq.result || { key: 'global', totalVisited: 0, totalBlocked: 0, totalAds: 0, totalTrackers: 0 };
      s.totalBlocked = (s.totalBlocked || 0) + 1;
      if (category === 'ads') s.totalAds = (s.totalAds || 0) + 1;
      if (category === 'trackers') s.totalTrackers = (s.totalTrackers || 0) + 1;
      sStore.put(s);
    };
    return tx.complete;
  }

  // 3) getVisitedDomains()
  async function getVisitedDomains() {
    const database = await ensure();
    const tx = database.transaction([VISITED_STORE], 'readonly');
    const store = tx.objectStore(VISITED_STORE);
    
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        console.log('🌐 IndexedDB: Retrieved', req.result.length, 'visited domains');
        resolve(req.result);
      };
      req.onerror = () => {
        console.error('❌ IndexedDB: Failed to retrieve visited domains', req.error);
        reject(req.error);
      };
    });
  }

  // 4) getBlockedDomains()
  async function getBlockedDomains() {
    const database = await ensure();
    const tx = database.transaction([BLOCKED_STORE], 'readonly');
    const store = tx.objectStore(BLOCKED_STORE);
    
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        console.log('📦 IndexedDB: Retrieved', req.result.length, 'blocked domains');
        resolve(req.result);
      };
      req.onerror = () => {
        console.error('❌ IndexedDB: Failed to retrieve blocked domains', req.error);
        reject(req.error);
      };
    });
  }

  // 5) getStats()
  async function getStats() {
    const database = await ensure();
    const tx = database.transaction([BLOCKED_STORE, VISITED_STORE, STATS_STORE], 'readonly');
    const blockedStore = tx.objectStore(BLOCKED_STORE);
    const visitedStore = tx.objectStore(VISITED_STORE);
    const statsStore = tx.objectStore(STATS_STORE);

    const [blockedData, visitedData, settingsData] = await Promise.all([
      new Promise((resolve) => {
        const req = blockedStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }),
      new Promise((resolve) => {
        const req = visitedStore.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }),
      new Promise((resolve) => {
        const req = statsStore.get('settings');
        req.onsuccess = () => resolve(req.result || { key: 'settings' });
        req.onerror = () => resolve({ key: 'settings' });
      })
    ]);

    const totalBlocked = blockedData.length;
    const totalTrackers = blockedData.filter(d => d.category === 'trackers').length;
    const totalAds = blockedData.filter(d => d.category === 'ads').length;
    const totalVisited = visitedData.length;
    const protectionEnabled = settingsData.protectionEnabled !== false;

    return {
      key: 'global',
      totalBlocked,
      totalTrackers,
      totalAds,
      totalVisited,
      protectionEnabled
    };
  }

  // 6) resetStats()
  async function resetStats() {
    const database = await ensure();
    const tx = database.transaction([STATS_STORE], 'readwrite');
    const store = tx.objectStore(STATS_STORE);
    store.put({ key: 'global', totalVisited: 0, totalBlocked: 0, totalAds: 0, totalTrackers: 0 });
    return tx.complete;
  }

  // 7) addRule / getRules
  async function addRule(ruleId, pattern, type, enabled) {
    const database = await ensure();
    const tx = database.transaction([RULES_STORE], 'readwrite');
    const store = tx.objectStore(RULES_STORE);
    store.put({ ruleId, pattern, type, enabled });
    return tx.complete;
  }
  async function getRules() {
    const database = await ensure();
    const tx = database.transaction([RULES_STORE], 'readonly');
    const store = tx.objectStore(RULES_STORE);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Expose API on global
  if (typeof window !== 'undefined') {
    window.praivacyDB = {
      init: async () => await openDB(),
      logVisitedDomain,
      logBlockedDomain,
      getVisitedDomains,
      getBlockedDomains,
      getStats,
      resetStats,
      addRule,
      getRules
    };
  } else {
    self.praivacyDB = {
      init: async () => await openDB(),
      logVisitedDomain,
      logBlockedDomain,
      getVisitedDomains,
      getBlockedDomains,
      getStats,
      resetStats,
      addRule,
      getRules
    };
  }
})();
