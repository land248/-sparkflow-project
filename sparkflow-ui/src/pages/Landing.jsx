// sparkflow-ui/src/pages/Landing.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 p-4">
      <h1 className="text-4xl font-bold">Bienvenue sur SparkFLOW</h1>
      <p>Générez des scripts punchy pour vos réseaux sociaux en quelques clics.</p>
      <Link to="/app" className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">
        Commencer
      </Link>
      <p className="text-sm text-gray-500">3 scripts gratuits par jour, packs de crédits disponibles.</p>
    </div>
  );
}
