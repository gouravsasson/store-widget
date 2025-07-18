import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Send,
  X,
  Minimize2,
  Pause,
  Loader2,
  User,
  Mail,
  Volume2,
  VolumeX,
} from "lucide-react";
import axios from "axios";
import { UltravoxSession } from "ultravox-client";
import { useWidgetContext } from "../constexts/WidgetContext";
import useSessionStore from "../store/session";
import { useUltravoxStore } from "../store/ultrasession";
import logo from "../assets/logo.png";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

export interface WidgetTheme {
  widget_theme: {
    bot_auto_start: boolean;
    bot_position: string;
    bot_logo: string | null;
    svg_logo: string | null;
    bot_height: string;
    bot_width: string;
    bot_show_transcript: boolean;
    bot_show_chat: boolean;
    bot_mute_on_tab_change: boolean;
    bot_mute_on_minimize: boolean;
    bot_bubble_color: string;
    bot_background_color: string;
    bot_icon_color: string;
    bot_text_color: string;
    bot_border_color: string;
    bot_button_color: string;
    bot_button_text_color: string;
    bot_button_hover_color: string;
    bot_status_bar_color: string;
    bot_status_bar_text_color: string;
    bot_animation_color: string;
    bot_name: string;
    bot_show_form: boolean;
  };
}

const CustomWidget = () => {
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme | null>(null);
  const countryCode = localStorage.getItem("countryCode");
  const continentcode = localStorage.getItem("continentcode");
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const containerRef = useRef(null);
  const [isGlowing, setIsGlowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speech, setSpeech] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [auto_end_call, setAutoEndCall] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pulseEffects, setPulseEffects] = useState({
    small: false,
    medium: false,
    large: false,
  });
  const [message, setMessage] = useState("");
  const [productUrls, setProductUrls] = useState<string[]>([]);
  const [iframeErrors, setIframeErrors] = useState<{ [key: number]: boolean }>({});
  const hasReconnected = useRef(false);
  const hasClosed = useRef(false);
  const { callSessionIds, setCallSessionIds } = useSessionStore();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const {
    setSession,
    transcripts,
    setTranscripts,
    isListening,
    setIsListening,
    status,
    setStatus,
  } = useUltravoxStore();
  const {agent_id,schema}=useWidgetContext()
  const baseurl = "https://shop.snowie.ai";
  // const agent_id = "6510fa25-8cd4-46f3-88d6-12a47bde1cba";
  // const schema = "manant123";
  let existingCallSessionIds: string[] = [];
  const AutoStartref = useRef(false);
  const storedIds = localStorage.getItem("callSessionId");
  const debugMessages = new Set(["debug"]);
  const onlyOnce = useRef(false);
  const [showform, setShowform] = useState(false);
