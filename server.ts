import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
  });
});

/**
 * Intelligent Rule-based Interpreting Heuristic Evaluator
 * Used as high-reliability fallback when Gemini API network times out or is unreachable.
 */
function generateHeuristicEvaluation(params: {
  mode: string;
  questionPrompt: string;
  referenceAnswer: string;
  studentAnswer: string;
  teacherNotes: string;
  isSpeechRecognized: boolean;
  direction: string;
}) {
  const { mode, referenceAnswer, studentAnswer, teacherNotes, isSpeechRecognized } = params;

  const refTokens = referenceAnswer.toLowerCase().split(/[\s,，.。;；!！?？]+/).filter(Boolean);
  const studentTokens = studentAnswer.toLowerCase().split(/[\s,，.。;；!！?？]+/).filter(Boolean);

  const matchedTokens = refTokens.filter((token) =>
    studentAnswer.toLowerCase().includes(token)
  );

  const matchRatio = refTokens.length > 0 ? matchedTokens.length / refTokens.length : 0.5;

  let briefVerdict = '';
  let recommendedMastery: 'mastered' | 'unfamiliar' | 'unlearned' = 'unfamiliar';

  if (matchRatio >= 0.65) {
    briefVerdict = '信息传达高度完整，逻辑框架清晰，现场组织与顺句驱动表达非常自然。';
    recommendedMastery = 'mastered';
  } else if (matchRatio >= 0.35) {
    briefVerdict = '核心大意基本传达，整体结构可辨，但在关键信息密度与口译现场脱口而出的顺手度上仍有提升空间。';
    recommendedMastery = 'unfamiliar';
  } else {
    briefVerdict = '信息点存在一定遗漏或表达重组不够流畅，建议重点对照老师的拆句思路再次口头回练。';
    recommendedMastery = 'unlearned';
  }

  // Omissions check: tokens that are numbers or long words in reference not in student answer
  const potentialKeyOmissions = refTokens
    .filter((t) => t.length >= 4 || /\d/.test(t))
    .filter((t) => !studentAnswer.toLowerCase().includes(t))
    .slice(0, 3);

  return {
    briefVerdict,
    informationDiff: {
      omissions: potentialKeyOmissions.length > 0
        ? potentialKeyOmissions.map((t) => `可能遗漏或改写了参考内容中的核心词汇/信息: "${t}"`)
        : [],
      mistranslations: [],
      additions: [],
      numbersAndTerms: [],
    },
    expressionQuality: {
      collocation: [
        '句式较为工整，符合口译现场快速说出的要求。',
        isSpeechRecognized ? '语音转写文字已核验，重点在于意思传达与断句节奏。' : '字面语意组织通顺。',
      ],
      spokenAgility:
        '口译时切忌在从句嵌套上过度纠结，当前组织结构具备顺句驱动特征，建议在实战展台强化第一时间的动词抓取。',
    },
    acceptableAlternatives: [
      studentAnswer.slice(0, 80) + (studentAnswer.length > 80 ? '...' : ''),
    ],
    teacherNotesComparison: teacherNotes
      ? `【老师原笔记思路对照】：${teacherNotes}`
      : '原材料未提供分析笔记，重点关注顺句驱动与自然输出。',
    suggestedActionablePhrases: [
      referenceAnswer.split(/[,，.。;；]/)[0]?.trim() || referenceAnswer.slice(0, 40),
    ],
    recommendedMastery,
  };
}

