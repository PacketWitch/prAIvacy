// Service Worker Background Script - prAIvacy Ad Blocker (Clean Version)
"use strict";

// Embedded IndexedDB wrapper for service worker
const praivacyDB = (function() {
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

  async function logVisitedDomain(domain) {
    const database = await ensure();
    const tx = database.transaction([VISITED_STORE], 'readwrite');
    const store = tx.objectStore(VISITED_STORE);
    
    const existing = await new Promise((resolve) => {
      const req = store.get(domain);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    const now = Date.now();
    const updated = {
      domain: domain,
      visitCount: (existing?.visitCount || 0) + 1,
      firstSeen: existing?.firstSeen || now,
      lastSeen: now
    };

    await new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function logBlockedDomain(domain, category, source, sourceUrl) {
    const database = await ensure();
    const tx = database.transaction([BLOCKED_STORE], 'readwrite');
    const store = tx.objectStore(BLOCKED_STORE);
    
    // Extract source website from the blocked URL
    let sourceWebsite = 'Unknown';
    if (sourceUrl) {
      try {
        const url = new URL(sourceUrl);
        sourceWebsite = url.hostname;
      } catch (e) {
        // URL parsing failed, keep unknown
      }
    }
    
    const blocked = {
      id: Date.now() + Math.random(),
      domain: domain,
      category: category || 'unknown',
      source: source || 'unknown',
      sourceWebsite: sourceWebsite,
      blockedAt: Date.now()
    };

    await new Promise((resolve, reject) => {
      const req = store.put(blocked);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function getStats() {
    const database = await ensure();
    const tx = database.transaction([BLOCKED_STORE, VISITED_STORE], 'readonly');
    const blockedStore = tx.objectStore(BLOCKED_STORE);
    const visitedStore = tx.objectStore(VISITED_STORE);

    const [blockedData, visitedData] = await Promise.all([
      new Promise((resolve) => {
        const req = blockedStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
      }),
      new Promise((resolve) => {
        const req = visitedStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
      })
    ]);

    const totalBlocked = blockedData.length;
    const totalTrackers = blockedData.filter(d => d.category === 'trackers').length;
    const totalAds = blockedData.filter(d => d.category === 'ads').length;

    return {
      totalBlocked,
      totalTrackers,
      totalAds,
      visitedDomains: visitedData.length
    };
  }

  async function getBlockedDomains() {
    const database = await ensure();
    const tx = database.transaction([BLOCKED_STORE], 'readonly');
    const store = tx.objectStore(BLOCKED_STORE);
    
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });
  }

  async function getVisitedDomains() {
    const database = await ensure();
    const tx = database.transaction([VISITED_STORE], 'readonly');
    const store = tx.objectStore(VISITED_STORE);
    
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });
  }

  async function clearStats() {
    const database = await ensure();
    const tx = database.transaction([BLOCKED_STORE, VISITED_STORE], 'readwrite');
    const blockedStore = tx.objectStore(BLOCKED_STORE);
    const visitedStore = tx.objectStore(VISITED_STORE);

    await Promise.all([
      new Promise((resolve, reject) => {
        const req = blockedStore.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
      new Promise((resolve, reject) => {
        const req = visitedStore.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
    ]);
  }

  return {
    init: ensure,
    logVisitedDomain,
    logBlockedDomain,
    getStats,
    getBlockedDomains,
    getVisitedDomains,
    clearStats
  };
})();

// Initialize IndexedDB
self.praivacyDB = praivacyDB;
console.log("🚀 prAIvacy Ad Blocker starting...");

// CONFIGURATION
const BLOCKED_CATEGORIES = {
  ads: ["doubleclick.net","googlesyndication.com","adsystem.com","adservice.google.com","adnxs.com","advertising.com"],
  trackers: ["google-analytics.com","analytics.google.com","facebook.com","connect.facebook.net","pixel.facebook.com","scorecardresearch.com","quantserve.com"]
};

// GLOBAL STATE
let blockingEnabled = true;

// INSTALLATION AND STARTUP
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log('🚀 Extension installed/updated:', reason);
  if (reason === "install" || reason === "update") {
    await initializeExtension();
    setupBlockingListener();
  }
});

// CORE FUNCTIONS
async function initializeExtension() {
  try {
    console.log("🔧 Initializing extension storage...");
    // Storage initialization now handled by IndexedDB
    console.log("✅ Extension storage initialized (using IndexedDB)");
  } catch (error) {
    console.error('❌ Extension initialization error:', error);
  }
}

// BLOCKING CONTROL FUNCTIONS
let blockingListener = null;

function setupBlockingListener() {
  if (blockingListener) {
    try { 
      chrome.declarativeNetRequest.onRuleMatchedDebug.removeListener(blockingListener); 
    } catch (e) {
      console.log('📝 No existing listener to remove:', e.message);
    }
  }
  blockingListener = null;
  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
      // CRITICAL: Check if blocking is enabled globally
      if (!blockingEnabled) {
        console.log('🚫 Blocking disabled - ignoring blocked request:', details.request.url);
        return;
      }
      
      const domain = new URL(details.request.url).hostname;
      console.log('🚫 Request blocked:', domain, 'Full URL:', details.request.url, 'Rule:', details.rule.id);
      updateStats(details.request.url, details.request.tabId);
    });
    
    console.log('✅ Blocking listener attached and active');
  } else {
    console.log('⚠️ DeclarativeNetRequest API not available');
  }
}

function enableBlockingServices() {
  blockingEnabled = true;
  console.log('🛡️ Blocking services ENABLED - global flag set to TRUE');
  
  // Actually enable the ruleset in Declarative Net Request API
  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateEnabledRulesets) {
    try {
      chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['ruleset_1']
      }, () => {
        console.log('✅ Ruleset ENABLED via Declarative Net Request API');
      });
    } catch (e) {
      console.error('Error enabling ruleset:', e);
    }
  }
  
  setupBlockingListener();
}

