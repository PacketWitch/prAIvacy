// prAIvacy Dashboard - Real-time Stats and Activity Display
console.log('📊 prAIvacy Dashboard initializing...');

// DOM Elements
const trackersStat = document.getElementById('trackers-stat');
const adsStat = document.getElementById('ads-stat');
const domainsStat = document.getElementById('domains-stat');
const privacyScoreStat = document.getElementById('privacy-score');
const activityList = document.getElementById('activity-list');
const protectionToggle = document.getElementById('protection-toggle');
const powerStatus = document.getElementById('power-status');

// State
let updateInterval = null;
let protectionStateLoaded = false;
let dashboardInitialized = false;

// Initialize Dashboard
async function initDashboard() {
  // Prevent multiple initializations
  if (dashboardInitialized) {
    console.log('⚠️ Dashboard already initialized, skipping...');
    return;
  }
  
  console.log('🚀 Initializing dashboard...');
  dashboardInitialized = true;
  
  try {
    // Initialize IndexedDB
    if (window.praivacyDB) {
      await window.praivacyDB.init();
      console.log('✅ IndexedDB initialized');
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial protection state
    await loadProtectionState();
    
    // Load initial data
    await loadDashboardData();
    
    // Start periodic updates
    startAutoRefresh();
    
    console.log('✅ Dashboard initialized successfully');
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
    showErrorState('Failed to load dashboard data');
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Protection toggle
  if (protectionToggle) {
    protectionToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await toggleBlocking(enabled);
    });
  }
  
  // Domains stat click - show modal
  if (domainsStat) {
    domainsStat.addEventListener('click', () => showDomainsModal('all'));
  }
  
  // Ads stat click - show modal with ads only
  if (adsStat) {
    adsStat.addEventListener('click', () => showDomainsModal('ads'));
  }
  
  // Trackers stat click - show modal with trackers only
  if (trackersStat) {
    trackersStat.addEventListener('click', () => showDomainsModal('trackers'));
  }
  
  // Close modal button
  const closeModalBtn = document.getElementById('close-domains-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideDomainsModal);
  }
  
  // Close modal on background click
  const modal = document.getElementById('domains-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideDomainsModal();
      }
    });
  }
}

// Load Protection State
async function loadProtectionState() {
  // Only load once to prevent overwriting user's manual toggle when switching tabs
  if (protectionStateLoaded) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_STATS'
    });
    
    if (response.success && response.data && response.data.stats) {
      const enabled = response.data.stats.protectionEnabled !== false;
      
      // Update UI elements
      if (protectionToggle) {
        protectionToggle.checked = enabled;
      }
      if (powerStatus) {
        powerStatus.textContent = enabled ? 'Protected' : 'Unprotected';
        powerStatus.className = 'power-label ' + (enabled ? '' : 'disabled');
      }
      
      // Mark as loaded
      protectionStateLoaded = true;
    }
  } catch (error) {
    console.error('❌ Error loading protection state:', error);
  }
}

// Toggle Blocking
async function toggleBlocking(enabled) {
  try {
    console.log('🔄 Toggling blocking:', enabled);
    
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'toggleBlocking',
      enabled: enabled
    });
    
    if (response.success) {
      // Update UI
      if (powerStatus) {
        powerStatus.textContent = enabled ? 'Protected' : 'Unprotected';
        powerStatus.className = 'power-label ' + (enabled ? '' : 'disabled');
      }
      console.log('✅ Blocking toggled successfully');
    } else {
      console.error('❌ Failed to toggle blocking:', response.error);
      // Revert the toggle on error
      if (protectionToggle) {
        protectionToggle.checked = !enabled;
      }
    }
  } catch (error) {
    console.error('❌ Error toggling blocking:', error);
    // Revert the toggle on error
    if (protectionToggle) {
      protectionToggle.checked = !enabled;
    }
  }
}

