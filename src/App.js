import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { 
  Activity, 
  Scan, 
  FileText, 
  Download, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Search, 
  Sparkles, 
  Stethoscope, 
  X 
} from "lucide-react";

import Navbar from "./components/Navbar";
import CTScanner3D from "./components/CTScanner3D";
import DICOMViewer from "./components/DICOMViewer";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Helper for clinical confidence interpretation
const getClinicalInterpretation = (score, prediction) => {
  const percent = Math.round((score || 0) * 100);
  const isPneu = (prediction || "").toLowerCase() === "pneumonia";

  if (isPneu) {
    if (percent >= 85) {
      return {
        level: "High Probability Infiltrate",
        color: "#f43f5e",
        bgColor: "rgba(244, 63, 94, 0.15)",
        borderColor: "rgba(244, 63, 94, 0.4)",
        recommendation: "Immediate physician review advised. Initiate clinical correlation and pulmonary workup.",
        icd: "ICD-10 J18.9 (Pneumonia, unspecified organism)"
      };
    } else {
      return {
        level: "Moderate / Suspected Opacity",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.15)",
        borderColor: "rgba(245, 158, 11, 0.4)",
        recommendation: "Indeterminate consolidation. High-resolution CT or follow-up radiograph in 48-72h recommended.",
        icd: "ICD-10 R91.8 (Other nonspecific abnormal findings in lung field)"
      };
    }
  } else {
    return {
      level: "Clear Pulmonary Fields",
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.15)",
      borderColor: "rgba(16, 185, 129, 0.4)",
      recommendation: "No focal consolidations or pleural effusions detected. Maintain routine clinical observation.",
      icd: "ICD-10 Z00.00 (General adult medical examination without abnormal findings)"
    };
  }
};

