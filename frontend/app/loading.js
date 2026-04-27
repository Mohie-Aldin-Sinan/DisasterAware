import { FaSpinner } from "react-icons/fa";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <FaSpinner className="animate-spin text-5xl text-emerald-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] rounded-full mb-6" />
      <h2 className="text-xl font-bold text-slate-800">Loading disaster insights...</h2>
      <p className="text-slate-500 text-sm mt-2">Preparing live data and system context</p>
    </div>
  );
}
