"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface GeneratedPerspective {
  name: string;
  company: string;
  previewUrl: string;
  shareUrl: string;
  useCase: string;
}

function ResultContent() {
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(true);
  const [perspective, setPerspective] = useState<GeneratedPerspective | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Simulate generation delay
    const timer = setTimeout(() => {
      // In production, this would call /api/generate with the conversation_id
      // For now, using demo data
      setPerspective({
        name: searchParams.get("name") || "Product Leader",
        company: searchParams.get("company") || "Your Company",
        previewUrl: "https://pv.getperspective.ai/share/demo?mode=preview",
        shareUrl: "https://getperspective.ai/share/demo",
        useCase: searchParams.get("useCase") || "feature_request",
      });
      setIsGenerating(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const copyShareLink = () => {
    if (perspective) {
      navigator.clipboard.writeText(perspective.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUseCaseLabel = (useCase: string) => {
    const labels: Record<string, string> = {
      feature_request: "Feature Requests",
      new_product_discovery: "Product Discovery",
      existing_feature_feedback: "Feature Feedback",
    };
    return labels[useCase] || "Customer Research";
  };

  if (isGenerating) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-black">
        <div className="text-center">
          <div className="mb-8">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
            Generating your Lenny interview...
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Applying methodology from 269 podcast episodes
          </p>
        </div>
      </div>
    );
  }

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
              {perspective?.company}
            </span>{" "}
            about {getUseCaseLabel(perspective?.useCase || "")}
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
              href={perspective?.previewUrl}
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
