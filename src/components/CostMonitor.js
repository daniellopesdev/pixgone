import React, { useState, useEffect } from 'react';
import './CostMonitor.css';

const CostMonitor = ({ compact = false }) => {
  const [costs, setCosts] = useState({
    cpu_cost: 0.0,
    memory_cost: 0.0,
    network_cost: 0.0,
    total_cost: 0.0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCosts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/railway-costs`);
      const data = await response.json();
      
      if (data.success) {
        setCosts(data.costs);
        setLastUpdated(new Date(data.last_updated));
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch costs');
      }
    } catch (err) {
      setError('Unable to connect to cost monitoring');
      console.error('Cost fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
    // Refresh costs every 5 minutes
    const interval = setInterval(fetchCosts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatTime = (date) => {
    return date ? date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }) : '';
  };

  if (loading) {
    return (
      <div className={`cost-monitor loading ${compact ? 'compact' : ''}`}>
        <div className="cost-spinner"></div>
        <span>Loading costs...</span>
      </div>
    );
  }

  return (
    <div className={`cost-monitor ${compact ? 'compact' : ''}`}>
      <div className="cost-header">
        <h4>💰 {compact ? 'Server Costs' : 'Real-time Server Costs'}</h4>
        <span className="cost-subtitle">This month {compact ? '' : '(transparent pricing)'}</span>
      </div>
      
      {error ? (
        <div className="cost-error">
          <span>⚠️ {compact ? 'Cost data unavailable' : error}</span>
        </div>
      ) : (
        <div className="cost-breakdown">
          {!compact && (
            <>
              <div className="cost-item">
                <span className="cost-label">🧠 CPU:</span>
                <span className="cost-value">{formatCurrency(costs.cpu_cost)}</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">💾 Memory:</span>
                <span className="cost-value">{formatCurrency(costs.memory_cost)}</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">🌐 Network:</span>
                <span className="cost-value">{formatCurrency(costs.network_cost)}</span>
              </div>
            </>
          )}
          <div className="cost-total">
            <span className="cost-label">📊 Total:</span>
            <span className="cost-value total">{formatCurrency(costs.total_cost)}</span>
          </div>
        </div>
      )}
      
      {lastUpdated && !compact && (
        <div className="cost-footer">
          <span className="cost-timestamp">
            Updated at {formatTime(lastUpdated)}
          </span>
          <button className="refresh-btn" onClick={fetchCosts} title="Refresh costs">
            🔄
          </button>
        </div>
      )}
    </div>
  );
};

export default CostMonitor; 