// Show Domains Modal
async function showDomainsModal(filter = 'all') {
  const modal = document.getElementById('domains-modal');
  const tableBody = document.getElementById('domains-table-body');
  const modalHeader = modal?.querySelector('.modal-header h2');
  
  if (!modal || !tableBody) {
    return;
  }
  
  // Update modal title based on filter
  if (modalHeader) {
    const titles = {
      'all': 'All Blocked Domains',
      'ads': 'Blocked Ads',
      'trackers': 'Blocked Trackers'
    };
    modalHeader.textContent = titles[filter] || 'All Blocked Domains';
  }
  
  // Show modal
  modal.classList.add('show');
  
  // Clear table and show loading
  tableBody.innerHTML = '<tr><td colspan="4">Loading domains...</td></tr>';
  
  try {
    // Get all blocked domains from background script
    const response = await chrome.runtime.sendMessage({
      action: 'GET_STATS'
    });
    
    if (response.success && response.data && response.data.blockedRequests) {
      // Filter domains based on filter type
      let filteredDomains = response.data.blockedRequests;
      
      if (filter === 'ads') {
        filteredDomains = response.data.blockedRequests.filter(d => d.category === 'ads');
      } else if (filter === 'trackers') {
        filteredDomains = response.data.blockedRequests.filter(d => d.category === 'trackers');
      }
      
      populateDomainsTable(filteredDomains);
    } else {
      tableBody.innerHTML = '<tr><td colspan="4">No blocked domains found</td></tr>';
    }
  } catch (error) {
    console.error('❌ Error loading domains:', error);
    tableBody.innerHTML = '<tr><td colspan="4">Error loading domains</td></tr>';
  }
}

