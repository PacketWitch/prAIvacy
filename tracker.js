// tracker.js - Real-time tracker detection and blocking

console.log('🔍 Tracker Detection Manager loaded');

class TrackerManager {
  constructor() {
    this.isDetecting = false;
    this.stats = {
      scriptsScanned: 0,
      trackersFound: 0,
      cookiesBlocked: 0,
      fingerprintingBlocked: 0
    };
    this.detectionRules = this.initDetectionRules();
    this.init();
  }

  initDetectionRules() {
    return {
      // Analytics trackers
      analytics: [
        'google-analytics.com',
        'analytics.google.com',
        'googletagmanager.com',
        'mixpanel.com',
        'segment.com',
        'chartbeat.com',
        'hotjar.com',
        'fullstory.com',
        'clarity.ms'
      ],
      // Social media trackers
      social: [
        'facebook.com/tr',
        'connect.facebook.net',
        'pixel.facebook.com',
        'twitter.com/i/js',
        'linkedin.com/li/track',
        'instagram.com/static'
      ],
      // Ad trackers
      advertising: [
        'doubleclick.net',
        'googlesyndication.com',
        'googleadservices.com',
        'amazon-adsystem.com',
        'taboola.com',
        'outbrain.com',
        'rubiconproject.com',
        'criteo.com',
        'indexww.com'
      ]
    };
  }

  init() {
    console.log('🚀 Initializing Tracker Manager...');
    this.setupEventListeners();
    this.startDetection();
  }

  setupEventListeners() {
    const toggle = document.getElementById('detection-toggle');
    const statusLabel = document.getElementById('detection-status');
    
    if (toggle && statusLabel) {
      toggle.addEventListener('change', async (e) => {
        const isDetecting = e.target.checked;
        
        if (isDetecting) {
          statusLabel.textContent = 'Detecting';
          statusLabel.className = 'power-label';
          await this.enableDetection();
        } else {
          statusLabel.textContent = 'Disabled';
          statusLabel.className = 'power-label disabled';
          await this.disableDetection();
        }
      });
    }
  }

  async enableDetection() {
    this.isDetecting = true;
    console.log('🔍 Tracker detection enabled');
    await this.performDetection();
  }

  async disableDetection() {
    this.isDetecting = false;
    console.log('⚠ Tracker detection disabled');
  }

  startDetection() {
    if (!this.isDetecting) return;
    
    // Scan page for trackers
    this.scanPageTrackers();
    
    // Monitor new script loading
    this.monitorScriptLoading();
    
    // Monitor network requests (if possible)
    this.monitorNetworkRequests();
  }

  scanPageTrackers() {
    console.log('🔍 Scanning page for existing trackers...');
    
    let trackersFound = 0;
    const foundTrackers = new Set();
    
    // Check for common tracker patterns
    this.detectionRules.analytics.forEach(domain => {
      if (window.ga || window._gaq || document.querySelector(`script[src*="${domain}"]`)) {
        foundTrackers.add(`Analytics: ${domain}`);
        trackersFound++;
      }
    });

    this.detectionRules.social.forEach(domain => {
      if (window.fbq || document.querySelector(`script[src*="${domain}"]`)) {
        foundTrackers.add(`Social: ${domain}`);
        trackersFound++;
      }
    });

    this.detectionRules.advertising.forEach(domain => {
      if (document.querySelector(`iframe[src*="${domain}"]`)) {
        foundTrackers.add(`Advertising: ${domain}`);
        trackersFound++;
      }
    });

    this.updateDetectionUI(foundTrackers, trackersFound);
  }

  monitorScriptLoading() {
    const originalCreateElement = document.createElement;
    
    document.createElement = function(tagName, options) {
      const element = originalCreateElement.call(this, tagName, options);
      
      if (tagName.toLowerCase() === 'script' && window.trackerManager) {
        element.addEventListener('load', () => {
          window.trackerManager.analyzeScript(element);
        });
      }
      
      return element;
    };
  }

  analyzeScript(scriptElement) {
    if (!this.isDetecting) return;
    
    const src = scriptElement.src || '';
    const content = scriptElement.textContent || '';
    
    this.stats.scriptsScanned++;
    
    // Check against known tracker patterns
    this.detectionRules.analytics.forEach(domain => {
      if (src.includes(domain) || content.includes(domain)) {
        this.stats.trackersFound++;
        console.log(`🎯 Analytics tracker detected: ${domain}`);
        this.updateTrackerList('analytics', domain, 'detected');
      }
    });
  }

  monitorNetworkRequests() {
    // Try to intercept fetch requests
    if (typeof fetch !== 'undefined') {
      const originalFetch = window.fetch;
      
      window.fetch = function(...args) {
        const url = args[0];
        
        if (window.trackerManager && window.trackerManager.isDetecting) {
          window.trackerManager.analyzeFetchRequest(url);
        }
        
        return originalFetch.apply(this, args);
      };
    }
  }

