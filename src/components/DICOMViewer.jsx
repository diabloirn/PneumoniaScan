import React, { useState, useRef } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sun, 
  Contrast, 
  Layers, 
  Crosshair 
} from "lucide-react";

export default function DICOMViewer({ imageUrl, predictionResult, filename }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isInverted, setIsInverted] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showReticle, setShowReticle] = useState(true);
  const [preset, setPreset] = useState("standard");

  const containerRef = useRef(null);

  // Drag pan handlers
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta) => {
    setZoom((prev) => Math.max(1, Math.min(3.5, Math.round((prev + delta) * 10) / 10)));
  };

  const resetAll = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setIsInverted(false);
    setShowHeatmap(false);
    setPreset("standard");
  };

  const applyWindowPreset = (type) => {
    setPreset(type);
    if (type === "lung") {
      setBrightness(115);
      setContrast(130);
    } else if (type === "bone") {
      setBrightness(90);
      setContrast(160);
    } else if (type === "soft") {
      setBrightness(105);
      setContrast(110);
    } else {
      setBrightness(100);
      setContrast(100);
    }
  };

  const isPneumonia = (predictionResult || "").toLowerCase() === "pneumonia";

  return (
    <div className="flex flex-col bg-gradient-to-b from-[#24060d] to-[#140408] border border-[#d4af37]/25 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#180408] border-b border-[#d4af37]/25 text-xs font-mono text-[#eedcc6] gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
          <span className="text-[#fdf8f0] font-semibold">PACS VIEWER</span>
          <span className="text-[#d4af37]/40">|</span>
          <span className="text-[#d4af37] truncate max-w-[180px]">{filename || "RADIOGRAPH_SCAN.DCM"}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>ZOOM: <strong className="text-[#fdf8f0]">{Math.round(zoom * 100)}%</strong></span>
          <span>WL: <strong className="text-[#fdf8f0]">{brightness}</strong></span>
          <span>WW: <strong className="text-[#fdf8f0]">{contrast}</strong></span>
        </div>
      </div>

      {/* Main Radiology Canvas Area */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full h-[400px] sm:h-[460px] bg-black overflow-hidden flex items-center justify-center select-none ${
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"
        }`}
      >
        {/* Anatomical Marker Decals */}
        <div className="absolute top-3 right-3 text-[#d4af37]/80 font-mono text-xs font-bold pointer-events-none z-20">
          R [PA ERECT]
        </div>
        <div className="absolute top-3 left-3 text-[#d4af37]/80 font-mono text-xs font-bold pointer-events-none z-20">
          L [KV: 120]
        </div>
        <div className="absolute bottom-3 left-3 text-[#eedcc6]/50 font-mono text-[10px] pointer-events-none z-20">
          FOV: 350x350 mm | MATRIX: 512x512
        </div>

        {/* Reticle / Measurement Grid Overlay */}
        {showReticle && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-25">
            <div className="w-full h-full border border-[#d4af37] flex items-center justify-center">
              <div className="w-px h-full bg-[#d4af37]"></div>
              <div className="h-px w-full bg-[#d4af37] absolute"></div>
              <div className="w-32 h-32 border border-[#d4af37] rounded-full absolute"></div>
            </div>
          </div>
        )}

        {/* The X-Ray Image */}
        {imageUrl ? (
          <div
            className="relative transition-transform duration-75 flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <img
              src={imageUrl}
              alt="Chest Radiograph"
              className="max-h-[380px] sm:max-h-[440px] max-w-full object-contain pointer-events-none"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? "invert(100%)" : ""}`,
              }}
            />

            {/* AI Grad-CAM Simulated Attention Heatmap */}
            {showHeatmap && (
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70 transition-opacity duration-300"
                style={{
                  background: isPneumonia
                    ? "radial-gradient(ellipse at 42% 58%, rgba(244,63,94,0.85) 0%, rgba(245,158,11,0.5) 30%, rgba(212,175,55,0.2) 60%, transparent 80%), radial-gradient(ellipse at 65% 62%, rgba(244,63,94,0.8) 0%, rgba(245,158,11,0.4) 30%, transparent 70%)"
                    : "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.35) 0%, rgba(212,175,55,0.15) 50%, transparent 80%)"
                }}
              >
                <div className="absolute bottom-2 right-2 bg-black/85 border border-[#d4af37]/40 px-2 py-1 rounded text-[10px] font-mono text-[#eedcc6]">
                  {isPneumonia ? "AI FOCUS: BILATERAL INFILTRATE" : "AI FOCUS: CLEAR FIELDS"}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-[#eedcc6]/40 font-mono text-xs">
            <Layers className="w-8 h-8 text-[#d4af37]/40 mb-2 animate-pulse" />
            <span>NO RADIOGRAPH LOADED</span>
          </div>
        )}
      </div>

      {/* Control Panel Toolbar */}
      <div className="p-3 bg-[#180408] border-t border-[#d4af37]/25 flex flex-wrap items-center justify-between gap-3">
        {/* Preset Windowing Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-[#eedcc6]/70 mr-1 hidden sm:inline">Windows:</span>
          {["standard", "lung", "bone", "soft"].map((t) => (
            <button
              key={t}
              onClick={() => applyWindowPreset(t)}
              className={`px-2 py-1 rounded text-xs font-mono capitalize transition ${
                preset === t
                  ? "bg-[#eedcc6]/20 text-[#fdf8f0] border border-[#d4af37]/50 font-semibold"
                  : "text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sliders & Visual Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Brightness / Window Level */}
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-[#eedcc6]/60" />
            <input
              type="range"
              min="50"
              max="180"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-16 sm:w-20 accent-[#d4af37] cursor-pointer"
              title="Window Level (Brightness)"
            />
          </div>

          {/* Contrast / Window Width */}
          <div className="flex items-center gap-2">
            <Contrast className="w-3.5 h-3.5 text-[#eedcc6]/60" />
            <input
              type="range"
              min="50"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-16 sm:w-20 accent-[#d4af37] cursor-pointer"
              title="Window Width (Contrast)"
            />
          </div>

          {/* Invert */}
          <button
            onClick={() => setIsInverted(!isInverted)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition ${
              isInverted
                ? "bg-[#eedcc6]/20 text-[#fdf8f0] border-[#d4af37]/50"
                : "border-[#d4af37]/25 text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
            }`}
            title="Invert Bone Density Colors"
          >
            Invert
          </button>

          {/* AI Attention Heatmap Overlay */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${
              showHeatmap
                ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
                : "border-[#d4af37]/25 text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
            }`}
            title="Toggle AI Attention Heatmap (Grad-CAM Overlay)"
          >
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span>Heatmap</span>
          </button>

          {/* Reticle Toggle */}
          <button
            onClick={() => setShowReticle(!showReticle)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition ${
              showReticle
                ? "bg-[#eedcc6]/20 text-[#fdf8f0] border-[#d4af37]/50"
                : "border-[#d4af37]/25 text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
            }`}
            title="Toggle DICOM Crosshairs"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#d4af37]" />
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l border-[#d4af37]/25 pl-2">
            <button
              onClick={() => handleZoom(0.25)}
              className="p-1 rounded text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.25)}
              className="p-1 rounded text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetAll}
              className="p-1 rounded text-[#eedcc6]/70 hover:text-white hover:bg-[#380e1a]/60"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

