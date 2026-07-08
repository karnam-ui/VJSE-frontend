  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Global Fetch Interceptor to automatically attach JWT token & support cookies
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const token = localStorage.getItem("token");
    init = init || {};
    
    // Send cookies with cross-origin requests
    init.credentials = init.credentials || "include";

    if (token) {
      if (typeof input === "string") {
        const headers = new Headers(init.headers || {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init.headers = headers;
      } else if (input instanceof Request) {
        if (!input.headers.has("Authorization")) {
          input.headers.set("Authorization", `Bearer ${token}`);
        }
      }
    }
    return originalFetch(input, init);
  };

  createRoot(document.getElementById("root")!).render(<App />);