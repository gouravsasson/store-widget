import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WidgetProvider } from "./constexts/WidgetContext";
import "./index.css";

class ReactWidget extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // Create container for React app
    const container = document.createElement("div");
    container.setAttribute("class", "widget-container");

    // Create stylesheet link for Tailwind and custom styles
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = "/react-widget-uv.css";

    // Append to shadow DOM
    this.shadow.appendChild(styleLink);
    this.shadow.appendChild(container);

    // Get attributes for WidgetProvider
    const agent_id = this.getAttribute("agent_id") || "";
    const schema = this.getAttribute("schema") || "";
    const type = this.getAttribute("type") || "";

    // Create React root and render
    this.root = ReactDOM.createRoot(container);
    this.root.render(
      <React.StrictMode>
        <WidgetProvider agent_id={agent_id} schema={schema} type={type}>
          <App />
        </WidgetProvider>
      </React.StrictMode>
    );
  }

  disconnectedCallback() {
    // Cleanup React root
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

// Define custom element
customElements.define("react-widget-uv", ReactWidget);
