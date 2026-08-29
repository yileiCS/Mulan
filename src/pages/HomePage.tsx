import { useNavigate } from 'react-router-dom';
import { BookOpen, PenLine, Mic, AlertCircle, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDraftStore } from '../store/useDraftStore';
import { useConfigStore } from '../store/useConfigStore';
import { getApiKey } from '../utils/ai';
import {
  correctTranscript,
  isSpeechRecognitionSupported,
  isMediaRecorderSupported,
  startBrowserRecognition,
  stopBrowserRecognition,
  startMediaRecording,
  stopMediaRecording,
  recognizeWithServer,
} from '../utils/voice';

export default function HomePage() {
  const navigate = useNavigate();
  const { loadAllDrafts, drafts } = useDraftStore();
  const {
    apiKey: configApiKey,
    modelEndpoint: configModelEndpoint,
    voiceApiProvider,
    asrAppId,
    asrAccessKey,
  } = useConfigStore();
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const voiceStopFnRef = useRef<(() => void) | null>(null);
  const isRecordingRef = useRef(false);
  const finalTextRef = useRef('');
  const recordingModeRef = useRef<'browser' | 'server'>('browser');

  const hasApiKey = !!(configApiKey || getApiKey());

  useEffect(() => {
    loadAllDrafts();
  }, [loadAllDrafts]);

  const startRecording = () => {
    setErrorMsg(null);
    finalTextRef.current = '';
    setTranscriptText('');

    const canUseBrowser = isSpeechRecognitionSupported() && voiceApiProvider === 'browser';
    const canUseServer = isMediaRecorderSupported() && asrAppId && asrAccessKey;

    if (canUseBrowser) {
      recordingModeRef.current = 'browser';
      const stopFn = startBrowserRecognition(
        (text) => {
          setTranscriptText(text);
        },
        (errMsg) => {
          if (errMsg.includes('网络') || errMsg.includes('network')) {
            if (canUseServer) {
              if (voiceStopFnRef.current) {
                voiceStopFnRef.current();
                voiceStopFnRef.current = null;
              }
              startServerRecording();
              return;
            }
          }
          setErrorMsg(errMsg);
          stopRecordingInternal(true);
        }
      );
      voiceStopFnRef.current = stopFn;
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);
      return;
    }

    if (canUseServer) {
      startServerRecording();
      return;
    }

    if (!asrAppId || !asrAccessKey) {
      setErrorMsg('请先在设置中配置火山语音识别，或使用 Safari 浏览器');
    } else {
      setErrorMsg('当前浏览器不支持录音功能');
    }
  };

  const startServerRecording = async () => {
    try {
      recordingModeRef.current = 'server';
      const stopFn = await startMediaRecording((errMsg) => {
        setErrorMsg(errMsg);
        stopRecordingInternal(true);
      });
      voiceStopFnRef.current = stopFn;
      isRecordingRef.current = true;
      setIsRecording(true);
      setTranscriptText('正在录音，松开后识别...');
      setRecordDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);
    } catch {
      // 错误已在 onError 中处理
    }
  };

  const stopRecordingInternal = async (silent: boolean = false) => {
    const mode = recordingModeRef.current;
    isRecordingRef.current = false;
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (voiceStopFnRef.current) {
      voiceStopFnRef.current();
      voiceStopFnRef.current = null;
    }

    if (silent) {
      setTranscriptText('');
      return;
    }

    if (mode === 'browser') {
      const result = await stopBrowserRecognition();
      const finalText = correctTranscript(result.text);
      setTranscriptText('');
      if (finalText.trim().length >= 2) {
        navigate('/voice-input', {
          state: { transcript: finalText, duration: recordDuration },
        });
      }
      return;
    }

    if (mode === 'server') {
      try {
        setIsRecognizing(true);
        setTranscriptText('正在识别...');
        const audioBlob = await stopMediaRecording();
        const text = await recognizeWithServer(audioBlob, asrAppId!, asrAccessKey!);
        const finalText = correctTranscript(text);
        setTranscriptText('');
        setIsRecognizing(false);
        if (finalText.trim().length >= 2) {
          navigate('/voice-input', {
            state: { transcript: finalText, duration: recordDuration },
          });
        } else {
          setErrorMsg('没有识别到有效内容，请再试一次');
        }
      } catch (err: any) {
        setIsRecognizing(false);
        setTranscriptText('');
        setErrorMsg(err.message || '识别失败，请重试');
      }
      return;
    }

    setTranscriptText('');
  };

  const stopRecording = () => {
    stopRecordingInternal(false);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}秒`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBF5] to-[#FFF5E8] flex flex-col">
      <header className="flex justify-between items-center px-6 pt-6 pb-2">
        <button
          onClick={() => navigate('/poems')}
          className="flex items-center gap-2 text-[#786B5E] text-base hover:text-[#3D2C1E] transition-colors"
        >
          <BookOpen size={20} />
          <span>我的诗集</span>
        </button>
        <button
          onClick={() => navigate('/settings')}
          className={`p-2 rounded-full transition-colors ${
            hasApiKey
              ? 'text-[#786B5E] hover:text-[#3D2C1E] hover:bg-white/50'
              : 'text-[#D47766] bg-[#FDF2F0] hover:bg-[#F9E8E2]'
          }`}
          title="API 设置"
        >
          <Settings size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif text-[#3D2C1E] mb-3 tracking-wide">
            烟火诗笺
          </h1>
          <p className="text-[#786B5E] text-sm mb-4">
            把日子里的触动，慢慢写成诗
          </p>
          {!hasApiKey && (
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FDF2F0] text-[#D47766] rounded-full text-xs hover:bg-[#F9E8E2] transition-colors"
            >
              <Settings size={14} />
              <span>配置 API Key 获得完整体验</span>
            </button>
          )}
        </div>

        <div className="relative mb-8">
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-48 h-48 rounded-full bg-[#F59E0B] opacity-20 animate-ping" />
              <div
                className="absolute w-40 h-40 rounded-full bg-[#F59E0B] opacity-30"
                style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
              />
            </div>
          )}

          <button
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => { if (isRecording) stopRecording(); }}
            className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center text-white font-medium shadow-lg transition-all duration-200 select-none ${
              isRecording
                ? 'bg-[#E8890A] scale-95 shadow-inner'
                : 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] hover:scale-105 active:scale-95'
            }`}
          >
            <Mic size={36} className={isRecording ? 'animate-bounce' : ''} />
            {isRecording ? (
              <span className="text-xs mt-1">{formatDuration(recordDuration)}</span>
            ) : (
              <span className="text-sm mt-1">按住说话</span>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="w-full max-w-xs bg-[#FDF2F0] border border-[#F5D5CE] rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={18} className="text-[#D47766] mt-0.5 flex-shrink-0" />
            <p className="text-[#B85A48] text-sm leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {isRecording && transcriptText && (
          <div className="w-full max-w-xs bg-white/70 backdrop-blur rounded-xl p-4 mb-6 shadow-sm">
            <p className="text-[#3D2C1E] text-sm leading-relaxed line-clamp-3">
              {transcriptText}
            </p>
          </div>
        )}

        {!isRecording && (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => navigate('/text-input')}
              className="flex items-center gap-2 px-6 py-3 bg-white rounded-full text-[#786B5E] shadow-sm hover:shadow-md hover:text-[#3D2C1E] transition-all"
            >
              <PenLine size={18} />
              <span>用文字写</span>
            </button>

            <p className="text-[#A8998B] text-xs text-center max-w-xs">
              {drafts.length > 0
                ? `已有 ${drafts.length} 篇灵感草稿，随时可以接着写`
                : '按住按钮，说出你心里的画面或感受'}
            </p>
          </div>
        )}

        {isRecording && (
          <p className="text-[#A8998B] text-xs mt-4">
            松开结束，自动生成草稿
          </p>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
