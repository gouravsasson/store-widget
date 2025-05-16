// widget-container.ts - This is the entry point used in the main application
class ReactWidgetContainer extends HTMLElement {
    private iframe: HTMLIFrameElement | null = null;
    private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
    private readyCallback: (() => void) | null = null;
    
    static get observedAttributes() {
      return ['agent_id', 'schema', 'type'];
    }
    
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    
    connectedCallback() {
      // Create container for the iframe with positioning
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.height = '100%';
      
      // Create iframe to host our widget
      const iframe = document.createElement('iframe');
      iframe.style.border = 'none';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.backgroundColor = 'transparent';
      iframe.title = 'Support Widget';
      iframe.allow = 'camera; microphone; display-capture'; // Permissions for WebRTC
      
      // Transfer attributes to iframe via URL params
      const agent_id = this.getAttribute("agent_id") || "";
      const schema = this.getAttribute("schema") || "";
      const type = this.getAttribute("type") || "";
      
      // Set the iframe source with parameters
      const params = new URLSearchParams();
      params.set('agent_id', agent_id);
      params.set('schema', schema);
      params.set('type', type);
      
      // You can either:
      // 1. Host the widget HTML on a separate domain
      iframe.src = `https://store-widget.vercel.app/widget.html?${params.toString()}`;
      
      // Add iframe to container
      container.appendChild(iframe);
      this.shadowRoot?.appendChild(container);
      this.iframe = iframe;
      
      // Set up communication channel with iframe
      window.addEventListener('message', this.handleMessage);
      
      // Create a loading indicator that we'll remove when the widget is ready
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'widget-loading';
      loadingIndicator.style.position = 'absolute';
      loadingIndicator.style.top = '0';
      loadingIndicator.style.left = '0';
      loadingIndicator.style.width = '100%';
      loadingIndicator.style.height = '100%';
      loadingIndicator.style.display = 'flex';
      loadingIndicator.style.alignItems = 'center';
      loadingIndicator.style.justifyContent = 'center';
      loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
      loadingIndicator.textContent = 'Loading widget...';
      container.appendChild(loadingIndicator);
      
      // Create a reconnection helper that will appear if the connection is lost
      const reconnectHelper = document.createElement('div');
      reconnectHelper.id = 'widget-reconnect';
      reconnectHelper.style.position = 'absolute';
      reconnectHelper.style.top = '0';
      reconnectHelper.style.left = '0';
      reconnectHelper.style.width = '100%';
      reconnectHelper.style.height = '100%';
      reconnectHelper.style.display = 'none';
      reconnectHelper.style.flexDirection = 'column';
      reconnectHelper.style.alignItems = 'center';
      reconnectHelper.style.justifyContent = 'center';
      reconnectHelper.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      
      const reconnectMessage = document.createElement('p');
      reconnectMessage.textContent = 'Connection lost. Please wait while we reconnect...';
      
      const reconnectButton = document.createElement('button');
      reconnectButton.textContent = 'Reconnect manually';
      reconnectButton.style.marginTop = '10px';
      reconnectButton.style.padding = '8px 16px';
      reconnectButton.style.borderRadius = '4px';
      reconnectButton.style.backgroundColor = '#007bff';
      reconnectButton.style.color = 'white';
      reconnectButton.style.border = 'none';
      reconnectButton.style.cursor = 'pointer';
      reconnectButton.addEventListener('click', () => this.refreshIframe());
      
      reconnectHelper.appendChild(reconnectMessage);
      reconnectHelper.appendChild(reconnectButton);
      container.appendChild(reconnectHelper);
    }
    
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
      if (oldValue === newValue) return;
      
      // If any of our observed attributes change, update the iframe src
      if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.postMessage({
          type: 'UPDATE_CONFIG',
          data: {
            [name]: newValue
          }
        }, '*');
      }
    }
    
    handleMessage = (event: MessageEvent) => {
      // Handle messages from the iframe
      if (event.origin === 'https://store-widget.vercel.app') {
        const { type, data } = event.data;
        
        switch (type) {
          case 'WIDGET_READY':
            // Widget is ready, remove loading indicator
            this.connectionStatus = 'connected';
            const loadingIndicator = this.shadowRoot?.getElementById('widget-loading');
            if (loadingIndicator) {
              loadingIndicator.style.display = 'none';
            }
            
            // Call ready callback if it exists
            if (this.readyCallback) {
              this.readyCallback();
            }
            
            // Dispatch ready event
            this.dispatchEvent(new CustomEvent('ready', {
              bubbles: true,
              composed: true,
              detail: data
            }));
            break;
            
          case 'CONNECTION_LOST':
            this.connectionStatus = 'disconnected';
            // Show reconnect helper
            const reconnectHelper = this.shadowRoot?.getElementById('widget-reconnect');
            if (reconnectHelper) {
              reconnectHelper.style.display = 'flex';
            }
            
            // Dispatch connection lost event
            this.dispatchEvent(new CustomEvent('connectionlost', {
              bubbles: true,
              composed: true,
              detail: data
            }));
            
            // Attempt auto-reconnect
            setTimeout(() => this.refreshIframe(), 5000);
            break;
            
          case 'WIDGET_EVENT':
            // Pass along any events from the widget
            this.dispatchEvent(new CustomEvent('widgetevent', {
              bubbles: true,
              composed: true,
              detail: data
            }));
            break;
        }
      }
    };
    
    disconnectedCallback() {
      // Remove message listener when container is removed
      window.removeEventListener('message', this.handleMessage);
    }
    
    // Public methods that can be called by the parent application
    
    /**
     * Refresh the iframe to restart the widget
     */
    refreshIframe() {
      if (this.iframe) {
        const src = this.iframe.src;
        this.iframe.src = 'about:blank';
        setTimeout(() => {
          if (this.iframe) {
            this.iframe.src = src;
          }
        }, 100);
      }
    }
    
    /**
     * Send a message to the widget
     */
    sendMessage(message: any) {
      if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.postMessage(message, 'https://store-widget.vercel.app');
      }
    }
    
    /**
     * Get the current connection status
     */
    getConnectionStatus() {
      return this.connectionStatus;
    }
    
    /**
     * Set a callback to be called when the widget is ready
     */
    onReady(callback: () => void) {
      this.readyCallback = callback;
      
      // If already ready, call immediately
      if (this.connectionStatus === 'connected') {
        callback();
      }
    }
  }
  
  customElements.define("react-widget-uv", ReactWidgetContainer);
  
  // Export a global function to initialize the widget programmatically if needed
  (window as any).initReactWidget = function(
    elementId: string, 
    config: {
      agent_id?: string;
      schema?: string;
      type?: string;
      onReady?: () => void;
    }
  ) {
    const container = document.getElementById(elementId);
    if (container) {
      const widget = document.createElement('react-widget-uv') as ReactWidgetContainer;
      
      // Set attributes
      if (config.agent_id) widget.setAttribute('agent_id', config.agent_id);
      if (config.schema) widget.setAttribute('schema', config.schema);
      if (config.type) widget.setAttribute('type', config.type);
      
      // Set ready callback if provided
      if (config.onReady) {
        widget.onReady(config.onReady);
      }
      
      container.appendChild(widget);
      return widget;
    }
    return null;
  };