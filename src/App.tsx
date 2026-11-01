import { useState, useEffect } from 'react';
import { 
  Activity, 
  Layers, 
  Sliders, 
  Key, 
  ShieldCheck, 
  BarChart3, 
  Bookmark,
  Printer
} from 'lucide-react';
import type { 
  Template, 
  BubblePoint, 
  EvaluationConfig, 
  ScanProcessingResult, 
  StudentScoreCard, 
  ClassPsychometrics, 
  AuditLogEntry 
} from './types/omr';
import { parseTemplate } from './core/templateParser';
import { AnalyticsEngine } from './core/analyticsEngine';
import { PRESET_TEMPLATES } from './data/presetTemplates';

import { BatchProcessor } from './components/BatchProcessor';
import { TemplateStudio } from './components/TemplateStudio';
import { BangladeshOMRGenerator } from './components/BangladeshOMRGenerator';
import { EvaluationManager } from './components/EvaluationManager';
import { QualityControlReview } from './components/QualityControlReview';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { StudentReportCardModal } from './components/StudentReportCardModal';

import './App.css';

export function App() {
  const [cvReady, setCvReady] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Initializing Computer Vision Core...');
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'STUDIO' | 'BD_DESIGNER' | 'EVALUATION' | 'QC' | 'ANALYTICS'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toUpperCase().replace('#', '');
      if (['SCANNER', 'STUDIO', 'BD_DESIGNER', 'EVALUATION', 'QC', 'ANALYTICS'].includes(hash)) {
        return hash as any;
      }
    }
    return 'SCANNER';
  });

  const handleTabChange = (tab: 'SCANNER' | 'STUDIO' | 'BD_DESIGNER' | 'EVALUATION' | 'QC' | 'ANALYTICS') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab.toLowerCase();
    }
  };

  // Active Template & Bubbles state
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_TEMPLATES[0].id);
  const [template, setTemplate] = useState<Template | null>(PRESET_TEMPLATES[0].template);
  const [bubbles, setBubbles] = useState<BubblePoint[]>(() => {
    try {
      const parsed = parseTemplate(PRESET_TEMPLATES[0].template);
      return parsed.bubbles;
    } catch {
      return [];
    }
  });

  // Active Evaluation Configuration
  const [evalConfig, setEvalConfig] = useState<EvaluationConfig>(PRESET_TEMPLATES[0].evaluationConfig);

  // Batch Scan Results & Cohort Scorecards
  const [scanResults, setScanResults] = useState<Record<string, ScanProcessingResult>>({});
  const [scoreCards, setScoreCards] = useState<StudentScoreCard[]>([]);
  const [psychometrics, setPsychometrics] = useState<ClassPsychometrics>(() => 
    AnalyticsEngine.computePsychometrics([])
  );

  // Scorecard modal state
  const [printingScoreCard, setPrintingScoreCard] = useState<StudentScoreCard | null>(null);

  // Check OpenCV.js availability
  useEffect(() => {
    const checkCv = setInterval(() => {
      if ((window as any).cv && typeof (window as any).cv.Mat === 'function') {
        setCvReady(true);
        setStatus('OpenCV 4.12 WASM Engine Ready');
        clearInterval(checkCv);
      }
    }, 400);
    return () => clearInterval(checkCv);
  }, []);

  // Update psychometrics whenever scoreCards change
  useEffect(() => {
    const metrics = AnalyticsEngine.computePsychometrics(scoreCards);
    setPsychometrics(metrics);
  }, [scoreCards]);

  // Load a preset template
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setTemplate(preset.template);
    setEvalConfig(preset.evaluationConfig);
    try {
      const parsed = parseTemplate(preset.template);
      setBubbles(parsed.bubbles);
      setStatus(`Loaded preset: ${preset.name} (${parsed.bubbles.length} bubbles)`);
    } catch (err: any) {
      console.error(err);
      setStatus('Failed to parse preset template');
    }
  };

  const handleApplyCustomTemplate = (newTemplate: Template) => {
    setTemplate(newTemplate);
    try {
      const parsed = parseTemplate(newTemplate);
      setBubbles(parsed.bubbles);
      setStatus(`Applied custom template: ${Object.keys(newTemplate.fieldBlocks).length} blocks, ${parsed.bubbles.length} bubbles`);
      setActiveTab('SCANNER');
    } catch (err: any) {
      console.error(err);
      setStatus('Failed to apply template: ' + err.message);
    }
  };

  const handleBatchComplete = (
    newScans: Record<string, ScanProcessingResult>, 
    newCards: StudentScoreCard[]
  ) => {
    setScanResults(newScans);
    setScoreCards(newCards);
  };

  const handleOverrideScoreCard = (
    sheetId: string, 
    updatedCard: StudentScoreCard, 
    _auditEntry: AuditLogEntry
  ) => {
    setScoreCards(prev => prev.map(c => c.sheetId === sheetId ? updatedCard : c));
  };

  return (
    <div className="app-container">
      {/* Enterprise Header */}
      <header className="header animate-fade-in">
        <div className="logo-container">
          <div className="logo-badge">
            <Activity size={28} color="#a855f7" />
          </div>
          <div>
            <div className="brand-row">
              <h1>OMRView</h1>
              <span className="brand-edition">Enterprise Studio</span>
            </div>
            <span className="brand-tagline">Optical Mark Recognition & Assessment Intelligence Platform</span>
          </div>
        </div>

        <div className="header-center-controls">
          <div className="preset-selector">
            <Bookmark size={16} />
            <select 
              value={selectedPresetId} 
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="preset-dropdown"
            >
              {PRESET_TEMPLATES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="status-badge">
          <span className={`indicator ${cvReady ? 'ready' : 'loading'}`}></span>
          {status}
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="enterprise-nav glass-panel animate-fade-in">
        <button 
          className={`nav-tab ${activeTab === 'SCANNER' ? 'active' : ''}`}
          onClick={() => handleTabChange('SCANNER')}
        >
          <Layers size={18} />
          <span>Batch Scan & Grade</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'STUDIO' ? 'active' : ''}`}
          onClick={() => handleTabChange('STUDIO')}
        >
          <Sliders size={18} />
          <span>Template Studio</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'BD_DESIGNER' ? 'active' : ''}`}
          onClick={() => handleTabChange('BD_DESIGNER')}
        >
          <Printer size={18} />
          <span>🇧🇩 BD OMR Print Designer</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'EVALUATION' ? 'active' : ''}`}
          onClick={() => handleTabChange('EVALUATION')}
        >
          <Key size={18} />
          <span>Answer Key & Scheme</span>
        </button>

        <button 
          className={`nav-tab ${activeTab === 'QC' ? 'active' : ''}`}
          onClick={() => handleTabChange('QC')}
        >
          <ShieldCheck size={18} />
          <span>Quality Review (HITL)</span>
          {scoreCards.some(c => c.needsReview || c.flags.length > 0) && (
            <span className="nav-badge-alert">
              {scoreCards.filter(c => c.needsReview || c.flags.length > 0).length}
            </span>
          )}
        </button>

        <button 
          className={`nav-tab ${activeTab === 'ANALYTICS' ? 'active' : ''}`}
          onClick={() => handleTabChange('ANALYTICS')}
        >
          <BarChart3 size={18} />
          <span>Cohort Psychometrics</span>
          {scoreCards.length > 0 && (
            <span className="nav-badge-count">{scoreCards.length}</span>
          )}
        </button>
      </nav>

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'SCANNER' && (
          <BatchProcessor 
            template={template}
            bubbles={bubbles}
            evaluationConfig={evalConfig}
            scanResults={scanResults}
            scoreCards={scoreCards}
            onBatchComplete={handleBatchComplete}
            onSelectScoreCardForPrint={(card) => setPrintingScoreCard(card)}
            onNavigateToQC={() => setActiveTab('QC')}
          />
        )}

        {activeTab === 'STUDIO' && (
          <TemplateStudio 
            initialTemplate={template}
            onApplyTemplate={handleApplyCustomTemplate}
          />
        )}

        {activeTab === 'BD_DESIGNER' && (
          <BangladeshOMRGenerator 
            onApplyGeneratedTemplate={handleApplyCustomTemplate}
            onNavigateToScanner={() => setActiveTab('SCANNER')}
          />
        )}

        {activeTab === 'EVALUATION' && (
          <EvaluationManager 
            config={evalConfig}
            template={template}
            bubbles={bubbles}
            onUpdateConfig={(newConfig) => setEvalConfig(newConfig)}
          />
        )}

        {activeTab === 'QC' && (
          <QualityControlReview 
            scoreCards={scoreCards}
            scanResults={scanResults}
            onOverrideScoreCard={handleOverrideScoreCard}
          />
        )}

        {activeTab === 'ANALYTICS' && (
          <AnalyticsDashboard 
            scoreCards={scoreCards}
            psychometrics={psychometrics}
          />
        )}
      </main>

      {/* Official Student Scorecard Modal */}
      {printingScoreCard && (
        <StudentReportCardModal 
          scoreCard={printingScoreCard}
          config={evalConfig}
          onClose={() => setPrintingScoreCard(null)}
        />
      )}
    </div>
  );
}

export default App;
