"use client";

import { useState } from "react";

import DynamicMap from "@/components/DynamicMap";
import AnalysisForm from "@/components/AnalysisForm";
import ResultsPanel from "@/components/ResultsPanel";

import type { AnalysisResponse } from "@/lib/api";
import type { BoundingBox } from "@/types/map";

export default function HomePage() {
  const [aoi, setAOI] = useState<BoundingBox | null>(null);
  const [result, setResult] =
    useState<AnalysisResponse | null>(null);

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Navbar */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-3xl font-bold tracking-wide">
              DRISHTI
            </h1>

            <p className="text-sm text-slate-400">
              AI-Powered Earth Observation Platform
            </p>
          </div>

          <nav className="hidden gap-8 text-slate-300 md:flex">
            <a
              href="#dashboard"
              className="hover:text-white"
            >
              Dashboard
            </a>

            <a
              href="#analysis"
              className="hover:text-white"
            >
              Analysis
            </a>

            <a
              href="#reports"
              className="hover:text-white"
            >
              Reports
            </a>
          </nav>

        </div>
      </header>

      {/* Hero Section */}
      <section
        id="dashboard"
        className="mx-auto max-w-7xl px-6 py-12"
      >
        <div className="max-w-3xl">

          <h2 className="text-5xl font-bold leading-tight">
            Monitor Earth Changes
            <br />
            With AI
          </h2>

          <p className="mt-6 text-lg text-slate-400">
            Analyze vegetation health,
            detect environmental changes,
            generate multilingual reports,
            and export professional PDF
            reports from satellite imagery.
          </p>

        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-6">

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-slate-400">
              NDVI Analysis
            </h3>

            <p className="mt-2 text-2xl font-bold text-green-400">
              Active
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-slate-400">
              AI Reports
            </h3>

            <p className="mt-2 text-2xl font-bold text-blue-400">
              English + Hindi
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-slate-400">
              PDF Export
            </h3>

            <p className="mt-2 text-2xl font-bold text-purple-400">
              Enabled
            </p>
          </div>

        </div>

      </section>

      {/* Main Dashboard */}
      <section
        id="analysis"
        className="mx-auto max-w-7xl px-6 py-10"
      >

        <div className="grid gap-8 lg:grid-cols-5">

          {/* Map */}
          <div className="lg:col-span-3">

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4">

              <h2 className="mb-4 text-xl font-semibold text-white">
                Satellite View
              </h2>
              <div className="h-[550px] w-full overflow-hidden rounded-xl">
                <DynamicMap onAOIChange={setAOI} />
              </div>
            </div>

          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <AnalysisForm
              aoi={aoi}
              onResult={setResult}
            />
          </div>

        </div>

      </section>

      {/* Results */}
      {result && (
        <section
          id="reports"
          className="mx-auto max-w-7xl px-6 pb-16"
        >
          <ResultsPanel
            result={result}
          />
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">

        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-500">

          © 2026 DRISHTI —
          AI-Powered Geospatial Intelligence Platform

        </div>

      </footer>

    </main>
  );
}