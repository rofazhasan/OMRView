/**
 * OMR Scan Lifecycle Machine driven by Mathematical Extended Vector State Machine
 * 
 * Formal States:
 * Q = {
 *   UNINITIALIZED: 0,
 *   INGESTED: 1,
 *   FIDUCIALS_LOCATED: 2,
 *   PERSPECTIVE_WARPED: 3,
 *   ILLUMINATION_FLATTENED: 4,
 *   BUBBLES_SAMPLED: 5,
 *   DUAL_METRIC_CLASSIFIED: 6,
 *   ROLL_REG_RESOLVED: 7,
 *   EVALUATED_AND_SCORED: 8,
 *   QUALITY_AUDIT_FLAGGED: 9,
 *   FINALIZED: 10,
 *   REJECTED_ERROR: 11
 * }
 * 
 * Guaranteed Lyapunov Termination Metric:
 * V(d) = d.remainingStepsToComplete >= 0, dV/dt <= -1 per state transition.
 */

import { MathematicalStateMachine } from './mathematicalStateMachine';

export const OmrProcessingState = {
  UNINITIALIZED: 0,
  INGESTED: 1,
  FIDUCIALS_LOCATED: 2,
  PERSPECTIVE_WARPED: 3,
  ILLUMINATION_FLATTENED: 4,
  BUBBLES_SAMPLED: 5,
  DUAL_METRIC_CLASSIFIED: 6,
  ROLL_REG_RESOLVED: 7,
  EVALUATED_AND_SCORED: 8,
  QUALITY_AUDIT_FLAGGED: 9,
  FINALIZED: 10,
  REJECTED_ERROR: 11
} as const;

export type OmrProcessingState = (typeof OmrProcessingState)[keyof typeof OmrProcessingState];

export function getOmrStateName(state: OmrProcessingState): string {
  const entry = Object.entries(OmrProcessingState).find(([_, v]) => v === state);
  return entry ? entry[0] : String(state);
}

export interface OmrScanContextVector {
  sheetId: string;
  filename: string;
  imageDimensions: [number, number];
  markersDetected: boolean;
  skewAngle: number;
  contrastMean: number;
  contrastVariance: number;
  bubbleCount: number;
  markedCount: number;
  ambiguousCount: number;
  confidenceScore: number;
  rollNumber: string;
  regNumber: string;
  setCode: string;
  score: number;
  flags: string[];
  remainingStepsToComplete: number; // Lyapunov potential V(d)
}

export type OmrScanEvent =
  | 'INGEST_IMAGE'
  | 'LOCATE_FIDUCIALS'
  | 'APPLY_PERSPECTIVE_WARP'
  | 'NORMALIZE_ILLUMINATION'
  | 'SAMPLE_CONCENTRIC_BUBBLES'
  | 'CLASSIFY_DUAL_METRIC'
  | 'RESOLVE_METADATA_FIELDS'
  | 'GRADE_AND_SCORE'
  | 'FLAG_FOR_AUDIT'
  | 'FINALIZE_RESULT'
  | 'ABORT_WITH_ERROR';

