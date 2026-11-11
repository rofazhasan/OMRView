import type {
  EvaluationConfig,
  MarkingScheme,
  QuestionVerdict,
  StudentScoreCard,
} from '../types/omr';

const DEFAULT_MARKING_SCHEME: MarkingScheme = {
  correct: 4,
  incorrect: -1,
  unmarked: 0,
  bonus: 4,
};

export class EvaluationEngine {
  private config: EvaluationConfig;

  constructor(config: EvaluationConfig) {
    this.config = config;
  }

  public evaluateCandidate(
    sheetId: string,
    filename: string,
    responses: Record<string, string[]>,
    concatenatedResponses: Record<string, string>,
    flags: string[] = []
  ): StudentScoreCard {
    const defaultScheme = this.config.markingSchemes?.['default'] || DEFAULT_MARKING_SCHEME;
    const bonusQuestions = new Set(this.config.bonusQuestions || []);
    
    // Extract roll number and candidate set if configured
    const rollField = this.config.rollNumberField || 'Roll';
    const setField = this.config.setNameField || 'Set';
    
    const rollNumber = concatenatedResponses[rollField] || responses[rollField]?.join('') || 'UNKNOWN';
    const examSet = concatenatedResponses[setField] || responses[setField]?.join('') || 'DEFAULT';

    // Extract Bangladesh Board & CQ specific metadata if available
    const registrationNo = concatenatedResponses['Registration'] || responses['Registration']?.join('') || undefined;
    const subjectCode = concatenatedResponses['SubjectCode'] || responses['SubjectCode']?.join('') || undefined;
    const scriptSerial = concatenatedResponses['ScriptSerial'] || responses['ScriptSerial']?.join('') || undefined;
    
    const rawCQMarks = concatenatedResponses['ObtainedMarks'] || responses['ObtainedMarks']?.join('') || concatenatedResponses['TotalMarksCQ'];
    const isCQScript = Boolean(rawCQMarks || scriptSerial || (this.config.sections && Object.keys(this.config.sections).some(k => k.toLowerCase().includes('cq'))));
    const obtainedMarks = rawCQMarks && !isNaN(parseFloat(rawCQMarks)) ? parseFloat(rawCQMarks) : undefined;

    // Resolve set-specific answer key if multi-set keys are configured
    let answerKey = this.config.answerKey;
    if (this.config.multiSetAnswerKeys) {
      const cleanExamSet = examSet.toUpperCase().replace(/\s+/g, '');
      for (const [sKey, sObj] of Object.entries(this.config.multiSetAnswerKeys)) {
        const cleanKey = sKey.toUpperCase().replace(/\s+/g, '');
        if (cleanKey === cleanExamSet || cleanKey.endsWith(cleanExamSet) || cleanExamSet.endsWith(cleanKey)) {
          if (sObj && Object.keys(sObj).length > 0) {
            answerKey = sObj as any;
            break;
          }
        }
      }
    }

    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unmarkedCount = 0;
    const studentFlags = [...flags];

    const questionVerdicts: Record<string, QuestionVerdict> = {};
    const sectionScores: Record<string, { score: number; max: number; correct: number; total: number }> = {};

    for (const [qKey, correctAns] of Object.entries(answerKey)) {
      // Find section for this question
      let sectionName = 'General';
      let scheme = defaultScheme;

      if (this.config.sections) {
        for (const [secName, secInfo] of Object.entries(this.config.sections)) {
          if (secInfo.questions.includes(qKey)) {
            sectionName = secName;
            if (this.config.markingSchemes && this.config.markingSchemes[secInfo.markingScheme]) {
              scheme = this.config.markingSchemes[secInfo.markingScheme];
            }
            break;
          }
        }
      }

      if (!sectionScores[sectionName]) {
        sectionScores[sectionName] = { score: 0, max: 0, correct: 0, total: 0 };
      }
      sectionScores[sectionName].total += 1;
      sectionScores[sectionName].max += scheme.correct;
      maxScore += scheme.correct;

      const rawMarked = responses[qKey] || [];
      const studentAnswer = rawMarked.join('');

      let verdict: QuestionVerdict['verdict'] = 'unmarked';
      let scoreAwarded = 0;

      // Check if bonus question
      if (bonusQuestions.has(qKey)) {
        verdict = 'bonus';
        scoreAwarded = scheme.bonus ?? scheme.correct;
        correctCount++;
        sectionScores[sectionName].correct++;
      } else if (rawMarked.length === 0) {
        verdict = 'unmarked';
        scoreAwarded = scheme.unmarked;
        unmarkedCount++;
      } else if (rawMarked.length > 1 && !Array.isArray(correctAns)) {
        // Multi-marked when standard single choice expected
        verdict = 'multi_marked';
        scoreAwarded = scheme.incorrect;
        incorrectCount++;
        studentFlags.push(`Multi-marked question ${qKey}: [${rawMarked.join(',')}]`);
      } else {
        // Evaluation logic based on answer type
        if (typeof correctAns === 'string') {
          if (studentAnswer.toUpperCase() === correctAns.toUpperCase()) {
            verdict = 'correct';
            scoreAwarded = scheme.correct;
            correctCount++;
            sectionScores[sectionName].correct++;
          } else {
            verdict = 'incorrect';
            scoreAwarded = scheme.incorrect;
            incorrectCount++;
          }
        } else if (Array.isArray(correctAns)) {
          // Could be multiple-correct (array of strings) or weighted (array of [answer, score] tuples)
          if (correctAns.length > 0 && Array.isArray(correctAns[0])) {
            // Weighted tuples: [['A', 4], ['B', 2]]
            const weightedTuples = correctAns as [string, number][];
            const matchedTuple = weightedTuples.find(([ans]) => ans.toUpperCase() === studentAnswer.toUpperCase());
            if (matchedTuple) {
              verdict = 'correct';
              scoreAwarded = matchedTuple[1];
              correctCount++;
              sectionScores[sectionName].correct++;
            } else {
              verdict = 'incorrect';
              scoreAwarded = scheme.incorrect;
              incorrectCount++;
            }
          } else {
            // Multiple-correct: ['A', 'C'] -> student is correct if they marked any allowed answer
            const allowedAnswers = (correctAns as string[]).map(a => a.toUpperCase());
            if (allowedAnswers.includes(studentAnswer.toUpperCase())) {
              verdict = 'correct';
              scoreAwarded = scheme.correct;
              correctCount++;
              sectionScores[sectionName].correct++;
            } else {
              verdict = 'incorrect';
              scoreAwarded = scheme.incorrect;
              incorrectCount++;
            }
          }
        }
      }

      totalScore += scoreAwarded;
      sectionScores[sectionName].score += scoreAwarded;

      questionVerdicts[qKey] = {
        question: qKey,
        studentAnswer,
        correctAnswer: correctAns,
        verdict,
        score: scoreAwarded,
        section: sectionName,
      };
    }

    const finalTotalScore = (isCQScript && obtainedMarks !== undefined && Object.keys(answerKey).length === 0)
      ? obtainedMarks
      : totalScore;
    const finalMaxScore = (isCQScript && obtainedMarks !== undefined && maxScore === 0)
      ? 100
      : maxScore;
    const percentage = finalMaxScore > 0 ? parseFloat(((finalTotalScore / finalMaxScore) * 100).toFixed(2)) : 0;
    const needsReview = studentFlags.length > 0 || finalTotalScore < 0 || (Object.keys(answerKey).length > 0 && unmarkedCount > Object.keys(answerKey).length * 0.7);

    return {
      sheetId,
      filename,
      rollNumber,
      examSet,
      registrationNo,
      subjectCode,
      scriptSerial,
      isCQScript,
      obtainedMarks,
      totalScore: finalTotalScore,
      maxScore: finalMaxScore,
      percentage,
      correctCount,
      incorrectCount,
      unmarkedCount,
      sectionScores,
      questionVerdicts,
      flags: studentFlags,
      needsReview,
    };
  }

  public static rankCohort(scoreCards: StudentScoreCard[]): StudentScoreCard[] {
    const sorted = [...scoreCards].sort((a, b) => b.totalScore - a.totalScore);
    const n = sorted.length;
    if (n === 0) return [];

    let currentRank = 1;
    return sorted.map((card, index) => {
      // Standard competition ranking (1224)
      if (index > 0 && card.totalScore === sorted[index - 1].totalScore) {
        // Tied with previous student
      } else {
        currentRank = index + 1;
      }

      // Exact psychometric percentile rank: (count_below + 0.5 * count_equal) / N * 100
      const countBelow = sorted.filter(c => c.totalScore < card.totalScore).length;
      const countEqual = sorted.filter(c => c.totalScore === card.totalScore).length;
      const percentile = parseFloat((((countBelow + 0.5 * countEqual) / n) * 100).toFixed(2));

      return {
        ...card,
        rank: currentRank,
        percentile,
      };
    });
  }
}

