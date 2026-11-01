import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle, 
  Sliders, 
  Grid,
  FileCode,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Wand2,
  AlertTriangle,
  Move,
  Layers,
  Sparkles
} from 'lucide-react';
import type { Template, FieldBlock, BubblePoint } from '../types/omr';
import { parseTemplate, serializeTemplate } from '../core/templateParser';

interface TemplateStudioProps {
  initialTemplate?: Template | null;
  onApplyTemplate: (template: Template) => void;
}

export function TemplateStudio({ initialTemplate, onApplyTemplate }: TemplateStudioProps) {
  const [template, setTemplate] = useState<Template>(() => {
    if (initialTemplate) return JSON.parse(JSON.stringify(initialTemplate));
    return {
      pageDimensions: [1846, 1500],
      bubbleDimensions: [40, 40],
      preProcessors: [{ name: 'CropOnMarkers' }],
      fieldBlocks: {
        Section1: {
          origin: [168, 804],
          bubblesGap: 51,
          labelsGap: 43,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: ['q1..15'],
          section: 'Section 1',
        },
      },
    };
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<Template[]>([template]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [activeBlockKey, setActiveBlockKey] = useState<string>('Section1');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(0.55);
  const [isClickSettingOrigin, setIsClickSettingOrigin] = useState<boolean>(false);
  const [isDraggingOrigin, setIsDraggingOrigin] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showWizardModal, setShowWizardModal] = useState<boolean>(false);

  // Wizard state for quickly creating standard question blocks
  const [wizardType, setWizardType] = useState<'MCQ_SECTION' | 'ROLL_NUMBER' | 'SET_CODE'>('MCQ_SECTION');
  const [wizardSectionName, setWizardSectionName] = useState<string>('Physics');
  const [wizardStartQ, setWizardStartQ] = useState<number>(1);
  const [wizardEndQ, setWizardEndQ] = useState<number>(25);
  const [wizardNumColumns, setWizardNumColumns] = useState<number>(1);
  const [wizardOptionCount, setWizardOptionCount] = useState<4 | 5>(4);
  const [wizardRollDigits, setWizardRollDigits] = useState<number>(6);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Push new state to history stack
  const pushHistory = (newTemplate: Template) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(JSON.parse(JSON.stringify(newTemplate)));
    if (updated.length > 25) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setTemplate(JSON.parse(JSON.stringify(history[newIdx])));
      setStatusMessage('Undo applied');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setTemplate(JSON.parse(JSON.stringify(history[newIdx])));
      setStatusMessage('Redo applied');
    }
  };

  // Parse template & detect validation errors
  const { parsedData, validationErrors } = (() => {
    const errors: string[] = [];
    try {
      const res = parseTemplate(template);
      const [w, h] = template.pageDimensions;

      // Check for out-of-bounds bubbles
      res.bubbles.forEach(b => {
        if (b.x < 0 || b.y < 0 || b.x + template.bubbleDimensions[0] > w || b.y + template.bubbleDimensions[1] > h) {
          errors.push(`Bubble ${b.label}(${b.value}) is placed outside document boundaries.`);
        }
      });

      // Check for overlapping bubbles
      const coordMap = new Map<string, string>();
      res.bubbles.forEach(b => {
        const key = `${Math.round(b.x / 10)}_${Math.round(b.y / 10)}`;
        if (coordMap.has(key)) {
          errors.push(`Overlap detected between ${b.label} and ${coordMap.get(key)}.`);
        } else {
          coordMap.set(key, b.label);
        }
      });

      return { parsedData: res, validationErrors: Array.from(new Set(errors)) };
    } catch (err: any) {
      return { parsedData: null, validationErrors: [err.message] };
    }
  })();

  // Render document canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [w, h] = template.pageDimensions;
    canvas.width = w * zoom;
    canvas.height = h * zoom;

    // Draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      // Paper texture simulation
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40 * zoom;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Render Corner Markers Guides (TL, TR, BL, BR)
    const markerSize = 36 * zoom;
    const margin = 24 * zoom;
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.8)';
    ctx.lineWidth = 2;
    // TL
    ctx.strokeRect(margin, margin, markerSize, markerSize);
    // TR
    ctx.strokeRect(canvas.width - margin - markerSize, margin, markerSize, markerSize);
    // BL
    ctx.strokeRect(margin, canvas.height - margin - markerSize, markerSize, markerSize);
    // BR
    ctx.strokeRect(canvas.width - margin - markerSize, canvas.height - margin - markerSize, markerSize, markerSize);

    // Render Bubbles
    if (parsedData) {
      const [bw, bh] = template.bubbleDimensions;
      const scaledBw = bw * zoom;
      const scaledBh = bh * zoom;

      parsedData.bubbles.forEach((b: BubblePoint) => {
        const bx = b.x * zoom;
        const by = b.y * zoom;
        const isCurrentBlock = template.fieldBlocks[activeBlockKey]?.fieldLabels.some(l => 
          b.label.startsWith(l.replace(/\d+\.{2,3}\d+/, ''))
        );

        ctx.fillStyle = isCurrentBlock ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.2)';
        ctx.strokeStyle = isCurrentBlock ? '#c084fc' : 'rgba(147, 197, 253, 0.6)';
        ctx.lineWidth = isCurrentBlock ? 2 : 1;

        ctx.beginPath();
        ctx.arc(bx + scaledBw / 2, by + scaledBh / 2, scaledBw / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        if (zoom >= 0.45) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.max(7, Math.round(11 * zoom))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.value, bx + scaledBw / 2, by + scaledBh / 2);
        }
      });
    }

    // Render active block origin handle with glow
    const activeBlock = template.fieldBlocks[activeBlockKey];
    if (activeBlock) {
      const ox = activeBlock.origin[0] * zoom;
      const oy = activeBlock.origin[1] * zoom;

      // Glow circle
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.beginPath();
      ctx.arc(ox, oy, 14, 0, 2 * Math.PI);
      ctx.fill();

      // Origin ring
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ox, oy, 8, 0, 2 * Math.PI);
      ctx.stroke();

      // Label flag
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${activeBlockKey} (Origin: ${activeBlock.origin[0]}, ${activeBlock.origin[1]})`, ox + 14, oy - 6);
    }
  }, [template, backgroundImage, zoom, activeBlockKey, parsedData]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;
    const [pageW, pageH] = template.pageDimensions;

    if (isClickSettingOrigin) {
      const clampedX = Math.max(0, Math.min(pageW - 1, Math.round(clickX)));
      const clampedY = Math.max(0, Math.min(pageH - 1, Math.round(clickY)));
      updateFieldBlock(activeBlockKey, { origin: [clampedX, clampedY] });
      setIsClickSettingOrigin(false);
      setStatusMessage(`Origin for ${activeBlockKey} set to [${clampedX}, ${clampedY}]`);
      return;
    }

    // Check if clicking near active origin to start dragging
    const activeBlock = template.fieldBlocks[activeBlockKey];
    if (activeBlock) {
      const dist = Math.hypot(clickX - activeBlock.origin[0], clickY - activeBlock.origin[1]);
      if (dist <= 25 / zoom) {
        setIsDraggingOrigin(true);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingOrigin || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;
    const [pageW, pageH] = template.pageDimensions;

    const clampedX = Math.max(0, Math.min(pageW - 1, Math.round(clickX)));
    const clampedY = Math.max(0, Math.min(pageH - 1, Math.round(clickY)));

    updateFieldBlock(activeBlockKey, { origin: [clampedX, clampedY] }, false);
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingOrigin) {
      setIsDraggingOrigin(false);
      pushHistory(template);
      setStatusMessage(`Updated origin for ${activeBlockKey}`);
    }
  };

  const handleNudgeOrigin = (dx: number, dy: number) => {
    const active = template.fieldBlocks[activeBlockKey];
    if (!active) return;
    const [pageW, pageH] = template.pageDimensions;
    const newX = Math.max(0, Math.min(pageW - 1, active.origin[0] + dx));
    const newY = Math.max(0, Math.min(pageH - 1, active.origin[1] + dy));
    updateFieldBlock(activeBlockKey, { origin: [newX, newY] });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      setBackgroundImage(img);
      const updated = {
        ...template,
        pageDimensions: [img.width, img.height] as [number, number],
      };
      setTemplate(updated);
      pushHistory(updated);
      setStatusMessage(`Loaded reference background (${img.width}x${img.height}px)`);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleTemplateUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const { template: parsed } = parseTemplate(json);
        setTemplate(parsed);
        pushHistory(parsed);
        const firstKey = Object.keys(parsed.fieldBlocks)[0] || '';
        setActiveBlockKey(firstKey);
        setStatusMessage('Template JSON imported and validated!');
      } catch (err: any) {
        setStatusMessage('Error parsing template: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExportJSON = () => {
    const jsonStr = serializeTemplate(template);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.json';
    a.click();
    setStatusMessage('Exported template.json (OMRChecker compatible)');
  };

  const handleApplyToWorkspace = () => {
    try {
      const { template: validated } = parseTemplate(template);
      onApplyTemplate(validated);
      setStatusMessage('Template applied to active scanning workspace!');
    } catch (err: any) {
      setStatusMessage('Cannot apply template: ' + err.message);
    }
  };

  const addFieldBlock = () => {
    const count = Object.keys(template.fieldBlocks).length + 1;
    const newKey = `Section_${count}`;
    const updated = {
      ...template,
      fieldBlocks: {
        ...template.fieldBlocks,
        [newKey]: {
          origin: [200, 200 + count * 60] as [number, number],
          bubblesGap: 48,
          labelsGap: 42,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: [`q${count * 15 - 14}..${count * 15}`],
          section: `Section ${count}`,
        },
      },
    };
    setTemplate(updated);
    pushHistory(updated);
    setActiveBlockKey(newKey);
  };

  const deleteFieldBlock = (key: string) => {
    if (Object.keys(template.fieldBlocks).length <= 1) {
      setStatusMessage('At least one field block is required');
      return;
    }
    const updatedBlocks = { ...template.fieldBlocks };
    delete updatedBlocks[key];
    const updated = { ...template, fieldBlocks: updatedBlocks };
    setTemplate(updated);
    pushHistory(updated);
    setActiveBlockKey(Object.keys(updatedBlocks)[0]);
  };

  const updateFieldBlock = (key: string, updates: Partial<FieldBlock>, recordHistory: boolean = true) => {
    const updated = {
      ...template,
      fieldBlocks: {
        ...template.fieldBlocks,
        [key]: {
          ...template.fieldBlocks[key],
          ...updates,
        },
      },
    };
    setTemplate(updated);
    if (recordHistory) pushHistory(updated);
  };

  // Execute Generator Wizard
  const handleApplyWizard = () => {
    const updatedBlocks = { ...template.fieldBlocks };
    
    if (wizardType === 'MCQ_SECTION') {
      const qPerCol = Math.ceil((wizardEndQ - wizardStartQ + 1) / wizardNumColumns);
      for (let c = 0; c < wizardNumColumns; c++) {
        const start = wizardStartQ + c * qPerCol;
        const end = Math.min(wizardEndQ, start + qPerCol - 1);
        if (start > wizardEndQ) break;

        const blockName = wizardNumColumns === 1 
          ? wizardSectionName.replace(/\s+/g, '_')
          : `${wizardSectionName.replace(/\s+/g, '_')}_Col${c + 1}`;

        updatedBlocks[blockName] = {
          origin: [160 + c * 420, 800] as [number, number],
          bubblesGap: 48,
          labelsGap: 42,
          fieldType: wizardOptionCount === 5 ? 'QTYPE_MCQ5' : 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: [`q${start}..${end}`],
          section: wizardSectionName,
        };
      }
    } else if (wizardType === 'ROLL_NUMBER') {
      updatedBlocks['RollNumber'] = {
        origin: [240, 280] as [number, number],
        bubblesGap: 46,
        labelsGap: 56,
        fieldType: 'QTYPE_INT',
        direction: 'vertical',
        fieldLabels: [`roll1..${wizardRollDigits}`],
        section: 'Candidate Identification',
      };
    } else if (wizardType === 'SET_CODE') {
      updatedBlocks['SetCode'] = {
        origin: [680, 280] as [number, number],
        bubblesGap: 46,
        labelsGap: 0,
        bubbleValues: ['A', 'B', 'C', 'D'],
        direction: 'horizontal',
        fieldLabels: ['Set'],
        section: 'Exam Version',
      };
    }

    const updated = { ...template, fieldBlocks: updatedBlocks };
    setTemplate(updated);
    pushHistory(updated);
    setShowWizardModal(false);
    setStatusMessage(`Wizard generated blocks for ${wizardSectionName || wizardType}!`);
  };

  const activeBlock = template.fieldBlocks[activeBlockKey];

  return (
    <div className="template-studio animate-fade-in">
      {/* Studio Header */}
      <div className="studio-header glass-panel">
        <div className="studio-title-row">
          <div>
            <h2>Visual Template Designer Studio</h2>
            <p className="subtitle">Calibrate question grids, fiducial markers, and roll numbers with pixel precision</p>
          </div>
          <div className="studio-actions">
            <button className="btn btn-outline" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo">
              <Undo2 size={16} /> Undo
            </button>
            <button className="btn btn-outline" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo">
              <Redo2 size={16} /> Redo
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => setShowWizardModal(true)}>
              <Wand2 size={16} /> Quick Generator Wizard
            </button>
            <label className="btn btn-outline">
              <Upload size={16} />
              Load Blank Sheet
              <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
            </label>
            <label className="btn btn-outline">
              <FileCode size={16} />
              Import JSON
              <input type="file" accept=".json" hidden onChange={handleTemplateUpload} />
            </label>
            <button className="btn btn-outline" onClick={handleExportJSON}>
              <Download size={16} />
              Export template.json
            </button>
            <button className="btn btn-primary" onClick={handleApplyToWorkspace}>
              <CheckCircle size={16} />
              Apply to Workspace
            </button>
          </div>
        </div>

        {/* Validation Bar */}
        <div className="validation-status-bar">
          {validationErrors.length === 0 ? (
            <div className="validation-pill valid">
              <CheckCircle size={16} />
              <span>{parsedData?.bubbles.length || 0} Bubbles Validated &bull; Zero Collisions</span>
            </div>
          ) : (
            <div className="validation-pill invalid">
              <AlertTriangle size={16} />
              <span>{validationErrors.length} Issue(s) detected: {validationErrors[0]}</span>
            </div>
          )}
          {statusMessage && <span className="status-note">{statusMessage}</span>}
        </div>
      </div>

      <div className="studio-layout">
        {/* Left Sidebar: Block Configuration */}
        <div className="studio-sidebar glass-panel">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <h3>Field Blocks</h3>
              <button className="btn btn-sm btn-outline" onClick={addFieldBlock}>
                <Plus size={16} /> Add Block
              </button>
            </div>

            <div className="block-tabs">
              {Object.keys(template.fieldBlocks).map(key => (
                <button
                  key={key}
                  className={`block-tab-btn ${activeBlockKey === key ? 'active' : ''}`}
                  onClick={() => setActiveBlockKey(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {activeBlock && (
            <div className="block-editor">
              <div className="field-group">
                <label>Block Identifier</label>
                <input 
                  type="text" 
                  value={activeBlockKey}
                  onChange={(e) => {
                    const newKey = e.target.value.trim();
                    if (!newKey || newKey === activeBlockKey) return;
                    const updated = { ...template.fieldBlocks };
                    updated[newKey] = updated[activeBlockKey];
                    delete updated[activeBlockKey];
                    const next = { ...template, fieldBlocks: updated };
                    setTemplate(next);
                    pushHistory(next);
                    setActiveBlockKey(newKey);
                  }}
                  className="input-field"
                />
              </div>

              <div className="field-group">
                <label>Section Assignment</label>
                <input 
                  type="text" 
                  value={activeBlock.section || ''}
                  onChange={(e) => updateFieldBlock(activeBlockKey, { section: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Physics, Mathematics, Roll Number"
                />
              </div>

              <div className="field-group">
                <label>Question Type / Preset</label>
                <select 
                  value={activeBlock.fieldType || 'QTYPE_MCQ4'}
                  onChange={(e) => updateFieldBlock(activeBlockKey, { fieldType: e.target.value })}
                  className="input-field"
                >
                  <option value="QTYPE_MCQ4">4-Option MCQ (A, B, C, D)</option>
                  <option value="QTYPE_MCQ5">5-Option MCQ (A, B, C, D, E)</option>
                  <option value="QTYPE_INT">Integer / Roll Grid (0 to 9)</option>
                  <option value="QTYPE_INT_FROM_1">Integer Grid (1 to 0)</option>
                  <option value="QTYPE_MCQ4_RTL">MCQ 4 RTL (D, C, B, A)</option>
                  <option value="QTYPE_MCQ5_RTL">MCQ 5 RTL (E, D, C, B, A)</option>
                </select>
              </div>

              <div className="field-group">
                <label>Field Labels (Range: q1..25 or roll1..6)</label>
                <input 
                  type="text" 
                  value={activeBlock.fieldLabels?.join(', ') || ''}
                  onChange={(e) => updateFieldBlock(activeBlockKey, { fieldLabels: e.target.value.split(',').map(s => s.trim()) })}
                  className="input-field"
                />
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label>Origin X (px)</label>
                  <input 
                    type="number" 
                    value={activeBlock.origin[0]}
                    onChange={(e) => updateFieldBlock(activeBlockKey, { origin: [parseInt(e.target.value) || 0, activeBlock.origin[1]] })}
                    className="input-field"
                  />
                </div>
                <div className="field-group">
                  <label>Origin Y (px)</label>
                  <input 
                    type="number" 
                    value={activeBlock.origin[1]}
                    onChange={(e) => updateFieldBlock(activeBlockKey, { origin: [activeBlock.origin[0], parseInt(e.target.value) || 0] })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Nudge Buttons */}
              <div className="nudge-controls">
                <span className="nudge-label"><Move size={14} /> Micro-Nudge:</span>
                <button type="button" className="btn btn-xs btn-outline" onClick={() => handleNudgeOrigin(-1, 0)}>← 1px</button>
                <button type="button" className="btn btn-xs btn-outline" onClick={() => handleNudgeOrigin(1, 0)}>→ 1px</button>
                <button type="button" className="btn btn-xs btn-outline" onClick={() => handleNudgeOrigin(0, -1)}>↑ 1px</button>
                <button type="button" className="btn btn-xs btn-outline" onClick={() => handleNudgeOrigin(0, 1)}>↓ 1px</button>
                <button type="button" className="btn btn-xs btn-outline" onClick={() => handleNudgeOrigin(0, 10)}>↓ 10px</button>
              </div>

              <button 
                className={`btn btn-sm ${isClickSettingOrigin ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', marginBottom: '1rem' }}
                onClick={() => setIsClickSettingOrigin(!isClickSettingOrigin)}
              >
                <Sliders size={16} />
                {isClickSettingOrigin ? 'Click anywhere on canvas...' : 'Pick Origin on Canvas'}
              </button>

              <div className="field-row">
                <div className="field-group">
                  <label>Bubbles Gap: {activeBlock.bubblesGap}px</label>
                  <input 
                    type="range" 
                    min="15" 
                    max="100" 
                    value={activeBlock.bubblesGap}
                    onChange={(e) => updateFieldBlock(activeBlockKey, { bubblesGap: parseInt(e.target.value) })}
                  />
                </div>
                <div className="field-group">
                  <label>Labels Gap: {activeBlock.labelsGap}px</label>
                  <input 
                    type="range" 
                    min="15" 
                    max="100" 
                    value={activeBlock.labelsGap}
                    onChange={(e) => updateFieldBlock(activeBlockKey, { labelsGap: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Layout Direction</label>
                <select 
                  value={activeBlock.direction || 'horizontal'}
                  onChange={(e) => updateFieldBlock(activeBlockKey, { direction: e.target.value as any })}
                  className="input-field"
                >
                  <option value="horizontal">Horizontal (MCQs stacked vertically)</option>
                  <option value="vertical">Vertical (Roll Number / Column format)</option>
                </select>
              </div>

              <button 
                className="btn btn-outline" 
                style={{ color: 'var(--danger)', width: '100%', marginTop: '0.75rem' }}
                onClick={() => deleteFieldBlock(activeBlockKey)}
              >
                <Trash2 size={16} /> Delete Block
              </button>
            </div>
          )}

          <div className="sidebar-footer">
            <div className="stat-pill">
              <Grid size={16} />
              <span>{parsedData?.bubbles.length || 0} Bubbles</span>
            </div>
            <div className="stat-pill">
              <Maximize2 size={16} />
              <span>{template.pageDimensions[0]}x{template.pageDimensions[1]}px</span>
            </div>
          </div>
        </div>

        {/* Right Canvas Area */}
        <div className="studio-canvas-container glass-panel">
          <div className="canvas-toolbar">
            <div className="zoom-controls">
              <button className="btn-icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} title="Zoom Out">
                <ZoomOut size={16} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button className="btn-icon" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} title="Zoom In">
                <ZoomIn size={16} />
              </button>
              <button className="btn-icon" onClick={() => setZoom(0.55)} title="Reset Zoom">
                <Maximize2 size={16} />
              </button>
            </div>

            <div className="canvas-hints">
              {isClickSettingOrigin ? (
                <span className="origin-hint animate-pulse">Click anywhere to place origin</span>
              ) : (
                <span className="canvas-sub-hint">Tip: Drag green origin circle directly on canvas</span>
              )}
            </div>
          </div>

          <div className="canvas-scroll-wrapper">
            <canvas 
              ref={canvasRef} 
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`studio-canvas ${isClickSettingOrigin ? 'cursor-crosshair' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Quick Generator Wizard Modal */}
      {showWizardModal && (
        <div className="modal-backdrop animate-fade-in">
          <div className="wizard-modal glass-panel">
            <div className="wizard-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Wand2 size={24} color="var(--primary)" />
                <div>
                  <h3>Quick Template Generator Wizard</h3>
                  <p className="subtitle">Instantly configure multi-column sections or student ID grids</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowWizardModal(false)}>✕</button>
            </div>

            <div className="wizard-type-selector">
              <button 
                className={`wizard-type-btn ${wizardType === 'MCQ_SECTION' ? 'active' : ''}`}
                onClick={() => setWizardType('MCQ_SECTION')}
              >
                <Layers size={18} />
                <span>MCQ Questions Section</span>
              </button>
              <button 
                className={`wizard-type-btn ${wizardType === 'ROLL_NUMBER' ? 'active' : ''}`}
                onClick={() => setWizardType('ROLL_NUMBER')}
              >
                <Grid size={18} />
                <span>Student Roll Number Grid</span>
              </button>
              <button 
                className={`wizard-type-btn ${wizardType === 'SET_CODE' ? 'active' : ''}`}
                onClick={() => setWizardType('SET_CODE')}
              >
                <Sparkles size={18} />
                <span>Exam Version / Set Code</span>
              </button>
            </div>

            <div className="wizard-form-body">
              {wizardType === 'MCQ_SECTION' && (
                <>
                  <div className="field-group">
                    <label>Section Name</label>
                    <input 
                      type="text" 
                      value={wizardSectionName} 
                      onChange={(e) => setWizardSectionName(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label>Start Question No.</label>
                      <input 
                        type="number" 
                        value={wizardStartQ} 
                        onChange={(e) => setWizardStartQ(parseInt(e.target.value) || 1)}
                        className="input-field"
                      />
                    </div>
                    <div className="field-group">
                      <label>End Question No.</label>
                      <input 
                        type="number" 
                        value={wizardEndQ} 
                        onChange={(e) => setWizardEndQ(parseInt(e.target.value) || 25)}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <label>Options per Question</label>
                      <select 
                        value={wizardOptionCount} 
                        onChange={(e) => setWizardOptionCount(parseInt(e.target.value) as any)}
                        className="input-field"
                      >
                        <option value={4}>4 Options (A, B, C, D)</option>
                        <option value={5}>5 Options (A, B, C, D, E)</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Number of Parallel Columns</label>
                      <select 
                        value={wizardNumColumns} 
                        onChange={(e) => setWizardNumColumns(parseInt(e.target.value))}
                        className="input-field"
                      >
                        <option value={1}>1 Column (Standard)</option>
                        <option value={2}>2 Columns (50-Q Two-column)</option>
                        <option value={3}>3 Columns (High Density)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {wizardType === 'ROLL_NUMBER' && (
                <div className="field-group">
                  <label>Roll Number / Student ID Digits</label>
                  <select 
                    value={wizardRollDigits} 
                    onChange={(e) => setWizardRollDigits(parseInt(e.target.value))}
                    className="input-field"
                  >
                    <option value={4}>4 Digits</option>
                    <option value={6}>6 Digits (Standard)</option>
                    <option value={7}>7 Digits</option>
                    <option value={8}>8 Digits</option>
                    <option value={9}>9 Digits</option>
                    <option value={10}>10 Digits</option>
                  </select>
                </div>
              )}

              {wizardType === 'SET_CODE' && (
                <p className="subtitle">
                  Generates a horizontal version code selector with bubbles <strong>A, B, C, D</strong> mapped to the candidate's exam booklet.
                </p>
              )}
            </div>

            <div className="wizard-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowWizardModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApplyWizard}>
                <Wand2 size={16} /> Generate Blocks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
