"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getVenueByQr, customerLogin, customerOnboarding } from "@/lib/api";
import { Loader } from "@/components/ui/Loader";
import { Globe, Sparkles, ChevronRight, User } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  wifi_ssid: string | null;
  wifi_password: string | null;
}

function JoinPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrToken = params?.qrToken as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States: "login" | "onboarding" | "joining"
  const [step, setStep] = useState<"login" | "onboarding" | "joining">("login");
  const [authToken, setAuthToken] = useState("");
  const [tempProfile, setTempProfile] = useState<{
    name: string;
    profile_photo: string | null;
    username: string;
  } | null>(null);

  // Onboarding Form States
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [college, setCollege] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [networkingGoal, setNetworkingGoal] = useState("Networking");
  const [socialLinks, setSocialLinks] = useState({
    linkedin: "",
    instagram: "",
    github: "",
    website: "",
  });

  const interestsOptions = [
    "Networking", "Startup", "AI", "Coffee", "Reading", 
    "Photography", "Gaming", "Books", "Music", "Fitness", 
    "Travel", "Study"
  ];

  const tagsOptions = [
    "Hiring", "Looking for Job", "Internship", "Mentor", 
    "Mentee", "Founder", "Investor", "Freelancer", 
    "Developer", "Designer", "Student"
  ];

  const goalsOptions = [
    { value: "Networking", label: "Networking" },
    { value: "Study", label: "Study" },
    { value: "Friends", label: "Social/Friends" },
    { value: "Business", label: "Business" },
    { value: "Hidden", label: "Keep Profile Hidden" }
  ];

  useEffect(() => {
    if (!qrToken) return;
    getVenueByQr(qrToken)
      .then((data) => {
        setVenue(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Invalid or expired QR code.");
        setIsLoading(false);
      });
  }, [qrToken]);

  // Restore onboarding state if returning from full-page OAuth redirect
  useEffect(() => {
    if (!searchParams) return;
    const urlStep = searchParams.get("step");
    const urlToken = searchParams.get("token");
    const urlName = searchParams.get("name");
    const urlUsername = searchParams.get("username");

    if (urlStep === "onboarding" && urlToken) {
      setStep("onboarding");
      setAuthToken(urlToken);
      setTempProfile({
        name: urlName || "User",
        profile_photo: null,
        username: urlUsername || "user",
      });
    }
  }, [searchParams]);

  // Listen for Google OAuth callback message if in popup mode
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "GOOGLE_AUTH_CALLBACK" && event.data?.credential) {
        setIsSubmitting(true);
        setError("");
        try {
          const data = await customerLogin("google", event.data.credential, qrToken);
          handleLoginSuccess(data);
        } catch (err: any) {
          setError(err.detail || "Google authentication failed.");
          setIsSubmitting(false);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [qrToken, venue]);

  const handleLoginSuccess = (data: {
    token: string;
    name: string;
    username: string;
    onboarding_completed: boolean;
    profile_photo: string | null;
    venue_id: string | null;
    venue_name: string | null;
  }) => {
    setAuthToken(data.token);
    setTempProfile({
      name: data.name,
      profile_photo: data.profile_photo,
      username: data.username,
    });

    sessionStorage.setItem("perch_chat_token", data.token);
    sessionStorage.setItem("perch_handle", data.name);
    sessionStorage.setItem("perch_username", data.username);
    if (data.venue_name) {
      sessionStorage.setItem("perch_venue_name", data.venue_name);
    }
    if (data.venue_id || venue?.id) {
      sessionStorage.setItem("perch_venue_id", data.venue_id || venue?.id || "");
    }

    if (data.onboarding_completed) {
      setStep("joining");
      router.push(`/venue/${data.venue_id || venue?.id}/chat`);
    } else {
      setStep("onboarding");
    }
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      handleMockLogin();
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = "openid email profile";
    const state = qrToken;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}` +
      `&access_type=offline` +
      `&prompt=select_account`;

    // Direct redirect to Google Account Chooser (same as GitHub OAuth flow)
    window.location.href = authUrl;
  };

  const handleMockLogin = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const timestamp = Date.now();
      const mockCredential = `mock_google_${timestamp}_guest_${timestamp.toString().slice(-4)}`;
      const data = await customerLogin("google", mockCredential, qrToken);
      handleLoginSuccess(data);
    } catch (err: any) {
      setError(err.detail || "Google authentication failed.");
      setIsSubmitting(false);
    }
  };

  const handleDevBypass = async (profileName: string, emailPrefix: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      const mockCredential = `mock_google_${emailPrefix}_${emailPrefix}`;
      const data = await customerLogin("google", mockCredential, qrToken);
      handleLoginSuccess(data);
    } catch (err: any) {
      setError(err.detail || "Mock login failed.");
      setIsSubmitting(false);
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else if (selectedInterests.length < 3) {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleOnboardingSubmit = async (isSkipped = false) => {
    setIsSubmitting(true);
    setError("");
    const activeToken = authToken || sessionStorage.getItem("perch_chat_token") || "";
    const targetVenueId = venue?.id || sessionStorage.getItem("perch_venue_id") || "";

    if (!activeToken) {
      setError("Session expired. Please click Continue with Google to sign in again.");
      setIsSubmitting(false);
      setStep("login");
      return;
    }

    try {
      if (!isSkipped) {
        const cleanedSocialLinks = {
          linkedin: socialLinks.linkedin.trim() || undefined,
          instagram: socialLinks.instagram.trim() || undefined,
          github: socialLinks.github.trim() || undefined,
          website: socialLinks.website.trim() || undefined,
        };

        await customerOnboarding(activeToken, {
          headline: headline.trim() || undefined,
          company: company.trim() || undefined,
          college: college.trim() || undefined,
          interests: selectedInterests,
          professional_tags: selectedTags,
          networking_mode: networkingGoal,
          social_links: cleanedSocialLinks,
        });
      } else {
        await customerOnboarding(activeToken, {
          networking_mode: "Networking",
        });
      }

      setStep("joining");
      const destination = targetVenueId ? `/venue/${targetVenueId}/chat` : "/";
      router.push(destination);
    } catch (err: any) {
      console.error("Onboarding submit error:", err);
      setError(err?.detail || err?.message || "Failed to save profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <Loader label="Loading venue details..." />
      </div>
    );
  }

  if (error && step === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-bg)" }}>
        <div className="text-center animate-fade-in max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            {error}
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
            Please scan the venue's QR code again.
          </p>
        </div>
      </div>
    );
  }

  if (!venue) return null;

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 py-8" style={{ background: "var(--color-bg)" }}>
      
      {step === "login" && (
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full animate-fade-in">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-inner">
              <span className="text-4xl">☕</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}>
              Welcome to {venue.name}
            </h1>
            <p className="text-sm px-4" style={{ color: "var(--color-muted)" }}>
              Sign in once with Google to order food, join the community, chat with other visitors, and save your preferences.
            </p>
          </div>

          {/* Action Area */}
          <div 
            className="rounded-3xl p-6 mb-8 border"
            style={{ 
              background: "var(--color-surface)", 
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-md)"
            }}
          >
            {/* Google Sign-in Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl border border-gray-300 transition-all shadow-sm cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 7.99 12.5a5.99 5.99 0 0 1 6.002-6.014c1.6 0 3.012.604 4.092 1.6l3.155-3.156C19.24 3.01 15.938 1.5 12.24 1.5 6.22 1.5 1.5 6.22 1.5 12.24s4.72 10.74 10.74 10.74c5.968 0 10.76-4.793 10.76-10.76 0-.663-.06-1.32-.177-1.935H12.24Z"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      )}

      {step === "onboarding" && tempProfile && (
        <div className="flex-1 max-w-md mx-auto w-full animate-fade-in space-y-6">
          {/* Onboarding Header */}
          <div className="text-center">
            {tempProfile.profile_photo ? (
              <img 
                src={tempProfile.profile_photo} 
                alt="Profile" 
                className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-amber-500 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2 text-amber-600">
                <User size={32} />
              </div>
            )}
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
              Customize Your Profile
            </h2>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Take 20 seconds to stand out, or skip to jump straight in.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <div 
            className="rounded-3xl p-6 border space-y-4"
            style={{ 
              background: "var(--color-surface)", 
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-md)"
            }}
          >
            {/* Headline */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Software Engineer, Founder, Student"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border transition-all"
                style={{ background: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
            </div>

            {/* Company & College */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Google"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border transition-all"
                  style={{ background: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                  College
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Stanford"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border transition-all"
                  style={{ background: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </div>
            </div>

            {/* Interests (Max 3) */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text)" }}>
                Interests <span className="text-[10px] text-amber-600 font-normal">(Pick up to 3)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {interestsOptions.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                        isSelected 
                          ? "bg-amber-500 text-white border-amber-500" 
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Professional Tags */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text)" }}>
                Professional Tags <span className="text-[10px] text-amber-600 font-normal">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tagsOptions.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                        isSelected 
                          ? "bg-amber-500 text-white border-amber-500" 
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Networking Goal */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text)" }}>
                Networking Goal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {goalsOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNetworkingGoal(opt.value)}
                    className={`px-2 py-2 rounded-xl text-center text-xs font-semibold border cursor-pointer transition-all ${
                      networkingGoal === opt.value
                        ? "bg-amber-500/10 text-amber-700 border-amber-500"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                Social Links <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <Globe size={14} className="text-gray-400" />
                  <input
                    type="text"
                    value={socialLinks.linkedin}
                    onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                    placeholder="LinkedIn username"
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <Globe size={14} className="text-gray-400" />
                  <input
                    type="text"
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                    placeholder="Instagram handle"
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <Globe size={14} className="text-gray-400" />
                  <input
                    type="text"
                    value={socialLinks.github}
                    onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                    placeholder="GitHub username"
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <Globe size={14} className="text-gray-400" />
                  <input
                    type="text"
                    value={socialLinks.website}
                    onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                    placeholder="Website URL"
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Error Feedback */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {/* Submits */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOnboardingSubmit(true)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Skip Onboarding
              </button>
              <button
                type="button"
                onClick={() => handleOnboardingSubmit(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md bg-amber-500 hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? "Saving..." : "Save & Continue"} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "joining" && (
        <div className="flex-1 flex flex-col justify-center items-center animate-pulse">
          <Sparkles className="w-16 h-16 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>
            Checking you in...
          </h2>
          <p className="text-xs text-gray-400">
            Redirecting you to the chat and menu.
          </p>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="text-center text-[10px] text-gray-400 mt-8 pb-12 select-none">
        Powered by Perch Restaurant OS • Evolving to Connect Communities
      </footer>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
          <Loader label="Loading venue details..." />
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
