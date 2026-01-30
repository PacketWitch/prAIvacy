// REAL-TIME Tracker Detection - Console Data Sync

class ConsoleSyncTracker {
  constructor() {
    this.blockedRequests = [];
    this.lastBlockedCount = 0;
    this.pollCount = 0;
    this.init();
  }

  init() {
    console.log('🚀 Initializing Console Sync Tracker...');
    this.loadBlockedRequests();
    this.setupEventListeners();
    
    // 🔥 AGGRESSIVE POLLING: Check every 500ms
    setInterval(() => this.checkForConsoleData(), 500);
    
    // Also force refresh every 3 seconds
    setInterval(() => this.forceRefresh(), 3000);
    
    // Add status indicator
    this.addStatusIndicator();
  }

  addStatusIndicator() {
    const status = document.createElement('div');
    status.id = 'sync-status';
    status.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: #000;
      color: #00ff00;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      z-index: 9999;
      font-family: monospace;
      border: 1px solid #00ff00;
    `;
    status.textContent = 'SYNCING';
    
    document.body.appendChild(status);
    
    // Update status with animation
    setInterval(() => {
      status.textContent = `SYNC #${this.pollCount}`;
    }, 1000);
  }

  async checkForConsoleData() {
    this.pollCount++;
    
    try {
      // Get LATEST data from chrome.storage
      const data = await chrome.storage.local.get([
        'blockedRequests', 
        'blockedCount', 
        'trackerCount', 
        'adCount'
      ]);

      const currentRequests = data.blockedRequests || [];
      const currentBlocked = data.blockedCount || 0;
      
      console.log(`🔍 Check #${this.pollCount}:`, {
        requests: currentRequests.length,
        blocked: currentBlocked,
        lastUpdate: new Date().toLocaleTimeString()
      });

      // Check if we have NEW data
      if (currentRequests.length !== this.blockedRequests.length || 
          currentBlocked !== this.lastBlockedCount) {
        
        console.log('🔄 REAL CHANGE DETECTED! Updating UI...');
        
        this.blockedRequests = currentRequests;
        this.lastBlockedCount = currentBlocked;
        
        // Update UI immediately with REAL data
        this.updateUIWithData(data);
        
        // Show visual feedback
        this.showUpdateFeedback();
        
      } else {
        console.log('📝 No changes detected');
      }
      
    } catch (error) {
      console.error('⚠️ Check failed:', error);
    }
  }

  async forceRefresh() {
    console.log('🔄 Force refreshing data...');
    
    try {
      const data = await chrome.storage.local.get([
        'blockedRequests', 
        'blockedCount', 
        'trackerCount', 
        'adCount'
      ]);

      console.log('📊 Force refresh data:', {
        requests: (data.blockedRequests || []).length,
        blocked: data.blockedCount,
        trackers: data.trackerCount,
        ads: data.adCount
      });

      await this.updateUIWithData(data);
      this.showUpdateFeedback();
      
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
    }
  }

  async updateUIWithData(data) {
    const requests = data.blockedRequests || [];
    const blocked = data.blockedCount || 0;
    const trackers = data.trackerCount || 0;
    const ads = data.adCount || 0;
    
    console.log('🎨 Updating UI with REAL data:', {
      requests: requests.length,
      blocked: blocked,
      trackers: trackers,
      ads: ads
    });

    // Update stats immediately
    this.updateStatsImmediate(blocked, trackers, ads);
    
    // Update tracker list immediately
    this.renderTrackerListImmediate(requests);
  }

  updateStatsImmediate(blocked, trackers, ads) {
    console.log('📊 Updating stats immediately...');
    
    const totalEl = document.getElementById('total-blocked');
    const trackersEl = document.getElementById('total-trackers');
    const adsEl = document.getElementById('total-ads');
    
    // Update Total with immediate effect
    if (totalEl) {
      const oldValue = totalEl.textContent;
      totalEl.textContent = blocked.toLocaleString();
      totalEl.style.color = blocked > oldValue ? '#00ff9c' : '#00f0ff';
      totalEl.style.transform = 'scale(1.1)';
      setTimeout(() => {
        totalEl.style.transform = 'scale(1)';
        totalEl.style.color = '#e4f1f1';
      }, 500);
      console.log('✅ Total blocked updated to:', blocked);
    }
    
    // Update Trackers
    if (trackersEl) {
      trackersEl.textContent = trackers.toLocaleString();
      trackersEl.style.color = '#00f0ff';
      setTimeout(() => {
        trackersEl.style.color = '#e4f1f1';
      }, 500);
      console.log('✅ Trackers updated to:', trackers);
    }
    
    // Update Ads
    if (adsEl) {
      adsEl.textContent = ads.toLocaleString();
      adsEl.style.color = '#ff6b6b';
      setTimeout(() => {
        adsEl.style.color = '#e4f1f1';
      }, 500);
      console.log('✅ Ads updated to:', ads);
    }
  }

  renderTrackerListImmediate(requests) {
    const container = document.getElementById('recent-blocked');
    if (!container) {
      console.error('❌ recent-blocked container not found');
      return;
    }

    console.log('🎨 Rendering tracker list immediately:', requests.length);

    if (requests.length === 0) {
      this.showNoDataMessage();
      return;
    }

    // Group by domain for better display
    const domainGroups = this.groupByDomain(requests);
    
    // Clear and rebuild immediately
    container.innerHTML = '';
    
    const entries = Object.entries(domainGroups);
    console.log(`🗂️ Domain groups: ${entries.length} domains`);
    
    entries.forEach(([domain, domainRequests], index) => {
      const latest = domainRequests[0];
      const category = this.categorizeDomain(domain);
      const riskLevel = this.assessRisk(domain, category);
      
      const item = document.createElement('div');
      item.className = 'tracker-item';
      item.style.cssText = `
        background: #0f1620;
        border: 1px solid #1e2a38;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 12px;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
      `;
      
      item.innerHTML = `
        <div class="tracker-info">
          <span class="tracker-domain" style="color: #00f0ff; font-weight: bold; font-size: 16px; display: block; margin-bottom: 8px;">${domain}</span>
          <div style="display: flex; gap: 8px;">
            <span class="tracker-category" style="background: rgba(0, 240, 255, 0.2); color: #00f0ff; padding: 4px 8px; border-radius: 12px; font-size: 11px;">${category}</span>
            <span class="tracker-risk" style="background: rgba(255, 107, 107, 0.2); color: #ff6b6b; padding: 4px 8px; border-radius: 12px; font-size: 11px;">${riskLevel} Risk</span>
          </div>
        </div>
        <div class="tracker-details">
          <div class="tracker-stats" style="display: flex; gap: 15px; font-size: 12px; color: #9fb3c8;">
            <span><strong>${domainRequests.length}</strong> blocks</span>
            <span>${this.formatTime(latest.timestamp)}</span>
            <span>📍 ${latest.siteUrl}</span>
          </div>
        </div>
      `;
      
      container.appendChild(item);
      
      // Animate in
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, index * 50);
      
      console.log(`✅ Added tracker item: ${domain}`);
    });
    
    console.log('✅ Tracker list rendering complete!');
  }

  showUpdateFeedback() {
    // Create flash effect
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 255, 0, 0.1);
      pointer-events: none;
      z-index: 9998;
    `;
    
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.remove();
    }, 300);
  }

  groupByDomain(requests) {
    const groups = {};
    
    requests.forEach(request => {
      if (!groups[request.domain]) {
        groups[request.domain] = [];
      }
      groups[request.domain].push(request);
    });
    
    // Sort each group by timestamp (newest first)
    Object.keys(groups).forEach(domain => {
      groups[domain].sort((a, b) => b.timestamp - a.timestamp);
    });
    
    return groups;
  }

  categorizeDomain(domain) {
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('google') || domainLower.includes('analytics')) {
      return 'Analytics';
    } else if (domainLower.includes('facebook') || domainLower.includes('twitter') || 
               domainLower.includes('instagram') || domainLower.includes('linkedin')) {
      return 'Social Media';
    } else if (domainLower.includes('doubleclick') || domainLower.includes('ads') || 
               domainLower.includes('adnxs') || domainLower.includes('advertising')) {
      return 'Advertisement';
    } else if (domainLower.includes('track') || domainLower.includes('pixel') || 
               domainLower.includes('beacon') || domainLower.includes('fingerprint')) {
      return 'Tracking';
    } else {
      return 'Unknown';
    }
  }

  assessRisk(domain, category) {
    const highRiskCategories = ['Tracking', 'Analytics'];
    const mediumRiskCategories = ['Social Media'];
    
    if (highRiskCategories.includes(category)) {
      return 'High';
    } else if (mediumRiskCategories.includes(category)) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  async loadBlockedRequests() {
    console.log('📥 Initial load...');
    
    try {
      const data = await chrome.storage.local.get([
        'blockedRequests', 
        'blockedCount', 
        'trackerCount', 
        'adCount'
      ]);

      console.log('📦 Initial storage data:', data);

      this.blockedRequests = data.blockedRequests || [];
      this.lastBlockedCount = data.blockedCount || 0;
      
      // Update UI immediately with initial data
      await this.updateUIWithData(data);
      
    } catch (error) {
      console.error('❌ Initial load failed:', error);
      this.showErrorMessage();
    }
  }

  showNoDataMessage() {
    const container = document.getElementById('recent-blocked');
    if (container) {
      container.innerHTML = `
        <div class="no-data-message">
          <h3>🔍 No Real Tracking Activity Yet</h3>
          <p>Visit websites with trackers to see data!</p>
          <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="window.open('https://cnn.com', '_blank')">
              🌐 Visit CNN (has trackers)
            </button>
          </div>
          <div style="margin-top: 15px; font-size: 14px; color: #9fb3c8;">
            <strong>💡 This updates every 500ms!</strong><br>
            • Sync indicator shows poll count<br>
            • Numbers flash when changed<br>
            • Console shows exact same data as UI
          </div>
        </div>
      `;
    }
  }

  showErrorMessage() {
    const container = document.getElementById('recent-blocked');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h3>⚠️ Error Loading Data</h3>
          <p>Refresh the page to try again.</p>
        </div>
      `;
    }
  }

  setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Search functionality
    const searchInput = document.getElementById('tracker-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterTrackers(e.target.value);
      });
    }

    // Category filter
    const categoryFilter = document.getElementById('tracker-category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filterByCategory(e.target.value);
      });
    }

    // Clear history button
    const clearBtn = document.getElementById('clear-tracker-history');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearTrackerHistory());
    }
    
    console.log('✅ Event listeners setup complete');
  }

  filterTrackers(searchTerm) {
    const items = document.querySelectorAll('.tracker-item');
    const lowerSearch = searchTerm.toLowerCase();
    
    items.forEach(item => {
      const domain = item.querySelector('.tracker-domain').textContent.toLowerCase();
      item.style.display = domain.includes(lowerSearch) ? 'block' : 'none';
    });
  }

  filterByCategory(category) {
    const items = document.querySelectorAll('.tracker-item');
    
    items.forEach(item => {
      const categoryElement = item.querySelector('.tracker-category');
      if (!category || categoryElement.textContent === category) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  async clearTrackerHistory() {
    if (!confirm('Are you sure you want to clear all tracker history?')) {
      return;
    }
    
    try {
      await chrome.storage.local.set({
        blockedRequests: [],
        blockedCount: 0,
        trackerCount: 0,
        adCount: 0
      });
      
      this.blockedRequests = [];
      this.lastBlockedCount = 0;
      await this.updateUIWithData({
        blockedRequests: [],
        blockedCount: 0,
        trackerCount: 0,
        adCount: 0
      });
      
      console.log('✅ Tracker history cleared');
    } catch (error) {
      console.error('❌ Error clearing history:', error);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📋 DOM loaded - starting Console Sync Tracker');
  window.consoleSyncTracker = new ConsoleSyncTracker();
});