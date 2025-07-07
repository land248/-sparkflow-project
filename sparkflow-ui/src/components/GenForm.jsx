// src/components/GenForm.jsx
import React, { useState, useEffect } from "react";
import { Sparkles, Video, Send, FileText, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const APP_URL = import.meta.env.VITE_APP_URL;

export default function GenForm() {
  // ─── Auth & User ─────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const email = prompt("Entrez votre email :");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { redirectTo: APP_URL }
    });
    if (error) alert(error.message);
    else alert("🔗 Vérifiez votre boîte mail pour vous connecter !");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // ─── Credits ───────────────────────────────────────────────────────
  const [credits, setCredits] = useState(0);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setCredits(data.credits);
      });
  }, [user]);

  // ─── Refresh credits on successful payment ───────────────────────────
  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("success") === "1") {
      supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) setCredits(data.credits);
        });
      // clean URL
      url.searchParams.delete("success");
      window.history.replaceState(null, "", url.toString());
    }
  }, [user]);

  // ─── Form State & Handlers ─────────────────────────────────────────
  const [formData, setFormData] = useState({ text: "", platform: "TikTok" });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (credits <= 0) {
      alert("Plus de crédits disponibles. Merci d'en acheter.");
      return;
    }
    setIsLoading(true);
    setResult("");
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Tu es un expert en marketing de vidéos courtes. Génère un script accrocheur." },
            { role: "user", content: `Plateforme : ${formData.platform}\nTexte : ${formData.text}` }
          ],
          temperature: 0.7
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { choices } = await res.json();
      const content = choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Aucune réponse générée");
      setResult(content);
      const { error } = await supabase
        .from("profiles")
        .update({ credits: credits - 1 })
        .eq("id", user.id);
      if (!error) setCredits(c => c - 1);
    } catch (err) {
      console.error("Erreur génération :", err);
      setResult("Une erreur est survenue lors de la génération.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Stripe Purchase ───────────────────────────────────────────────
  const handlePurchase = async () => {
    const stripe = await stripePromise;
    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, priceId: "price_1RgnmiCW3AW4tR76IWSrRht4" })
    });
    if (!res.ok) {
      alert("Erreur lors de la création de la session de paiement.");
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  };

  // ─── Render ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <button onClick={handleLogin} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Générateur de Scripts</h1>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Credits */}
      <div className="w-full max-w-2xl bg-white p-4 rounded-xl shadow mb-4 flex justify-between">
        <span>Crédits restants :</span>
        <span className="font-semibold text-green-600">{credits}</span>
      </div>

      {/* Purchase */}
      <div className="w-full max-w-2xl mb-8">
        <button onClick={handlePurchase} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg">
          Acheter 10 crédits – 5 €
        </button>
      </div>

      {/* Form */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Texte */}
          <div className="flex flex-col">
            <label htmlFor="text" className="flex items-center gap-1 mb-2">
              <FileText className="w-5 h-5" /> Texte principal
            </label>
            <textarea
              id="text"
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              rows={4}
              required
              className="w-full border rounded-xl p-3 focus:ring-2"
              placeholder="Entrez votre idée ou message..."
            />
          </div>

          {/* Plateforme */}
          <div className="flex flex-col">
            <label htmlFor="platform" className="flex items-center gap-1 mb-2">
              <Video className="w-5 h-5" /> Plateforme cible
            </label>
            <select
              id="platform"
              name="platform"
              value={formData.platform}
              onChange={handleInputChange}
              className="w-full border rounded-xl p-3 focus:ring-2"
            >
              <option value="TikTok">TikTok</option>
              <option value="Reels">Instagram Reels</option>
              <option value="Shorts">YouTube Shorts</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !formData.text.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white py-3 rounded-lg flex justify-center items-center gap-2"
          >
            {isLoading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Send className="w-5 h-5" />}
            {!isLoading && 'Générer le script'}
          </button>
        </form>

        {/* Résultat */}
        {result && (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200 space-y-4">
            <h2 className="flex items-center gap-2 text-green-800 font-semibold">
              <Sparkles className="w-5 h-5" /> Script généré
            </h2>
            <pre className="whitespace-pre-wrap text-gray-800 bg-white p-4 rounded-md border border-green-100">{result}</pre>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg"
            >
              Copier le script
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
