import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/main.scss";
import "../styles/shared-components.scss";
import "./participant.scss";
import { App } from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
