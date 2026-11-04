import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { 
  Upload, 
  Sparkles, 
  ClipboardPaste, 
  CheckCircle2, 
  Zap,
  Camera,
  Trash2,
  Copy,
  AlertTriangle,
  X,
  Star,
  Check,
  Bookmark
} from 'lucide-react';
import type { EvaluationConfig, MarkingScheme, Template, BubblePoint } from '../types/omr';
import { processOMR } from '../core/omrEngine';
import { parseTemplate } from '../core/templateParser';
import { renderPdfToCanvases } from '../utils/pdfLoader';

const SCHEME_PRESETS = [
  { id: 'medical', name: 'Medical/Dental', label: '🩺 Medical (+1 / -0.25)', correct: 1.0, incorrect: -0.25, unmarked: 0, bonus: 1.0 },
  { id: 'engineering', name: 'Engineering/BUET', label: '⚙️ Engineering (+2 / -0.5)', correct: 2.0, incorrect: -0.50, unmarked: 0, bonus: 2.0 },
  { id: 'board', name: 'Board (HSC/SSC)', label: '🏛 Board Exam (+1 / 0)', correct: 1.0, incorrect: 0.0, unmarked: 0, bonus: 1.0 },
  { id: 'third', name: '1/3rd Penalty', label: '📊 1/3rd (+1 / -0.33)', correct: 1.0, incorrect: -0.33, unmarked: 0, bonus: 1.0 },
  { id: 'half', name: '1/2 Penalty', label: '⚠️ 1/2 (+1 / -0.50)', correct: 1.0, incorrect: -0.50, unmarked: 0, bonus: 1.0 },
];

interface EvaluationManagerProps {
  config: EvaluationConfig;
  template: Template | null;
  bubbles?: BubblePoint[];
  onUpdateConfig: (newConfig: EvaluationConfig) => void;
}

