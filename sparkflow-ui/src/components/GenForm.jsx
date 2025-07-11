// sparkflow-ui/src/components/GenForm.jsx

import React, { useState, useEffect } from "react";
import { useSession, useUser } from "@supabase/auth-helpers-react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function GenForm() {
  const session = useSession();
  const user = useUser();
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("TikTok");
  const [script, setScript] = useState("");
  const [credits, setCredits] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Récupère crédits et historique
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p, error: errP } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();
      if (!errP) setCredits(p.credits);

      const { data: h } = await supabase
        .from("scripts")
        .select("prompt,platform,script,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setHistory(h || []);
    })();
  }, [user]);

  const handleGenerate = async () => {
    if (!session) return;
    if (credits < 1) {
      toast.error("Vous n’avez plus de crédits. Achetez-en pour continuer.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, platform, userId: user.id }),
      });
      if (res.status === 402) throw new Error("Not enough credits");
      if (res.status === 429) {
        throw new Error("Quota gratuit atteint (3/jour).");
      }
      if (!res.ok) throw new Error(await res.text());

      const { script: newScript } = await res.json();
      setScript(newScript);
      toast.success("Script généré !");

      // Met à jour crédits
      const { data: p } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();
      setCredits(p.credits);

      // Mise à jour locale de l'historique
      setHistory((prev) =>
        [
          {
            prompt,
            platform,
            script: newScript,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 5),
      );
    } catch (err) {
      console.error(err);
      if (err.message.includes("Quota")) {
        toast.error(err.message);
      } else if (err.message.includes("Not enough")) {
        toast.error("Crédits épuisés");
      } else {
        toast.error("Erreur génération. Réessayez plus tard.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <p className="text-center text-gray-700 dark:text-gray-300">
        Connectez‑vous pour générer un script.
      </p>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow space-y-4"
      >
        <p className="text-gray-800 dark:text-gray-100">
          <strong>Crédits restants : </strong>
          {credits ?? "…"}
        </p>

        <textarea
          placeholder="Entrez votre idée ou message..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-24"
          disabled={loading}
        />

        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          disabled={loading}
        >
          <option>TikTok</option>
          <option>YouTube</option>
          <option>Instagram</option>
        </select>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim() || credits < 1}
          className={`w-full p-2 rounded text-white ${
            loading || !prompt.trim() || credits < 1
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Génération …" : "Générer le script"}
        </button>

        {script && (
          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {script}
          </pre>
        )}

        {history.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Clock size={20} /> Historique
            </h3>
            <ul className="space-y-2">
              {history.map((h) => (
                <motion.li
                  key={h.created_at}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-900 dark:text-gray-100"
                >
                  <p className="italic text-sm">
                    {h.prompt} – {h.platform}
                  </p>
                  <pre className="whitespace-pre-wrap">{h.script}</pre>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(h.created_at).toLocaleString()}
                  </p>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </>
  );
}
