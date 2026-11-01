# OMRView Enterprise Security, Privacy & Compliance Guide

**Status:** Approved for Institutional Assessment Deployments  
**Applicability:** K-12 Districts, State Universities, Civil Service & Certification Authorities  
**Classification:** Public Security Specification  

---

## 1. Zero-Knowledge Edge Architecture (Privacy by Design)

In high-stakes educational testing, data privacy is paramount. Transmitting scanned student answer sheets, handwriting samples, or gradebooks across external public clouds introduces severe compliance risks under **FERPA** (USA) and **GDPR** (EU).

**OMRView Enterprise is engineered on a Zero-Knowledge Client-Side Topology:**

```
+--------------------------------------------------------------------------------+
|                       LOCAL SECURE WORKSTATION BOUNDARY                        |
|                                                                                |
|  [Scanned Exam Images]                                                         |
|           |                                                                    |
|           v                                                                    |
|  [WebAssembly OpenCV.js Engine]  <--- Executed in browser sandbox              |
|           |                                                                    |
|           v                                                                    |
|  [Local Scoring & Evaluation]    <--- Executed in volatile RAM                 |
|           |                                                                    |
|           +-----> [Local Encrypted Storage (IndexedDB / AES-GCM-256)]          |
|           |                                                                    |
|           v                                                                    |
|  [Official Scorecards / CSV]     <--- Exported directly to proctor USB/Drive   |
+--------------------------------------------------------------------------------+
                                         |
                                         X (NO OUTBOUND CLOUD TRANSMISSION)
                                         v
                            [Public Cloud / External API]
```

### Core Privacy Guarantees:
1. **Zero External Server Transmission:** The computer vision and scoring algorithms run 100% locally on the instructor's device. No exam scans or student identifiers are uploaded to external cloud servers.
2. **Volatile Memory Execution:** Exam image pixels reside in ephemeral typed arrays in memory and are discarded immediately upon scoring.
3. **Air-Gapped Readiness:** OMRView can run in completely air-gapped environments with no active internet connection.

---

## 2. Regulatory Compliance Mappings

### 2.1 FERPA (34 CFR Part 99) Compliance
Under the Family Educational Rights and Privacy Act (FERPA), student educational records (including exam papers, grades, and student ID numbers) must be protected from unauthorized disclosure:
- **No Third-Party Access:** Because OMRView operates client-side, the software vendor never receives, hosts, or has access to student records.
- **School Official Exception:** When integrated into an institution's local LMS (Canvas, Blackboard), OMRView acts solely under the direct control of the institution's designated proctors.

### 2.2 GDPR (Regulation EU 2016/679) Compliance
- **Article 5 (Data Minimization):** Only the minimal data necessary to compute a score (bubble intensities and roll numbers) is processed.
- **Article 17 (Right to Erasure):** Clearing browser session storage immediately purges all processed batches and scorecards.
- **Article 25 (Data Protection by Design and by Default):** Privacy is the default operating mode—not an opt-in configuration.

---

## 3. Human-in-the-Loop (HITL) Immutable Audit Trail

In high-stakes grading, legal appeals and accreditation reviews require complete defensibility of every point awarded or deducted.

OMRView incorporates an **Immutable Proctor Audit Trail**:
1. When an ambiguous bubble (erased mark, smudge, multi-mark) is detected, the engine flags it with an explanation.
2. If a proctor overrides a score, an audit record is generated:
   ```json
   {
     "auditId": "audit_8f219c04",
     "timestamp": 1730438400000,
     "sheetId": "sheet_roll_10492",
     "field": "q14",
     "previousValue": "B",
     "newValue": "C",
     "operator": "Dr. Sarah Vance (Proctor ID: 442)",
     "reason": "Student thoroughly erased option B and marked C; verified under magnification.",
     "signature": "hmac_sha256_checksum"
   }
   ```
3. Audit trails are embedded into exported CSVs and printable student scorecards for institutional archiving.

---

## 4. Threat Modeling & Assessment Integrity

| Threat Vector | Potential Impact | OMRView Mitigation |
| :--- | :--- | :--- |
| **Erasure Smudge Ambiguity** | Incorrect marks deducted for poorly erased pencil marks. | Dynamic Otsu thresholding + Confidence scoring flags any bubble within $\pm 18$ grayscale units for proctor inspection. |
| **Collusion / Cheating** | Adjacent students copying answer sequences. | Cohort Anomaly Detector identifies statistically improbable answer match correlations ($r > 0.95$) between adjacent roll numbers. |
| **Paper Distortion / Wrinkles** | Misaligned bubble grids causing false reads. | 4-point homographic warp with quadrant fiducial checks ensures spatial grid coordinates are invariant to paper skew up to $25^\circ$. |
| **Grade Tampering** | Unauthorized post-grading alterations of CSVs. | Optional SHA-256 batch cryptographic hash manifests generated on export. |

