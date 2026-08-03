"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // QR token
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setErrorMsg("Google sign-in was cancelled or denied.");
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMsg("No authorization code received from Google.");
      return;
    }

    // Exchange the auth code for an ID token via our backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${apiUrl}/auth/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/auth/google/callback` }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Token exchange failed");
        }
        return res.json();
      })
      .then((data) => {
        // Send the ID token back to the parent (join page) window
        if (window.opener) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_CALLBACK", credential: data.id_token, state },
            window.location.origin
          );
          setStatus("success");
          // Auto-close popup after short delay
          setTimeout(() => window.close(), 500);
        } else {
          // Not in popup — redirect back to join page with token
          setStatus("error");
          setErrorMsg("Please use the sign-in button on the venue page.");
        }
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err.message || "Authentication failed.");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf8f5" }}>
      <div className="text-center max-w-sm p-8">
        {status === "processing" && (
          <>
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">Signing you in...</p>
            <p className="text-sm text-gray-500 mt-1">Verifying with Google</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-800">Signed in!</p>
            <p className="text-sm text-gray-500 mt-1">This window will close automatically.</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-red-800">Sign-in failed</p>
            <p className="text-sm text-gray-500 mt-1">{errorMsg}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors cursor-pointer"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf8f5" }}>
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
