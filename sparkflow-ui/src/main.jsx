// sparkflow-ui/src/main.jsx

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./lib/ThemeContext";
import { BrowserRouter } from "react-router-dom";
import { createBrowserHistory } from "history";
import { supabase } from "./lib/supabase";
import "./index.css";

const history = createBrowserHistory();

async function handleMagicLink() {
  const { data, error } = await supabase.auth.getSessionFromUrl({
    redirectTo: window.location.origin + "/app",
  });
  // si on a une session valide, on navigue vers /app
  if (data?.session) {
    history.push("/app");
  }
}

handleMagicLink(); // appelé dès le chargement

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <BrowserRouter history={history}>
      <App />
    </BrowserRouter>
  </ThemeProvider>,
);
