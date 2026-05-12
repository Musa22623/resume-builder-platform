import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google script."));
    document.head.appendChild(script);
  });

const GoogleAuthButton = ({ onCredential, onError, text = "continue_with" }) => {
  const containerRef = useRef(null);
  const [loadError, setLoadError] = useState("");
  const clientId = useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || "", []);

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      return undefined;
    }

    let isMounted = true;

    loadGoogleScript()
      .then((google) => {
        if (!isMounted || !google?.accounts?.id || !containerRef.current) {
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) {
              onError?.("Google sign-in did not return a credential.");
              return;
            }

            try {
              await onCredential?.(response.credential);
            } catch (error) {
              onError?.(error);
            }
          },
        });

        containerRef.current.innerHTML = "";
        google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width: 360,
        });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        const nextError = error instanceof Error ? error.message : "Google sign-in is unavailable right now.";
        setLoadError(nextError);
        onError?.(nextError);
      });

    return () => {
      isMounted = false;
    };
  }, [clientId, onCredential, onError, text]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>Or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="flex justify-center rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div ref={containerRef} />
      </div>
      {loadError ? <p className="text-sm font-medium text-rose-700">{loadError}</p> : null}
    </div>
  );
};

export default GoogleAuthButton;
