import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { WidgetProvider } from "./constexts/WidgetContext.tsx";

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <WidgetProvider
    agent_id="8bb086ce-0bfa-4fa1-a409-034980c2d914"
    schema="80ff7fe6-6ea0-478e-b3d6-5690c2d26e0c"
    type="customwidget"
  >
    <App />
  </WidgetProvider>
  // </StrictMode>,
);
