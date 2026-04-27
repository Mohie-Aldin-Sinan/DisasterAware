"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBars,
  FaChartLine,
  FaHome,
  FaMapMarkedAlt,
  FaShieldAlt,
  FaTimes,
} from "react-icons/fa";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: "Home", href: "/", icon: <FaHome /> },
    { name: "Predict Risk", href: "/prediction", icon: <FaChartLine /> },
    { name: "Live Map", href: "/alerts", icon: <FaMapMarkedAlt /> },
    { name: "Preparedness", href: "/preparedness", icon: <FaShieldAlt /> },
    { name: "Model", href: "/model", icon: <FaChartLine /> },
  ];

  return (
    <nav className="fixed inset-x-0 top-5 z-50 mx-auto w-[min(1100px,calc(100%-24px))] glass-pill rounded-[28px]">
      <div className="flex h-16 items-center justify-between px-5 md:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-sm font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.35)] transition group-hover:scale-105">
            DA
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-[0.24em] text-slate-500">
              DisasterAware
            </div>
            <div className="text-xs text-slate-600">Risk monitoring platform</div>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-500/12 text-emerald-700"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200/80 px-4 pb-4 pt-3 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-500/12 text-emerald-700"
                      : "bg-white/80 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
