"use client";

import { useEffect } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-900">
      <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-3xl max-w-lg w-full shadow-2xl">
        <FaExclamationTriangle className="text-6xl text-rose-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold mb-4 text-slate-900">Something went wrong</h2>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          We encountered an unexpected error while processing your request. Please try again or return to the homepage.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg transition"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-slate-100 hover:bg-slate-700 text-slate-900 rounded-xl transition"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
