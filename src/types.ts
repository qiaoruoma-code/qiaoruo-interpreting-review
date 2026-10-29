/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PracticeMode = 'forward' | 'reverse' | 'strategy';
export type MasteryLevel = 'none' | 'unlearned' | 'unfamiliar' | 'mastered';
export type AnswerMethod = 'type' | 'voice' | 'oral';

export interface EvaluationResult {
  briefVerdict: string;
  informationDiff: {
    omissions: string[];
    mistranslations: string[];
    additions: string[];
    numbersAndTerms: string[];
  };
  expressionQuality: {
    collocation: string[];
    spokenAgility: string;
  };
  acceptableAlternatives: string[];
  teacherNotesComparison: string;
  suggestedActionablePhrases: string[];
  recommendedMastery: 'mastered' | 'unfamiliar' | 'unlearned';
}

export interface ModeReviewState {
  mastery: MasteryLevel;
  lastPracticedAt?: string;
  nextReviewDate: string; // YYYY-MM-DD
  intervalDays: number;   // 1, 3, 7, 14, 30
  historyCount: number;
  lastAnswer?: string;
  lastEvaluation?: EvaluationResult;
}

export interface MaterialItem {
  id: string;
  sourceText: string;
  targetText: string;
  analysisNotes: string;
  sourceLang: 'zh' | 'en' | 'auto';
  tags: string[];
  createdAt: string;
  forwardState: ModeReviewState;
  reverseState: ModeReviewState;
  strategyState: ModeReviewState;
}

export interface ParsedTemplateItem {
  id: string;
  sourceText: string;
  targetText: string;
  analysisNotes: string;
  sourceLang: 'zh' | 'en' | 'auto';
  tags: string[];
  isValid: boolean;
  warnings: string[];
}

export interface SRSStats {
  totalItems: number;
  dueTodayCount: number;
  masteredCount: number;
  unfamiliarCount: number;
  unlearnedCount: number;
  notStartedCount: number;
  modeBreakdown: {
    forwardDue: number;
    reverseDue: number;
    strategyDue: number;
  };
}
