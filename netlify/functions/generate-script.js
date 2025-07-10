// netlify/functions/generate-script.js

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

// Initialise Supabase (service role) & OpenAI
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function (event) {
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

  // 1) Vérifier qu’il reste au moins 1 crédit
  const { data: profile, error: errFetch } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  if (errFetch) {
    console.error("❌ fetch profile:", errFetch);
    return { statusCode: 500, body: "Database error" };
  }
  if ((profile.credits || 0) < 1) {
    return { statusCode: 402, body: "Not enough credits" };
  }

  // 2) Appel à l’API OpenAI
  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Vous êtes un assistant qui génère des scripts courts et punchy." },
        { role: "user", content: `Écris un script ${platform} pour : ${prompt}` }
      ],
    });
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    return { statusCode: 500, body: "OpenAI Error" };
  }

  const script = completion.choices?.[0]?.message?.content?.trim();
  if (!script) {
    return { statusCode: 500, body: "Empty response from OpenAI" };
  }

  // 3) Décrémente 1 crédit
  const { error: errUpdate } = await supabase
    .from("profiles")
    .update({ credits: profile.credits - 1 })
    .eq("id", userId);
  if (errUpdate) {
    console.error("❌ update credits:", errUpdate);
    return { statusCode: 500, body: "Database update error" };
  }

  // 4) OK, renvoie le script
  return {
    statusCode: 200,
    body: JSON.stringify({ script })
  };
};
