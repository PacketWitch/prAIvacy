// Test data generator for prAIvacy dashboard
(async function() {
    console.log('Adding test data to IndexedDB...');
    
    if (window.praivacyDB) {
        await window.praivacyDB.init();
        
        // Add some test visited domains
        const testVisited = [
            { domain: 'google.com', visitCount: 15, lastSeen: Date.now() - 1000 * 60 * 2, firstSeen: Date.now() - 1000 * 60 * 60 },
            { domain: 'facebook.com', visitCount: 8, lastSeen: Date.now() - 1000 * 60 * 5, firstSeen: Date.now() - 1000 * 60 * 30 },
            { domain: 'youtube.com', visitCount: 12, lastSeen: Date.now() - 1000 * 60 * 10, firstSeen: Date.now() - 1000 * 60 * 45 },
            { domain: 'twitter.com', visitCount: 6, lastSeen: Date.now() - 1000 * 60 * 15, firstSeen: Date.now() - 1000 * 60 * 20 },
            { domain: 'github.com', visitCount: 3, lastSeen: Date.now() - 1000 * 60 * 30, firstSeen: Date.now() - 1000 * 60 * 60 * 2 }
        ];
        
        for (const domain of testVisited) {
            await window.praivacyDB.logVisitedDomain(domain.domain);
            // Manually update visit count
            const database = await window.praivacyDB.init();
            const tx = database.transaction(['visited_domains'], 'readwrite');
            const store = tx.objectStore('visited_domains');
            const getReq = store.get(domain.domain);
            getReq.onsuccess = () => {
                const existing = getReq.result;
                if (existing) {
                    existing.visitCount = domain.visitCount;
                    existing.lastSeen = domain.lastSeen;
                    existing.firstSeen = domain.firstSeen;
                    store.put(existing);
                }
            };
        }
        
        // Add some test blocked domains
        await window.praivacyDB.logBlockedDomain('doubleclick.net', 'ads', 'blocker');
        await window.praivacyDB.logBlockedDomain('google-analytics.com', 'trackers', 'blocker');
        await window.praivacyDB.logBlockedDomain('facebook.com', 'trackers', 'blocker');
        await window.praivacyDB.logBlockedDomain('googlesyndication.com', 'ads', 'blocker');
        
        // Update global stats
        const database = await window.praivacyDB.init();
        const tx = database.transaction(['stats'], 'readwrite');
        const store = tx.objectStore('stats');
        store.put({
            key: 'global',
            totalVisited: 44,
            totalBlocked: 4,
            totalAds: 2,
            totalTrackers: 2,
            protectionEnabled: true,
            lastToggled: Date.now() - 1000 * 60 * 60
        });
        
        console.log('Test data added successfully!');
        console.log('Refresh the dashboard to see the data.');
    } else {
        console.error('praivacyDB not available');
    }
})();