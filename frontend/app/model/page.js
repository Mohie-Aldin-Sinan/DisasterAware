"use client";

import { useEffect, useMemo, useState } from "react";
import { FaChartBar, FaDatabase, FaServer, FaShieldAlt } from "react-icons/fa";
import { fetchJson } from "../lib/api";

export default function ModelExplainerPage() {
  const [modelInfo, setModelInfo] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [modelPayload, statusPayload] = await Promise.all([
          fetchJson("/api/model-info/"),
          fetchJson("/status/"),
        ]);

        if (!mounted) {
          return;
        }

        setModelInfo(modelPayload);
        setStatusInfo(statusPayload);
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || "Unable to load model diagnostics.");
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const metricCards = useMemo(() => {
    const metrics = modelInfo?.metrics || {};
    return [
      {
        label: "Accuracy",
        value: metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : "--",
        icon: <FaChartBar />,
      },
      {
        label: "Macro F1",
        value: metrics.f1_macro ? metrics.f1_macro.toFixed(3) : "--",
        icon: <FaShieldAlt />,
      },
      {
        label: "ROC-AUC",
        value: metrics.roc_auc_macro ? metrics.roc_auc_macro.toFixed(3) : "--",
        icon: <FaServer />,
      },
      {
        label: "Training samples",
        value: metrics.training_samples?.toLocaleString() || "--",
        icon: <FaDatabase />,
      },
    ];
  }, [modelInfo]);

  return (
    <div className="pb-16 pt-28 text-slate-900">
      <section className="section-shell">
        <div className="mb-8 rounded-[36px] bg-white/82 px-8 py-10 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
            Explainability panel
          </p>
          <h1 className="mt-4 text-4xl font-bold text-slate-950 md:text-5xl">
            Model diagnostics and decision-support signals
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            This page makes the backend legible: health state, evaluation metrics, and the feature
            signals shaping predictions. It makes the model transparent enough to support
            operational understanding instead of presenting a black-box score.
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {modelInfo?.metrics?.validation_warning ? (
          <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
            {modelInfo.metrics.validation_warning}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-panel rounded-[34px] p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {metricCards.map((card) => (
                <div key={card.label} className="rounded-[26px] bg-white/90 p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{card.icon}</div>
                    <span className="text-sm font-medium">{card.label}</span>
                  </div>
                  <div className="mt-4 text-3xl font-black text-slate-950">{card.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[26px] bg-slate-950 p-6 text-white">
              <h2 className="text-lg font-bold">Runtime health</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl bg-white/6 px-4 py-3">
                  <span>Inference engine</span>
                  <span>{statusInfo?.model_loaded ? "Online" : "Offline"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/6 px-4 py-3">
                  <span>Database</span>
                  <span>{statusInfo?.db_status || "--"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/6 px-4 py-3">
                  <span>Model build</span>
                  <span>{statusInfo?.model_version || "Unknown"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-8">
            <h2 className="text-2xl font-bold text-slate-950">How the prediction pipeline works</h2>
            <div className="mt-6 space-y-6 text-sm leading-8 text-slate-600">
              <p>
                DisasterAware uses a classification pipeline built around engineered geospatial,
                seasonal, and demographic features such as coastal proximity, rainfall profile,
                seismic zone, elevation, and urban exposure.
              </p>
              <p>
                The backend persists every prediction request, exposes a clean status endpoint, and
                returns confidence, risk factors, and recommended actions so the UI can show both
                probability and operational context.
              </p>
              <p>
                This is not only a trained model. It is a productized analytics layer with API
                contracts, resilience handling, interactive visualization, and decision-support
                guidance integrated into the application.
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-950">Primary influence signals</h3>
              <div className="mt-4 space-y-4">
                {Object.entries(modelInfo?.feature_importances || {})
                  .slice(0, 6)
                  .map(([feature, value]) => (
                    <div key={feature}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{feature}</span>
                        <span className="font-mono text-slate-500">{value.toFixed(3)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                          style={{ width: `${Math.max(10, value * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {modelInfo?.metrics?.baseline_metrics ? (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-950">Baseline comparison</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900">Ensemble model</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">
                      Accuracy {modelInfo.metrics.accuracy?.toFixed?.(4) || modelInfo.metrics.accuracy}
                      <br />
                      Macro F1 {modelInfo.metrics.f1_macro?.toFixed?.(4) || modelInfo.metrics.f1_macro}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900">Logistic regression baseline</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">
                      Accuracy {modelInfo.metrics.baseline_metrics.logistic_regression.accuracy.toFixed(4)}
                      <br />
                      Macro F1 {modelInfo.metrics.baseline_metrics.logistic_regression.f1_macro.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {modelInfo?.metrics?.model_limitations?.length ? (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-950">Current model limitations</h3>
                <div className="mt-4 space-y-3">
                  {modelInfo.metrics.model_limitations.map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
