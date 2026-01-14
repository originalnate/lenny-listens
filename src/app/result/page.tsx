"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GeneratedPerspective, getUseCaseLabel } from "@/lib/lenny-methodology";

function ResultContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("cid");

  const [perspective, setPerspective] = useState<GeneratedPerspective | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchPerspective = useCallback(async () => {
    if (!conversationId) {
      setError("No conversation ID provided");
      return;
    }

    try {
      const response = await fetch(`/api/perspective/${conversationId}`);

      if (response.status === 404) {
        // Perspective not found yet - might still be processing webhook
        setPerspective({
          conversation_id: conversationId,
          status: "pending",
          intake: {
            conversation_id: conversationId,
            name: "",
            company_domain: "",
            use_case: "feature_request",
            created_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch perspective");
      }

      const data = await response.json();
      setPerspective(data);
    } catch (err) {
      console.error("Error fetching perspective:", err);
      setError("Failed to load your interview. Please try again.");
    }
  }, [conversationId]);

  useEffect(() => {
    fetchPerspective();

    // Poll every 3 seconds if status is pending or generating
    const interval = setInterval(() => {
      if (perspective?.status === "pending" || perspective?.status === "generating") {
        fetchPerspective();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchPerspective, perspective?.status]);

  const copyShareLink = () => {
    if (perspective?.share_url) {
      navigator.clipboard.writeText(perspective.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-black">
        <div className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">{error}</h1>
          <a href="/" className="text-amber-600 hover:underline dark:text-amber-400">
            ← Go back and try again
          </a>
        </div>
      </div>
    );
  }

  // Loading/Pending state
  if (!perspective || perspective.status === "pending" || perspective.status === "generating") {
    const statusMessage = perspective?.status === "generating"
      ? "Creating your personalized Lenny interview..."
      : "Processing your intake...";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-black">
        <div className="text-center">
          <div className="mb-8">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
            {statusMessage}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Applying Lenny&apos;s methodology from 269 podcast episodes
          </p>
          {perspective?.intake?.company_domain && (
            <p className="mt-4 text-sm text-zinc-500">
              Customizing for <span className="font-medium">{perspective.intake.company_domain}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state from generation
  if (perspective.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-black">
        <div className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">
            {perspective.error || "Failed to generate your interview. Please try again."}
          </p>
          <a href="/" className="text-amber-600 hover:underline dark:text-amber-400">
            ← Go back and try again
          </a>
        </div>
      </div>
    );
  }

  // Ready state - show the generated perspective
  const companyName = perspective.intake?.company_domain?.replace(/\.(com|io|co|ai|org|net)$/i, "") || "Your Company";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Success Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-white">
            Your Lenny interview is ready!
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Custom research interview for{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {companyName}
            </span>{" "}
            about {getUseCaseLabel(perspective.intake?.use_case || "")}
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Try It Yourself Card */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">
              Try it yourself
            </h2>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Experience the interview as if you were one of your customers being interviewed by Lenny.
            </p>
            <a
              href={perspective.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-6 font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Start Preview Interview
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Invite Customers Card */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">
              Invite your customers
            </h2>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Share this link with your customers to start gathering real insights with Lenny&apos;s methodology.
            </p>
            <button
              onClick={copyShareLink}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-zinc-200 bg-white px-6 font-semibold text-zinc-900 transition-colors hover:border-amber-500 hover:bg-amber-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-amber-500 dark:hover:bg-zinc-700"
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Share Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* CTA to Sign Up */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center text-white">
          <h2 className="mb-3 text-2xl font-bold">
            Want to unlock the full power?
          </h2>
          <p className="mb-6 text-amber-100">
            Create unlimited interviews, analyze responses with AI, and get actionable insights.
          </p>
          <a
            href="https://getperspective.ai/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 font-semibold text-amber-600 transition-colors hover:bg-amber-50"
          >
            Sign up for Perspective AI
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-zinc-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400"
          >
            ← Create another Lenny interview
          </a>
        </div>
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-black">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
