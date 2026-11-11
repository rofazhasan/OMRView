"use client";

import React, { useState, useRef } from 'react';
import { 
  Printer, 
  Download, 
  CheckCircle, 
  Sliders, 
  FileText, 
  Hash,
  Bookmark,
  LayoutGrid,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Template } from '../types/omr';
import { toBanglaNumber, generateBoardCQSerial, incrementBoardSerial } from '../utils/banglaUtils';
import { BangladeshBoardCQ3PartSheet } from './BangladeshBoardCQ3PartSheet';
import './omr.css';

const BANGLADESH_BOARDS = [
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, ঢাকা', prefix: 'T' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, চট্টগ্রাম', prefix: 'C' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, রাজশাহী', prefix: 'R' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, যশোর', prefix: 'J' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, বরিশাল', prefix: 'B' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, সিলেট', prefix: 'S' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, দিনাজপুর', prefix: 'DIN' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, ময়মনসিংহ', prefix: 'M' },
  { name: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, কুমিল্লা', prefix: 'COM' },
  { name: 'বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড, ঢাকা', prefix: 'MAD' },
  { name: 'বাংলাদেশ কারিগরি শিক্ষা বোর্ড, ঢাকা', prefix: 'BTEB' },
];

interface BangladeshOMRGeneratorProps {
  initialPreset?: PresetType;
  onApplyGeneratedTemplate?: (template: Template) => void;
  onNavigateToScanner?: () => void;
  examId?: string;
  setId?: string;
  setName?: string;
  hideTopHeader?: boolean;
}

export type PresetType = 
  | 'hsc_ssc_50' 
  | 'hsc_ssc_25' 
  | 'medical_100' 
  | 'du_admission' 
  | 'gst_cluster' 
  | 'agri_cluster' 
  | 'board_cq_3part'
  | 'custom';

export type ThemeColor = 'magenta' | 'blue' | 'black' | 'green';
export type SheetLayoutMode = 'split' | 'stacked';

