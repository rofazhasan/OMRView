# OMRView Enterprise API & Integration Specification

**Protocol Version:** 2.1  
**Compatibility:** LTI 1.3 Advantage, RESTful OpenAPI 3.1, WebSocket Streaming  
**Authentication:** OAuth 2.0 Bearer Token / HMAC-SHA256 Signed Webhooks  

---

## 1. Overview & Integration Architecture

OMRView Enterprise can operate in two deployment topologies:
1. **Headless Client SDK (Edge Mode):** The WASM computer vision pipeline runs directly inside the client application or Electron container without a server backend.
2. **Hybrid Server Engine (Enterprise Gateway Mode):** An optional microservice daemon for institutional batch automation, background queues, and Student Information System (SIS) synchronization.

```
+-------------------------------------------------------------------------------+
|                             ENTERPRISE INTEGRATION BUS                        |
|                                                                               |
|  +--------------------+        +---------------------+        +------------+  |
|  |     Canvas LMS     |        |   PowerSchool SIS   |        | Custom SIS |  |
|  |   (LTI 1.3 AGS)    |        |     (REST API)      |        | (Webhooks) |  |
|  +---------+----------+        +----------+----------+        +-----+------+  |
|            |                              |                         |         |
|            v                              v                         v         |
|  +-------------------------------------------------------------------------+  |
|  |                     OMRVIEW ENTERPRISE API GATEWAY                      |  |
|  |                                                                         |  |
|  |   /v2/templates        /v2/evaluations/batch        /v2/gradebook/sync  |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 2. RESTful API Endpoints

### 2.1 Register or Validate Template
- **Endpoint:** `POST /api/v2/templates`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <TOKEN>`
- **Request Payload:**
```json
{
  "templateName": "Fall2026_Physics_Midterm",
  "pageDimensions": [1846, 1500],
  "bubbleDimensions": [40, 40],
  "preProcessors": [{ "name": "CropOnMarkers" }],
  "fieldBlocks": {
    "Roll": {
      "origin": [286, 282],
      "bubblesGap": 46,
      "labelsGap": 58,
      "fieldType": "QTYPE_INT",
      "direction": "vertical",
      "fieldLabels": ["roll1..9"]
    },
    "Physics": {
      "origin": [168, 804],
      "bubblesGap": 51,
      "labelsGap": 43,
      "fieldType": "QTYPE_MCQ4",
      "direction": "horizontal",
      "fieldLabels": ["q1..25"],
      "section": "Physics"
    }
  }
}
```
- **Response `201 Created`:**
```json
{
  "templateId": "tmpl_982bf7e4",
  "status": "VALIDATED",
  "totalBubbles": 190,
  "createdAt": "2026-11-01T10:00:00Z"
}
```

---

### 2.2 Submit Batch Evaluation Job
- **Endpoint:** `POST /api/v2/evaluations/batch`
- **Request (`multipart/form-data`):**
  - `templateId`: `tmpl_982bf7e4`
  - `evaluationConfig`: JSON blob containing answer keys and marking scheme
  - `scans`: Array of binary image files (`scan_001.jpg`, `scan_002.png`, etc.)
- **Response `202 Accepted`:**
```json
{
  "jobId": "job_e7104b2a",
  "status": "QUEUED",
  "totalSheets": 150,
  "websocketUrl": "wss://api.omrview.internal/v2/jobs/job_e7104b2a/stream"
}
```

---

### 2.3 Retrieve Gradebook & Scorecards
- **Endpoint:** `GET /api/v2/evaluations/batch/{jobId}/roster`
- **Response `200 OK`:**
```json
{
  "jobId": "job_e7104b2a",
  "totalEvaluated": 150,
  "averageScore": 74.2,
  "highestScore": 96.0,
  "roster": [
    {
      "sheetId": "sheet_01",
      "rollNumber": "1049283",
      "totalScore": 88.0,
      "maxScore": 100.0,
      "percentage": 88.0,
      "rank": 4,
      "percentile": 97.3,
      "flags": [],
      "needsReview": false
    }
  ]
}
```

---

## 3. Real-Time WebSocket Streaming

Clients can open a persistent duplex WebSocket connection to observe live recognition throughput and receive instant notifications when ambiguous sheets require human review.

```json
// Event: "sheet.processed"
{
  "event": "sheet.processed",
  "jobId": "job_e7104b2a",
  "sheetIndex": 42,
  "totalSheets": 150,
  "rollNumber": "1049283",
  "score": 88.0,
  "status": "SUCCESS"
}

// Event: "sheet.flagged"
{
  "event": "sheet.flagged",
  "jobId": "job_e7104b2a",
  "sheetId": "sheet_43",
  "rollNumber": "1049284",
  "reason": "Multiple marks detected on question q14: [B, C]",
  "requiresAction": "HITL_VERIFICATION"
}
```

---

## 4. LTI 1.3 Advantage Integration (Canvas / Moodle / Blackboard)

OMRView Enterprise implements the **IMS Global Learning Tools Interoperability (LTI) 1.3 Core** and the **Assignment and Grade Services (AGS) v2.0**:

1. **Authentication Flow:** OpenID Connect (OIDC) third-party initiated login with signed JSON Web Tokens (JWT) using the institution's public JWKS endpoint.
2. **Line Item Association:** An exam in OMRView maps 1-to-1 with an Assignment Column in the Canvas/Moodle Gradebook.
3. **Score Transmission (`ScorePublish`):**
   ```http
   POST https://canvas.university.edu/api/lti/courses/1024/line_items/55/scores
   Content-Type: application/vnd.ims.lis.v1.score+json
   Authorization: Bearer <OAUTH2_TOKEN>

   {
     "userId": "usr_991823",
     "scoreGiven": 88.0,
     "scoreMaximum": 100.0,
     "comment": "Graded via OMRView Enterprise. Rank: 4/150",
     "timestamp": "2026-11-01T10:15:00Z",
     "activityProgress": "Completed",
     "gradingProgress": "FullyGraded"
   }
   ```

---

## 5. Webhook Specification (Outbound Notifications)

Enterprise clients can register webhook listeners with HMAC-SHA256 signature verification in the `X-OMRView-Signature` HTTP header.

```json
{
  "id": "evt_77189a",
  "type": "batch.evaluation.completed",
  "timestamp": 1730438400000,
  "data": {
    "jobId": "job_e7104b2a",
    "examName": "AIMAT-2026",
    "totalCandidates": 150,
    "passPercentage": 82.6,
    "flaggedCount": 2,
    "downloadUrls": {
      "summaryCsv": "https://api.omrview.internal/v2/reports/job_e7104b2a/summary.csv",
      "detailedCsv": "https://api.omrview.internal/v2/reports/job_e7104b2a/detailed.csv"
    }
  }
}
```

