// netlify/functions/create-checkout.js

/**
 * Fonction Netlify pour créer une session Stripe Checkout.
 * Emplacement : <repo root>/netlify/functions/create-checkout.js
 * Assure-toi d'avoir défini en Variables d'Env. sur Netlify :
 *  - STRIPE_SECRET_KEY
 *  - APP_URL
 */

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Handler pour Netlify Functions.
 * @param {Object} event  - L'événement HTTP (avec body JSON).
 * @returns {Object}      - Une réponse JSON { url } ou une erreur 500.
 */
exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { userId, priceId } = body;
  if (!userId || !priceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing userId or priceId" }),
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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
    console.error("Error in create-checkout:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
