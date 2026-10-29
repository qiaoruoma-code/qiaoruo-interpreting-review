/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Safe wrapper for SpeechRecognition across browsers
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface SpeechRecognitionHelper {
  isSupported: boolean;
  start: (
    lang: string,
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: string) => void
  ) => void;
  stop: () => void;
}

export function createSpeechRecognition(): SpeechRecognitionHelper {
  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  if (!SpeechRecognitionClass) {
    return {
      isSupported: false,
      start: (_lang, _onResult, onError) => {
        onError('当前浏览器不支持原生 Web Speech 语音识别，请使用键盘输入或口头自练。建议使用 Chrome / Edge 浏览器。');
      },
      stop: () => {},
    };
  }

  let recognition: any = null;

  return {
    isSupported: true,
    start: (lang, onResult, onError) => {
      try {
        if (recognition) {
          recognition.abort();
        }
        recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang === 'en' ? 'en-US' : 'zh-CN';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const combined = finalTranscript || interimTranscript;
          if (combined) {
            onResult(combined, Boolean(finalTranscript));
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          if (event.error === 'not-allowed') {
            onError('麦克风权限被拒绝，请在浏览器地址栏允许麦克风访问。');
          } else if (event.error !== 'no-speech') {
            onError(`语音识别提示: ${event.error}`);
          }
        };

        recognition.start();
      } catch (e: any) {
        console.error('Error starting speech recognition:', e);
        onError('启动语音识别失败，请直接打字或使用口头自练。');
      }
    },
    stop: () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
        recognition = null;
      }
    },
  };
}
