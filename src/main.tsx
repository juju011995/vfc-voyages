import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./theme/ThemeProvider";
import { SettingsProvider } from "./settings/SettingsProvider";
import { PinGate } from "./auth/PinGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <PinGate>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </PinGate>
    </ThemeProvider>
  </StrictMode>,
);