function disableBlockingServices() {
  blockingEnabled = false;
  console.log('⚠️ Blocking services DISABLED - global flag set to FALSE');
  
  // Actually disable the ruleset in Declarative Net Request API
  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateEnabledRulesets) {
    try {
      chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['ruleset_1']
      }, () => {
        console.log('✅ Ruleset DISABLED via Declarative Net Request API');
      });
    } catch (e) {
      console.error('Error disabling ruleset:', e);
    }
  }
  
  if (blockingListener && chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
    try {
      chrome.declarativeNetRequest.onRuleMatchedDebug.removeListener(blockingListener);
      console.log('🚫 Blocking listener removed - blocking services stopped');
      blockingListener = null;
    } catch (e) {
      console.error('Error removing listener:', e);
    }
  }
}

// UPDATE STATS FUNCTION
async function updateStats(blockedUrl, tabId) {
  try {
    console.log('🚫 Updating stats for blocked URL:', blockedUrl);
    
    // Only update stats if blocking is enabled
    if (!blockingEnabled) {
      return;
    }
    
    // Update IndexedDB
    if (typeof self !== 'undefined' && self.praivacyDB) {
      const url = new URL(blockedUrl);
      const domain = url.hostname;
      
      // Get source website from tab
      let sourceUrl = '';
      if (tabId && tabId !== -1) {
        try {
          const tab = await new Promise((resolve) => {
            chrome.tabs.get(tabId, (tab) => {
              resolve(tab || null);
            });
          });
          if (tab && tab.url) {
            sourceUrl = tab.url;
          }
        } catch (e) {
          console.log('Could not get tab URL:', e.message);
        }
      }
      
      // Determine category based on URL
      let category = 'unknown';
      const urlLower = blockedUrl.toLowerCase();
      if (urlLower.includes('ad') || urlLower.includes('doubleclick') || urlLower.includes('googlesyndication')) {
        category = 'ads';
      } else if (urlLower.includes('analytics') || urlLower.includes('facebook') || urlLower.includes('pixel')) {
        category = 'trackers';
      }
      
      await self.praivacyDB.logBlockedDomain(domain, category, 'declarativeNetRequest', sourceUrl);
      console.log(`✅ Logged blocked domain to IndexedDB: ${domain} (${category}) from source: ${sourceUrl || 'Unknown'}`);
    }
  } catch (error) {
    console.error('❌ Error updating stats:', error);
  }
}

