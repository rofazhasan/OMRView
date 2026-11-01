# OMRView Enterprise Architecture Specification

## 1. System Vision & Overview

**OMRView Enterprise** is an optical mark recognition (OMR) and assessment intelligence platform. It bridges the gap between raw computer vision engines (such as [OMRChecker](https://github.com/Udayraj123/OMRChecker)) and enterprise academic administration workflows.

OMRView uses a **Privacy-First, Zero-Knowledge Edge Architecture**: 100% of the image processing, homographic rectification, dynamic thresholding, and scoring calculation executes client-side within the browser or edge runtime via WebAssembly (OpenCV.js). Scanned student exam sheets, personal identification numbers, and gradebooks never traverse external networks unless the institution explicitly connects an authorized SIS/LMS webhook.

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

---

## 2. Core Computer Vision Pipeline

The image processing engine mirrors and extends the battle-tested algorithms from `OMRChecker`:

### Step 1: Quadrant Corner Marker Detection (`CropOnMarkers`)
- **Objective:** Detect four distinct fiducial markers (solid black squares/rectangles) printed at the outer margins of the exam paper.
- **Algorithm:**
  1. Grayscale transformation: $I_{\text{gray}} = 0.299R + 0.587G + 0.114B$.
  2. Inverted binary thresholding with cutoff $\tau = 120$.
  3. Contour extraction via `RETR_EXTERNAL` with `CHAIN_APPROX_SIMPLE`.
  4. Spatial partitioning: The image is split into four geometric quadrants (Top-Left, Top-Right, Bottom-Left, Bottom-Right) around the image centroid $(\frac{W}{2}, \frac{H}{2})$.
  5. Geometric filter: Contours are scored by area $A \in [150, \frac{W \times H}{10}]$, polygonal approximation vertex count ($4 \le V \le 6$), and aspect ratio $0.65 \le \frac{w}{h} \le 1.45$.
  6. The largest valid contour in each quadrant defines the fiducial coordinate:
     $$\mathbf{P}_{\text{quad}} = \{ \mathbf{p}_{\text{TL}}, \mathbf{p}_{\text{TR}}, \mathbf{p}_{\text{BL}}, \mathbf{p}_{\text{BR}} \}$$

### Step 2: Perspective Rectification (Homography Warp)
- Using the ordered fiducial points and target template dimensions $(W_{\text{target}}, H_{\text{target}})$, we compute the $3 \times 3$ perspective transformation matrix $\mathbf{M}$ satisfying:
  $$\begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} \sim \mathbf{M} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}$$
- The document is warped to exact target template dimensions using `cv.warpPerspective` with bilinear interpolation.
- **Fallback:** If corner markers are obscured or absent, the pipeline falls back to full-page convex hull quadrilateral detection (`CropPage`), or isotropic aspect-ratio scaling.

### Step 3: Illumination Normalization & Morphological Conditioning
- Mobile phone captures frequently suffer from non-uniform shadows, ambient gradients, and paper curvature.
- Contrast Limited Adaptive Histogram Equalization (**CLAHE**) is applied to equalize local luminance gradients without amplifying high-frequency noise.

### Step 4: Bubble Intensity Sampling & Dynamic Gap Thresholding
- For each defined bubble point $(x_i, y_i)$ with dimensions $(w_b, h_b)$, a Region of Interest (ROI) is sampled:
  $$\mu_i = \frac{1}{w_b \times h_b} \sum_{x=x_i}^{x_i+w_b} \sum_{y=y_i}^{y_i+h_b} I_{\text{gray}}(x, y)$$
- **Dynamic Otsu Gap Detection:**
  Instead of hardcoding a fixed threshold (e.g. 128), all bubble intensities are sorted in ascending order:
  $$\mu_{(1)} \le \mu_{(2)} \le \dots \le \mu_{(N)}$$
  The algorithm searches for the maximum discrete drop-off (gap) between filled bubbles and blank paper:
  $$\Delta_{\max} = \max_{k} \left( \mu_{(k)} - \mu_{(k-1)} \right), \quad \text{for } \Delta_{\max} > 12$$
  $$\tau_{\text{dynamic}} = \mu_{(k-1)} + \frac{\Delta_{\max}}{2}$$
- A bubble is classified as **Marked** if $\mu_i < \tau_{\text{dynamic}}$.
- **Confidence Metric ($C_i \in [0, 1]$):**
  $$C_i = \min\left(1.0, \frac{|\mu_i - \tau_{\text{dynamic}}|}{50}\right)$$
  Bubbles with $|\mu_i - \tau_{\text{dynamic}}| \le 18$ are flagged as **Ambiguous** for human proctor review.

---

## 3. Data Flow & Evaluation Architecture

```
[Raw Scans (Files / Camera)]
           |
           v
   +---------------+
   |   omrEngine   | ----> Raw Responses { "q1": ["A"], "q2": ["B", "C"], "Roll": ["1","0","4"] }
   +---------------+
           |
           v
+---------------------+
| templateParser      | ----> Concatenated IDs: Roll = "104", Custom Labels
+---------------------+
           |
           v
+---------------------+
| evaluationEngine    | <---- [Master Answer Key & Sectional Marking Rules]
+---------------------+
           |
           +----> StudentScoreCard (Total, Section Scores, Percentile, Flags)
           |
           v
+---------------------+
| analyticsEngine     | ----> Class Psychometrics (p-values, Discrimination D, Grade Dist)
+---------------------+
           |
           v
[Exports: OMRChecker CSV, Gradebook, Official Printable Scorecards]
```

---

## 4. WebAssembly & Memory Safety Architecture

OpenCV.js compiles C++ OpenCV routines to WebAssembly. In JavaScript engines, WebAssembly allocations are **not automatically garbage collected**. Failure to manually release allocated `cv.Mat` instances causes rapid heap exhaustion (out-of-memory crashes) when batch processing hundreds of sheets.

### OMRView Memory Management Protocol:
1. Every intermediate `cv.Mat`, `cv.MatVector`, and transform matrix `M` is created within a strict lifecycle block.
2. An explicit deallocation sequence is guaranteed:
   ```ts
   try {
     // CV operations...
   } finally {
     src.delete();
     warped.delete();
     gray.delete();
     // Explicit Mat cleanup prevents WASM linear memory leaks
   }
   ```
3. Batch operations chunk processing in batches of 5 to 10 sheets, yielding the browser event loop via `requestAnimationFrame` / `setTimeout` to maintain 60 FPS UI responsiveness.

---

## 5. Security & Isolation Boundaries

- **Zero Network Transmission:** All scanning and evaluation is performed locally in the browser memory. No student data, images, or test scores leave the user's workstation.
- **Client-Side Encryption:** When saving local batch sessions, data can be encrypted in IndexedDB using AES-GCM-256 with an institution-held passphrase.
- **Defensible Audit Trail:** Any proctor override of an ambiguous question creates an immutable, timestamped audit log containing operator identity, previous value, new value, and proctor justification.

