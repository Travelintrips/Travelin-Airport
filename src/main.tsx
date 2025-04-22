import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import "./lib/i18n";

import { TempoDevtools } from "tempo-devtools";

// Only initialize TempoDevtools if Redux DevTools extension is available
// This prevents the warning when the extension is not installed
if (
  typeof window !== "undefined" &&
  (window as any).__REDUX_DEVTOOLS_EXTENSION__
) {
  TempoDevtools.init();
}

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
