// blocked.js - Blocked Domains page

console.log('🔒 Blocked Domains page loaded');

// DOM Elements
const blockedDomainsList = document.getElementById('blocked-domains-list');
const totalBlockedCount = document.getElementById('total-blocked-count');
const systemBlockedCount = document.getElementById('system-blocked-count');
const userBlockedCount = document.getElementById('user-blocked-count');
const highRiskCount = document.getElementById('high-risk-count');
const mediumRiskCount = document.getElementById('medium-risk-count');
const lowRiskCount = document.getElementById('low-risk-count');
const blockedCategoryStats = document.getElementById('blocked-category-stats');
const blockedDomainSearch = document.getElementById('blocked-domain-search');
const blockedCategoryFilter = document.getElementById('blocked-category-filter');
const exportBlockedListBtn = document.getElementById('export-blocked-list');
const addDomainInput = document.getElementById('add-domain-input');
const addDomainBtn = document.getElementById('add-domain-btn');

// State
let allBlockedDomains = [];
let userBlockedDomains = [];
let filteredDomains = [];
let updateInterval = null;

// Initialize
async function initBlockedPage() {
  console.log('🚀 Initializing Blocked Domains page...');
  
  try {
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    await loadBlockedDomains();
    
    // Start periodic updates
    startAutoRefresh();
    
    console.log('✅ Blocked Domains page initialized successfully');
  } catch (error) {
    console.error('❌ Blocked Domains page initialization error:', error);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search input
  if (blockedDomainSearch) {
    blockedDomainSearch.addEventListener('input', filterDomains);
  }
  
  // Category filter
  if (blockedCategoryFilter) {
    blockedCategoryFilter.addEventListener('change', filterDomains);
  }
  
  // Export button
  if (exportBlockedListBtn) {
    exportBlockedListBtn.addEventListener('click', exportBlockedList);
  }
  
  // Add domain button
  if (addDomainBtn) {
    addDomainBtn.addEventListener('click', addDomainToBlock);
  }
  
  // Add domain on Enter key
  if (addDomainInput) {
    addDomainInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addDomainToBlock();
      }
    });
  }
}

// Load Blocked Domains
async function loadBlockedDomains() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_STATS'
    });
    
    // Load user blocked domains from storage
    const userData = await chrome.storage.local.get(['userBlockedDomains']);
    userBlockedDomains = userData.userBlockedDomains || [];
    
    if (response.success && response.data && response.data.blockedRequests) {
      allBlockedDomains = response.data.blockedRequests;
      filteredDomains = [...allBlockedDomains];
      
      updateStatsDisplay();
      updateBlockedDomainsList();
      updateCategoryBreakdown();
      updateRiskBreakdown();
      
      console.log('✅ Blocked domains loaded:', allBlockedDomains.length);
      console.log('✅ User blocked domains:', userBlockedDomains.length);
    } else {
      console.warn('⚠️ No blocked domains data');
    }
  } catch (error) {
    console.error('❌ Error loading blocked domains:', error);
  }
}

// Update Stats Display
function updateStatsDisplay() {
  const totalBlocked = allBlockedDomains.length + userBlockedDomains.length;
  const systemBlocked = allBlockedDomains.filter(d => d.source === 'declarativeNetRequest').length;
  const userBlocked = userBlockedDomains.length;
  
  if (totalBlockedCount) {
    animateNumber(totalBlockedCount, totalBlocked);
  }
  
  if (systemBlockedCount) {
    animateNumber(systemBlockedCount, systemBlocked);
  }
  
  if (userBlockedCount) {
    animateNumber(userBlockedCount, userBlocked);
  }
}