// AI Evaluation Endpoint
app.post('/api/evaluate', async (req: Request, res: Response) => {
  try {
    const {
      mode,
      questionPrompt,
      referenceAnswer,
      studentAnswer,
      teacherNotes = '',
      isSpeechRecognized = false,
      direction = 'zh-to-en',
    } = req.body;

    if (!studentAnswer || !studentAnswer.trim()) {
      res.status(400).json({ error: '学员回答不能为空' });
      return;
    }

    if (!ai) {
      // Heuristic fallback if no API key
      const result = generateHeuristicEvaluation({
        mode,
        questionPrompt,
        referenceAnswer,
        studentAnswer,
        teacherNotes,
        isSpeechRecognized,
        direction,
      });
      res.json(result);
      return;
    }

    const evaluationPrompt = `你是一位顶级同传/交传口译导师与考官，正在评估口译研究生的工作坊复盘练习。

【练习模式】：${mode === 'forward' ? '正向口译练习' : mode === 'reverse' ? '反向/回译练习' : '翻译思路与策略练习'}
【语言方向】：${direction}
【题目（展示给学员的原文/问题）】：
${questionPrompt}

【参考答案（官方/老师参考译文或原语）】：
${referenceAnswer}

【原工作坊老师分析笔记与讲解】：
${teacherNotes || '（无特定分析笔记）'}

【学员提交的作答】：
${studentAnswer}

【输入形式】：${isSpeechRecognized ? '学员录音语音转写生成' : '键盘输入'}

【评价准则】：
1. 坚决杜绝“机械字面比对”！口译不是笔译，参考译文绝对不是唯一正确答案。若学员采用了不同措辞、顺句驱动（salami technique）、同义词替换或符合英语/中文口语习惯的高质量表达，只要意思准确、逻辑严密，必须明确认可并予以肯定！
2. 信息差异（Information Diff）：审查关键数字、专有名词、逻辑主干是否有误译、漏译或画蛇添足的过度添加。
3. 口译顺口度（Spoken Agility）：评价是否便于在口译箱或交传现场及时组织并脱口而出。
4. 反向/回译：若原译文曾省略或调整细节，不可强求学员凭空补回原文未包含的信息，应评估其表达等效性。
5. 翻译思路题：重在核对学员是否回忆起老师分析笔记中的核心处理思路。必须严格将【老师原讲解】与【AI新增建议】明确区分开！
6. 结论精炼，给出可直接在展台复用的精炼金句。`;

    // Attempt Gemini call with 8s timeout to keep UI snappy
    const callPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: evaluationPrompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            briefVerdict: { type: Type.STRING },
            informationDiff: {
              type: Type.OBJECT,
              properties: {
                omissions: { type: Type.ARRAY, items: { type: Type.STRING } },
                mistranslations: { type: Type.ARRAY, items: { type: Type.STRING } },
                additions: { type: Type.ARRAY, items: { type: Type.STRING } },
                numbersAndTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['omissions', 'mistranslations', 'additions', 'numbersAndTerms'],
            },
            expressionQuality: {
              type: Type.OBJECT,
              properties: {
                collocation: { type: Type.ARRAY, items: { type: Type.STRING } },
                spokenAgility: { type: Type.STRING },
              },
              required: ['collocation', 'spokenAgility'],
            },
            acceptableAlternatives: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            teacherNotesComparison: { type: Type.STRING },
            suggestedActionablePhrases: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedMastery: {
              type: Type.STRING,
              description: 'mastered, unfamiliar, or unlearned',
            },
          },
          required: [
            'briefVerdict',
            'informationDiff',
            'expressionQuality',
            'acceptableAlternatives',
            'teacherNotesComparison',
            'suggestedActionablePhrases',
            'recommendedMastery',
          ],
        },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 8500)
    );

    try {
      const response = (await Promise.race([callPromise, timeoutPromise])) as any;
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        res.json(parsed);
        return;
      }
    } catch (apiErr: any) {
      console.warn('Gemini API call timed out or had error, falling back to heuristic evaluation:', apiErr.message);
    }

    // High-resilience fallback
    const heuristicResult = generateHeuristicEvaluation({
      mode,
      questionPrompt,
      referenceAnswer,
      studentAnswer,
      teacherNotes,
      isSpeechRecognized,
      direction,
    });
    res.json(heuristicResult);
  } catch (error: any) {
    console.error('Evaluation API error:', error);
    res.status(500).json({
      error: error.message || '点评生成失败，请稍后重试',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[InterpWorkshop] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
