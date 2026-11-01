# OMRView Enterprise Engineering & Commercial Roadmap

**Version:** 2026.4 &bull; Multi-Quarter Strategic Roadmap  
**Target Horizon:** Q4 2026 &ndash; Q4 2027  

---

## 1. Roadmap Overview & Milestones

```
+-----------------------------------------------------------------------------------------------+
|                                  OMRVIEW PRODUCT HORIZON                                      |
+---------------------+---------------------+---------------------+-----------------------------+
| PHASE 1 (COMPLETE)  | PHASE 2 (Q1 2027)   | PHASE 3 (Q2 2027)   | PHASE 4 (Q3-Q4 2027)        |
| WebAssembly Studio  | Desktop Offline App | Mobile Scanner SDK  | Neural Handwriting OCR      |
+---------------------+---------------------+---------------------+-----------------------------+
| - WASM OpenCV Engine| - Tauri v2 Desktop  | - iOS/Android Apps  | - ONNX Runtime Edge         |
| - Visual Studio     | - Native File System| - AR Sheet Detection| - Handwritten ID Extraction |
| - Batch Grading     | - Multi-Worker Pool | - 1-Click Scan Sync | - Canvas LTI 1.3 App        |
| - HITL Review       | - PDF Multi-Page    | - Offline Camera Hub| - National Testing Cloud    |
| - Psychometrics     | - Auto-Updater      | - Mobile BLE Print  | - Automated Seat Allocation |
+---------------------+---------------------+---------------------+-----------------------------+
```

---

## 2. Phase 1: WebAssembly Studio & Core Engine (Current Release &bull; v2.0)
- [x] Client-side WebAssembly OpenCV 4.12 computer vision pipeline.
- [x] Bi-directional compatibility with [OMRChecker](https://github.com/Udayraj123/OMRChecker) JSON schema format.
- [x] Quadrant corner marker perspective homography (`CropOnMarkers`).
- [x] Adaptive Dynamic Otsu Gap Thresholding with confidence scoring ($C \in [0, 1]$).
- [x] Interactive Visual Template Designer Studio (`TemplateStudio`).
- [x] Master Answer Key & Marking Scheme Engine (+4, -1, bonus marks, sectional weighting).
- [x] Human-in-the-Loop (HITL) Quality Control Station for proctor overrides.
- [x] Psychometric Item Analysis (Difficulty Index $p$, Discrimination Index $D$, distractor breakdown).
- [x] Multi-format exports: OMRChecker-compatible CSV, Complete Gradebook, Printable Student Scorecards.
- [x] Preloaded Enterprise Test Presets (Standard Sample 1, Adrian Sample 2, Roll Number Sample 6).

---

## 3. Phase 2: Standalone Desktop Application & Native Performance (Q1 2027)
- [ ] **Tauri v2 + Rust Architecture:**
  - Package OMRView as a lightweight, cross-platform binary for Windows, macOS, and Linux ($< 25\text{ MB}$ download).
  - Native filesystem access: Direct directory watching on high-speed Fujitsu/Canon document scanners (auto-grades incoming scans in real time).
- [ ] **Multi-Threaded Web Worker Pool:**
  - Spawn hardware-concurrency worker threads to process 4 to 8 sheets in parallel.
  - Scale throughput from 60 sheets/minute to **300+ sheets/minute**.
- [ ] **Direct Multi-Page PDF Streaming:**
  - Ingest 500-page scanned PDF files directly without pre-splitting into JPG images.
  - Automated page deskew and double-sided scan deduplication.

---

## 4. Phase 3: Mobile Native Companion & AR Camera Scanning (Q2 2027)
- [ ] **iOS & Android Native Scanner (React Native / Capacitor):**
  - Real-time augmented reality (AR) bounding box tracking: overlays green corner guides when camera aligns with sheet markers.
  - Automated burst shutter: automatically captures and processes the sheet the moment fiducials are locked.
  - Offline sync: proctors can grade exams in rural testing centers with zero connectivity and sync to the cloud later.
- [ ] **Bluetooth Thermal Printer Integration:**
  - Print instant student result slips on portable receipts immediately upon exam submission.

---

## 5. Phase 4: Machine Learning Neural OCR & Enterprise Ecosystem (Q3-Q4 2027)
- [ ] **Handwritten Digit & Name Recognition (ONNX Runtime Web):**
  - Lightweight convolutional neural network (CNN) running locally to read handwritten student names and non-bubbled roll numbers.
- [ ] **Certified LMS App Marketplace Deployments:**
  - Official listings on Canvas App Center, Moodle Plugins Directory, and Blackboard App Store.
  - LTI 1.3 Advantage Deep Linking and Automated Gradebook Sync.
- [ ] **Anti-Collusion Anomaly Detection:**
  - Machine learning cluster analysis identifying suspicious similarity in wrong-answer distributions between students sitting in adjacent test seats.

