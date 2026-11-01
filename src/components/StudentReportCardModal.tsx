import { Printer, X, Award, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import type { StudentScoreCard, EvaluationConfig } from '../types/omr';

interface StudentReportCardModalProps {
  scoreCard: StudentScoreCard | null;
  config: EvaluationConfig;
  onClose: () => void;
}

export function StudentReportCardModal({ scoreCard, config, onClose }: StudentReportCardModalProps) {
  if (!scoreCard) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="report-card-modal glass-panel">
        <div className="modal-actions-bar no-print">
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> Print Official Scorecard
          </button>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Printable Scorecard Container */}
        <div className="printable-scorecard" id="printable-scorecard">
          <div className="scorecard-header">
            <div className="header-brand">
              <Award size={36} color="#9333ea" />
              <div>
                <h2>{config.examName}</h2>
                <p>Official Examination Result Statement &bull; {config.examCode || 'EXAM-2026'}</p>
              </div>
            </div>
            <div className="scorecard-meta">
              <div className="meta-box">
                <span className="meta-label">CANDIDATE ROLL NO</span>
                <span className="meta-val">{scoreCard.rollNumber}</span>
              </div>
              <div className="meta-box">
                <span className="meta-label">ALL-COHORT RANK</span>
                <span className="meta-val">#{scoreCard.rank || 'N/A'}</span>
              </div>
              <div className="meta-box">
                <span className="meta-label">PERCENTILE</span>
                <span className="meta-val">{scoreCard.percentile}%</span>
              </div>
            </div>
          </div>

          <div className="score-summary-banner">
            <div className="score-metric">
              <span className="label">TOTAL MARKS</span>
              <span className="value">{scoreCard.totalScore} / {scoreCard.maxScore}</span>
            </div>
            <div className="score-metric">
              <span className="label">PERCENTAGE</span>
              <span className="value">{scoreCard.percentage}%</span>
            </div>
            <div className="score-metric">
              <span className="label">CORRECT</span>
              <span className="value" style={{ color: '#16a34a' }}>{scoreCard.correctCount}</span>
            </div>
            <div className="score-metric">
              <span className="label">INCORRECT</span>
              <span className="value" style={{ color: '#dc2626' }}>{scoreCard.incorrectCount}</span>
            </div>
            <div className="score-metric">
              <span className="label">UNMARKED</span>
              <span className="value" style={{ color: '#64748b' }}>{scoreCard.unmarkedCount}</span>
            </div>
          </div>

          {/* Sectional Breakdown */}
          {Object.keys(scoreCard.sectionScores).length > 0 && (
            <div className="section-breakdown-box">
              <h3>Sectional Score Breakdown</h3>
              <div className="sections-grid">
                {Object.entries(scoreCard.sectionScores).map(([secName, sec]) => (
                  <div key={secName} className="sec-card">
                    <h4>{secName}</h4>
                    <div className="sec-stats">
                      <span>Score: <strong>{sec.score} / {sec.max}</strong></span>
                      <span>Accuracy: <strong>{Math.round((sec.correct / (sec.total || 1)) * 100)}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question Grid */}
          <div className="questions-grid-box">
            <h3>Item-Level Responses</h3>
            <div className="items-matrix">
              {Object.values(scoreCard.questionVerdicts).map(v => {
                let statusIcon = <CheckCircle size={14} color="#16a34a" />;
                let itemClass = 'correct';

                if (v.verdict === 'incorrect' || v.verdict === 'multi_marked') {
                  statusIcon = <XCircle size={14} color="#dc2626" />;
                  itemClass = 'incorrect';
                } else if (v.verdict === 'unmarked') {
                  statusIcon = <MinusCircle size={14} color="#64748b" />;
                  itemClass = 'unmarked';
                }

                return (
                  <div key={v.question} className={`item-chip ${itemClass}`}>
                    <span className="chip-q">{v.question}</span>
                    <span className="chip-ans">Ans: {v.studentAnswer || '-'}</span>
                    <span className="chip-key">Key: {typeof v.correctAnswer === 'string' ? v.correctAnswer : 'Multi'}</span>
                    <span className="chip-icon">{statusIcon}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="scorecard-footer">
            <p>Generated automatically via OMRView Enterprise Assessment Engine. Verified by proctor audit trail.</p>
            <span className="timestamp">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

