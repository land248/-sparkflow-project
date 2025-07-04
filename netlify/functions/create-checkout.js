// netlify/functions/create-checkout.js
import Stripe from 'stripe';

// Initialise Stripe avec ta clé secrète (définie en variable Netlify)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

export async function handler(event) {
  try {
    const { userId, priceId } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}?success=1`,
      cancel_url: `${process.env.APP_URL}?canceled=1`,
      metadata: { userId },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('create-checkout error', err);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
}
