# OMRView Enterprise Product Requirements Document (PRD)

**Document Version:** 2.0.0  
**Target Market:** Higher Education, K-12 School Districts, Test Preparation & Coaching Academies, Corporate Credentialing Bodies  
**Classification:** Confidential & Proprietary  

---

## 1. Executive Summary & Market Problem

### 1.1 The Legacy OMR Pain Point
For decades, academic testing and competitive examinations have relied on dedicated Optical Mark Reader hardware (e.g., Scantron machines). These legacy systems impose severe operational burdens:
1. **High Hardware Capital Costs:** Dedicated OMR optical scanners cost between **\$3,500 and \$18,000 per unit** with costly maintenance contracts.
2. **Proprietary Pre-Printed Paper:** Institutions must purchase proprietary drop-out red ink sheets costing **\$0.20 to \$0.45 per sheet**, compared to **\$0.01 per sheet** for standard photocopy paper.
3. **Rigid Configuration:** Creating custom answer keys or layouts requires proprietary software or specialized technicians.
4. **Data Silos & Privacy Vulnerabilities:** Legacy systems do not integrate cleanly into modern web-based LMS (Canvas, Moodle, Blackboard) or Student Information Systems (SIS).

### 1.2 The OMRView Solution
**OMRView Enterprise** is a web-first and edge-enabled software platform that turns **any standard office document scanner, photocopier, or mobile smartphone camera** into a high-speed, military-grade OMR scoring station.

By utilizing WebAssembly-compiled computer vision (OpenCV.js), OMRView enables:
- Use of **regular photocopy paper** printed on standard monochrome laser printers.
- **Instant batch processing** (up to 120 sheets/minute via standard ADF scanner or mobile camera).
- **100% Client-Side Privacy** ensuring zero student PII (Personally Identifiable Information) ever leaves the school's local intranet.
- Interactive **Visual Template Studio** eliminating manual coordinate measuring.
- Automated **Psychometric Item Analysis** to pinpoint test reliability and defective questions.

---

## 2. Ideal Customer Profiles (ICP) & Target Personas

| Persona | Role | Primary Objective | Critical Pain Point |
| :--- | :--- | :--- | :--- |
| **Dr. Sarah Vance** | Dean of Academic Testing, State University | Eliminate high scanner replacement costs; grade 15,000 midterms within 48 hours. | Legacy scanners jamming; inability to integrate directly with Canvas LMS. |
| **Marcus Thorne** | Founder, Elite Test Prep Academy (5,000 students) | Fast turnaround of weekly simulated SAT/NEET mock exams; automated student report cards for parents. | Manual grading takes 3 days; parents demand instant performance analytics. |
| **Priya Patel** | High School Examination Officer | Maintain strict FERPA compliance; grade semester finals on standard photocopy paper. | Tight school district budget; cannot afford proprietary Scantron forms. |
| **David Chen** | Director of HR & Certification, Multinational Bank | Conduct nationwide offline technical qualification tests with air-gapped security. | Cannot upload employee test answers to external cloud services due to corporate compliance. |

---

## 3. Product Requirements & Feature Matrix

### 3.1 P0: Mission-Critical Capabilities (Included in v2.0)
- **99.99% Accuracy Industrial Computer Vision Engine:**
  - **Concentric Core Sampling:** Eliminates outer printed circle ring noise and bubble letter labels by sampling the concentric inner core (18% inset, 64% diameter).
  - **Spatial Moments Subpixel Alignment:** Uses OpenCV image moments ($c_x = m_{10}/m_{00}, c_y = m_{01}/m_{00}$) for sub-pixel marker centroid refinement, eliminating sub-pixel translation drift.
  - **Dual-Metric Group-Aware Contrast & Fill Ratio:** Evaluates both relative contrast drop against local question background ($\Delta I \ge 14$) and internal pixel fill ratio ($F_i \ge 0.22$), distinguishing genuine marks from paper texture and incomplete erasures.
  - **Incomplete Erasure & Smudge Discrimination:** Automatically distinguishes light erasures from newly marked choices while flagging borderline edge cases.
