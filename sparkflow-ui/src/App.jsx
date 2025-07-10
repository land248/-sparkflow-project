// sparkflow-ui/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import React from "react";
import { useSession } from "@supabase/auth-helpers-react";
import AuthForm from "./components/AuthForm";
import GenForm from "./components/GenForm";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

export default function App() {
  const session = useSession();
  return (
    <BrowserRouter>
      <Header/>
      <main className="flex-grow p-4">
        <Routes>
          <Route path="/" element={<Landing/>}/>
          <Route path="/app" element={session ? <GenForm/> : <AuthForm/>}/>
        </Routes>
      </main>
      <Footer/>
    </BrowserRouter>
  );
}