export function BangladeshOMRGenerator({ 
  initialPreset,
  onApplyGeneratedTemplate, 
  onNavigateToScanner,
  examId,
  setId,
  setName,
  hideTopHeader = false
}: BangladeshOMRGeneratorProps) {
  // Preset selection
  const [selectedPreset, setSelectedPreset] = useState<PresetType>(initialPreset || 'hsc_ssc_50');

  React.useEffect(() => {
    if (initialPreset && initialPreset !== selectedPreset) {
      handleSelectPreset(initialPreset);
    }
  }, [initialPreset]);

  // Customization State
  const [examTitleBangla, setExamTitleBangla] = useState<string>('নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র');
  const [instituteNameBangla, setInstituteNameBangla] = useState<string>('মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড');
  const [subHeaderBangla, setSubHeaderBangla] = useState<string>('উত্তরপত্রে নির্ধারিত স্থান ব্যতীত কোন অবাঞ্ছিত দাগ দেয়া বা কোন কিছু লেখা যাবে না');
  const [examYear, setExamYear] = useState<string>('২৬'); // Year 2026
  const [boardPrefix, setBoardPrefix] = useState<string>('T');
  const [serialNumber, setSerialNumber] = useState<string>(() => generateBoardCQSerial('T', '26'));
  const [batchCopies, setBatchCopies] = useState<number>(1);
  
  // Sections & Questions
  const [numQuestions, setNumQuestions] = useState<number>(50);
  const [numColumns, setNumColumns] = useState<number>(2);
  const [optionLanguage, setOptionLanguage] = useState<'BANGLA' | 'ENGLISH'>('BANGLA'); // ক,খ,গ,ঘ vs A,B,C,D
  const [numberingLanguage, setNumberingLanguage] = useState<'BANGLA' | 'ENGLISH'>('BANGLA'); // ১,২,৩ vs 1,2,3
  const [themeColor, setThemeColor] = useState<ThemeColor>('magenta');
  const [layoutMode, setLayoutMode] = useState<SheetLayoutMode>('split'); // 'split' for 50-Q board, 'stacked' for 100-Q admission

  // Identification Fields
  const [showRollNumber, setShowRollNumber] = useState<boolean>(true);
  const [rollDigits, setRollDigits] = useState<number>(6);
  const [showRegNumber, setShowRegNumber] = useState<boolean>(true);
  const [regDigits, setRegDigits] = useState<number>(10);
  const [showSubjectCode, setShowSubjectCode] = useState<boolean>(true);
  const [subjectCodeDigits, setSubjectCodeDigits] = useState<number>(3);
  const [showSetCode, setShowSetCode] = useState<boolean>(true);
  const [setOptionsType, setSetOptionsType] = useState<'BANGLA' | 'ENGLISH'>('BANGLA'); // ক,খ,গ,ঘ vs A,B,C,D
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [showBarcodeSecurity, setShowBarcodeSecurity] = useState<boolean>(true);

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Apply predefined templates
  const handleSelectPreset = (preset: PresetType) => {
    setSelectedPreset(preset);
    if (preset === 'hsc_ssc_50') {
      setInstituteNameBangla('মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড');
      setExamTitleBangla('নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র');
      setNumQuestions(50);
      setNumColumns(2);
      setLayoutMode('split');
      setOptionLanguage('BANGLA');
      setNumberingLanguage('BANGLA');
      setThemeColor('magenta');
      setShowRollNumber(true);
      setRollDigits(6);
      setShowRegNumber(true);
      setRegDigits(10);
      setShowSubjectCode(true);
      setSubjectCodeDigits(3);
      setShowSetCode(true);
      setSetOptionsType('BANGLA');
      setShowSignatures(true);
      setShowInstructions(true);
      setShowBarcodeSecurity(true);
      setSerialNumber('HSC-2026-948120');
      setStatusMessage('Loaded official Bangladesh Board HSC/SSC 50-Question Preset');
    } else if (preset === 'hsc_ssc_25') {
      setInstituteNameBangla('মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড');
      setExamTitleBangla('নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র (সংক্ষিপ্ত সিলেবাস)');
      setNumQuestions(25);
      setNumColumns(1);
      setLayoutMode('split');
      setOptionLanguage('BANGLA');
      setNumberingLanguage('BANGLA');
      setThemeColor('magenta');
      setShowRollNumber(true);
      setRollDigits(6);
      setShowRegNumber(true);
      setRegDigits(10);
      setShowSubjectCode(true);
      setSubjectCodeDigits(3);
      setShowSetCode(true);
      setSetOptionsType('BANGLA');
      setShowSignatures(true);
      setShowInstructions(true);
      setShowBarcodeSecurity(true);
      setSerialNumber('SSC-2026-419208');
      setStatusMessage('Loaded Bangladesh Board 25-Question Preset');
    } else if (preset === 'medical_100') {
      setInstituteNameBangla('Directorate General of Health Services (DGHS)');
      setExamTitleBangla('Medical & Dental Admission Test (মেডিকেল ও ডেন্টাল ভর্তি পরীক্ষা)');
      setNumQuestions(100);
      setNumColumns(4);
      setLayoutMode('stacked');
      setOptionLanguage('ENGLISH');
      setNumberingLanguage('ENGLISH');
      setThemeColor('blue');
      setShowRollNumber(true);
      setRollDigits(7);
      setShowRegNumber(false);
      setShowSubjectCode(false);
      setShowSetCode(true);
      setSetOptionsType('ENGLISH');
      setShowSignatures(true);
      setShowInstructions(true);
      setShowBarcodeSecurity(true);
      setSerialNumber('MED-2026-783921');
      setStatusMessage('Loaded DGHS Medical & Dental 100-Question Admission Preset');
    } else if (preset === 'du_admission') {
      setInstituteNameBangla('ঢাকা বিশ্ববিদ্যালয় (University of Dhaka)');
      setExamTitleBangla('স্নাতক (সম্মান) ১ম বর্ষ ভর্তি পরীক্ষা - বিজ্ঞান ও কলা অনুষদ');
      setNumQuestions(60);
      setNumColumns(3);
      setLayoutMode('stacked');
      setOptionLanguage('ENGLISH');
      setNumberingLanguage('ENGLISH');
      setThemeColor('black');
      setShowRollNumber(true);
      setRollDigits(7);
      setShowRegNumber(false);
      setShowSubjectCode(false);
      setShowSetCode(true);
      setSetOptionsType('ENGLISH');
      setShowSignatures(true);
      setShowInstructions(true);
      setShowBarcodeSecurity(true);
      setSerialNumber('DU-2026-103982');
      setStatusMessage('Loaded Dhaka University (DU) Admission Preset');
    } else if (preset === 'gst_cluster') {
      setInstituteNameBangla('গুচ্ছভুক্ত বিশ্ববিদ্যালয়সমূহের সমন্বিত ভর্তি পরীক্ষা (GST Cluster)');
      setExamTitleBangla('স্নাতক ১ম বর্ষ ভর্তি পরীক্ষা - ১০০ নৈর্ব্যক্তিক প্রশ্ন');
      setNumQuestions(100);
      setNumColumns(4);
      setLayoutMode('stacked');
      setOptionLanguage('ENGLISH');
      setNumberingLanguage('ENGLISH');
      setThemeColor('blue');
      setShowRollNumber(true);
      setRollDigits(6);
      setShowRegNumber(false);
      setShowSubjectCode(false);
      setShowSetCode(true);
      setSetOptionsType('ENGLISH');
      setShowSignatures(true);
      setShowInstructions(true);
      setShowBarcodeSecurity(true);
      setSerialNumber('GST-2026-554190');
      setStatusMessage('Loaded GST Cluster Admission Test Preset');
    } else if (preset === 'agri_cluster') {
      setInstituteNameBangla('কৃষি গুচ্ছ সমন্বিত ভর্তি পরীক্ষা (Agricultural Universities)');
      setExamTitleBangla('স্নাতক ১ম বর্ষ সমন্বিত ভর্তি পরীক্ষা');
      setNumQuestions(100);
      setNumColumns(5);
      setLayoutMode('stacked');
      setOptionLanguage('ENGLISH');
      setNumberingLanguage('ENGLISH');
      setThemeColor('green');
      setShowRollNumber(true);
      setRollDigits(6);
      setShowRegNumber(false);
      setShowSubjectCode(false);
      setShowSetCode(true);
      setSetOptionsType('ENGLISH');
      setShowSignatures(true);
      setShowInstructions(true);
      setShowBarcodeSecurity(true);
      setSerialNumber('AGRI-2026-881204');
      setStatusMessage('Loaded Agriculture Cluster 5-Column 100-Question Preset');
    } else if (preset === 'board_cq_3part') {
      setInstituteNameBangla('মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, ঢাকা');
      setExamTitleBangla('এস.এস.সি / এইচ.এস.সি / ডিআইবিএস পরীক্ষা');
      setNumQuestions(20);
      setNumColumns(1);
      setLayoutMode('split');
      setOptionLanguage('BANGLA');
      setNumberingLanguage('BANGLA');
      setThemeColor('magenta');
      setShowRollNumber(true);
      setRollDigits(6);
      setShowRegNumber(true);
      setRegDigits(10);
      setShowSubjectCode(true);
      setSubjectCodeDigits(3);
      setShowSetCode(false);
      setShowSignatures(true);
      setShowInstructions(true);
      setShowBarcodeSecurity(true);
      const generated = generateBoardCQSerial(boardPrefix, examYear || '26');
      setSerialNumber(generated);
      setStatusMessage('Loaded Official Bangladesh Board 3-Part CQ Script Cover Sheet (সৃজনশীল ও রচনামূলক)');
    }
  };

  const handleGenerateNewSerial = () => {
    const fresh = generateBoardCQSerial(boardPrefix, examYear || '26');
    setSerialNumber(fresh);
    setStatusMessage(`Generated authentic Board Serial: ${fresh}`);
  };

  // Compile JSON Template matching the printed sheet geometry
  const generateOMRCheckerTemplate = (): Template => {
    const pageW = 1240;
    const pageH = 1754;
    const bubbleW = 22;
    const bubbleH = 22;

    const fieldBlocks: Template['fieldBlocks'] = {};
    const customLabels: Record<string, string[]> = {};

    if (layoutMode === 'split') {
      // Board Split Mode (Questions Left, ID Right)
      if (showRollNumber) {
        fieldBlocks['Roll'] = {
          origin: [680, 240],
          bubblesGap: 26,
          labelsGap: 30,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: [`roll1..${rollDigits}`],
          section: 'Roll Number',
        };
        customLabels['Roll'] = [`roll1..${rollDigits}`];
      }

      if (showRegNumber) {
        fieldBlocks['Reg'] = {
          origin: [680, 560],
          bubblesGap: 26,
          labelsGap: 30,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: [`reg1..${regDigits}`],
          section: 'Registration Number',
        };
        customLabels['Registration'] = [`reg1..${regDigits}`];
      }

      if (showSubjectCode) {
        fieldBlocks['SubjectCode'] = {
          origin: [1000, 560],
          bubblesGap: 26,
          labelsGap: 30,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: [`sub1..${subjectCodeDigits}`],
          section: 'Subject Code',
        };
        customLabels['SubjectCode'] = [`sub1..${subjectCodeDigits}`];
      }

      if (showSetCode) {
        fieldBlocks['SetCode'] = {
          origin: [880, 240],
          bubblesGap: 26,
          labelsGap: 0,
          bubbleValues: setOptionsType === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'],
          direction: 'horizontal',
          fieldLabels: ['Set'],
          section: 'Set Code',
        };
        customLabels['Set'] = ['Set'];
      }

      // Questions (Left Columns)
      const qPerCol = Math.ceil(numQuestions / numColumns);
      const startX = 64;
      const colSpacing = Math.round(580 / numColumns);

      for (let c = 0; c < numColumns; c++) {
        const startQ = c * qPerCol + 1;
        const endQ = Math.min(numQuestions, (c + 1) * qPerCol);
        if (startQ > numQuestions) break;

        const colName = `Questions_Col${c + 1}`;
        fieldBlocks[colName] = {
          origin: [startX + c * colSpacing, 220],
          bubblesGap: 28,
          labelsGap: 26,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: [`q${startQ}..${endQ}`],
          bubbleValues: optionLanguage === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'],
          section: `Column ${c + 1}`,
        };
      }
    } else {
      // Stacked Mode (ID Header Top, Questions Full Width Below)
      if (showRollNumber) {
        fieldBlocks['Roll'] = {
          origin: [60, 220],
          bubblesGap: 24,
          labelsGap: 26,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: [`roll1..${rollDigits}`],
          section: 'Roll Number',
        };
      }

      if (showSetCode) {
        fieldBlocks['SetCode'] = {
          origin: [260, 220],
          bubblesGap: 24,
          labelsGap: 0,
          bubbleValues: setOptionsType === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'],
          direction: 'horizontal',
          fieldLabels: ['Set'],
          section: 'Set Code',
        };
      }

      const qPerCol = Math.ceil(numQuestions / numColumns);
      const startX = 60;
      const colSpacing = Math.round(1120 / numColumns);

      for (let c = 0; c < numColumns; c++) {
        const startQ = c * qPerCol + 1;
        const endQ = Math.min(numQuestions, (c + 1) * qPerCol);
        if (startQ > numQuestions) break;

        const colName = `Questions_Col${c + 1}`;
        fieldBlocks[colName] = {
          origin: [startX + c * colSpacing, 580],
          bubblesGap: 28,
          labelsGap: 24,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: [`q${startQ}..${endQ}`],
          bubbleValues: optionLanguage === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'],
          section: `Column ${c + 1}`,
        };
      }
    }

    return {
      pageDimensions: [pageW, pageH],
      bubbleDimensions: [bubbleW, bubbleH],
      preProcessors: [{ name: 'CropOnMarkers' }],
      fieldBlocks,
      customLabels,
    };
  };

  const handleSyncToScanner = () => {
    const tmpl = generateOMRCheckerTemplate();
    if (onApplyGeneratedTemplate) onApplyGeneratedTemplate(tmpl);
    setStatusMessage('Sync complete! Template calibrated for this exact printed sheet.');
    if (onNavigateToScanner) onNavigateToScanner();
  };

  const handleExportTemplateJSON = () => {
    const tmpl = generateOMRCheckerTemplate();
    const jsonStr = JSON.stringify(tmpl, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPreset}_template.json`;
    a.click();
    setStatusMessage('Downloaded OMRChecker-compatible template.json');
  };

  const handlePrint = () => {
    window.print();
  };

  // Color mappings with rich authentic tones and alternating stripe fills
  const themeStyles = {
    magenta: { 
      primary: '#d91884', // Authentic Board magenta/pink
      stripe: 'rgba(217, 24, 132, 0.14)', 
      lightBg: 'rgba(217, 24, 132, 0.08)', 
      border: '#d91884' 
    },
    blue: { 
      primary: '#1d4ed8', 
      stripe: 'rgba(29, 78, 216, 0.14)', 
      lightBg: 'rgba(29, 78, 216, 0.08)', 
      border: '#1d4ed8' 
    },
    black: { 
      primary: '#000000', 
      stripe: 'rgba(0, 0, 0, 0.08)', 
      lightBg: 'rgba(0, 0, 0, 0.04)', 
      border: '#000000' 
    },
    green: { 
      primary: '#15803d', 
      stripe: 'rgba(21, 128, 61, 0.14)', 
      lightBg: 'rgba(21, 128, 61, 0.08)', 
      border: '#15803d' 
    },
  }[themeColor];

  const qPerCol = Math.ceil(numQuestions / numColumns);
  const optionsList = optionLanguage === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'];

  // Helper component to render scannable crisp barcode
  const renderBarcodeSvg = () => {
    const bars = [
      3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 2, 1, 1, 2, 
      3, 1, 2, 1, 1, 3, 2, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2, 3, 2, 1,
      1, 3, 2, 1, 2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 2, 1, 3, 2, 2
    ];
    let currentX = 0;
    return (
      <svg width="100%" height="24" viewBox="0 0 240 24" preserveAspectRatio="none">
        {bars.map((width, idx) => {
          const x = currentX;
          currentX += width * 2;
          if (idx % 2 === 0) {
            return <rect key={idx} x={x} y="0" width={width * 1.8} height="24" fill="#000" />;
          }
          return null;
        })}
      </svg>
    );
  };

  return (
    <div className="bangladesh-omr-generator animate-fade-in">
      {/* Top Configuration & Control Bar */}
      {!hideTopHeader ? (
        <div className="generator-top-panel glass-panel no-print">
          <div className="panel-title-row">
            <div>
              <h2>Bangladesh HSC/SSC & University Admission OMR Designer</h2>
              <p className="subtitle">Official Board & University-Grade Printable OMR Sheets — Zero Vacant Space, Fully Calibrated</p>
            </div>

            <div className="panel-actions">
              <button className="btn btn-outline" onClick={handleExportTemplateJSON} title="Export JSON matching this sheet">
                <Download size={16} /> Export template.json
              </button>
              <button className="btn btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={handleSyncToScanner}>
                <CheckCircle size={16} /> Sync to Scanner
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={18} /> Print Sheet (A4 / PDF)
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="studio-status-bar">
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Preset Selector Chips */}
          <div className="presets-chips-bar">
            <span className="chips-label"><Bookmark size={15} /> Official Presets:</span>
            {[
              { id: 'hsc_ssc_50', label: 'HSC / SSC 50-Q (Board Authentic)' },
              { id: 'board_cq_3part', label: '📝 Board CQ 3-Part Cover (সৃজনশীল)' },
              { id: 'hsc_ssc_25', label: 'HSC 25-Q (Short Syllabus)' },
              { id: 'medical_100', label: 'Medical & Dental 100-Q (DGHS)' },
              { id: 'du_admission', label: 'DU Ka/Kha 60-Q (Dhaka Univ)' },
              { id: 'gst_cluster', label: 'GST Cluster 100-Q' },
              { id: 'agri_cluster', label: 'Agriculture Cluster 100-Q' },
            ].map(p => (
              <button
                key={p.id}
                className={`preset-chip ${selectedPreset === p.id ? 'active' : ''}`}
                onClick={() => handleSelectPreset(p.id as PresetType)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Sleek compact toolbar when embedded in main page */
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl mb-4 no-print">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Bookmark size={14} className="text-indigo-400" /> প্রিসেট:
            </span>
            {[
              { id: 'board_cq_3part', label: '📝 CQ ৩-খণ্ড কভার' },
              { id: 'hsc_ssc_50', label: '🎓 HSC/SSC ৫০-প্রশ্ন' },
              { id: 'medical_100', label: '🩺 মেডিকেল ১০০-প্রশ্ন' },
              { id: 'du_admission', label: '🏛️ ঢাবি ৬০/১০০-প্রশ্ন' },
              { id: 'gst_cluster', label: '🌐 GST গুচ্ছ ১০০-প্রশ্ন' },
              { id: 'hsc_ssc_25', label: '⚡ মডেল টেস্ট ২৫-প্রশ্ন' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedPreset === p.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                }`}
                onClick={() => handleSelectPreset(p.id as PresetType)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleExportTemplateJSON}
              title="Export JSON matching this sheet"
            >
              <Download size={14} /> <span>JSON</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-indigo-500/50 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              onClick={handleSyncToScanner}
            >
              <CheckCircle size={14} /> <span>স্ক্যানার সিঙ্ক</span>
            </button>
            <button
              type="button"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
              onClick={handlePrint}
            >
              <Printer size={15} /> <span>প্রিন্ট শিট (A4 / PDF)</span>
            </button>
          </div>
        </div>
      )}

      <div className="generator-split-layout">
        {/* Left Side: Customization Sidebar */}
        <div className="generator-sidebar glass-panel no-print">
          <div className="sidebar-group">
            <h3><Sliders size={16} /> Sheet Architecture & Theme</h3>
            
            <div className="field-group">
              <label>Layout Architecture</label>
              <div className="layout-toggle-group">
                <button 
                  className={`btn-toggle-option ${layoutMode === 'split' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('split')}
                >
                  <LayoutGrid size={14} /> Board Split (Left-Right)
                </button>
                <button 
                  className={`btn-toggle-option ${layoutMode === 'stacked' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('stacked')}
                >
                  <Sparkles size={14} /> Admission Stack (Top-Bottom)
                </button>
              </div>
            </div>

            <div className="field-group">
              <label>Print Color Theme</label>
              <div className="theme-color-picker">
                {[
                  { id: 'magenta', label: 'Board Magenta/Pink (HSC/SSC)', color: '#d91884' },
                  { id: 'blue', label: 'Medical Blue (DGHS)', color: '#1d4ed8' },
                  { id: 'black', label: 'Photocopy / High Contrast B&W', color: '#000000' },
                  { id: 'green', label: 'Agriculture Green', color: '#15803d' },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`theme-dot ${themeColor === t.id ? 'active' : ''}`}
                    style={{ background: t.color }}
                    onClick={() => setThemeColor(t.id as ThemeColor)}
                    title={t.label}
                  />
                ))}
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label>Question Count</label>
                <select 
                  value={numQuestions} 
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="input-field"
                >
                  <option value={25}>25 Questions</option>
                  <option value={30}>30 Questions</option>
                  <option value={50}>50 Questions (Board Standard)</option>
                  <option value={60}>60 Questions (DU Units)</option>
                  <option value={75}>75 Questions</option>
                  <option value={100}>100 Questions (Admission)</option>
                </select>
              </div>

              <div className="field-group">
                <label>Parallel Columns</label>
                <select 
                  value={numColumns} 
                  onChange={(e) => setNumColumns(parseInt(e.target.value))}
                  className="input-field"
                >
                  <option value={1}>1 Column</option>
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                  <option value={5}>5 Columns</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label>Bubble Letters</label>
                <select 
                  value={optionLanguage} 
                  onChange={(e) => setOptionLanguage(e.target.value as any)}
                  className="input-field"
                >
                  <option value="BANGLA">ক, খ, গ, ঘ (বাংলা)</option>
                  <option value="ENGLISH">A, B, C, D (English)</option>
                </select>
              </div>

              <div className="field-group">
                <label>Question Numbering</label>
                <select 
                  value={numberingLanguage} 
                  onChange={(e) => setNumberingLanguage(e.target.value as any)}
                  className="input-field"
                >
                  <option value="BANGLA">১, ২, ৩, ৪ (বাংলা)</option>
                  <option value="ENGLISH">1, 2, 3, 4 (English)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="sidebar-group">
            <h3><Hash size={16} /> Identification Blocks</h3>
            
            <div className="checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={showRollNumber} 
                  onChange={(e) => setShowRollNumber(e.target.checked)} 
                />
                Roll Number Grid (রোল নম্বর)
              </label>
              {showRollNumber && (
                <select 
                  value={rollDigits} 
                  onChange={(e) => setRollDigits(parseInt(e.target.value))}
                  className="input-field sm"
                >
                  <option value={6}>6 Digits (HSC/SSC Standard)</option>
                  <option value={7}>7 Digits (Medical/DU)</option>
                  <option value={8}>8 Digits</option>
                </select>
              )}
            </div>

            <div className="checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={showSetCode} 
                  onChange={(e) => setShowSetCode(e.target.checked)} 
                />
                Set Code (সেট কোড)
              </label>
              {showSetCode && (
                <select 
                  value={setOptionsType} 
                  onChange={(e) => setSetOptionsType(e.target.value as any)}
                  className="input-field sm"
                >
                  <option value="BANGLA">ক, খ, গ, ঘ</option>
                  <option value="ENGLISH">A, B, C, D</option>
                </select>
              )}
            </div>

            <div className="checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={showRegNumber} 
                  onChange={(e) => setShowRegNumber(e.target.checked)} 
                />
                Registration Number Grid (রেজিস্ট্রেশন নম্বর)
              </label>
              {showRegNumber && (
                <select 
                  value={regDigits} 
                  onChange={(e) => setRegDigits(parseInt(e.target.value))}
                  className="input-field sm"
                >
                  <option value={10}>10 Digits (Board Standard)</option>
                  <option value={8}>8 Digits</option>
                  <option value={6}>6 Digits</option>
                </select>
              )}
            </div>

            <div className="checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={showSubjectCode} 
                  onChange={(e) => setShowSubjectCode(e.target.checked)} 
                />
                Subject Code Grid (বিষয় কোড - ৩ ডিজিট)
              </label>
            </div>

            <div className="checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={showSignatures} 
                  onChange={(e) => setShowSignatures(e.target.checked)} 
                />
                Signatures (কক্ষ পরিদর্শক ও পরীক্ষার্থী)
              </label>
            </div>

            <div className="checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={showBarcodeSecurity} 
                  onChange={(e) => setShowBarcodeSecurity(e.target.checked)} 
                />
                Security Barcode & Serial No
              </label>
            </div>

            <div className="checkbox-field">
              <label>
                <input 
                  type="checkbox" 
                  checked={showInstructions} 
                  onChange={(e) => setShowInstructions(e.target.checked)} 
                />
                Official Board Rules (নিয়মাবলী)
              </label>
            </div>
          </div>

          <div className="sidebar-group">
            <h3><FileText size={16} /> Official Headers & Titles</h3>
            <div className="field-group">
              <label>শিক্ষা বোর্ড (Education Board)</label>
              <select 
                value={instituteNameBangla} 
                onChange={(e) => {
                  const val = e.target.value;
                  setInstituteNameBangla(val);
                  const found = BANGLADESH_BOARDS.find(b => b.name === val);
                  if (found) {
                    setBoardPrefix(found.prefix);
                    if (selectedPreset === 'board_cq_3part') {
                      setSerialNumber(generateBoardCQSerial(found.prefix, examYear || '26'));
                    }
                  }
                }} 
                className="input-field"
              >
                {BANGLADESH_BOARDS.map(b => (
                  <option key={b.prefix} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label>Exam Title Header</label>
              <input 
                type="text" 
                value={examTitleBangla} 
                onChange={(e) => setExamTitleBangla(e.target.value)} 
                className="input-field" 
              />
            </div>
            <div className="field-group">
              <label>Warning Sub-Header</label>
              <input 
                type="text" 
                value={subHeaderBangla} 
                onChange={(e) => setSubHeaderBangla(e.target.value)} 
                className="input-field" 
              />
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>Exam Year</label>
                <input 
                  type="text" 
                  value={examYear} 
                  onChange={(e) => setExamYear(e.target.value)} 
                  className="input-field" 
                  placeholder="26"
                />
              </div>
              <div className="field-group">
                <div className="flex items-center justify-between">
                  <label>OMR Serial Number</label>
                  <button 
                    type="button" 
                    onClick={handleGenerateNewSerial}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                    title="নতুন স্বয়ংক্রিয় বোর্ড সিরিয়াল নম্বর তৈরি করুন"
                  >
                    🎲 নতুন সিরিয়াল
                  </button>
                </div>
                <input 
                  type="text" 
                  value={serialNumber} 
                  onChange={(e) => setSerialNumber(e.target.value)} 
                  className="input-field font-mono font-bold" 
                />
              </div>
            </div>
            <div className="field-group">
              <label>প্রিন্ট কপি সংখ্যা (Batch Print Copies)</label>
              <input 
                type="number" 
                min="1" 
                max="500"
                value={batchCopies} 
                onChange={(e) => setBatchCopies(Math.max(1, parseInt(e.target.value) || 1))} 
                className="input-field" 
              />
              <span className="text-[10px] text-slate-400">প্রতিটি প্রিন্ট কপিতে স্বয়ংক্রিয়ভাবে পরবর্তী ধারাবাহিক সিরিয়াল নম্বর ও কিউআর কোড থাকবে।</span>
            </div>
          </div>
        </div>

        {/* Right Side: Pixel-Perfect Printable A4 Sheet Viewport */}
        <div className="generator-sheet-viewport">
          {/* Zoom & Dimensions Control Ribbon */}
          <div className="sheet-zoom-ribbon no-print flex items-center justify-between w-full max-w-[820px] px-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl mb-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="font-semibold text-slate-400">স্ক্রিন জুম:</span>
              {[
                { label: 'Fit (৭৫%)', val: 0.75 },
                { label: '৮৫% (স্বাভাবিক)', val: 0.85 },
                { label: '১০০% (আসল সাইজ)', val: 1.0 },
                { label: '১১০%', val: 1.1 },
              ].map(z => (
                <button
                  key={z.val}
                  type="button"
                  onClick={() => setPreviewZoom(z.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    previewZoom === z.val
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>স্ট্যান্ডার্ড A4: ২১০০ × ২৯৭০ px (৩০০ DPI রেডি)</span>
            </div>
          </div>

          <div
            className="sheet-zoom-container transition-transform duration-200 origin-top flex justify-center w-full"
            style={{ transform: `scale(${previewZoom})` }}
          >
          {selectedPreset === 'board_cq_3part' ? (
            <div ref={printContainerRef} className="w-full flex flex-col items-center">
              {batchCopies > 1 && (
                <div className="no-print mb-3 w-full max-w-[880px] p-2.5 bg-indigo-950/80 border border-indigo-700/60 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
                  <span>
                    📋 <strong>ব্যাচ প্রিন্ট মোড সক্রিয়:</strong> মোট <strong>{batchCopies}</strong> টি উত্তরপত্র প্রিন্ট হবে। প্রথমটি <code>{serialNumber}</code> এবং শেষটি <code>{incrementBoardSerial(serialNumber, batchCopies - 1)}</code>।
                  </span>
                </div>
              )}
              {/* Single preview on screen */}
              <div className="w-full flex justify-center no-print">
                <BangladeshBoardCQ3PartSheet
                  serialNumber={serialNumber}
                  examYear={examYear}
                  examId={examId}
                  instituteName={instituteNameBangla}
                  themeColor={themeColor as any}
                />
              </div>
              {/* All batch pages printed */}
              <div className="print-only w-full">
                {[...Array(batchCopies)].map((_, idx) => (
                  <BangladeshBoardCQ3PartSheet
                    key={idx}
                    serialNumber={incrementBoardSerial(serialNumber, idx)}
                    examYear={examYear}
                    examId={examId}
                    instituteName={instituteNameBangla}
                    themeColor={themeColor as any}
                    sheetIndex={idx + 1}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div 
              className={`bd-omr-printable-sheet layout-${layoutMode}`} 
              ref={printContainerRef}
              style={{
                '--omr-theme': themeStyles.primary,
                '--omr-theme-stripe': themeStyles.stripe,
                '--omr-theme-bg': themeStyles.lightBg,
                '--omr-theme-border': themeStyles.border,
              } as any}
            >
            {/* 4 Corner High-Precision Optical Registration Markers */}
            <div className="fiducial-marker top-left">
              <div className="marker-cross-circle">
                <div className="cross-line-h"></div>
                <div className="cross-line-v"></div>
              </div>
            </div>
            <div className="fiducial-marker top-right">
              <div className="marker-cross-circle">
                <div className="cross-line-h"></div>
                <div className="cross-line-v"></div>
              </div>
            </div>
            <div className="fiducial-marker bottom-left">
              <div className="marker-cross-circle">
                <div className="cross-line-h"></div>
                <div className="cross-line-v"></div>
              </div>
            </div>
            <div className="fiducial-marker bottom-right">
              <div className="marker-cross-circle">
                <div className="cross-line-h"></div>
                <div className="cross-line-v"></div>
              </div>
            </div>

            {/* Continuous Lateral Optical Clocking Tracks */}
            <div className="timing-tracks left">
              {[...Array(25)].map((_, i) => <div key={i} className="timing-block"></div>)}
            </div>
            <div className="timing-tracks right">
              {[...Array(25)].map((_, i) => <div key={i} className="timing-block"></div>)}
            </div>

            {/* Sheet Header Area */}
            <div className="sheet-header">
              {/* Universal OMR QR Code Badge */}
              <div 
                className="omr-qr-code-box"
                style={{ 
                  position: 'absolute', 
                  right: 4, 
                  top: 0, 
                  textAlign: 'center',
                  background: '#ffffff',
                  padding: '2px',
                  border: '1px solid #111',
                  borderRadius: '4px'
                }}
              >
                <QRCodeSVG
                  value={JSON.stringify({
                    examId: examId || 'BOARD_EXAM',
                    setId: setId || `SET_${setName || 'A'}`,
                    setName: setName || 'A',
                    template: selectedPreset || `board_${numQuestions}q`,
                    title: examTitleBangla || 'Board Exam',
                    v: 1
                  })}
                  size={52}
                  level="M"
                  includeMargin={false}
                />
                <div style={{ fontSize: '7.5px', fontFamily: 'monospace', color: '#111', fontWeight: 'bold', marginTop: '1px' }}>
                  {`SET-${setName || 'A'}`}
                </div>
              </div>

              <div className="header-year-row">
                <span className="exam-dotted-line">....................................................................................</span>
                <span className="year-label">পরীক্ষা</span>
                <div className="digits-boxes">
                  <div className="digit-cell">২</div>
                  <div className="digit-cell">০</div>
                  <div className="digit-cell">{examYear[0] || ''}</div>
                  <div className="digit-cell">{examYear[1] || ''}</div>
                </div>
              </div>

              <div className="header-titles">
                {instituteNameBangla && <div className="institute-title">{instituteNameBangla}</div>}
                <div className="exam-main-title">{examTitleBangla}</div>
                <div className="warning-banner-top">
                  {subHeaderBangla}
                </div>
                <div className="pen-instruction-banner">
                  অবশ্যই কালো বল-পয়েন্ট কলম দিয়ে বৃত্ত ভরাট করতে হবে
                </div>
              </div>
            </div>

            {/* Layout Branch 1: Board Split Layout (Exact Authentic HSC/SSC Specification) */}
            {layoutMode === 'split' ? (
              <div className="sheet-content-grid split-layout">
                {/* Left Column: Questions Grid (2 Columns, 25 Rows with Alternating Pink Horizontal Stripes) */}
                <div 
                  className="questions-layout-area" 
                  style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}
                >
                  {[...Array(numColumns)].map((_, colIdx) => {
                    const startQ = colIdx * qPerCol + 1;
                    const endQ = Math.min(numQuestions, (colIdx + 1) * qPerCol);
                    if (startQ > numQuestions) return null;

                    return (
                      <div key={colIdx} className="questions-column">
                        <div className="col-header-row">
                          <div className="th-q">
                            <div>প্রশ্ন</div>
                            <div>নম্বর</div>
                          </div>
                          <div className="th-ans">উত্তর</div>
                        </div>

                        <div className="questions-rows-container">
                          {[...Array(endQ - startQ + 1)].map((_, qIdx) => {
                            const qNum = startQ + qIdx;
                            const formattedQNum = numberingLanguage === 'BANGLA' ? toBanglaNumber(qNum) : qNum;
                            const isStripe = qIdx % 2 === 0; // Alternating horizontal stripe (odd questions get authentic tint)

                            return (
                              <div key={qNum} className={`omr-q-row ${isStripe ? 'row-stripe' : ''}`}>
                                <div className="q-number-box">
                                  {formattedQNum}
                                </div>
                                <div className="q-bubbles-group">
                                  {optionsList.map(opt => (
                                    <div key={opt} className="omr-bubble-circle">
                                      <span>{opt}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Identity Grids, Signatures & Authentic Board Rules */}
                <div className="identity-and-rules-area">
                  {/* Top Block: Roll Number, Set Code & Invigilator Signature */}
                  <div className="id-blocks-row top-row">
                    {showRollNumber && (
                      <div className="vertical-grid-card roll-grid">
                        <div className="grid-card-title">রোল নম্বর</div>
                        <div className="write-boxes-table">
                          {[...Array(rollDigits)].map((_, i) => (
                            <div key={i} className="write-box-cell"></div>
                          ))}
                        </div>
                        <div className="bubbles-matrix-columns">
                          {[...Array(rollDigits)].map((_, colIdx) => {
                            const isColStripe = colIdx % 2 === 0;
                            return (
                              <div key={colIdx} className={`digit-column-strip ${isColStripe ? 'col-stripe' : ''}`}>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                  <div key={digit} className="matrix-bubble">
                                    <span>{numberingLanguage === 'BANGLA' ? toBanglaNumber(digit) : digit}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="timing-divider-dash"></div>

                    {showSetCode && (
                      <div className="vertical-grid-card set-grid">
                        <div className="grid-card-title">সেট কোড</div>
                        <div className="write-boxes-table single">
                          <div className="write-box-cell"></div>
                        </div>
                        <div className="digit-column-strip col-stripe single">
                          {(setOptionsType === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D']).map(s => (
                            <div key={s} className="matrix-bubble set-bubble">
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="timing-divider-dash"></div>

                    {showSignatures && (
                      <div className="invigilator-signature-block">
                        <div className="sign-box-item">
                          <div className="sign-rectangular-box"></div>
                          <span className="sign-caption">কক্ষ পরিদর্শকের স্বাক্ষর</span>
                        </div>
                        <div className="sign-box-item date-item">
                          <div className="sign-rectangular-box"></div>
                          <span className="sign-caption">তারিখ</span>
                        </div>
                        <div className="side-timing-sync-bar"></div>
                      </div>
                    )}
                  </div>

                  {/* Middle Block: Registration Number & Subject Code */}
                  {(showRegNumber || showSubjectCode) && (
                    <div className="id-blocks-row middle-row">
                      {showRegNumber && (
                        <div className="vertical-grid-card reg-grid">
                          <div className="grid-card-title">রেজিস্ট্রেশন নম্বর</div>
                          <div className="write-boxes-table">
                            {[...Array(regDigits)].map((_, i) => (
                              <div key={i} className="write-box-cell"></div>
                            ))}
                          </div>
                          <div className="bubbles-matrix-columns">
                            {[...Array(regDigits)].map((_, colIdx) => {
                              const isColStripe = colIdx % 2 === 0;
                              return (
                                <div key={colIdx} className={`digit-column-strip ${isColStripe ? 'col-stripe' : ''}`}>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                    <div key={digit} className="matrix-bubble">
                                      <span>{numberingLanguage === 'BANGLA' ? toBanglaNumber(digit) : digit}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="timing-divider-dash"></div>

                      {showSubjectCode && (
                        <div className="vertical-grid-card sub-grid">
                          <div className="grid-card-title">বিষয় কোড</div>
                          <div className="write-boxes-table">
                            {[...Array(subjectCodeDigits)].map((_, i) => (
                              <div key={i} className="write-box-cell"></div>
                            ))}
                          </div>
                          <div className="bubbles-matrix-columns">
                            {[...Array(subjectCodeDigits)].map((_, colIdx) => {
                              const isColStripe = colIdx % 2 === 0;
                              return (
                                <div key={colIdx} className={`digit-column-strip ${isColStripe ? 'col-stripe' : ''}`}>
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                                    <div key={digit} className="matrix-bubble">
                                      <span>{numberingLanguage === 'BANGLA' ? toBanglaNumber(digit) : digit}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="side-timing-sync-bar"></div>
                    </div>
                  )}

                  {/* Candidate Signature & Barcode Strip */}
                  <div className="candidate-barcode-row">
                    {showSignatures && (
                      <div className="candidate-sign-container">
                        <div className="sign-rectangular-box"></div>
                        <span className="sign-caption">পরীক্ষার্থীর পূর্ণ স্বাক্ষর ও তারিখ</span>
                      </div>
                    )}
                    {showBarcodeSecurity && (
                      <div className="barcode-badge-container">
                        <div className="barcode-svg-wrap">
                          {renderBarcodeSvg()}
                        </div>
                        <div className="barcode-label">
                          <ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} />
                          <span>OMR SL NO: <strong>{serialNumber}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Authentic Board Instructions Section (Exact Match to Bangladesh SSC/HSC) */}
                  {showInstructions && (
                    <div className="official-instructions-section">
                      <div className="instructions-red-warning">
                        (বি.দ্র. কোন প্রকার সীল মোহর দেয়া নিষেধ)
                        <div className="red-divider-line"></div>
                      </div>

                      <div className="rules-heading-title">নিয়মাবলী</div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ১ । বৃত্তাকার ঘরগুলো এমনভাবে ভরাট করতে হবে যাতে এগুলোর ভেতরের লেখাটি দেখা না যায়।
                        </div>
                        <div className="fill-diagram-row">
                          <div className="diagram-method correct">
                            <span className="method-label">সঠিক পদ্ধতি:</span>
                            <div className="fill-circle solid-black"></div>
                          </div>
                          <div className="diagram-method wrong">
                            <span className="method-label">ভুল পদ্ধতি:</span>
                            <div className="wrong-samples-row">
                              <div className="fill-circle wrong-dot">
                                <div className="dot-inner"></div>
                              </div>
                              <div className="fill-circle wrong-letter">গ</div>
                              <div className="fill-circle wrong-check">✔</div>
                              <div className="fill-circle wrong-cross">✖</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ২ । বৃত্তাকার ঘরগুলো অবশ্যই বল-পয়েন্ট কলম দিয়ে ভরাট করতে হবে।
                        </div>
                      </div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ৩ । উত্তরপত্রে কোন অবাঞ্ছিত দাগ দেওয়া যাবে না।
                        </div>
                      </div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ৪ । উত্তরপত্রটিকে কোন অবস্থাতেই ভাঁজ করা যাবে না।
                        </div>
                      </div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ৫ । পরিষ্কার পরিচ্ছন্ন ও ভাঁজবিহীন উত্তরপত্র মেশিনে মূল্যায়নের জন্য অপরিহার্য।
                        </div>
                      </div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ৬ । সেট কোড না লিখলে / বৃত্ত ভরাট না করলে উত্তরপত্র বাতিল হবে।
                        </div>
                      </div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ৭ । এক প্রশ্নের উত্তরে একাধিক বৃত্ত ভরাট করলে বা ঘষাঘষি করলে উক্ত উত্তরটি বাতিল গণ্য হবে।
                        </div>
                      </div>

                      <div className="official-rule-item">
                        <div className="rule-text">
                          ৮ । পরীক্ষা শেষে কক্ষ পরিদর্শকের স্বাক্ষর নিশ্চিত করে উত্তরপত্রটি পরিদর্শকের নিকট জমা দিতে হবে।
                        </div>
                      </div>

                      <div className="board-compliance-footer">
                        ✔ বাংলাদেশ শিক্ষা বোর্ড ও বিশ্ববিদ্যালয় ভর্তি পরীক্ষা ওএমআর স্ট্যান্ডার্ড অনুসারী
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Layout Branch 2: Stacked Admission Layout (100-Question University Admission Tests) */
              <div className="sheet-content-grid stacked-layout">
                {/* Top Identification Band */}
                <div className="admission-top-id-band">
                  {showRollNumber && (
                    <div className="vertical-grid-card roll-grid compact">
                      <div className="grid-card-title">রোল নম্বর (ROLL)</div>
                      <div className="write-boxes-table">
                        {[...Array(rollDigits)].map((_, i) => (
                          <div key={i} className="write-box-cell"></div>
                        ))}
                      </div>
                      <div className="bubbles-matrix-columns">
                        {[...Array(rollDigits)].map((_, colIdx) => (
                          <div key={colIdx} className={`digit-column-strip ${colIdx % 2 === 0 ? 'col-stripe' : ''}`}>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                              <div key={digit} className="matrix-bubble">
                                <span>{numberingLanguage === 'BANGLA' ? toBanglaNumber(digit) : digit}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showSetCode && (
                    <div className="vertical-grid-card set-grid compact">
                      <div className="grid-card-title">সেট (SET)</div>
                      <div className="write-boxes-table single">
                        <div className="write-box-cell"></div>
                      </div>
                      <div className="digit-column-strip col-stripe single">
                        {(setOptionsType === 'BANGLA' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D']).map(s => (
                          <div key={s} className="matrix-bubble set-bubble">
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showSignatures && (
                    <div className="signatures-stacked-group">
                      <div className="sign-box-item">
                        <div className="sign-rectangular-box"></div>
                        <span className="sign-caption">কক্ষ পরিদর্শকের স্বাক্ষর ও তারিখ</span>
                      </div>
                      <div className="sign-box-item">
                        <div className="sign-rectangular-box"></div>
                        <span className="sign-caption">পরীক্ষার্থীর পূর্ণ স্বাক্ষর ও তারিখ</span>
                      </div>
                    </div>
                  )}

                  {showInstructions && (
                    <div className="admission-compact-rules">
                      <div className="instructions-red-warning compact">
                        (বি.দ্র. কোন প্রকার সীল মোহর দেয়া নিষেধ)
                      </div>
                      <div className="rules-heading-title compact">ভর্তি পরীক্ষা নির্দেশাবলী</div>
                      <ul className="admission-rules-bullets">
                        <li>কালো বলপয়েন্ট কলম দিয়ে বৃত্ত সম্পূর্ণ ভরাট করুন।</li>
                        <li>উত্তরপত্রে অবাঞ্ছিত দাগ বা কাটাকাটি গ্রহণযোগ্য নয়।</li>
                        <li>সঠিক ভরাট: <span className="sample-mini-dot">⚫</span> | ভুল: <span>❌ ✔ ◐ ⊙</span></li>
                      </ul>
                      {showBarcodeSecurity && (
                        <div className="admission-barcode-strip">
                          {renderBarcodeSvg()}
                          <div className="barcode-serial-text">SL: {serialNumber}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Full-Width Questions Matrix (4 or 5 Columns) */}
                <div 
                  className="questions-layout-area full-width" 
                  style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)` }}
                >
                  {[...Array(numColumns)].map((_, colIdx) => {
                    const startQ = colIdx * qPerCol + 1;
                    const endQ = Math.min(numQuestions, (colIdx + 1) * qPerCol);
                    if (startQ > numQuestions) return null;

                    return (
                      <div key={colIdx} className="questions-column">
                        <div className="col-header-row">
                          <div className="th-q">
                            <div>প্রশ্ন</div>
                          </div>
                          <div className="th-ans">উত্তর</div>
                        </div>

                        <div className="questions-rows-container">
                          {[...Array(endQ - startQ + 1)].map((_, qIdx) => {
                            const qNum = startQ + qIdx;
                            const formattedQNum = numberingLanguage === 'BANGLA' ? toBanglaNumber(qNum) : qNum;
                            const isStripe = qIdx % 2 === 0;

                            return (
                              <div key={qNum} className={`omr-q-row ${isStripe ? 'row-stripe' : ''}`}>
                                <div className="q-number-box">
                                  {formattedQNum}
                                </div>
                                <div className="q-bubbles-group">
                                  {optionsList.map(opt => (
                                    <div key={opt} className="omr-bubble-circle">
                                      <span>{opt}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Optical Registration Bar */}
            <div className="timing-marker-bottom-center"></div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
