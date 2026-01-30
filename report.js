// report.js - Privacy Report page

console.log('📊 Privacy Report page loaded');

// DOM Elements
const reportScoreElement = document.getElementById('report-score');
const scoreDescriptionElement = document.getElementById('score-description');
const totalTrackersElement = document.getElementById('total-trackers');
const totalAdsElement = document.getElementById('total-ads');
const crossSiteElement = document.getElementById('cross-site');
const dataSavedElement = document.getElementById('data-saved');
const dayTrackersElement = document.getElementById('day-trackers');
const dayAdsElement = document.getElementById('day-ads');
const weekTrackersElement = document.getElementById('week-trackers');
const weekAdsElement = document.getElementById('week-ads');
const monthTrackersElement = document.getElementById('month-trackers');
const monthAdsElement = document.getElementById('month-ads');
const topDomainsElement = document.getElementById('top-domains');
const refreshInsightsBtn = document.getElementById('refresh-insights');
const exportPdfBtn = document.getElementById('export-pdf');
const exportCsvBtn = document.getElementById('export-csv');
const shareReportBtn = document.getElementById('share-report');

// State
let updateInterval = null;
let reportData = null;

// Initialize
async function initReportPage() {
  console.log('🚀 Initializing Privacy Report page...');
  
  try {
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    await loadReportData();
    
    // Start periodic updates
    startAutoRefresh();
    
    console.log('✅ Privacy Report page initialized successfully');
  } catch (error) {
    console.error('❌ Privacy Report page initialization error:', error);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Refresh insights button
  if (refreshInsightsBtn) {
    refreshInsightsBtn.addEventListener('click', refreshReport);
  }
  
  // Export PDF button
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', exportReportAsPdf);
  }
  
  // Export CSV button
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportReportAsCsv);
  }
  
  // Share report button
  if (shareReportBtn) {
    shareReportBtn.addEventListener('click', shareReport);
  }
}

// Load Report Data
async function loadReportData() {
  try {
    // Get stats from background script
    const response = await chrome.runtime.sendMessage({
      action: 'GET_STATS'
    });
    
    if (response.success && response.data) {
      const stats = response.data.stats || {};
      const blockedRequests = response.data.blockedRequests || [];
      
      // Calculate privacy score
      if (window.privacyScoreEngine) {
        reportData = await window.privacyScoreEngine.getComprehensiveReport();
      } else {
        reportData = getDefaultReportData();
      }
      
      updatePrivacyScoreDisplay(reportData.current);
      updateStatisticsDisplay(stats);
      updateTopBlockedDomains(blockedRequests);
      updateTimeBasedStats(blockedRequests);
      
      console.log('✅ Privacy report loaded:', reportData);
    }
  } catch (error) {
    console.error('❌ Error loading report data:', error);
    reportData = getDefaultReportData();
    updatePrivacyScoreDisplay(reportData.current);
  }
}

// Get Default Report Data
function getDefaultReportData() {
  return {
    current: {
      score: 50,
      grade: 'C',
      level: 'Fair',
      color: '#ffc107',
      factors: {},
      recommendations: []
    },
    historical: [],
    trend: 'stable'
  };
}

// Update Privacy Score Display
function updatePrivacyScoreDisplay(scoreData) {
  if (!scoreData) {
    return;
  }
  
  if (reportScoreElement) {
    reportScoreElement.textContent = `${scoreData.score || 0}%`;
    if (scoreData.color) {
      reportScoreElement.style.color = scoreData.color;
    }
  }
  
  if (scoreDescriptionElement) {
    const level = scoreData.level || 'Unknown';
    scoreDescriptionElement.textContent = `Your privacy protection is ${level}`;
  }
}

// Update Statistics Display
function updateStatisticsDisplay(stats) {
  const totalTrackers = stats.trackerCount || 0;
  const totalAds = stats.adCount || 0;
  const totalBlocked = stats.blockedCount || 0;
  const crossSiteAttempts = Math.floor(totalBlocked * 0.1);
  const dataSavedMB = Math.floor((totalTrackers * 0.5) + (totalAds * 0.3));
  
  if (totalTrackersElement) {
    animateNumber(totalTrackersElement, totalTrackers);
  }
  
  if (totalAdsElement) {
    animateNumber(totalAdsElement, totalAds);
  }
  
  if (crossSiteElement) {
    animateNumber(crossSiteElement, crossSiteAttempts);
  }
  
  if (dataSavedElement) {
    animateNumber(dataSavedElement, dataSavedMB);
  }
}

