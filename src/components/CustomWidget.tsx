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
} from "lucide-react";
import { MicOff } from "lucide-react";
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
  // const [transcription, setTranscription] = useState("");
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
  const baseurl = "https://shop.snowie.ai";
  const { agent_id, schema } = useWidgetContext();
  console.log("agent_id", agent_id);
  console.log("schema", schema);

  // const agent_id = "68ec3404-7c46-4028-b7f3-42bae5c4976f";
  // const schema = "6af30ad4-a50c-4acc-8996-d5f562b6987f";
  let existingCallSessionIds: string[] = [];
  const AutoStartref = useRef(false);
  console.log("AutoStartref", AutoStartref.current);
  const storedIds = localStorage.getItem("callSessionId");

  const debugMessages = new Set(["debug"]);
  const onlyOnce = useRef(false);

  useEffect(() => {
    if (onlyOnce.current) return;

    const getWidgetTheme = async () => {
      try {
        const response = await axios.get(
          `${baseurl}/api/shopify/thunder-widget-settings/${schema}/${agent_id}/`
        );
        const data = response.data.response;
        console.log(data);
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
        } else if (document.visibilityState === "visible") {
          session.unmuteSpeaker();
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
    if (status != "disconnected") {
      session.sendText(`${message}`);
      setMessage("");
    }
  };

  useEffect(() => {
    // Set flag when page is about to refresh
    const handleBeforeUnload = () => {
      sessionStorage.setItem("isRefreshing", "true");
    };

    // Clear flag when page loads (this will execute after refresh)
    const clearRefreshFlag = () => {
      sessionStorage.removeItem("isRefreshing");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("load", clearRefreshFlag);

    // Initial cleanup of any leftover flag
    clearRefreshFlag();

    // Cleanup listeners
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("load", clearRefreshFlag);
    };
  }, []);

  // disconnecting
  useEffect(() => {
    console.log("status", status);

    if (status === "disconnecting" && !hasClosed.current) {
      console.log("auto disconnect");

      // Only run cleanup if this isn't a page refresh
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
        };

        handleClose();
      }
    }
  }, [status]);

  // autostart on page refresh
  useEffect(() => {
    const callId = localStorage.getItem("callId");
    console.log(callId, status, hasReconnected.current);
    if (callId && status === "disconnected" && !hasReconnected.current) {
      setIsMuted(true);
      handleMicClickForReconnect(callId);
      hasReconnected.current = true;
    } else if (status === "listening" && callId && isMuted && !expanded) {
      session.muteSpeaker();
    }
  }, [status]);

  const handleMicClickForReconnect = async (id) => {
    setExpanded(true);

    try {
      const response = await axios.post(`${baseurl}/api/shopify/start-thunder/`, {
        agent_code: agent_id,
        schema_name: schema,
        prior_call_id: id,
      });

      const wssUrl = response.data.joinUrl;
      const callId = response.data.callId;

      localStorage.setItem("callId", callId);
      // setCallId(callId);
      setCallSessionIds(response.data.call_session_id);
      if (storedIds) {
        try {
          const parsedIds = JSON.parse(storedIds);
          // Ensure it's actually an array
          if (Array.isArray(parsedIds)) {
            existingCallSessionIds = parsedIds;
          }
        } catch (parseError) {
          console.warn("Could not parse callSessionId:", parseError);
          // Optional: clear invalid data
          localStorage.removeItem("callSessionId");
        }
      }

      // Append the new ID
      existingCallSessionIds.push(callId);

      // Store back in localStorage
      localStorage.setItem(
        "callSessionId",
        JSON.stringify(existingCallSessionIds)
      );

      if (wssUrl) {
        await session.joinCall(`${wssUrl}`);
      }
    } catch (error) {
      console.error("Error in handleMicClick:", error);
    }
  };

  // Handle mic button click
  const handleMicClick = async () => {
    try {
      if (status === "disconnected") {
        const response = await axios.post(`${baseurl}/api/shopify/start-thunder/`, {
          agent_code: agent_id,
          schema_name: schema,
        });

        const wssUrl = response.data.joinUrl;
        const callId = response.data.callId;
        localStorage.setItem("callId", callId);
        localStorage.setItem("wssUrl", wssUrl);
        setCallSessionIds(response.data.call_session_id);
        if (storedIds) {
          try {
            const parsedIds = JSON.parse(storedIds);
            // Ensure it's actually an array
            if (Array.isArray(parsedIds)) {
              existingCallSessionIds = parsedIds;
            }
          } catch (parseError) {
            console.warn("Could not parse callSessionId:", parseError);
            // Optional: clear invalid data
            localStorage.removeItem("callSessionId");
          }
        }

        // Append the new ID
        existingCallSessionIds.push(callId);

        // Store back in localStorage
        localStorage.setItem(
          "callSessionId",
          JSON.stringify(existingCallSessionIds)
        );

        if (wssUrl) {
          session.joinCall(`${wssUrl}`);
          if (AutoStartref.current) {
            console.log("unmuting speaker", session.isSpeakerMuted);
            session.unmuteSpeaker();
          }
        }
        toggleVoice(true);
      } else {
        const callSessionId = JSON.parse(localStorage.getItem("callSessionId"));
        await session.leaveCall();
        console.log("call left successfully second time");
        const response = await axios.post(
          `${baseurl}/api/shopify/end-call-session-thunder/`,
          {
            call_session_id: callSessionIds,
            schema_name: schema,
            prior_call_ids: callSessionId,
          }
        );

        // console.log("Call left successfully");
        setTranscripts(null);
        toggleVoice(false);
        localStorage.clear();
      }
    } catch (error) {
      // console.error("Error in handleMicClick:", error);
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
    // console.log("Transcripts updated: ", session);

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

  // Listen for status changing events
  session.addEventListener("status", (event) => {
    setStatus(session.status);
    // console.log("Session status changed: ", session.status);
  });

  session.addEventListener("experimental_message", (msg) => {
    console.log("Got a debug message: ", JSON.stringify(msg));
  });

  // Animated pulse effects for recording state
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
    if (widgetTheme?.bot_show_form) {
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
    setExpanded(!expanded);
    if (widgetTheme?.bot_mute_on_minimize) {
      if (session.isSpeakerMuted) {
        session.unmuteSpeaker();
      } else {
        session.muteSpeaker();
      }
    }
  };

  const handleClose = async () => {
    if (status !== "disconnected") {
      hasClosed.current = true;
      const callSessionId = JSON.parse(localStorage.getItem("callSessionId"));
      setExpanded(!expanded);
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
    } else {
      setExpanded(!expanded);
    }
  };

  const toggleVoice = (data) => {
    setIsListening(data);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcripts]);

  const getWidgetStyles = () => {
    const styles = {
      position: "fixed",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
    };

    // Responsive size adjustments
    const maxWidthPx = 400;
    const maxHeightPx = 600;
    const minWidthPx = 250;
    const minHeightPx = 200;

    // Adjust size based on content
    const hasTranscription = widgetTheme?.bot_show_transcript;
    const hasChat = widgetTheme?.bot_show_chat;
    let contentFactor = 1;
    if (!hasTranscription && !hasChat) {
      contentFactor = 0.6;
    } else if (!hasTranscription || !hasChat) {
      contentFactor = 0.8;
    }

    // Apply size only when expanded
    // if (expanded) {
    //   const widthPercent = Math.min(widgetTheme?.bot_width, 100) / 100;
    //   const heightPercent = Math.min(widgetTheme?.bot_height, 100) / 100;

    //   const viewportWidth = window.innerWidth;
    //   const viewportHeight = window.innerHeight;
    //   let calculatedWidth = widthPercent * viewportWidth * contentFactor;
    //   let calculatedHeight = heightPercent * viewportHeight * contentFactor;

    //   calculatedWidth = Math.max(
    //     minWidthPx,
    //     Math.min(calculatedWidth, maxWidthPx)
    //   );
    //   calculatedHeight = Math.max(
    //     minHeightPx,
    //     Math.min(calculatedHeight, maxHeightPx)
    //   );

    //   styles.width = `${calculatedWidth}px`;
    //   styles.height = `${calculatedHeight}px`;
    // } else {
    //   styles.width = "64px";
    //   styles.height = "64px";
    // }

    // Apply position
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
        styles.bottom = "20px";
        styles.left = "20px";
        break;
      case "bottom-center":
        styles.bottom = "20px";
        styles.left = "50%";
        styles.transform = expanded ? "translateX(-50%)" : "none";
        break;
      case "bottom-right":
        styles.bottom = "24px";
        styles.right = "24px";

        break;
      default:
        styles.bottom = "20px";
        styles.right = "20px";
    }

    console.log(styles);

    return styles;
  };

  const startfromform = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (status === "disconnected") {
        const response = await axios.post(`${baseurl}/api/shopify/start-thunder/`, {
          agent_code: agent_id,
          schema_name: schema,
          phone: countryCode + formData.phone,
          name: formData.name,
          email: formData.email,
        });

        const wssUrl = response.data.joinUrl;
        const callId = response.data.callId;
        localStorage.setItem("callId", callId);
        localStorage.setItem("wssUrl", wssUrl);
        setCallSessionIds(response.data.call_session_id);
        if (storedIds) {
          try {
            const parsedIds = JSON.parse(storedIds);
            // Ensure it's actually an array
            if (Array.isArray(parsedIds)) {
              existingCallSessionIds = parsedIds;
            }
          } catch (parseError) {
            console.warn("Could not parse callSessionId:", parseError);
            // Optional: clear invalid data
            localStorage.removeItem("callSessionId");
          }
        }

        // Append the new ID
        existingCallSessionIds.push(callId);

        // Store back in localStorage
        localStorage.setItem(
          "callSessionId",
          JSON.stringify(existingCallSessionIds)
        );

        if (wssUrl) {
          session.joinCall(`${wssUrl}`);
          if (AutoStartref.current) {
            console.log("unmuting speaker", session.isSpeakerMuted);
            session.unmuteSpeaker();
          }
        }
        toggleVoice(true);
      } else {
        const callSessionId = JSON.parse(localStorage.getItem("callSessionId"));
        await session.leaveCall();
        console.log("call left successfully second time");
        const response = await axios.post(
          `${baseurl}/api/shopify/end-call-session-thunder/`,
          {
            call_session_id: callSessionIds,
            schema_name: schema,
            prior_call_ids: callSessionId,
          }
        );

        // console.log("Call left successfully");
        setTranscripts(null);
        toggleVoice(false);
        localStorage.clear();
      }
    } catch (error) {
      // console.error("Error in handleMicClick:", error);
    }
  };

  // Define the type for parameters with optional properties
  interface ProductParameters {
    productId?: string;
    query?: string;
  }

  interface CollectionParameters {
    collectionId?: string;
    query?: string;
  }

  // Function that implements the logic for the 'show_product' tool
  const showProduct = async (
    parameters: ProductParameters
  ): Promise<string> => {
    try {
      const response = await axios.post(
        `${baseurl}/api/shopify/shopify/show-product/`,
        {
          schema_name: schema,
          call_session_id: callSessionIds,
          query: parameters.query || "",
          top_k: 1,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: "csrftoken=xjHalmQklLKzhpPd4nXCHyRofqj8RUFC",
          },
        }
      );

      const product = response.data.response;
      console.log("PRODUCT", product);
      console.log("PRODUCT URL", product.url);
      const product_url = product.url;
      const product_name = product.name;
      const product_description = product.description;
      if (product_url) {
        console.log("TRYING TO OPEN", product_url);
        localStorage.setItem("product_name", product_name);
        localStorage.setItem("product_description", product_description);

        window.location.assign(product_url); // Open the product URL in a new tab
      }
      return `Description: ${product.description}, Price: $${product.price}`;
    } catch (error) {
      console.error("Error in seeProduct:", error);
      return "Error occurred while retrieving the product.";
    }
  };

  // Function that implements the logic for the 'show_product' tool
  const showCollection = async (
    parameters: CollectionParameters
  ): Promise<string> => {
    try {
      console.log("SHOWING COLLECTION", parameters);
      const response = await axios.post(
        `${baseurl}/api/shopify/shopify/show-collection/`,
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
      console.log("COLLECTION", collection);
      console.log("COLLECTION URL", collection.collection_url);
      const collection_url = collection.collection_url;
      const collection_name = collection.matched_collection;
      const collection_description = collection.description;
      if (collection_url) {
        console.log("TRYING TO OPEN", collection_url);
        localStorage.setItem("collection_name", collection_name);
        localStorage.setItem("collection_description", collection_description);
        window.location.assign(collection_url); // Open the product URL in a new tab
      }
      return `Description: ${collection.description}`;
    } catch (error) {
      console.error("Error in seeProduct:", error);
      return "Error occurred while retrieving the product.";
    }
  };

  // Function that implements the logic for the 'search_product' tool
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
        window.location.assign(searchUrl); // Open the search URL in a new tab
        return `Successfully opened the search URL`;
      }
    } catch (error) {
      console.error("Error in searchProduct:", error);
      return "Error occurred while searching for the product.";
    }
    return "No search URL found.";
  };

  function scrollUp(): string {
    window.scrollBy({
      top: -300, // Scrolls up by 300 pixels
      behavior: "smooth",
    });
    return "Scrolled up "; // Return a string or appropriate type
  }

  function scrollDown(): string {
    window.scrollBy({
      top: 300, // Scrolls down by 300 pixels
      behavior: "smooth",
    });
    return "Scrolled down"; // Return a string or appropriate type
  }

  function buyNow(): string {
    // Find the button element by its class name
    const button = document.querySelector(
      ".shopify-payment-button__button--unbranded"
    );

    const product_url = window.location.href;
    // Make an API call to mark the product as converted
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

    // If the button exists, simulate a click
    if (button) {
      button.click();
      return "Button clicked"; // Return a message when the button is clicked
    } else {
      return "Button not found"; // Return an error message if the button is not found
    }
  }

  function addToCart(): string {
    const product_url = window.location.href;

    // Find the button element by its ID
    const button = document.getElementById(
      "ProductSubmitButton-template--24466834784574__main"
    );

    // Make an API call to mark the product as converted
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

    // If the button exists, simulate a click
    if (button) {
      button.click();
      return "Add to Cart button clicked"; // Return a message when the button is clicked
    } else {
      return "Add to Cart button not found"; // Return an error message if the button is not found
    }
  }

  function openCart(): string {
    window.location.assign(window.location.origin + "/cart");
    return "Cart opened";
  }
  // Register the client-side tools
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

  if (!onlyOnce.current || !widgetTheme) {
    return null; // Or return <div>Loading...</div>
  }

  return (
    <div style={getWidgetStyles()} className="flex flex-col items-end">
      {expanded ? (
        <div
          className={`bg-gray-900/50 backdrop-blur-sm w-[309px]  rounded-2xl shadow-2xl overflow-hidden border ${
            widgetTheme?.bot_show_form ? "h-[550px]" : "h-[521px]"
          }`}
          style={{
            backgroundColor: widgetTheme?.bot_background_color,
            borderColor: widgetTheme?.bot_border_color,
          }}
        >
          {/* Header with glow effect */}
          <div
            className="relative p-4 flex justify-between items-center "
            style={{
              backgroundColor: widgetTheme?.bot_bubble_color,
              borderBottom: `1px solid ${widgetTheme?.bot_border_color}`,
            }}
          >
            <div className="relative flex items-center">
              <div
                className=" rounded-full w-8 h-8 flex items-center justify-center mr-2  shadow-lg"
                style={{
                  borderColor: widgetTheme?.bot_border_color,
                }}
              >
                <span className="text-yellow-400 font-bold text-xl">
                  <img
                    src={widgetTheme?.bot_logo}
                    alt="logo"
                    className="w-6 h-6"
                  />
                </span>
              </div>
              <span className="text-white font-bold text-lg">
                {widgetTheme?.bot_name || "Voice Assistant"}
              </span>
            </div>
            <div className="relative flex space-x-2">
              <button
                onClick={togglemute}
                className="text-gray-300 transition-colors"
              >
                <Minimize2
                  size={18}
                  style={{
                    color: hovered
                      ? widgetTheme?.bot_button_hover_color
                      : widgetTheme?.bot_button_color,
                    transition: "color 0.3s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                />
              </button>
              <button
                onClick={handleClose}
                className="text-gray-300 transition-colors"
              >
                <X
                  size={18}
                  style={{
                    color: hovered
                      ? widgetTheme?.bot_button_hover_color
                      : widgetTheme?.bot_button_color,
                    transition: "color 0.3s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                />
              </button>
            </div>
          </div>

          {/* Microphone Button with enhanced visual effects */}
          <div className="pt-10 flex flex-col items-center justify-center relative overflow-hidden w-full ">
            {/* Background glow effects */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent"></div> */}
            {/* <div className="absolute w-full h-64 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400/10 rounded-full blur-3xl"></div> */}
            {/* <div className="absolute w-52 h-52  left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div> */}
            {/* <div className="absolute w-40 h-40  left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400/25 rounded-full blur-md animate-pulse"></div> */}

            {/* Decorative elements */}
            {/* <div className="absolute w-full h-full">
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping"></div>
              <div className="absolute top-3/4 left-1/3 w-1 h-1 bg-yellow-300 rounded-full animate-ping delay-300"></div>
              <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping delay-700"></div>
              <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-yellow-300 rounded-full animate-ping delay-500"></div>
              <div className="absolute top-1/2 left-1/5 w-1 h-1 bg-yellow-300 rounded-full animate-ping delay-200"></div>
            </div> */}

            {/* Microphone button with pulse animations */}
            <div className="relative">
              {/* {isRecording && pulseEffects.small && (
                <div className="absolute inset-0 -m-3 bg-yellow-400 opacity-30 rounded-full animate-ping"></div>
              )}
              {isRecording && pulseEffects.medium && (
                <div className="absolute inset-0 -m-6 bg-yellow-500 opacity-20 rounded-full animate-pulse"></div>
              )}
              {isRecording && pulseEffects.large && (
                <div className="absolute inset-0 -m-12 bg-yellow-600 opacity-10 rounded-full animate-pulse"></div>
              )}
              {isGlowing && (
                <div className="absolute inset-0 -m-5 bg-yellow-400 opacity-50 rounded-full animate-ping"></div>
              )}
              {isGlowing && (
                <div className="absolute inset-0 -m-10 bg-yellow-400 opacity-30 rounded-full animate-pulse"></div>
              )} */}
              <button
                onClick={handleMicClick}
                className={`relative z-10 bg-black rounded-full w-36 h-36 flex items-center justify-center border-2 
                  // isGlowing
                  //   ? "border-yellow-300 shadow-xl shadow-yellow-400/60"
                  //   : "border-yellow-400 shadow-lg"
                
                  ${
                    isRecording ? "scale-110" : "hover:scale-105"
                  } backdrop-blur-sm`}
                style={{
                  backgroundColor: widgetTheme?.bot_bubble_color,
                  borderColor: widgetTheme?.bot_border_color,
                }}
              >
                {/* <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-yellow-900/20 rounded-full"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/5 via-transparent to-transparent rounded-full"></div> */}
                <div className="flex items-center justify-center">
                  <span
                    className={`text-yellow-400 font-bold text-6xl drop-shadow-xl tracking-tighter ${
                      isRecording ? "animate-pulse" : ""
                    }`}
                  >
                    <img
                      src={widgetTheme?.bot_logo || logo}
                      alt="logo"
                      className="w-20 h-20"
                    />
                  </span>
                </div>
              </button>
            </div>

            <p
              className="text-yellow-400 text-sm mt-5 font-medium drop-shadow-md bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm border border-yellow-400/20"
              style={{
                backgroundColor: widgetTheme?.bot_status_bar_color,
                borderColor: widgetTheme?.bot_border_color,
                color: widgetTheme?.bot_status_bar_text_color,
              }}
            >
              {speech}
            </p>

            {widgetTheme?.bot_show_form ? (
              <form onSubmit={startfromform}>
                <div className="flex flex-col gap-4 m-4">
                  {[
                    {
                      icon: <User className="h-5 w-5 text-gray-400" />,
                      value: formData.name,
                      type: "text",
                      placeholder: "Your name",
                      key: "name",
                      component: "",
                    },
                    {
                      icon: <Mail className="h-5 w-5 text-gray-400" />,
                      value: formData.email,
                      type: "email",
                      placeholder: "Email address",
                      key: "email",
                      component: "",
                    },
                  ].map((field, index) => (
                    <div className="relative" key={index}>
                      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                        {field.icon}
                      </div>
                      <div className="flex items-center">
                        {field.component}
                        <input
                          type={field.type}
                          required
                          value={field.value}
                          maxLength={field.maxLength}
                          onChange={(e) => {
                            let value = e.target.value;
                            if (field.key === "phone") {
                              value = value.replace(/\D/g, ""); // remove non-digit characters
                            }
                            setFormData({ ...formData, [field.key]: value });
                          }}
                          className={`block w-full pl-12 pr-4 py-2 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition ${
                            field.component && " rounded-l-none !pl-2 h-[40px]"
                          }`}
                          placeholder={field.placeholder}
                        />
                      </div>
                    </div>
                  ))}
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
                      setPhoneError(""); // clear error as user types
                    }}
                    enableSearch={true}
                  />

                  {phoneError && (
                    <div className="text-red-500 text-sm mt-1">
                      {phoneError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-yellow-400 text-black font-semibold py-3 px-4 rounded-xl hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-colors"
                  >
                    {status === "connecting" ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Connecting
                        to AI Assistant
                      </div>
                    ) : (
                      "Connect to AI Assistant"
                    )}
                  </button>

                  {/* {error && (
                    <div className="text-red-500 text-center text-sm mt-2">
                      {error}
                    </div>
                  )} */}
                </div>
              </form>
            ) : (
              <>
                {/* Transcription Box with enhanced styling */}
                {widgetTheme?.bot_show_transcript && (
                  <div className="relative p-4 w-full ">
                    <div className="absolute inset-0 "></div>
                    <div className="relative">
                      <div className="flex justify-between items-center mb-2">
                        {/* <div className="text-yellow-400 text-sm font-medium">
                  Real-time transcription
                </div> */}
                        {isRecording && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                            <span className="text-red-400 text-xs">LIVE</span>
                          </div>
                        )}
                      </div>
                      <div
                        ref={containerRef}
                        className=" bg-white backdrop-blur-sm rounded-xl p-4 h-16 text-white shadow-inner border border-gray-800 overflow-y-auto scrollbar-hide ring-yellow-400/80"
                      >
                        <div className="relative">
                          <span className="text-black">{transcripts}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input Area with glass effect */}
                {widgetTheme?.bot_show_chat && (
                  <div className="relative p-3 ">
                    <div className="absolute inset-0"></div>
                    <div className="relative flex items-center space-x-2">
                      <input
                        type="text"
                        disabled={
                          status === "disconnected" || status === "connecting"
                        }
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSubmit(e.target.value);
                          }
                        }}
                        placeholder="Type your message..."
                        className="flex-1 bg-white text-black p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/80 placeholder-gray-500 border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={handleSubmit}
                        className="p-3  rounded-xl  transition-colors shadow-md"
                        style={{
                          backgroundColor: widgetTheme?.bot_button_color,
                          borderColor: widgetTheme?.bot_border_color,
                          color: widgetTheme?.bot_button_text_color,
                        }}
                      >
                        <Send
                          size={20}
                          className="text-black"
                          style={{
                            color: widgetTheme?.bot_button_text_color,
                          }}
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
        <>
          <div className="flex flex-col items-center gap-1 justify-center">
            <button
              onClick={toggleExpand}
              className="bg-black rounded-full w-20 h-20 flex items-center justify-center shadow-2xl border-2 border-yellow-400  transition-all hover:scale-110"
              style={{
                backgroundColor: widgetTheme?.bot_bubble_color,
                borderColor: widgetTheme?.bot_border_color,
              }}
            >
              <div className="relative">
                {/* <div
                  className="absolute inset-0 -m-1 bg-yellow-400/40 rounded-full animate-ping"
                  style={{
                    backgroundColor: widgetTheme?.bot_animation_color,
                  }}
                ></div>
                <div
                  className="absolute inset-0 -m-3 bg-yellow-400/20 rounded-full animate-pulse"
                  style={{
                    backgroundColor: widgetTheme?.bot_animation_color,
                  }}
                ></div> */}
                <span className="text-yellow-400 font-bold text-3xl relative z-10 drop-shadow-xl tracking-tighter">
                  <img
                    src={widgetTheme?.bot_logo || logo}
                    alt="logo"
                    className="w-[54px] h-[54px]"
                  />
                </span>
              </div>
            </button>
            <button
              onClick={toggleExpand}
              className="inline-block  px-4 py-1 bg-black text-[#FFD700] border-2 border-[#FFD700] rounded-full font-inter font-bold text-sm no-underline text-center transition-all duration-300 "
              style={{
                backgroundColor: widgetTheme?.bot_bubble_color,
                borderColor: widgetTheme?.bot_border_color,
                color: widgetTheme?.bot_border_color,
              }}
            >
              TALK TO {widgetTheme?.bot_name}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
export default CustomWidget;
