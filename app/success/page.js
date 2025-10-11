"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function Success() {
  useEffect(() => {
    // Mark Pro on this device (simple MVP)
    localStorage.setItem("hdp_pro", "1");
  }, []);

  return (
    <main className="min-h-screen bg-orange-50 text-gray-900">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-bold text-orange-900 mb-2">You're Pro! 🎉</h1>
        <p className="mb-6">
          Thanks for supporting HotDish Planner. Pro features are now unlocked on this device.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-orange-600 text-white px-4 py-2 hover:bg-orange-700"
        >
          Go back to the planner
        </Link>
        <p className="text-xs text-gray-600 mt-4">
          (We’ll add login + server verification later.)
        </p>
      </div>
    </main>
  );
}
