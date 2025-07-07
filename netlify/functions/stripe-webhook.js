// netlify/functions/stripe-webhook.js

/**
 * Netlify Function to handle Stripe webhooks and credit users on checkout success.
 * Make sure you've set these environment variables in Netlify:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Stripe client with API version
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

exports.handler = async function (event) {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Verify webhook signature and parse the event
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the checkout.session.completed event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    // Retrieve session with line items expanded
    let sessionWithItems;
    try {
      sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });
    } catch (err) {
      console.error('Error retrieving session line items:', err.message);
      return { statusCode: 500, body: 'Failed to retrieve session items' };
    }

    const userId = session.metadata?.userId;
    const priceId = sessionWithItems.line_items?.data?.[0]?.price?.id;

    // Map price IDs to credit amounts
    const creditMap = {
      'price_1RgnmiCW3AW4tR76IWSrRht4': 10,
      // add other price mappings here
    };
    const creditsToAdd = creditMap[priceId] || 0;

    if (userId && creditsToAdd > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ credits: supabase.raw('credits + ?', [creditsToAdd]) })
        .eq('id', userId);

      if (error) {
        console.error('Error updating credits:', error.message);
        return { statusCode: 500, body: 'Failed to update user credits' };
      }

      console.log(`Credited user ${userId} with ${creditsToAdd} credits.`);
    } else {
      console.warn('No credits to add or invalid user/price:', { userId, priceId });
    }
  }

  // Return a 200 to acknowledge receipt of the event
  return { statusCode: 200, body: '✅ Webhook received' };
};
