/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MaterialItem, PracticeMode, SRSStats } from '../types';
import {
  ArrowRight,
  BookOpen,
  RotateCcw,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  PlusCircle,
} from 'lucide-react';

interface TodayDashboardProps {
  stats: SRSStats;
  materials: MaterialItem[];
  completedTodayCount: number;
  onStartMode: (mode: PracticeMode, filter?: 'due' | 'unfamiliar' | 'all', onlyGlossary?: boolean) => void;
  onOpenMaterials: () => void;
  onReopenOnboarding: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  stats,
  materials,
  completedTodayCount,
  onStartMode,
  onOpenMaterials,
  onReopenOnboarding,
}) => {
  const targetDailyGoal = Math.max(10, stats.dueTodayCount + completedTodayCount);
  const progressPercent = Math.min(
    100,
    Math.round((completedTodayCount / (targetDailyGoal || 1)) * 100)
  );

  const glossaryCount = materials.filter((m) => m.tags?.includes('术语词汇')).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero energizing greeting & progress banner */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 tracking-wider uppercase mb-2">
              <span>口译工作坊 · 真实积累复盘</span>
              <span aria-hidden="true">·</span>
              <span>Spaced Repetition System</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
              保持语感与临场反应速度，开始今天的口译复盘
            </h1>

            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              当前题库包含您积累的 <strong>{materials.length}</strong> 条口译材料（其中 <strong>{glossaryCount}</strong> 条专项目标术语）。通过正向组织、反向回译与思路复盘，把工作坊所学沉淀为下意识的脱口而出能力。
            </p>
          </div>

          <button
            onClick={onReopenOnboarding}
            className="self-start sm:self-auto px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>追加录入新批次</span>
          </button>
        </div>

        {/* Daily Progress Gauge */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>今日复习进度</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                已完成 {completedTodayCount} / {targetDailyGoal} 题 ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onStartMode('forward', 'due')}
              disabled={stats.dueTodayCount === 0}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm flex items-center gap-2 ${
                stats.dueTodayCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer hover:shadow'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <span>开启今日到期复习 ({stats.dueTodayCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Glossary Sprint Highlight (User requested) */}
      {glossaryCount > 0 && (
        <section className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>专项速记专区 · 术语对撞</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              自备术语专项速刷 ({glossaryCount} 个高频词条)
            </h2>
            <p className="text-xs text-emerald-100/80 max-w-xl leading-relaxed">
              以秒为单位测试对本场工作坊术语的即时反应，支持正向中译英快答与反向英译中盲测。
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onStartMode('forward', 'all', true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              正向术语速刷
            </button>
            <button
              onClick={() => onStartMode('reverse', 'all', true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition-all cursor-pointer whitespace-nowrap"
            >
              反向回译速刷
            </button>
          </div>
        </section>
      )}

      {/* Mode Launch Cards Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">三个练习板块</h2>
          <span className="text-xs text-slate-500">各练习模式的复习进度与掌握程度相互独立</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Forward Translation */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                1. 正向口译练习
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                按材料原始方向展示原语，隐藏译文。训练听/读原句后立即组织语言脱口而出的顺句驱动能力。
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <span>到期待复习: <strong className="text-slate-900 tabular-nums">{stats.modeBreakdown.forwardDue}</strong> 条</span>
                <span aria-hidden="true">·</span>
                <span>支持中译英 / 英译中</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onStartMode('forward', 'due')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>到期练习 ({stats.modeBreakdown.forwardDue})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onStartMode('forward', 'all')}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                全部刷题
              </button>
            </div>
          </div>

          {/* Card 2: Back-Translation */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                2. 反向 / 回译练习
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                将参考译文作题，要求反向输出原语语言。攻克信息不对称，认可准确自然的变体表达，不强求逐字复现。
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <span>到期待复习: <strong className="text-slate-900 tabular-nums">{stats.modeBreakdown.reverseDue}</strong> 条</span>
                <span aria-hidden="true">·</span>
                <span>提示原译文信息差</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onStartMode('reverse', 'due')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>到期回译 ({stats.modeBreakdown.reverseDue})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onStartMode('reverse', 'all')}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                全部刷题
              </button>
            </div>
          </div>

          {/* Card 3: Translation Strategy & Analysis */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-teal-300 transition-all group">
            <div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                3. 翻译思路与分析练习
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                展示原语，就老师讲解的切分逻辑、特殊译法提出追问。回答后再对照笔记与AI建议，仅含笔记的条目出题。
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <span>到期待复习: <strong className="text-slate-900 tabular-nums">{stats.modeBreakdown.strategyDue}</strong> 条</span>
                <span aria-hidden="true">·</span>
                <span>聚焦口译策略机制</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onStartMode('strategy', 'due')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <span>思路自测 ({stats.modeBreakdown.strategyDue})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onStartMode('strategy', 'all')}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                全部刷题
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Review Metrics Overview */}
      <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">材料与复习状态总览</h2>
          <button
            onClick={onOpenMaterials}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            导入 / 管理材料 ({materials.length} 条)
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-500">自备材料总数</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {stats.totalItems}
            </div>
            <div className="text-xs text-slate-400 mt-1">包含术语与长句笔记</div>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <div className="text-xs text-emerald-700 font-medium">累计已掌握维度</div>
            <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">
              {stats.masteredCount}
            </div>
            <div className="text-xs text-emerald-600 mt-1">进入长周期 (7-30天)</div>
          </div>

          <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="text-xs text-amber-700 font-medium">不熟 / 待巩固</div>
            <div className="text-2xl font-bold text-amber-800 mt-1 tabular-nums">
              {stats.unfamiliarCount}
            </div>
            <div className="text-xs text-amber-600 mt-1">紧凑复查 (1-3天)</div>
          </div>

          <div className="p-4 rounded-lg bg-rose-50/50 border border-rose-100">
            <div className="text-xs text-rose-700 font-medium">不会 / 遗忘</div>
            <div className="text-2xl font-bold text-rose-800 mt-1 tabular-nums">
              {stats.unlearnedCount}
            </div>
            <div className="text-xs text-rose-600 mt-1">次日强制再次复盘</div>
          </div>
        </div>
      </section>
    </div>
  );
};
