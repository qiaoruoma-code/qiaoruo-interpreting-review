/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialItem, MasteryLevel, ModeReviewState, PracticeMode, SRSStats } from '../types';
import { getTodayDateString } from './sampleData';

export const SRS_INTERVAL_STEPS = [1, 3, 7, 14, 30];

/**
 * Calculates the next review date given a date string and day offset
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Update review state for a given mode according to mastery selection
 */
export function calculateNextReviewState(
  currentState: ModeReviewState,
  selectedMastery: MasteryLevel,
  customIntervalDays?: number
): ModeReviewState {
  const today = getTodayDateString();
  let nextInterval = currentState.intervalDays || 1;

  if (customIntervalDays !== undefined && customIntervalDays > 0) {
    nextInterval = customIntervalDays;
  } else {
    switch (selectedMastery) {
      case 'mastered': {
        // Step up in interval ladder: 1 -> 3 -> 7 -> 14 -> 30
        const currentIndex = SRS_INTERVAL_STEPS.indexOf(currentState.intervalDays);
        if (currentIndex === -1 || currentIndex >= SRS_INTERVAL_STEPS.length - 1) {
          nextInterval = Math.max(30, (currentState.intervalDays || 30) + 14);
        } else {
          nextInterval = SRS_INTERVAL_STEPS[currentIndex + 1];
        }
        break;
      }
      case 'unfamiliar': {
        // Drop down to 1 or 3 days
        nextInterval = 1;
        break;
      }
      case 'unlearned': {
        // Reset to 1 day
        nextInterval = 1;
        break;
      }
      default:
        nextInterval = 1;
    }
  }

  return {
    ...currentState,
    mastery: selectedMastery,
    intervalDays: nextInterval,
    nextReviewDate: addDays(today, nextInterval),
    lastPracticedAt: new Date().toISOString(),
    historyCount: (currentState.historyCount || 0) + 1,
  };
}

/**
 * Helper to get the state for a specific mode from a MaterialItem
 */
export function getModeState(material: MaterialItem, mode: PracticeMode): ModeReviewState {
  switch (mode) {
    case 'forward':
      return material.forwardState;
    case 'reverse':
      return material.reverseState;
    case 'strategy':
      return material.strategyState;
  }
}

/**
 * Helper to update a material item with new mode state
 */
export function updateMaterialWithModeState(
  material: MaterialItem,
  mode: PracticeMode,
  newState: ModeReviewState
): MaterialItem {
  switch (mode) {
    case 'forward':
      return { ...material, forwardState: newState };
    case 'reverse':
      return { ...material, reverseState: newState };
    case 'strategy':
      return { ...material, strategyState: newState };
  }
}

/**
 * Filter items for a practice session based on mode and criteria
 */
export function getPracticeQueue(
  materials: MaterialItem[],
  mode: PracticeMode,
  filter: 'due' | 'unfamiliar' | 'all' = 'due'
): MaterialItem[] {
  const today = getTodayDateString();

  return materials.filter((item) => {
    // Crucial rule: Translation Strategy questions require analysis notes!
    if (mode === 'strategy' && (!item.analysisNotes || !item.analysisNotes.trim())) {
      return false;
    }

    const state = getModeState(item, mode);

    if (filter === 'all') {
      return true;
    }

    if (filter === 'unfamiliar') {
      return state.mastery === 'unfamiliar' || state.mastery === 'unlearned';
    }

    // Default 'due': either not yet scheduled, or due on or before today
    if (!state.nextReviewDate || state.nextReviewDate <= today || state.mastery === 'none') {
      return true;
    }

    return false;
  });
}

/**
 * Compute comprehensive statistics across all modes and materials
 */
export function calculateStats(materials: MaterialItem[]): SRSStats {
  const today = getTodayDateString();

  let forwardDue = 0;
  let reverseDue = 0;
  let strategyDue = 0;

  let mastered = 0;
  let unfamiliar = 0;
  let unlearned = 0;
  let notStarted = 0;

  materials.forEach((item) => {
    // Check Forward
    if (item.forwardState.nextReviewDate <= today || item.forwardState.mastery === 'none') {
      forwardDue++;
    }
    // Check Reverse
    if (item.reverseState.nextReviewDate <= today || item.reverseState.mastery === 'none') {
      reverseDue++;
    }
    // Check Strategy (only if has notes)
    if (item.analysisNotes && item.analysisNotes.trim()) {
      if (item.strategyState.nextReviewDate <= today || item.strategyState.mastery === 'none') {
        strategyDue++;
      }
    }

    // Overall mastery snapshot (forward takes priority for general score, but we tally total states)
    [item.forwardState, item.reverseState, item.strategyState].forEach((st) => {
      if (st.mastery === 'mastered') mastered++;
      else if (st.mastery === 'unfamiliar') unfamiliar++;
      else if (st.mastery === 'unlearned') unlearned++;
      else notStarted++;
    });
  });

  const totalStates = materials.length * 3;

  return {
    totalItems: materials.length,
    dueTodayCount: forwardDue + reverseDue + strategyDue,
    masteredCount: mastered,
    unfamiliarCount: unfamiliar,
    unlearnedCount: unlearned,
    notStartedCount: notStarted,
    modeBreakdown: {
      forwardDue,
      reverseDue,
      strategyDue,
    },
  };
}
