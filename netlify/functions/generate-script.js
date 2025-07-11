// netlify/functions/generate-script.js

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const Sentry = require("@sentry/node");

// Init Sentry (logs erreurs serveur)
Sentry.init({ dsn: process.env.SENTRY_DSN });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = Sentry.AWSLambda.wrapHandler(async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { prompt, platform, userId } = body;
  if (!prompt || !platform || !userId) {
    return { statusCode: 400, body: "Missing prompt, platform or userId" };
  }

  // 1) Vérifier crédits
  const { data: profile, error: errFetch } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  if (errFetch) {
    console.error(errFetch);
    return { statusCode: 500, body: "Database error" };
  }
  if ((profile.credits || 0) < 1) {
    return { statusCode: 402, body: "Not enough credits" };
  }

  // 2) Génération IA
  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Vous générez des scripts courts et punchy.",
        },
        {
          role: "user",
          content: `Écris un script ${platform} pour : ${prompt}`,
        },
      ],
    });
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "OpenAI Error" };
  }

  const script = completion.choices?.[0]?.message?.content?.trim();
  if (!script) {
    return { statusCode: 500, body: "Empty response from OpenAI" };
  }

  // 3) Décrémenter crédits
  const { error: errUpdate } = await supabase
    .from("profiles")
    .update({ credits: profile.credits - 1 })
    .eq("id", userId);
  if (errUpdate) {
    console.error(errUpdate);
    return { statusCode: 500, body: "Database update error" };
  }
  // **Nouvelle étape** : compter les scripts du jour
  const { count } = await supabase
    .from("scripts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date().toISOString().slice(0, 10)); // ISO date début du jour

  if (count >= 3) {
    return { statusCode: 429, body: "Daily free quota reached" };
  }
  // 3bis) Enregistrer dans scripts
  const { error: errLog } = await supabase
    .from("scripts")
    .insert({ user_id: userId, prompt, platform, script });
  if (errLog) console.error("Log error:", errLog);

  // 4) Réponse
  return {
    statusCode: 200,
    body: JSON.stringify({ script }),
  };
});
