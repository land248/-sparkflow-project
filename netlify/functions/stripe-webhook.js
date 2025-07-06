// netlify/functions/stripe-webhook.js
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil'
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const signature = event.headers['stripe-signature']
  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  // On ne gère que checkout.session.completed
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object

    const userId = session.metadata.userId
    // priceId → combien de crédits ajouter selon ta config
    const price = session.line_items?.[0]?.price?.id
    let creditsToAdd = 0
    if (price === 'price_1RgnmiCW3AW4tR76IWSrRht4') creditsToAdd = 10
    // ajoute d’autres prix ici si besoin

    if (userId && creditsToAdd > 0) {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: supabase.raw('credits + ?', [creditsToAdd]) })
        .eq('id', userId)
      if (error) console.error('Erreur mise à jour credits:', error.message)
    }
  }

  return { statusCode: 200, body: '✅ Received.' }
}
