# Stripe Webhook Setup Guide

## Quick Setup

1. **Run the setup script:**
   ```bash
   npm run setup-webhook
   ```

2. **Copy the webhook secret** from the output and add to your environment variables:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

3. **Deploy your application** with the new environment variable.

## Manual Setup (Alternative)

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Click "Add endpoint"**
3. **Set endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
4. **Select events:**
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the signing secret** and add to environment variables

## Testing Webhooks

### Local Development
1. Install Stripe CLI: `stripe login`
2. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Use the webhook secret from CLI output

### Production Testing
1. Use Stripe Dashboard → Webhooks → Send test webhook
2. Check application logs for processing confirmation

## Webhook Security

- ✅ Signature verification implemented
- ✅ IP validation for Stripe sources
- ✅ Rate limiting protection
- ✅ Retry logic for failed processing
- ✅ Security event logging

## Troubleshooting

**Webhook not receiving events:**
- Check endpoint URL is correct
- Verify SSL certificate is valid
- Ensure webhook secret matches

**Processing failures:**
- Check application logs
- Verify database connectivity
- Review Stripe Dashboard for retry attempts