/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedTemplateItem, MaterialItem } from '../types';
import { createInitialReviewState } from './sampleData';

/**
 * Exact sample copied from Word/WPS table as shown in the user's screenshot
 * Columns: 源语 \t 目标语 \t 翻译时应注意
 */
export const USER_WORD_TABLE_SAMPLE_TEXT = `习近平主席于 2026 年特朗普访华时致辞
源语	目标语	翻译时应注意
尊敬的（特朗普）总统	Your Excellency President(Trump)	注意正式外交用语
我们相聚在人民大会堂	We gather here at the Great Hall of the People	如果单说 we gather here, 会让人感觉无礼，但用介词引出实际地点，更符合外交正式用语
中美关系发展历程中的重要时刻	The important moment in the development of China-US relations	不要啰嗦，直接就是发展，不要去想历程，但笔译可以翻出来，course
首先	At the outset/ may I begin(start) by doing sth	正式外交用语就是这三个，如果在顺句驱动时，不能直接现出谓语，那就更推荐用 at the outset
中国政府和中国人民	The Chinese government and people	不要啰嗦，直接就是 people，不用再去加一个 Chinese
以我个人的名义	In my own name	固定用法
表示热烈的欢迎	Bid a warm welcome	Bid 一词既可以接欢迎，又可以接告别，如 bid farewell to
`;

export const SAMPLE_GLOSSARY_TEXT = `因地制宜 - tailored to local conditions
新质生产力 = new quality productive forces
de-escalation / 局势降温
agile governance - 敏捷治理
frontier AI models - 前沿人工智能模型
risk mitigation = 风险化解 / 风险防范
`;

export const SAMPLE_TEMPLATE_TEXT = `【原语】中国将坚持高水平对外开放，稳步扩大规则、规制、管理、标准等制度型开放。
【参考译文】China will stay committed to high-standard opening-up and steadily expand institutional opening-up with regard to rules, regulations, management, and standards.
【分析笔记】老师讲解：“制度型开放”对应 institutional opening-up；顺句驱动时动词“坚持”用 stay committed to 比简单 keep 更专业。
---
【原语】The rapid deployment of frontier AI models calls for agile governance frameworks.
【参考译文】前沿人工智能模型的快速落地应用，要求建立敏捷治理框架。
【分析笔记】老师讲解：deployment 在商业语境常译为“落地应用”；calls for 意为“要求建立”。
`;

/**
 * Detect language of the text
 */
export function detectLanguage(text: string): 'zh' | 'en' {
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return chineseCharCount >= 1 ? 'zh' : 'en';
}

/**
 * Parse text copied from Word / WPS / Excel tables or raw text.
 * Specifically handles the user's 3-column table:
 * [源语] \t [目标语] \t [翻译时应注意]
 */
