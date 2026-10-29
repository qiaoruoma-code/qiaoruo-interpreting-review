/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialItem } from '../types';

const STORAGE_KEY = 'interp_workshop_user_materials_v3';
const ONBOARDING_KEY = 'interp_workshop_onboarded_v3';

export function hasUserCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed: boolean): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, completed ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function loadStoredMaterials(): MaterialItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
    return [];
  }
}

export function saveStoredMaterials(materials: MaterialItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
    if (materials.length > 0) {
      setOnboardingCompleted(true);
    }
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function exportBackupJSON(materials: MaterialItem[]): string {
  return JSON.stringify(
    {
      version: 3,
      exportedAt: new Date().toISOString(),
      count: materials.length,
      materials,
    },
    null,
    2
  );
}

export function importBackupJSON(jsonString: string): MaterialItem[] {
  const data = JSON.parse(jsonString);
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.materials)) {
    return data.materials;
  }
  throw new Error('无效的备份文件格式：未找到材料列表');
}
