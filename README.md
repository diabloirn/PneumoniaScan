# PneumoScan PACS | Hospital Pulmonary Diagnostic Suite & 3D CT Tomography
# LINK: https://pneumonia-scan.vercel.app/

An enterprise-grade, clinical hospital PACS (Picture Archiving and Communication System) and Computer-Aided Diagnosis (CAD) platform for pneumonia detection from digital chest radiographs and computed tomography.

---

## Key Capabilities & Architecture

- **Hospital-Grade Diagnostic Workstation (No AI Slop)**:
  - Clinical Obsidian & Medical Slate theme with high-contrast telemetry indicators, calibrated radiograph crosshairs, and live PACS status ribbons.
  - Interactive DICOM/Radiology Viewer with Window Level (Brightness) & Window Width (Contrast) adjustments, inverted bone-density mode, zoom/pan, reticle scales, and Grad-CAM simulated pulmonary attention heatmaps.
  - Patient intake metadata (MRN, clinical indications, referring physician), automated ICD-10 diagnostic coding (`J18.9` / `Z00.00`), and instant formal Medical PDF Report generation.

- **Interactive 3D CT Scanner Suite (Three.js WebGL)**:
  - High-precision 3D computed tomography gantry model with aerodynamic medical chassis, operator touchscreen console, and emergency stop button.
  - Internal rotating slip-ring rotor assembly housing the X-ray tube and curved multi-row detector array (visible via "See-Through / X-Ray Casing" toggle).
  - Motorized cantilever patient couch that glides through the gantry bore during automated helical scan routines.
  - Laser alignment crosshairs and dynamic volumetric fan-beam scanning illumination with real-time on-screen telemetry (kVp, mA, RPM, table feed).
  - Orbit camera controls with 4 diagnostic presets (Isometric 3D, Gantry Bore, Patient Couch, Axial Top-Down).

- **Resilient Backend & Zero-Crash Architecture**:
  - FastAPI backend powered by TensorFlow 2.20 with trained CNN weights (`pneumonia_simple_cnn.h5`).
  - Resilient database engine: attempts MySQL connection and automatically falls back to local SQLite (`pneumonia_db.sqlite3`) if MySQL is inactive, ensuring zero downtime or startup failures.
  - Comprehensive PACS registry archiving with multi-field search, date range filtering, Excel (`.xlsx`) export, and PDF registry audit logging.

---

## Getting Started

### 1. Backend Service (FastAPI + Python 3.11)

```bash
cd backend
# Optional: activate virtualenv or use Python 3.11
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Documentation & Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 2. Frontend Workstation (React)

```bash
# Install dependencies
npm install

# Start development server
npm start

# Or build production bundle
npm run build
```
Access the PACS workstation at `http://localhost:3000`.

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health telemetry |
| `GET` | `/api/model/status` | Model status (Real CNN vs Test Classifier) |
| `POST` | `/api/predict` | Multipart upload for radiograph AI inference |
| `GET` | `/api/history` | Query PACS archives with filters & pagination |
| `GET` | `/api/history/{id}` | Detailed study record with base64 radiograph |
| `DELETE` | `/api/history/{id}` | Purge study record from PACS archive |
| `GET` | `/api/chart/trend` | Epidemiological trend data (30-day positive vs normal) |
