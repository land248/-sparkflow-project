// sparkflow-ui/src/components/GenForm.jsx

import React, { useState, useEffect } from "react";
import { useSession, useUser } from "@supabase/auth-helpers-react";
import { supabase } from "../lib/supabase";

export default function GenForm() {
  const session = useSession();
  const user = useUser();
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [script, setScript] = useState("");
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1) Récupère ou crée le profil et initialise les crédits
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error: fetchErr } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();
      if (fetchErr) {
        console.error("Erreur fetch credits:", fetchErr);
        setError("Impossible de récupérer les crédits.");
        return;
      }
      if (!data) {
        const { data: newProf, error: insertErr } = await supabase
          .from("profiles")
          .insert({ id: user.id })
          .single();
        if (insertErr) {
          console.error("Erreur init profil:", insertErr);
          setError("Impossible d'initialiser le profil.");
          return;
        }
        setCredits(newProf.credits);
      } else {
        setCredits(data.credits);
      }
    })();
  }, [user]);

  const handleGenerate = async () => {
    if (!session || !user) {
      setError("Utilisateur non connecté");
      return;
    }
    if (credits < 1) {
      setError("Vous n’avez plus de crédits. Achetez-en pour continuer.");
      return;
    }

    setLoading(true);
    setError(null);
    setScript("");

    try {
      const res = await fetch("/.netlify/functions/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, platform, userId: user.id }),
      });

      if (res.status === 402) {
        throw new Error("Not enough credits");
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erreur ${res.status}`);
      }

      const { script: newScript } = await res.json();
      setScript(newScript);

      // rafraîchis les crédits
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();
      if (profileErr) {
        console.error("Erreur fetch credits:", profileErr);
        setError("Impossible de mettre à jour les crédits.");
      } else {
        setCredits(profile.credits);
      }
    } catch (err) {
      console.error("Erreur génération ou crédits :", err);
      if (err.message === "Not enough credits") {
        setError("Vous n’avez plus de crédits. Achetez-en pour continuer.");
      } else {
        setError("Erreur serveur génération. Réessayez plus tard.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <p className="text-center">
        Connectez‑vous pour générer un script.
      </p>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      <h2 className="text-xl font-semibold">Générateur de Scripts</h2>
      <p>
        <strong>Crédits restants :</strong>{" "}
        {credits == null ? "…" : credits}
      </p>
      {error && (
        <p className="text-red-600">{error}</p>
      )}

      <textarea
        placeholder="Entrez votre idée ou message..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full p-2 border rounded h-24"
        disabled={loading}
      />

      <select
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        className="w-full p-2 border rounded"
        disabled={loading}
      >
        <option>TikTok</option>
        <option>YouTube</option>
        <option>Instagram</option>
      </select>

      <button
        onClick={handleGenerate}
        disabled={loading || credits < 1 || prompt.trim() === ""}
        className={`w-full p-2 rounded text-white ${
          loading || credits < 1 || prompt.trim() === ""
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {loading ? "Génération…" : "Générer le script"}
      </button>

      {script && (
        <div className="pt-4">
          <h3 className="font-semibold">Script généré</h3>
          <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap">
            {script}
          </pre>
        </div>
      )}
    </div>
  );
}