export function EvaluationManager({ 
  config, 
  template, 
  bubbles = [], 
  onUpdateConfig 
}: EvaluationManagerProps) {
  const [localConfig, setLocalConfig] = useState<EvaluationConfig>(config);
  const [activeSet, setActiveSet] = useState<string>('Set A');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [selectedRangeFilter, setSelectedRangeFilter] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Option labels format: 'ENGLISH' (A, B, C, D) vs 'BANGLA' (ক, খ, গ, ঘ)
  const [optionLanguage, setOptionLanguage] = useState<'ENGLISH' | 'BANGLA'>('ENGLISH');
  const [multiCorrectMode, setMultiCorrectMode] = useState<boolean>(false);
  const [manualQuestionCount, setManualQuestionCount] = useState<number>(50);

  // Modals state
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteInputText, setPasteInputText] = useState<string>('');
  const [rapidEntryIndex, setRapidEntryIndex] = useState<number | null>(null);

  // Scan Master OMR Modal state
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [scanTargetSet, setScanTargetSet] = useState<string>('Set A');
  const [isScanningOMR, setIsScanningOMR] = useState<boolean>(false);
  const [scannedDetectedAnswers, setScannedDetectedAnswers] = useState<Record<string, string>>({});
  const [scannedConfidence, setScannedConfidence] = useState<Record<string, number>>({});
  const [scannedFlags, setScannedFlags] = useState<string[]>([]);
  const [scannedSheetPreviewUrl, setScannedSheetPreviewUrl] = useState<string | null>(null);
  const [scannedDetectedSet, setScannedDetectedSet] = useState<string | null>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state whenever parent config changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Extract all questions defined across the template
  const availableQuestions: string[] = [];
  if (template) {
    for (const block of Object.values(template.fieldBlocks)) {
      if (block.fieldType?.startsWith('QTYPE_MCQ')) {
        for (const label of block.fieldLabels) {
          if (label.includes('..')) {
            const m = label.match(/([^.\d]*)(\d+)\.{2,3}(\d+)/);
            if (m) {
              const prefix = m[1] || '';
              const start = parseInt(m[2], 10);
              const end = parseInt(m[3], 10);
              for (let i = start; i <= end; i++) availableQuestions.push(`${prefix}${i}`);
            }
          } else {
            availableQuestions.push(label);
          }
        }
      }
    }
  }

  // Fallback: If template doesn't specify questions, construct from count
  let questionList = availableQuestions.length > 0 
    ? Array.from(new Set(availableQuestions))
    : Object.keys(localConfig.answerKey);

  if (questionList.length === 0) {
    questionList = Array.from({ length: manualQuestionCount }, (_, i) => `q${i + 1}`);
  }

  // Extract sections
  const detectedSections = Array.from(new Set(
    template ? Object.values(template.fieldBlocks).map(b => b.section || 'General') : ['General']
  ));

  // Options to display based on selected language
  const availableOptions = optionLanguage === 'BANGLA' 
    ? ['ক', 'খ', 'গ', 'ঘ'] 
    : ['A', 'B', 'C', 'D', 'E'];

  // Retrieve current active set's answers dictionary
  const getActiveSetAnswers = (): Record<string, string> => {
    if (localConfig.multiSetAnswerKeys && localConfig.multiSetAnswerKeys[activeSet]) {
      const setKeyObj = localConfig.multiSetAnswerKeys[activeSet];
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(setKeyObj)) {
        flat[k] = Array.isArray(v) ? v.join(',') : String(v);
      }
      return flat;
    }
    // Fallback for Set A
    if (activeSet === 'Set A') {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(localConfig.answerKey)) {
        flat[k] = Array.isArray(v) ? v.join(',') : String(v);
      }
      return flat;
    }
    return {};
  };

  const activeAnswers = getActiveSetAnswers();

  // Handle keyboard rapid entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (rapidEntryIndex === null || rapidEntryIndex < 0 || rapidEntryIndex >= questionList.length) return;
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
        e.preventDefault();
        const currentQ = questionList[rapidEntryIndex];
        handleAnswerChange(currentQ, key);
        // Advance to next question
        if (rapidEntryIndex < questionList.length - 1) {
          setRapidEntryIndex(rapidEntryIndex + 1);
        } else {
          setRapidEntryIndex(null);
          setStatusMessage('Rapid entry completed for all questions!');
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const currentQ = questionList[rapidEntryIndex];
        handleAnswerChange(currentQ, '');
      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        if (rapidEntryIndex < questionList.length - 1) setRapidEntryIndex(rapidEntryIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (rapidEntryIndex > 0) setRapidEntryIndex(rapidEntryIndex - 1);
      } else if (e.key === 'Escape') {
        setRapidEntryIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rapidEntryIndex, questionList, localConfig, activeSet]);

  // Update answer for a question in the active set
  const handleAnswerChange = (qKey: string, value: string) => {
    const currentSetAnswers = { ...getActiveSetAnswers() };
    
    if (value.trim() === '') {
      delete currentSetAnswers[qKey];
    } else {
      currentSetAnswers[qKey] = value.toUpperCase();
    }

    const updatedMultiSet = {
      ...(localConfig.multiSetAnswerKeys || {}),
      [activeSet]: currentSetAnswers,
    };

    // If active set is Set A, also keep default answerKey synchronized
    const updatedAnswerKey = activeSet === 'Set A' ? currentSetAnswers : localConfig.answerKey;

    const updatedConfig: EvaluationConfig = {
      ...localConfig,
      answerKey: updatedAnswerKey,
      multiSetAnswerKeys: updatedMultiSet,
    };

    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
  };

  // Toggle option selection (supports deselecting on click or multi-correct)
  const handleOptionClick = (qKey: string, opt: string) => {
    const current = activeAnswers[qKey] || '';
    
    if (multiCorrectMode) {
      const tokens = current.split(',').map(s => s.trim()).filter(Boolean);
      if (tokens.includes(opt)) {
        // Remove option
        const nextTokens = tokens.filter(t => t !== opt);
        handleAnswerChange(qKey, nextTokens.join(','));
      } else {
        // Add option
        const nextTokens = [...tokens, opt].sort();
        handleAnswerChange(qKey, nextTokens.join(','));
      }
    } else {
      // Single choice mode: clicking selected option deselects/clears it!
      if (current === opt) {
        handleAnswerChange(qKey, '');
      } else {
        handleAnswerChange(qKey, opt);
      }
    }
  };

  // Scheme formula change
  const handleSchemeChange = (schemeName: string, updates: Partial<MarkingScheme>) => {
    const current = localConfig.markingSchemes?.[schemeName] || { correct: 4, incorrect: -1, unmarked: 0, bonus: 4 };
    const updated = {
      ...localConfig,
      markingSchemes: {
        ...localConfig.markingSchemes,
        [schemeName]: {
          ...current,
          ...updates,
        },
      },
    };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  // Clone answers from Set A into current active set
  const handleCloneFromSetA = () => {
    const setAAnswers = localConfig.multiSetAnswerKeys?.['Set A'] || localConfig.answerKey || {};
    const cloned = { ...setAAnswers };
    
    const updatedMultiSet = {
      ...(localConfig.multiSetAnswerKeys || {}),
      [activeSet]: cloned,
    };

    const updated: EvaluationConfig = {
      ...localConfig,
      multiSetAnswerKeys: updatedMultiSet,
    };

    setLocalConfig(updated);
    onUpdateConfig(updated);
    setStatusMessage(`Cloned ${Object.keys(cloned).length} answers from Set A into ${activeSet}!`);
  };

  // Clear all answers for active set
  const handleClearActiveSetAnswers = () => {
    if (!window.confirm(`Are you sure you want to clear all answer keys for ${activeSet}?`)) return;

    const updatedMultiSet = {
      ...(localConfig.multiSetAnswerKeys || {}),
      [activeSet]: {},
    };

    const updated: EvaluationConfig = {
      ...localConfig,
      answerKey: activeSet === 'Set A' ? {} : localConfig.answerKey,
      multiSetAnswerKeys: updatedMultiSet,
    };

    setLocalConfig(updated);
    onUpdateConfig(updated);
    setStatusMessage(`Cleared all answers for ${activeSet}`);
  };

  const handleAutoFillAnswers = () => {
    const options = optionLanguage === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'];
    const newAnswers: Record<string, string> = {};
    questionList.forEach((q, idx) => {
      newAnswers[q] = options[idx % options.length];
    });

    const updatedMultiSet = {
      ...(localConfig.multiSetAnswerKeys || {}),
      [activeSet]: newAnswers,
    };

    const updated: EvaluationConfig = {
      ...localConfig,
      answerKey: activeSet === 'Set A' ? newAnswers : localConfig.answerKey,
      multiSetAnswerKeys: updatedMultiSet,
    };

    setLocalConfig(updated);
    onUpdateConfig(updated);
    setStatusMessage(`Autofilled ${questionList.length} answers cyclically for ${activeSet}`);
  };

  // Bulk paste parser
  const handleApplyPasteString = () => {
    if (!pasteInputText.trim()) return;
    const text = pasteInputText.trim();
    const newAnswers = { ...activeAnswers };
    let matchedCount = 0;

    // Check for numbered lines like "1: A" or "1. A" or "1 A"
    const lineRegex = /(?:q)?(\d+)[\s.:=\-)]+([A-Ea-eক-ঘ]+)/g;
    let lineMatch: RegExpExecArray | null;
    let foundNumbered = false;

    while ((lineMatch = lineRegex.exec(text)) !== null) {
      foundNumbered = true;
      const qNum = parseInt(lineMatch[1], 10);
      const ans = lineMatch[2].toUpperCase();
      const targetQ = questionList.find(q => q === `q${qNum}` || q === `${qNum}`);
      if (targetQ) {
        newAnswers[targetQ] = ans;
        matchedCount++;
      }
    }

    // If no numbered lines found, parse raw characters
    if (!foundNumbered) {
      const tokens = text.replace(/[^A-Ea-eক-ঘ]/g, '').toUpperCase().split('');
      tokens.forEach((char, idx) => {
        if (idx < questionList.length) {
          newAnswers[questionList[idx]] = char;
          matchedCount++;
        }
      });
    }

    const updatedMultiSet = {
      ...(localConfig.multiSetAnswerKeys || {}),
      [activeSet]: newAnswers,
    };

    const updated: EvaluationConfig = {
      ...localConfig,
      answerKey: activeSet === 'Set A' ? newAnswers : localConfig.answerKey,
      multiSetAnswerKeys: updatedMultiSet,
    };

    setLocalConfig(updated);
    onUpdateConfig(updated);
    setShowPasteModal(false);
    setPasteInputText('');
    setStatusMessage(`Populated ${matchedCount} answers from paste for ${activeSet}!`);
  };

  // Toggle bonus mark for a question
  const toggleBonusQuestion = (qKey: string) => {
    const bonuses = new Set(localConfig.bonusQuestions || []);
    if (bonuses.has(qKey)) bonuses.delete(qKey);
    else bonuses.add(qKey);

    const updated = {
      ...localConfig,
      bonusQuestions: Array.from(bonuses),
    };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const getQuestionSection = (qKey: string): string => {
    if (!template) return 'General';
    for (const [_, block] of Object.entries(template.fieldBlocks)) {
      if (block.fieldLabels?.some(l => l.includes(qKey) || l.includes('..'))) {
        return block.section || 'General';
      }
    }
    return 'General';
  };

  const filteredQuestions = questionList.filter((q, idx) => {
    if (selectedSectionFilter !== 'ALL' && getQuestionSection(q) !== selectedSectionFilter) {
      return false;
    }
    if (selectedRangeFilter === '1-25') return idx >= 0 && idx < 25;
    if (selectedRangeFilter === '26-50') return idx >= 25 && idx < 50;
    if (selectedRangeFilter === '51-75') return idx >= 50 && idx < 75;
    if (selectedRangeFilter === '76-100') return idx >= 75 && idx < 100;
    return true;
  });

  const defaultScheme = localConfig.markingSchemes?.['default'] || { correct: 1.0, incorrect: -0.25, unmarked: 0, bonus: 1.0 };
  const completedCount = Object.keys(activeAnswers).length;
  const completionPct = questionList.length > 0 ? Math.round((completedCount / questionList.length) * 100) : 0;

  const handleApplyPresetScheme = (preset: typeof SCHEME_PRESETS[0]) => {
    handleSchemeChange('default', {
      correct: preset.correct,
      incorrect: preset.incorrect,
      unmarked: preset.unmarked,
      bonus: preset.bonus,
    });
    setStatusMessage(`Applied ${preset.name} marking scheme (+${preset.correct} / ${preset.incorrect} penalty)`);
  };

  // =========================================================================
  // SCAN MASTER OMR SHEET AND EXTRACT ANSWERS ENGINE
  // =========================================================================

  const executeProcessMasterSheet = async (canvas: HTMLCanvasElement, filename: string) => {
    if (!template) {
      setStatusMessage('Please select or configure an OMR template first before scanning.');
      return;
    }

    setIsScanningOMR(true);
    setScannedFlags([]);

    try {
      // 1. Ensure bubbles array is available
      let activeBubbles = bubbles;
      if (!activeBubbles || activeBubbles.length === 0) {
        const parsed = parseTemplate(template);
        activeBubbles = parsed.bubbles;
      }

      // 2. Run OMR Computer Vision
      const scanRes = await processOMR(canvas, template, activeBubbles, undefined, filename);

      // 3. Extract question responses (e.g. q1..q50) and detected Set Code
      const detectedKeys: Record<string, string> = {};
      const confMap: Record<string, number> = {};

      for (const b of scanRes.bubbleDetections) {
        if (b.isMarked) {
          confMap[b.label] = b.confidence;
        }
      }

      for (const [label, vals] of Object.entries(scanRes.responses)) {
        if (vals && vals.length > 0) {
          detectedKeys[label] = vals.join(',');
        }
      }

      // Check for detected Set Code (e.g., Set: ['A'] or SetCode: ['ক'])
      const rawSet = scanRes.concatenatedResponses?.['Set'] 
        || scanRes.concatenatedResponses?.['SetCode'] 
        || scanRes.responses['Set']?.join('') 
        || scanRes.responses['SetCode']?.join('') 
        || null;

      if (rawSet) {
        setScannedDetectedSet(rawSet);
        const upper = rawSet.toUpperCase();
        if (['A', 'SET A', 'ক'].some(s => upper.includes(s))) {
          setScanTargetSet('Set A');
        } else if (['B', 'SET B', 'খ'].some(s => upper.includes(s))) {
          setScanTargetSet('Set B');
        } else if (['C', 'SET C', 'গ'].some(s => upper.includes(s))) {
          setScanTargetSet('Set C');
        } else if (['D', 'SET D', 'ঘ'].some(s => upper.includes(s))) {
          setScanTargetSet('Set D');
        }
      }

      setScannedDetectedAnswers(detectedKeys);
      setScannedConfidence(confMap);
      setScannedFlags(scanRes.flags || []);
      setScannedSheetPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
    } catch (err: any) {
      console.error('Scan master sheet error:', err);
      setScannedFlags([`Detection failed: ${err.message}`]);
    } finally {
      setIsScanningOMR(false);
    }
  };

  const handleScanMasterFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      try {
        setIsScanningOMR(true);
        const pages = await renderPdfToCanvases(file, { dpi: 150, pages: [1] });
        if (pages.length > 0) {
          executeProcessMasterSheet(pages[0].canvas, file.name);
        } else {
          setIsScanningOMR(false);
          alert('Could not render pages from PDF document.');
        }
      } catch (err: any) {
        setIsScanningOMR(false);
        alert(`Failed to parse PDF document: ${err.message}`);
      }
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        executeProcessMasterSheet(canvas, file.name);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSampleMaster = async (samplePath: string) => {
    try {
      setIsScanningOMR(true);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        executeProcessMasterSheet(canvas, samplePath.split('/').pop() || 'sample.jpg');
      };
      img.src = samplePath;
    } catch (err: any) {
      console.error('Failed to load sample master sheet:', err);
      setIsScanningOMR(false);
    }
  };

  const handleApplyScannedAnswersAsMasterKey = () => {
    if (Object.keys(scannedDetectedAnswers).length === 0) return;

    const updatedSetAnswers: Record<string, string> = { ...getActiveSetAnswers() };

    let count = 0;
    for (const [qKey, val] of Object.entries(scannedDetectedAnswers)) {
      // Filter out non-question keys like Roll or ID
      if (!qKey.toLowerCase().includes('roll') && !qKey.toLowerCase().includes('reg') && !qKey.toLowerCase().includes('sub')) {
        updatedSetAnswers[qKey] = val;
        count++;
      }
    }

    const updatedMultiSet = {
      ...(localConfig.multiSetAnswerKeys || {}),
      [scanTargetSet]: updatedSetAnswers,
    };

    const updatedConfig: EvaluationConfig = {
      ...localConfig,
      answerKey: scanTargetSet === 'Set A' ? updatedSetAnswers : localConfig.answerKey,
      multiSetAnswerKeys: updatedMultiSet,
    };

    setLocalConfig(updatedConfig);
    onUpdateConfig(updatedConfig);
    setActiveSet(scanTargetSet);
    setShowScanModal(false);
    setStatusMessage(`🎉 Successfully extracted and applied ${count} answers from scanned OMR sheet into ${scanTargetSet}!`);
  };

  return (
    <div className="evaluation-manager animate-fade-in">
      {/* Top Header Bar */}
      <div className="eval-header glass-panel">
        <div className="eval-title-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2>Answer Key & Scoring Scheme Engine</h2>
              <span className="keys-badge" style={{ background: completionPct === 100 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)', color: completionPct === 100 ? '#34d399' : '#fbbf24', border: '1px solid currentColor' }}>
                {activeSet}: {completedCount} / {questionList.length} Completed ({completionPct}%)
              </span>
            </div>
            <p className="subtitle">Configure official answer keys, auto-extract teacher master OMR sheets, and calibrate negative marking schemes</p>
          </div>
          <div className="eval-actions">
            {/* Camera Scan Master OMR Button */}
            <button 
              className="btn btn-primary" 
              style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 4px 14px rgba(20, 184, 166, 0.4)' }}
              onClick={() => {
                setScanTargetSet(activeSet);
                setShowScanModal(true);
              }}
              title="Scan a physical OMR sheet and automatically extract all bubble marks as the official answer key"
            >
              <Camera size={16} /> Scan Master OMR Sheet
            </button>

            <button className="btn btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => setShowPasteModal(true)}>
              <ClipboardPaste size={16} /> Bulk Paste
            </button>

            <button 
              className={`btn btn-outline ${rapidEntryIndex !== null ? 'btn-primary' : ''}`} 
              onClick={() => setRapidEntryIndex(rapidEntryIndex === null ? 0 : null)}
              title="Rapid keyboard entry mode (type answers directly using A, B, C, D)"
            >
              <Zap size={16} /> {rapidEntryIndex !== null ? 'Exit Rapid Entry' : 'Rapid Mode'}
            </button>

            <button className="btn btn-outline" onClick={handleAutoFillAnswers} title="Generate repeating A-D or demo pattern">
              <Sparkles size={16} /> Pattern Fill
            </button>

            <button className="btn btn-outline" onClick={handleClearActiveSetAnswers} title="Clear all answers for active set" style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}>
              <Trash2 size={16} /> Clear {activeSet}
            </button>
          </div>
        </div>

        {rapidEntryIndex !== null && (
          <div className="rapid-mode-banner animate-pulse">
            <Zap size={18} />
            <span>
              <strong>Rapid Keyboard Entry Active:</strong> Press keys <strong>[A] [B] [C] [D] [E]</strong> (or <strong>[Backspace]</strong> to clear) for <strong>{questionList[rapidEntryIndex]}</strong>. Press <strong>[↑ / ↓]</strong> to navigate, <strong>[Esc]</strong> to exit.
            </span>
          </div>
        )}

        {statusMessage && (
          <div className="studio-status-bar">
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      <div className="eval-grid-layout">
        {/* Left Column: Exam Rules & Sectional Schemes */}
        <div className="eval-settings-panel glass-panel">
          {/* Multi-Set Tabs */}
          <div className="set-tabs-header-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>SELECT EXAM QUESTION SET</label>
              <span style={{ fontSize: '11px', color: 'var(--primary)' }}>4 Sets Supported</span>
            </div>

            <div className="set-tabs-row">
              {['Set A', 'Set B', 'Set C', 'Set D'].map(setName => {
                const count = Object.keys(localConfig.multiSetAnswerKeys?.[setName] || (setName === 'Set A' ? localConfig.answerKey : {})).length;
                const isFull = count === questionList.length && count > 0;
                return (
                  <button 
                    key={setName}
                    className={`set-tab-btn ${activeSet === setName ? 'active' : ''}`}
                    onClick={() => setActiveSet(setName)}
                  >
                    <span>{setName}</span>
                    <span className={`set-count-chip ${isFull ? 'full' : ''}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {activeSet !== 'Set A' && (
              <button className="btn-clone-set" onClick={handleCloneFromSetA}>
                <Copy size={13} /> Copy answers from Set A into {activeSet}
              </button>
            )}
          </div>

          <div className="field-group">
            <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>Exam Title</label>
            <input 
              type="text" 
              value={localConfig.examName}
              onChange={(e) => {
                const updated = { ...localConfig, examName: e.target.value };
                setLocalConfig(updated);
                onUpdateConfig(updated);
              }}
              className="input-field"
              placeholder="e.g. Medical Admission Model Test 2026"
            />
          </div>

          {/* Quick Marking Scheme Presets */}
          <div className="scheme-presets-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Bookmark size={13} color="var(--primary)" /> STANDARD MARKING PRESETS
              </label>
            </div>
            <div className="preset-chips-grid">
              {SCHEME_PRESETS.map(preset => {
                const isMatch = defaultScheme.correct === preset.correct && defaultScheme.incorrect === preset.incorrect;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-chip-btn ${isMatch ? 'active' : ''}`}
                    onClick={() => handleApplyPresetScheme(preset)}
                    title={preset.name}
                  >
                    <span>{preset.label}</span>
                    {isMatch && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Mathematical Formula Card */}
          <div className="formula-live-card">
            <div className="formula-header">
              <span className="formula-title">Live Scoring Formula</span>
              <span className="formula-badge">DGHS / Board Compliant</span>
            </div>
            <div className="formula-equation">
              <span className="eq-part green">+({defaultScheme.correct.toFixed(2)} × Correct)</span>
              <span className="eq-operator">−</span>
              <span className="eq-part red">({Math.abs(defaultScheme.incorrect).toFixed(2)} × Wrong)</span>
              {defaultScheme.unmarked !== 0 && (
                <>
                  <span className="eq-operator">+</span>
                  <span className="eq-part muted">({defaultScheme.unmarked.toFixed(2)} × Blank)</span>
                </>
              )}
              <span className="eq-operator">=</span>
              <span className="eq-result">Score</span>
            </div>
            <div className="formula-stats-row">
              <div className="formula-stat">
                <span className="f-stat-label">Total Qs</span>
                <span className="f-stat-value">{questionList.length}</span>
              </div>
              <div className="formula-stat">
                <span className="f-stat-label">Max Score</span>
                <span className="f-stat-value">{(questionList.length * defaultScheme.correct).toFixed(1)} pts</span>
              </div>
              <div className="formula-stat">
                <span className="f-stat-label">Filled Key</span>
                <span className="f-stat-value" style={{ color: completionPct === 100 ? '#10b981' : '#f59e0b' }}>
                  {completedCount} / {questionList.length} ({completionPct}%)
                </span>
              </div>
            </div>
          </div>

          <div className="marking-scheme-box">
            <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
              CUSTOM VALUES & PENALTIES
            </label>
            <div className="field-row">
              <div className="field-group">
                <label>Correct (+)</label>
                <input 
                  type="number" 
                  step="0.25"
                  value={defaultScheme.correct}
                  onChange={(e) => handleSchemeChange('default', { correct: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div className="field-group">
                <label>Negative Penalty (-)</label>
                <input 
                  type="number" 
                  step="0.25"
                  value={defaultScheme.incorrect}
                  onChange={(e) => handleSchemeChange('default', { incorrect: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div className="field-group">
                <label>Unmarked Score</label>
                <input 
                  type="number" 
                  step="0.25"
                  value={defaultScheme.unmarked}
                  onChange={(e) => handleSchemeChange('default', { unmarked: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div className="field-group">
                <label>Bonus Mark</label>
                <input 
                  type="number" 
                  step="0.25"
                  value={defaultScheme.bonus ?? defaultScheme.correct}
                  onChange={(e) => handleSchemeChange('default', { bonus: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>Choices Format</label>
              <select 
                value={optionLanguage} 
                onChange={(e) => setOptionLanguage(e.target.value as any)}
                className="input-field"
              >
                <option value="ENGLISH">A, B, C, D (English)</option>
                <option value="BANGLA">ক, খ, গ, ঘ (বাংলা)</option>
              </select>
            </div>

            <div className="field-group">
              <label>Questions</label>
              <select 
                value={manualQuestionCount} 
                onChange={(e) => setManualQuestionCount(parseInt(e.target.value, 10))}
                className="input-field"
              >
                <option value={25}>25 Qs</option>
                <option value={30}>30 Qs</option>
                <option value={50}>50 Qs</option>
                <option value={60}>60 Qs</option>
                <option value={75}>75 Qs</option>
                <option value={100}>100 Qs</option>
              </select>
            </div>

            <div className="field-group">
              <label>Answer Mode</label>
              <button 
                type="button"
                className={`btn-toggle-mini ${multiCorrectMode ? 'active' : ''}`}
                onClick={() => setMultiCorrectMode(!multiCorrectMode)}
                title="Toggle single option vs multi-option correct"
              >
                {multiCorrectMode ? 'Multi-Correct' : 'Single Option'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Question Answer Keys Matrix */}
        <div className="eval-keys-panel glass-panel">
          <div className="keys-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Master Answer Key ({activeSet})</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Click bubble to set / clear • Tap star for Bonus marks
                </span>
              </div>
              <div className="keys-badge">
                {completedCount} / {questionList.length} Answered
              </div>
            </div>

            {/* Quick Range Jump Bar */}
            <div className="range-filter-pills">
              <button
                type="button"
                className={`range-pill ${selectedRangeFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedRangeFilter('ALL')}
              >
                All ({questionList.length})
              </button>
              {questionList.length > 25 && (
                <>
                  <button
                    type="button"
                    className={`range-pill ${selectedRangeFilter === '1-25' ? 'active' : ''}`}
                    onClick={() => setSelectedRangeFilter('1-25')}
                  >
                    Q 01–25
                  </button>
                  <button
                    type="button"
                    className={`range-pill ${selectedRangeFilter === '26-50' ? 'active' : ''}`}
                    onClick={() => setSelectedRangeFilter('26-50')}
                  >
                    Q 26–50
                  </button>
                </>
              )}
              {questionList.length > 50 && (
                <>
                  <button
                    type="button"
                    className={`range-pill ${selectedRangeFilter === '51-75' ? 'active' : ''}`}
                    onClick={() => setSelectedRangeFilter('51-75')}
                  >
                    Q 51–75
                  </button>
                  <button
                    type="button"
                    className={`range-pill ${selectedRangeFilter === '76-100' ? 'active' : ''}`}
                    onClick={() => setSelectedRangeFilter('76-100')}
                  >
                    Q 76–100
                  </button>
                </>
              )}
            </div>
          </div>

          {detectedSections.length > 1 && (
            <div className="section-filter-pills" style={{ marginTop: '-4px' }}>
              <button 
                className={`sec-pill ${selectedSectionFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedSectionFilter('ALL')}
              >
                All Sections
              </button>
              {detectedSections.map(sec => (
                <button 
                  key={sec}
                  className={`sec-pill ${selectedSectionFilter === sec ? 'active' : ''}`}
                  onClick={() => setSelectedSectionFilter(sec)}
                >
                  {sec}
                </button>
              ))}
            </div>
          )}

          <div className="answer-keys-matrix">
            {filteredQuestions.map((qKey, index) => {
              const currentAns = activeAnswers[qKey] || '';
              const isBonus = localConfig.bonusQuestions?.includes(qKey);
              const isFocused = rapidEntryIndex === index;
              const currentTokens = currentAns.split(',').map(s => s.trim()).filter(Boolean);

              // Format question label e.g. "q1" -> "Q 01", "q42" -> "Q 42"
              const qNumMatch = qKey.match(/\d+/);
              const formattedLabel = qNumMatch ? `Q ${qNumMatch[0].padStart(2, '0')}` : qKey.toUpperCase();

              return (
                <div 
                  key={qKey} 
                  className={`answer-key-row ${isBonus ? 'is-bonus' : ''} ${isFocused ? 'is-rapid-focus' : ''}`}
                  onClick={() => setRapidEntryIndex(index)}
                >
                  <div className="q-label-wrapper">
                    <span className="q-label">{formattedLabel}</span>
                    {isBonus && <span className="bonus-mini-indicator">BONUS</span>}
                  </div>
                  
                  <div className="option-btn-group">
                    {availableOptions.map(opt => {
                      const isSelected = currentTokens.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`opt-btn ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOptionClick(qKey, opt);
                          }}
                          title={`Click to set/unset ${opt}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  <div className="q-row-actions">
                    {/* Bonus Star Toggle Button */}
                    <button 
                      type="button"
                      className={`btn-bonus-star ${isBonus ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBonusQuestion(qKey);
                      }}
                      title={isBonus ? 'Bonus mark awarded to everyone' : 'Make this a bonus question'}
                    >
                      <Star size={13} fill={isBonus ? '#000' : 'none'} />
                      <span>{isBonus ? 'Bonus' : ''}</span>
                    </button>

                    {/* Quick Clear Answer Button */}
                    {currentAns && (
                      <button 
                        type="button"
                        className="btn-clear-single-ans"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnswerChange(qKey, '');
                        }}
                        title="Clear answer for this question"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCAN MASTER OMR SHEET MODAL
          ========================================================================= */}
      {showScanModal && (
        <div className="modal-backdrop animate-fade-in">
          <div className="scan-master-modal glass-panel">
            <div className="paste-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Camera size={26} color="var(--accent)" />
                <div>
                  <h3>Scan Master OMR Sheet & Extract Answers</h3>
                  <p className="subtitle">Upload a filled teacher answer key sheet or pick a sample to auto-detect answers using OpenCV.js</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowScanModal(false)}><X size={20} /></button>
            </div>

            <div className="scan-master-modal-body">
              {/* Target Set Selector */}
              <div className="scan-target-bar">
                <span className="scan-target-label">Target Answer Key Set:</span>
                <div className="set-chips-group">
                  {['Set A', 'Set B', 'Set C', 'Set D'].map(setName => (
                    <button
                      key={setName}
                      className={`set-chip-btn ${scanTargetSet === setName ? 'active' : ''}`}
                      onClick={() => setScanTargetSet(setName)}
                    >
                      {setName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Zone */}
              <div className="scan-dropzone">
                <input 
                  type="file" 
                  ref={scanFileInputRef} 
                  accept="image/*,.pdf" 
                  hidden 
                  onChange={handleScanMasterFileUpload} 
                />
                
                <div className="dropzone-content" onClick={() => scanFileInputRef.current?.click()}>
                  <Upload size={32} color="var(--primary)" />
                  <h4>Click to Browse or Drop Master OMR Sheet Image</h4>
                  <p>Supports scanned photo, JPG, PNG, or high-res document scan</p>
                </div>

                <div className="sample-scans-quickbar">
                  <span className="quickbar-label">Or test with demo master scans:</span>
                  <button 
                    className="btn btn-outline sm" 
                    onClick={() => handleSelectSampleMaster('/samples/sample_roll_01.jpg')}
                  >
                    Sample Master Sheet 1
                  </button>
                  <button 
                    className="btn btn-outline sm" 
                    onClick={() => handleSelectSampleMaster('/samples/sample_roll_02.jpg')}
                  >
                    Sample Master Sheet 2
                  </button>
                  <button 
                    className="btn btn-outline sm" 
                    onClick={() => handleSelectSampleMaster('/samples/sample_roll_03.jpg')}
                  >
                    Sample Master Sheet 3
                  </button>
                </div>
              </div>

              {/* Scanning in progress */}
              {isScanningOMR && (
                <div className="scanning-loading-banner animate-pulse">
                  <div className="spinner"></div>
                  <span>Running Optical Mark Recognition on Master Sheet... (OpenCV.js WASM)</span>
                </div>
              )}

              {/* Flags or Errors */}
              {scannedFlags.length > 0 && (
                <div className="scan-flags-box">
                  {scannedFlags.map((flag, idx) => (
                    <div key={idx} className="flag-item">
                      <AlertTriangle size={14} color="#f59e0b" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Detected Results Review Table */}
              {Object.keys(scannedDetectedAnswers).length > 0 && (
                <div className="scanned-results-container">
                  <div className="results-summary-row">
                    <div className="summary-left">
                      <CheckCircle2 size={18} color="#10b981" />
                      <strong>Detected {Object.keys(scannedDetectedAnswers).length} Answers</strong>
                      {scannedDetectedSet && (
                        <span className="badge-detected-set">Detected Set: {scannedDetectedSet}</span>
                      )}
                    </div>
                    {scannedSheetPreviewUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img 
                          src={scannedSheetPreviewUrl} 
                          alt="Master Sheet" 
                          style={{ height: '36px', borderRadius: '4px', border: '1px solid var(--glass-border)' }} 
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Perspective rectified</span>
                      </div>
                    )}
                  </div>

                  <div className="detected-answers-scroller">
                    {Object.entries(scannedDetectedAnswers).map(([qKey, detectedAns]) => {
                      const conf = scannedConfidence[qKey] || 0.95;
                      return (
                        <div key={qKey} className="detected-q-chip">
                          <span className="chip-q">{qKey}:</span>
                          <span className="chip-ans">{detectedAns}</span>
                          <span className={`chip-conf ${conf >= 0.85 ? 'high' : 'med'}`}>
                            {Math.round(conf * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="paste-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowScanModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                disabled={Object.keys(scannedDetectedAnswers).length === 0}
                onClick={handleApplyScannedAnswersAsMasterKey}
              >
                <CheckCircle2 size={16} /> Apply {Object.keys(scannedDetectedAnswers).length} Answers to {scanTargetSet}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Paste Modal */}
      {showPasteModal && (
        <div className="modal-backdrop animate-fade-in">
          <div className="paste-modal glass-panel">
            <div className="paste-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ClipboardPaste size={24} color="var(--primary)" />
                <div>
                  <h3>Bulk Paste Answer Key String for {activeSet}</h3>
                  <p className="subtitle">Paste raw letters, space-separated values, or numbered questions</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowPasteModal(false)}><X size={20} /></button>
            </div>

            <div className="paste-modal-body">
              <textarea 
                className="paste-textarea"
                rows={8}
                placeholder="Paste answers here in any format:&#10;&#10;Example 1: ABCDA BCDAB CDABC&#10;Example 2: 1. A, 2. C, 3. B, 4. D&#10;Example 3: ক খ গ ঘ ক খ গ ঘ"
                value={pasteInputText}
                onChange={(e) => setPasteInputText(e.target.value)}
              />
              <div className="paste-hint">
                <span>The smart parser automatically extracts option letters (A-E or ক-ঘ) and maps them to questions.</span>
              </div>
            </div>

            <div className="paste-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPasteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApplyPasteString}>
                <CheckCircle2 size={16} /> Parse & Apply to {activeSet}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