- **Visual Template Designer Studio (`TemplateStudio`):**
  - Interactive browser canvas allowing administrators to import blank exam sheets, set block origins, tune row/column pitches, and preview coordinate overlays in real-time.
  - 100% bi-directional compatibility with [OMRChecker](https://github.com/Udayraj123/OMRChecker) JSON schema format (`template.json`).
- **Robust Quadrant Marker Alignment Engine:**
  - Automated perspective rectification using corner marker fiducials (`CropOnMarkers`) and fallback page contour detection (`CropPage`).
  - Rotational skew invariance up to $\pm 25^\circ$.
- **Academic Grading & Scoring Engine:**
  - Standard (+4, -1, 0), partial, and weighted multi-choice answer matching.
  - Section-based weightings (e.g. Physics vs Chemistry vs Math).
  - Bonus question mark allocation.
  - Automated candidate roll number and question set code concatenation.
- **Human-in-the-Loop (HITL) Quality Control Station (Zero-Defect Guarantee):**
  - Dedicated exception queue filtering scans with multiple marks, low confidence (< 0.85), or blank responses.
  - 1-click proctor override with immutable audit logging, delivering 99.99% operational exam grading accuracy.
- **Enterprise Psychometric Analytics:**
  - Bell-curve grade distribution (A, B, C, D, F).
  - Item Difficulty Index ($p$) and Item Discrimination Index ($D$).
  - Distractor frequency matrix.
- **Multi-Format Exports:**
  - Detailed CSV results (OMRChecker format + Extended LMS format).
  - Printable official Student Scorecard slips with sectional breakdowns.

### 3.2 P1: Enterprise Integration & Scaling (Q1 2027)
- Web Worker Multi-threading for concurrent processing across all available CPU cores.
- PDF Multi-Page Ingestion with automatic page orientation rotation.
- Direct LMS gradebook synchronization via LTI 1.3 Advantage protocol.
- Barcode and QR code reading (Code 128, QR) for candidate ID registration.

### 3.3 P2: Advanced AI & Mobile Extensions (Q2 2027)
- Edge Neural OCR for handwritten roll number and student name reading.
- Offline desktop distribution package (Tauri / Electron) for air-gapped military/government exam centers.
- iOS and Android mobile app with live AR edge detection and auto-capture shutter.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Performance & Throughput
- **Single-Sheet Recognition Latency:** $< 180\text{ ms}$ on a standard Intel Core i5 / Apple M1 laptop.
- **Batch Processing Throughput:** $\ge 60\text{ sheets/minute}$ on a single browser tab; $\ge 200\text{ sheets/minute}$ when running multi-threaded Web Workers.
- **Memory Footprint:** Peak browser heap memory consumption must remain $< 350\text{ MB}$ even during continuous processing of 500+ sheets.

### 4.2 Accuracy & Reliability
- **Recognition Accuracy:** $\ge 99.98\%$ on clean scanned sheets; $\ge 99.7\%$ on smartphone camera captures under standard ambient lighting.
- **False Positive Rejection:** Ambiguous or lightly erased marks must be flagged with $100\%$ sensitivity when within $15$ grayscale intensity units of the dynamic threshold.

### 4.3 Browser & Hardware Compatibility
- Chrome/Edge 100+, Safari 16+, Firefox 105+.
- Full support for multi-touch mobile devices (iPad, iPhone, Android tablets).
- High-DPI Retina screen rendering with adaptive canvas resolution scaling.

---

## 5. Compliance & Regulatory Matrix

| Regulation / Standard | Requirement | OMRView Implementation |
| :--- | :--- | :--- |
| **FERPA** (34 CFR Part 99) | Student educational records and grades must remain confidential. | 100% client-side WASM execution; zero data or images transmitted to third-party servers. |
| **GDPR** (EU 2016/679) | Data minimization and Privacy by Design (Article 25). | Data is processed ephemerally in RAM; local persistence requires explicit user confirmation. |
| **Section 508 / WCAG 2.1 AA** | Accessibility for exam proctors and administrators. | High-contrast glassmorphic design tokens, full keyboard navigability, semantic ARIA attributes. |
| **SOC 2 Type II** | Security, availability, and processing integrity. | Defensible, immutable audit logging for all manual scoring adjustments; zero cloud attack surface. |

