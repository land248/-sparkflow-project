// netlify/functions/stripe-webhook.js

const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

// Initialise Stripe & Supabase
const stripe = Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' })
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

exports.handler = async function (event) {
  console.log('➡️ Webhook reçu:', event.httpMethod, event.path)
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // 1) Parse & verify
  let stripeEvent
  if (process.env.NODE_ENV === 'production') {
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature']
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
      console.log('✅ Signature Stripe validée (prod), event =', stripeEvent.type)
    } catch (err) {
      console.error('❌ Échec validation signature:', err.message)
      return { statusCode: 400, body: `Webhook Error: ${err.message}` }
    }
  } else {
    console.warn('⚠️ [dev] Skip signature verification')
    try {
      stripeEvent = JSON.parse(event.body)
    } catch (err) {
      console.error('❌ JSON invalide:', err.message)
      return { statusCode: 400, body: 'Invalid JSON' }
    }
  }

  // 2) Gère `checkout.session.completed`
  if (stripeEvent.type === 'checkout.session.completed') {
    // récupère l'objet bare (id seulement) puis fetch complet
    const obj = stripeEvent.data.object
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(obj.id, {
        expand: ['line_items.data.price']
      })
    } catch (err) {
      console.error('❌ Impossible de récupérer la session:', err.message)
      return { statusCode: 500, body: err.message }
    }

    const userId  = session.metadata?.userId
    const priceId = session.line_items?.data?.[0]?.price?.id
    console.log('🔥 checkout.session.completed →', { session: session.id, userId, priceId })

    if (!userId) {
      console.error('⚠️ Pas de userId dans metadata, skip.')
      return { statusCode: 400, body: 'No userId' }
    }

    // 3) Détermine le nombre de crédits à ajouter
    let creditsToAdd = 0
    if (priceId === 'price_1RgnmiCW3AW4tR76IWSrRht4') creditsToAdd = 10
    // ← ajouter d'autres `if (priceId === 'price_XXX') creditsToAdd = YYY`

    if (creditsToAdd <= 0) {
      console.log('ℹ️ priceId inconnu, aucun crédit ajouté.')
      return { statusCode: 200, body: 'OK' }
    }

    // 4) Lit les crédits existants
    const { data: profile, error: errSelect } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    if (errSelect) {
      console.error('❌ Échec lecture credits:', errSelect.message)
      return { statusCode: 500, body: errSelect.message }
    }

    const newCredits = (profile.credits || 0) + creditsToAdd

    // 5) Met à jour
    const { error: errUpdate } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId)

    if (errUpdate) {
      console.error('❌ Échec mise à jour credits:', errUpdate.message)
      return { statusCode: 500, body: errUpdate.message }
    }

    console.log(`✅ Ajout de ${creditsToAdd} crédits à ${userId} — total maintenant : ${newCredits}`)
  } else {
    console.log('ℹ️ Événement Stripe ignoré :', stripeEvent.type)
  }

  return { statusCode: 200, body: 'OK' }
}