export function parsePastedNotes(rawText: string): ParsedTemplateItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Check if rawText contains tab characters (\t) typical of Word / WPS / Excel tables
  if (rawText.includes('\t')) {
    const tableItems = parseWordWpsTable(rawText);
    if (tableItems.length > 0) {
      return tableItems;
    }
  }

  // Check if text contains structured tags 【原语】 / 【参考译文】 / 【分析笔记】
  const hasStructuredTags = /(?:【原语】|\[(?:原语|Source)\]|源语[:：]|Source[:：])/i.test(rawText);

  if (hasStructuredTags) {
    let blocks: string[] = [];
    if (rawText.includes('---')) {
      blocks = rawText.split(/\n\s*---\s*\n/).filter((b) => b.trim().length > 0);
    } else {
      const delimiterRegex = /(?=(?:【原语】|\[(?:原语|Source)\]|^(?:\d+[\.、]\s*(?:原语|Source))))/im;
      const splitCandidates = rawText.split(delimiterRegex).filter((b) => b.trim().length > 0);
      blocks = splitCandidates.length > 1 ? splitCandidates : [rawText];
    }

    const results: ParsedTemplateItem[] = [];

    blocks.forEach((block, index) => {
      let sourceText = '';
      let targetText = '';
      let analysisNotes = '';
      const warnings: string[] = [];

      const sourceMatch = block.match(/(?:【原语】|\[(?:原语|Source)\]|源语[:：]|Source[:：])\s*([\s\S]*?)(?=(?:【参考译文】|【目标语】|【译文】|\[(?:参考译文|目标语|译文|Target|Translation)\]|(?:参考译文|目标语|译文|Target)[:：]|$))/i);
      if (sourceMatch && sourceMatch[1]) {
        sourceText = sourceMatch[1].trim();
      }

      const targetMatch = block.match(/(?:【参考译文】|【目标语】|【译文】|\[(?:参考译文|目标语|译文|Target|Translation)\]|(?:参考译文|目标语|译文|Target)[:：])\s*([\s\S]*?)(?=(?:【翻译时应注意】|【分析笔记】|【笔记】|\[(?:翻译时应注意|分析笔记|分析|笔记|Analysis|Notes)\]|(?:翻译时应注意|分析笔记|分析|笔记|Analysis)[:：]|$))/i);
      if (targetMatch && targetMatch[1]) {
        targetText = targetMatch[1].trim();
      }

      const analysisMatch = block.match(/(?:【翻译时应注意】|【分析笔记】|【笔记】|\[(?:翻译时应注意|分析笔记|分析|笔记|Analysis|Notes)\]|(?:翻译时应注意|分析笔记|分析|笔记|Analysis)[:：])\s*([\s\S]*)$/i);
      if (analysisMatch && analysisMatch[1]) {
        analysisNotes = analysisMatch[1].trim();
      }

      // Clean leading/trailing colons
      sourceText = sourceText.replace(/^[\s:：]+/, '').trim();
      targetText = targetText.replace(/^[\s:：]+/, '').trim();
      analysisNotes = analysisNotes.replace(/^[\s:：]+/, '').trim();

      if (!sourceText) warnings.push('缺少源语');
      if (!targetText) warnings.push('缺少目标语');
      if (!analysisNotes) warnings.push('未提供“翻译时应注意”笔记');

      const isValid = Boolean(sourceText && targetText);

      results.push({
        id: `parsed-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        sourceText,
        targetText,
        analysisNotes,
        sourceLang: detectLanguage(sourceText || targetText),
        tags: ['工坊复盘'],
        isValid,
        warnings,
      });
    });

    return results;
  }

  // Fallback: Check if it's line-by-line glossary
  return parseLineByLineGlossary(rawText);
}

/**
 * Specific parser for Word / WPS / Excel tables (Tab-separated values)
 * Automatically recognizes:
 * - Title rows: e.g. "习近平主席于 2026 年特朗普访华时致辞"
 * - Header row: "源语 \t 目标语 \t 翻译时应注意"
 * - Data rows: "尊敬的（特朗普）总统 \t Your Excellency President(Trump) \t 注意正式外交用语"
 */
function parseWordWpsTable(text: string): ParsedTemplateItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedTemplateItem[] = [];

  let detectedTopic = '';
  let sourceColIdx = 0;
  let targetColIdx = 1;
  let notesColIdx = 2;
  let hasFoundHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split('\t').map((c) => c.trim());

    // Single column line at the beginning: likely Topic / Speech Title
    if (cols.length === 1 && !hasFoundHeader && i <= 1) {
      detectedTopic = cols[0];
      continue;
    }

    // Header row check
    const isHeader =
      cols.some((c) => c.includes('源语') || c.toLowerCase().includes('source')) &&
      cols.some((c) => c.includes('目标语') || c.includes('译文') || c.toLowerCase().includes('target'));

    if (isHeader) {
      hasFoundHeader = true;
      cols.forEach((col, idx) => {
        if (col.includes('源语') || col.toLowerCase().includes('source')) {
          sourceColIdx = idx;
        } else if (col.includes('目标语') || col.includes('译文') || col.toLowerCase().includes('target')) {
          targetColIdx = idx;
        } else if (col.includes('注意') || col.includes('笔记') || col.toLowerCase().includes('note')) {
          notesColIdx = idx;
        }
      });
      continue;
    }

    // Data row with at least 2 columns
    if (cols.length >= 2) {
      const sourceText = cols[sourceColIdx] || cols[0] || '';
      const targetText = cols[targetColIdx] || cols[1] || '';
      const analysisNotes = cols[notesColIdx] || cols[2] || '';

      const warnings: string[] = [];
      if (!sourceText) warnings.push('缺少源语');
      if (!targetText) warnings.push('缺少目标语');
      if (!analysisNotes) warnings.push('未提供“翻译时应注意”笔记');

      const tags = ['工坊表格'];
      if (detectedTopic) {
        tags.push(detectedTopic.slice(0, 20));
      }

      items.push({
        id: `word-table-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        sourceText,
        targetText,
        analysisNotes,
        sourceLang: detectLanguage(sourceText || targetText),
        tags,
        isValid: Boolean(sourceText && targetText),
        warnings,
      });
    }
  }

  return items;
}