const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (widgetRef.current && !widgetRef.current.shadowRoot) {
      // Attach Shadow DOM
      const shadow = widgetRef.current.attachShadow({ mode: "open" });

      // Create a container for the widget content
      const container = document.createElement("div");
      shadow.appendChild(container);

      // Optionally, load your stylesheet into the Shadow DOM
      const styleLink = document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = "https://store-widget.vercel.app/react-widget-uv.css";
      shadow.appendChild(styleLink);

      // Render widget content into the shadow container
      // (React rendering into Shadow DOM requires a library like `react-shadow-dom`)
      // Alternatively, move all styles to inline or a separate CSS file loaded here
    }
  }, []);
  // Function to check if buttons exist and create them if they don't
  const checkAndCreateButtons = async (product_url: string) => {
    try {
      // GET request to check if buttons exist
      const getResponse = await axios.get(
        `${baseurl}/api/shopify/product-page-button/`,
        {
          params: {
            schema_name: schema,
            product_url: product_url,
          },
        }
      );

      const buttonsExist = getResponse.data.buttons_exist; 

      if (!buttonsExist) {
        // POST request to create buttons
        await axios.post(
          `${baseurl}/api/shopify/product-page-button/`,
          {
            schema_name: schema,
            product_url: product_url,
            product_page_button_id_text: "ProductSubmitButton-template--24466834784574__main",
          },
          {
            headers: {
              "Content-Type": "application/json",
              Cookie: "csrftoken=xjHalmQklLKzhpPd4nXCHyRofqj8RUFC",
            },
          }
        );
        console.log("Buttons created successfully for product:", product_url);
      } else {
        console.log("Buttons already exist for product:", product_url);
      }
    } catch (error) {
      console.error("Error in checkAndCreateButtons:", error);
    }
  };

  useEffect(() => {
    if (widgetTheme?.bot_show_form) {
      setShowform(true);
    }
  }, [widgetTheme?.bot_show_form]);

  useEffect(() => {
    if (onlyOnce.current) return;
    const getWidgetTheme = async () => {
      try {
        const response = await axios.get(
          `${baseurl}/api/thunder-widget-settings/${schema}/${agent_id}/`
        );
        const data = response.data.response;
        setWidgetTheme(data);
        onlyOnce.current = true;
      } catch (error) {
        console.error("Failed to fetch widget theme:", error);
      }
    };
    getWidgetTheme();
  }, []);

  useEffect(() => {
    if (status === "disconnected") {
      setSpeech(`Talk To ${widgetTheme?.bot_name}`);
    } else if (status === "connecting") {
      setSpeech(`Connecting To ${widgetTheme?.bot_name}`);
    } else if (status === "speaking") {
      setSpeech(`${widgetTheme?.bot_name} is Speaking`);
      setExpanded(true);
    } else if (status === "connected") {
      setSpeech(`Connected To ${widgetTheme?.bot_name}`);
    } else if (status === "disconnecting") {
      setSpeech(`Ending Conversation With ${widgetTheme?.bot_name}`);
    } else if (status === "listening") {
      setSpeech(`${widgetTheme?.bot_name} is Listening`);
    }
  }, [status]);

  useEffect(() => {
    if (widgetTheme?.bot_mute_on_tab_change) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          session.muteSpeaker();
          setIsMuted(true);
        } else if (document.visibilityState === "visible") {
          session.unmuteSpeaker();
          setIsMuted(false);
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [widgetTheme?.bot_mute_on_tab_change]);

  const sessionRef = useRef<UltravoxSession | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = new UltravoxSession({
      experimentalMessages: debugMessages,
    });
    setSession(sessionRef.current);
  }
  const session = sessionRef.current;

  const handleSubmit = () => {
    if (status !== "disconnected") {
      session.sendText(`${message}`);
      setMessage("");
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem("isRefreshing", "true");
    };
    const clearRefreshFlag = () => {
      sessionStorage.removeItem("isRefreshing");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("load", clearRefreshFlag);
    clearRefreshFlag();
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("load", clearRefreshFlag);
    };
  }, []);

  useEffect(() => {
    if (status === "disconnecting" && !hasClosed.current) {
      const isPageRefresh = sessionStorage.getItem("isRefreshing") === "true";
      if (!isPageRefresh) {
        const callSessionId = JSON.parse(
          localStorage.getItem("callSessionId") || "[]"
        );
        const handleClose = async () => {
          await session.leaveCall();
          const response = await axios.post(
            `${baseurl}/api/shopify/end-call-session-thunder/`,
            {
              call_session_id: callSessionIds,
              schema_name: schema,
              prior_call_ids: callSessionId,
            }
          );
          hasClosed.current = false;
          localStorage.clear();
          setTranscripts(null);
          toggleVoice(false);
          setProductUrls([]);
          setIframeErrors({});
          widgetTheme?.bot_show_form ? setShowform(true) : setShowform(false);
        };
        handleClose();
      }
    }
  }, [status]);

  useEffect(() => {
    const callId = localStorage.getItem("callId");
    if (callId && status === "disconnected" && !hasReconnected.current) {
      setIsMuted(true);
      handleMicClickForReconnect(callId);
      hasReconnected.current = true;
    } else if (status === "listening" && callId && isMuted && !expanded) {
      session.muteSpeaker();
    }
  }, []);

  const handleMicClickForReconnect = async (id) => {
    try {
      const response = await axios.post(
        `${baseurl}/api/shopify/start-thunder/`,
        {
          agent_code: agent_id,
          schema_name: schema,
          prior_call_id: id,
        }
      );
      const wssUrl = response.data.joinUrl;
      const callId = response.data.callId;
      localStorage.setItem("callId", callId);
      setCallSessionIds(response.data.call_session_id);
      if (storedIds) {
        try {
          const parsedIds = JSON.parse(storedIds);
          if (Array.isArray(parsedIds)) {
            existingCallSessionIds = parsedIds;
          }
        } catch (parseError) {
          console.warn("Could not parse callSessionId:", parseError);
          localStorage.removeItem("callSessionId");
        }
      }
      existingCallSessionIds.push(callId);
      localStorage.setItem(
        "callSessionId",
        JSON.stringify(existingCallSessionIds)
      );
      setShowform(false);
      if (wssUrl) {
        session.joinCall(`${wssUrl}`);
      }
    } catch (error) {
      console.error("Error in handleMicClick:", error);
    }
  };

  const handleMicClick = async () => {
    try {
      if (status === "disconnected") {
        const response = await axios.post(
          `${baseurl}/api/shopify/start-thunder/`,
          {
            agent_code: agent_id,
            schema_name: schema,
          }
        );
        const wssUrl = response.data.joinUrl;
        const callId = response.data.callId;
        localStorage.setItem("callId", callId);
        localStorage.setItem("wssUrl", wssUrl);
        setCallSessionIds(response.data.call_session_id);
        setShowform(false);
        if (storedIds) {
          try {
            const parsedIds = JSON.parse(storedIds);
            if (Array.isArray(parsedIds)) {
              existingCallSessionIds = parsedIds;
            }
          } catch (parseError) {
            console.warn("Could not parse callSessionId:", parseError);
            localStorage.removeItem("callSessionId");
          }
        }
        existingCallSessionIds.push(callId);
        localStorage.setItem(
          "callSessionId",
          JSON.stringify(existingCallSessionIds)
        );
        if (wssUrl) {
          session.joinCall(`${wssUrl}`);
          if (AutoStartref.current) {
            session.unmuteSpeaker();
          }
        }
        toggleVoice(true);
      } else {
        const callSessionId = JSON.parse(localStorage.getItem("callSessionId"));
        await session.leaveCall();
        const response = await axios.post(
          `${baseurl}/api/shopify/end-call-session-thunder/`,
          {
            call_session_id: callSessionIds,
            schema_name: schema,
            prior_call_ids: callSessionId,
          }
        );
        setTranscripts(null);
        toggleVoice(false);
        localStorage.clear();
        widgetTheme?.bot_show_form ? setShowform(true) : setShowform(false);
      }
    } catch (error) {
      console.error("Error in handleMicClick:", error);
    }
  };

  useEffect(() => {
    const callId = localStorage.getItem("callId");
    if (widgetTheme?.bot_auto_start && !callId) {
      AutoStartref.current = true;
      handleMicClick();
    }
  }, [widgetTheme?.bot_auto_start]);

  session.addEventListener("transcripts", (event) => {
    const alltrans = session.transcripts;
    let Trans = "";
    for (let index = 0; index < alltrans.length; index++) {
      const currentTranscript = alltrans[index];
      Trans = currentTranscript.text;
      if (currentTranscript) {
        setTranscripts(Trans);
      }
    }
  });

  session.addEventListener("status", (event) => {
    setStatus(session.status);
  });

  session.addEventListener("experimental_message", (msg) => {});

  useEffect(() => {
    if (isRecording) {
      const smallPulse = setInterval(() => {
        setPulseEffects((prev) => ({ ...prev, small: !prev.small }));
      }, 1000);
      const mediumPulse = setInterval(() => {
        setPulseEffects((prev) => ({ ...prev, medium: !prev.medium }));
      }, 1500);
      const largePulse = setInterval(() => {
        setPulseEffects((prev) => ({ ...prev, large: !prev.large }));
      }, 2000);
      return () => {
        clearInterval(smallPulse);
        clearInterval(mediumPulse);
        clearInterval(largePulse);
      };
    }
  }, [isRecording]);

  const toggleExpand = () => {
    if (widgetTheme?.bot_show_form && !showform) {
      setExpanded(!expanded);
      return;
    }
    if (status === "disconnected") {
      setSpeech(`Connecting To ${widgetTheme?.bot_name}`);
      handleMicClick();
    }
    if (session.isSpeakerMuted) {
      setIsMuted(false);
      session.unmuteSpeaker();
    }
    setExpanded(!expanded);
  };

  const togglemute = () => {
    setExpanded(false);
    if (widgetTheme?.bot_mute_on_minimize) {
      if (session.isSpeakerMuted) {
        session.unmuteSpeaker();
        setIsMuted(false);
      } else {
        session.muteSpeaker();
        setIsMuted(true);
      }
    }
  };

  const handleClose = async () => {
    if (status !== "disconnected") {
      hasClosed.current = true;
      const callSessionId = JSON.parse(localStorage.getItem("callSessionId"));
      setExpanded(false);
      await session.leaveCall();
      widgetTheme?.bot_show_form ? setShowform(true) : setShowform(false);
      const response = await axios.post(
        `${baseurl}/api/shopify/end-call-session-thunder/`,
        {
          call_session_id: callSessionIds,
          schema_name: schema,
          prior_call_ids: callSessionId,
        }
      );
      localStorage.clear();
      hasClosed.current = false;
      setTranscripts(null);
      toggleVoice(false);
    } else {
      setExpanded(false);
    }
  };

  const toggleVoice = (data) => {
    setIsListening(data);
    setIsRecording(data);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcripts]);

  const getWidgetStyles = () => {
    const styles: React.CSSProperties = {
      position: "fixed",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
    };
    if (expanded) {
      styles.width = "400px";
      styles.height =
        widgetTheme?.bot_show_form && showform ? "550px" : "600px";
    } else {
      styles.width = "160px";
      styles.height = "80px";
    }
    switch (widgetTheme?.bot_position) {
      case "top-left":
        styles.top = "20px";
        styles.left = "20px";
        break;
      case "top-center":
        styles.top = "20px";
        styles.left = "50%";
        styles.transform = expanded ? "translateX(-50%)" : "none";
        break;
      case "top-right":
        styles.top = "20px";
        styles.right = "20px";
        break;
      case "bottom-left":
        styles.bottom = "40px";
        styles.left = "20px";
        break;
      case "bottom-center":
        styles.bottom = "40px";
        styles.left = "50%";
        styles.transform = expanded ? "translateX(-50%)" : "none";
        break;
      case "bottom-right":
        styles.bottom = "44px";
        styles.right = "24px";
        break;
      default:
        styles.bottom = "40px";
        styles.right = "20px";
    }
    return styles;
  };

  const startfromform = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (status === "disconnected") {
        const response = await axios.post(
          `${baseurl}/api/shopify/start-thunder/`,
          {
            agent_code: agent_id,
            schema_name: schema,
            phone: countryCode + formData.phone,
            name: formData.name,
            email: formData.email,
          }
        );
        const wssUrl = response.data.joinUrl;
        const callId = response.data.callId;
        localStorage.setItem("callId", callId);
        localStorage.setItem("wssUrl", wssUrl);
        setCallSessionIds(response.data.call_session_id);
        setShowform(false);
        if (storedIds) {
          try {
            const parsedIds = JSON.parse(storedIds);
            if (Array.isArray(parsedIds)) {
              existingCallSessionIds = parsedIds;
            }
          } catch (parseError) {
            console.warn("Could not parse callSessionId:", parseError);
            localStorage.removeItem("callSessionId");
          }
        }
        existingCallSessionIds.push(callId);
        localStorage.setItem(
          "callSessionId",
          JSON.stringify(existingCallSessionIds)
        );
        if (wssUrl) {
          session.joinCall(`${wssUrl}`);
          if (AutoStartref.current) {
            session.unmuteSpeaker();
          }
        }
        toggleVoice(true);
      } else {
        const callSessionId = JSON.parse(localStorage.getItem("callSessionId"));
        await session.leaveCall();
        const response = await axios.post(
          `${baseurl}/api/shopify/end-call-session-thunder/`,
          {
            call_session_id: callSessionIds,
            schema_name: schema,
            prior_call_ids: callSessionId,
          }
        );
        setTranscripts(null);
        toggleVoice(false);
        localStorage.clear();
        widgetTheme?.bot_show_form ? setShowform(true) : setShowform(false);
      }
    } catch (error) {
      console.error("Error in handleMicClick:", error);
    }
  };

  interface ProductParameters {
    productId?: string;
    title?: string;
    description?: string;
  }

  interface CollectionParameters {
    collectionId?: string;
    query?: string;
  }

  const showProduct = async (
    parameters: ProductParameters
  ): Promise<string> => {
    try {
      const response = await axios.post(
        `${baseurl}/api/shopify/show-product/`,
        {
          schema_name: schema,
          call_session_id: callSessionIds,
          title: parameters.title || "",
          query: parameters.title || "",
          description: parameters.description || "",
          top_k: 5,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: "csrftoken=xjHalmQklLKzhpPd4nXCHyRofqj8RUFC",
          },
        }
      );
      const product = response.data.response[0];
      const product_url = product.url || "No URL found";
      const product_title = product.title || "No Name found";
      const product_description = product.description || "No Description found";
      const prodcut_response = `Product Name: ${product_title}, Description: ${product_description}, Price: Rs${product.price}, URL: ${product_url}`;
      setProductUrls((prev) => [...prev, product_url]);
      setExpanded(true);
      // Check and create buttons for the retrieved product URL
      await checkAndCreateButtons(product_url);
      console.log("prodcut_response", prodcut_response);
      return prodcut_response;
    } catch (error) {
      console.error("Error in showProduct:", error);
      return "Error occurred while retrieving the product.";
    }
  };

  const showCollection = async (
    parameters: CollectionParameters
  ): Promise<string> => {
    try {
      const response = await axios.post(
        `${baseurl}/api/shopify/show-collection/`,
        {
          schema_name: schema,
          call_session_id: callSessionIds,
          collection_query: parameters.query || "",
          top_k: 1,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: "csrftoken=xjHalmQklLKzhpPd4nXCHyRofqj8RUFC",
          },
        }
      );
      const collection = response.data.response;
      const collection_url = collection.collection_url || "No URL found";
      const collection_name = collection.matched_collection || "No Name found";
      const collection_description =
        collection.description || "No Description found";
      const collection_response = `Collection Name: ${collection_name}, Description: ${collection_description}, URL: ${collection_url}`;
      console.log("collection_response", collection_response);
      return collection_response;
    } catch (error) {
      console.error("Error in showCollection:", error);
      return "Error occurred while retrieving the collection.";
    }
  };

  const seeProduct = async (parameters: any): Promise<string> => {
    const product_link = parameters.product_link;
    window.location.assign(product_link);
    return "Product opened";
  };

  const seeCollection = async (parameters: any): Promise<string> => {
    const collection_link = parameters.collection_link;
    window.location.assign(collection_link);
    return "Collection opened";
  };

  const searchProduct = async (
    parameters: ProductParameters
  ): Promise<string> => {
    try {
      const response = await axios.post(
        `${baseurl}/api/shopify/search-product/`,
        {
          query: parameters.query,
          store_id: 1,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: "csrftoken=xjHalmQklLKzhpPd4nXCHyRofqj8RUFC",
          },
        }
      );
      const searchUrl = response.data.search_url;
      if (searchUrl) {
        window.location.assign(searchUrl);
        return `Successfully opened the search URL`;
      }
    } catch (error) {
      console.error("Error in searchProduct:", error);
      return "Error occurred while searching for the product.";
    }
    return "No search URL found.";
  };

  const scrollUp = (): string => {
    window.scrollBy({
      top: -300,
      behavior: "smooth",
    });
    return "Scrolled up";
  };

  const scrollDown = (): string => {
    window.scrollBy({
      top: 300,
      behavior: "smooth",
    });
    return "Scrolled down";
  };

  const buyNow = async (): Promise<string> => {
    // Use the latest product URL from productUrls or fall back to current page
    const product_url = productUrls[productUrls.length - 1] || window.location.href;
    await checkAndCreateButtons(product_url);
    const button = document.querySelector(
      ".shopify-payment-button__button--unbranded"
    );
    axios
      .post(`${baseurl}/api/shopify/mark-product-converted/`, {
        product_url: product_url,
        schema_name: schema,
        call_session_id: callSessionIds,
      })
      .then((response) => {
        console.log("Product marked as converted:", response.data);
      })
      .catch((error) => {
        console.error("Error marking product as converted:", error);
      });
    if (button) {
      button.click();
      return "Button clicked";
    } else {
      return "Button not found";
    }
  };

  const addToCart = async (): Promise<string> => {
    // Use the latest product URL from productUrls or fall back to current page
    const product_url = productUrls[productUrls.length - 1] || window.location.href;
    await checkAndCreateButtons(product_url);
    const button = document.getElementById(
      "ProductSubmitButton-template--24466834784574__main"
    );
    axios
      .post(`${baseurl}/api/shopify/mark-product-converted/`, {
        product_url: product_url,
        schema_name: schema,
        call_session_id: callSessionIds,
      })
      .then((response) => {
        console.log("Product marked as converted:", response.data);
      })
      .catch((error) => {
        console.error("Error marking product as converted:", error);
      });
    if (button) {
      button.click();
      return "Add to Cart button clicked";
    } else {
      return "Add to Cart button not found";
    }
  };

  const openCart = (): string => {
    window.location.assign(window.location.origin + "/cart");
    return "Cart opened";
  };

  sessionRef.current.registerToolImplementation(
    "search_product",
    searchProduct
  );
  sessionRef.current.registerToolImplementation("show_product", showProduct);
  sessionRef.current.registerToolImplementation(
    "show_collection",
    showCollection
  );
  sessionRef.current.registerToolImplementation("scroll_up", scrollUp);
  sessionRef.current.registerToolImplementation("scroll_down", scrollDown);
  sessionRef.current.registerToolImplementation("buy_now", buyNow);
  sessionRef.current.registerToolImplementation("add_to_cart", addToCart);
  sessionRef.current.registerToolImplementation("open_cart", openCart);
  sessionRef.current.registerToolImplementation("see_product", seeProduct);
  sessionRef.current.registerToolImplementation(
    "see_collection",
    seeCollection
  );

  if (!onlyOnce.current || !widgetTheme) {
    return <div className="text-white text-center">Loading...</div>;
  }

  const renderIcon = (className: string) => {
    if (widgetTheme?.bot_logo) {
      return (
        <img
          src={widgetTheme.bot_logo}
          alt="Custom Icon"
          className={className}
          style={{ objectFit: "contain" }}
        />
      );
    }
    return (
      <Mic
        className={className}
        style={{ color: widgetTheme?.bot_icon_color }}
      />
    );
  };

  return (
    <div ref={widgetRef} style={getWidgetStyles()} className="flex flex-col items-end">
      {expanded ? (
        <div
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{
            width: "400px",
            height: widgetTheme?.bot_show_form && showform ? "550px" : "600px",
            backgroundColor: widgetTheme?.bot_background_color,
            borderColor: widgetTheme?.bot_border_color,
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex justify-between items-center"
            style={{ backgroundColor: widgetTheme?.bot_bubble_color }}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: widgetTheme?.bot_button_color }}
              >
                {renderIcon("w-5 h-5 rounded-full")}
              </div>
              <span
                className="font-semibold text-lg"
                style={{ color: widgetTheme?.bot_text_color }}
              >
                {widgetTheme?.bot_name || "AI Assistant"}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (isMuted) {
                    session.unmuteSpeaker();
                    setIsMuted(false);
                  } else {
                    session.muteSpeaker();
                    setIsMuted(true);
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                {isMuted ? (
                  <VolumeX
                    className="w-5 h-5"
                    style={{ color: widgetTheme?.bot_text_color }}
                  />
                ) : (
                  <Volume2
                    className="w-5 h-5"
                    style={{ color: widgetTheme?.bot_text_color }}
                  />
                )}
              </button>
              <button
                onClick={togglemute}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <Minimize2
                  className="w-5 h-5"
                  style={{ color: widgetTheme?.bot_text_color }}
                />
              </button>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X
                  className="w-5 h-5"
                  style={{ color: widgetTheme?.bot_text_color }}
                />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div
            className="flex flex-col h-full bg-gray-50"
            style={{ height: "calc(100% - 80px)" }}
          >
            {widgetTheme?.bot_show_form && showform ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <h3 className="text-lg font-semibold mb-6 text-gray-800">
                  Enter Your Details
                </h3>
                <form
                  onSubmit={startfromform}
                  className="w-full max-w-sm space-y-4"
                >
                  {[
                    {
                      icon: <User className="h-5 w-5 text-gray-400" />,
                      value: formData.name,
                      type: "text",
                      placeholder: "Your name",
                      key: "name",
                    },
                    {
                      icon: <Mail className="h-5 w-5 text-gray-400" />,
                      value: formData.email,
                      type: "email",
                      placeholder: "Email address",
                      key: "email",
                    },
                    {
                      value: formData.phone,
                      type: "tel",
                      placeholder: "Phone number",
                      key: "phone",
                      component: (
                        <PhoneInput
                          dropdownClass="bottom-10 z-50"
                          dropdownStyle={{ zIndex: 1000 }}
                          inputProps={{
                            name: "phone",
                            required: true,
                          }}
                          country={`${continentcode?.toLowerCase()}`}
                          value={formData.phone}
                          onChange={(phone) => {
                            setFormData({ ...formData, phone });
                            setPhoneError("");
                          }}
                          enableSearch={true}
                          containerClass="absolute inset-y-0 left-0"
                          inputClass="!pl-16 !w-full !rounded-xl !border !border-gray-300 !focus:outline-none !focus:ring-2 !focus:ring-orange-400 !text-gray-700"
                        />
                      ),
                    },
                  ].map((field, index) => (
                    <div key={index} className="w-full">
                      <div className="relative">
                        {!field.component && (
                          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                            {field.icon}
                          </div>
                        )}
                        {field.component ? (
                          field.component
                        ) : (
                          <input
                            type={field.type}
                            required
                            value={field.value}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                [field.key]: e.target.value,
                              })
                            }
                            placeholder={field.placeholder}
                            className="w-full p-3 pl-10 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {phoneError && (
                    <div className="text-red-500 text-sm mt-1">
                      {phoneError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full p-3 rounded-xl text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: widgetTheme?.bot_button_color }}
                  >
                    {status === "connecting" ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Connecting to AI Assistant
                      </div>
                    ) : (
                      "Connect to AI Assistant"
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Microphone Section */}
                <div className="flex flex-col items-center justify-center py-6">
                  {productUrls.length > 0 ? (
                    <div className="w-full max-h-64 overflow-y-auto px-6 space-y-4">
                      {productUrls.map((url, index) => (
                        <div key={index} className="relative">
                          {iframeErrors[index] ? (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-red-600 text-sm">
                              Failed to load product page.{" "}
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                Open in new tab
                              </a>
                            </div>
                          ) : (
                            <>
                              <iframe
                                src={url}
                                title={`Product ${index + 1}`}
                                className="w-full h-48 rounded-xl border border-gray-300 shadow-sm"
                                style={{ minHeight: "192px" }}
                                onError={() => {
                                  setIframeErrors((prev) => ({
                                    ...prev,
                                    [index]: true,
                                  }));
                                }}
                              />
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline mt-1 block text-center"
                              >
                                Open in new tab
                              </a>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleMicClick}
                        disabled={widgetTheme?.bot_show_form && showform}
                        className="w-40 h-40 rounded-full flex items-center justify-center transition-all hover:scale-105 shadow-lg mb-4"
                        style={{ backgroundColor: widgetTheme?.bot_button_color }}
                      >
                        {renderIcon("w-16 h-16")}
                      </button>
                      <div
                        className="px-6 py-2 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: widgetTheme?.bot_status_bar_color,
                          color: widgetTheme?.bot_status_bar_text_color,
                        }}
                      >
                        {speech}
                      </div>
                    </>
                  )}
                </div>

                {/* Transcription Box */}
                {widgetTheme?.bot_show_transcript && (
                  <div className="px-6 py-4 flex-1">
                    <div
                      ref={containerRef}
                      className="bg-white rounded-2xl p-4 h-32 text-gray-600 shadow-inner border overflow-y-auto text-sm"
                      style={{
                        fontStyle: transcripts ? "normal" : "italic",
                        color: transcripts ? "#374151" : "#9CA3AF",
                      }}
                    >
                      {transcripts || "Your conversation will appear here..."}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                {widgetTheme?.bot_show_chat && (
                  <div className="p-6 pt-0">
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        disabled={
                          status === "disconnected" || status === "connecting"
                        }
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSubmit();
                          }
                        }}
                        placeholder="Type your message..."
                        className="flex-1 bg-white text-gray-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400 border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleSubmit}
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-md"
                        style={{
                          backgroundColor: widgetTheme?.bot_button_color,
                        }}
                      >
                        <Send
                          className="w-5 h-5"
                          style={{ color: widgetTheme?.bot_button_text_color }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={toggleExpand}
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
            style={{ backgroundColor: widgetTheme?.bot_button_color }}
          >
            {renderIcon("w-6 h-6")}
          </button>
          <div
            className="px-auto py-2 rounded-full text-sm font-medium shadow-lg text-center"
            style={{
              backgroundColor: widgetTheme?.bot_button_color,
              color: widgetTheme?.bot_button_text_color,
            }}
          >
            <p className="px-2">
              Talk to {widgetTheme?.bot_name || "AI Assistant"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomWidget;