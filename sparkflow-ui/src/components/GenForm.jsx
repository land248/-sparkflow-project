// src/components/GenForm.jsx
import React, { useState, useEffect } from 'react';
import { Sparkles, Video, Send, FileText, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';


export default function GenForm() {
  // --- Auth & user state ---
  const [user, setUser] = useState(null);
  useEffect(() => {
    // Fetch initial user
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // --- Credits state ---
  const [credits, setCredits] = useState(0);
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) setCredits(data.credits);
        });
    }
  }, [user]);

  // --- Form state ---
  const [formData, setFormData] = useState({ text: '', platform: 'TikTok' });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  // --- Handlers ---
  const handleLogin = async () => {
    const email = prompt('Entrez votre email :');
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    error ? alert(error.message) : alert('Vérifiez votre boîte mail pour vous connecter !');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  // 1️⃣ Protection crédits
  if (credits <= 0) {
    alert("Plus de crédits disponibles. Merci d'en acheter.");
    return;
  }

  setIsLoading(true);
  setResult('');

  try {
    // 2️⃣ Appel OpenAI en fetch pur
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Tu es un expert en marketing vidéo court sur TikTok, Reels et Shorts. Génére des scripts captivants à partir de l’idée fournie.'
          },
          {
            role: 'user',
            content: `Plateforme : ${formData.platform}\nTexte : ${formData.text}`
          }
        ],
        temperature: 0.7
      })
    });

    // 3️⃣ Gestion CORS / erreur HTTP
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    // 4️⃣ Récupérer la réponse ou gérer l’absence de choix
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Aucune réponse générée');
    }
    setResult(content);

    // 5️⃣ Décrémenter le crédit
    const { error } = await supabase
      .from('profiles')
      .update({ credits: credits - 1 })
      .eq('id', user.id);

    if (error) {
      console.error('Erreur décrément credits:', error.message);
    } else {
      setCredits((c) => c - 1);
    }
  } catch (err) {
    console.error('Erreur pendant la génération:', err);
    setResult('Une erreur est survenue lors de la génération.');
  } finally {
    setIsLoading(false);
  }
};

    

  // Helper icon
  const platformIcon = () => <Video className="w-5 h-5" />;

  // --- Render ---
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex flex-col items-center py-10 px-4">
      {/* Header & Logout */}
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
      <div className="w-full max-w-2xl bg-white p-4 rounded-xl shadow mb-6 flex justify-between items-center">
        <span className="text-gray-700">Crédits restants :</span>
        <span className="text-xl font-semibold text-green-600">{credits}</span>
      </div>

      {/* Form */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input */}
          <div className="flex flex-col">
            <label htmlFor="text" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <FileText className="w-5 h-5 text-gray-600" /> Texte principal
            </label>
            <textarea
              id="text"
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              rows={4}
              placeholder="Entrez votre idée ou message..."
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              required
            />
          </div>

          {/* Select */}
          <div className="flex flex-col">
            <label htmlFor="platform" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              {platformIcon()} Plateforme cible
            </label>
            <select
              id="platform"
              name="platform"
              value={formData.platform}
              onChange={handleInputChange}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
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
            className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {isLoading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Send className="w-5 h-5" />} Générer
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" /> Script généré
            </h2>
            <div className="bg-white rounded-md p-4 border border-green-100">
              <pre className="whitespace-pre-wrap text-gray-800">{result}</pre>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition"
            >
              Copier le script
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
