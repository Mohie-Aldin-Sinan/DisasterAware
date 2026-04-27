"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FaArrowRight,
  FaBolt,
  FaChartLine,
  FaDatabase,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaWaveSquare,
} from "react-icons/fa";
import { fetchJson } from "./lib/api";
import { FEATURE_PILLARS } from "./lib/content";

const LiveMap = dynamic(() => import("./components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] w-full rounded-[32px] border border-slate-200 bg-white/80 animate-pulse" />
  ),
});

const headlinePhrases = [
  "Predict regional risk.",
  "Explain the reasoning.",
  "Guide preparedness faster.",
];

export default function Home() {
  const [modelInfo, setModelInfo] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [cityRisks, setCityRisks] = useState([]);
  const [homepageError, setHomepageError] = useState("");
  const [typewriterText, setTypewriterText] = useState("");

  useEffect(() => {
    let currentPhrase = 0;
    let currentChar = 0;
    let deleting = false;
    let timer;

    const tick = () => {
      const phrase = headlinePhrases[currentPhrase];
      const nextLength = deleting ? currentChar - 1 : currentChar + 1;
      setTypewriterText(phrase.slice(0, nextLength));
      currentChar = nextLength;

      let speed = deleting ? 40 : 75;
      if (!deleting && currentChar === phrase.length) {
        deleting = true;
        speed = 1500;
      } else if (deleting && currentChar === 0) {
        deleting = false;
        currentPhrase = (currentPhrase + 1) % headlinePhrases.length;
        speed = 280;
      }

      timer = window.setTimeout(tick, speed);
    };

    timer = window.setTimeout(tick, 500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadHomepageData() {
      const [modelResult, statusResult, riskResult] = await Promise.allSettled([
        fetchJson("/api/model-info/"),
        fetchJson("/status/"),
        fetchJson("/api/city-risks/"),
      ]);

      if (!mounted) {
        return;
      }

      if (modelResult.status === "fulfilled") {
        setModelInfo(modelResult.value);
      }

      if (statusResult.status === "fulfilled") {
        setStatusInfo(statusResult.value);
      }

      if (riskResult.status === "fulfilled") {
        setCityRisks(riskResult.value.data || []);
      }

      if (
        modelResult.status === "rejected" &&
        statusResult.status === "rejected" &&
        riskResult.status === "rejected"
      ) {
        setHomepageError("Unable to load live platform metrics.");
      } else {
        setHomepageError("");
      }
    }

    loadHomepageData();
    return () => {
      mounted = false;
    };
  }, []);

  const strongestCities = useMemo(() => {
    const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return [...cityRisks]
      .sort((left, right) => (order[right.risk_level] || 0) - (order[left.risk_level] || 0))
      .slice(0, 4);
  }, [cityRisks]);

  const featureBars = useMemo(() => {
    const importances = modelInfo?.feature_importances || {};
    const entries = Object.entries(importances).slice(0, 5);
    const maxValue = entries[0]?.[1] || 1;

    return entries.map(([feature, value]) => ({
      feature,
      value,
      percentage: Math.max(12, (value / maxValue) * 100),
    }));
  }, [modelInfo]);

  const metrics = modelInfo?.metrics;

  return (
    <div className="overflow-x-hidden pt-20 text-slate-900">
      <section className="section-shell relative py-20 md:py-28">
        <div className="absolute left-0 top-10 h-72 w-72 rounded-full bg-emerald-500/14 blur-[110px]" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-500/12 blur-[120px]" />

        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Disaster risk intelligence platform
            </div>

            <h1 className="max-w-4xl font-outfit text-5xl font-black leading-[0.95] tracking-tight text-slate-950 md:text-7xl">
              Operational disaster insights for monitoring and preparedness.
            </h1>

            <div className="mt-6 h-8 text-lg font-medium text-slate-600 md:text-2xl">
              {typewriterText}
              <span className="ml-1 animate-pulse text-emerald-600">|</span>
            </div>

            <p className="mt-8 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              DisasterAware combines a Next.js interface, a FastAPI backend, and an
              explainable machine learning pipeline to forecast disaster risk across Indian
              cities using seasonal, geospatial, and population data.
            </p>

            {homepageError ? (
              <div className="mt-6 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {homepageError}
              </div>
            ) : null}

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/prediction"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Launch prediction workflow
                <FaArrowRight />
              </Link>
              <Link
                href="/model"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-7 py-4 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
              >
                Inspect model intelligence
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <div className="glass-panel rounded-[28px] p-5">
                <div className="text-sm font-medium text-slate-500">API status</div>
                <div className="mt-2 text-3xl font-black text-slate-950">
                  {statusInfo?.status === "ok" ? "Online" : "--"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Model {statusInfo?.model_loaded ? "loaded" : "offline"}
                </div>
              </div>
              <div className="glass-panel rounded-[28px] p-5">
                <div className="text-sm font-medium text-slate-500">Training samples</div>
                <div className="mt-2 text-3xl font-black text-slate-950">
                  {metrics?.training_samples?.toLocaleString() || "--"}
                </div>
                <div className="mt-1 text-sm text-slate-600">Historical dataset records</div>
              </div>
              <div className="glass-panel rounded-[28px] p-5">
                <div className="text-sm font-medium text-slate-500">Macro F1</div>
                <div className="mt-2 text-3xl font-black text-slate-950">
                  {metrics?.f1_macro?.toFixed(2) || "--"}
                </div>
                <div className="mt-1 text-sm text-slate-600">Balanced performance signal</div>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <div className="glass-panel mesh-bg rounded-[36px] p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                    System snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    Live readiness overview
                  </h2>
                </div>
                <div className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">
                  {statusInfo?.db_status || "Checking"}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: <FaChartLine />,
                    label: "Accuracy",
                    value: metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : "--",
                  },
                  {
                    icon: <FaWaveSquare />,
                    label: "ROC-AUC",
                    value: metrics?.roc_auc_macro?.toFixed(2) || "--",
                  },
                  {
                    icon: <FaDatabase />,
                    label: "Data sources",
                    value: metrics?.data_sources?.length || "--",
                  },
                  {
                    icon: <FaMapMarkerAlt />,
                    label: "Cities covered",
                    value: cityRisks.length || "--",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] bg-white/86 p-5 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-500">
                      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="mt-4 text-3xl font-black text-slate-950">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/86 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Top active city watchlist
                    </p>
                    <p className="text-sm text-slate-600">
                      Auto-ranked using the current seasonal profile.
                    </p>
                  </div>
                  <FaBolt className="text-amber-500" />
                </div>
                <div className="mt-4 space-y-3">
                  {strongestCities.length > 0 ? (
                    strongestCities.map((city) => (
                      <div
                        key={city.city}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{city.city}</div>
                          <div className="text-sm text-slate-500">Seasonal risk scan</div>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                          {city.risk_level}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      City-level model output will appear here when the API responds.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {homepageError ? (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Live platform metrics could not be loaded: {homepageError}
          </div>
        ) : null}
      </section>

      <section className="section-shell py-10">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURE_PILLARS.map((pillar) => (
            <div key={pillar.title} className="glass-panel rounded-[30px] p-8">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
                {pillar.eyebrow}
              </p>
              <h3 className="mt-4 text-2xl font-bold text-slate-950">{pillar.title}</h3>
              <p className="mt-4 leading-7 text-slate-600">{pillar.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="live-map" className="section-shell py-20">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Real-time monitoring
            </p>
            <h2 className="mt-3 text-4xl font-bold text-slate-950">Live seismic intelligence map</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              The frontend renders a live earthquake layer from the FastAPI USGS proxy, keeping
              the browser lightweight while preserving a real operational data feed.
            </p>
          </div>
          <Link
            href="/alerts"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
          >
            Open full alerts console
            <FaArrowRight />
          </Link>
        </div>

        <LiveMap />
      </section>

      <section className="section-shell py-20">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="glass-panel rounded-[34px] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Model explainability
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Feature importance surfaced in the product
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Instead of burying model metrics in notebooks, DisasterAware exposes the signals
              influencing the prediction so the app tells a data story, not just a score.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {(metrics?.data_sources || ["EM-DAT", "USGS", "NDMA"]).map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-8">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-950">Top influence signals</h3>
              <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700">
                Explainable output
              </div>
            </div>
            <div className="mt-8 space-y-5">
              {featureBars.length > 0 ? (
                featureBars.map((item) => (
                  <div key={item.feature}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.feature}</span>
                      <span className="font-mono text-slate-500">{item.value.toFixed(3)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-5 py-10 text-sm text-slate-500">
                  Feature importance bars will render once model metadata is available.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pb-24 pt-6">
        <div className="rounded-[40px] bg-slate-950 px-8 py-12 text-white md:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
                Platform overview
              </p>
              <h2 className="mt-4 text-4xl font-bold">
                Built to support monitoring, planning, and risk awareness.
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                DisasterAware combines live hazard monitoring, explainable risk scoring, and
                operational guidance into a single decision-support experience for regional
                stakeholders and public safety workflows.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/prediction"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Try the workflow
                <FaArrowRight />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Read the architecture story
              </Link>
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              "Next.js 15 App Router frontend",
              "FastAPI inference and data proxy backend",
              "Integrated risk analytics and preparedness guidance",
            ].map((point) => (
              <div key={point} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <FaShieldAlt className="text-emerald-300" />
                <p className="mt-3 text-sm leading-7 text-slate-200">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
