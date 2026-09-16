import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { 
  Activity, 
  Scan, 
  History, 
  ShieldCheck, 
  AlertCircle, 
  Clock 
} from "lucide-react";

export default function Navbar({ modelStatus }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
      isActive
        ? "bg-gradient-to-r from-[#eedcc6]/20 to-[#d4af37]/15 text-[#fdf8f0] border border-[#d4af37]/60 shadow-[0_0_15px_rgba(212,175,55,0.25)]"
        : "text-[#eedcc6]/75 hover:text-[#fdf8f0] hover:bg-[#eedcc6]/10 border border-transparent"
    }`;

  const isRealModel = modelStatus?.model_type === "real";

  return (
    <header className="border-b border-[#d4af37]/25 bg-gradient-to-r from-[#24060d] via-[#3d0a16] to-[#180408] backdrop-blur-md sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand - Ralph Lauren Clinical Aesthetic */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#d4af37]/30 via-[#661226] to-[#24060d] border border-[#d4af37]/50 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Activity className="w-6 h-6 text-[#eedcc6]" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#24060d]"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-[#fdf8f0] font-sans">
                  PNEUMO<span className="text-[#d4af37]">SCAN</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#d4af37]/15 text-[#eedcc6] border border-[#d4af37]/40 rounded-full font-semibold">
                  PACS
                </span>
              </div>
              <p className="text-[10px] text-[#eedcc6]/70 font-mono tracking-widest hidden sm:block uppercase">
                Hospital Pulmonary Diagnostic Suite
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <NavLink to="/" end className={navItemClass}>
              <Activity className="w-4 h-4 text-[#d4af37]" />
              <span>Overview &amp; 3D CT</span>
            </NavLink>
            <NavLink to="/deteksi" className={navItemClass}>
              <Scan className="w-4 h-4 text-[#d4af37]" />
              <span>Radiology Scan</span>
            </NavLink>
            <NavLink to="/history" className={navItemClass}>
              <History className="w-4 h-4 text-[#d4af37]" />
              <span>PACS Archive</span>
            </NavLink>
          </nav>

          {/* Pojok Kanan Navbar: Clock & Status Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Clock */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#eedcc6]/10 to-[#d4af37]/15 border border-[#d4af37]/40 text-[#fdf8f0] text-xs font-mono shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <Clock className="w-3.5 h-3.5 text-[#d4af37] animate-pulse" />
              <span className="font-semibold tracking-wide">
                {currentTime.toLocaleTimeString()}
              </span>
              <span className="text-[10px] text-[#eedcc6]/60 hidden md:inline">UTC+7</span>
            </div>

            {/* AI Model Status Badge */}
            <div className="hidden lg:flex items-center gap-1.5 pl-2">
              {isRealModel ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">CNN-ACTIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">TEST-MODE</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
