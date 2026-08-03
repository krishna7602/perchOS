"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://perchos.onrender.com";
    const redirectUri = `${window.location.origin}/api/auth/callback/google`;

    fetch(`${apiUrl}/auth/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Token exchange failed");
        }
        return res.json();
      })
      .then(async (data) => {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_CALLBACK", credential: data.id_token, state },
            window.location.origin
          );
          setStatus("success");
          setTimeout(() => window.close(), 500);
        } else {
          // Full-page redirect mode: authenticate customer directly and redirect
          try {
            const { customerLogin } = await import("@/lib/api");
            const loginRes = await customerLogin("google", data.id_token, state || undefined);
            
            sessionStorage.setItem("perch_chat_token", loginRes.token);
            sessionStorage.setItem("perch_handle", loginRes.name);
            sessionStorage.setItem("perch_username", loginRes.username);
            if (loginRes.venue_name) {
              sessionStorage.setItem("perch_venue_name", loginRes.venue_name);
            }
            if (loginRes.venue_id) {
              sessionStorage.setItem("perch_venue_id", loginRes.venue_id);
            }

            setStatus("success");

            if (loginRes.onboarding_completed) {
              const targetVenueId = loginRes.venue_id || "";
              window.location.href = targetVenueId ? `/venue/${targetVenueId}/chat` : "/";
            } else {
              window.location.href = `/join/${state}?step=onboarding&token=${encodeURIComponent(loginRes.token)}&name=${encodeURIComponent(loginRes.name)}&username=${encodeURIComponent(loginRes.username)}`;
            }
          } catch (err: any) {
            setStatus("error");
            setErrorMsg(err.message || err.detail || "Authentication failed.");
          }
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
            <p className="text-sm text-gray-500 mt-1">Redirecting to venue...</p>
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
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = "/";
                }
              }}
              className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors cursor-pointer"
            >
              Back to Home
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
