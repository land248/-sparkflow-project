// sparkflow-ui/src/components/AuthForm.jsx

import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success("Lien de connexion envoyé !");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-sm mx-auto p-6 bg-white dark:bg-gray-700 rounded-xl shadow space-y-4"
      >
        <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-gray-100">Connexion</h2>
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          disabled={loading}
        />
        <button
          onClick={handleLogin}
          disabled={loading || !email.includes("@")}
          className={`w-full p-2 rounded text-white ${
            loading || !email.includes("@")
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Envoi …" : "Se connecter"}
        </button>
      </motion.div>
    </>
  );
}
