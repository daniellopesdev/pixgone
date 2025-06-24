import React, { useState, useEffect } from 'react';
import DonateButton from './DonateButton';
import './DonationStats.css';

const DonationStats = ({ currentCost, onDonateClick }) => {
  const [donationStats, setDonationStats] = useState(null);
  const [appStatus, setAppStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format currency to 2 decimal places
  const formatCurrency = (amount) => {
    return typeof amount === 'number' ? amount.toFixed(2) : '0.00';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch donation stats and app status in parallel
        const [statsResponse, statusResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/api/donations/stats`),
          fetch(`${process.env.REACT_APP_API_URL || 'https://pixgone-production.up.railway.app'}/api/app-status`)
        ]);

        if (statsResponse.ok && statusResponse.ok) {
          const [stats, status] = await Promise.all([
            statsResponse.json(),
            statusResponse.json()
          ]);
          
          setDonationStats(stats);
          setAppStatus(status);
        } else {
          throw new Error('Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching donation stats:', err);
        setError('Failed to load donation information');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="donation-stats">
        <div className="stats-loading">Loading donation information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="donation-stats">
        <div className="stats-error">{error}</div>
      </div>
    );
  }

  if (!donationStats || !appStatus) {
    return null;
  }

  const { total_donations, donation_count, top_contributors } = donationStats;
  // Use currentCost prop if provided, else fallback to appStatus.current_cost
  const current_cost = typeof currentCost === 'number' ? currentCost : appStatus.current_cost;
  const base_threshold = appStatus.base_threshold;
  const monthly_donations = appStatus.monthly_donations;
  const total_budget = base_threshold + monthly_donations;
  const available_budget = total_budget - current_cost;
  const enabled = appStatus.enabled;
  
  const usagePercentage = total_budget > 0 ? (current_cost / total_budget) * 100 : 0;
  const progressColor = usagePercentage > 80 ? '#ef4444' : usagePercentage > 60 ? '#f59e0b' : '#10b981';

  return (
    <div className="donation-stats">
      <div className="stats-header">
        <h3>Community Support</h3>
        <div className={`app-status ${enabled ? 'enabled' : 'disabled'}`}>
          {enabled ? '🟢 Available' : '🔴 Temporarily Unavailable'}
        </div>
      </div>

      <div className="budget-overview">
        <div className="budget-item">
          <span className="budget-label">Base Threshold</span>
          <span className="budget-value">${formatCurrency(base_threshold)}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Monthly Donations</span>
          <span className="budget-value">${formatCurrency(monthly_donations)}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Total Budget</span>
          <span className="budget-value">${formatCurrency(total_budget)}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Current Costs</span>
          <span className="budget-value">${formatCurrency(current_cost)}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Available Budget</span>
          <span className={`budget-value ${available_budget < 0 ? 'negative' : ''}`}>
            ${formatCurrency(available_budget)}
          </span>
        </div>
      </div>

      <div className="usage-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{
              width: `${Math.min(usagePercentage, 100)}%`,
              backgroundColor: progressColor
            }}
          />
        </div>
        <div className="progress-labels">
          <span>${formatCurrency(current_cost)} used</span>
          <span>${formatCurrency(total_budget)} total</span>
        </div>
      </div>

      {!enabled && (
        <div className="service-disabled">
          <p>Service is currently disabled due to cost limits.</p>
          <DonateButton 
            variant="urgent" 
            size="medium" 
            appStatus={appStatus}
            showWhenDisabled={true}
            onClick={onDonateClick}
          />
        </div>
      )}

      {top_contributors.length > 0 && (
        <div className="top-contributors">
          <h4>Top Contributors This Month</h4>
          <div className="contributors-list">
            {top_contributors.slice(0, 5).map((contributor, index) => (
              <div key={index} className="contributor">
                <span className="contributor-name">{contributor.name}</span>
                <span className="contributor-amount">${formatCurrency(contributor.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="donation-cta">
        <p>Help keep this service free for everyone!</p>
        <DonateButton 
          variant="sidebar" 
          size="medium" 
          appStatus={appStatus}
          showWhenDisabled={true}
          buttonTextOverride="Support"
          onClick={onDonateClick}
        />
      </div>
    </div>
  );
};

export default DonationStats; 