// EXTENSION COMMUNICATION
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'GET_STATS':
      // Use IndexedDB for stats
      (async () => {
        try {
          if (typeof self !== 'undefined' && self.praivacyDB) {
            const stats = await self.praivacyDB.getStats();
            const blockedDomains = await self.praivacyDB.getBlockedDomains();
            sendResponse({
              success: true,
              data: {
                stats: {
                  blockedCount: stats.totalBlocked || 0,
                  adCount: stats.totalAds || 0,
                  trackerCount: stats.totalTrackers || 0,
                  protectionEnabled: blockingEnabled
                },
                blockedRequests: blockedDomains || [],
                timestamp: Date.now()
              }
            });
          } else {
            sendResponse({
              success: true,
              data: {
                stats: { blockedCount: 0, adCount: 0, trackerCount: 0 },
                blockedRequests: [],
                timestamp: Date.now()
              }
            });
          }
        } catch (error) {
          console.error('Error getting stats:', error);
          sendResponse({ success: false, error: 'Failed to get stats' });
        }
      })();
      return true;

    case 'CLEAR_STATS':
      // Use IndexedDB for clearing stats
      (async () => {
        try {
          if (typeof self !== 'undefined' && self.praivacyDB) {
            await self.praivacyDB.clearStats();
            sendResponse({ success: true, message: 'Statistics cleared' });
          } else {
            sendResponse({ success: false, error: 'IndexedDB not available' });
          }
        } catch (error) {
          console.error('Error clearing stats:', error);
          sendResponse({ success: false, error: 'Failed to clear stats' });
        }
      })();
      return true;

    case 'GET_VISITED_DOMAINS':
      // Use IndexedDB for visited domains
      (async () => {
        try {
          if (typeof self !== 'undefined' && self.praivacyDB) {
            const visitedDomains = await self.praivacyDB.getVisitedDomains();
            sendResponse({
              success: true,
              data: visitedDomains || []
            });
          } else {
            sendResponse({ success: true, data: [] });
          }
        } catch (error) {
          console.error('Error getting visited domains:', error);
          sendResponse({ success: false, error: 'Failed to get visited domains' });
        }
      })();
      return true;

    case 'toggleBlocking':
      // Handle blocking toggle from dashboard
      if (typeof message.enabled === 'boolean') {
        console.log('🔄 Received toggleBlocking request:', message.enabled);
        
        if (message.enabled) {
          enableBlockingServices();
        } else {
          disableBlockingServices();
        }
        
        sendResponse({ success: true, message: 'Blocking toggled successfully' });
        console.log('✅ ToggleBlocking response sent');
      } else {
        sendResponse({ success: false, error: 'Invalid enabled parameter' });
      }
      return true;

    default:
      console.log('❓ Unknown action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

// VISITED DOMAINS TRACKING
if (typeof chrome.history !== 'undefined' && chrome.history.onVisited) {
  chrome.history.onVisited.addListener(async (historyItem) => {
    try {
      const domain = new URL(historyItem.url).hostname;

      // Skip if it's a chrome:// or extension:// URL
      if (historyItem.url.startsWith('chrome://') || historyItem.url.startsWith('chrome-extension://')) {
        return;
      }

      // Update IndexedDB
      if (typeof self !== 'undefined' && self.praivacyDB) {
        await self.praivacyDB.logVisitedDomain(domain);
        console.log(`✅ Visited domain logged to IndexedDB: ${domain}`);
      }
 
      console.log(`📍 Visited domain tracked: ${domain}`);

    } catch (error) {
      console.error('❌ Error tracking visited domain:', error);
    }
  });
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('🪟 Opening web app window 900x700');
  chrome.windows.create(
    {
      url: chrome.runtime.getURL('dashboard.html'),
      type: 'normal',
      width: 900,
      height: 700,
      focused: true
    },
    (window) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error opening extension window:', chrome.runtime.lastError);
      } else {
        console.log('🪟 Window opened:', window.id);
      }
    }
  );
});

console.log("🛡️ prAIvacy Ad Blocker ready!");