  analyzeFetchRequest(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // Check if request is to known tracker domain
      this.detectionRules.analytics.forEach(trackerDomain => {
        if (domain.includes(trackerDomain)) {
          console.log(`🎯 Analytics request detected: ${domain}`);
          this.updateTrackerList('analytics', domain, 'detected');
        }
      });
    } catch (error) {
      console.log('Error analyzing request:', error);
    }
  }

  updateDetectionUI(foundTrackers, trackersFound) {
    // Update scan stats
    document.getElementById('scripts-scanned').textContent = this.stats.scriptsScanned;
    document.getElementById('trackers-found').textContent = trackersFound;
    
    // Update tracker lists
    const socialTrackers = document.getElementById('social-trackers');
    const analyticsTrackers = document.getElementById('analytics-trackers');
    const adTrackers = document.getElementById('ad-trackers');
    
    if (socialTrackers) {
      socialTrackers.innerHTML = '';
      foundTrackers.forEach(tracker => {
        if (tracker.includes('Social:')) {
          const div = document.createElement('div');
          div.className = 'tracker-item';
          div.innerHTML = `
            <span class="tracker-name">${tracker.replace('Social: ', '')}</span>
            <span class="tracker-status detected">Detected</span>
          `;
          socialTrackers.appendChild(div);
        }
      });
    }
  }

  updateTrackerList(category, domain, status) {
    // Send to background script for consistent tracking
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'TRACKER_DETECTED',
        data: {
          category,
          domain,
          status,
          timestamp: Date.now(),
          url: window.location.href
        }
      });
    }
  }

  async performDetection() {
    if (!this.isDetecting) return;
    
    console.log('🔍 Performing comprehensive tracker detection...');
    
    // Scan current page
    this.scanPageTrackers();
    
    // Wait a bit and scan again (for dynamically loaded content)
    setTimeout(() => {
      this.scanPageTrackers();
      this.updateFeed();
    }, 2000);
  }

  updateFeed() {
    const feed = document.getElementById('tracker-feed');
    if (!feed) return;
    
    // Get recent tracker activity from background
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'GET_RECENT_TRACKERS' }, (response) => {
        if (response && response.success) {
          this.displayRecentActivity(response.data, feed);
        }
      });
    }
  }

  displayRecentActivity(activities, feedElement) {
    if (!activities || activities.length === 0) {
      feedElement.innerHTML = '<div class="loading">No recent tracker activity detected</div>';
      return;
    }
    
    feedElement.innerHTML = '';
    activities.slice(-10).reverse().forEach(activity => {
      const div = document.createElement('div');
      div.className = 'activity-item';
      div.innerHTML = `
        <div class="activity-header">
          <span class="activity-type ${activity.category}">${activity.category.toUpperCase()}</span>
          <span class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="activity-details">
          <strong>${activity.domain}</strong>
          <span class="activity-status ${activity.status}">${activity.status}</span>
        </div>
      `;
      feedElement.appendChild(div);
    });
  }
}

// VISITED DOMAINS MANAGER
class VisitedDomainsManager {
  constructor() {
    this.visitedDomains = [];
    this.init();
  }

  init() {
    console.log('🌐 Initializing Visited Domains Manager...');
    this.loadVisitedDomains();
    
    // Check for new data every 500ms
    setInterval(() => this.checkForNewData(), 500);
  }

  async checkForNewData() {
    try {
      const data = await chrome.storage.local.get(['visitedDomains']);
      const currentVisited = data.visitedDomains || [];

      if (currentVisited.length !== this.previousVisitedCount) {
        console.log('🔄 New visited domains detected!');
        this.previousVisitedCount = currentVisited.length;
        this.visitedDomains = currentVisited;
        this.renderVisitedDomainsList(currentVisited);
      }
    } catch (error) {
      console.error('⚠️ Update check failed:', error);
    }
  }

  async loadVisitedDomains() {
    try {
      const data = await chrome.storage.local.get(['visitedDomains']);
      this.visitedDomains = data.visitedDomains || [];
      this.previousVisitedCount = this.visitedDomains.length;

      console.log('📦 Loaded visited domains:', this.visitedDomains.length);
      this.renderVisitedDomainsList(this.visitedDomains);
    } catch (error) {
      console.error('❌ Load failed:', error);
    }
  }

  renderVisitedDomainsList(visitedDomains) {
    const container = document.getElementById('visited-domains-list');
    if (!container) return;

    console.log('🎨 Rendering visited domains:', visitedDomains.length);

    if (visitedDomains.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <p>No visited domains yet. Start browsing!</p>
        </div>
      `;
      return;
    }

    // Sort by last visited (most recent first)
    const sortedDomains = [...visitedDomains].sort((a, b) => b.lastVisited - a.lastVisited);

    container.innerHTML = sortedDomains.slice(0, 10).map((domain, index) => {
      const lastVisited = new Date(domain.lastVisited);
      const timeAgo = this.getTimeAgo(domain.lastVisited);

      return `
        <div class="visited-domain-item" style="animation: slideIn 0.5s ease;">
          <div class="domain-main">
            <div class="domain-info">
              <span class="domain-name">${domain.domain}</span>
              <span class="domain-badge visits">${domain.visitCount} visits</span>
            </div>
            <div class="domain-actions">
              <span class="domain-time">${timeAgo}</span>
            </div>
          </div>
          <div class="domain-details">
            <span class="domain-title">${domain.title || 'Unknown Title'}</span>
          </div>
        </div>
      `;
    }).join('');

    console.log('✅ Visited domains rendered!');
  }

  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 Tracker Detection page loaded');
  window.trackerManager = new TrackerManager();
  window.visitedManager = new VisitedDomainsManager();
});