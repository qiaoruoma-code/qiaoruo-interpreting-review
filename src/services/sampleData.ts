/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialItem, ModeReviewState } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createInitialReviewState(nextReviewOffsetDays = 0): ModeReviewState {
  const d = new Date();
  d.setDate(d.getDate() + nextReviewOffsetDays);
  const nextReviewDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    mastery: 'none',
    intervalDays: 1,
    historyCount: 0,
    nextReviewDate,
  };
}

export const INITIAL_SAMPLE_MATERIALS: MaterialItem[] = [
  {
    id: 'mat-sample-1',
    sourceText: '中国将坚持高水平对外开放，稳步扩大规则、规制、管理、标准等制度型开放，营造市场化、法治化、国际化一流营商环境。',
    targetText: 'China will stay committed to high-standard opening-up, steadily expand institutional opening-up with regard to rules, regulations, management, and standards, and foster a world-class business environment that is market-oriented, law-based, and internationalized.',
    analysisNotes: '老师分析：\n1. 四个“化”排比（市场化、法治化、国际化一流营商环境）是经典高频口译考点，务必使用复合形容词搭配定语从句或直接后置修饰：a world-class business environment that is market-oriented, law-based, and internationalized，切忌直译成"make the business environment become market..."；\n2. “制度型开放”对应 institutional opening-up；\n3. 顺句驱动时动词“坚持”用 stay committed to 或 remain dedicated to，比简单 keep 更地道。',
    sourceLang: 'zh',
    tags: ['经贸政策', '双向排比', '顺句驱动'],
    createdAt: new Date().toISOString(),
    forwardState: {
      mastery: 'unfamiliar',
      intervalDays: 1,
      historyCount: 1,
      nextReviewDate: getTodayDateString(),
    },
    reverseState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    strategyState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
  },
  {
    id: 'mat-sample-2',
    sourceText: 'The rapid deployment of frontier AI models calls for agile governance frameworks that balance bold technological innovation with proactive risk mitigation.',
    targetText: '前沿人工智能模型的快速落地应用，要求建立敏捷治理框架，在鼓励大胆技术创新的同时，主动防范和化解潜在风险。',
    analysisNotes: '老师讲解：\n1. deployment 在商业和工程语境中常译为“落地应用”或“部署推广”，不要生硬套用“调配”；\n2. balance A with B 在口译中宜拆译为“在……的同时，……”，避免翻译成“把A和B平衡起来”这种欧化句式；\n3. proactive risk mitigation 强调的是主动作为，“防范和化解”符合政策中文习惯。',
    sourceLang: 'en',
    tags: ['科技治理', '英译中', '语序重组'],
    createdAt: new Date().toISOString(),
    forwardState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    reverseState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    strategyState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
  },
  {
    id: 'mat-sample-3',
    sourceText: '我们不能走先污染、后治理的老路，必须统筹推进降碳、减污、扩绿、增长，协同推进生态优先、节约集约、绿色低碳发展。',
    targetText: 'We must not repeat the old path of polluting first and cleaning up later. Instead, we must pursue coordinated efforts to cut carbon emissions, reduce pollution, expand green development, and pursue economic growth, prioritizing ecological conservation and resource efficiency.',
    analysisNotes: '老师讲解：\n1. 拆句技巧：原句是长并列动宾结构，口译切忌等听到最后才找主语，先用“We must not...”输出第一小句，第二句立刻用“Instead, we must pursue...”顺句推演；\n2. “先污染、后治理”口头常用“polluting first and cleaning up later”；\n3. “降碳、减污、扩绿、增长”八字口诀可采用平行动名词短语，或者动宾结构“cut carbon, reduce pollution...”。',
    sourceLang: 'zh',
    tags: ['绿色低碳', '长句切分', '四字格处理'],
    createdAt: new Date().toISOString(),
    forwardState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    reverseState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    strategyState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
  },
  {
    id: 'mat-sample-4',
    sourceText: 'De-escalation hinges on genuine political will and a willingness from all stakeholders to step back from the brink and return to the negotiating table.',
    targetText: '局势降温的关键在于各方具备切实的政治意愿，各利益攸关方愿意悬崖勒马，重返谈判桌。',
    analysisNotes: '老师讲解：\n1. hinges on 是高频交传短语，听力抓取到立刻反应为“关键在于/取决于”；\n2. step back from the brink 是典型外交习语“悬崖勒马 / 从冲突边缘后撤”；\n3. all stakeholders 口译常译为“各利益攸关方”或“相关各方”。',
    sourceLang: 'en',
    tags: ['外交政经', '习语表达', '交传高频词'],
    createdAt: new Date().toISOString(),
    forwardState: {
      mastery: 'mastered',
      intervalDays: 7,
      historyCount: 3,
      nextReviewDate: getTodayDateString(),
    },
    reverseState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    strategyState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
  },
  {
    id: 'mat-sample-5',
    sourceText: '因地制宜发展新质生产力',
    targetText: 'develop new quality productive forces tailored to local conditions',
    analysisNotes: '官方标准表述：new quality productive forces；“因地制宜”后置使用 tailored to local conditions 或 in light of local conditions，避免把因地制宜放在句首导致口译时句式卡壳。',
    sourceLang: 'zh',
    tags: ['核心热词', '状语后置', '官方标准译法'],
    createdAt: new Date().toISOString(),
    forwardState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    reverseState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
    strategyState: {
      mastery: 'none',
      intervalDays: 1,
      historyCount: 0,
      nextReviewDate: getTodayDateString(),
    },
  },
];
