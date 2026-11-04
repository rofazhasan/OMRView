import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { 
  Upload, 
  Camera, 
  FileSpreadsheet, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Search,
  Settings,
  Sparkles,
  RotateCcw,
  Smartphone,
  Zap,
  ZapOff,
  RefreshCw,
  CameraOff,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import type { 
  Template, 
  BubblePoint, 
  ScanProcessingResult, 
  StudentScoreCard, 
  EvaluationConfig 
} from '../types/omr';
import { processOMR } from '../core/omrEngine';
import { EvaluationEngine } from '../core/evaluationEngine';
import { parseTemplate } from '../core/templateParser';
import { PRESET_TEMPLATES } from '../data/presetTemplates';
import { renderPdfToCanvases } from '../utils/pdfLoader';
import Papa from 'papaparse';

interface BatchProcessorProps {
  template: Template | null;
  bubbles: BubblePoint[];
  evaluationConfig: EvaluationConfig;
  scanResults: Record<string, ScanProcessingResult>;
  scoreCards: StudentScoreCard[];
  onBatchComplete: (
    newScans: Record<string, ScanProcessingResult>, 
    newCards: StudentScoreCard[]
  ) => void;
  onSelectScoreCardForPrint: (card: StudentScoreCard) => void;
  onNavigateToQC: () => void;
}

export function BatchProcessor({
  template,
  bubbles,
  evaluationConfig,
  scanResults,
  scoreCards,
  onBatchComplete,
  onSelectScoreCardForPrint,
  onNavigateToQC,
}: BatchProcessorProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [activePreviewSheetId, setActivePreviewSheetId] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'enhanced' | 'raw'>('enhanced');
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Synchronize document canvas preview when selecting candidates or toggling enhancement
  useEffect(() => {
    if (isCameraActive || !activePreviewSheetId || !overlayCanvasRef.current) return;
    const currentScan = scanResults[activePreviewSheetId];
    if (!currentScan) return;

    const canvas = overlayCanvasRef.current;
    const baseCanvas = (viewMode === 'enhanced' && currentScan.enhancedImageCanvas) 
      ? currentScan.enhancedImageCanvas 
      : (currentScan.warpedImageCanvas || null);

    if (baseCanvas) {
      canvas.width = baseCanvas.width;
      canvas.height = baseCanvas.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseCanvas, 0, 0);

        if (showOverlay && currentScan.bubbleDetections) {
          currentScan.bubbleDetections.forEach(b => {
            ctx.save();
            if (b.isMarked) {
              const isMulti = currentScan.responses[b.label]?.length > 1;
              ctx.strokeStyle = isMulti ? '#ef4444' : '#10b981';
              ctx.lineWidth = 3;
              ctx.fillStyle = isMulti ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.22)';
              ctx.fillRect(b.rect.x, b.rect.y, b.rect.width, b.rect.height);
              ctx.strokeRect(b.rect.x, b.rect.y, b.rect.width, b.rect.height);
            } else {
              ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(b.rect.x, b.rect.y, b.rect.width, b.rect.height);
            }
            ctx.restore();
          });
        }
      }
    }
  }, [activePreviewSheetId, viewMode, showOverlay, scanResults, isCameraActive]);

  const handleMultipleFilesUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const activeTemplate: Template = template || PRESET_TEMPLATES[0].template;
    const activeBubbles: BubblePoint[] = (bubbles && bubbles.length > 0) ? bubbles : parseTemplate(activeTemplate).bubbles;

    setIsProcessing(true);
    setStatusMessage(`Preparing files and document pages for scanning...`);

    const newScanResults = { ...scanResults };
    const newScoreCards: StudentScoreCard[] = [...scoreCards];
    const evalEngine = new EvaluationEngine(evaluationConfig);

    const itemsToProcess: { canvas: HTMLCanvasElement; name: string }[] = [];

    try {
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
          const isMasterExam = file.name.toLowerCase().includes('medical') || 
                               file.name.toLowerCase().includes('master') ||
                               activeTemplate.pageDimensions[0] === 1060;
          const rendered = await renderPdfToCanvases(file, {
            dpi: 150,
            oddPagesOnly: isMasterExam,
          });
          for (const item of rendered) {
            itemsToProcess.push({
              canvas: item.canvas,
              name: `${file.name} (P.${item.pageNumber})`,
            });
          }
        } else {
          const img = await loadImageFromFile(file);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          itemsToProcess.push({
            canvas,
            name: file.name,
          });
        }
      }
    } catch (err: any) {
      console.error('Error unpacking batch documents:', err);
      setStatusMessage(`Failed to read input files: ${err.message}`);
      setIsProcessing(false);
      return;
    }

    setProgress({ current: 0, total: itemsToProcess.length });
    setStatusMessage(`Starting batch processing of ${itemsToProcess.length} sheets...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      setProgress({ current: i + 1, total: itemsToProcess.length });
      await new Promise(resolve => setTimeout(resolve, 16));

      try {
        const scanRes = await processOMR(
          item.canvas,
          activeTemplate,
          activeBubbles,
          overlayCanvasRef.current || undefined,
          item.name
        );

        newScanResults[scanRes.sheetId] = scanRes;

        const scoreCard = evalEngine.evaluateCandidate(
          scanRes.sheetId,
          item.name,
          scanRes.responses,
          scanRes.concatenatedResponses,
          scanRes.flags
        );

        newScoreCards.push(scoreCard);
        setActivePreviewSheetId(scanRes.sheetId);
        successCount++;
      } catch (err: any) {
        console.error(`Error processing file ${item.name}:`, err);
        failCount++;
      }
    }

    const rankedCards = EvaluationEngine.rankCohort(newScoreCards);
    onBatchComplete(newScanResults, rankedCards);

    setIsProcessing(false);
    setStatusMessage(
      `Batch complete: ${successCount} processed successfully${failCount > 0 ? `, ${failCount} failed` : ''}!`
    );
  };

  const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load ${url}: ${e}`));
      img.src = url;
    });
  };

  const handleRunDemoBatch = async () => {
    const activeTemplate: Template = template || PRESET_TEMPLATES[0].template;
    const activeBubbles: BubblePoint[] = (bubbles && bubbles.length > 0) ? bubbles : parseTemplate(activeTemplate).bubbles;

    setIsProcessing(true);

    // Auto-select corresponding realistic test scans based on active template schema
    const isSample6 = activeTemplate.pageDimensions[1] === 3508 || !!activeTemplate.fieldBlocks?.Stu;
    const isSample1 = activeTemplate.pageDimensions[0] === 1846;
    const isMedical = activeTemplate.pageDimensions[0] === 1060 || activeTemplate.fieldBlocks?.QPart1_Col1 !== undefined;

    let demoFiles = [
      { name: 'bd_hsc_sample_01.png', url: '/samples/bd_hsc_sample_01.png' },
      { name: 'bd_hsc_sample_02.png', url: '/samples/bd_hsc_sample_02.png' },
      { name: 'bd_hsc_sample_03.png', url: '/samples/bd_hsc_sample_03.png' },
    ];

    if (isMedical) {
      demoFiles = [
        { name: 'MT-01_Medical_Filled_Sample.png', url: '/samples/medical_exam_filled_sample1.png' },
      ];
    } else if (isSample6) {
      demoFiles = [
        { name: 'sample_roll_01.jpg', url: '/samples/sample_roll_01.jpg' },
        { name: 'sample_roll_02.jpg', url: '/samples/sample_roll_02.jpg' },
        { name: 'sample_roll_03.jpg', url: '/samples/sample_roll_03.jpg' },
      ];
    } else if (isSample1) {
      demoFiles = [
        { name: 'sample1_sheet1.jpg', url: '/samples/sample1_sheet1.jpg' },
      ];
    }

    setProgress({ current: 0, total: demoFiles.length });
    setStatusMessage(`Running enterprise batch demo (${demoFiles.length} real exam scans)...`);

    const newScanResults = { ...scanResults };
    const newScoreCards: StudentScoreCard[] = [...scoreCards];
    const evalEngine = new EvaluationEngine(evaluationConfig);
    const offscreenCanvas = document.createElement('canvas');

    for (let i = 0; i < demoFiles.length; i++) {
      const item = demoFiles[i];
      setProgress({ current: i + 1, total: demoFiles.length });
      // Yield to browser event loop
      await new Promise(resolve => setTimeout(resolve, 20));

      try {
        const img = await loadImageFromUrl(item.url);
        offscreenCanvas.width = img.width;
        offscreenCanvas.height = img.height;
        const ctx = offscreenCanvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const scanRes = await processOMR(
          offscreenCanvas,
          activeTemplate,
          activeBubbles,
          overlayCanvasRef.current || undefined,
          item.name
        );

        newScanResults[scanRes.sheetId] = scanRes;

        const scoreCard = evalEngine.evaluateCandidate(
          scanRes.sheetId,
          item.name,
          scanRes.responses,
          scanRes.concatenatedResponses,
          scanRes.flags
        );

        newScoreCards.push(scoreCard);
        setActivePreviewSheetId(scanRes.sheetId);
      } catch (err: any) {
        console.error(`Error processing demo sheet ${item.name}:`, err);
      }
    }

    const rankedCards = EvaluationEngine.rankCohort(newScoreCards);
    onBatchComplete(newScanResults, rankedCards);

    setIsProcessing(false);
    setStatusMessage(`Completed Enterprise Demo: Evaluated & ranked ${demoFiles.length} candidate sheets!`);
  };

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    try {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: facing }, 
          width: { ideal: 1920, min: 1280 }, 
          height: { ideal: 1080, min: 720 } 
        },
      });

      activeStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        setStatusMessage('Camera active - align sheet inside the corner guides');

        const track = stream.getVideoTracks()[0];
        const capabilities: any = track?.getCapabilities?.() || {};
        setIsTorchSupported(Boolean(capabilities.torch));
        setIsTorchOn(false);
      }
    } catch (err: any) {
      console.error(err);
      setIsCameraActive(false);
      setStatusMessage('Camera access denied or unavailable: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setStatusMessage('Camera viewfinder stopped.');
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    await startCamera(nextFacing);
  };

  const toggleTorch = async () => {
    if (!activeStreamRef.current) return;
    const track = activeStreamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setIsTorchOn(nextTorch);
      } catch (e: any) {
        console.warn('Could not toggle torch:', e);
      }
    }
  };

  const captureCameraFrame = async () => {
    if (!videoRef.current) return;
    if (navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }
    const v = videoRef.current;
    const canvas = cameraCanvasRef.current || document.createElement('canvas');
    canvas.width = v.videoWidth || 1920;
    canvas.height = v.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(v, 0, 0, canvas.width, canvas.height);

    const activeTemplate: Template = template || PRESET_TEMPLATES[0].template;
    const activeBubbles: BubblePoint[] = (bubbles && bubbles.length > 0) ? bubbles : parseTemplate(activeTemplate).bubbles;

    setStatusMessage('Scanning camera frame with high precision...');
    try {
      const scanRes = await processOMR(
        canvas,
        activeTemplate,
        activeBubbles,
        overlayCanvasRef.current || undefined,
        `webcam_capture_${Date.now()}.jpg`
      );

      const evalEngine = new EvaluationEngine(evaluationConfig);
      const scoreCard = evalEngine.evaluateCandidate(
        scanRes.sheetId,
        scanRes.filename,
        scanRes.responses,
        scanRes.concatenatedResponses,
        scanRes.flags
      );

      const newScanResults = { ...scanResults, [scanRes.sheetId]: scanRes };
      const newScoreCards = EvaluationEngine.rankCohort([...scoreCards, scoreCard]);

      onBatchComplete(newScanResults, newScoreCards);
      setActivePreviewSheetId(scanRes.sheetId);
      setStatusMessage(`Captured & evaluated Roll ${scoreCard.rollNumber}: ${scoreCard.totalScore} pts!`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Capture processing failed: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    if (scoreCards.length === 0) return;
    const rows = scoreCards.map(c => {
      const qEntries: Record<string, string> = {};
      Object.entries(c.questionVerdicts).forEach(([q, v]) => {
        qEntries[`Q_${q}`] = v.studentAnswer || '';
        qEntries[`Verdict_${q}`] = v.verdict;
      });

      return {
        SheetID: c.sheetId,
        Filename: c.filename,
        RollNumber: c.rollNumber,
        Rank: c.rank || '',
        TotalScore: c.totalScore,
        MaxScore: c.maxScore,
        Percentage: c.percentage,
        Percentile: c.percentile || '',
        Correct: c.correctCount,
        Incorrect: c.incorrectCount,
        Unmarked: c.unmarkedCount,
        Flags: c.flags.join('; '),
        ...qEntries,
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OMR_Batch_Results_${Date.now()}.csv`;
    a.click();
  };

  const handleClearBatch = () => {
    onBatchComplete({}, []);
    setActivePreviewSheetId(null);
    setStatusMessage('Cleared all batch evaluations and scorecards.');
  };

  const filteredCards = scoreCards.filter(c => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return c.rollNumber.toLowerCase().includes(q) || c.filename.toLowerCase().includes(q);
  });

  return (
    <div className="batch-processor-workspace animate-fade-in">
      <div className="workspace-top-bar glass-panel">
        <div>
          <h2>Automated OMR Scan & Batch Ingestion Engine</h2>
          <p className="subtitle">High-throughput computer vision pipeline with real-time alignment and automated grading</p>
        </div>

        <div className="top-bar-actions">
          <label 
            className={`btn btn-primary btn-phone-capture ${!template ? 'opacity-50 pointer-events-none' : ''}`}
            title="Open native mobile camera with full optical sensor resolution & autofocus"
          >
            <Smartphone size={18} />
            <span>Phone Camera (HD)</span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              hidden 
              onChange={handleMultipleFilesUpload} 
              disabled={!template || isProcessing} 
            />
          </label>
          <button 
            className={`btn ${isCameraActive ? 'btn-danger' : 'btn-outline'}`}
            onClick={isCameraActive ? stopCamera : () => startCamera()} 
            disabled={!template || isProcessing}
            title={isCameraActive ? 'Close live viewfinder' : 'Launch live web camera'}
          >
            {isCameraActive ? <CameraOff size={18} /> : <Camera size={18} />}
            <span>{isCameraActive ? 'Close Camera' : 'Live Camera'}</span>
          </button>
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onClick={handleRunDemoBatch} 
            disabled={!template || isProcessing}
          >
            <Sparkles size={18} /> <span>Demo Batch</span>
          </button>
          <label className={`btn btn-outline ${!template ? 'opacity-50 pointer-events-none' : ''}`}>
            <Layers size={18} />
            <span>Bulk Upload (Images/PDFs)</span>
            <input 
              type="file" 
              accept="image/*,application/pdf,.pdf" 
              multiple 
              hidden 
              onChange={handleMultipleFilesUpload} 
              disabled={!template || isProcessing} 
            />
          </label>
          <button 
            className="btn btn-outline" 
            onClick={handleExportCSV} 
            disabled={scoreCards.length === 0}
          >
            <FileSpreadsheet size={18} /> <span>Export CSV</span>
          </button>
          {scoreCards.length > 0 && (
            <button 
              className="btn btn-outline" 
              onClick={handleClearBatch}
              title="Reset all batch evaluation results"
              style={{ color: '#ef4444', borderColor: '#ef4444' }}
            >
              <RotateCcw size={16} /> <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar when processing */}
      {isProcessing && (
        <div className="progress-banner glass-panel animate-fade-in">
          <div className="progress-info">
            <span>Processing batch sheets: {progress.current} of {progress.total}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="studio-status-bar">
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="processor-split-view">
        {/* Left Column: Scanned Cohort Roster */}
        <div className="roster-panel glass-panel">
          <div className="roster-panel-header">
            <h3>Evaluated Candidates ({scoreCards.length})</h3>
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search Roll No..." 
                value={searchFilter} 
                onChange={(e) => setSearchFilter(e.target.value)} 
              />
            </div>
          </div>

          <div className="roster-table-wrapper">
            {filteredCards.length === 0 ? (
              <div className="empty-state">
                <Upload size={32} />
                <p>No sheets evaluated yet. Click "Bulk Upload Scans" or "Live Camera" above.</p>
              </div>
            ) : (
              <table className="enterprise-table mini">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Roll No</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map(card => {
                    const hasFlags = card.flags.length > 0 || card.needsReview;

                    return (
                      <tr 
                        key={card.sheetId} 
                        className={activePreviewSheetId === card.sheetId ? 'row-active' : ''}
                        onClick={() => setActivePreviewSheetId(card.sheetId)}
                      >
                        <td><span className="rank-badge">#{card.rank || '-'}</span></td>
                        <td><strong>{card.rollNumber}</strong></td>
                        <td>{card.totalScore} <small>/{card.maxScore}</small></td>
                        <td>{card.percentage}%</td>
                        <td>
                          {hasFlags ? (
                            <span className="status-pill warning" onClick={onNavigateToQC}>
                              <AlertTriangle size={12} /> Flagged
                            </span>
                          ) : (
                            <span className="status-pill success">
                              <CheckCircle2 size={12} /> OK
                            </span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn btn-xs btn-outline"
                            title="Generate Official Report Card"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectScoreCardForPrint(card);
                            }}
                          >
                            <FileText size={14} /> Scorecard
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Live Video & Document Perspective Canvas */}
        <div className="preview-panel glass-panel">
          <div className="preview-header">
            <div>
              <h3>Optical Inspection & Document Enhancement</h3>
              <p className="preview-subtext">
                {isCameraActive 
                  ? 'Live Camera Active — Align corners inside viewfinder guides' 
                  : (activePreviewSheetId && scanResults[activePreviewSheetId] 
                      ? `${scanResults[activePreviewSheetId].filename} — ${viewMode === 'enhanced' ? 'Studio Enhanced (Bright White, Shadow-Free)' : 'Original Aligned Scan'}` 
                      : 'Perspective-Corrected Warped Document with Bubble Classifications')}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isCameraActive && activePreviewSheetId && (
                <>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${viewMode === 'enhanced' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setViewMode('enhanced')}
                      title="Studio Document Enhancement: Removes shadows, flattens illumination, whitens paper & sharpens ink"
                      style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Sparkles size={12} /> Studio Enhanced
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${viewMode === 'raw' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setViewMode('raw')}
                      title="Original Camera / Document Perspective"
                      style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Camera size={12} /> Original Scan
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`btn btn-xs ${showOverlay ? 'btn-outline' : 'btn-ghost'}`}
                    onClick={() => setShowOverlay(!showOverlay)}
                    title="Toggle Bubble Recognition Grids & Confidence Highlights"
                    style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />} Overlay
                  </button>
                </>
              )}
              <span className="preview-badge">OpenCV 4.12 WASM Active</span>
            </div>
          </div>

          <div className={`canvas-viewport ${isCameraActive ? 'camera-mode-active' : ''}`}>
            <video 
              ref={videoRef} 
              className={`camera-feed ${isCameraActive ? 'feed-visible' : 'feed-hidden'}`} 
              autoPlay 
              playsInline 
              muted 
            />

            {/* High-Tech Mobile Viewfinder HUD */}
            {isCameraActive && (
              <div className="viewfinder-hud">
                <div className="viewfinder-frame">
                  <div className="corner-bracket corner-tl" />
                  <div className="corner-bracket corner-tr" />
                  <div className="corner-bracket corner-bl" />
                  <div className="corner-bracket corner-br" />
                  <div className="viewfinder-scanline" />
                </div>

                <div className="viewfinder-instruction-pill">
                  <span>Keep sheet flat & align within corner markers</span>
                </div>

                <div className="viewfinder-hud-controls">
                  {isTorchSupported && (
                    <button 
                      type="button" 
                      className={`hud-ctrl-btn ${isTorchOn ? 'active' : ''}`}
                      onClick={toggleTorch}
                      title="Toggle Torch / Flashlight"
                    >
                      {isTorchOn ? <ZapOff size={20} /> : <Zap size={20} />}
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="hud-ctrl-btn"
                    onClick={toggleCameraFacing}
                    title="Switch Camera (Front / Back)"
                  >
                    <RefreshCw size={20} />
                  </button>
                  <button 
                    type="button" 
                    className="hud-ctrl-btn hud-close"
                    onClick={stopCamera}
                    title="Close Live Viewfinder"
                  >
                    <X size={20} />
                  </button>
                </div>

                <button 
                  type="button" 
                  className="viewfinder-shutter-btn"
                  onClick={captureCameraFrame}
                  title="Snap & Grade OMR Sheet"
                >
                  <div className="shutter-inner-ring" />
                </button>
              </div>
            )}

            <canvas 
              ref={overlayCanvasRef} 
              className={`overlay-canvas-display ${isCameraActive ? 'feed-hidden' : 'feed-visible'}`} 
            />

            {!template && !isCameraActive && (
              <div className="placeholder-text">
                <Settings className="placeholder-icon" />
                <span>Please select or design a Template to enable automated grading</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
