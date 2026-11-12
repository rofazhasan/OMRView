"use client";

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toBanglaNumber, generateBoardCQSerial } from '../utils/banglaUtils';

export interface BangladeshBoardCQ3PartSheetProps {
  serialNumber?: string;
  examYear?: string;
  examId?: string;
  instituteName?: string;
  examTitle?: string;
  themeColor?: 'magenta' | 'black' | 'blue';
  examType?: 'SSC' | 'HSC' | 'DIBS';
  sheetIndex?: number;
}

/**
 * Official Bangladesh Government / Education Board Crest Monogram SVG
 */
const OfficialBoardEmblem = ({ size = 26, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className="cq-board-emblem inline-block align-middle"
  >
    <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="3" fill="#ffffff" />
    <circle cx="50" cy="50" r="41" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
    {/* Water lily blossom center (শাপলা) */}
    <path d="M50 24 C46 34 38 44 32 48 C36 46 44 45 47 48 C48 38 50 30 50 24 Z" fill={color} />
    <path d="M50 24 C54 34 62 44 68 48 C64 46 56 45 53 48 C52 38 50 30 50 24 Z" fill={color} />
    <path d="M50 22 C49 32 46 44 50 50 C54 44 51 32 50 22 Z" fill={color} />
    {/* Base water waves (নদীমাতৃক বাংলাদেশ) */}
    <path d="M26 62 Q50 54 74 62 Q50 58 26 62 Z" fill={color} />
    <path d="M30 67 Q50 61 70 67 Q50 64 30 67 Z" fill={color} />
    <path d="M36 72 Q50 68 64 72 Q50 70 36 72 Z" fill={color} />
    {/* Surrounding rice paddy sheaves (ধানের শীষ) */}
    <path d="M24 50 C22 40 26 30 32 26 C28 32 28 42 30 48 Z" fill={color} />
    <path d="M76 50 C78 40 74 30 68 26 C72 32 72 42 70 48 Z" fill={color} />
    {/* 4 National Stars */}
    <polygon points="50,11 51.5,14 55,14 52,16 53.5,19 50,17 46.5,19 48,16 45,14 48.5,14" fill={color} />
  </svg>
);

export function BangladeshBoardCQ3PartSheet({
  serialNumber,
  examYear = '২৬',
  examId = 'BOARD_CQ_EXAM',
  instituteName = 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, ঢাকা',
  examTitle = 'এস.এস.সি / এইচ.এস.সি / ডিআইবিএস পরীক্ষা',
  themeColor = 'magenta',
  examType = 'HSC'
}: BangladeshBoardCQ3PartSheetProps) {
  // If serialNumber is missing or placeholder T2301139641, generate a dynamic authentic serial
  const effectiveSerial = React.useMemo(() => {
    if (serialNumber && serialNumber !== 'T2301139641') {
      return serialNumber;
    }
    return generateBoardCQSerial('T', examYear || '26');
  }, [serialNumber, examYear]);

  // Extract authentic 2 Bengali digits for exam year (e.g. '2026' or '26' or '২৬' -> ['২', '৬'])
  const yearDigits = React.useMemo(() => {
    const raw = String(examYear || '26').trim();
    const enDigits = raw.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d))).replace(/\D/g, '');
    const lastTwo = enDigits.length >= 2 ? enDigits.slice(-2) : enDigits.padStart(2, '26');
    return [toBanglaNumber(lastTwo[0] || '2'), toBanglaNumber(lastTwo[1] || '6')];
  }, [examYear]);

  // Dynamic exam level options based on examTitle
  const examTypeOptions = React.useMemo(() => {
    const title = (examTitle || '').toLowerCase();
    if (title.includes('দাখিল') || title.includes('আলিম')) {
      return ['দাখিল', 'আলিম', 'অন্যান্য'];
    }
    if (title.includes('জেএসসি') || title.includes('জেডিসি')) {
      return ['জেএসসি', 'জেডিসি', 'অন্যান্য'];
    }
    if (title.includes('নির্বাচনী') || title.includes('বার্ষিক') || title.includes('মডেল') || title.includes('অর্ধ-বার্ষিক')) {
      return ['অর্ধ-বার্ষিক', 'বার্ষিক', 'নির্বাচনী'];
    }
    // Default Bangladesh Board Options
    return ['এসএসসি', 'এইচএসসি', 'ডিআইবিএস'];
  }, [examTitle]);

  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Theme color mappings
  const themePalette = {
    magenta: {
      primary: '#d91884',
      lightStripe: '#fdf2f8',
      tintBg: '#fce7f3',
      border: '#be185d',
    },
    black: {
      primary: '#111827',
      lightStripe: '#f9fafb',
      tintBg: '#f3f4f6',
      border: '#374151',
    },
    blue: {
      primary: '#1d4ed8',
      lightStripe: '#eff6ff',
      tintBg: '#dbeafe',
      border: '#1e40af',
    }
  }[themeColor] || {
    primary: '#d91884',
    lightStripe: '#fdf2f8',
    tintBg: '#fce7f3',
    border: '#be185d',
  };

  return (
    <div 
      className="bd-cq-3part-sheet print-break-after"
      style={{
        '--cq-primary': themePalette.primary,
        '--cq-light-stripe': themePalette.lightStripe,
        '--cq-tint-bg': themePalette.tintBg,
        '--cq-border': themePalette.border,
      } as React.CSSProperties}
    >
      {/* 4 Optical Registration Crosshair Markers (⊕) */}
      <div className="cq-crosshair top-left">⊕</div>
      <div className="cq-crosshair top-right">⊕</div>
      <div className="cq-crosshair bottom-left">⊕</div>
      <div className="cq-crosshair bottom-right">⊕</div>

      {/* Lateral Continuous Timing Tracks (Left & Right) */}
      <div className="cq-side-timing left">
        {[...Array(40)].map((_, i) => <div key={i} className="cq-sync-block"></div>)}
      </div>
      <div className="cq-side-timing right">
        {[...Array(40)].map((_, i) => <div key={i} className="cq-sync-block"></div>)}
      </div>

      {/* ========================================================================= */}
      {/* PART 1: পরীক্ষার্থীর অংশ (Student Identification Section)                 */}
      {/* ========================================================================= */}
      <section className="cq-part-container part-1-student">
        <div className="cq-part-header cq-formal-header-row">
          {/* Section Tag */}
          <div className="cq-part-badge" style={{ color: themePalette.primary, borderColor: themePalette.border, background: themePalette.tintBg }}>
            পরীক্ষার্থীর অংশ
          </div>

          {/* School / Exam Name and Info in the SAME line */}
          <div className="cq-header-info-inline">
            <OfficialBoardEmblem size={22} color={themePalette.primary} />
            <span className="cq-inline-institute">{instituteName}</span>
            <span className="cq-inline-separator">•</span>
            <span className="cq-inline-exam">{examTitle} - ২০</span>
            <div className="cq-year-boxes">
              <div className="cq-digit-box">{yearDigits[0]}</div>
              <div className="cq-digit-box">{yearDigits[1]}</div>
            </div>
          </div>

          {/* Tracking Info on the same line */}
          <div className="cq-tracking-box-inline">
            <div className="cq-serial-number">{effectiveSerial}</div>
            <div className="cq-qr-wrapper">
              <QRCodeSVG
                value={JSON.stringify({
                  part: 'P1_STUDENT',
                  sn: effectiveSerial,
                  ex: examId,
                  b: instituteName,
                  t: examTitle,
                  yr: yearDigits.join(''),
                  v: 1
                })}
                size={34}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* Black Barcode Synchronization Band */}
        <div className="cq-sync-band">
          <span className="cq-sync-warning">এ বক্সের মধ্যে কোন দাগ দেয়া যাবে না</span>
          <div className="cq-sync-bar-series">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="cq-sync-rect"></div>
            ))}
          </div>
        </div>
        <div className="cq-sub-instruction">
          অবশ্যই কালো কালির বলপয়েন্ট কলম দিয়ে বৃত্ত ভরাট করতে হবে।
        </div>

        {/* Main Grid: Exam Type + Roll + Reg + Subject Code + Extra Scripts + Signature */}
        <div className="cq-p1-grid-layout">
          {/* 1. Exam Level Selector (No set code in CQ) */}
          <div className="cq-field-column exam-type-col">
            <div className="cq-column-title">পরীক্ষা</div>
            <div className="cq-exam-bubble-options">
              {examTypeOptions.map((opt) => (
                <label key={opt} className="cq-exam-option">
                  <span className={`cq-bubble-circle ${examType === opt ? 'active' : ''}`}></span>
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Roll Number (6 Digits) */}
          <div className="cq-field-column roll-col">
            <div className="cq-column-title">রোল নম্বর</div>
            <div className="cq-write-boxes-row">
              {[...Array(6)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(6)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item">
                      <span>{toBanglaNumber(d)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Registration Number (10 Digits) */}
          <div className="cq-field-column reg-col">
            <div className="cq-column-title">রেজিস্ট্রেশন নম্বর</div>
            <div className="cq-write-boxes-row">
              {[...Array(10)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(10)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item">
                      <span>{toBanglaNumber(d)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Subject Code (3 Digits) */}
          <div className="cq-field-column sub-col">
            <div className="cq-column-title">বিষয় কোড</div>
            <div className="cq-write-boxes-row">
              {[...Array(3)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(3)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item">
                      <span>{toBanglaNumber(d)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Extra Script Count (2 Digits) */}
          <div className="cq-field-column extra-col">
            <div className="cq-column-title">অতিরিক্ত<br />উত্তরপত্রের সংখ্যা</div>
            <div className="cq-write-boxes-row">
              {[...Array(2)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(2)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item">
                      <span>{toBanglaNumber(d)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 6. Invigilator Signature Box */}
          <div className="cq-field-column invigilator-col">
            <div className="cq-sig-box">
              <div className="cq-sig-title">কক্ষ পরিদর্শকের স্বাক্ষর</div>
              <div className="cq-sig-blank-area"></div>
            </div>
            <div className="cq-sig-box date-box">
              <div className="cq-sig-title">তারিখ:</div>
              <div className="cq-sig-blank-area sm"></div>
            </div>
            <div className="cq-sig-warning-note">
              (বিঃদ্রঃ কোন প্রকার সীলমোহর দেয়া যাবে না)<br />
              বক্সের বাইরে স্বাক্ষর দেয়া যাবে না
            </div>
          </div>
        </div>

        {/* Bottom Perforation Marker for Part 1 */}
        <div className="cq-perforation-divider">
          <span className="cq-scissor-icon">✂️</span>
          <span className="cq-perforation-label">পরীক্ষক / প্র: পরীক্ষকের অংশ</span>
          <div className="cq-dashed-line"></div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PART 2: পরীক্ষক ও প্রধান পরীক্ষকের অংশ (Examiner Evaluation Section)       */}
      {/* ========================================================================= */}
      <section className="cq-part-container part-2-examiner">
        <div className="cq-part-header cq-formal-header-row">
          {/* Section Tag */}
          <div className="cq-part-badge" style={{ color: themePalette.primary, borderColor: themePalette.border, background: themePalette.tintBg }}>
            পরীক্ষক / প্র: পরীক্ষকের অংশ
          </div>

          {/* School / Exam Name and Info in the SAME line */}
          <div className="cq-header-info-inline">
            <OfficialBoardEmblem size={20} color={themePalette.primary} />
            <span className="cq-inline-institute sm">{instituteName}</span>
            <span className="cq-inline-separator">•</span>
            <span className="cq-inline-exam sm">{examTitle} - ২০</span>
            <div className="cq-year-boxes">
              <div className="cq-digit-box">{yearDigits[0]}</div>
              <div className="cq-digit-box">{yearDigits[1]}</div>
            </div>
          </div>

          {/* Tracking QR on the same line */}
          <div className="cq-tracking-box-inline">
            <div className="cq-qr-wrapper sm">
              <QRCodeSVG
                value={JSON.stringify({
                  part: 'P2_EXAMINER',
                  sn: effectiveSerial,
                  v: 1
                })}
                size={32}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* Sync Band */}
        <div className="cq-sync-band">
          <span className="cq-sync-warning">এ বক্সের মধ্যে কোন দাগ দেয়া যাবে না</span>
          <div className="cq-sync-bar-series">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="cq-sync-rect"></div>
            ))}
          </div>
        </div>
        <div className="cq-sub-instruction">
          অবশ্যই কালো কালির বলপয়েন্ট কলম দিয়ে বৃত্ত ভরাট করতে হবে।
        </div>

        {/* Examiner OMR Matrix */}
        <div className="cq-p2-grid-layout">
          {/* 1. Subject Code (3 Digits) */}
          <div className="cq-field-column">
            <div className="cq-column-title">বিষয় কোড</div>
            <div className="cq-write-boxes-row">
              {[...Array(3)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(3)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item"><span>{toBanglaNumber(d)}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Examiner Code (4 Digits) */}
          <div className="cq-field-column">
            <div className="cq-column-title">পরীক্ষক কোড</div>
            <div className="cq-write-boxes-row">
              {[...Array(4)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(4)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item"><span>{toBanglaNumber(d)}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Script Serial Number (4 Digits) */}
          <div className="cq-field-column">
            <div className="cq-column-title">উত্তরপত্রের ক্রমিক নম্বর</div>
            <div className="cq-write-boxes-row">
              {[...Array(4)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(4)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item"><span>{toBanglaNumber(d)}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Extra Scripts (2 Digits) */}
          <div className="cq-field-column">
            <div className="cq-column-title">অতিরিক্ত<br />উত্তরপত্রের সংখ্যা</div>
            <div className="cq-write-boxes-row">
              {[...Array(2)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(2)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item"><span>{toBanglaNumber(d)}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Obtained Marks (প্রাপ্ত নম্বর - 3 Digits: শতক, দশক, একক) */}
          <div className="cq-field-column highlight-marks">
            <div className="cq-column-title">প্রাপ্ত নম্বর</div>
            <div className="cq-write-boxes-row">
              {[...Array(3)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(3)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item"><span>{toBanglaNumber(d)}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 6. Head Examiner Marks (3 Digits) */}
          <div className="cq-field-column">
            <div className="cq-column-title sm">প্রধান পরীক্ষক কর্তৃক পরিবর্তনের পর প্রাপ্ত মোট নম্বর</div>
            <div className="cq-write-boxes-row">
              {[...Array(3)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
            <div className="cq-digits-matrix">
              {[...Array(3)].map((_, colIdx) => (
                <div key={colIdx} className={`cq-digit-strip ${colIdx % 2 === 0 ? 'striped' : ''}`}>
                  {digits.map(d => (
                    <div key={d} className="cq-bubble-item"><span>{toBanglaNumber(d)}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* 7. Examiner & Scrutinizer Signatures */}
          <div className="cq-field-column signatures-col">
            <div className="cq-stacked-sig-table">
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label">পরীক্ষকের স্বাক্ষর</div>
                <div className="cq-sig-cell-blank"></div>
              </div>
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label">নিরীক্ষকের স্বাক্ষর</div>
                <div className="cq-sig-cell-blank"></div>
              </div>
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label">প্রধান পরীক্ষকের স্বাক্ষর</div>
                <div className="cq-sig-cell-blank"></div>
              </div>
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label">প্রধান পরীক্ষকের কোড</div>
                <div className="cq-head-code-boxes">
                  {[...Array(4)].map((_, i) => <div key={i} className="cq-mini-box"></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Perforation Line for Part 2 */}
        <div className="cq-perforation-divider">
          <span className="cq-scissor-icon">✂️</span>
          <span className="cq-perforation-label">উত্তরপত্রের অংশ</span>
          <div className="cq-dashed-line"></div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PART 3: উত্তরপত্রের অংশ (Script Attached Marks Breakdown Table)           */}
      {/* ========================================================================= */}
      <section className="cq-part-container part-3-script">
        <div className="cq-part-header cq-formal-header-row">
          {/* Section Tag */}
          <div className="cq-part-badge" style={{ color: themePalette.primary, borderColor: themePalette.border, background: themePalette.tintBg }}>
            উত্তরপত্রের অংশ
          </div>

          {/* School / Exam Name and Info in the SAME line */}
          <div className="cq-header-info-inline">
            <OfficialBoardEmblem size={20} color={themePalette.primary} />
            <span className="cq-inline-institute sm">{instituteName}</span>
            <span className="cq-inline-separator">•</span>
            <span className="cq-inline-exam sm">{examTitle} - ২০</span>
            <div className="cq-year-boxes">
              <div className="cq-digit-box">{yearDigits[0]}</div>
              <div className="cq-digit-box">{yearDigits[1]}</div>
            </div>
          </div>

          {/* Tracking Info on the same line */}
          <div className="cq-tracking-box-inline">
            <div className="cq-serial-number sm">{effectiveSerial}</div>
            <div className="cq-qr-wrapper sm">
              <QRCodeSVG
                value={JSON.stringify({
                  part: 'P3_BREAKDOWN',
                  sn: effectiveSerial,
                  ex: examId,
                  b: instituteName,
                  t: examTitle,
                  yr: yearDigits.join(''),
                  v: 1
                })}
                size={32}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* Sync Band */}
        <div className="cq-sync-band">
          <span className="cq-sync-warning">এ বক্সের মধ্যে কোন দাগ দেয়া যাবে না</span>
          <div className="cq-sync-bar-series">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="cq-sync-rect"></div>
            ))}
          </div>
        </div>

        {/* Identification Row (Subject Code, Examiner Code, Script Serial) */}
        <div className="cq-p3-id-row">
          <div className="cq-p3-id-cell">
            <span className="cq-label">বিষয় কোড</span>
            <div className="cq-boxes-wrap">
              {[...Array(3)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
          </div>

          <div className="cq-p3-id-cell">
            <span className="cq-label">পরীক্ষক কোড</span>
            <div className="cq-boxes-wrap">
              {[...Array(4)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
          </div>

          <div className="cq-p3-qr-wrap">
            <QRCodeSVG
              value={JSON.stringify({
                part: 'P3_BREAKDOWN',
                sn: effectiveSerial,
                v: 1
              })}
              size={34}
              level="M"
              includeMargin={false}
            />
          </div>

          <div className="cq-p3-id-cell">
            <span className="cq-label">উত্তরপত্রের মধ্যের অংশে ব্যবহৃত ক্রমিক নম্বর</span>
            <div className="cq-boxes-wrap">
              {[...Array(4)].map((_, i) => <div key={i} className="cq-write-box"></div>)}
            </div>
          </div>
        </div>

        {/* Question-by-Question Marks Table (Questions 1 to 20 + Grand Total) */}
        <div className="cq-questions-marks-layout">
          <div className="cq-q-table-wrapper">
            <table className="cq-q-marks-table">
              <thead>
                <tr>
                  <th className="cq-th-header-col">প্রশ্ন<br />নম্বর</th>
                  {[...Array(20)].map((_, i) => (
                    <th key={i} className="cq-th-qnum">{toBanglaNumber(i + 1)}</th>
                  ))}
                  <th className="cq-th-total">প্রাপ্ত<br />মোট নম্বর</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cq-td-label">নম্বর</td>
                  {[...Array(20)].map((_, i) => (
                    <td key={i} className="cq-td-score-cell"></td>
                  ))}
                  <td className="cq-td-total-cell"></td>
                </tr>
              </tbody>
            </table>
            <div className="cq-table-note">
              প্রাপ্ত মোট নম্বর বাক্সের অংশে প্রাপ্ত নম্বরের ঘরে তুলে বৃত্ত ভরাট করতে হবে
            </div>
          </div>

          {/* Right Signature Table */}
          <div className="cq-p3-signatures-block">
            <div className="cq-stacked-sig-table">
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label sm">পরীক্ষকের স্বাক্ষর</div>
                <div className="cq-sig-cell-blank"></div>
              </div>
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label sm">নিরীক্ষকের স্বাক্ষর</div>
                <div className="cq-sig-cell-blank"></div>
              </div>
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label sm">প্রধান পরীক্ষকের স্বাক্ষর</div>
                <div className="cq-sig-cell-blank"></div>
              </div>
              <div className="cq-sig-row">
                <div className="cq-sig-cell-label sm">প্রধান পরীক্ষকের কোড</div>
                <div className="cq-head-code-boxes">
                  {[...Array(4)].map((_, i) => <div key={i} className="cq-mini-box"></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
