import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateConfiguration } from "./utils/config-validator";

// Validate configuration on startup
Promise.race([
  validateConfiguration(),
  new Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>(
    (resolve) =>
      setTimeout(
        () =>
          resolve({
            isValid: true,
            errors: [],
            warnings: ["Configuration validation timed out"],
          }),
        5000
      )
  ),
]).then((validation) => {
  if (!validation.isValid) {
    // Show error overlay in development
    if (import.meta.env.DEV) {
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff0000;
        color: white;
        padding: 20px;
        z-index: 9999;
        font-family: monospace;
      `;
      errorDiv.innerHTML = `
        <h2>Configuration Error</h2>
        <ul>${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul>
        <p>Check your .env.local file and Supabase configuration</p>
      `;
      document.body.prepend(errorDiv);
    }
  }

  if (validation.warnings.length > 0) {
    console.warn("Configuration warnings:", validation.warnings);
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
