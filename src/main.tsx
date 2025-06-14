import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import "./lib/i18n";
import { supabase } from "./lib/supabase";

import { TempoDevtools } from "tempo-devtools";

// Inisialisasi TempoDevtools hanya jika Redux DevTools tersedia
if (
  typeof window !== "undefined" &&
  (window as any).__REDUX_DEVTOOLS_EXTENSION__
) {
  TempoDevtools.init();
}

// Removed redundant global auth listener to prevent repeated authentication checks

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