/**
 * Line by line glossary parser for "A - B", "A = B", "A / B"
 */
function parseLineByLineGlossary(text: string): ParsedTemplateItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedTemplateItem[] = [];

  lines.forEach((line, idx) => {
    // Delimiters: ' - ', ' = ', ' / ', '\t', '：', ': '
    const separatorMatch = line.match(/^([^\t=\-—/：:]+)(?:\t|\s+[-—=]\s+|\s+[/]\s+|[：:]\s*)([\s\S]+)$/);

    if (separatorMatch) {
      let part1 = separatorMatch[1].trim();
      let part2 = separatorMatch[2].trim();
      part1 = part1.replace(/^\d+[\.、\s]+/, '').trim();

      const lang1 = detectLanguage(part1);
      const warnings: string[] = ['未提供“翻译时应注意”笔记'];

      items.push({
        id: `glossary-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        sourceText: part1,
        targetText: part2,
        analysisNotes: '',
        sourceLang: lang1,
        tags: ['术语词汇'],
        isValid: Boolean(part1 && part2),
        warnings,
      });
    } else {
      items.push({
        id: `invalid-${Date.now()}-${idx}`,
        sourceText: line,
        targetText: '',
        analysisNotes: '',
        sourceLang: detectLanguage(line),
        tags: ['术语词汇'],
        isValid: false,
        warnings: ['未识别到目标语（请使用 - 或 = 或 / 分隔）'],
      });
    }
  });

  return items;
}

/**
 * Convert parsed item into persistent MaterialItem with independent SRS state
 */
export function convertParsedToMaterial(parsed: ParsedTemplateItem): MaterialItem {
  return {
    id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sourceText: parsed.sourceText,
    targetText: parsed.targetText,
    analysisNotes: parsed.analysisNotes,
    sourceLang: parsed.sourceLang,
    tags: parsed.tags && parsed.tags.length > 0 ? parsed.tags : ['工坊表格'],
    createdAt: new Date().toISOString(),
    forwardState: createInitialReviewState(0),
    reverseState: createInitialReviewState(0),
    strategyState: createInitialReviewState(0),
  };
}

/**
 * Export materials array to formatted Word table text (Tab-separated)
 */
export function exportToWordTableText(materials: MaterialItem[], topicTitle = '口译工作坊复盘笔记'): string {
  const rows = [topicTitle, '源语\t目标语\t翻译时应注意'];
  materials.forEach((m) => {
    rows.push(`${m.sourceText}\t${m.targetText}\t${m.analysisNotes || ''}`);
  });
  return rows.join('\n');
}
