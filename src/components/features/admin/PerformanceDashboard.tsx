import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { usePerformanceMonitor } from '../../../utils/performance';
import { getMemoryUsage, getNetworkInfo } from '../../../utils/performance';
import { useABTest } from '../../../utils/abTesting';
import { updateLeaderboardsViaCloudFunction, distributeRewardsViaCloudFunction } from '../../../services/firebase/leaderboard';
import { GradientBackground } from '../../common/ui';
import './PerformanceDashboard.css';

interface PerformanceData {
  timestamp: number;
  memoryUsage: number;
  networkSpeed: number;
  loadTime: number;
  cacheHitRate: number;
}

interface ChartConfig {
  title: string;
  dataKey: string;
  stroke?: string;
  fill?: string;
  type: 'line' | 'bar';
}

const PerformanceDashboard: React.FC = () => {
  const { getMetrics, reportMetrics } = usePerformanceMonitor();
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [rewardMonth, setRewardMonth] = useState<string>('');

  // AB Test results
  const { variant: uiVariant, config: uiConfig } = useABTest('quiz_ui_variant');
  const { variant: loadingVariant, config: loadingConfig } = useABTest('question_loading');

  // Chart configurations
  const chartConfigs: ChartConfig[] = useMemo(() => [
    { title: 'Memory Usage Over Time', dataKey: 'memory', stroke: '#8884d8', type: 'line' },
    { title: 'Load Time Over Time', dataKey: 'loadTime', stroke: '#82ca9d', type: 'line' },
    { title: 'Cache Hit Rate', dataKey: 'cacheHitRate', fill: '#8884d8', type: 'bar' },
    { title: 'Network Speed', dataKey: 'network', stroke: '#ffc658', type: 'line' }
  ], []);

  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setIsMonitoring(false);
    } else {
      const interval = setInterval(() => {
        collectPerformanceData();
      }, 30000); // Optimized for mobile: 5 seconds -> 30 seconds
      setRefreshInterval(interval);
      setIsMonitoring(true);
    }
  }, [isMonitoring, refreshInterval]);

  const collectPerformanceData = useCallback(() => {
    const memory = getMemoryUsage();
    const network = getNetworkInfo();
    const metrics = getMetrics();

    const data: PerformanceData = {
      timestamp: Date.now(),
      memoryUsage: memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0,
      networkSpeed: network ? network.downlink : 0,
      loadTime: metrics['fetchQuestions'] ? metrics['fetchQuestions'].reduce((a, b) => a + b, 0) / metrics['fetchQuestions'].length : 0,
      cacheHitRate: metrics['cache_hit'] ? (metrics['cache_hit'].length / (metrics['cache_hit'].length + (metrics['fetch_error']?.length || 0))) * 100 : 0
    };

    setPerformanceData(prev => [...prev.slice(-20), data]);
  }, [getMetrics]);

  const exportPerformanceData = useCallback(() => {
    const dataStr = JSON.stringify(performanceData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'performance-data.json';
    link.click();
  }, [performanceData]);

  // Memoized chart data
  const chartData = useMemo(() => {
    return performanceData.map(data => ({
      time: new Date(data.timestamp).toLocaleTimeString(),
      memory: data.memoryUsage,
      network: data.networkSpeed,
      loadTime: data.loadTime,
      cacheHitRate: data.cacheHitRate
    }));
  }, [performanceData]);

  // Performance summary
  const performanceSummary = useMemo(() => {
    if (performanceData.length === 0) return null;

    const latest = performanceData[performanceData.length - 1];
    const avgMemory = performanceData.reduce((sum, data) => sum + data.memoryUsage, 0) / performanceData.length;
    const avgLoadTime = performanceData.reduce((sum, data) => sum + data.loadTime, 0) / performanceData.length;
    const avgCacheHitRate = performanceData.reduce((sum, data) => sum + data.cacheHitRate, 0) / performanceData.length;

    return {
      currentMemory: latest?.memoryUsage || 0,
      averageMemory: avgMemory,
      currentLoadTime: latest?.loadTime || 0,
      averageLoadTime: avgLoadTime,
      currentCacheHitRate: latest?.cacheHitRate || 0,
      averageCacheHitRate: avgCacheHitRate,
      dataPoints: performanceData.length
    };
  }, [performanceData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  const renderChart = useCallback((config: ChartConfig) => {
    const commonProps = {
      data: chartData
    };

    const chartProps = {
      ...commonProps,
      children: (
        <>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
        </>
      )
    };

    return (
      <div key={config.title} className="chart-container">
        <h3>{config.title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          {config.type === 'line' ? (
            <LineChart {...chartProps}>
              <Line type="monotone" dataKey={config.dataKey} stroke={config.stroke} />
            </LineChart>
          ) : (
            <BarChart {...chartProps}>
              <Bar dataKey={config.dataKey} fill={config.fill} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  }, [chartData]);

  return (
    <GradientBackground variant="admin" showParticles={true} particleCount={6}>
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <h1>Performance Dashboard</h1>
          <button 
            onClick={toggleMonitoring}
            className={`monitoring-btn ${isMonitoring ? 'active' : ''}`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>

        {/* AB Test Information */}
        <div className="ab-test-section">
          <h2>AB Test Status</h2>
          <div className="ab-test-grid">
            <div className="ab-test-card">
              <h3>UI Variant</h3>
              <p>Current: {uiVariant}</p>
              <p>Progress Bar: {uiConfig.showProgressBar ? 'Yes' : 'No'}</p>
              <p>Animation Speed: {uiConfig.animationSpeed}</p>
            </div>
            <div className="ab-test-card">
              <h3>Loading Variant</h3>
              <p>Current: {loadingVariant}</p>
              <p>Cache Size: {loadingConfig.cacheSize}</p>
              <p>Strategy: {loadingConfig.loadingStrategy}</p>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        {performanceSummary && (
          <div className="performance-summary">
            <h2>Performance Summary</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <h3>Memory Usage</h3>
                <p className="current">{performanceSummary.currentMemory.toFixed(2)}%</p>
                <p className="average">Avg: {performanceSummary.averageMemory.toFixed(2)}%</p>
              </div>
              <div className="summary-card">
                <h3>Load Time</h3>
                <p className="current">{performanceSummary.currentLoadTime.toFixed(2)}ms</p>
                <p className="average">Avg: {performanceSummary.averageLoadTime.toFixed(2)}ms</p>
              </div>
              <div className="summary-card">
                <h3>Cache Hit Rate</h3>
                <p className="current">{performanceSummary.currentCacheHitRate.toFixed(2)}%</p>
                <p className="average">Avg: {performanceSummary.averageCacheHitRate.toFixed(2)}%</p>
              </div>
              <div className="summary-card">
                <h3>Data Points</h3>
                <p className="current">{performanceSummary.dataPoints}</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="charts-section">
            <h2>Performance Charts</h2>
            <div className="chart-grid">
              {chartConfigs.map(renderChart)}
            </div>
          </div>
        )}

        {/* Leaderboard Management */}
        <div className="leaderboard-section">
          <h2>Leaderboard Management</h2>
          <button 
            onClick={async () => {
              try {
                const result = await updateLeaderboardsViaCloudFunction();
                alert(result.success ? 'Leaderboard başarıyla güncellendi!' : 'Güncelleme hatası: ' + result.message);
              } catch (error) {
                alert('Leaderboard güncelleme hatası: ' + error);
              }
            }}
            className="leaderboard-update-btn"
          >
            🏆 Leaderboard'u Güncelle
          </button>
        </div>

        {/* Reward Management */}
        <div className="reward-section">
          <h2>Ödül Yönetimi</h2>
          <div className="reward-controls">
            <div className="reward-input-group">
              <label htmlFor="rewardMonth">Ay Seçin:</label>
              <input
                type="month"
                id="rewardMonth"
                value={rewardMonth}
                onChange={(e) => setRewardMonth(e.target.value)}
                className="reward-month-input"
              />
            </div>
            <button
              onClick={async () => {
                if (!rewardMonth) {
                  alert('Lütfen bir ay seçin');
                  return;
                }
                try {
                  const result = await distributeRewardsViaCloudFunction(rewardMonth);
                  alert(result.success 
                    ? `Ödüller başarıyla dağıtıldı! ${result.totalRewards} kullanıcı ödül aldı.` 
                    : 'Ödül dağıtım hatası: ' + result.message
                  );
                } catch (error) {
                  alert('Ödül dağıtım hatası: ' + error);
                }
              }}
              className="reward-distribute-btn"
            >
              🎁 Ödülleri Dağıt
            </button>
          </div>
          <div className="reward-info">
            <h3>Ödül Şeması:</h3>
            <ul>
              <li>🥇 1. Sıra: 10,000 Coin + 10,000 XP</li>
              <li>🥈 2. Sıra: 5,000 Coin + 5,000 XP</li>
              <li>🥉 3. Sıra: 2,500 Coin + 2,500 XP</li>
              <li>4. Sıra: 1,000 Coin + 1,000 XP</li>
              <li>5-10. Sıra: 900→500 Coin + XP (100'er azalarak)</li>
              <li>11-100. Sıra: 100 Coin + 100 XP</li>
            </ul>
            <p><strong>Not:</strong> Her kategori için ayrı ödül verilir (XP, Doğru, Coin, Streak)</p>
          </div>
        </div>

        {/* Export Data */}
        <div className="export-section">
          <h2>Export Data</h2>
          <button onClick={reportMetrics}>
            Export Metrics
          </button>
          <button onClick={exportPerformanceData}>
            Export Performance Data
          </button>
        </div>
      </div>
    </GradientBackground>
  );
};

export default PerformanceDashboard; 