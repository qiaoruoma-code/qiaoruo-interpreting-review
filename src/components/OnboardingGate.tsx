/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MaterialItem, ParsedTemplateItem } from '../types';
import {
  parsePastedNotes,
  convertParsedToMaterial,
  USER_WORD_TABLE_SAMPLE_TEXT,
  SAMPLE_GLOSSARY_TEXT,
  detectLanguage,
} from '../services/templateParser';
import {
  FileText,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Table as TableIcon,
  Copy,
  Plus,
  Trash2,
  HelpCircle,
} from 'lucide-react';

interface OnboardingGateProps {
  onCompleteOnboarding: (newMaterials: MaterialItem[]) => void;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({ onCompleteOnboarding }) => {
  const [topicTitle, setTopicTitle] = useState('习近平主席于 2026 年特朗普访华时致辞');
  const [rawText, setRawText] = useState(USER_WORD_TABLE_SAMPLE_TEXT);
  const [parsedItems, setParsedItems] = useState<ParsedTemplateItem[]>(() =>
    parsePastedNotes(USER_WORD_TABLE_SAMPLE_TEXT)
  );
  const [hasParsed, setHasParsed] = useState(true);

  // Parse action
  const handleParse = (textToParse: string) => {
    if (!textToParse.trim()) return;
    const items = parsePastedNotes(textToParse);

    // If first line looked like a topic
    const firstLine = textToParse.trim().split(/\r?\n/)[0];
    if (firstLine && !firstLine.includes('\t') && !firstLine.includes('【')) {
      setTopicTitle(firstLine);
    }

    setParsedItems(items);
    setHasParsed(true);
  };

  // Update a single cell in the verification table
  const handleUpdateCell = (
    index: number,
    field: 'sourceText' | 'targetText' | 'analysisNotes',
    val: string
  ) => {
    const updated = [...parsedItems];
    updated[index][field] = val;
    updated[index].sourceLang = detectLanguage(
      updated[index].sourceText || updated[index].targetText
    );
    updated[index].isValid = Boolean(
      updated[index].sourceText.trim() && updated[index].targetText.trim()
    );

    const warnings: string[] = [];
    if (!updated[index].sourceText.trim()) warnings.push('缺少源语');
    if (!updated[index].targetText.trim()) warnings.push('缺少目标语');
    if (!updated[index].analysisNotes.trim()) warnings.push('未提供“翻译时应注意”笔记');
    updated[index].warnings = warnings;

    setParsedItems(updated);
  };

  // Add new row directly into the table
  const handleAddRow = () => {
    const newRow: ParsedTemplateItem = {
      id: `manual-row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceText: '',
      targetText: '',
      analysisNotes: '',
      sourceLang: 'zh',
      tags: ['工坊表格', topicTitle],
      isValid: false,
      warnings: ['缺少源语', '缺少目标语'],
    };
    setParsedItems([...parsedItems, newRow]);
    setHasParsed(true);
  };

  // Delete row from the table
  const handleDeleteRow = (index: number) => {
    const updated = parsedItems.filter((_, idx) => idx !== index);
    setParsedItems(updated);
  };

  // Confirm import and launch practice
  const handleConfirm = () => {
    const validItems = parsedItems.filter((p) => p.isValid);
    if (validItems.length === 0) {
      alert('请确保表格中至少有一行包含完整的【源语】和【目标语】。');
      return;
    }

    const materials = validItems.map((item) => {
      const mat = convertParsedToMaterial(item);
      if (topicTitle.trim()) {
        mat.tags = Array.from(new Set([...(mat.tags || []), topicTitle.trim()]));
      }
      return mat;
    });

    onCompleteOnboarding(materials);
  };

  const validCount = parsedItems.filter((p) => p.isValid).length;

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4 animate-fadeIn space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 tracking-wider uppercase mb-1.5">
              <TableIcon className="w-4 h-4 text-emerald-600" />
              <span>口译复盘表格导入与核对</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              导入您的工作坊复盘表格
            </h1>

            <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-2xl">
              深度匹配您的 Word / WPS / Excel 三列表格格式：<strong>「源语」</strong>、<strong>「目标语」</strong>与<strong>「翻译时应注意」</strong>。可直接在 Word 中全选表格复制并粘贴，也可在下方核对表中直接编辑。
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => {
                setRawText(USER_WORD_TABLE_SAMPLE_TEXT);
                handleParse(USER_WORD_TABLE_SAMPLE_TEXT);
              }}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>载入您的致辞表格范本</span>
            </button>
          </div>
        </div>
      </div>

      {/* Paste Box Drawer / Collapsible Area */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>粘贴自 Word / WPS / Excel 表格内容（制表符 Tab 分隔）：</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRawText(SAMPLE_GLOSSARY_TEXT);
                handleParse(SAMPLE_GLOSSARY_TEXT);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              填入简明术语表
            </button>
            <button
              onClick={() => {
                setRawText('');
                setParsedItems([]);
                setHasParsed(false);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              清空
            </button>
          </div>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={4}
          placeholder="在 Word 或 WPS 中选中表格按 Ctrl+C，然后在此处按 Ctrl+V 粘贴..."
          className="w-full p-3.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            提示：表格标题行（如“源语 目标语 翻译时应注意”）将自动识别过滤。
          </span>

          <button
            onClick={() => handleParse(rawText)}
            disabled={!rawText.trim()}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              rawText.trim()
                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>重新解析并同步至核对表</span>
          </button>
        </div>
      </div>

      {/* Primary Verification Table (核对表) matching the user's Word design */}
      {hasParsed && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          {/* Table Document / Topic Header */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                复盘致辞 / 工作坊主题名称：
              </label>
              <input
                type="text"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="例如：习近平主席于 2026 年特朗普访华时致辞"
                className="w-full bg-white px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              <span className="text-xs font-medium text-slate-500">
                有效行: <strong className="text-emerald-700 tabular-nums">{validCount}</strong> / {parsedItems.length}
              </span>
              <button
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加一行</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-800 text-xs font-bold">
                    <th className="py-3 px-3 w-12 text-center text-slate-500">#</th>
                    <th className="py-3 px-4 w-[28%] border-r border-slate-200">
                      源语 (Source)
                    </th>
                    <th className="py-3 px-4 w-[32%] border-r border-slate-200">
                      目标语 (Target)
                    </th>
                    <th className="py-3 px-4 w-[34%] border-r border-slate-200">
                      翻译时应注意 (Notes)
                    </th>
                    <th className="py-3 px-3 w-14 text-center">操作</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs text-slate-800 bg-white">
                  {parsedItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !item.isValid ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {/* Index & status indicator */}
                      <td className="py-3 px-2 text-center font-mono text-slate-400 align-top pt-4">
                        {idx + 1}
                      </td>

                      {/* Source Text Column */}
                      <td className="py-2.5 px-3 border-r border-slate-200 align-top">
                        <textarea
                          value={item.sourceText}
                          onChange={(e) => handleUpdateCell(idx, 'sourceText', e.target.value)}
                          rows={2}
                          placeholder="输入源语..."
                          className="w-full p-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-md focus:outline-none text-xs font-medium text-slate-900 leading-relaxed resize-y"
                        />
                        {!item.sourceText.trim() && (
                          <span className="text-[11px] text-rose-600 block px-1">必填</span>
                        )}
                      </td>

                      {/* Target Text Column */}
                      <td className="py-2.5 px-3 border-r border-slate-200 align-top">
                        <textarea
                          value={item.targetText}
                          onChange={(e) => handleUpdateCell(idx, 'targetText', e.target.value)}
                          rows={2}
                          placeholder="输入目标语译文..."
                          className="w-full p-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-md focus:outline-none text-xs font-medium text-slate-900 leading-relaxed font-serif resize-y"
                        />
                        {!item.targetText.trim() && (
                          <span className="text-[11px] text-rose-600 block px-1">必填</span>
                        )}
                      </td>

                      {/* Notes Column */}
                      <td className="py-2.5 px-3 border-r border-slate-200 align-top">
                        <textarea
                          value={item.analysisNotes}
                          onChange={(e) => handleUpdateCell(idx, 'analysisNotes', e.target.value)}
                          rows={2}
                          placeholder="记录老师讲解的顺句驱动、选词细节（可为空）..."
                          className="w-full p-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-amber-400 rounded-md focus:outline-none text-xs text-slate-700 leading-relaxed resize-y"
                        />
                      </td>

                      {/* Action Delete */}
                      <td className="py-3 px-2 text-center align-top pt-4">
                        <button
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="删除本行"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer Bar */}
            <div className="bg-slate-50 p-3 border-t border-slate-300 flex items-center justify-between">
              <button
                onClick={handleAddRow}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>在末尾新增一行</span>
              </button>

              <span className="text-xs text-slate-500">
                共 {parsedItems.length} 行，单元格可直接就地编辑修改
              </span>
            </div>
          </div>

          {/* Submission and Unlock Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>
                确认后将把所有行存入口译复盘题库，自动开启正向、回译与思路训练。
              </span>
            </div>

            <button
              onClick={handleConfirm}
              disabled={validCount === 0}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
                validCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer hover:shadow'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <span>确认核对无误 · 存入题库并开启复盘 ({validCount} 条)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
