class PrivacyNotificationManager {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
        this.notificationDuration = 5000;
        this.settings = {
            enabled: true,
            showTrackers: true,
            showAds: true,
            showSync: true,
            showScore: true,
            showSummary: false
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.setupNotificationStyles();
    }

    async loadSettings() {
        try {
            const storedSettings = await chrome.storage.local.get(['notificationSettings']);
            if (storedSettings.notificationSettings) {
                this.settings = { ...this.settings, ...storedSettings.notificationSettings };
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    setupEventListeners() {
        // Listen for extension messages
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleExtensionMessage(message, sender);
        });

        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            this.handleStorageChanges(changes, namespace);
        });

        // Listen for tab updates
        if (chrome.tabs.onUpdated) {
            chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                if (changeInfo.status === 'complete') {
                    this.handleTabUpdate(tabId, tab);
                }
            });
        }

        // Listen for new blocked requests from background script
        if (chrome.declarativeNetRequest) {
            chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
                this.handleBlockedRequest(info);
            });
        }

        // Set up periodic notifications
        this.setupPeriodicNotifications();
    }

    setupNotificationStyles() {
        const styleId = 'privacy-notification-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .privacy-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
                pointer-events: none;
            }

            .privacy-notification {
                background: linear-gradient(135deg, #0f1620, #1a2332);
                border: 2px solid #00f0ff;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                pointer-events: auto;
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }

            .privacy-notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .privacy-notification.hide {
                transform: translateX(100%);
                opacity: 0;
                margin-bottom: 0;
                padding-top: 0;
                padding-bottom: 0;
                max-height: 0;
            }

            .privacy-notification.tracker {
                border-color: #ff6b6b;
                box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
            }

            .privacy-notification.ad {
                border-color: #ffc107;
                box-shadow: 0 4px 20px rgba(255, 193, 7, 0.3);
            }

            .privacy-notification.sync {
                border-color: #00ff9c;
                box-shadow: 0 4px 20px rgba(0, 255, 156, 0.3);
            }

            .privacy-notification.score {
                border-color: #00f0ff;
                box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
            }

            .notification-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }

            .notification-icon {
                font-size: 20px;
                flex-shrink: 0;
            }

            .notification-title {
                font-weight: bold;
                color: #e4f1f1;
                font-size: 14px;
            }

            .notification-message {
                color: #9fb3c8;
                font-size: 13px;
                line-height: 1.4;
                margin-bottom: 8px;
            }

            .notification-time {
                color: #1e2a38;
                font-size: 11px;
                text-align: right;
            }

            .notification-close {
                position: absolute;
                top: 5px;
                right: 5px;
                background: none;
                border: none;
                color: #9fb3c8;
                cursor: pointer;
                font-size: 14px;
                padding: 2px;
                opacity: 0.6;
                transition: opacity 0.2s;
            }

            .notification-close:hover {
                opacity: 1;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: #00f0ff;
                transition: width linear;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    handleExtensionMessage(message, sender) {
        switch (message.action) {
            case 'trackerBlocked':
                this.showTrackerNotification(message.data);
                break;
            case 'adBlocked':
                this.showAdNotification(message.data);
                break;
            case 'syncCompleted':
                this.showSyncNotification(message.data);
                break;
            case 'privacyScoreUpdated':
                this.showScoreNotification(message.data);
                break;
            case 'settingsUpdated':
                this.showSettingsNotification(message.data);
                break;
        }
    }

    handleStorageChanges(changes, namespace) {
        if (namespace === 'local') {
            if (changes.blockedCount) {
                const newValue = changes.blockedCount.newValue || 0;
                const oldValue = changes.blockedCount.oldValue || 0;
                if (newValue > oldValue) {
                    this.showMilestoneNotification('blocked', newValue);
                }
            }

            if (changes.prAIvacySettings) {
                this.showSettingsNotification(changes.prAIvacySettings.newValue);
            }

            if (changes.privacyScoreHistory) {
                const newHistory = changes.privacyScoreHistory.newValue || [];
                if (newHistory.length > 0) {
                    const latestScore = newHistory[newHistory.length - 1];
                    if (latestScore.score >= 90) {
                        this.showAchievementNotification('Excellent Privacy', 'Your privacy score reached Excellent!');
                    }
                }
            }
        }
    }

    handleTabUpdate(tabId, tab) {
        // Check if this is a high-risk site
        if (tab.url) {
            const domain = new URL(tab.url).hostname;
            if (this.isHighRiskDomain(domain)) {
                this.showHighRiskSiteNotification(domain, tab.url);
            }
        }
    }

    handleBlockedRequest(info) {
        const url = info.request.url;
        const hostname = new URL(url).hostname;

        if (this.isTracker(hostname)) {
            this.showTrackerNotification({ 
                domain: hostname, 
                url: url, 
                tabId: info.tabId 
            });
        } else if (this.isAdvertisement(hostname)) {
            this.showAdNotification({ 
                domain: hostname, 
                url: url, 
                tabId: info.tabId 
            });
        }
    }

    showTrackerNotification(data) {
        if (!this.settings.enabled || !this.settings.showTrackers) return;

        this.showNotification({
            type: 'tracker',
            icon: '🚫',
            title: 'Tracker Blocked',
            message: `Blocked tracker from ${data.domain}`,
            data: data,
            duration: 4000
        });
    }

    showAdNotification(data) {
        if (!this.settings.enabled || !this.settings.showAds) return;

        this.showNotification({
            type: 'ad',
            icon: '🛑',
            title: 'Advertisement Blocked',
            message: `Blocked ad from ${data.domain}`,
            data: data,
            duration: 3000
        });
    }

    showSyncNotification(data) {
        if (!this.settings.enabled || !this.settings.showSync) return;

        this.showNotification({
            type: 'sync',
            icon: '🔄',
            title: 'Sync Completed',
            message: data.success ? 'Data synchronized successfully' : 'Sync completed with some issues',
            data: data,
            duration: 5000
        });
    }

    showScoreNotification(data) {
        if (!this.settings.enabled || !this.settings.showScore) return;

        const scoreEngine = window.privacyScoreEngine;
        if (scoreEngine) {
            const level = scoreEngine.getPrivacyLevel(data.score);
            const color = scoreEngine.getPrivacyColor(data.score);

            this.showNotification({
                type: 'score',
                icon: '📊',
                title: 'Privacy Score Updated',
                message: `Your privacy score is ${data.score}% (${level})`,
                data: data,
                duration: 6000
            });
        }
    }

    showSettingsNotification(data) {
        if (!this.settings.enabled || !this.settings.showSummary) return;

        const blockingLevel = data.blockingLevel || 'moderate';
        const levelText = blockingLevel.charAt(0).toUpperCase() + blockingLevel.slice(1);

        this.showNotification({
            type: 'settings',
            icon: '⚙️',
            title: 'Settings Updated',
            message: `Blocking level set to ${levelText}`,
            data: data,
            duration: 4000
        });
    }

    showMilestoneNotification(type, count) {
        if (!this.settings.enabled) return;

        const milestones = [100, 500, 1000, 5000, 10000];
        if (milestones.includes(count)) {
            this.showNotification({
                type: 'milestone',
                icon: '🎉',
                title: 'Milestone Reached!',
                message: `Blocked ${count.toLocaleString()} ${type} items!`,
                data: { type, count },
                duration: 8000
            });
        }
    }

    showAchievementNotification(title, message) {
        if (!this.settings.enabled) return;

        this.showNotification({
            type: 'achievement',
            icon: '🏆',
            title: title,
            message: message,
            data: {},
            duration: 10000
        });
    }

    showHighRiskSiteNotification(domain, url) {
        if (!this.settings.enabled) return;

        // Only show once per session per domain
        const sessionKey = `highrisk_${domain}`;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, 'true');

        this.showNotification({
            type: 'warning',
            icon: '⚠️',
            title: 'High-Risk Site Detected',
            message: `${domain} is known for tracking. Be cautious.`,
            data: { domain, url },
            duration: 8000
        });
    }

    showNotification(config) {
        const notification = this.createNotificationElement(config);
        this.addNotificationToContainer(notification);
        this.animateNotificationIn(notification);
        this.scheduleNotificationRemoval(notification, config.duration || this.notificationDuration);
    }

    createNotificationElement(config) {
        const notification = document.createElement('div');
        notification.className = `privacy-notification ${config.type || 'default'}`;
        
        notification.innerHTML = `
            <button class="notification-close" aria-label="Close">×</button>
            <div class="notification-header">
                <span class="notification-icon">${config.icon || 'ℹ️'}</span>
                <span class="notification-title">${config.title || 'Notification'}</span>
            </div>
            <div class="notification-message">${config.message}</div>
            <div class="notification-time">${this.formatTime(new Date())}</div>
            <div class="notification-progress"></div>
        `;

        // Add click handler
        notification.addEventListener('click', (e) => {
            if (!e.target.classList.contains('notification-close')) {
                this.handleNotificationClick(notification, config);
            }
        });

        // Add close button handler
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeNotification(notification);
        });

        // Store notification data
        notification.notificationData = config;
        notification.createdAt = Date.now();

        return notification;
    }

    addNotificationToContainer(notification) {
        let container = document.querySelector('.privacy-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'privacy-notification-container';
            document.body.appendChild(container);
        }

        // Remove excess notifications
        while (container.children.length >= this.maxNotifications) {
            this.removeNotification(container.firstChild);
        }

        container.appendChild(notification);
        this.notifications.push(notification);
    }

    animateNotificationIn(notification) {
        setTimeout(() => {
            notification.classList.add('show');
            this.startProgressBar(notification);
        }, 50);
    }

    startProgressBar(notification) {
        const progressBar = notification.querySelector('.notification-progress');
        if (!progressBar) return;

        const duration = notification.notificationData.duration || this.notificationDuration;
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '100%';

        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 50);
    }

    scheduleNotificationRemoval(notification, duration) {
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
    }

    removeNotification(notification) {
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }

            // Remove container if empty
            const container = document.querySelector('.privacy-notification-container');
            if (container && container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }

    handleNotificationClick(notification, config) {
        const data = config.data || {};

        // Handle different notification types
        switch (config.type) {
            case 'tracker':
            case 'ad':
                this.showDomainDetails(data.domain);
                break;
            case 'sync':
                this.showSyncDetails();
                break;
            case 'score':
                this.showPrivacyReport();
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'warning':
                this.showWarningDetails(data);
                break;
        }

        // Remove notification on click
        this.removeNotification(notification);
    }

    showDomainDetails(domain) {
        // Navigate to blocked domains page and filter by domain
        chrome.tabs.create({
            url: chrome.runtime.getURL('blocked.html') + `?domain=${domain}`
        });
    }

    showSyncDetails() {
        // Navigate to settings page and scroll to sync section
        chrome.tabs.create({
            url: chrome.runtime.getURL('settings.html') + '#sync'
        });
    }

    showPrivacyReport() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('report.html')
        });
    }

    showSettings() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('settings.html')
        });
    }

    showWarningDetails(data) {
        if (data.url) {
            chrome.tabs.create({ url: data.url });
        }
    }

    setupPeriodicNotifications() {
        // Show periodic privacy summaries
        setInterval(async () => {
            if (this.settings.showSummary) {
                await this.showPrivacySummary();
            }
        }, 30 * 60 * 1000); // Every 30 minutes
    }

    async showPrivacySummary() {
        try {
            const data = await chrome.storage.local.get([
                'blockedCount', 'adCount', 'trackerCount'
            ]);

            const total = (data.blockedCount || 0) + (data.adCount || 0) + (data.trackerCount || 0);
            
            if (total > 0) {
                this.showNotification({
                    type: 'summary',
                    icon: '📋',
                    title: 'Privacy Summary',
                    message: `Protected you from ${total} threats in the last 30 minutes`,
                    data: { total, stats: data },
                    duration: 7000
                });
            }
        } catch (error) {
            console.error('Error showing privacy summary:', error);
        }
    }

    isTracker(hostname) {
        const trackerKeywords = ['analytics', 'tracking', 'pixel', 'tracker', 'doubleclick', 'google-analytics'];
        return trackerKeywords.some(keyword => hostname.includes(keyword));
    }

    isAdvertisement(hostname) {
        const adKeywords = ['ads', 'advertisement', 'doubleclick', 'googlesyndication', 'adnxs'];
        return adKeywords.some(keyword => hostname.includes(keyword));
    }

    isHighRiskDomain(hostname) {
        const highRiskDomains = [
            'facebook.com', 'instagram.com', 'tiktok.com', 
            'twitter.com', 'youtube.com', 'google.com'
        ];
        return highRiskDomains.some(domain => hostname.includes(domain));
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        chrome.storage.local.set({ notificationSettings: this.settings });
    }

    clearAllNotifications() {
        const container = document.querySelector('.privacy-notification-container');
        if (container) {
            container.remove();
        }
        this.notifications = [];
    }

    getNotificationHistory() {
        return this.notifications.map(n => n.notificationData);
    }
}

// Initialize notification manager
window.privacyNotificationManager = new PrivacyNotificationManager();