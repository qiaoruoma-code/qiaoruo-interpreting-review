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
  exportToWordTableText,
  detectLanguage,
} from '../services/templateParser';
import { exportBackupJSON, importBackupJSON } from '../services/storage';
import {
  Plus,
  FileText,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  RotateCcw,
  Search,
  BookOpen,
  Copy,
  Table as TableIcon,
} from 'lucide-react';

interface MaterialsManagerProps {
  materials: MaterialItem[];
  onSaveAllMaterials: (items: MaterialItem[]) => void;
  onRefreshStats: () => void;
}

export const MaterialsManager: React.FC<MaterialsManagerProps> = ({
  materials,
  onSaveAllMaterials,
  onRefreshStats,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [langFilter, setLangFilter] = useState<'all' | 'zh' | 'en'>('all');

  // Paste / Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedTemplateItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  // Edit single material modal
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);

  // Manual single creation modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newAnalysis, setNewAnalysis] = useState('');

  // Handle parse
  const handleParseText = () => {
    if (!rawPastedText.trim()) return;
    const items = parsePastedNotes(rawPastedText);
    setParsedItems(items);
    setHasParsed(true);
  };

  // Confirm import from parsed preview table
  const handleConfirmImport = () => {
    const validParsed = parsedItems.filter((p) => p.isValid);
    if (validParsed.length === 0) {
      alert('没有合法的条目可导入。每条材料必须包含【源语】和【目标语】。');
      return;
    }

    const newMaterials = validParsed.map(convertParsedToMaterial);
    const combined = [...materials, ...newMaterials];
    onSaveAllMaterials(combined);
    onRefreshStats();

    setIsImportModalOpen(false);
    setRawPastedText('');
    setParsedItems([]);
    setHasParsed(false);
  };

  // Update cell in preview table
  const handleUpdateParsedCell = (
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
    updated[index].warnings = [];
    if (!updated[index].sourceText.trim()) updated[index].warnings.push('缺少源语');
    if (!updated[index].targetText.trim()) updated[index].warnings.push('缺少目标语');

    setParsedItems(updated);
  };

  const handleAddPreviewRow = () => {
    const newRow: ParsedTemplateItem = {
      id: `manual-preview-row-${Date.now()}`,
      sourceText: '',
      targetText: '',
      analysisNotes: '',
      sourceLang: 'zh',
      tags: ['工坊表格'],
      isValid: false,
      warnings: ['缺少源语', '缺少目标语'],
    };
    setParsedItems([...parsedItems, newRow]);
  };

  const handleDeletePreviewRow = (idx: number) => {
    setParsedItems(parsedItems.filter((_, i) => i !== idx));
  };

  // Delete single material
  const handleDeleteMaterial = (id: string) => {
    if (confirm('确定要删除这条口译复盘材料吗？此操作不可撤销。')) {
      const updated = materials.filter((m) => m.id !== id);
      onSaveAllMaterials(updated);
      onRefreshStats();
    }
  };

  // Save edited material
  const handleSaveEditedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editingItem.sourceText.trim() || !editingItem.targetText.trim()) {
      alert('源语与目标语均为必填项。');
      return;
    }

    const updated = materials.map((m) => (m.id === editingItem.id ? editingItem : m));
    onSaveAllMaterials(updated);
    setEditingItem(null);
    onRefreshStats();
  };

  // Create single material
  const handleCreateSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) {
      alert('源语与目标语均为必填项。');
      return;
    }

    const newItem = convertParsedToMaterial({
      id: `new-${Date.now()}`,
      sourceText: newSource.trim(),
      targetText: newTarget.trim(),
      analysisNotes: newAnalysis.trim(),
      sourceLang: detectLanguage(newSource),
      tags: ['工坊表格'],
      isValid: true,
      warnings: [],
    });

    onSaveAllMaterials([newItem, ...materials]);
    setNewSource('');
    setNewTarget('');
    setNewAnalysis('');
    setIsNewModalOpen(false);
    onRefreshStats();
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const jsonStr = exportBackupJSON(materials);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interp_materials_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as Word-ready Table (tab-separated)
  const handleExportWordTable = () => {
    const wordText = exportToWordTableText(materials);
    navigator.clipboard.writeText(wordText);
    alert('已将题库全部材料以 Word 三列表格格式（源语/目标语/翻译时应注意）复制到剪贴板！可直接在 Word 中按 Ctrl+V 粘贴成表格。');
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importBackupJSON(text);
        if (confirm(`确认导入 ${imported.length} 条材料并覆盖当前题库吗？`)) {
          onSaveAllMaterials(imported);
          onRefreshStats();
          alert('导入备份成功！');
        }
      } catch (err: any) {
        alert(`导入失败: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.sourceText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.targetText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.analysisNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLang =
      langFilter === 'all' ||
      (langFilter === 'zh' && m.sourceLang === 'zh') ||
      (langFilter === 'en' && m.sourceLang === 'en');

    return matchesSearch && matchesLang;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Action Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">口译复盘材料管理中心</h1>
          <p className="mt-1 text-xs text-slate-500">
            规范三列表格结构：<strong>「源语」</strong>、<strong>「目标语」</strong>与<strong>「翻译时应注意」</strong>。支持 Word/WPS 表格无缝复制粘贴。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <TableIcon className="w-4 h-4" />
            <span>粘贴表格导入与核对</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>单行新增</span>
          </button>

          <button
            onClick={handleExportWordTable}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="复制为可以直接粘贴到 Word 的三列表格"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
            <span>复制为 Word 表格</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="导出 JSON 完整备份"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出备份</span>
          </button>

          <label
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="从本地 JSON 恢复备份"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>恢复备份</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索源语、目标语或翻译时应注意..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-600">
          <span>语言过滤:</span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            <button
              onClick={() => setLangFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                langFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({materials.length})
            </button>
            <button
              onClick={() => setLangFilter('zh')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                langFilter === 'zh'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              中文源语
            </button>
            <button
              onClick={() => setLangFilter('en')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                langFilter === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              英文源语
            </button>
          </div>
        </div>
      </div>

      {/* Materials List Table View */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">暂无符合条件的材料</p>
            <p className="text-xs text-slate-400 mt-1">
              可点击上方“粘贴表格导入与核对”导入您的复盘表格
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold">
                  <th className="py-3 px-3 w-12 text-center text-slate-400">#</th>
                  <th className="py-3 px-4 w-[28%] border-r border-slate-100">
                    源语 (Source)
                  </th>
                  <th className="py-3 px-4 w-[32%] border-r border-slate-100">
                    目标语 (Target)
                  </th>
                  <th className="py-3 px-4 w-[32%] border-r border-slate-100">
                    翻译时应注意 (Notes)
                  </th>
                  <th className="py-3 px-3 w-16 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredMaterials.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 text-center font-mono text-slate-400 align-top pt-3.5">
                      {index + 1}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4 border-r border-slate-100 align-top font-medium text-slate-900 leading-relaxed">
                      {item.sourceText}
                      {item.tags && item.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.tags.map((t, idx) => (
                            <span key={idx} className="text-[10px] text-slate-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Target */}
                    <td className="py-3 px-4 border-r border-slate-100 align-top text-emerald-950 font-medium font-serif leading-relaxed">
                      {item.targetText}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 border-r border-slate-100 align-top text-slate-700 leading-relaxed whitespace-pre-line">
                      {item.analysisNotes ? (
                        item.analysisNotes
                      ) : (
                        <span className="text-slate-300 italic">（无笔记）</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-2 text-center align-top pt-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="编辑本行"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="删除本行"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Batch Paste & Word Table Preview Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 sm:p-8 space-y-5 max-h-[92vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  粘贴工作坊表格 · 对应关系核对
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  支持从 Word / WPS 表格中直接复制（包含「源语」、「目标语」、「翻译时应注意」三列）。
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Paste box */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">粘贴表格内容：</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRawPastedText(USER_WORD_TABLE_SAMPLE_TEXT);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>填入您的致辞表格范本</span>
                  </button>
                  <button
                    onClick={() => setRawPastedText('')}
                    className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    清空
                  </button>
                </div>
              </div>

              <textarea
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                rows={4}
                placeholder="在 Word 或 WPS 中全选表格按 Ctrl+C，然后在此处按 Ctrl+V 粘贴..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />

              <button
                onClick={handleParseText}
                disabled={!rawPastedText.trim()}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                  rawPastedText.trim()
                    ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                开始解析并生成三列核对表
              </button>
            </div>

            {/* Verification 3-column table */}
            {hasParsed && (
              <div className="flex-1 overflow-y-auto space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    解析结果核对表（共 {parsedItems.length} 行，单元格可就地修改）：
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAddPreviewRow}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增一行</span>
                    </button>
                    <span className="text-xs text-slate-500">
                      有效行: {parsedItems.filter((p) => p.isValid).length}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 text-xs font-bold border-b border-slate-300">
                        <th className="py-2.5 px-3 w-10 text-center text-slate-400">#</th>
                        <th className="py-2.5 px-3 w-[30%] border-r border-slate-200">源语</th>
                        <th className="py-2.5 px-3 w-[32%] border-r border-slate-200">目标语</th>
                        <th className="py-2.5 px-3 w-[32%] border-r border-slate-200">翻译时应注意</th>
                        <th className="py-2.5 px-2 w-12 text-center">删</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs text-slate-800 bg-white">
                      {parsedItems.map((item, idx) => (
                        <tr key={item.id} className={!item.isValid ? 'bg-rose-50/40' : ''}>
                          <td className="py-2 px-2 text-center text-slate-400 align-top pt-3 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-200 align-top">
                            <textarea
                              value={item.sourceText}
                              onChange={(e) =>
                                handleUpdateParsedCell(idx, 'sourceText', e.target.value)
                              }
                              rows={2}
                              className="w-full p-1.5 border border-slate-200 rounded text-xs text-slate-900 resize-y"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200 align-top">
                            <textarea
                              value={item.targetText}
                              onChange={(e) =>
                                handleUpdateParsedCell(idx, 'targetText', e.target.value)
                              }
                              rows={2}
                              className="w-full p-1.5 border border-slate-200 rounded text-xs text-slate-900 font-serif resize-y"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200 align-top">
                            <textarea
                              value={item.analysisNotes}
                              onChange={(e) =>
                                handleUpdateParsedCell(idx, 'analysisNotes', e.target.value)
                              }
                              rows={2}
                              placeholder="可为空..."
                              className="w-full p-1.5 border border-slate-200 rounded text-xs text-slate-700 resize-y"
                            />
                          </td>
                          <td className="p-2 text-center align-top pt-3">
                            <button
                              onClick={() => handleDeletePreviewRow(idx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    确认核对无误 · 存入题库 ({parsedItems.filter((p) => p.isValid).length}条)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Edit single item */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditedItem}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">编辑复盘表格行</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                源语 (Source) *
              </label>
              <textarea
                value={editingItem.sourceText}
                onChange={(e) => setEditingItem({ ...editingItem, sourceText: e.target.value })}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                目标语 (Target) *
              </label>
              <textarea
                value={editingItem.targetText}
                onChange={(e) => setEditingItem({ ...editingItem, targetText: e.target.value })}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800 font-serif"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                翻译时应注意 (Notes - 可为空)
              </label>
              <textarea
                value={editingItem.analysisNotes}
                onChange={(e) => setEditingItem({ ...editingItem, analysisNotes: e.target.value })}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                保存修改
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: New single item */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSingle}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">新增一行复盘材料</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                源语 (Source) *
              </label>
              <textarea
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="例如：尊敬的（特朗普）总统..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                目标语 (Target) *
              </label>
              <textarea
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="例如：Your Excellency President(Trump)..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800 font-serif"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                翻译时应注意 (Notes - 可为空)
              </label>
              <textarea
                value={newAnalysis}
                onChange={(e) => setNewAnalysis(e.target.value)}
                placeholder="记录正式外交用语、顺句驱动、长句拆分注意点..."
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer"
              >
                添加至题库
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
