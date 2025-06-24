# Railway Cost Monitoring Setup Guide

This guide explains how to set up Railway API integration to display real-time server costs on your Pixgone frontend.

## 🚀 Quick Setup

### 1. Get Railway API Token

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your profile (top right)
3. Go to **Account Settings**
4. Navigate to **Tokens** section
5. Click **Create Token**
6. Give it a name like "Pixgone Cost Monitor"
7. Copy the generated token

### 2. Get Project ID

1. Go to your Railway project dashboard
2. Click on **Settings** (gear icon)
3. Look for **Project ID** in the General section
4. Copy the project ID

### 3. Set Environment Variables

#### For Railway Deployment:
1. Go to your Railway project
2. Click on your backend service
3. Go to **Variables** tab
4. Add these variables:
   ```
   RAILWAY_API_TOKEN=your_token_here
   RAILWAY_PROJECT_ID=your_project_id_here
   ```

#### For Local Development:
Create a `.env` file in your `server/` directory:
```env
RAILWAY_API_TOKEN=your_token_here
RAILWAY_PROJECT_ID=your_project_id_here
```

### 4. Update Frontend Configuration

Update your frontend environment variables:
```env
REACT_APP_API_URL=https://your-backend-url.railway.app
```

## 🔧 Advanced Configuration

### Custom Donation Links

Update `src/components/Header.js` to change donation platforms:

```javascript
const handleDonate = () => {
  // Choose your preferred platform:
  
  // Ko-fi
  window.open('https://ko-fi.com/yourusername', '_blank');
  
  // Buy Me a Coffee
  window.open('https://buymeacoffee.com/yourusername', '_blank');
  
  // PayPal
  window.open('https://paypal.me/yourusername', '_blank');
  
  // Patreon
  window.open('https://patreon.com/yourusername', '_blank');
  
  // GitHub Sponsors
  window.open('https://github.com/sponsors/yourusername', '_blank');
};
```

### Update GitHub Repository Link

In `src/components/Header.js`:
```javascript
const handleGitHub = () => {
  window.open('https://github.com/yourusername/pixgone', '_blank');
};
```

### Cost Refresh Interval

To change how often costs are updated, modify `src/components/CostMonitor.js`:

```javascript
// Current: every 5 minutes (5 * 60 * 1000)
// Change to every 2 minutes:
const interval = setInterval(fetchCosts, 2 * 60 * 1000);
```

## 📊 Understanding the Cost Calculation

The cost calculation uses Railway's official pricing:

- **CPU**: $20 per vCPU per month
- **Memory**: $10 per GB per month  
- **Network**: $0.05 per GB

The API fetches raw usage metrics and converts them to monthly cost estimates.

## 🛠️ Troubleshooting

### Cost Monitor Shows "Unable to fetch costs"

1. **Check API Token**: Ensure `RAILWAY_API_TOKEN` is set correctly
2. **Check Project ID**: Verify `RAILWAY_PROJECT_ID` is correct
3. **Check Permissions**: Token needs read access to project usage
4. **Check Logs**: Look at server logs for error details

### Cost Monitor Shows $0.00

This is normal if:
- Project just started (no usage yet)
- Very low usage that rounds to $0
- Beginning of billing cycle

### API Rate Limiting

Railway API has rate limits. The default 5-minute refresh interval should be safe, but if you see rate limit errors:

1. Increase refresh interval in `CostMonitor.js`
2. Check server logs for 429 status codes
3. Consider caching responses longer

## 🔒 Security Best Practices

1. **Token Security**: Never commit tokens to git
2. **Read-Only Access**: Use tokens with minimal permissions
3. **Environment Variables**: Always use env vars for sensitive data
4. **CORS**: Configure CORS properly for production

## 🎯 Benefits of Cost Transparency

- **Builds Trust**: Users see real server costs
- **Encourages Donations**: Transparent about expenses
- **Cost Awareness**: Helps monitor resource usage
- **Professional Appearance**: Shows serious commitment

## 📈 Monitoring Usage

The cost monitor helps you:

1. **Track Expenses**: See real-time monthly costs
2. **Identify Spikes**: Notice unusual usage patterns
3. **Plan Scaling**: Understand cost implications
4. **Optimize Resources**: Find areas to reduce costs

## 🎨 Customization

### Hide Detailed Breakdown

To show only total cost, modify `CostMonitor.js`:
```javascript
// Set compact={true} to hide CPU/Memory/Network breakdown
<CostMonitor compact={true} />
```

### Custom Styling

Modify `src/components/CostMonitor.css` to match your design:
- Change colors to match your theme
- Adjust spacing and typography
- Add animations or transitions

### Different Donation Buttons

You can add multiple donation options:
```javascript
<button onClick={() => window.open('https://ko-fi.com/user')}>☕ Ko-fi</button>
<button onClick={() => window.open('https://paypal.me/user')}>💳 PayPal</button>
```

## 📚 Additional Resources

- [Railway API Documentation](https://docs.railway.app/reference/public-api)
- [Railway GraphQL Explorer](https://railway.com/graphiql)
- [Railway Pricing Details](https://railway.app/pricing)

## 🚨 Important Notes

1. **API Token Security**: Keep your Railway API token secure
2. **Cost Accuracy**: Costs are estimates based on current usage
3. **Rate Limits**: Don't refresh too frequently
4. **User Privacy**: Don't expose sensitive project details

---

## ✅ Verification Checklist

- [ ] Railway API token configured
- [ ] Project ID set correctly
- [ ] Environment variables deployed
- [ ] Cost monitor displays data
- [ ] Donate button links work
- [ ] GitHub link updated
- [ ] Mobile responsive design works
- [ ] Error handling tested

Once everything is configured, your users will see real-time server costs and can easily support your project! 🎉 