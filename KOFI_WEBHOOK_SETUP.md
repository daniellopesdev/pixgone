# Ko-fi Webhook Setup Guide

This guide will help you set up Ko-fi webhooks to automatically track donations and control your app's availability based on costs vs donations.

## Prerequisites

- Ko-fi account with webhook access
- Your PixGone server deployed and running
- Environment variables configured

## Step 1: Environment Variables

Add these environment variables to your server:

```bash
# Ko-fi Webhook Configuration
KOFI_WEBHOOK_SECRET=your_webhook_secret_here
KOFI_VERIFICATION_TOKEN=your_verification_token_here

# App Cost Threshold
BASE_THRESHOLD=5.0  # $5 base threshold
```

## Step 2: Ko-fi Webhook Configuration

1. **Log into your Ko-fi account**
2. **Go to Settings → Webhooks**
3. **Create a new webhook:**
   - **URL**: `https://your-domain.com/webhook/kofi`
   - **Events**: Select "Donation" events
   - **Secret**: Generate a secure secret (save this as `KOFI_WEBHOOK_SECRET`)
   - **Verification Token**: Generate a verification token (save this as `KOFI_VERIFICATION_TOKEN`)

## Step 3: Test the Webhook

1. **Make a test donation** to your Ko-fi page
2. **Check your server logs** for webhook processing
3. **Verify the donation appears** in your database

## Step 4: Monitor the System

### API Endpoints Available

- `GET /api/app-status` - Check if app is enabled/disabled
- `GET /api/donations/stats` - Get donation statistics
- `GET /api/donations/top-contributors` - Get top contributors
- `POST /webhook/kofi` - Ko-fi webhook endpoint

### Database Schema

The system automatically creates a SQLite database (`donations.db`) with:

```sql
CREATE TABLE donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kofi_id TEXT UNIQUE,
    donor_name TEXT,
    amount REAL,
    message TEXT,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    month_year TEXT
);
```

## How It Works

1. **Donation Tracking**: Ko-fi sends webhooks for each donation
2. **Cost Monitoring**: Railway API tracks server costs
3. **App Control**: App is disabled when costs exceed donations
4. **Frontend Display**: Real-time donation stats and app status

## App Status Logic

```javascript
// App is enabled if:
available_budget = monthly_donations - current_cost > 0

// App is disabled if:
available_budget <= 0
```

## Troubleshooting

### Webhook Not Receiving Data
- Check webhook URL is correct
- Verify webhook is enabled in Ko-fi
- Check server logs for errors

### App Not Disabling
- Verify Railway API credentials
- Check cost calculation logic
- Ensure donation data is being stored

### Database Issues
- Check file permissions for `donations.db`
- Verify SQLite is working
- Check server logs for database errors

## Security Notes

- Keep webhook secrets secure
- Use HTTPS for webhook URLs
- Monitor webhook signatures
- Regularly backup donation database

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify all environment variables are set
3. Test webhook endpoints manually
4. Contact support with specific error details 