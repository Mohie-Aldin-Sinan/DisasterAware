import { PREPAREDNESS_GUIDES } from "../lib/content";

export default function PreparednessPage() {
  return (
    <div className="pb-16 pt-28 text-slate-900">
      <section className="section-shell">
        <div className="mb-10 rounded-[36px] bg-white/82 px-8 py-10 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
            Readiness hub
          </p>
          <h1 className="mt-4 text-4xl font-bold text-slate-950 md:text-5xl">
            Preparedness guidance people can actually use
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            The application does more than score risk. It translates output into practical actions
            aligned with common hazard scenarios across India, making the product feel closer to an
            emergency operations tool.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PREPAREDNESS_GUIDES.map((guide) => (
            <div key={guide.title} className="glass-panel rounded-[32px] p-8">
              <div
                className={`mb-6 h-28 rounded-[24px] bg-gradient-to-br ${guide.accent}`}
              />
              <h2 className="text-2xl font-bold text-slate-950">{guide.title}</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {guide.points.map((point) => (
                  <li key={point} className="rounded-2xl bg-white/80 px-4 py-3">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
