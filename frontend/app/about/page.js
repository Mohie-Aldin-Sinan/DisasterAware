export default function AboutPage() {
  return (
    <div className="pb-16 pt-28 text-slate-900">
      <section className="section-shell">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="rounded-[36px] bg-slate-950 px-8 py-10 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
              Architecture story
            </p>
            <h1 className="mt-4 text-4xl font-bold md:text-5xl">About DisasterAware</h1>
            <p className="mt-4 text-base leading-8 text-slate-300">
              DisasterAware is a full-stack disaster intelligence platform designed to show how
              live data ingestion, explainable ML inference, and thoughtful interface design can
              work together in a single operational product.
            </p>
          </div>

          <div className="glass-panel rounded-[34px] p-8 text-sm leading-8 text-slate-600">
            <p>
              The frontend is built with Next.js App Router and interactive geospatial components.
              The backend is powered by FastAPI, serving model inference, history persistence, and
              a live proxy to external hazard feeds. SQLite keeps the local developer experience
              simple while still supporting meaningful app behavior.
            </p>
            <p className="mt-5">
              The machine learning pipeline takes city-level static factors, seasonal context, and
              disaster-type inputs to estimate risk bands and confidence. Instead of stopping at
              the prediction, the application surfaces recommended actions and feature influence so
              the result is easier to trust and present.
            </p>
            <p className="mt-5">
              The platform is designed to show how data ingestion, predictive analytics, and
              user-facing operational guidance can be combined into a coherent system for risk
              monitoring and preparedness.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