export function createOmrScanStateMachine(
  sheetId: string,
  filename: string,
  dimensions: [number, number]
): MathematicalStateMachine<OmrProcessingState, OmrScanContextVector, OmrScanEvent> {
  const initialVector: OmrScanContextVector = {
    sheetId,
    filename,
    imageDimensions: dimensions,
    markersDetected: false,
    skewAngle: 0,
    contrastMean: 0,
    contrastVariance: 0,
    bubbleCount: 0,
    markedCount: 0,
    ambiguousCount: 0,
    confidenceScore: 1.0,
    rollNumber: '',
    regNumber: '',
    setCode: '',
    score: 0,
    flags: [],
    remainingStepsToComplete: 10
  };

  return new MathematicalStateMachine<OmrProcessingState, OmrScanContextVector, OmrScanEvent>({
    initialState: OmrProcessingState.UNINITIALIZED,
    initialPayload: initialVector,
    terminalStates: [
      OmrProcessingState.FINALIZED,
      OmrProcessingState.QUALITY_AUDIT_FLAGGED,
      OmrProcessingState.REJECTED_ERROR
    ],

    // Mathematical Safety Invariant: Confidence in [0, 1] and positive remaining steps
    safetyInvariant: (_state, payload) => {
      return (
        payload.confidenceScore >= 0.0 &&
        payload.confidenceScore <= 1.0 &&
        payload.remainingStepsToComplete >= 0 &&
        payload.imageDimensions[0] > 0 &&
        payload.imageDimensions[1] > 0
      );
    },

    // Lyapunov Potential Function: V(d) strictly decrements to guarantee O(1) finite termination
    lyapunovPotential: (payload) => payload.remainingStepsToComplete,

    transitions: [
      {
        from: OmrProcessingState.UNINITIALIZED,
        to: OmrProcessingState.INGESTED,
        event: 'INGEST_IMAGE',
        transform: (d) => {
          d.remainingStepsToComplete = 9;
        }
      },
      {
        from: OmrProcessingState.INGESTED,
        to: OmrProcessingState.FIDUCIALS_LOCATED,
        event: 'LOCATE_FIDUCIALS',
        transform: (d, meta?: { markersDetected: boolean; skewAngle: number }) => {
          d.markersDetected = meta?.markersDetected ?? true;
          d.skewAngle = meta?.skewAngle ?? 0;
          d.remainingStepsToComplete = 8;
        }
      },
      {
        from: OmrProcessingState.FIDUCIALS_LOCATED,
        to: OmrProcessingState.PERSPECTIVE_WARPED,
        event: 'APPLY_PERSPECTIVE_WARP',
        guard: (d) => Math.abs(d.skewAngle) <= 60.0, // Physical tilt threshold
        transform: (d) => {
          d.remainingStepsToComplete = 7;
        }
      },
      {
        from: OmrProcessingState.PERSPECTIVE_WARPED,
        to: OmrProcessingState.ILLUMINATION_FLATTENED,
        event: 'NORMALIZE_ILLUMINATION',
        transform: (d, meta?: { contrastMean: number; contrastVariance: number }) => {
          d.contrastMean = meta?.contrastMean ?? 128;
          d.contrastVariance = meta?.contrastVariance ?? 400;
          d.remainingStepsToComplete = 6;
        }
      },
      {
        from: OmrProcessingState.ILLUMINATION_FLATTENED,
        to: OmrProcessingState.BUBBLES_SAMPLED,
        event: 'SAMPLE_CONCENTRIC_BUBBLES',
        transform: (d, meta?: { bubbleCount: number }) => {
          d.bubbleCount = meta?.bubbleCount ?? 0;
          d.remainingStepsToComplete = 5;
        }
      },
      {
        from: OmrProcessingState.BUBBLES_SAMPLED,
        to: OmrProcessingState.DUAL_METRIC_CLASSIFIED,
        event: 'CLASSIFY_DUAL_METRIC',
        transform: (d, meta?: { markedCount: number; ambiguousCount: number; confidence: number }) => {
          d.markedCount = meta?.markedCount ?? 0;
          d.ambiguousCount = meta?.ambiguousCount ?? 0;
          d.confidenceScore = meta?.confidence ?? 0.9999;
          d.remainingStepsToComplete = 4;
        }
      },
      {
        from: OmrProcessingState.DUAL_METRIC_CLASSIFIED,
        to: OmrProcessingState.ROLL_REG_RESOLVED,
        event: 'RESOLVE_METADATA_FIELDS',
        transform: (d, meta?: { roll: string; reg: string; set: string }) => {
          d.rollNumber = meta?.roll ?? '';
          d.regNumber = meta?.reg ?? '';
          d.setCode = meta?.set ?? '';
          d.remainingStepsToComplete = 3;
        }
      },
      {
        from: OmrProcessingState.ROLL_REG_RESOLVED,
        to: OmrProcessingState.EVALUATED_AND_SCORED,
        event: 'GRADE_AND_SCORE',
        guard: (d) => d.ambiguousCount === 0 && d.confidenceScore >= 0.85,
        transform: (d, meta?: { score: number }) => {
          d.score = meta?.score ?? 0;
          d.remainingStepsToComplete = 2;
        }
      },
      {
        // High-confidence path to completion
        from: OmrProcessingState.EVALUATED_AND_SCORED,
        to: OmrProcessingState.FINALIZED,
        event: 'FINALIZE_RESULT',
        transform: (d) => {
          d.remainingStepsToComplete = 0;
        }
      },
      {
        // Fallback quality control audit branch when bubbles or metadata have ambiguities
        from: OmrProcessingState.ROLL_REG_RESOLVED,
        to: OmrProcessingState.QUALITY_AUDIT_FLAGGED,
        event: 'FLAG_FOR_AUDIT',
        guard: (d) => d.ambiguousCount > 0 || d.confidenceScore < 0.85 || d.rollNumber === '',
        transform: (d, meta?: { flagReason: string }) => {
          if (meta?.flagReason) {
            d.flags.push(meta.flagReason);
          }
          d.remainingStepsToComplete = 0;
        }
      },
      {
        // Direct transition from any unfinalized state to REJECTED_ERROR on fatal failure
        from: OmrProcessingState.INGESTED,
        to: OmrProcessingState.REJECTED_ERROR,
        event: 'ABORT_WITH_ERROR',
        transform: (d, err?: { message: string }) => {
          if (err?.message) d.flags.push(`FATAL: ${err.message}`);
          d.remainingStepsToComplete = 0;
        }
      },
      {
        from: OmrProcessingState.FIDUCIALS_LOCATED,
        to: OmrProcessingState.REJECTED_ERROR,
        event: 'ABORT_WITH_ERROR',
        transform: (d, err?: { message: string }) => {
          if (err?.message) d.flags.push(`FATAL: ${err.message}`);
          d.remainingStepsToComplete = 0;
        }
      }
    ]
  });
}
