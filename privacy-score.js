class PrivacyScoreEngine {
    constructor() {
        this.weights = {
            blockedAds: 15,
            blockedTrackers: 15,
            blockedCrossSite: 20,
            fingerprintProtection: 15,
            autoSync: 5,
            blockingLevel: {
                light: 20,
                moderate: 40,
                strict: 60
            },
            domainCategories: {
                advertisement: 10,
                analytics: 8,
                social: 6,
                tracker: 12,
                malware: 20,
                suspicious: 15
            }
        };
        
        this.thresholds = {
            excellent: 90,
            good: 70,
            fair: 50,
            poor: 30
        };
    }

    async calculatePrivacyScore(settings, stats, blockedDomains = []) {
        let score = 0;
        const factors = {};

        // 1. Blocking Level (base score)
        if (settings.blockingLevel) {
            const levelScore = this.weights.blockingLevel[settings.blockingLevel] || 0;
            score += levelScore;
            factors.blockingLevel = {
                value: settings.blockingLevel,
                score: levelScore,
                weight: this.weights.blockingLevel[settings.blockingLevel]
            };
        }

        // 2. Privacy Controls
        if (settings.privacyControls) {
            const controls = settings.privacyControls;
            
            if (controls['block-ads']) {
                score += this.weights.blockedAds;
                factors.blockedAds = { enabled: true, score: this.weights.blockedAds };
            }
            
            if (controls['block-trackers']) {
                score += this.weights.blockedTrackers;
                factors.blockedTrackers = { enabled: true, score: this.weights.blockedTrackers };
            }
            
            if (controls['prevent-cross-site']) {
                score += this.weights.blockedCrossSite;
                factors.blockedCrossSite = { enabled: true, score: this.weights.blockedCrossSite };
            }
        }

        // 3. Advanced Settings
        if (settings.advancedSettings) {
            if (settings.advancedSettings['fingerprint-protection']) {
                score += this.weights.fingerprintProtection;
                factors.fingerprintProtection = { enabled: true, score: this.weights.fingerprintProtection };
            }
            
            if (settings.advancedSettings['auto-sync']) {
                score += this.weights.autoSync;
                factors.autoSync = { enabled: true, score: this.weights.autoSync };
            }
        }

        // 4. Usage Statistics (dynamic scoring)
        if (stats) {
            const usageScore = this.calculateUsageScore(stats);
            score += usageScore;
            factors.usageStats = {
                stats: stats,
                score: usageScore
            };
        }

        // 5. Domain Analysis (blocked domains quality)
        if (blockedDomains && blockedDomains.length > 0) {
            const domainScore = this.calculateDomainScore(blockedDomains);
            score += domainScore;
            factors.domainAnalysis = {
                totalDomains: blockedDomains.length,
                score: domainScore
            };
        }

        // Cap score at 100
        score = Math.min(score, 100);

        return {
            score: Math.round(score),
            grade: this.getPrivacyGrade(score),
            factors: factors,
            recommendations: this.getRecommendations(score, settings, factors),
            timestamp: Date.now()
        };
    }

    calculateUsageScore(stats) {
        let usageScore = 0;
        
        // Score based on number of blocked items
        if (stats.blockedCount) {
            usageScore += Math.min(stats.blockedCount * 0.5, 10);
        }
        
        if (stats.adCount) {
            usageScore += Math.min(stats.adCount * 0.7, 15);
        }
        
        if (stats.trackerCount) {
            usageScore += Math.min(stats.trackerCount * 0.8, 20);
        }

        return Math.round(usageScore);
    }

    calculateDomainScore(blockedDomains) {
        let domainScore = 0;
        const categoryScores = {};

        blockedDomains.forEach(domain => {
            const category = domain.category || domain.type || 'unknown';
            const weight = this.weights.domainCategories[category] || 2;
            
            domainScore += weight;
            
            if (!categoryScores[category]) {
                categoryScores[category] = { count: 0, score: 0 };
            }
            categoryScores[category].count++;
            categoryScores[category].score += weight;
        });

        // Normalize score (max 30 points for domain analysis)
        return Math.min(Math.round(domainScore * 0.3), 30);
    }

    getPrivacyGrade(score) {
        if (score >= this.thresholds.excellent) return 'A+';
        if (score >= this.thresholds.good) return 'A';
        if (score >= this.thresholds.fair) return 'B';
        if (score >= this.thresholds.poor) return 'C';
        return 'D';
    }

    getPrivacyLevel(score) {
        if (score >= this.thresholds.excellent) return 'Excellent';
        if (score >= this.thresholds.good) return 'Good';
        if (score >= this.thresholds.fair) return 'Fair';
        if (score >= this.thresholds.poor) return 'Poor';
        return 'Very Poor';
    }

    getPrivacyColor(score) {
        if (score >= this.thresholds.excellent) return '#00ff9c';
        if (score >= this.thresholds.good) return '#00f0ff';
        if (score >= this.thresholds.fair) return '#ffc107';
        return '#ff6b6b';
    }

    getRecommendations(score, settings, factors) {
        const recommendations = [];

        if (score < this.thresholds.poor) {
            recommendations.push({
                type: 'critical',
                title: 'Enable All Privacy Features',
                description: 'Your privacy protection is very low. Enable all available privacy features for better protection.',
                action: 'Enable all privacy controls'
            });
        }

        if (!settings.privacyControls?.['block-ads']) {
            recommendations.push({
                type: 'high',
                title: 'Enable Ad Blocking',
                description: 'Block advertisements to improve privacy and page loading speed.',
                action: 'Turn on "Block Ads" in settings'
            });
        }

        if (!settings.privacyControls?.['block-trackers']) {
            recommendations.push({
                type: 'high',
                title: 'Enable Tracker Blocking',
                description: 'Prevent trackers from following you across websites.',
                action: 'Turn on "Block Trackers" in settings'
            });
        }

        if (!settings.privacyControls?.['prevent-cross-site']) {
            recommendations.push({
                type: 'medium',
                title: 'Enable Cross-Site Tracking Protection',
                description: 'Stop websites from tracking your activity across different sites.',
                action: 'Turn on "Prevent Cross-Site Tracking" in settings'
            });
        }

        if (!settings.advancedSettings?.['fingerprint-protection']) {
            recommendations.push({
                type: 'medium',
                title: 'Enable Fingerprint Protection',
                description: 'Protect against browser fingerprinting techniques.',
                action: 'Turn on "Fingerprint Protection" in advanced settings'
            });
        }

        if (settings.blockingLevel === 'light') {
            recommendations.push({
                type: 'low',
                title: 'Consider Higher Protection Level',
                description: 'Upgrade to moderate or strict blocking level for better privacy.',
                action: 'Change blocking level to moderate or strict'
            });
        }

        if (factors.usageStats && factors.usageStats.score < 10) {
            recommendations.push({
                type: 'info',
                title: 'Browse More to Build Protection',
                description: 'Your privacy score will improve as the extension blocks more threats.',
                action: 'Continue browsing normally to build protection history'
            });
        }

        return recommendations.slice(0, 5); // Limit to top 5 recommendations
    }

    async getHistoricalScores(days = 7) {
        try {
            const history = await chrome.storage.local.get(['privacyScoreHistory']);
            const scores = history.privacyScoreHistory || [];
            
            // Filter scores within the specified period
            const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
            return scores.filter(score => score.timestamp > cutoffTime);
        } catch (error) {
            console.error('Error getting historical scores:', error);
            return [];
        }
    }

    async saveScore(scoreData) {
        try {
            const history = await chrome.storage.local.get(['privacyScoreHistory']);
            const scores = history.privacyScoreHistory || [];
            
            scores.push(scoreData);
            
            // Keep only last 30 scores
            if (scores.length > 30) {
                scores.splice(0, scores.length - 30);
            }
            
            await chrome.storage.local.set({ privacyScoreHistory: scores });
        } catch (error) {
            console.error('Error saving privacy score:', error);
        }
    }

    generateScoreTrend(scores) {
        if (scores.length < 2) return 'insufficient_data';
        
        const recent = scores.slice(-5);
        const older = scores.slice(-10, -5);
        
        if (older.length === 0) return 'insufficient_data';
        
        const recentAvg = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + s.score, 0) / older.length;
        
        if (recentAvg > olderAvg + 5) return 'improving';
        if (recentAvg < olderAvg - 5) return 'declining';
        return 'stable';
    }

    async getComprehensiveReport() {
        try {
            const data = await chrome.storage.local.get([
                'prAIvacySettings', 'blockedCount', 'adCount', 
                'trackerCount', 'blockedDomains', 'blockedRequests'
            ]);

            const settings = data.prAIvacySettings || {};
            const stats = {
                blockedCount: data.blockedCount || 0,
                adCount: data.adCount || 0,
                trackerCount: data.trackerCount || 0
            };
            const blockedDomains = data.blockedDomains || [];

            const scoreResult = await this.calculatePrivacyScore(settings, stats, blockedDomains);
            await this.saveScore(scoreResult);

            const historicalScores = await this.getHistoricalScores();
            const trend = this.generateScoreTrend(historicalScores);

            return {
                current: scoreResult,
                historical: historicalScores,
                trend: trend,
                summary: this.generateSummary(scoreResult, trend)
            };
        } catch (error) {
            console.error('Error generating comprehensive report:', error);
            throw error;
        }
    }

    generateSummary(scoreResult, trend) {
        const { score, grade } = scoreResult;
        const level = this.getPrivacyLevel(score);
        
        return {
            score: score,
            grade: grade,
            level: level,
            trend: trend,
            description: this.getScoreDescription(level, trend),
            color: this.getPrivacyColor(score)
        };
    }

    getScoreDescription(level, trend) {
        const trendText = trend === 'improving' ? 'and improving' : 
                         trend === 'declining' ? 'but declining' : 
                         trend === 'stable' ? 'and stable' : '';
        
        return `Your privacy protection is ${level} ${trendText}. ${this.getLevelAdvice(level)}`;
    }

    getLevelAdvice(level) {
        switch (level) {
            case 'Excellent':
                return 'You have maximum privacy protection enabled.';
            case 'Good':
                return 'Your privacy settings are well configured.';
            case 'Fair':
                return 'Consider enabling more privacy features for better protection.';
            case 'Poor':
                return 'Your privacy needs immediate attention. Enable more protections.';
            case 'Very Poor':
                return 'Critical: Enable all available privacy features immediately.';
            default:
                return 'Continue configuring your privacy settings.';
        }
    }
}

// Global instance
window.privacyScoreEngine = new PrivacyScoreEngine();