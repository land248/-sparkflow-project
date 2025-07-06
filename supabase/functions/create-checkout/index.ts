// supabase/functions/create-checkout/index.ts

// 1. Stripe pour Deno (utilise stripe_deno, officiel pour Edge/Deno)
import Stripe from "https://deno.land/x/stripe_deno@1.4.0/mod.ts";

// 2. Serveur HTTP Deno
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Instancie Stripe avec ta clé secrète
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

// Démarre le serveur Edge
serve(async (req) => {
  try {
    // On attend un POST JSON { userId, priceId }
    const { userId, priceId } = await req.json();

    // Crée la session Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${Deno.env.get("APP_URL")}?success=1`,
      cancel_url: `${Deno.env.get("APP_URL")}?canceled=1`,
      metadata: { userId },
    });

    // Renvoie l’URL de redirection
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in create-checkout:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