// Update Risk Breakdown
function updateRiskBreakdown() {
  const highRisk = allBlockedDomains.filter(d => d.category === 'trackers').length;
  const mediumRisk = allBlockedDomains.filter(d => d.category === 'ads').length;
  const lowRisk = allBlockedDomains.filter(d => d.category === 'unknown').length;
  
  if (highRiskCount) {
    animateNumber(highRiskCount, highRisk);
  }
  
  if (mediumRiskCount) {
    animateNumber(mediumRiskCount, mediumRisk);
  }
  
  if (lowRiskCount) {
    animateNumber(lowRiskCount, lowRisk);
  }
}

// Update Category Breakdown
function updateCategoryBreakdown() {
  if (!blockedCategoryStats) {
    return;
  }
  
  const categoryCounts = {};
  allBlockedDomains.forEach(domain => {
    const category = domain.category || 'unknown';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  const categoryColors = {
    'ads': '#ff6b6b',
    'trackers': '#00f0ff',
    'unknown': '#ffc107'
  };
  
  const categoryIcons = {
    'ads': '🛑',
    'trackers': '🕵️',
    'unknown': '⚠️'
  };
  
  let html = '';
  Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
    const percentage = ((count / allBlockedDomains.length) * 100).toFixed(1);
    const color = categoryColors[category] || '#9caab8';
    const icon = categoryIcons[category] || '📊';
    
    html += `
      <div class="category-stat-item">
        <div class="category-header">
          <span class="category-icon">${icon}</span>
          <span class="category-name">${category.toUpperCase()}</span>
        </div>
        <div class="category-details">
          <div class="category-count">${count}</div>
          <div class="category-percentage">${percentage}%</div>
        </div>
        <div class="category-bar">
          <div class="category-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
        </div>
      </div>
    `;
  });
  
  blockedCategoryStats.innerHTML = html || '<p>No category data available</p>';
}

// Update Blocked Domains List
function updateBlockedDomainsList() {
  if (!blockedDomainsList) {
    return;
  }
  
  // Combine system blocked and user blocked domains
  const allDomains = [
    ...filteredDomains,
    ...userBlockedDomains.map(domain => ({
      domain: domain,
      category: 'user',
      source: 'user',
      blockedAt: Date.now(),
      sourceWebsite: 'User Added'
    }))
  ];
  
  if (!allDomains || allDomains.length === 0) {
    blockedDomainsList.innerHTML = `
      <div class="no-data-message">
        <p>No blocked domains found</p>
      </div>
    `;
    return;
  }
  
  // Sort by blockedAt descending (most recent first)
  const sortedDomains = allDomains.sort((a, b) => (b.blockedAt || 0) - (a.blockedAt || 0));
  
  let html = '';
  sortedDomains.forEach((domain, index) => {
    const category = domain.category || 'unknown';
    const categoryClass = category === 'ads' ? 'category-ads' : category === 'trackers' ? 'category-trackers' : category === 'user' ? 'category-user' : 'category-unknown';
    const icon = category === 'ads' ? '🛑' : category === 'trackers' ? '🕵️' : category === 'user' ? '👤' : '⚠️';
    const timeAgo = getTimeAgo(domain.blockedAt);
    const sourceWebsite = domain.sourceWebsite || 'Unknown';
    const isUserBlocked = category === 'user';
    const uniqueId = `domain-${index}`;
    
    html += `
      <div class="blocked-domain-item" id="${uniqueId}">
        <div class="domain-checkbox">
          <input type="checkbox" class="domain-select" data-domain="${domain.domain}" data-type="${category}">
        </div>
        <div class="domain-content">
          <div class="domain-header">
            <span class="domain-icon">${icon}</span>
            <div class="domain-info">
              <strong class="domain-name">${domain.domain}</strong>
              <span class="domain-time">${timeAgo}</span>
            </div>
            <span class="domain-category-badge ${categoryClass}">${category.toUpperCase()}</span>
          </div>
          <div class="domain-details">
            <span class="domain-source">From: ${sourceWebsite}</span>
            ${isUserBlocked ? `<button class="btn-unblock" data-domain="${domain.domain}">🔓 Unblock</button>` : '<span class="domain-count">System Blocked</span>'}
          </div>
        </div>
      </div>
    `;
  });
  
  blockedDomainsList.innerHTML = html;
  
  // Add event listeners for unblock buttons
  document.querySelectorAll('.btn-unblock').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const domain = e.target.dataset.domain;
      unblockDomain(domain);
    });
  });
}

