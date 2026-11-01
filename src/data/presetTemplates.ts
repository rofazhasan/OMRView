import type { Template, EvaluationConfig } from '../types/omr';

export interface PresetData {
  id: string;
  name: string;
  description: string;
  template: Template;
  evaluationConfig: EvaluationConfig;
}

export const PRESET_TEMPLATES: PresetData[] = [
  {
    id: 'bangladesh_board_hsc',
    name: '🇧🇩 Bangladesh HSC / SSC Board (50 Qs)',
    description: 'Official Bangladesh Education Board standard format with 6-digit Roll, 10-digit Registration, 3-digit Subject Code, Set Code (ক, খ, গ, ঘ) and 50 MCQs.',
    template: {
      pageDimensions: [1240, 1754],
      bubbleDimensions: [22, 22],
      preProcessors: [{ name: 'CropOnMarkers' }],
      customLabels: {
        Roll: ['roll1..6'],
        Registration: ['reg1..10'],
        SubjectCode: ['sub1..3'],
        Set: ['Set'],
      },
      fieldBlocks: {
        Roll: {
          origin: [680, 260],
          bubblesGap: 28,
          labelsGap: 34,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: ['roll1..6'],
          section: 'Roll Number',
        },
        SetCode: {
          origin: [920, 260],
          bubblesGap: 28,
          labelsGap: 0,
          bubbleValues: ['ক', 'খ', 'গ', 'ঘ'],
          direction: 'horizontal',
          fieldLabels: ['Set'],
          section: 'Set Code',
        },
        Registration: {
          origin: [680, 680],
          bubblesGap: 28,
          labelsGap: 32,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: ['reg1..10'],
          section: 'Registration Number',
        },
        SubjectCode: {
          origin: [1020, 680],
          bubblesGap: 28,
          labelsGap: 34,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: ['sub1..3'],
          section: 'Subject Code',
        },
        QuestionsCol1: {
          origin: [60, 220],
          bubblesGap: 32,
          labelsGap: 28,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: ['q1..25'],
          bubbleValues: ['ক', 'খ', 'গ', 'ঘ'],
          section: 'Part 1 (Questions 1-25)',
        },
        QuestionsCol2: {
          origin: [340, 220],
          bubblesGap: 32,
          labelsGap: 28,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: ['q26..50'],
          bubbleValues: ['ক', 'খ', 'গ', 'ঘ'],
          section: 'Part 2 (Questions 26-50)',
        },
      },
    },
    evaluationConfig: {
      examName: 'উচ্চ মাধ্যমিক সার্টিফিকেট পরীক্ষা (HSC Exam)',
      examCode: 'HSC-2026',
      rollNumberField: 'Roll',
      setNameField: 'Set',
      markingSchemes: {
        default: { correct: 1, incorrect: -0.25, unmarked: 0, bonus: 1 },
      },
      answerKey: {
        q1: 'ক', q2: 'খ', q3: 'গ', q4: 'ঘ', q5: 'ক', q6: 'খ', q7: 'গ', q8: 'ঘ', q9: 'ক', q10: 'খ',
        q11: 'গ', q12: 'ঘ', q13: 'ক', q14: 'খ', q15: 'গ', q16: 'ঘ', q17: 'ক', q18: 'খ', q19: 'গ', q20: 'ঘ',
        q21: 'ক', q22: 'খ', q23: 'গ', q24: 'ঘ', q25: 'ক', q26: 'খ', q27: 'গ', q28: 'ঘ', q29: 'ক', q30: 'খ',
        q31: 'গ', q32: 'ঘ', q33: 'ক', q34: 'খ', q35: 'গ', q36: 'ঘ', q37: 'ক', q38: 'খ', q39: 'গ', q40: 'ঘ',
        q41: 'ক', q42: 'খ', q43: 'গ', q44: 'ঘ', q45: 'ক', q46: 'খ', q47: 'গ', q48: 'ঘ', q49: 'ক', q50: 'খ',
      },
    },
  },
  {
    id: 'sample1_standard',
    name: 'Sample 1: Standard Academic Exam',
    description: 'Medium selector, 9-digit roll number, and 45 MCQs with sectional layout (OMRChecker Sample 1).',
    template: {
      pageDimensions: [1846, 1500],
      bubbleDimensions: [40, 40],
      preProcessors: [{ name: 'CropOnMarkers' }],
      customLabels: {
        Roll: ['Medium', 'roll1..9'],
        q5: ['q5_1', 'q5_2'],
        q6: ['q6_1', 'q6_2'],
      },
      fieldBlocks: {
        Medium: {
          origin: [170, 282],
          bubblesGap: 41,
          labelsGap: 0,
          bubbleValues: ['E', 'H'],
          direction: 'vertical',
          fieldLabels: ['Medium'],
        },
        Roll: {
          origin: [286, 282],
          bubblesGap: 46,
          labelsGap: 58,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: ['roll1..9'],
        },
        SectionA: {
          origin: [168, 804],
          bubblesGap: 51,
          labelsGap: 43,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: ['q1..15'],
          section: 'Section A - Physics',
        },
        SectionB: {
          origin: [608, 804],
          bubblesGap: 51,
          labelsGap: 43,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: ['q16..30'],
          section: 'Section B - Chemistry',
        },
        SectionC: {
          origin: [1048, 804],
          bubblesGap: 51,
          labelsGap: 43,
          fieldType: 'QTYPE_MCQ4',
          direction: 'horizontal',
          fieldLabels: ['q31..45'],
          section: 'Section C - Mathematics',
        },
      },
    },
    evaluationConfig: {
      examName: 'All-India Mock Assessment Test',
      examCode: 'AIMAT-2026',
      rollNumberField: 'Roll',
      markingSchemes: {
        default: { correct: 4, incorrect: -1, unmarked: 0, bonus: 4 },
        challenging: { correct: 5, incorrect: -2, unmarked: 0, bonus: 5 },
      },
      sections: {
        'Section A - Physics': {
          questions: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15'],
          markingScheme: 'default',
        },
        'Section B - Chemistry': {
          questions: ['q16', 'q17', 'q18', 'q19', 'q20', 'q21', 'q22', 'q23', 'q24', 'q25', 'q26', 'q27', 'q28', 'q29', 'q30'],
          markingScheme: 'default',
        },
        'Section C - Mathematics': {
          questions: ['q31', 'q32', 'q33', 'q34', 'q35', 'q36', 'q37', 'q38', 'q39', 'q40', 'q41', 'q42', 'q43', 'q44', 'q45'],
          markingScheme: 'challenging',
        },
      },
      bonusQuestions: ['q12'],
      answerKey: {
        q1: 'A', q2: 'C', q3: 'B', q4: 'D', q5: 'A', q6: 'B', q7: 'C', q8: 'D', q9: 'A', q10: 'B',
        q11: 'C', q12: 'A', q13: 'B', q14: 'D', q15: 'C',
        q16: 'B', q17: 'A', q18: 'D', q19: 'C', q20: 'B', q21: 'A', q22: 'D', q23: 'C', q24: 'A', q25: 'B',
        q26: 'C', q27: 'D', q28: 'B', q29: 'A', q30: 'D',
        q31: 'C', q32: 'D', q33: 'A', q34: 'B', q35: 'C', q36: 'A', q37: 'B', q38: 'D', q39: 'C', q40: 'A',
        q41: 'B', q42: 'D', q43: 'C', q44: 'A', q45: 'B',
      },
    },
  },
  {
    id: 'sample2_adrian',
    name: 'Sample 2: Adrian Compact 50-Q Quiz',
    description: 'Compact 50-question 5-choice OMR layout with 2 columns (OMRChecker Sample 2).',
    template: {
      pageDimensions: [1050, 750],
      bubbleDimensions: [24, 24],
      preProcessors: [{ name: 'CropOnMarkers' }],
      fieldBlocks: {
        Col1: {
          origin: [70, 100],
          bubblesGap: 30,
          labelsGap: 35,
          fieldType: 'QTYPE_MCQ5',
          direction: 'horizontal',
          fieldLabels: ['q1..25'],
          section: 'General Knowledge',
        },
        Col2: {
          origin: [420, 100],
          bubblesGap: 30,
          labelsGap: 35,
          fieldType: 'QTYPE_MCQ5',
          direction: 'horizontal',
          fieldLabels: ['q26..50'],
          section: 'Quantitative Reasoning',
        },
      },
    },
    evaluationConfig: {
      examName: 'Adrian 50-Q Assessment',
      examCode: 'ADR-50',
      markingSchemes: {
        default: { correct: 2, incorrect: -0.5, unmarked: 0, bonus: 2 },
      },
      answerKey: {
        q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'E', q6: 'A', q7: 'B', q8: 'C', q9: 'D', q10: 'E',
        q11: 'A', q12: 'B', q13: 'C', q14: 'D', q15: 'E', q16: 'A', q17: 'B', q18: 'C', q19: 'D', q20: 'E',
        q21: 'A', q22: 'B', q23: 'C', q24: 'D', q25: 'E', q26: 'A', q27: 'B', q28: 'C', q29: 'D', q30: 'E',
        q31: 'A', q32: 'B', q33: 'C', q34: 'D', q35: 'E', q36: 'A', q37: 'B', q38: 'C', q39: 'D', q40: 'E',
        q41: 'A', q42: 'B', q43: 'C', q44: 'D', q45: 'E', q46: 'A', q47: 'B', q48: 'C', q49: 'D', q50: 'E',
      },
    },
  },
  {
    id: 'sample6_roll',
    name: 'Sample 6: Roll Number & Check Digits Sheet',
    description: 'University final exam cover sheet with 7-digit Roll Number, Student category (Stu), and dual verification check digits (OMRChecker Sample 6).',
    template: {
      pageDimensions: [2480, 3508],
      bubbleDimensions: [42, 42],
      preProcessors: [
        { name: 'Levels', options: { low: 0.7, high: 0.8 } },
        { name: 'GaussianBlur', options: { kSize: [3, 3], sigmaX: 0 } },
      ],
      customLabels: {
        Roll: ['stu', 'roll1..7', 'check_1', 'check_2'],
      },
      fieldBlocks: {
        Check1: {
          origin: [2033, 1290],
          bubblesGap: 50,
          labelsGap: 50,
          fieldLabels: ['check_1'],
          bubbleValues: ['A', 'B', 'E', 'H', 'J', 'L', 'M'],
          direction: 'vertical',
          section: 'Check Digit 1',
        },
        Check2: {
          origin: [2083, 1290],
          bubblesGap: 50,
          labelsGap: 50,
          fieldLabels: ['check_2'],
          bubbleValues: ['N', 'R', 'U', 'W', 'X', 'Y'],
          direction: 'vertical',
          section: 'Check Digit 2',
        },
        Stu: {
          origin: [1636, 1290],
          bubblesGap: 50,
          labelsGap: 50,
          fieldLabels: ['stu'],
          bubbleValues: ['U', 'A', 'HT', 'GT'],
          direction: 'vertical',
          section: 'Student Category',
        },
        Roll: {
          origin: [1685, 1290],
          bubblesGap: 50.5,
          labelsGap: 50.5,
          fieldType: 'QTYPE_INT',
          direction: 'vertical',
          fieldLabels: ['roll1..7'],
          section: 'Roll Number (7 Digits)',
        },
      },
    },
    evaluationConfig: {
      examName: 'University Final Examination (Roll Verification Batch)',
      examCode: 'UNIV-ROLL-2026',
      rollNumberField: 'Roll',
      markingSchemes: {
        default: { correct: 1, incorrect: 0, unmarked: 0, bonus: 0 },
      },
      answerKey: {},
    },
  },
];

