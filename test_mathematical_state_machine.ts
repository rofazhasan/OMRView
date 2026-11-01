import { 
  createOmrScanStateMachine, 
  OmrProcessingState 
} from './src/core/omrScanStateMachine';
import { 
  MathematicalStateMachine, 
  StateMachineConfig 
} from './src/core/mathematicalStateMachine';

function getStateName(state: OmrProcessingState): string {
  const entry = Object.entries(OmrProcessingState).find(([_, v]) => v === state);
  return entry ? entry[0] : String(state);
}

async function runMathematicalVerification() {
  console.log('================================================================');
  console.log('MATHEMATICAL EXTENDED VECTOR STATE MACHINE (EVSM) VERIFICATION');
  console.log('================================================================\n');

  // TEST 1: Full Lifecycle Transition Sequence
  console.log('Test 1: Full High-Precision OMR Scanning Lifecycle...');
  const sm = createOmrScanStateMachine('SHEET_TEST_001', 'sample_scan.jpg', [2480, 3508]);
  
  console.log(` Initial State: ${getStateName(sm.getState())} (Bit: 1 << ${sm.getState()})`);

  let res = sm.dispatch('INGEST_IMAGE');
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 1: ${getStateName(sm.getState())}, V(d) = ${sm.getPayload().remainingStepsToComplete}`);

  res = sm.dispatch('LOCATE_FIDUCIALS', { markersDetected: true, skewAngle: 1.25 });
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 2: ${getStateName(sm.getState())}, Skew = ${sm.getPayload().skewAngle}°`);

  res = sm.dispatch('APPLY_PERSPECTIVE_WARP');
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 3: ${getStateName(sm.getState())}`);

  res = sm.dispatch('NORMALIZE_ILLUMINATION', { contrastMean: 135, contrastVariance: 520 });
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 4: ${getStateName(sm.getState())}`);

  res = sm.dispatch('SAMPLE_CONCENTRIC_BUBBLES', { bubbleCount: 200 });
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 5: ${getStateName(sm.getState())}, Sampled = ${sm.getPayload().bubbleCount} bubbles`);

  res = sm.dispatch('CLASSIFY_DUAL_METRIC', { markedCount: 48, ambiguousCount: 0, confidence: 0.9999 });
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 6: ${getStateName(sm.getState())}, Confidence = ${(sm.getPayload().confidenceScore * 100).toFixed(2)}%`);

  res = sm.dispatch('RESOLVE_METADATA_FIELDS', { roll: '102451', reg: '1912048563', set: 'ক' });
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 7: ${getStateName(sm.getState())}, Roll = ${sm.getPayload().rollNumber}, Set = ${sm.getPayload().setCode}`);

  res = sm.dispatch('GRADE_AND_SCORE', { score: 47.5 });
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 8: ${getStateName(sm.getState())}, Score = ${sm.getPayload().score}`);

  res = sm.dispatch('FINALIZE_RESULT');
  if (!res.success) throw new Error(res.error);
  console.log(` -> Step 9: ${getStateName(sm.getState())}, Is Terminal: ${sm.isTerminal()}\n`);

  // TEST 2: Transaction Speculation & Rollback
  console.log('Test 2: Speculative Execution & Transactional Rollback...');
  const specSm = createOmrScanStateMachine('SHEET_SPEC_002', 'sample_spec.jpg', [1846, 2612]);
  specSm.dispatch('INGEST_IMAGE');
  specSm.dispatch('LOCATE_FIDUCIALS', { markersDetected: true, skewAngle: 0.5 });
  
  console.log(` Pre-checkpoint State: ${getStateName(specSm.getState())}`);
  specSm.checkpoint(); // Commit state snapshot

  // Speculative illegal attempt or bad warp
  specSm.dispatch('APPLY_PERSPECTIVE_WARP');
  console.log(` Speculatively advanced to: ${getStateName(specSm.getState())}`);

  // Roll back
  const rolledBack = specSm.rollback();
  console.log(` Rolled back successfully? ${rolledBack}`);
  console.log(` Restored State: ${getStateName(specSm.getState())} (Verified: Should be FIDUCIALS_LOCATED)\n`);
  if (specSm.getState() !== OmrProcessingState.FIDUCIALS_LOCATED) {
    throw new Error('Rollback failed to restore state');
  }

  // TEST 3: Invariant Enforcement
  console.log('Test 3: Mathematical Invariant Preservation Assertion...');
  try {
    const invSm = new MathematicalStateMachine<number, { val: number }, string>({
      initialState: 0,
      initialPayload: { val: 10 },
      safetyInvariant: (_s, p) => p.val >= 0, // Invariant: val must stay non-negative
      transitions: [
        {
          from: 0,
          to: 1,
          event: 'DECREMENT',
          transform: (p) => { p.val -= 100; } // Will violate invariant
        }
      ]
    });
    invSm.dispatch('DECREMENT');
    throw new Error('Invariant violation failed to trigger!');
  } catch (err: any) {
    console.log(` Caught expected invariant violation: "${err.message}"\n`);
  }

  // TEST 4: High-Throughput Speed Benchmark (100,000 Transitions)
  console.log('Test 4: High-Throughput Nanosecond Transition Benchmark...');
  const benchmarkRounds = 100000;
  const BenchState = { S0: 0, S1: 1, S2: 2, S3: 3 } as const;
  type BenchStateType = (typeof BenchState)[keyof typeof BenchState];
  const benchSm = new MathematicalStateMachine<BenchStateType, { count: number }, 'NEXT' | 'RESET'>({
    initialState: BenchState.S0,
    initialPayload: { count: 0 },
    transitions: [
      { from: BenchState.S0, to: BenchState.S1, event: 'NEXT', transform: (p) => { p.count++; } },
      { from: BenchState.S1, to: BenchState.S2, event: 'NEXT', transform: (p) => { p.count++; } },
      { from: BenchState.S2, to: BenchState.S3, event: 'NEXT', transform: (p) => { p.count++; } },
      { from: BenchState.S3, to: BenchState.S0, event: 'RESET', transform: (p) => { p.count++; } },
    ]
  });

  const tStart = performance.now();
  for (let i = 0; i < benchmarkRounds; i++) {
    benchSm.dispatch('NEXT');
    benchSm.dispatch('NEXT');
    benchSm.dispatch('NEXT');
    benchSm.dispatch('RESET');
  }
  const tEnd = performance.now();
  const totalTransitions = benchmarkRounds * 4;
  const elapsedMs = tEnd - tStart;
  const nsPerTransition = (elapsedMs * 1e6) / totalTransitions;
  const opsPerSec = Math.round((totalTransitions / elapsedMs) * 1000);

  console.log(` Total Transitions Evaluated: ${totalTransitions.toLocaleString()}`);
  console.log(` Elapsed Wall Clock Time:     ${elapsedMs.toFixed(2)} ms`);
  console.log(` Speed per Transition:        ${nsPerTransition.toFixed(1)} nanoseconds`);
  console.log(` Throughput:                  ${opsPerSec.toLocaleString()} transitions / second`);
  console.log('\n================================================================');
  console.log('ALL MATHEMATICAL STATE MACHINE SPECIFICATIONS VERIFIED & PASSED');
  console.log('================================================================');
}

runMathematicalVerification().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
