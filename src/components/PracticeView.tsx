/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MaterialItem, PracticeMode, AnswerMethod, MasteryLevel, EvaluationResult } from '../types';
import { createSpeechRecognition } from '../services/speechService';
import { calculateNextReviewState, getModeState, updateMaterialWithModeState, SRS_INTERVAL_STEPS } from '../services/srsEngine';
import confetti from 'canvas-confetti';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Keyboard,
  HelpCircle,
  Clock,
  ThumbsUp,
  Lightbulb,
  BrainCircuit,
} from 'lucide-react';

interface PracticeViewProps {
  mode: PracticeMode;
  queue: MaterialItem[];
  allMaterials: MaterialItem[];
  onSaveMaterial: (updated: MaterialItem) => void;
  onFinishSession: () => void;
  onSwitchMode: (newMode: PracticeMode) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  mode,
  queue,
  allMaterials,
  onSaveMaterial,
  onFinishSession,
  onSwitchMode,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerMethod, setAnswerMethod] = useState<AnswerMethod>('type');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [expandDetails, setExpandDetails] = useState(true);

  // Audio recording & Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognizerRef = useRef<any>(null);

  const currentItem = queue[currentIndex];
  const isFinished = currentIndex >= queue.length || !currentItem;

  // Cleanup speech/audio on unmount or question change
  useEffect(() => {
    return () => {
      stopRecordingSession();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [currentIndex]);

  const resetCurrentQuestionState = () => {
    setStudentAnswer('');
    setIsRevealed(false);
    setEvaluation(null);
    setEvaluationError(null);
    setSpeechError(null);
    stopRecordingSession();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  // Determine Question text and Reference text based on mode
  const getQuestionAndReference = () => {
    if (!currentItem) return { question: '', reference: '', directionLabel: '' };

    const isSourceZh = currentItem.sourceLang === 'zh';

    if (mode === 'forward') {
      return {
        question: currentItem.sourceText,
        reference: currentItem.targetText,
        directionLabel: isSourceZh ? '源语 (中文) → 目标语 (英文)' : '源语 (英文) → 目标语 (中文)',
        placeholder: isSourceZh ? '输入你的英文口译表达...' : '输入你的中文口译表达...',
      };
    } else if (mode === 'reverse') {
      return {
        question: currentItem.targetText,
        reference: currentItem.sourceText,
        directionLabel: isSourceZh ? '目标语 (英文) → 回译还原源语' : '目标语 (中文) → 回译还原源语',
        placeholder: isSourceZh ? '用中文反向还原源语信息与逻辑...' : '用英文反向还原源语信息与逻辑...',
      };
    } else {
      // Strategy mode
      return {
        question: currentItem.sourceText,
        reference: currentItem.targetText,
        directionLabel: '翻译时应注意 · 思路复盘',
        placeholder: '陈述你在口译该句时的拆分逻辑、语序重构方法与重点注意的陷阱...',
      };
    }
  };

  const { question, reference, directionLabel, placeholder } = getQuestionAndReference();

  // Voice recording & transcription handlers
  const startRecordingSession = async () => {
    setSpeechError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();

      // Start Web Speech API transcription
      const lang = mode === 'forward'
        ? (currentItem.sourceLang === 'zh' ? 'en' : 'zh')
        : (currentItem.sourceLang === 'zh' ? 'zh' : 'en');

      const speech = createSpeechRecognition();
      speechRecognizerRef.current = speech;

      speech.start(
        lang,
        (transcript) => {
          setStudentAnswer((prev) => {
            // Append or update live transcript
            return transcript;
          });
        },
        (errMsg) => {
          setSpeechError(errMsg);
        }
      );

      setIsRecording(true);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setSpeechError('无法启动麦克风。请检查浏览器权限，或直接使用打字输入/口头自练。');
      setIsRecording(false);
    }
  };

  const stopRecordingSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }
    setIsRecording(false);
  };

  // Submit Answer for AI Evaluation
  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim()) {
      alert('请先输入或说出您的回答');
      return;
    }

    stopRecordingSession();
    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      const resp = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          questionPrompt: question,
          referenceAnswer: reference,
          studentAnswer: studentAnswer.trim(),
          teacherNotes: currentItem.analysisNotes || '',
          isSpeechRecognized: answerMethod === 'voice',
          direction: directionLabel,
        }),
      });

      if (!resp.ok) {
        throw new Error(`服务器响应错误: ${resp.status}`);
      }

      const data = await resp.json();
      setEvaluation(data);
      setIsRevealed(true);
    } catch (err: any) {
      console.error('Submit evaluation error:', err);
      setEvaluationError('AI 点评生成暂不可用，但您已可以查看参考译文与老师分析进行自我核对。');
      setIsRevealed(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Oral practice direct reveal
  const handleOralReveal = () => {
    stopRecordingSession();
    setIsRevealed(true);
  };

  // Handle Mastery Selection
  const handleSelectMastery = (mastery: MasteryLevel, customDays?: number) => {
    if (!currentItem) return;

    const currentModeState = getModeState(currentItem, mode);
    const updatedState = calculateNextReviewState(currentModeState, mastery, customDays);
    const updatedItem = updateMaterialWithModeState(currentItem, mode, updatedState);

    onSaveMaterial(updatedItem);

    // Advance to next question
    if (currentIndex + 1 >= queue.length) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      setCurrentIndex((prev) => prev + 1);
    } else {
      resetCurrentQuestionState();
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Celebration screen when finished
  if (isFinished) {
    return (
      <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto my-8 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
          本次练习已全部完成
        </div>

        <h2 className="text-2xl font-bold text-slate-900">
          太棒了！本轮 {queue.length} 道题目已复习完毕
        </h2>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          已根据您的掌握评级（不会/不熟/已掌握）独立更新了对应练习模式的下次复习周期。
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onFinishSession}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
          >
            返回今日概览
          </button>

          {mode !== 'reverse' && (
            <button
              onClick={() => onSwitchMode('reverse')}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors cursor-pointer"
            >
              切换到反向回译训练
            </button>
          )}

          {mode !== 'strategy' && (
            <button
              onClick={() => onSwitchMode('strategy')}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors cursor-pointer"
            >
              切换到翻译思路训练
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentModeState = getModeState(currentItem, mode);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Progress Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            {mode === 'forward' ? '正向口译' : mode === 'reverse' ? '反向回译' : '翻译思路'}
          </span>
          {currentItem?.tags?.map((t, idx) => (
            <span key={idx} className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {t}
            </span>
          ))}
          <span className="text-xs text-slate-600">{directionLabel}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <span>
            当前进度: <strong className="text-slate-900 tabular-nums">{currentIndex + 1}</strong> / {queue.length}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            当前状态: {currentModeState.mastery === 'none' ? '未开始' : currentModeState.mastery === 'mastered' ? '已掌握' : currentModeState.mastery === 'unfamiliar' ? '不熟' : '不会'}
          </span>
          <button
            onClick={onFinishSession}
            className="text-slate-400 hover:text-slate-700 ml-2 cursor-pointer"
          >
            退出本轮
          </button>
        </div>
      </div>

      {/* Mode Special Notice Banner for Reverse / Strategy */}
      {mode === 'reverse' && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>回译练习提示：</strong>
            请根据下方译文，反向还原出原语的信息与逻辑。口译回译重在准确自然，<strong>不要求逐字机械复现原文</strong>。若原译文曾精简或调整了语序，AI 将基于等效表达进行综合评判。
          </div>
        </div>
      )}

      {mode === 'strategy' && (
        <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-start gap-2.5">
          <BrainCircuit className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <strong>翻译思路练习说明：</strong>
            本模式根据工作坊中老师讲解的切分逻辑、特殊译法与难点处理提问。请尝试主动回忆当时为何这样翻译，回答后将与老师笔记重点核对。
          </div>
        </div>
      )}

      {/* Main Question Focus Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative">
        <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
          {mode === 'reverse' ? '目标语 (Target)' : '源语 (Source)'}
        </div>

        <div className="text-xl sm:text-2xl font-semibold text-slate-900 leading-relaxed font-serif">
          {question}
        </div>

        {/* Strategy mode explicit sub-prompt */}
        {mode === 'strategy' && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">思考指引：</span>
            这句话的逻辑如何梳理？采用了怎样的顺句或切分技巧？请回忆并陈述【翻译时应注意】中的要点。
          </div>
        )}
      </div>

      {/* Answer & Interaction Area */}
      {!isRevealed ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          {/* Method Selector Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <span className="text-xs font-medium text-slate-500 mr-2">选择回答方式:</span>
            <button
              onClick={() => {
                stopRecordingSession();
                setAnswerMethod('type');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                answerMethod === 'type'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>打字输入</span>
            </button>

            <button
              onClick={() => {
                stopRecordingSession();
                setAnswerMethod('voice');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                answerMethod === 'voice'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>语音回答 (录音+转写)</span>
            </button>

            <button
              onClick={() => {
                stopRecordingSession();
                setAnswerMethod('oral');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                answerMethod === 'oral'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>口头自练 (大声说出)</span>
            </button>
          </div>

          {/* Answering Form Content */}
          {answerMethod === 'type' && (
            <div className="space-y-4">
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base text-slate-800 leading-relaxed placeholder:text-slate-400"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 tabular-nums">
                  字数: {studentAnswer.length}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOralReveal}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    直接查看参考内容
                  </button>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={isEvaluating || !studentAnswer.trim()}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm flex items-center gap-2 ${
                      isEvaluating || !studentAnswer.trim()
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer hover:shadow'
                    }`}
                  >
                    {isEvaluating ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>AI 口译导师点评中...</span>
                      </>
                    ) : (
                      <>
                        <span>提交并获取 AI 点评</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {answerMethod === 'voice' && (
            <div className="space-y-4">
              {/* Voice recording toolbar */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecordingSession}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>开始录音答题</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecordingSession}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all animate-pulse cursor-pointer"
                    >
                      <MicOff className="w-4 h-4" />
                      <span>停止录音</span>
                    </button>
                  )}

                  {isRecording && (
                    <span className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      正在实时识别转写中...
                    </span>
                  )}
                </div>

                {audioUrl && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">录音回放:</span>
                    <audio src={audioUrl} controls className="h-8 max-w-xs" />
                  </div>
                )}
              </div>

              {speechError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{speechError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  转写文字内容（可手动核对并修正识别错误后提交）：
                </label>
                <textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="录音后将在此自动生成文字转写，您可以在提交前随时修正..."
                  rows={4}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base text-slate-800 leading-relaxed placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 tabular-nums">
                  字数: {studentAnswer.length}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOralReveal}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    直接查看参考内容
                  </button>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={isEvaluating || !studentAnswer.trim()}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all shadow-sm flex items-center gap-2 ${
                      isEvaluating || !studentAnswer.trim()
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer hover:shadow'
                    }`}
                  >
                    {isEvaluating ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>AI 口译导师点评中...</span>
                      </>
                    ) : (
                      <>
                        <span>提交并获取 AI 点评</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {answerMethod === 'oral' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <Volume2 className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900">大声说出口译答案</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  按照真实会议同传/交传节奏，在心中或大声组织并输出。说完后点击下方按钮，直接对照参考译文与老师分析。
                </p>
              </div>

              <button
                onClick={handleOralReveal}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                口头作答完毕 · 揭晓参考译文与笔记
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Reveal & Evaluation Results Area */
        <div className="space-y-6">
          {/* Reference & Teacher's Original Notes Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                工作坊官方参考内容对照
              </span>
              <span className="text-xs text-slate-400">
                {studentAnswer ? '已提交回答核对' : '口头自练对照'}
              </span>
            </div>

            {/* Official Reference Translation */}
            <div>
              <div className="text-xs font-semibold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>目标语 (Target Reference)</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-base sm:text-lg font-medium text-emerald-950 font-serif leading-relaxed">
                {reference}
              </div>
            </div>

            {/* Teacher's Analysis & Restructuring Notes */}
            {currentItem.analysisNotes && (
              <div>
                <div className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>翻译时应注意 (Notes)</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                  {currentItem.analysisNotes}
                </div>
              </div>
            )}

            {/* My Submitted Answer Echo */}
            {studentAnswer && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">
                  您的作答 ({answerMethod === 'voice' ? '语音转写' : '键盘输入'})：
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800">
                  {studentAnswer}
                </div>
              </div>
            )}
          </div>

          {/* AI Evaluation Card (Rendered only when student answered) */}
          {evaluation && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">AI 口译导师多维深度点评</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">AI 建议掌握等级:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    evaluation.recommendedMastery === 'mastered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : evaluation.recommendedMastery === 'unfamiliar'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {evaluation.recommendedMastery === 'mastered' ? '建议: 已掌握' : evaluation.recommendedMastery === 'unfamiliar' ? '建议: 不熟' : '建议: 不会'}
                  </span>
                </div>
              </div>

              {/* Brief Verdict */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-1">总体综合评价：</span>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {evaluation.briefVerdict}
                </p>
              </div>

              {/* Acceptable Alternative Renderings */}
              {evaluation.acceptableAlternatives && evaluation.acceptableAlternatives.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-2">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>认可的灵活用法 / 有效变体表达（口译现场充分肯定）：</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-emerald-900 leading-relaxed">
                    {evaluation.acceptableAlternatives.map((alt, idx) => (
                      <li key={idx}>{alt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expandable detailed analysis */}
              <div>
                <button
                  onClick={() => setExpandDetails(!expandDetails)}
                  className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <span>查看信息差异与口译顺口度深度分析</span>
                  {expandDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandDetails && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                    {/* Information Diff */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                      <span className="font-bold text-slate-800 block">信息准确性核验：</span>
                      {evaluation.informationDiff.omissions.length > 0 && (
                        <div className="text-rose-700">
                          <span className="font-semibold">漏译：</span>
                          {evaluation.informationDiff.omissions.join('; ')}
                        </div>
                      )}
                      {evaluation.informationDiff.mistranslations.length > 0 && (
                        <div className="text-rose-700">
                          <span className="font-semibold">误译：</span>
                          {evaluation.informationDiff.mistranslations.join('; ')}
                        </div>
                      )}
                      {evaluation.informationDiff.numbersAndTerms.length > 0 && (
                        <div className="text-amber-800">
                          <span className="font-semibold">专名与数字：</span>
                          {evaluation.informationDiff.numbersAndTerms.join('; ')}
                        </div>
                      )}
                      {evaluation.informationDiff.omissions.length === 0 &&
                        evaluation.informationDiff.mistranslations.length === 0 && (
                          <div className="text-emerald-700 font-medium">
                            ✓ 核心信息点、专有名词与逻辑主干传达完整无重大遗漏。
                          </div>
                        )}
                    </div>

                    {/* Spoken Agility & Delivery */}
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                      <span className="font-bold text-slate-800 block">口译顺口度与现场组织：</span>
                      <p className="text-slate-700 leading-relaxed">
                        {evaluation.expressionQuality.spokenAgility}
                      </p>
                      {evaluation.expressionQuality.collocation.length > 0 && (
                        <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                          {evaluation.expressionQuality.collocation.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested Reusable Golden Phrases */}
              {evaluation.suggestedActionablePhrases && evaluation.suggestedActionablePhrases.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    展台实战可直接复用的黄金表达（建议记入随身词库）：
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {evaluation.suggestedActionablePhrases.map((phrase, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-slate-100 text-slate-800 text-xs rounded-md font-medium"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {evaluationError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              {evaluationError}
            </div>
          )}

          {/* Mastery Evaluation Action Bar */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">标记本次练习的掌握程度</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  将按照口译间隔复习算法安排下次复习时间（不同模式互不干扰）：
                </p>
              </div>

              <button
                onClick={resetCurrentQuestionState}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重新作答本题</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleSelectMastery('unlearned', 1)}
                className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-rose-800 group-hover:text-rose-900">
                  ✕ 不会 / 遗忘严重
                </div>
                <div className="text-xs text-rose-600 mt-0.5">
                  重置间隔 · 次日（1天后）强制再复查
                </div>
              </button>

              <button
                onClick={() => handleSelectMastery('unfamiliar', 3)}
                className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-amber-800 group-hover:text-amber-900">
                  △ 不熟 / 卡壳迟疑
                </div>
                <div className="text-xs text-amber-600 mt-0.5">
                  保持紧凑节奏 · 3天后再次巩固
                </div>
              </button>

              <button
                onClick={() => handleSelectMastery('mastered')}
                className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-emerald-800 group-hover:text-emerald-900">
                  ✓ 已掌握 / 脱口而出
                </div>
                <div className="text-xs text-emerald-600 mt-0.5">
                  步进延长至 7-30 天后复查
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
