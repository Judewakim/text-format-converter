// Script to set up Stripe webhook endpoint
// Run with: node scripts/setup-webhook.js

require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupWebhook() {
  try {
    const webhook = await stripe.webhookEndpoints.create({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`,
      enabled_events: [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed'
      ]
    });

    console.log('Webhook created successfully!');
    console.log('Webhook ID:', webhook.id);
    console.log('Webhook Secret:', webhook.secret);
    console.log('\nAdd this to your environment variables:');
    console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  } catch (error) {
    console.error('Error creating webhook:', error.message);
  }
}

setupWebhook();