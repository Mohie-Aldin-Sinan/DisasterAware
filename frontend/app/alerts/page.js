"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { FaHistory, FaMapMarkedAlt, FaSpinner, FaWaveSquare } from "react-icons/fa";
import { fetchJson } from "../lib/api";

const LiveMap = dynamic(() => import("../components/LiveMap"), { ssr: false });

export default function AlertsPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      try {
        const payload = await fetchJson("/api/history/");
        if (mounted) {
          setHistory(payload.data || []);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || "Unable to load history.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalEvents = history.length;
    const criticalEvents = history.filter((event) => event.risk_level === "Critical").length;
    const totalAffected = history.reduce(
      (sum, event) => sum + (event.affected_population || 0),
      0,
    );

    return { totalEvents, criticalEvents, totalAffected };
  }, [history]);

  return (
    <div className="pb-16 pt-28 text-slate-900">
      <section className="section-shell">
        <div className="mb-8 rounded-[36px] bg-slate-950 px-8 py-10 text-white md:px-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
                Alerts console
              </p>
              <h1 className="mt-4 text-4xl font-bold md:text-5xl">
                Live hazard monitoring and historical incident registry
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                This page blends real-time seismic mapping with stored prediction history so the
                platform behaves like a cohesive operational dashboard with both live signals and
                recorded assessments.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl bg-white/8 px-5 py-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Records tracked
                </div>
                <div className="mt-2 text-3xl font-black">{stats.totalEvents}</div>
              </div>
              <div className="rounded-3xl bg-white/8 px-5 py-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Critical alerts
                </div>
                <div className="mt-2 text-3xl font-black">{stats.criticalEvents}</div>
              </div>
              <div className="rounded-3xl bg-white/8 px-5 py-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  People affected
                </div>
                <div className="mt-2 text-3xl font-black">
                  {stats.totalAffected.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="glass-panel rounded-[34px] p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-950">
                  <FaMapMarkedAlt className="text-emerald-600" />
                  Real-time seismic map
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  Powered by the backend USGS proxy to avoid client-side CORS issues and keep the
                  data ingestion pattern clean.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                <FaWaveSquare />
                Live feed
              </div>
            </div>
            <LiveMap />
          </div>

          <div className="glass-panel rounded-[34px] p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-950">
                  <FaHistory className="text-amber-500" />
                  Incident and prediction history
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  Generated records from model runs are persisted in SQLite and replayed here as a
                  searchable operations log.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-12">
                <FaSpinner className="animate-spin text-3xl text-emerald-500" />
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                {error}
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                No historical entries yet. Run a few predictions to populate the operations log.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 pb-3 font-medium">Date</th>
                      <th className="px-2 pb-3 font-medium">Location</th>
                      <th className="px-2 pb-3 font-medium">Type</th>
                      <th className="px-2 pb-3 font-medium">Severity</th>
                      <th className="px-2 pb-3 font-medium">Risk</th>
                      <th className="px-2 pb-3 font-medium">Affected</th>
                      <th className="px-2 pb-3 font-medium">Deaths</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((event) => (
                      <tr
                        key={event.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-2 py-4 font-mono text-xs text-slate-500">{event.date}</td>
                        <td className="px-2 py-4">
                          {event.city}, {event.state}
                        </td>
                        <td className="px-2 py-4 capitalize">{event.disaster_type}</td>
                        <td className="px-2 py-4">{event.severity}/10</td>
                        <td className="px-2 py-4">
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                            {event.risk_level}
                          </span>
                        </td>
                        <td className="px-2 py-4">{event.affected_population.toLocaleString()}</td>
                        <td className="px-2 py-4 font-semibold text-rose-600">
                          {event.total_deaths.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
