import { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Percent, 
  Award, 
  AlertCircle, 
  Download,
  CheckCircle2
} from 'lucide-react';
import type { ClassPsychometrics, StudentScoreCard } from '../types/omr';
import Papa from 'papaparse';

interface AnalyticsDashboardProps {
  scoreCards: StudentScoreCard[];
  psychometrics: ClassPsychometrics;
}

export function AnalyticsDashboard({ scoreCards, psychometrics }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ITEM_ANALYSIS' | 'ROSTER'>('OVERVIEW');

  const handleExportRosterCSV = () => {
    if (scoreCards.length === 0) return;
    const rows = scoreCards.map(c => ({
      Rank: c.rank || '',
      RollNumber: c.rollNumber,
      Filename: c.filename,
      ExamSet: c.examSet,
      TotalScore: c.totalScore,
      MaxScore: c.maxScore,
      Percentage: c.percentage,
      Percentile: c.percentile || '',
      Correct: c.correctCount,
      Incorrect: c.incorrectCount,
      Unmarked: c.unmarkedCount,
      Status: c.flags.length > 0 ? 'FLAGGED' : 'CLEAN',
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_score_roster.csv';
    a.click();
  };

  const handleExportPsychometricsCSV = () => {
    const items = Object.values(psychometrics.itemAnalysis);
    if (items.length === 0) return;
    const rows = items.map(item => ({
      Question: item.question,
      DifficultyIndex_p: item.difficultyIndex,
      DiscriminationIndex_D: item.discriminationIndex,
      QualityClassification: item.classification,
      Option_A: item.distractorCounts['A'] || 0,
      Option_B: item.distractorCounts['B'] || 0,
      Option_C: item.distractorCounts['C'] || 0,
      Option_D: item.distractorCounts['D'] || 0,
      Option_E: item.distractorCounts['E'] || 0,
      Unmarked: item.distractorCounts['UNMARKED'] || 0,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'psychometric_item_analysis.csv';
    a.click();
  };

  return (
    <div className="analytics-dashboard animate-fade-in">
      <div className="analytics-header glass-panel">
        <div>
          <h2>Cohort Analytics & Psychometrics Engine</h2>
          <p className="subtitle">Automated statistical analysis, bell-curve distribution, and psychometric item discrimination</p>
        </div>

        <div className="analytics-actions">
          <button className="btn btn-outline" onClick={handleExportPsychometricsCSV}>
            <Download size={18} />
            Export Item Analysis CSV
          </button>
          <button className="btn btn-primary" onClick={handleExportRosterCSV}>
            <Download size={18} />
            Export Complete Gradebook
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="metric-cards-grid">
        <div className="metric-card glass-panel">
          <div className="metric-icon" style={{ background: 'rgba(168, 85, 247, 0.2)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Candidates</span>
            <span className="metric-value">{psychometrics.totalCandidates}</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon" style={{ background: 'rgba(20, 184, 166, 0.2)', color: 'var(--accent)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Mean Score</span>
            <span className="metric-value">{psychometrics.averageScore} <small>pts</small></span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
            <Award size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Highest Score</span>
            <span className="metric-value">{psychometrics.highestScore} <small>pts</small></span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <Percent size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Pass Percentage</span>
            <span className="metric-value">{psychometrics.passPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="dashboard-tab-bar">
        <button 
          className={`dash-tab ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERVIEW')}
        >
          <BarChart3 size={18} /> Grade Distribution & Summary
        </button>
        <button 
          className={`dash-tab ${activeTab === 'ITEM_ANALYSIS' ? 'active' : ''}`}
          onClick={() => setActiveTab('ITEM_ANALYSIS')}
        >
          <TrendingUp size={18} /> Psychometric Item Analysis
        </button>
        <button 
          className={`dash-tab ${activeTab === 'ROSTER' ? 'active' : ''}`}
          onClick={() => setActiveTab('ROSTER')}
        >
          <Users size={18} /> Candidate Rank Roster ({scoreCards.length})
        </button>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="overview-tab-content">
          <div className="distribution-card glass-panel">
            <h3>Grade Bell-Curve Distribution</h3>
            <div className="grade-bars-container">
              {[
                { grade: 'A (>= 80%)', count: psychometrics.gradeDistribution.A, color: '#10b981' },
                { grade: 'B (65-79%)', count: psychometrics.gradeDistribution.B, color: '#3b82f6' },
                { grade: 'C (50-64%)', count: psychometrics.gradeDistribution.C, color: '#f59e0b' },
                { grade: 'D (40-49%)', count: psychometrics.gradeDistribution.D, color: '#ec4899' },
                { grade: 'F (< 40%)', count: psychometrics.gradeDistribution.F, color: '#ef4444' },
              ].map(g => {
                const total = psychometrics.totalCandidates || 1;
                const pct = Math.round((g.count / total) * 100);

                return (
                  <div key={g.grade} className="grade-bar-row">
                    <span className="grade-label">{g.grade}</span>
                    <div className="bar-track">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${pct}%`, background: g.color }}
                      />
                    </div>
                    <span className="grade-count">{g.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="stats-breakdown-card glass-panel">
            <h3>Statistical Health Indicators</h3>
            <div className="stats-list">
              <div className="stat-line">
                <span>Standard Deviation</span>
                <strong>{psychometrics.standardDeviation}</strong>
              </div>
              <div className="stat-line">
                <span>Median Score</span>
                <strong>{psychometrics.medianScore} pts</strong>
              </div>
              <div className="stat-line">
                <span>Lowest Score</span>
                <strong>{psychometrics.lowestScore} pts</strong>
              </div>
              <div className="stat-line">
                <span>Total Items Evaluated</span>
                <strong>{Object.keys(psychometrics.itemAnalysis).length} questions</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ITEM_ANALYSIS' && (
        <div className="item-analysis-panel glass-panel">
          <div className="table-header-row">
            <div>
              <h3>Item Difficulty & Discrimination Matrix</h3>
              <p className="subtitle">
                Difficulty ($p \in [0, 1]$): Fraction of correct responses &bull; Discrimination ($D \in [-1, 1]$): Difference between top 27% and bottom 27%
              </p>
            </div>
          </div>

          <div className="table-scroll-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Difficulty ($p$)</th>
                  <th>Discrimination ($D$)</th>
                  <th>Classification</th>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                  <th>D</th>
                  <th>Blank</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(psychometrics.itemAnalysis).map(item => {
                  let badgeClass = 'ideal';
                  if (item.classification === 'Too Hard') badgeClass = 'danger';
                  if (item.classification === 'Too Easy') badgeClass = 'info';
                  if (item.classification === 'Poor Discriminator') badgeClass = 'warning';

                  return (
                    <tr key={item.question}>
                      <td><strong>{item.question}</strong></td>
                      <td>
                        <span className="num-pill">{item.difficultyIndex}</span>
                      </td>
                      <td>
                        <span className={`num-pill ${item.discriminationIndex < 0.2 ? 'low-discrim' : ''}`}>
                          {item.discriminationIndex}
                        </span>
                      </td>
                      <td>
                        <span className={`quality-badge ${badgeClass}`}>
                          {item.classification}
                        </span>
                      </td>
                      <td>{item.distractorCounts['A'] || 0}</td>
                      <td>{item.distractorCounts['B'] || 0}</td>
                      <td>{item.distractorCounts['C'] || 0}</td>
                      <td>{item.distractorCounts['D'] || 0}</td>
                      <td>{item.distractorCounts['UNMARKED'] || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ROSTER' && (
        <div className="roster-panel glass-panel">
          <div className="table-header-row">
            <h3>Candidate Merit Roster</h3>
          </div>

          <div className="table-scroll-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Roll Number</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Percentile</th>
                  <th>Correct</th>
                  <th>Incorrect</th>
                  <th>Unmarked</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {scoreCards.map(c => (
                  <tr key={c.sheetId}>
                    <td><span className="rank-badge">#{c.rank || '-'}</span></td>
                    <td><strong>{c.rollNumber}</strong></td>
                    <td><strong>{c.totalScore}</strong> / {c.maxScore}</td>
                    <td>{c.percentage}%</td>
                    <td>{c.percentile}%</td>
                    <td style={{ color: '#10b981' }}>{c.correctCount}</td>
                    <td style={{ color: '#ef4444' }}>{c.incorrectCount}</td>
                    <td style={{ color: '#94a3b8' }}>{c.unmarkedCount}</td>
                    <td>
                      {c.flags.length > 0 ? (
                        <span className="status-pill warning"><AlertCircle size={14} /> Flagged</span>
                      ) : (
                        <span className="status-pill success"><CheckCircle2 size={14} /> Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

