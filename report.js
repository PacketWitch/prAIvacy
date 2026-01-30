class PrivacyReportManager {
    constructor() {
        this.scoreEngine = window.privacyScoreEngine;
        this.reportData = null;
        this.init();
    }

    async init() {
        await this.loadReportData();
        this.setupEventListeners();
        this.renderReport();
        this.startAutoRefresh();
    }

    async loadReportData() {
        try {
            // Get comprehensive report from score engine
            this.reportData = await this.scoreEngine.getComprehensiveReport();
        } catch (error) {
            console.error('Error loading report data:', error);
            this.reportData = this.getDefaultReportData();
        }
    }

    getDefaultReportData() {
        return {
            current: {
                score: 50,
                grade: 'C',
                factors: {},
                recommendations: []
            },
            historical: [],
            trend: 'stable',
            summary: {
                score: 50,
                grade: 'C',
                level: 'Fair',
                trend: 'stable',
                description: 'Your privacy protection is Fair and stable.'
            }
        };
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshReport());
        }

        const exportBtn = document.getElementById('export-report');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportReport());
        }

        const periodSelect = document.getElementById('report-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => this.changePeriod(e.target.value));
        }
    }

    renderReport() {
        this.renderPrivacyScore();
        this.renderStatistics();
        this.renderTrendChart();
        this.renderRecommendations();
        this.renderDetailedBreakdown();
    }

    renderPrivacyScore() {
        const scoreElement = document.getElementById('report-score');
        const descriptionElement = document.getElementById('score-description');
        const gradeElement = document.getElementById('score-grade');
        const trendElement = document.getElementById('score-trend');

        if (this.reportData.current && scoreElement) {
            const { score, grade } = this.reportData.current;
            const { level, trend, color } = this.reportData.summary;

            scoreElement.textContent = `${score}%`;
            scoreElement.style.color = color;
            
            if (descriptionElement) {
                descriptionElement.textContent = this.scoreEngine.getScoreDescription(level, trend);
            }

            if (gradeElement) {
                gradeElement.textContent = grade;
                gradeElement.style.color = color;
            }

            if (trendElement) {
                const trendIcon = this.getTrendIcon(trend);
                trendElement.innerHTML = `${trendIcon} ${trend}`;
                trendElement.style.color = this.getTrendColor(trend);
            }
        }
    }

    renderStatistics() {
        // Get actual stats from storage
        chrome.storage.local.get([
            'blockedCount', 'adCount', 'trackerCount', 'blockedRequests'
        ], (data) => {
            const stats = {
                blockedCount: data.blockedCount || 0,
                adCount: data.adCount || 0,
                trackerCount: data.trackerCount || 0,
                recentRequests: (data.blockedRequests || []).slice(-10).length
            };

            this.updateStatDisplay('total-blocked', stats.blockedCount);
            this.updateStatDisplay('total-ads', stats.adCount);
            this.updateStatDisplay('total-trackers', stats.trackerCount);
            this.updateStatDisplay('recent-requests', stats.recentRequests);
        });
    }

    updateStatDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatNumber(value);
        }
    }

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }

    renderTrendChart() {
        const chartContainer = document.getElementById('trend-chart');
        if (!chartContainer || !this.reportData.historical.length) return;

        const canvas = document.createElement('canvas');
        canvas.width = chartContainer.offsetWidth;
        canvas.height = 200;
        chartContainer.innerHTML = '';
        chartContainer.appendChild(canvas);

        this.drawTrendChart(canvas, this.reportData.historical);
    }

    drawTrendChart(canvas, scores) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (scores.length < 2) {
            ctx.fillStyle = '#9fb3c8';
            ctx.font = '14px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('Insufficient data for trend chart', width / 2, height / 2);
            return;
        }

        // Prepare data points
        const maxScore = 100;
        const minScore = 0;
        const xStep = (width - 2 * padding) / (scores.length - 1);
        const yScale = (height - 2 * padding) / (maxScore - minScore);

        // Draw grid lines
        ctx.strokeStyle = '#1e2a38';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = padding + (i * (height - 2 * padding) / 4);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            // Y-axis labels
            ctx.fillStyle = '#9fb3c8';
            ctx.font = '12px Segoe UI';
            ctx.textAlign = 'right';
            ctx.fillText(100 - (i * 25), padding - 10, y + 4);
        }

        // Draw trend line
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        scores.forEach((scoreData, index) => {
            const x = padding + (index * xStep);
            const y = padding + ((100 - scoreData.score) * yScale);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw data points
        scores.forEach((scoreData, index) => {
            const x = padding + (index * xStep);
            const y = padding + ((100 - scoreData.score) * yScale);
            
            ctx.fillStyle = this.scoreEngine.getPrivacyColor(scoreData.score);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add hover effect with score value
            ctx.fillStyle = '#0b0f14';
            ctx.fillRect(x - 20, y - 25, 40, 18);
            ctx.fillStyle = '#e4f1f1';
            ctx.font = '10px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText(scoreData.score, x, y - 12);
        });
    }

    renderRecommendations() {
        const container = document.getElementById('recommendations-container');
        if (!container) return;

        const recommendations = this.reportData.current.recommendations || [];
        
        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="no-recommendations">
                    <p>🎉 Great job! Your privacy settings are well configured.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item ${rec.type}">
                <div class="recommendation-header">
                    <span class="recommendation-title">${rec.title}</span>
                    <span class="recommendation-type">${rec.type}</span>
                </div>
                <p class="recommendation-description">${rec.description}</p>
                <div class="recommendation-action">
                    <strong>Action:</strong> ${rec.action}
                </div>
            </div>
        `).join('');
    }

    renderDetailedBreakdown() {
        const container = document.getElementById('breakdown-container');
        if (!container || !this.reportData.current.factors) return;

        const factors = this.reportData.current.factors;
        const breakdown = this.generateBreakdown(factors);

        container.innerHTML = breakdown.map(item => `
            <div class="breakdown-item">
                <div class="breakdown-label">${item.label}</div>
                <div class="breakdown-value">
                    <span class="breakdown-score">+${item.score}</span>
                    <div class="breakdown-bar">
                        <div class="breakdown-fill" style="width: ${item.percentage}%"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    generateBreakdown(factors) {
        const items = [];

        if (factors.blockingLevel) {
            items.push({
                label: `Blocking Level (${factors.blockingLevel.value})`,
                score: factors.blockingLevel.score,
                percentage: (factors.blockingLevel.score / 60) * 100
            });
        }

        if (factors.blockedAds) {
            items.push({
                label: 'Ad Blocking',
                score: factors.blockedAds.score,
                percentage: (factors.blockedAds.score / 15) * 100
            });
        }

        if (factors.blockedTrackers) {
            items.push({
                label: 'Tracker Blocking',
                score: factors.blockedTrackers.score,
                percentage: (factors.blockedTrackers.score / 15) * 100
            });
        }

        if (factors.blockedCrossSite) {
            items.push({
                label: 'Cross-Site Protection',
                score: factors.blockedCrossSite.score,
                percentage: (factors.blockedCrossSite.score / 20) * 100
            });
        }

        if (factors.fingerprintProtection) {
            items.push({
                label: 'Fingerprint Protection',
                score: factors.fingerprintProtection.score,
                percentage: (factors.fingerprintProtection.score / 15) * 100
            });
        }

        if (factors.usageStats) {
            items.push({
                label: 'Usage Activity',
                score: factors.usageStats.score,
                percentage: Math.min((factors.usageStats.score / 45) * 100, 100)
            });
        }

        return items.sort((a, b) => b.score - a.score);
    }

    getTrendIcon(trend) {
        switch (trend) {
            case 'improving': return '📈';
            case 'declining': return '📉';
            case 'stable': return '➡️';
            default: return '❓';
        }
    }

    getTrendColor(trend) {
        switch (trend) {
            case 'improving': return '#00ff9c';
            case 'declining': return '#ff6b6b';
            case 'stable': return '#00f0ff';
            default: return '#9fb3c8';
        }
    }

    async refreshReport() {
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.textContent = 'Refreshing...';
            refreshBtn.disabled = true;
        }

        await this.loadReportData();
        this.renderReport();

        if (refreshBtn) {
            refreshBtn.textContent = 'Refresh Report';
            refreshBtn.disabled = false;
        }
    }

    exportReport() {
        const exportData = {
            report: this.reportData,
            timestamp: new Date().toISOString(),
            version: chrome.runtime.getManifest().version
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `prAIvacy-privacy-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Privacy report exported successfully', 'success');
    }

    changePeriod(period) {
        // This would filter historical data based on period
        // For now, just refresh the current view
        this.refreshReport();
    }

    startAutoRefresh() {
        // Refresh report every 5 minutes
        setInterval(() => {
            this.refreshReport();
        }, 5 * 60 * 1000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.privacyReportManager = new PrivacyReportManager();
});