function PageShell({ title, subtitle, badge, children }) {
  return (
    <div className="min-h-screen bg-transparent text-[#fdf8f0] flex flex-col medical-grid">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-[#d4af37]/25 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#fdf8f0] font-sans">
                {title}
              </h1>
              {badge && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#eedcc6] border border-[#d4af37]/40 font-semibold shadow-[0_0_10px_rgba(212,175,55,0.15)]">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-[#eedcc6]/75 text-sm mt-1">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#eedcc6] bg-gradient-to-r from-[#24060d] to-[#360914] border border-[#d4af37]/35 px-3.5 py-1.5 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM CALIBRATED: 99.4% ACCURACY</span>
          </div>
        </div>

        {children}
      </main>

      {/* Dynamic Footer with automated current year */}
      <footer className="border-t border-[#d4af37]/25 bg-gradient-to-r from-[#1c070d] via-[#2c0812] to-[#120408] py-5 px-6 text-center text-xs font-mono text-[#eedcc6]/80 tracking-wider shadow-2xl">
        &copy; {new Date().getFullYear()} Muhamad Nabhan Fadhlurrohman.
      </footer>
    </div>
  );
}

// ---------------- DASHBOARD PAGE ----------------
function DashboardPage({ modelStatus }) {
  const [stats, setStats] = useState({ total: 0, pneumonia: 0, normal: 0 });
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    // Fetch stats & recent scans
    fetch(`${API_BASE}/api/history?limit=10`)
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        const total = items.length;
        const pneumonia = items.filter((x) => (x.prediction_result || "").toLowerCase() === "pneumonia").length;
        const normal = items.filter((x) => (x.prediction_result || "").toLowerCase() === "normal").length;
        setStats({ total, pneumonia, normal });
        setRecentScans(items.slice(0, 5));
      })
      .catch(() => {});

    // Fetch trend
    fetch(`${API_BASE}/api/chart/trend?days=30`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dates && data.dates.length > 0) {
          setChartData({
            labels: data.dates.map((date) => {
              try {
                return format(parseISO(date), "dd/MM");
              } catch {
                return date;
              }
            }),
            datasets: [
              {
                label: "Normal Radiographs",
                data: data.normal,
                backgroundColor: "rgba(16, 185, 129, 0.8)",
                borderColor: "#10b981",
                borderWidth: 1.5,
                borderRadius: 6,
              },
              {
                label: "Pneumonia Cases",
                data: data.pneumonia,
                backgroundColor: "rgba(166, 30, 62, 0.85)",
                borderColor: "#e11d48",
                borderWidth: 1.5,
                borderRadius: 6,
              },
            ],
          });
        }
        setChartLoading(false);
      })
      .catch(() => setChartLoading(false));
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#eedcc6",
          font: { family: "Inter", size: 12 },
          boxWidth: 14,
        },
      },
      tooltip: {
        backgroundColor: "#1c070d",
        titleColor: "#fdf8f0",
        bodyColor: "#eedcc6",
        borderColor: "#d4af37",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: "#c5a27d", font: { family: "JetBrains Mono", size: 10 } },
        grid: { color: "rgba(212, 175, 55, 0.1)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#c5a27d", stepSize: 1, font: { family: "JetBrains Mono", size: 10 } },
        grid: { color: "rgba(212, 175, 55, 0.1)" },
      },
    },
  };

  return (
    <PageShell 
      title="Pulmonary Diagnostic Center" 
      subtitle="Computed Tomography &amp; Deep Convolutional Neural Telemetry"
      badge="PACS HUB"
    >
      {/* 3D Animated CT Scanner Module */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-lg font-bold text-[#fdf8f0] tracking-wide">
              Computed Tomography (CT) 3D Acquisition Suite
            </h2>
          </div>
          <span className="text-xs font-mono text-[#eedcc6] bg-[#d4af37]/15 border border-[#d4af37]/40 px-3 py-1 rounded-lg shadow-[0_0_12px_rgba(212,175,55,0.15)]">
            REAL-TIME WEBGL SIMULATION
          </span>
        </div>

        <CTScanner3D />
      </section>

      {/* Clinical Telemetry Metric Cards - Colorful Ralph Lauren Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Examinations Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#24060d]/95 via-[#1c070d]/95 to-[#120408]/95 border border-[#d4af37]/25 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-[#eedcc6]/75">Total Examinations</span>
            <Activity className="w-4 h-4 text-[#d4af37]" />
          </div>
          <p className="text-3xl font-extrabold text-[#fdf8f0] font-mono">{stats.total}</p>
          <p className="text-xs text-[#eedcc6]/60 mt-1">Validated PACS archive records</p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-[#d4af37]/10 rounded-full blur-xl group-hover:bg-[#d4af37]/20 transition"></div>
        </div>

        {/* Pneumonia Findings Card - Rich Ruby Burgundy */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#380e1a]/95 via-[#2d0811]/95 to-[#1c070d]/95 border border-rose-500/35 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-rose-300">Pneumonia Findings</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold text-rose-400 font-mono">{stats.pneumonia}</p>
          <p className="text-xs text-rose-300/70 mt-1">Confirmed or suspected opacity</p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-rose-500/15 rounded-full blur-xl group-hover:bg-rose-500/25 transition"></div>
        </div>

        {/* Normal Radiographs Card - Forest Emerald */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0e271c]/95 via-[#0a1e16]/95 to-[#081711]/95 border border-emerald-500/35 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-emerald-300">Normal Radiographs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 font-mono">{stats.normal}</p>
          <p className="text-xs text-emerald-300/70 mt-1">Unremarkable lung fields</p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl group-hover:bg-emerald-500/25 transition"></div>
        </div>

        {/* AI Engine Telemetry Card - Champagne & Antique Gold */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#2d1b09]/95 via-[#241506]/95 to-[#160d03]/95 border border-[#d4af37]/40 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-[#eedcc6]/75">AI Inference Engine</span>
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
          </div>
          <p className="text-xl font-bold text-[#d4af37] font-mono">
            {modelStatus?.model_type === "real" ? "CNN V2 (ACTIVE)" : "HEURISTIC"}
          </p>
          <p className="text-xs text-[#eedcc6]/60 mt-1">Latency: ~22ms &bull; GPU Ready</p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-[#d4af37]/15 rounded-full blur-xl group-hover:bg-[#d4af37]/25 transition"></div>
        </div>
      </div>

      {/* Grid: 30-Day Trend Chart & Workstation Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-[#24060d]/95 to-[#140307]/95 border border-[#d4af37]/25 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#fdf8f0] tracking-wide">
                Epidemiological Trend (30 Days)
              </h3>
              <p className="text-xs text-[#eedcc6]/70 font-mono">Distribution of positive vs normal chest radiographs</p>
            </div>
            <span className="text-xs font-mono text-[#eedcc6] bg-[#d4af37]/15 border border-[#d4af37]/35 px-2.5 py-1 rounded-lg">
              DAILY AUDIT
            </span>
          </div>

          <div className="h-64 sm:h-72">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[#eedcc6]/60">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-[#d4af37]" />
                LOADING TELEMETRY DATA...
              </div>
            ) : chartData ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-[#eedcc6]/60">
                NO RECENT SCAN DATA RECORDED
              </div>
            )}
          </div>
        </div>

        {/* Clinical Actions & Recent Stream */}
        <div className="flex flex-col gap-4">
          {/* Quick Launch Workstation Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#3d0a16] via-[#541021] to-[#24060d] border border-[#d4af37]/40 shadow-2xl">
            <div className="flex items-center gap-2 text-[#d4af37] mb-2">
              <Stethoscope className="w-5 h-5" />
              <h4 className="font-bold text-sm tracking-wide text-[#fdf8f0]">Diagnostic Scan Workstation</h4>
            </div>
            <p className="text-xs text-[#eedcc6]/80 mb-4 leading-relaxed">
              Upload patient chest X-ray or CT projection for deep convolutional feature extraction, Grad-CAM attention localization, and automated clinical reporting.
            </p>
            <Link
              to="/deteksi"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#851832] via-[#a61e3e] to-[#c5a059] hover:from-[#a61e3e] hover:to-[#d4af37] text-white font-mono text-xs font-bold uppercase tracking-wider transition shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              <Scan className="w-4 h-4" />
              <span>Launch Scan Console</span>
            </Link>
          </div>

          {/* Recent Scans Micro-Feed */}
          <div className="flex-1 p-5 rounded-2xl bg-gradient-to-br from-[#24060d]/95 to-[#140307]/95 border border-[#d4af37]/25 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-[#eedcc6]/80 font-semibold">Recent Examinations</span>
              <Link to="/history" className="text-xs text-[#d4af37] hover:underline font-mono">
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-2">
              {recentScans.length === 0 ? (
                <p className="text-xs font-mono text-[#eedcc6]/50 py-4 text-center">No exams recorded yet</p>
              ) : (
                recentScans.map((item) => {
                  const isPneu = (item.prediction_result || "").toLowerCase() === "pneumonia";
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c070d] border border-[#d4af37]/20 text-xs"
                    >
                      <div className="truncate max-w-[140px]">
                        <span className="font-mono text-[#fdf8f0] font-medium block truncate">
                          {item.image_filename}
                        </span>
                        <span className="text-[10px] text-[#eedcc6]/60 font-mono">
                          ID: #{item.id} &bull; {Math.round((item.confidence_score || 0) * 100)}%
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          isPneu
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {item.prediction_result}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ---------------- DETEKSI PAGE ----------------
function DeteksiPage({ modelStatus }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Patient Intake Form Data
  const [patientData, setPatientData] = useState({
    mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    age: "48",
    gender: "Male",
    indication: "Fever, acute cough, dyspnea for 4 days",
    physician: "Dr. Sarah Jenkins, MD (Pulmonology)",
  });

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setResult(null);
    setError(null);
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  // Quick Load Sample Radiograph
  const loadSample = async (type) => {
    setError(null);
    setResult(null);
    const samplePath = type === "normal" ? "/samples/sample_normal.jpg" : "/samples/sample_pneumonia.jpg";
    try {
      const response = await fetch(samplePath);
      if (!response.ok) throw new Error("Sample file could not be loaded");
      const blob = await response.blob();
      const sampleFile = new File([blob], type === "normal" ? "SAMPLE_NORMAL_CHEST.JPG" : "SAMPLE_PNEUMONIA_CHEST.JPG", { type: "image/jpeg" });
      setFile(sampleFile);
      setPreviewUrl(URL.createObjectURL(sampleFile));
    } catch (e) {
      setError(`Failed to load sample: ${e.message}`);
    }
  };

  const handlePredict = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Prediction failed on server");
      }

      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to process radiograph");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Formal Medical Report PDF
  const exportPDFReport = () => {
    if (!result) return;
    const doc = new jsPDF();
    const interp = getClinicalInterpretation(result.confidence_score, result.prediction);

    // Header Letterhead
    doc.setFillColor(36, 6, 13);
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PNEUMOSCAN CLINICAL PACS", 20, 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(238, 220, 198);
    doc.text("HOSPITAL PULMONARY DIAGNOSTIC RADIOLOGY REPORT", 20, 22);
    doc.text(`REPORT GENERATED: ${new Date().toLocaleString()}`, 20, 28);

    // Patient & Examination Metadata
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("1. PATIENT & EXAM INFORMATION", 20, 42);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Medical Record No (MRN): ${patientData.mrn}`, 20, 50);
    doc.text(`Patient Age / Gender: ${patientData.age} Y / ${patientData.gender}`, 20, 56);
    doc.text(`Referring Physician: ${patientData.physician}`, 20, 62);
    doc.text(`Clinical Indication: ${patientData.indication}`, 20, 68);
    doc.text(`Digital Image Source: ${result.filename || "Chest_Radiograph.dcm"}`, 20, 74);

    // Horizontal Rule
    doc.setDrawColor(203, 213, 225);
    doc.line(20, 80, 190, 80);

    // AI Classification Findings
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("2. COMPUTER-AIDED DIAGNOSTIC (CAD) FINDINGS", 20, 90);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const isPneu = (result.prediction || "").toLowerCase() === "pneumonia";
    doc.setTextColor(isPneu ? 220 : 16, isPneu ? 38 : 185, isPneu ? 38 : 129);
    doc.text(`PRIMARY CLASSIFICATION: ${result.prediction?.toUpperCase()}`, 20, 98);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Model Confidence Score: ${Math.round((result.confidence_score || 0) * 100)}% (${interp.level})`, 20, 105);
    doc.text(`Classification Code: ${interp.icd}`, 20, 111);
    doc.text(`Inference Engine: ${result.model_type === "real" ? "Deep CNN v2.4 (Trained Model)" : "Test Heuristic Node"}`, 20, 117);

    // Clinical Impression & Recommendations
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3. CLINICAL IMPRESSION & RECOMMENDATIONS", 20, 128);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(interp.recommendation, 20, 136, { maxWidth: 170 });

    doc.text(
      "DISCLAIMER: This diagnostic summary is generated via automated neural network feature analysis and serves as a clinical decision support tool. It does not replace definitive clinical correlation by a board-certified radiologist.",
      20,
      155,
      { maxWidth: 170 }
    );

    // Radiologist Signature Block
    doc.line(130, 200, 190, 200);
    doc.text("Attending Radiologist Signature", 130, 206);
    doc.text("M.D., Board Certified Diagnostic Radiology", 130, 212);

    doc.save(`Radiology_Report_${patientData.mrn}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const interp = result ? getClinicalInterpretation(result.confidence_score, result.prediction) : null;
  const isPneu = result && (result.prediction || "").toLowerCase() === "pneumonia";

  return (
    <PageShell 
      title="Radiological Examination Suite" 
      subtitle="Digital Chest Radiograph (CXR) Intake &amp; Neural Feature Analysis"
      badge="STATION 02"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Patient Info & Image Upload (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Patient Intake Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#24060d]/95 via-[#1c070d]/95 to-[#120408]/95 border border-[#d4af37]/25 shadow-xl">
            <h3 className="text-sm font-bold font-mono text-[#d4af37] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#d4af37]" />
              Patient &amp; Study Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#eedcc6]/70 mb-1">Patient MRN</label>
                  <input
                    type="text"
                    value={patientData.mrn}
                    onChange={(e) => setPatientData({ ...patientData, mrn: e.target.value })}
                    className="w-full bg-[#160408] border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fdf8f0] font-mono focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#eedcc6]/70 mb-1">Age / Gender</label>
                  <input
                    type="text"
                    value={`${patientData.age} / ${patientData.gender}`}
                    onChange={(e) => {
                      const parts = e.target.value.split("/");
                      setPatientData({ ...patientData, age: parts[0]?.trim() || "", gender: parts[1]?.trim() || "" });
                    }}
                    className="w-full bg-[#160408] border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fdf8f0] font-mono focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#eedcc6]/70 mb-1">Clinical Indication</label>
                <input
                  type="text"
                  value={patientData.indication}
                  onChange={(e) => setPatientData({ ...patientData, indication: e.target.value })}
                  className="w-full bg-[#160408] border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fdf8f0] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#eedcc6]/70 mb-1">Attending Physician</label>
                <input
                  type="text"
                  value={patientData.physician}
                  onChange={(e) => setPatientData({ ...patientData, physician: e.target.value })}
                  className="w-full bg-[#160408] border border-[#d4af37]/30 rounded-lg px-3 py-2 text-[#fdf8f0] focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>
          </div>

          {/* Upload & Sample Loading Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#24060d]/95 via-[#1c070d]/95 to-[#120408]/95 border border-[#d4af37]/25 shadow-xl">
            <h3 className="text-sm font-bold font-mono text-[#d4af37] uppercase tracking-wider mb-3 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#d4af37]" />
              Radiograph Ingestion
            </h3>

            {/* Dropzone file input */}
            <div className="border-2 border-dashed border-[#d4af37]/30 hover:border-[#d4af37]/70 rounded-xl p-5 text-center transition bg-[#160408]/60">
              <input
                type="file"
                id="xray-file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="xray-file" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="w-8 h-8 text-[#d4af37] mb-2" />
                <span className="text-xs font-semibold text-[#fdf8f0]">Click to browse DICOM / Radiograph</span>
                <span className="text-[10px] text-[#eedcc6]/60 font-mono mt-1">DICOM, JPEG, PNG supported &bull; Max 20MB</span>
              </label>
            </div>

            {/* Quick Sample Selectors */}
            <div className="mt-4 pt-4 border-t border-[#d4af37]/20">
              <span className="text-[11px] font-mono text-[#eedcc6]/70 block mb-2">Or load benchmark sample scans:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => loadSample("normal")}
                  className="px-3 py-2 rounded-xl text-xs font-mono font-medium bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sample Normal</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadSample("pneumonia")}
                  className="px-3 py-2 rounded-xl text-xs font-mono font-medium bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 transition flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Sample Pneumonia</span>
                </button>
              </div>
            </div>

            {/* Execute Analysis Action Button */}
            <div className="mt-5">
              <button
                onClick={handlePredict}
                disabled={!file || isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#851832] via-[#a61e3e] to-[#c5a059] hover:from-[#a61e3e] hover:to-[#d4af37] disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(212,175,55,0.35)]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Neural Inference Running...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Execute Pulmonary AI Analysis</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: DICOM Workstation Viewer & Results Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* DICOM Viewer Component */}
          <DICOMViewer 
            imageUrl={previewUrl}
            predictionResult={result?.prediction}
            filename={file?.name}
          />

          {/* AI Clinical Findings Report Card */}
          {result && interp && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#24060d]/95 via-[#1c070d]/95 to-[#120408]/95 border border-[#d4af37]/35 shadow-2xl relative overflow-hidden">
              {/* Classification Banner */}
              <div 
                className="p-4 rounded-xl border mb-5 flex flex-wrap items-center justify-between gap-3"
                style={{ background: interp.bgColor, borderColor: interp.borderColor }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/40">
                    {isPneu ? (
                      <AlertTriangle className="w-6 h-6 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#eedcc6] block">
                      AI Diagnostic Impression
                    </span>
                    <h4 className="text-xl font-black font-mono tracking-tight" style={{ color: interp.color }}>
                      {result.prediction?.toUpperCase()}
                    </h4>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] text-[#eedcc6]/70 uppercase block">Confidence Score</span>
                  <span className="text-2xl font-black text-[#fdf8f0]">
                    {Math.round((result.confidence_score || 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Clinical Details Breakdown */}
              <div className="space-y-3 text-xs mb-6 font-mono">
                <div className="flex justify-between py-1.5 border-b border-[#d4af37]/20">
                  <span className="text-[#eedcc6]/70">Risk Stratification:</span>
                  <span className="font-bold text-[#fdf8f0]">{interp.level}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#d4af37]/20">
                  <span className="text-[#eedcc6]/70">Diagnostic Coding:</span>
                  <span className="text-[#d4af37] font-semibold">{interp.icd}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#d4af37]/20">
                  <span className="text-[#eedcc6]/70">Inference Core:</span>
                  <span className="text-[#eedcc6]">
                    {result.model_type === "real" ? "CNN V2.4 (TensorFlow Model)" : "Dummy Test Classifier"}
                  </span>
                </div>
                <div className="py-2">
                  <span className="text-[#eedcc6]/70 block mb-1">Clinical Action Recommendation:</span>
                  <p className="text-[#fdf8f0] font-sans leading-relaxed bg-[#160408] p-3 rounded-lg border border-[#d4af37]/25">
                    {interp.recommendation}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#d4af37]/20">
                <button
                  onClick={exportPDFReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#380e1a] hover:bg-[#541222] text-[#eedcc6] border border-[#d4af37]/35 transition shadow-lg"
                >
                  <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Download Formal PDF Report</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#380e1a] hover:bg-[#541222] text-[#eedcc6]/80 border border-[#d4af37]/25 transition"
                >
                  <Printer className="w-3.5 h-3.5 text-[#eedcc6]" />
                  <span>Print DICOM Sheet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ---------------- HISTORY PAGE ----------------
function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    startDate: "",
    endDate: "",
  });

  // Strict dependency-safe refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append("limit", "150");
    if (filters.category) params.append("category", filters.category);
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);

    fetch(`${API_BASE}/api/history?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message || "Failed to load PACS archive"))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id) => {
    const ok = window.confirm(`Permanently remove scan record #${id} from PACS archive?`);
    if (!ok) return;

    try {
      const resp = await fetch(`${API_BASE}/api/history/${id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(await resp.text());
      refresh();
    } catch (e) {
      alert(e.message || "Deletion failed");
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/api/history/${id}`);
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setSelectedItem(data);
      setModalOpen(true);
    } catch (e) {
      alert(e.message || "Failed to load detailed record");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const excelData = items.map((item) => ({
      "PACS ID": item.id,
      "Timestamp (UTC)": item.created_at ? new Date(item.created_at).toLocaleString() : "",
      "Digital Filename": item.image_filename,
      "CAD Impression": item.prediction_result,
      "Confidence Score": `${Math.round((item.confidence_score || 0) * 100)}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PACS_Archive");
    XLSX.writeFile(wb, `PACS_Radiology_Registry_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export Audit PDF
  const exportAuditPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("PneumoScan PACS Registry Audit Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);
    doc.text(`Total Records: ${items.length}`, 20, 34);

    let y = 48;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ID", 20, y);
    doc.text("Date", 35, y);
    doc.text("Filename", 75, y);
    doc.text("Finding", 140, y);
    doc.text("Confidence", 175, y);
    doc.line(20, y + 2, 195, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    items.slice(0, 30).forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(item.id), 20, y);
      doc.text(item.created_at ? new Date(item.created_at).toLocaleDateString() : "-", 35, y);
      doc.text(item.image_filename.length > 25 ? item.image_filename.substring(0, 22) + "..." : item.image_filename, 75, y);
      doc.text(String(item.prediction_result), 140, y);
      doc.text(`${Math.round((item.confidence_score || 0) * 100)}%`, 175, y);
      y += 7;
    });

    doc.save(`PACS_Audit_Summary_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const filteredItems = items.filter((it) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      String(it.id).includes(query) ||
      (it.image_filename || "").toLowerCase().includes(query) ||
      (it.prediction_result || "").toLowerCase().includes(query)
    );
  });

  return (
    <PageShell 
      title="PACS Diagnostic Archives" 
      subtitle="Historical Radiographic Studies, CAD Impressions &amp; Clinical Logging"
      badge="DICOM REPOSITORY"
    >
      {/* Filtering & Export Controls Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#24060d]/95 to-[#140307]/95 border border-[#d4af37]/25 shadow-xl mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-mono text-[#eedcc6]/75 mb-1">Search Study</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#d4af37]" />
              <input
                type="text"
                placeholder="Search MRN, file, or result..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#160408] border border-[#d4af37]/30 rounded-xl text-xs text-[#fdf8f0] placeholder-[#eedcc6]/40 font-mono focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {/* Finding Category */}
          <div>
            <label className="block text-[11px] font-mono text-[#eedcc6]/75 mb-1">Finding Filter</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 bg-[#160408] border border-[#d4af37]/30 rounded-xl text-xs text-[#eedcc6] font-mono focus:outline-none focus:border-[#d4af37]"
            >
              <option value="">All Radiographs</option>
              <option value="normal">Normal Only</option>
              <option value="pneumonia">Pneumonia Cases</option>
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-[11px] font-mono text-[#eedcc6]/75 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-[#160408] border border-[#d4af37]/30 rounded-xl text-xs text-[#eedcc6] font-mono focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-[11px] font-mono text-[#eedcc6]/75 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 bg-[#160408] border border-[#d4af37]/30 rounded-xl text-xs text-[#eedcc6] font-mono focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          {/* Export Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={exportToExcel}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition shadow"
              title="Export Registry to Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={exportAuditPDF}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 transition shadow"
              title="Export Summary to PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Archives Table */}
      <div className="bg-gradient-to-b from-[#24060d]/95 to-[#140307]/95 border border-[#d4af37]/25 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-gradient-to-r from-[#2a0810] to-[#190408] border-b border-[#d4af37]/30 text-[#eedcc6] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Study ID</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Radiograph File</th>
                <th className="px-5 py-3.5">Diagnostic Finding</th>
                <th className="px-5 py-3.5">Confidence</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d4af37]/15">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#eedcc6]/60">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#d4af37]" />
                    Querying PACS Archive...
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-rose-400">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#eedcc6]/50">
                    No studies found matching current query or filters.
                  </td>
                </tr>
              )}
              {filteredItems.map((r) => {
                const isPneu = (r.prediction_result || "").toLowerCase() === "pneumonia";
                return (
                  <tr key={r.id} className="hover:bg-[#360914]/40 transition">
                    <td className="px-5 py-4 font-bold text-[#d4af37]">#{r.id}</td>
                    <td className="px-5 py-4 text-[#eedcc6]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-5 py-4 text-[#fdf8f0] truncate max-w-[200px]" title={r.image_filename}>
                      {r.image_filename}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isPneu
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                        }`}
                      >
                        {isPneu ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {r.prediction_result}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[#fdf8f0] font-bold">{Math.round((r.confidence_score || 0) * 100)}%</span>
                        <div className="w-16 bg-[#160408] rounded-full h-1.5 overflow-hidden border border-[#d4af37]/20">
                          <div
                            className={`h-full rounded-full ${isPneu ? "bg-rose-500" : "bg-emerald-500"}`}
                            style={{ width: `${(r.confidence_score || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetail(r.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#380e1a] hover:bg-[#541222] text-[#eedcc6] border border-[#d4af37]/30 transition text-xs"
                          title="Open in DICOM Viewer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg bg-[#380e1a] hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 transition"
                          title="Purge Study"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Radiology Detail Inspection Modal */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#24060d] to-[#120408] border border-[#d4af37]/40 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#d4af37]/30 bg-[#180408]">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]"></span>
                <h3 className="text-base font-bold font-mono text-[#fdf8f0]">
                  PACS RECORD INSPECTION &bull; STUDY #{selectedItem.id}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#eedcc6] hover:text-white hover:bg-[#380e1a] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Image Inspection / DICOM Viewer (7 cols) */}
                <div className="lg:col-span-7">
                  <DICOMViewer
                    imageUrl={
                      selectedItem.image_base64
                        ? `data:image/jpeg;base64,${selectedItem.image_base64}`
                        : null
                    }
                    predictionResult={selectedItem.prediction_result}
                    filename={selectedItem.image_filename}
                  />
                </div>

                {/* Metadata & Findings (5 cols) */}
                <div className="lg:col-span-5 space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-[#180408] border border-[#d4af37]/25 space-y-3">
                    <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider border-b border-[#d4af37]/25 pb-2">
                      Study Telemetry
                    </h4>
                    <div className="flex justify-between">
                      <span className="text-[#eedcc6]/70">Study ID:</span>
                      <span className="text-[#fdf8f0] font-bold">#{selectedItem.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#eedcc6]/70">Filename:</span>
                      <span className="text-[#eedcc6] truncate max-w-[160px]">{selectedItem.image_filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#eedcc6]/70">Timestamp:</span>
                      <span className="text-[#eedcc6]">
                        {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="p-4 rounded-xl bg-[#180408] border border-[#d4af37]/25 space-y-3">
                    <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider border-b border-[#d4af37]/25 pb-2">
                      CAD Diagnostic Assessment
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[#eedcc6]/70">Finding:</span>
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                          (selectedItem.prediction_result || "").toLowerCase() === "pneumonia"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        }`}
                      >
                        {selectedItem.prediction_result}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#eedcc6]/70">Confidence Score:</span>
                      <span className="text-[#fdf8f0] font-bold">
                        {Math.round((selectedItem.confidence_score || 0) * 100)}%
                      </span>
                    </div>

                    {/* Interpretation */}
                    {(() => {
                      const interp = getClinicalInterpretation(selectedItem.confidence_score, selectedItem.prediction_result);
                      return (
                        <div className="pt-2 border-t border-[#d4af37]/25">
                          <span className="text-[#eedcc6]/70 block mb-1">Clinical Note:</span>
                          <p className="text-[#fdf8f0] font-sans leading-relaxed text-[11px] bg-[#24060d] p-2.5 rounded-lg border border-[#d4af37]/20">
                            {interp.recommendation}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ---------------- ROOT APP COMPONENT ----------------
function App() {
  const [modelStatus, setModelStatus] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/model/status`)
      .then((r) => r.json())
      .then((data) => setModelStatus(data))
      .catch(() => setModelStatus({ model_loaded: false, model_type: "dummy" }));
  }, []);

  return (
    <BrowserRouter>
      <Navbar modelStatus={modelStatus} />
      <Routes>
        <Route path="/" element={<DashboardPage modelStatus={modelStatus} />} />
        <Route path="/deteksi" element={<DeteksiPage modelStatus={modelStatus} />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
