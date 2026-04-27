"use client";

import { useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBolt,
  FaExclamationTriangle,
  FaFire,
  FaMapMarkerAlt,
  FaSmog,
  FaWater,
  FaWind,
} from "react-icons/fa";
import dynamic from "next/dynamic";
import { fetchJson } from "../lib/api";

const MiniMap = dynamic(() => import("./MiniMap"), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-slate-100 animate-pulse" />,
});

const CITIES = [
  "Ahmedabad",
  "Bangalore",
  "Chennai",
  "Delhi",
  "Hyderabad",
  "Jaipur",
  "Kolkata",
  "Lucknow",
  "Mumbai",
  "Pune",
  "Bhopal",
  "Bhubaneswar",
  "Kochi",
  "Surat",
  "Visakhapatnam",
];

const MONTHS = [
  { val: 1, label: "January" },
  { val: 2, label: "February" },
  { val: 3, label: "March" },
  { val: 4, label: "April" },
  { val: 5, label: "May" },
  { val: 6, label: "June" },
  { val: 7, label: "July" },
  { val: 8, label: "August" },
  { val: 9, label: "September" },
  { val: 10, label: "October" },
  { val: 11, label: "November" },
  { val: 12, label: "December" },
];

const DISASTER_TYPES = [
  { label: "Cyclone", value: "cyclone", icon: <FaWind /> },
  { label: "Drought", value: "drought", icon: <FaSmog /> },
  { label: "Earthquake", value: "earthquake", icon: <FaExclamationTriangle /> },
  { label: "Flood", value: "flood", icon: <FaWater /> },
  { label: "Heatwave", value: "heatwave", icon: <FaFire /> },
  { label: "Landslide", value: "landslide", icon: <FaMapMarkerAlt /> },
  { label: "Tsunami", value: "tsunami", icon: <FaWater /> },
  { label: "Wildfire", value: "wildfire", icon: <FaFire /> },
];

