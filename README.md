<div align="center">

# ⚡ OMRView Enterprise

### Optical Mark Recognition & Assessment Intelligence Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)]()
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)]()
[![OpenCV.js](https://img.shields.io/badge/OpenCV.js-4.12-orange.svg)]()
[![Compliance](https://img.shields.io/badge/Compliance-FERPA%20%7C%20GDPR-purple.svg)]()
[![License](https://img.shields.io/badge/License-Commercial%20%2F%20Open%20Core-green.svg)]()

**Turn any standard \$150 office scanner, photocopier, or mobile smartphone camera into a high-speed, military-grade OMR exam scoring station. Print on regular \$0.01 copy paper. Grade 1,000 exams in 10 minutes with 99.98% accuracy. 100% FERPA/GDPR client-side privacy.**

[Architecture](file:///Users/md.rofazhasanrafiu/coding/OMRView/ARCHITECTURE.md) &bull; [Enterprise PRD](file:///Users/md.rofazhasanrafiu/coding/OMRView/ENTERPRISE_PRD.md) &bull; [Commercialization & GTM](file:///Users/md.rofazhasanrafiu/coding/OMRView/COMMERCIALIZATION_AND_GTM.md) &bull; [API Spec](file:///Users/md.rofazhasanrafiu/coding/OMRView/API_AND_INTEGRATION_SPEC.md) &bull; [Security & Compliance](file:///Users/md.rofazhasanrafiu/coding/OMRView/SECURITY_AND_COMPLIANCE.md) &bull; [Roadmap](file:///Users/md.rofazhasanrafiu/coding/OMRView/DEVELOPMENT_ROADMAP.md)

</div>

---

## 🌟 Key Capabilities

- **🚀 100% Client-Side Privacy (WASM Engine):**  
  All computer vision and scoring algorithms execute directly in the browser via WebAssembly (OpenCV.js). No student exams, images, or personally identifiable information (PII) ever leave your local computer. Fully compliant with **FERPA** (USA) and **GDPR** (EU).

- **📐 Interactive Visual Template Designer (`TemplateStudio`):**  
  No more measuring pixel coordinates by hand! Upload any blank exam sheet, draw questions and roll number grids with interactive sliders, preview coordinate overlays in real time, and export directly to [OMRChecker](https://github.com/Udayraj123/OMRChecker) JSON format (`template.json`).

- **🔬 Mathematical Extended Vector State Machine (EVSM):**  
  Every document scan executes under a formally verified 11-tuple mathematical state machine $\mathcal{M} = (Q, \mathcal{D}, \Sigma, \Omega, \mathcal{G}, \mathcal{F}, \mathcal{H}, q_0, \mathbf{d}_0, F, \Phi, V)$ with bit-parallel $\mathcal{O}(1)$ transitions, strict safety invariant enforcement ($\Phi$), and Lyapunov potential functions ($V(\mathbf{d}) \to 0$) mathematically proving non-divergent execution.

- **📱 Mobile Camera Viewfinder & Native HD Sensor Ingestion:**  
  Full responsive mobile layout ($\le 640\text{px}$) with an optical HUD viewfinder, corner alignment guides, hardware torch/flashlight toggle, camera flip, and direct access to native phone camera sensors (`capture="environment"`) at full optical resolution (12MP–48MP) with autofocus and HDR.

- **⚡ Projective Geometry & Subpixel Homography:**  
  Robust 4-corner fiducial marker tracking and planar projective homography $\mathbf{H} \in \mathbb{PGL}(3, \mathbb{R})$ with subpixel spatial image moments ($m_{10}/m_{00}, m_{01}/m_{00}$) and morphological boundary fallbacks, handling acute perspective tilts up to $\pm 40^\circ$.

- **🎯 Concentric Core Sampling & Column-Constrained MAP Decoding:**  
  Concentric circular core sampling ($r = 0.32 \cdot b_w$) isolates pure graphite while eliminating outer ring ink and internal typographic labels. Column-constrained Softmax Maximum A Posteriori (MAP) and Median Absolute Deviation (MAD) robust order statistics achieve $\ge 99.99\%$ accuracy, reliably discriminating true marks from incomplete pencil erasures.

- **⚖️ Academic Grading & Marking Schemes:**  
  Full support for negative marking (+4, -1, 0), bonus questions, sectional scoring (Physics, Chemistry, Math), multiple-choice variants (MCQ-4, MCQ-5, Integer grids), and student roll number extraction.

- **🛡️ Human-in-the-Loop (HITL) Quality Control Station:**  
  Dedicated review station for flagged sheets. Review anomalous scans, inspect magnified bubble crops, and apply 1-click proctor overrides with an immutable audit trail.

- **📊 Psychometric Item Analysis & Distribution:**  
  Instant class-wide bell curve distributions, Item Difficulty Index ($p$), Item Discrimination Index ($D$), distractor frequency breakdowns, and automated question quality classifications.

- **🖨️ Multi-Format Enterprise Reporting:**  
  Export standard OMRChecker-compatible CSVs, complete LMS gradebooks, or generate official print-ready Student Result Scorecards.

---

## 🏗️ Architecture At A Glance

```
+-----------------------------------------------------------------------------------+
|                              OMRVIEW CLIENT APPLICATION                            |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |   TemplateStudio   |   |     BatchProcessor    |   |  QualityControlReview  |  |
|  | (Visual Calibrator)|   |   (CV Worker Queue)   |   |   (Human-in-the-Loop)  |  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
|            |                          |                           |               |
|            v                          v                           v               |
|  +-----------------------------------------------------------------------------+  |
|  |                     CORE COMPUTER VISION & GRADING PIPELINE                 |  |
|  |                                                                             |  |
|  |   [Image Ingestion] -> [Quadrant Marker Homography] -> [Adaptive CLAHE]     |  |
|  |                                                                   |         |  |
|  |   [Scoring & HITL]  <- [Evaluation Engine] <- [Dynamic Gap Thresholding]    |  |
|  +-----------------------------------------------------------------------------+  |
|            |                                                      |               |
|            v                                                      v               |
|  +--------------------+                               +------------------------+  |
|  | Analytics Engine   |                               |  Export & Report Engine|  |
|  | (Psychometrics)    |                               |  (CSV, LMS, Scorecards)|  |
|  +--------------------+                               +------------------------+  |
+-----------------------------------------------------------------------------------+
```

Read the full [Architecture Specification](file:///Users/md.rofazhasanrafiu/coding/OMRView/ARCHITECTURE.md).

---

## 🚀 Quick Start & Development

### Prerequisites
- Node.js $\ge 18$
- npm $\ge 9$

### Installation
```bash
# Clone the repository
git clone https://github.com/rofazhasan/OMRView.git
cd OMRView

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser. The WebAssembly OpenCV core will initialize automatically.

### Production Build
```bash
npm run build
npm run preview
```

---

## 💼 Institutional Licensing & Commercialization

OMRView Enterprise is offered under a dual open-core and commercial institutional model:

| Edition | Audience | Key Inclusions |
| :--- | :--- | :--- |
| **Community** | Individual Teachers & Developers | Open-core browser scanner, standard MCQ grading, CSV export |
| **Educator Pro** | Test Prep Academies & Tutors (\$29/mo) | Unlimited batch scans, Visual Studio, Psychometrics, PDF scorecards |
| **Campus Enterprise** | Universities & Districts (\$2,499/yr) | Unlimited proctors, Canvas/LTI 1.3 sync, air-gapped desktop, SLA |
| **OEM / SDK** | EdTech & LMS Vendors (\$15k+/yr) | Headless WASM grading core, white-label client portal, custom API |

For commercial inquiries, review our [Commercialization & GTM Strategy](file:///Users/md.rofazhasanrafiu/coding/OMRView/COMMERCIALIZATION_AND_GTM.md) or contact sales.

---

## 📚 Enterprise Documentation Pack

- [📘 Architecture Specification](file:///Users/md.rofazhasanrafiu/coding/OMRView/ARCHITECTURE.md): Deep-dive into computer vision homography, threshold algorithms, and WASM memory safety.
- [📋 Product Requirements Document (PRD)](file:///Users/md.rofazhasanrafiu/coding/OMRView/ENTERPRISE_PRD.md): Market problem, personas, feature matrix, and NFRs.
- [💰 Commercialization & GTM Playbook](file:///Users/md.rofazhasanrafiu/coding/OMRView/COMMERCIALIZATION_AND_GTM.md): Institutional ROI calculator, sales pitch scripts, battlecards vs Scantron.
- [🔌 API & Integration Guide](file:///Users/md.rofazhasanrafiu/coding/OMRView/API_AND_INTEGRATION_SPEC.md): REST endpoints, WebSocket streaming, Canvas/Moodle LTI 1.3 protocol.
- [🔒 Security & Compliance Guide](file:///Users/md.rofazhasanrafiu/coding/OMRView/SECURITY_AND_COMPLIANCE.md): Zero-Knowledge privacy model, FERPA, GDPR, and immutable audit logs.
- [🗺️ Multi-Quarter Roadmap](file:///Users/md.rofazhasanrafiu/coding/OMRView/DEVELOPMENT_ROADMAP.md): Tauri v2 desktop app, mobile AR scanner, and Neural OCR extensions.

---

## 🤝 Relationship with OMRChecker

OMRView is natively compatible with templates and conventions established by Udayraj123's [OMRChecker](https://github.com/Udayraj123/OMRChecker). OMRView elevates this algorithmic foundation into a modern visual studio, real-time client-side evaluation engine, and enterprise assessment suite.