// Hide Domains Modal
function hideDomainsModal() {
  const modal = document.getElementById('domains-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Populate Domains Table
function populateDomainsTable(domains) {
  const tableBody = document.getElementById('domains-table-body');
  
  if (!tableBody) {
    return;
  }
  
  if (!domains || domains.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4">No blocked domains found</td></tr>';
    return;
  }
  
  // Sort by blockedAt descending (most recent first)
  const sortedDomains = [...domains].sort((a, b) => (b.blockedAt || 0) - (a.blockedAt || 0));
  
  let html = '';
  sortedDomains.forEach(domain => {
    const category = domain.category || 'unknown';
    const categoryClass = category === 'ads' ? 'category-ads' : category === 'trackers' ? 'category-trackers' : 'category-unknown';
    const timeAgo = getTimeAgo(domain.blockedAt);
    const sourceWebsite = domain.sourceWebsite || domain.source || 'Unknown';
    
    html += `
      <tr>
        <td class="domain-cell" title="${domain.domain}">${domain.domain}</td>
        <td><span class="category-badge ${categoryClass}">${category}</span></td>
        <td class="time-cell">${timeAgo}</td>
        <td class="source-cell" title="${sourceWebsite}">${sourceWebsite}</td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

// Load Dashboard Data
async function loadDashboardData() {
  try {
    console.log('📊 Loading dashboard data...');
    
    // Get stats from background script
    const response = await chrome.runtime.sendMessage({
      action: 'GET_STATS'
    });
    
    if (response.success && response.data) {
      updateStatsDisplay(response.data);
      updateActivityFeed(response.data.blockedRequests || []);
      await updatePrivacyScore(response.data.stats);
      console.log('✅ Dashboard data loaded:', response.data);
    } else {
      console.warn('⚠️ Failed to get stats:', response);
      showEmptyState();
    }
  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    showEmptyState();
  }
}

// Update Stats Display
function updateStatsDisplay(data) {
  const stats = data.stats || {};
  
  // Update tracker count
  if (trackersStat) {
    const trackerCount = stats.trackerCount || 0;
    trackersStat.textContent = trackerCount;
    animateNumber(trackersStat, trackerCount);
  }
  
  // Update ad count
  if (adsStat) {
    const adCount = stats.adCount || 0;
    adsStat.textContent = adCount;
    animateNumber(adsStat, adCount);
  }
  
  // Update domains count
  if (domainsStat) {
    const blockedCount = stats.blockedCount || 0;
    domainsStat.textContent = blockedCount;
    animateNumber(domainsStat, blockedCount);
  }
}

// Update Privacy Score
async function updatePrivacyScore(stats) {
  if (!privacyScoreStat || !window.privacyScoreEngine) {
    return;
  }
  
  try {
    // Calculate privacy score with default settings
    const defaultSettings = {
      blockingLevel: 'moderate', // Base score of 40 points
      privacyControls: {
        'block-ads': true, // +15 points
        'block-trackers': true, // +15 points
        'prevent-cross-site': true // +20 points
      },
      advancedSettings: {
        'fingerprint-protection': false, // +15 points (disabled for now)
        'auto-sync': false
      }
    };
    
    const scoreResult = await window.privacyScoreEngine.calculatePrivacyScore(
      defaultSettings,
      {
        blockedCount: stats.blockedCount || 0,
        adCount: stats.adCount || 0,
        trackerCount: stats.trackerCount || 0
      }
    );
    
    const score = scoreResult?.score || 0;
    privacyScoreStat.textContent = score + '%';
    
    // Update color based on score
    const color = window.privacyScoreEngine.getPrivacyColor(score);
    privacyScoreStat.style.color = color;
  } catch (error) {
    console.error('❌ Error calculating privacy score:', error);
    privacyScoreStat.textContent = '0%';
  }
}

// Update Activity Feed
function updateActivityFeed(blockedRequests) {
  if (!activityList) {
    return;
  }
  
  if (!blockedRequests || blockedRequests.length === 0) {
    activityList.innerHTML = '<li>Waiting for tracker data...</li>';
    return;
  }
  
  // Sort by blockedAt descending (most recent first)
  blockedRequests.sort((a, b) => (b.blockedAt || 0) - (a.blockedAt || 0));
  
  // Group by source website
  const groupedBySource = {};
  blockedRequests.forEach(req => {
    // Use sourceWebsite if available, otherwise use the domain itself
    const source = req.sourceWebsite || req.domain || 'Unknown';
    if (!groupedBySource[source]) {
      groupedBySource[source] = [];
    }
    groupedBySource[source].push(req);
  });
  
  // Generate HTML
  let html = '';
  
  Object.entries(groupedBySource).slice(0, 10).forEach(([source, requests]) => {
    const latestRequest = requests[0];
    const timeAgo = getTimeAgo(latestRequest.blockedAt);
    const blockedCount = requests.length;
    const category = latestRequest.category || 'unknown';
    const icon = category === 'ads' ? '🛑' : category === 'trackers' ? '🕵️' : '⚠️';
    
    html += `
      <li class="activity-item">
        <div class="activity-header">
          <span class="activity-icon">${icon}</span>
          <div class="activity-details">
            <strong>${source}</strong>
            <span class="activity-time">${timeAgo}</span>
          </div>
        </div>
        <div class="activity-content">
          <span class="activity-count">${blockedCount} blocked</span>
          <span class="activity-domain" title="${latestRequest.domain}">${latestRequest.domain}</span>
        </div>
      </li>
    `;
  });
  
  activityList.innerHTML = html;
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

// Show Empty State
function showEmptyState() {
  if (trackersStat) trackersStat.textContent = '0';
  if (adsStat) adsStat.textContent = '0';
  if (domainsStat) domainsStat.textContent = '0';
  if (privacyScoreStat) privacyScoreStat.textContent = '0%';
  if (activityList) activityList.innerHTML = '<li>Waiting for tracker data...</li>';
}

// Show Error State
function showErrorState(message) {
  if (activityList) {
    activityList.innerHTML = `<li class="error">⚠️ ${message}</li>`;
  }
}

// Start Auto Refresh
function startAutoRefresh() {
  // Update every 3 seconds
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = setInterval(() => {
    loadDashboardData();
  }, 3000);
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
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopAutoRefresh);

console.log('✅ prAIvacy Dashboard script loaded');