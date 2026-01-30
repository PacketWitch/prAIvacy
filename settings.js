class PrivacySettingsManager {
    constructor() {
        this.settings = {
            blockingLevel: 'moderate',
            privacyControls: {
                'block-ads': true,
                'block-trackers': true,
                'prevent-cross-site': true
            },
            advancedSettings: {
                'fingerprint-protection': true,
                'show-notifications': false,
                'auto-update': true
            }
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.updateUI();
    }

    async loadSettings() {
        try {
            if (!window.praivacyDB) {
                console.warn('IndexedDB not available, using default settings');
                return;
            }

            const database = await window.praivacyDB.init();
            const tx = database.transaction(['stats'], 'readonly');
            const store = tx.objectStore('stats');
                
            const req = store.get('settings');
            const result = await new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result || {});
                req.onerror = () => reject({});
            });
            
            if (result && result.settings) {
                this.settings = { ...this.settings, ...result.settings };
            }
        } catch (error) {
            console.error('Error loading settings from IndexedDB:', error);
        }
    }

    bindEvents() {
        const applyBtn = document.getElementById('apply-settings');
        const exportBtn = document.getElementById('export-data');
        const importBtn = document.getElementById('import-data');
        const resetBtn = document.getElementById('reset-data');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySettings());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSettings());
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importSettings());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
    }

    updateUI() {
        // Update blocking level radio
        const levelInput = document.querySelector(`input[name="blocking-level"][value="${this.settings.blockingLevel}"]`);
        if (levelInput) {
            levelInput.checked = true;
        }

        // Update privacy control toggles
        Object.keys(this.settings.privacyControls).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = this.settings.privacyControls[key];
            }
        });

        // Update advanced settings toggles
        Object.keys(this.settings.advancedSettings).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = this.settings.advancedSettings[key];
            }
        });
    }

    async applySettings() {
        await this.saveSettings();
        this.showNotification('Settings applied successfully', 'success');
    }

    async saveSettings() {
        try {
            if (!window.praivacyDB) {
                console.warn('IndexedDB not available, settings not saved');
                return;
            }

            const database = await window.praivacyDB.init();
            const tx = database.transaction(['stats'], 'readwrite');
            const store = tx.objectStore('stats');
            
            const settingsData = {
                key: 'settings',
                settings: this.settings,
                lastUpdated: Date.now()
            };
            
            await new Promise((resolve, reject) => {
                const req = store.put(settingsData);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
            
            console.log('Settings saved to IndexedDB');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    exportSettings() {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            settings: this.settings
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `privacy-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Settings exported successfully', 'success');
    }

    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (async () => {
                try {
                    const importData = JSON.parse(reader.result);
                    
                    if (!importData.settings) {
                        this.showNotification('Invalid settings file', 'error');
                        return;
                    }
                    
                    this.settings = { ...this.settings, ...importData.settings };
                    await this.saveSettings();
                    this.updateUI();
                    this.showNotification('Settings imported successfully', 'success');
                } catch (error) {
                    this.showNotification('Failed to import settings', 'error');
                }
            }).bind(this);
            
            reader.readAsText(file);
        });
        
        document.body.appendChild(input);
        input.click();
    }

    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            return;
        }
        
        this.settings = {
            blockingLevel: 'moderate',
            privacyControls: {
                'block-ads': true,
                'block-trackers': true,
                'prevent-cross-site': true
            },
            advancedSettings: {
                'fingerprint-protection': true,
                'show-notifications': false,
                'auto-update': true
            }
        };
        
        await this.saveSettings();
        this.updateUI();
        this.showNotification('Settings reset to defaults', 'info');
    }

    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PrivacySettingsManager();
});