const CITY_COORDS = {
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Delhi: { lat: 28.6139, lon: 77.209 },
  Hyderabad: { lat: 17.385, lon: 78.4867 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Lucknow: { lat: 26.8467, lon: 80.9462 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Bhopal: { lat: 23.2599, lon: 77.4126 },
  Bhubaneswar: { lat: 20.2961, lon: 85.8245 },
  Kochi: { lat: 9.9312, lon: 76.2673 },
  Surat: { lat: 21.1702, lon: 72.8311 },
  Visakhapatnam: { lat: 17.6868, lon: 83.2185 },
};

export default function PredictionWizard() {
  const [step, setStep] = useState(1);
  const [city, setCity] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [disasterType, setDisasterType] = useState("");
  const [severity, setSeverity] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleNext = () => setStep((current) => Math.min(current + 1, 3));

  const handlePrev = () => {
    setResult(null);
    setError("");
    setLoading(false);
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleReset = () => {
    setResult(null);
    setError("");
    setLoading(false);
    setStep(1);
  };

  const handleAnalyze = async () => {
    setStep(3);
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await fetchJson("/api/predict/", {
        method: "POST",
        body: JSON.stringify({
          city,
          disaster_type: disasterType,
          month,
          severity,
        }),
      });

      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 900);
    } catch (requestError) {
      setError(requestError.message || "Unable to complete the assessment right now.");
      setLoading(false);
    }
  };

  const riskColors = {
    Critical: "text-rose-500",
    High: "text-orange-500",
    Medium: "text-amber-500",
    Low: "text-emerald-500",
  };

  const riskBg = {
    Critical: "bg-rose-500/10 border-rose-500/30",
    High: "bg-orange-500/10 border-orange-500/30",
    Medium: "bg-amber-500/10 border-amber-500/30",
    Low: "bg-emerald-500/10 border-emerald-500/30",
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-24 text-slate-900">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-3xl font-bold text-transparent">
              Risk Assessment
            </h1>
            <p className="mt-1 text-sm text-slate-600">Scenario-based operational analysis</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-2 w-12 rounded-full ${step >= item ? "bg-emerald-500" : "bg-slate-100"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <FaMapMarkerAlt className="text-emerald-400" />
              Area and timeframe
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">City</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                >
                  <option value="" disabled>
                    Select a city
                  </option>
                  {CITIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Month of the year
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  value={month}
                  onChange={(event) => setMonth(parseInt(event.target.value, 10))}
                >
                  {MONTHS.map((entry) => (
                    <option key={entry.val} value={entry.val}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                disabled={!city}
                onClick={handleNext}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                Next
                <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <FaBolt className="text-emerald-400" />
              Scenario setup
            </h2>

            <div>
              <label className="mb-4 block text-sm font-medium text-slate-600">Disaster type</label>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {DISASTER_TYPES.map((entry) => (
                  <button
                    key={entry.value}
                    onClick={() => setDisasterType(entry.value)}
                    className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-4 transition ${
                      disasterType === entry.value
                        ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div className="text-2xl">{entry.icon}</div>
                    <span className="font-medium">{entry.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Estimated severity: <span className="font-bold text-slate-900">{severity}</span> / 10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={severity}
                onChange={(event) => setSeverity(parseInt(event.target.value, 10))}
                className="w-full accent-emerald-500"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Minor / localized</span>
                <span>Catastrophic</span>
              </div>
            </div>

            <div className="flex justify-between gap-4 border-t border-slate-200 pt-6">
              <button
                onClick={handlePrev}
                className="flex items-center gap-2 rounded-lg bg-slate-200 px-6 py-2 text-slate-800 transition hover:bg-slate-300"
              >
                <FaArrowLeft />
                Back
              </button>
              <button
                disabled={!disasterType}
                onClick={handleAnalyze}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                Analyze risk
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in duration-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
                <h3 className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-xl font-bold text-transparent">
                  Running risk assessment...
                </h3>
                <p className="mt-2 text-slate-600">
                  Evaluating seasonal conditions, historical patterns, and regional exposure.
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center rounded-xl border border-rose-500/30 bg-rose-500/10 p-6">
                <FaExclamationTriangle className="mb-4 text-4xl text-rose-500" />
                <h3 className="mb-2 text-xl font-bold text-rose-500">Assessment unavailable</h3>
                <p className="text-center text-slate-700">{error}</p>
                <button
                  onClick={handlePrev}
                  className="mt-6 rounded-lg bg-slate-200 px-6 py-2 text-slate-800 hover:bg-slate-300"
                >
                  Review inputs
                </button>
              </div>
            ) : result ? (
              <div className="space-y-8">
                <div
                  className={`flex flex-col items-center justify-between gap-8 rounded-2xl border p-8 md:flex-row ${riskBg[result.risk_level]}`}
                >
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-600">
                      Assessed risk level
                    </p>
                    <h2 className={`text-6xl font-black ${riskColors[result.risk_level]}`}>
                      {result.risk_level}
                    </h2>
                    <p className="mt-4 text-slate-700">
                      The current scenario is assessed with{" "}
                      <strong className="text-slate-900">
                        {(result.confidence * 100).toFixed(0)}%
                      </strong>{" "}
                      confidence and an estimated potential impact affecting up to{" "}
                      <strong className="text-slate-900">
                        {result.affected_population_estimate.toLocaleString()}
                      </strong>{" "}
                      people in the surrounding region.
                    </p>
                  </div>
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-8 border-slate-200">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(${
                          result.risk_level === "Low"
                            ? "#34d399"
                            : result.risk_level === "Medium"
                              ? "#f59e0b"
                              : result.risk_level === "High"
                                ? "#f97316"
                                : "#f43f5e"
                        } ${result.risk_score * 360}deg, transparent 0)`,
                      }}
                    />
                    <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
                      <span className="text-3xl font-bold text-slate-900">
                        {Math.round(result.risk_score * 100)}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-600">
                        Score
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-100/40 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                      <FaBolt className="text-amber-500" />
                      Key risk factors
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.key_risk_factors.map((factor, index) => (
                        <span
                          key={index}
                          className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm text-amber-700"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-100/40 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                      <FaExclamationTriangle className="text-rose-500" />
                      Recommended actions
                    </h3>
                    <ul className="space-y-3">
                      {result.recommended_actions.map((action, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-800">
                            {index + 1}
                          </span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-lg font-bold">Location reference</h3>
                  <div className="h-48 overflow-hidden rounded-xl border border-slate-200">
                    {CITY_COORDS[city] ? (
                      <MiniMap lat={CITY_COORDS[city].lat} lon={CITY_COORDS[city].lon} />
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 md:flex-row">
                  <button
                    onClick={handleReset}
                    className="rounded-lg bg-slate-200 px-6 py-2 text-sm text-slate-800 hover:bg-slate-300"
                  >
                    New assessment
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Based on {result.data_sources.join(" · ")} <br />
                    Decision-support guidance enabled
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
