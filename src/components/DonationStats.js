import React, { useState, useEffect } from 'react';
import DonateButton from './DonateButton';
import './DonationStats.css';

const DonationStats = () => {
  const [donationStats, setDonationStats] = useState(null);
  const [appStatus, setAppStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const { enabled, current_cost, monthly_donations, available_budget, base_threshold, total_budget } = appStatus;
  
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
          <span className="budget-value">${base_threshold}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Monthly Donations</span>
          <span className="budget-value">${monthly_donations}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Total Budget</span>
          <span className="budget-value">${total_budget}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Current Costs</span>
          <span className="budget-value">${current_cost}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Available Budget</span>
          <span className={`budget-value ${available_budget < 0 ? 'negative' : ''}`}>
            ${available_budget}
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
          <span>${current_cost} used</span>
          <span>${total_budget} total</span>
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
                <span className="contributor-amount">${contributor.amount}</span>
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
        />
      </div>
    </div>
  );
};

export default DonationStats; 