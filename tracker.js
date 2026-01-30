// tracker.js - Real-time tracker detection and blocking stats

console.log('🔍 Tracker Detection page loaded');

// DOM Elements
const totalBlockedStat = document.getElementById('total-blocked');
const totalTrackersStat = document.getElementById('total-trackers');
const totalAdsStat = document.getElementById('total-ads');
const updateStatusStat = document.getElementById('update-status');
const goLiveBtn = document.getElementById('go-live-btn');
const liveStatusText = document.getElementById('live-status');
const visitedDomainsList = document.getElementById('visited-domains-list');

// State
let updateInterval = null;
let isProtectionOn = false;

// Initialize
async function initTrackerPage() {
  console.log('🚀 Initializing Tracker Detection page...');
  
  try {
    // Set up event listeners
    setupEventListeners();
    
    // Load initial protection state
    await loadProtectionState();
    
    // Load initial stats
    await loadTrackerStats();
    
    // Start periodic updates
    startAutoRefresh();
    
    console.log('✅ Tracker Detection page initialized successfully');
  } catch (error) {
    console.error('❌ Tracker Detection page initialization error:', error);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Go Live button
  if (goLiveBtn) {
    goLiveBtn.addEventListener('click', toggleProtection);
  }
}

// Load Protection State
async function loadProtectionState() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_STATS'
    });
    
    if (response.success && response.data && response.data.stats) {
      const enabled = response.data.stats.protectionEnabled !== false;
      updateProtectionUI(enabled);
    }
  } catch (error) {
    console.error('❌ Error loading protection state:', error);
  }
}

// Toggle Protection
async function toggleProtection() {
  const newState = !isProtectionOn;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'toggleBlocking',
      enabled: newState
    });
    
    if (response.success) {
      isProtectionOn = newState;
      updateProtectionUI(newState);
      console.log('✅ Protection toggled:', newState);
    } else {
      console.error('❌ Failed to toggle protection:', response.error);
    }
  } catch (error) {
    console.error('❌ Error toggling protection:', error);
  }
}

// Update Protection UI
function updateProtectionUI(enabled) {
  if (goLiveBtn) {
    goLiveBtn.textContent = enabled ? 'Stop Live' : 'Go Live';
    goLiveBtn.className = enabled ? 'btn-live btn-live-active' : 'btn-live';
  }
  
  if (liveStatusText) {
    liveStatusText.textContent = enabled ? 'Protection On' : 'Protection Off';
    liveStatusText.className = 'live-status-text ' + (enabled ? 'live-on' : 'live-off');
  }
}

// Load Tracker Stats
async function loadTrackerStats() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_STATS'
    });
    
    if (response.success && response.data) {
      updateStatsDisplay(response.data.stats);
      updateVisitedDomains();
      console.log('✅ Tracker stats loaded:', response.data.stats);
    }
  } catch (error) {
    console.error('❌ Error loading tracker stats:', error);
  }
}

// Update Stats Display
function updateStatsDisplay(stats) {
  if (!stats) {
    return;
  }
  
  // Update total blocked
  if (totalBlockedStat) {
    const totalBlocked = stats.blockedCount || 0;
    totalBlockedStat.textContent = totalBlocked;
    animateNumber(totalBlockedStat, totalBlocked);
  }
  
  // Update trackers blocked
  if (totalTrackersStat) {
    const trackerCount = stats.trackerCount || 0;
    totalTrackersStat.textContent = trackerCount;
    animateNumber(totalTrackersStat, trackerCount);
  }
  
  // Update ads blocked
  if (totalAdsStat) {
    const adCount = stats.adCount || 0;
    totalAdsStat.textContent = adCount;
    animateNumber(totalAdsStat, adCount);
  }
}

// Update Visited Domains
async function updateVisitedDomains() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_VISITED_DOMAINS'
    });
    
    if (response.success && response.data) {
      renderVisitedDomains(response.data);
    }
  } catch (error) {
    console.error('❌ Error loading visited domains:', error);
  }
}

// Render Visited Domains
function renderVisitedDomains(visitedDomains) {
  if (!visitedDomainsList) {
    return;
  }
  
  if (!visitedDomains || visitedDomains.length === 0) {
    visitedDomainsList.innerHTML = `
      <div class="loading-state">
        <p>No visited domains yet. Start browsing!</p>
      </div>
    `;
    return;
  }
  
  // Sort by lastSeen descending (most recent first)
  const sortedDomains = [...visitedDomains].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  
  let html = '';
  sortedDomains.slice(0, 10).forEach(domain => {
    const timeAgo = getTimeAgo(domain.lastSeen);
    const visitCount = domain.visitCount || 1;
    
    html += `
      <div class="visited-domain-item">
        <div class="domain-main">
          <div class="domain-info">
            <span class="domain-name">${domain.domain}</span>
            <span class="domain-badge visits">${visitCount} visits</span>
          </div>
          <div class="domain-time">${timeAgo}</div>
        </div>
      </div>
    `;
  });
  
  visitedDomainsList.innerHTML = html;
}

// Get Time Ago
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Animate Number
function animateNumber(element, target) {
  const current = parseInt(element.textContent) || 0;
  if (current === target) {
    return;
  }
  
  const duration = 500;
  const steps = 20;
  const increment = (target - current) / steps;
  let step = 0;
  
  const interval = setInterval(() => {
    step++;
    const value = Math.round(current + (increment * step));
    element.textContent = value;
    
    if (step >= steps) {
      clearInterval(interval);
      element.textContent = target;
    }
  }, duration / steps);
}

// Start Auto Refresh
function startAutoRefresh() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Update every 2 seconds
  updateInterval = setInterval(() => {
    loadTrackerStats();
  }, 2000);
}

// Stop Auto Refresh
function stopAutoRefresh() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTrackerPage);
} else {
  initTrackerPage();
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopAutoRefresh);

console.log('✅ Tracker Detection script loaded');
