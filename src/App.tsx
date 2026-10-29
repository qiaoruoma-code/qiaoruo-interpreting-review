/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MaterialItem, PracticeMode, SRSStats } from './types';
import {
  loadStoredMaterials,
  saveStoredMaterials,
  hasUserCompletedOnboarding,
  setOnboardingCompleted,
} from './services/storage';
import { calculateStats, getPracticeQueue } from './services/srsEngine';
import { Navbar } from './components/Navbar';
import { TodayDashboard } from './components/TodayDashboard';
import { PracticeView } from './components/PracticeView';
import { MaterialsManager } from './components/MaterialsManager';
import { OnboardingGate } from './components/OnboardingGate';

export default function App() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'dashboard' | PracticeMode | 'materials'>('dashboard');
  const [activePracticeMode, setActivePracticeMode] = useState<PracticeMode>('forward');
  const [practiceQueue, setPracticeQueue] = useState<MaterialItem[]>([]);
  const [completedTodayCount, setCompletedTodayCount] = useState<number>(0);
  const [stats, setStats] = useState<SRSStats>({
    totalItems: 0,
    dueTodayCount: 0,
    masteredCount: 0,
    unfamiliarCount: 0,
    unlearnedCount: 0,
    notStartedCount: 0,
    modeBreakdown: { forwardDue: 0, reverseDue: 0, strategyDue: 0 },
  });

  // Load from local storage on mount
  useEffect(() => {
    const loaded = loadStoredMaterials();
    setMaterials(loaded);
    setStats(calculateStats(loaded));

    // Show onboarding if no materials or onboarding not completed yet
    if (!hasUserCompletedOnboarding() || loaded.length === 0) {
      setIsOnboarding(true);
    }
  }, []);

  // Update stats whenever materials change
  const handleUpdateMaterials = (newMaterials: MaterialItem[]) => {
    setMaterials(newMaterials);
    saveStoredMaterials(newMaterials);
    setStats(calculateStats(newMaterials));
  };

  // Complete onboarding with user-provided items
  const handleCompleteOnboarding = (initialMaterials: MaterialItem[]) => {
    setMaterials(initialMaterials);
    saveStoredMaterials(initialMaterials);
    setOnboardingCompleted(true);
    setStats(calculateStats(initialMaterials));
    setIsOnboarding(false);
    setCurrentTab('dashboard');
  };

  // Update a single material item (after review)
  const handleSaveMaterial = (updatedItem: MaterialItem) => {
    const updatedList = materials.map((m) => (m.id === updatedItem.id ? updatedItem : m));
    setMaterials(updatedList);
    saveStoredMaterials(updatedList);
    setStats(calculateStats(updatedList));
    setCompletedTodayCount((prev) => prev + 1);
  };

  // Launch a practice mode
  const handleStartMode = (
    mode: PracticeMode,
    filter: 'due' | 'unfamiliar' | 'all' = 'due',
    onlyGlossary = false
  ) => {
    let queue = getPracticeQueue(materials, mode, filter);

    if (onlyGlossary) {
      queue = queue.filter((m) => m.tags?.includes('术语词汇'));
    }

    if (queue.length === 0) {
      if (filter === 'due') {
        let allQueue = getPracticeQueue(materials, mode, 'all');
        if (onlyGlossary) {
          allQueue = allQueue.filter((m) => m.tags?.includes('术语词汇'));
        }
        if (allQueue.length > 0) {
          if (confirm('今日该板块暂无到期题目，是否立即练习该板块的全部条目进行巩固？')) {
            setActivePracticeMode(mode);
            setPracticeQueue(allQueue);
            setCurrentTab(mode);
          }
          return;
        }
      }
      alert('当前模式下暂无可练习的材料。请在“材料管理”中添加新笔记。');
      return;
    }

    setActivePracticeMode(mode);
    setPracticeQueue(queue);
    setCurrentTab(mode);
  };

  // Global "Start Today Review" action
  const handleStartTodayReview = () => {
    if (isOnboarding) return;

    if (stats.modeBreakdown.forwardDue > 0) {
      handleStartMode('forward', 'due');
    } else if (stats.modeBreakdown.reverseDue > 0) {
      handleStartMode('reverse', 'due');
    } else if (stats.modeBreakdown.strategyDue > 0) {
      handleStartMode('strategy', 'due');
    } else {
      if (confirm('今日到期题目已全部完成！是否开启正向练习进行自主刷题巩固？')) {
        handleStartMode('forward', 'all');
      }
    }
  };

  const handleSelectTab = (tab: 'dashboard' | PracticeMode | 'materials') => {
    if (isOnboarding) {
      setIsOnboarding(false);
    }
    if (tab === 'forward' || tab === 'reverse' || tab === 'strategy') {
      handleStartMode(tab, 'due');
    } else {
      setCurrentTab(tab);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar
        currentTab={isOnboarding ? 'dashboard' : currentTab}
        onSelectTab={handleSelectTab}
        dueCount={stats.dueTodayCount}
        onStartTodayReview={handleStartTodayReview}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isOnboarding ? (
          <OnboardingGate onCompleteOnboarding={handleCompleteOnboarding} />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <TodayDashboard
                stats={stats}
                materials={materials}
                completedTodayCount={completedTodayCount}
                onStartMode={handleStartMode}
                onOpenMaterials={() => setCurrentTab('materials')}
                onReopenOnboarding={() => setIsOnboarding(true)}
              />
            )}

            {(currentTab === 'forward' || currentTab === 'reverse' || currentTab === 'strategy') && (
              <PracticeView
                mode={activePracticeMode}
                queue={practiceQueue}
                allMaterials={materials}
                onSaveMaterial={handleSaveMaterial}
                onFinishSession={() => setCurrentTab('dashboard')}
                onSwitchMode={(newMode) => handleStartMode(newMode, 'due')}
              />
            )}

            {currentTab === 'materials' && (
              <MaterialsManager
                materials={materials}
                onSaveAllMaterials={handleUpdateMaterials}
                onRefreshStats={() => setStats(calculateStats(materials))}
              />
            )}
          </>
        )}
      </main>

      <footer className="py-6 border-t border-slate-200/60 bg-white/50 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>译工坊 · 口译复盘笔记交互系统</span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>术语积累前置</span>
            <span aria-hidden="true">·</span>
            <span>正向口译</span>
            <span aria-hidden="true">·</span>
            <span>反向回译</span>
            <span aria-hidden="true">·</span>
            <span>翻译思路</span>
            <span aria-hidden="true">·</span>
            <span>SRS 记忆曲线</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