// Filter Domains
function filterDomains() {
  const searchTerm = blockedDomainSearch?.value?.toLowerCase() || '';
  const categoryFilter = blockedCategoryFilter?.value || '';
  
  filteredDomains = allBlockedDomains.filter(domain => {
    // Search filter
    const matchesSearch = !searchTerm || 
      domain.domain?.toLowerCase().includes(searchTerm) ||
      domain.sourceWebsite?.toLowerCase().includes(searchTerm);
    
    // Category filter
    let matchesCategory = true;
    if (categoryFilter) {
      if (categoryFilter === 'system') {
        matchesCategory = domain.source === 'declarativeNetRequest';
      } else if (categoryFilter === 'user') {
        matchesCategory = domain.source === 'user';
      } else {
        matchesCategory = domain.category === categoryFilter.toLowerCase();
      }
    }
    
    return matchesSearch && matchesCategory;
  });
  
  updateBlockedDomainsList();
}

// Add Domain to Block
async function addDomainToBlock() {
  const domain = addDomainInput?.value?.trim();
  
  if (!domain) {
    alert('Please enter a domain to block');
    return;
  }
  
  // Validate domain format
  if (!domain.includes('.')) {
    alert('Please enter a valid domain (e.g., example.com)');
    return;
  }
  
  // Check if already blocked
  if (userBlockedDomains.includes(domain)) {
    alert('This domain is already in your blocklist');
    return;
  }
  
  try {
    // Add to user blocked domains
    userBlockedDomains.push(domain);
    
    await chrome.storage.local.set({
      userBlockedDomains: userBlockedDomains
    });
    
    // Clear input
    if (addDomainInput) {
      addDomainInput.value = '';
    }
    
    // Refresh list
    updateStatsDisplay();
    updateBlockedDomainsList();
    
    console.log('✅ Domain added to blocklist:', domain);
    alert(`Domain "${domain}" has been added to blocklist`);
  } catch (error) {
    console.error('❌ Error adding domain to block:', error);
    alert('Failed to add domain to blocklist');
  }
}

// Unblock Domain
async function unblockDomain(domain) {
  if (!confirm(`Are you sure you want to unblock "${domain}"?`)) {
    return;
  }
  
  try {
    // Remove from user blocked domains
    userBlockedDomains = userBlockedDomains.filter(d => d !== domain);
    
    await chrome.storage.local.set({
      userBlockedDomains: userBlockedDomains
    });
    
    // Refresh list
    updateStatsDisplay();
    updateBlockedDomainsList();
    
    console.log('✅ Domain unblocked:', domain);
    alert(`Domain "${domain}" has been unblocked`);
  } catch (error) {
    console.error('❌ Error unblocking domain:', error);
    alert('Failed to unblock domain');
  }
}

// Export Blocked List
function exportBlockedList() {
  if (allBlockedDomains.length === 0) {
    alert('No blocked domains to export');
    return;
  }
  
  // Create CSV content
  const headers = ['Domain', 'Category', 'Blocked At', 'Source Website'];
  const csvContent = [
    headers.join(','),
    ...allBlockedDomains.map(domain => [
      domain.domain,
      domain.category,
      new Date(domain.blockedAt).toISOString(),
      domain.sourceWebsite
    ].join(','))
  ].join('\n');
  
  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blocked-domains-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ Blocked domains exported');
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
  
  // Update every 3 seconds
  updateInterval = setInterval(() => {
    loadBlockedDomains();
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
  document.addEventListener('DOMContentLoaded', initBlockedPage);
} else {
  initBlockedPage();
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopAutoRefresh);

console.log('✅ Blocked Domains script loaded');
