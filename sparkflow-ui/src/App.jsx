// sparkflow-ui/src/App.jsx

import React from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthForm from "./components/AuthForm";
import GenForm from "./components/GenForm";
import Landing from "./pages/Landing";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export default function App() {
  const session = useSession();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow p-4">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route 
            path="/app" 
            element={session ? <GenForm /> : <Navigate to="/" />} 
          />
          {/* On peut ajouter auth callback si nécessaire */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
