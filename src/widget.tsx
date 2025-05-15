import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WidgetProvider } from "./constexts/WidgetContext"; // Corrected typo in context
import "./index.css";

class ReactWidget extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private isMounted: boolean = false; // Track if widget is already mounted

  constructor() {
    super();
    // Attach Shadow DOM only once during construction
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // Prevent re-initialization if already mounted
    if (this.isMounted) {
      return;
    }

    const container = document.createElement("div");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://store-widget.vercel.app/react-widget-uv.css";

    // Append stylesheet and container to Shadow DOM
    this.shadowRoot?.appendChild(link);
    this.shadowRoot?.appendChild(container);

    // Get attributes
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

    // Mark as mounted
    this.isMounted = true;
  }

  // Observe attribute changes to update widget if needed
  static get observedAttributes() {
    return ["agent_id", "schema", "type"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    // Only update if the widget is mounted and the value has changed
    if (this.isMounted && oldValue !== newValue) {
      // Optionally, update context values without re-rendering the entire widget
      // This requires WidgetProvider to handle dynamic updates (e.g., via state or props)
      // For simplicity, you can re-render with new props, but memoize App to prevent unnecessary updates
      if (this.root) {
        this.root.render(
          <React.StrictMode>
            <WidgetProvider
              agent_id={this.getAttribute("agent_id") || ""}
              schema={this.getAttribute("schema") || ""}
              type={this.getAttribute("type") || ""}
            >
              <App />
            </WidgetProvider>
          </React.StrictMode>
        );
      }
    }
  }

  disconnectedCallback() {
    // Only unmount if explicitly removed from DOM
    if (this.root) {
      this.root.unmount();
      this.root = null;
      this.isMounted = false;
    }
  }
}

// Define custom element only if not already defined
if (!customElements.get("react-widget-uv")) {
  customElements.define("react-widget-uv", ReactWidget);
}