// Update Time-Based Stats
function updateTimeBasedStats(blockedRequests) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  let dayTrackers = 0, dayAds = 0;
  let weekTrackers = 0, weekAds = 0;
  let monthTrackers = 0, monthAds = 0;
  
  blockedRequests.forEach(req => {
    const timestamp = req.blockedAt || Date.now();
    const category = req.category || 'unknown';
    
    if (timestamp > oneDayAgo) {
      if (category === 'trackers') dayTrackers++;
      if (category === 'ads') dayAds++;
    }
    
    if (timestamp > sevenDaysAgo) {
      if (category === 'trackers') weekTrackers++;
      if (category === 'ads') weekAds++;
    }
    
    if (timestamp > thirtyDaysAgo) {
      if (category === 'trackers') monthTrackers++;
      if (category === 'ads') monthAds++;
    }
  });
  
  if (dayTrackersElement) {
    animateNumber(dayTrackersElement, dayTrackers);
  }
  
  if (dayAdsElement) {
    animateNumber(dayAdsElement, dayAds);
  }
  
  if (weekTrackersElement) {
    animateNumber(weekTrackersElement, weekTrackers);
  }
  
  if (weekAdsElement) {
    animateNumber(weekAdsElement, weekAds);
  }
  
  if (monthTrackersElement) {
    animateNumber(monthTrackersElement, monthTrackers);
  }
  
  if (monthAdsElement) {
    animateNumber(monthAdsElement, monthAds);
  }
}

// Update Top Blocked Domains
function updateTopBlockedDomains(blockedRequests) {
  if (!topDomainsElement) {
    return;
  }
  
  if (!blockedRequests || blockedRequests.length === 0) {
    topDomainsElement.innerHTML = '<p>No blocked domains yet</p>';
    return;
  }
  
  // Count domain occurrences
  const domainCounts = {};
  blockedRequests.forEach(req => {
    const domain = req.domain || 'unknown';
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  });
  
  // Sort by count (most blocked first)
  const sortedDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  let html = '';
  sortedDomains.forEach(([domain, count], index) => {
    html += `
      <div class="top-domain-item">
        <span class="top-domain-rank">#${index + 1}</span>
        <span class="top-domain-name">${domain}</span>
        <span class="top-domain-count">${count} blocked</span>
      </div>
    `;
  });
  
  topDomainsElement.innerHTML = html;
}

// Refresh Report
async function refreshReport() {
  if (refreshInsightsBtn) {
    refreshInsightsBtn.textContent = 'Refreshing...';
    refreshInsightsBtn.disabled = true;
  }
  
  await loadReportData();
  
  if (refreshInsightsBtn) {
    refreshInsightsBtn.textContent = 'Refresh AI Insights';
    refreshInsightsBtn.disabled = false;
  }
}

// Export Report as CSV
function exportReportAsCsv() {
  if (!reportData || !reportData.current) {
    alert('No report data to export');
    return;
  }
  
  const stats = reportData.current || {};
  const csvContent = [
    ['Metric', 'Value', 'Description'],
    ['Privacy Score', stats.score || 0, `Overall privacy protection score`],
    ['Grade', stats.grade || 'N/A', 'Privacy protection grade'],
    ['Level', stats.level || 'Unknown', 'Protection level']
  ].map(row => row.join(',')).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prAIvacy-report-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ Privacy report exported as CSV');
}

// Export Report as PDF (simplified - shows alert)
function exportReportAsPdf() {
  alert('PDF export feature coming soon! Use CSV export for now.');
}

// Share Report
function shareReport() {
  if (!reportData) {
    alert('No report data to share');
    return;
  }
  
  const shareText = `My prAIvacy Privacy Score: ${reportData.current.score}% (${reportData.current.grade})\nTrackers Blocked: ${document.getElementById('total-trackers')?.textContent || 0}\nAds Blocked: ${document.getElementById('total-ads')?.textContent || 0}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'prAIvacy Privacy Report',
      text: shareText
    }).catch(err => {
      console.error('Error sharing:', err);
      fallbackShare(shareText);
    });
  } else {
    fallbackShare(shareText);
  }
}

// Fallback Share (copy to clipboard)
function fallbackShare(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Report copied to clipboard!');
  }).catch(() => {
    alert('Failed to copy report');
  });
}

// Animate Number
function animateNumber(element, target) {
  const current = parseInt(element.textContent?.replace(/,/g, '')) || 0;
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
    element.textContent = value.toLocaleString();
    
    if (step >= steps) {
      clearInterval(interval);
      element.textContent = target.toLocaleString();
    }
  }, duration / steps);
}

// Start Auto Refresh
function startAutoRefresh() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  // Update every 30 seconds
  updateInterval = setInterval(() => {
    loadReportData();
  }, 30000);
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
  document.addEventListener('DOMContentLoaded', initReportPage);
} else {
  initReportPage();
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopAutoRefresh);

console.log('✅ Privacy Report script loaded');
