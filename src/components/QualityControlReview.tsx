import { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  FileEdit, 
  UserCheck, 
  Search,
  History
} from 'lucide-react';
import type { StudentScoreCard, AuditLogEntry, ScanProcessingResult } from '../types/omr';

interface QualityControlReviewProps {
  scoreCards: StudentScoreCard[];
  scanResults: Record<string, ScanProcessingResult>;
  onOverrideScoreCard: (sheetId: string, updatedCard: StudentScoreCard, auditEntry: AuditLogEntry) => void;
}

export function QualityControlReview({ 
  scoreCards, 
  scanResults: _scanResults, 
  onOverrideScoreCard 
}: QualityControlReviewProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'FLAGGED' | 'CLEAN'>('FLAGGED');
  const [selectedSheetId, setSelectedSheetId] = useState<string>(scoreCards[0]?.sheetId || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const filteredCards = scoreCards.filter(card => {
    if (filterMode === 'FLAGGED' && !card.needsReview && card.flags.length === 0) return false;
    if (filterMode === 'CLEAN' && (card.needsReview || card.flags.length > 0)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        card.rollNumber.toLowerCase().includes(q) ||
        card.filename.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCard = scoreCards.find(c => c.sheetId === selectedSheetId) || filteredCards[0];
  // activeScan available for future deep image pixel inspect

  const handleApplyOverride = (qKey: string) => {
    if (!activeCard || !overrideValue.trim()) return;

    const previousVal = activeCard.questionVerdicts[qKey]?.studentAnswer || '';
    const verdict = activeCard.questionVerdicts[qKey];
    if (!verdict) return;

    const isCorrect = typeof verdict.correctAnswer === 'string'
      ? overrideValue.trim().toUpperCase() === verdict.correctAnswer.toUpperCase()
      : false;

    const newScore = isCorrect ? 4 : (overrideValue ? -1 : 0);

    const updatedVerdicts = {
      ...activeCard.questionVerdicts,
      [qKey]: {
        ...verdict,
        studentAnswer: overrideValue.trim().toUpperCase(),
        verdict: isCorrect ? ('correct' as const) : ('incorrect' as const),
        score: newScore,
      },
    };

    // Recompute total score and item metrics
    const newTotal = Object.values(updatedVerdicts).reduce((acc, v) => acc + v.score, 0);
    let newCorrect = 0;
    let newIncorrect = 0;
    let newUnmarked = 0;
    const newSectionScores: Record<string, { score: number; max: number; correct: number; total: number }> = {};

    for (const v of Object.values(updatedVerdicts)) {
      if (v.verdict === 'correct' || v.verdict === 'bonus') newCorrect++;
      else if (v.verdict === 'incorrect' || v.verdict === 'multi_marked') newIncorrect++;
      else newUnmarked++;

      const sec = v.section || 'General';
      if (!newSectionScores[sec]) newSectionScores[sec] = { score: 0, max: 0, correct: 0, total: 0 };
      newSectionScores[sec].score += v.score;
      newSectionScores[sec].total += 1;
      newSectionScores[sec].max += 4;
      if (v.verdict === 'correct' || v.verdict === 'bonus') newSectionScores[sec].correct += 1;
    }

    const newPercentage = activeCard.maxScore > 0 
      ? parseFloat(((newTotal / activeCard.maxScore) * 100).toFixed(2)) 
      : 0;

    const remainingFlags = activeCard.flags.filter(f => !f.includes(qKey));

    const updatedCard: StudentScoreCard = {
      ...activeCard,
      questionVerdicts: updatedVerdicts,
      totalScore: newTotal,
      percentage: newPercentage,
      correctCount: newCorrect,
      incorrectCount: newIncorrect,
      unmarkedCount: newUnmarked,
      sectionScores: newSectionScores,
      flags: remainingFlags,
      needsReview: remainingFlags.length > 0,
      manualOverride: true,
    };

    const auditEntry: AuditLogEntry = {
      id: 'audit_' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      sheetId: activeCard.sheetId,
      field: qKey,
      previousValue: previousVal,
      newValue: overrideValue.trim().toUpperCase(),
      reason: overrideReason || 'Manual proctor verification of ambiguous bubble mark',
      operator: 'Exam Proctor (HITL)',
    };

    setAuditLogs(prev => [auditEntry, ...prev]);
    onOverrideScoreCard(activeCard.sheetId, updatedCard, auditEntry);
    setEditingQuestion(null);
    setOverrideValue('');
    setOverrideReason('');
  };

  return (
    <div className="qc-review-container animate-fade-in">
      <div className="qc-header glass-panel">
        <div>
          <h2>Human-in-the-Loop Quality Control Review</h2>
          <p className="subtitle">Audit anomalous scans, ambiguous erasures, and multi-marks with immutable verification logging</p>
        </div>

        <div className="qc-stats-summary">
          <div className="stat-pill">
            <UserCheck size={16} />
            <span>{scoreCards.length} Evaluated</span>
          </div>
          <div className="stat-pill" style={{ color: '#f59e0b' }}>
            <AlertTriangle size={16} />
            <span>{scoreCards.filter(c => c.needsReview || c.flags.length > 0).length} Flagged</span>
          </div>
          <div className="stat-pill" style={{ color: '#10b981' }}>
            <CheckCircle2 size={16} />
            <span>{scoreCards.filter(c => !c.needsReview && c.flags.length === 0).length} Verified</span>
          </div>
        </div>
      </div>

      <div className="qc-main-grid">
        {/* Left Column: Filterable Sheet List */}
        <div className="qc-list-panel glass-panel">
          <div className="qc-list-controls">
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search Roll No or Filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-pill-group">
              <button 
                className={`filter-pill ${filterMode === 'FLAGGED' ? 'active' : ''}`}
                onClick={() => setFilterMode('FLAGGED')}
              >
                Flagged ({scoreCards.filter(c => c.needsReview || c.flags.length > 0).length})
              </button>
              <button 
                className={`filter-pill ${filterMode === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterMode('ALL')}
              >
                All ({scoreCards.length})
              </button>
              <button 
                className={`filter-pill ${filterMode === 'CLEAN' ? 'active' : ''}`}
                onClick={() => setFilterMode('CLEAN')}
              >
                Clean
              </button>
            </div>
          </div>

          <div className="sheet-cards-list">
            {filteredCards.length === 0 ? (
              <div className="empty-state">
                <CheckCircle2 size={32} color="#10b981" />
                <p>No sheets matching this filter</p>
              </div>
            ) : (
              filteredCards.map(card => {
                const isSelected = card.sheetId === activeCard?.sheetId;
                const hasFlags = card.flags.length > 0 || card.needsReview;

                return (
                  <div 
                    key={card.sheetId}
                    className={`sheet-item-card ${isSelected ? 'selected' : ''} ${hasFlags ? 'has-flags' : ''}`}
                    onClick={() => setSelectedSheetId(card.sheetId)}
                  >
                    <div className="card-top">
                      <span className="roll-badge">Roll: {card.rollNumber}</span>
                      <span className="score-badge">{card.totalScore} pts ({card.percentage}%)</span>
                    </div>
                    <div className="card-filename">{card.filename}</div>
                    {hasFlags && (
                      <div className="card-flags">
                        <AlertTriangle size={14} color="#f59e0b" />
                        <span>{card.flags.length} issue(s) flagged</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Sheet Detail & Visual Inspection */}
        <div className="qc-detail-panel glass-panel">
          {activeCard ? (
            <div className="detail-content">
              <div className="detail-header">
                <div>
                  <h3>Candidate Inspection: Roll {activeCard.rollNumber}</h3>
                  <span className="file-subtext">{activeCard.filename} &bull; Sheet ID: {activeCard.sheetId}</span>
                </div>
                <div className="detail-actions">
                  <div className="score-badge large">
                    Total: {activeCard.totalScore} / {activeCard.maxScore}
                  </div>
                </div>
              </div>

              {activeCard.flags.length > 0 && (
                <div className="warning-banner">
                  <AlertTriangle size={20} color="#f59e0b" />
                  <div>
                    <strong>Flagged for Review:</strong>
                    <ul>
                      {activeCard.flags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Question Verdicts Inspection Table */}
              <div className="verdicts-table-container">
                <h4>Item-by-Item Question Audit</h4>
                <table className="verdicts-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Section</th>
                      <th>Candidate Marked</th>
                      <th>Correct Answer</th>
                      <th>Score</th>
                      <th>Verdict</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(activeCard.questionVerdicts).map(v => {
                      const isFlagged = activeCard.flags.some(f => f.includes(v.question));

                      return (
                        <tr key={v.question} className={isFlagged ? 'row-flagged' : ''}>
                          <td><strong>{v.question}</strong></td>
                          <td>{v.section}</td>
                          <td>
                            <span className={`ans-tag ${v.studentAnswer ? 'marked' : 'empty'}`}>
                              {v.studentAnswer || 'BLANK'}
                            </span>
                          </td>
                          <td>
                            <span className="ans-tag correct">
                              {typeof v.correctAnswer === 'string' ? v.correctAnswer : JSON.stringify(v.correctAnswer)}
                            </span>
                          </td>
                          <td>{v.score > 0 ? `+${v.score}` : v.score}</td>
                          <td>
                            <span className={`verdict-pill ${v.verdict}`}>
                              {v.verdict}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-xs btn-outline"
                              onClick={() => {
                                setEditingQuestion(v.question);
                                setOverrideValue(v.studentAnswer);
                              }}
                            >
                              <FileEdit size={14} /> Override
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Override Modal / Inline Dialog */}
              {editingQuestion && (
                <div className="override-dialog glass-panel animate-fade-in">
                  <h4>Manual Override for Question: {editingQuestion}</h4>
                  <div className="field-group">
                    <label>New Corrected Answer for Student</label>
                    <input 
                      type="text" 
                      value={overrideValue} 
                      onChange={(e) => setOverrideValue(e.target.value.toUpperCase())}
                      className="input-field"
                      placeholder="e.g. A, B, C, D"
                    />
                  </div>
                  <div className="field-group">
                    <label>Audit Justification / Proctor Notes</label>
                    <input 
                      type="text" 
                      value={overrideReason} 
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="input-field"
                      placeholder="e.g. Student thoroughly erased option B and marked C"
                    />
                  </div>
                  <div className="dialog-actions">
                    <button className="btn btn-outline" onClick={() => setEditingQuestion(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => handleApplyOverride(editingQuestion)}>
                      Save Override & Log Audit
                    </button>
                  </div>
                </div>
              )}

              {/* Audit History */}
              {auditLogs.length > 0 && (
                <div className="audit-history-box">
                  <h4><History size={16} /> Audit Trail ({auditLogs.length} actions)</h4>
                  <div className="audit-log-list">
                    {auditLogs.map(log => (
                      <div key={log.id} className="audit-log-item">
                        <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="log-text">
                          <strong>{log.operator}</strong> adjusted <strong>{log.field}</strong> from '{log.previousValue}' to '{log.newValue}' &mdash; <em>{log.reason}</em>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <Eye size={48} />
              <p>Select a candidate sheet from the left column to begin review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
