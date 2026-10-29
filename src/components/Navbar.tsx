/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PracticeMode } from '../types';

interface NavbarProps {
  currentTab: 'dashboard' | PracticeMode | 'materials';
  onSelectTab: (tab: 'dashboard' | PracticeMode | 'materials') => void;
  dueCount: number;
  onStartTodayReview: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  dueCount,
  onStartTodayReview,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md"
        >
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0">
            译工坊 · 口译复盘
          </span>
        </button>

        {/* Zone 2: 4-5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 pb-1 border-b-2 ${
              currentTab === 'dashboard'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            今日复习
            {dueCount > 0 && (
              <span className="ml-1.5 text-xs font-semibold text-emerald-600 tabular-nums">
                ({dueCount})
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('forward')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 pb-1 border-b-2 ${
              currentTab === 'forward'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            正向练习
          </button>

          <button
            onClick={() => onSelectTab('reverse')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 pb-1 border-b-2 ${
              currentTab === 'reverse'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            反向/回译
          </button>

          <button
            onClick={() => onSelectTab('strategy')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 pb-1 border-b-2 ${
              currentTab === 'strategy'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            翻译思路
          </button>

          <button
            onClick={() => onSelectTab('materials')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 pb-1 border-b-2 ${
              currentTab === 'materials'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent'
            }`}
          >
            材料管理
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onStartTodayReview}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm hover:shadow transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            开始今日复习
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-slate-100 bg-white text-xs font-medium text-slate-600 overflow-x-auto">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`px-2 py-1 whitespace-nowrap ${currentTab === 'dashboard' ? 'text-emerald-700 font-bold' : ''}`}
        >
          今日 ({dueCount})
        </button>
        <button
          onClick={() => onSelectTab('forward')}
          className={`px-2 py-1 whitespace-nowrap ${currentTab === 'forward' ? 'text-emerald-700 font-bold' : ''}`}
        >
          正向练习
        </button>
        <button
          onClick={() => onSelectTab('reverse')}
          className={`px-2 py-1 whitespace-nowrap ${currentTab === 'reverse' ? 'text-emerald-700 font-bold' : ''}`}
        >
          反向回译
        </button>
        <button
          onClick={() => onSelectTab('strategy')}
          className={`px-2 py-1 whitespace-nowrap ${currentTab === 'strategy' ? 'text-emerald-700 font-bold' : ''}`}
        >
          翻译思路
        </button>
        <button
          onClick={() => onSelectTab('materials')}
          className={`px-2 py-1 whitespace-nowrap ${currentTab === 'materials' ? 'text-emerald-700 font-bold' : ''}`}
        >
          材料
        </button>
      </div>
    </header>
  );
};
