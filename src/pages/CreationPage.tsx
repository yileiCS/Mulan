import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Check,
  Trash2,
  GripVertical,
  Send,
  Sparkles,
  BookOpen,
  Mic,
} from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import { useConfigStore } from '../store/useConfigStore';
import { callAI, getApiKey } from '../utils/ai';
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
import type { InspirationOption, ChatMessage } from '../types';

export default function CreationPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { currentDraft, loadDraft, addChatMessage, adoptLine, setOptionFeedback, updateCurrentDraft } = useDraftStore();
  const {
    apiKey: configApiKey,
    modelEndpoint: configModelEndpoint,
    voiceApiProvider,
    asrAppId,
    asrAccessKey,
  } = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showInspiration, setShowInspiration] = useState(true);
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const voiceStopFnRef = useRef<(() => void) | null>(null);
  const isVoiceRecordingRef = useRef(false);
  const voiceFinalTextRef = useRef('');
  const recordingModeRef = useRef<'browser' | 'server'>('browser');

  useEffect(() => {
    if (draftId && !initialized.current) {
      initialized.current = true;
      loadDraft(draftId);
    }
  }, [draftId, loadDraft]);

  useEffect(() => {
    if (currentDraft && currentDraft.chatHistory.length === 1 && !isLoading) {
      generateInspiration();
    }
  }, [currentDraft?.chatHistory.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentDraft?.chatHistory.length, isLoading]);

  const generateInspiration = async () => {
    if (!currentDraft) return;

    setIsLoading(true);
    setError(null);

    try {
      const key = configApiKey || getApiKey() || '';

      if (!key) {
        const mockResult = generateMockInspiration(currentDraft.inspirationText);
        const msg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: mockResult.confirmation,
          timestamp: Date.now(),
          type: 'options',
          options: mockResult.options,
        };
        await addChatMessage(msg);
        setIsLoading(false);
        return;
      }

      const recentHistory = currentDraft.chatHistory
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await callAI(key, currentDraft.inspirationText, recentHistory, configModelEndpoint);

      const msg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: result.confirmation,
        timestamp: Date.now(),
        type: 'options',
        options: result.options.map((o) => ({
          ...o,
          feedback: null,
          adopted: false,
        })),
      };
      await addChatMessage(msg);
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockInspiration = (text: string) => {
    const keywords = text.split(/[，。！？、\s]+/).filter((w) => w.length >= 2).slice(0, 3);
    const kw1 = keywords[0] || '这一刻';
    const kw2 = keywords[1] || keywords[0] || '安静';

    const detailTemplates = [
      `${kw1}落在那儿，安安静静的`,
      `数${kw1}旁边的细小影子`,
      `${kw1}慢慢挪过了地砖缝`,
    ];
    const emotionTemplates = [
      `心里软了一下，像${kw2}晒过的被子`,
      `胸口热热的，像揣了杯${kw2}`,
      `忽然就踏实了，跟${kw1}在一块儿似的`,
    ];
    const extensionTemplates = [
      `这样的${kw1}，一天能有几个呢`,
      `要是每天都有这样的${kw2}就好了`,
      `多年以后，会不会还想起今天的${kw1}`,
    ];

    const seed = text.length;
    const detailIdx = seed % detailTemplates.length;
    const emotionIdx = (seed + 1) % emotionTemplates.length;
    const extensionIdx = (seed + 2) % extensionTemplates.length;

    return {
      confirmation: `看到${kw1}的时候，心里总有点什么在慢慢动`,
      options: [
        {
          id: `opt_mock_${Date.now()}_1`,
          text: detailTemplates[detailIdx],
          direction: 'detail' as const,
          feedback: null,
          adopted: false,
        },
        {
          id: `opt_mock_${Date.now()}_2`,
          text: emotionTemplates[emotionIdx],
          direction: 'emotion' as const,
          feedback: null,
          adopted: false,
        },
        {
          id: `opt_mock_${Date.now()}_3`,
          text: extensionTemplates[extensionIdx],
          direction: 'extension' as const,
          feedback: null,
          adopted: false,
        },
      ],
    };
  };

  const handleSelectOption = async (option: InspirationOption) => {
    if (!currentDraft) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: option.text,
      timestamp: Date.now(),
      type: 'custom',
    };
    await addChatMessage(userMsg);

    setIsLoading(true);
    setError(null);

    try {
      const key = configApiKey || getApiKey() || '';

      if (!key) {
        setTimeout(async () => {
          const mockDeep = generateMockDeepening(option.text);
          const msg: ChatMessage = {
            id: `msg_${Date.now()}_a`,
            role: 'assistant',
            content: mockDeep.confirmation,
            timestamp: Date.now(),
            type: 'deepening',
            options: mockDeep.options,
          };
          await addChatMessage(msg);
          setIsLoading(false);
        }, 800);
        return;
      }

      const recentHistory = currentDraft.chatHistory
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));
      recentHistory.push({ role: 'user', content: option.text });

      const result = await callAI(key, currentDraft.inspirationText, recentHistory, configModelEndpoint);

      const msg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: result.confirmation,
        timestamp: Date.now(),
        type: 'deepening',
        options: result.options.map((o) => ({
          ...o,
          feedback: null,
          adopted: false,
        })),
      };
      await addChatMessage(msg);
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockDeepening = (text: string) => {
    return {
      confirmation: `顺着这个方向再往下想一点`,
      options: [
        {
          id: `opt_deep_${Date.now()}_1`,
          text: `${text.slice(0, 8)}，再慢一点`,
          direction: 'detail' as const,
          feedback: null,
          adopted: false,
        },
        {
          id: `opt_deep_${Date.now()}_2`,
          text: `说不出哪里好，就是忘不了`,
          direction: 'emotion' as const,
          feedback: null,
          adopted: false,
        },
        {
          id: `opt_deep_${Date.now()}_3`,
          text: `以后再想起，应该还是这个样子`,
          direction: 'extension' as const,
          feedback: null,
          adopted: false,
        },
      ],
    };
  };

  const handleAdopt = async (option: InspirationOption) => {
    await adoptLine(option.text);
    if (currentDraft) {
      const updatedHistory = currentDraft.chatHistory.map((msg) => {
        if (msg.options) {
          return {
            ...msg,
            options: msg.options.map((o) =>
              o.id === option.id ? { ...o, adopted: true } : o
            ),
          };
        }
        return msg;
      });
      await updateCurrentDraft({ chatHistory: updatedHistory });
    }
  };

  const handleFeedback = async (optionId: string, feedback: 'like' | 'dislike') => {
    const currentOption = findOption(optionId);
    if (currentOption?.feedback === feedback) {
      await setOptionFeedback(optionId, null);
    } else {
      await setOptionFeedback(optionId, feedback);
    }
  };

  const findOption = (optionId: string): InspirationOption | undefined => {
    if (!currentDraft) return undefined;
    for (const msg of currentDraft.chatHistory) {
      if (msg.options) {
        const found = msg.options.find((o) => o.id === optionId);
        if (found) return found;
      }
    }
    return undefined;
  };

  const handleCustomInput = async () => {
    const trimmed = customInput.trim();
    if (!trimmed || !currentDraft) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      type: 'custom',
    };
    await addChatMessage(userMsg);
    setCustomInput('');

    const updatedInspiration = currentDraft.inspirationText + '；' + trimmed;
    await updateCurrentDraft({ inspirationText: updatedInspiration });

    setIsLoading(true);
    setError(null);

    try {
      const key = configApiKey || getApiKey() || '';

      if (!key) {
        setTimeout(async () => {
          const mock = generateMockInspiration(trimmed);
          const msg: ChatMessage = {
            id: `msg_${Date.now()}_a`,
            role: 'assistant',
            content: mock.confirmation,
            timestamp: Date.now(),
            type: 'options',
            options: mock.options,
          };
          await addChatMessage(msg);
          setIsLoading(false);
        }, 800);
        return;
      }

      const recentHistory = currentDraft.chatHistory
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));
      recentHistory.push({ role: 'user', content: trimmed });

      const result = await callAI(key, updatedInspiration, recentHistory, configModelEndpoint);

      const msg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: result.confirmation,
        timestamp: Date.now(),
        type: 'options',
        options: result.options.map((o) => ({
          ...o,
          feedback: null,
          adopted: false,
        })),
      };
      await addChatMessage(msg);
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceRecording = () => {
    setError(null);
    voiceFinalTextRef.current = '';
    setVoiceTranscript('');

    const canUseBrowser = isSpeechRecognitionSupported() && voiceApiProvider === 'browser';
    const canUseServer = isMediaRecorderSupported() && asrAppId && asrAccessKey;

    if (canUseBrowser) {
      recordingModeRef.current = 'browser';
      const stopFn = startBrowserRecognition(
        (text) => {
          setVoiceTranscript(text);
        },
        (errMsg) => {
          if (errMsg.includes('网络') || errMsg.includes('network')) {
            if (canUseServer) {
              stopBrowserOnly();
              startServerRecording();
              return;
            }
          }
          setError(errMsg);
          stopVoiceRecordingInternal(true);
        }
      );
      voiceStopFnRef.current = stopFn;
      isVoiceRecordingRef.current = true;
      setIsVoiceRecording(true);
      return;
    }

    if (canUseServer) {
      startServerRecording();
      return;
    }

    if (!asrAppId || !asrAccessKey) {
      setError('请先在设置中配置火山语音识别，或使用 Safari 浏览器');
    } else {
      setError('当前浏览器不支持录音功能');
    }
  };

  const stopBrowserOnly = () => {
    if (voiceStopFnRef.current) {
      voiceStopFnRef.current();
      voiceStopFnRef.current = null;
    }
  };

  const startServerRecording = async () => {
    try {
      recordingModeRef.current = 'server';
      const stopFn = await startMediaRecording((errMsg) => {
        setError(errMsg);
        stopVoiceRecordingInternal(true);
      });
      voiceStopFnRef.current = stopFn;
      isVoiceRecordingRef.current = true;
      setIsVoiceRecording(true);
      setVoiceTranscript('正在录音，松开后识别...');
    } catch {
      // 错误已在 onError 中处理
    }
  };

  const stopVoiceRecordingInternal = async (silent: boolean = false) => {
    const mode = recordingModeRef.current;
    isVoiceRecordingRef.current = false;
    setIsVoiceRecording(false);

    if (voiceStopFnRef.current) {
      voiceStopFnRef.current();
      voiceStopFnRef.current = null;
    }

    if (silent) {
      setVoiceTranscript('');
      return;
    }

    if (mode === 'browser') {
      const result = await stopBrowserRecognition();
      const finalText = correctTranscript(result.text);
      setVoiceTranscript('');
      if (finalText.trim().length >= 2) {
        handleSendVoiceInput(finalText);
      }
      return;
    }

    if (mode === 'server') {
      try {
        setIsRecognizing(true);
        setVoiceTranscript('正在识别...');
        const audioBlob = await stopMediaRecording();
        const text = await recognizeWithServer(audioBlob, asrAppId!, asrAccessKey!);
        const finalText = correctTranscript(text);
        setVoiceTranscript('');
        setIsRecognizing(false);
        if (finalText.trim().length >= 2) {
          handleSendVoiceInput(finalText);
        } else {
          setError('没有识别到有效内容，请再试一次');
        }
      } catch (err: any) {
        setIsRecognizing(false);
        setVoiceTranscript('');
        setError(err.message || '识别失败，请重试');
      }
      return;
    }

    setVoiceTranscript('');
  };

  const stopVoiceRecording = () => {
    stopVoiceRecordingInternal(false);
  };

  const handleSendVoiceInput = async (text: string) => {
    if (!text.trim() || !currentDraft) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      type: 'custom',
    };
    await addChatMessage(userMsg);

    const updatedInspiration = currentDraft.inspirationText + '；' + text;
    await updateCurrentDraft({ inspirationText: updatedInspiration });

    setIsLoading(true);
    setError(null);

    try {
      const key = configApiKey || getApiKey() || '';

      if (!key) {
        setTimeout(async () => {
          const mock = generateMockInspiration(text);
          const msg: ChatMessage = {
            id: `msg_${Date.now()}_a`,
            role: 'assistant',
            content: mock.confirmation,
            timestamp: Date.now(),
            type: 'options',
            options: mock.options,
          };
          await addChatMessage(msg);
          setIsLoading(false);
        }, 800);
        return;
      }

      const recentHistory = currentDraft.chatHistory
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));
      recentHistory.push({ role: 'user', content: text });

      const result = await callAI(key, updatedInspiration, recentHistory, configModelEndpoint);

      const msg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: result.confirmation,
        timestamp: Date.now(),
        type: 'options',
        options: result.options.map((o) => ({
          ...o,
          feedback: null,
          adopted: false,
        })),
      };
      await addChatMessage(msg);
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLine = async (index: number) => {
    const { currentDraft: draft, updateCurrentDraft: updateDraft } = useDraftStore.getState();
    if (!draft) return;
    const newLines = draft.poemLines.filter((_, i) => i !== index);
    await updateDraft({ poemLines: newLines });
  };

  const handleAddCustomLine = async () => {
    if (!customInput.trim()) return;
    await adoptLine(customInput.trim());
    setCustomInput('');
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const { currentDraft: draft, reorderPoemLines } = useDraftStore.getState();
    if (!draft) return;
    reorderPoemLines(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (!currentDraft) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="text-[#A8998B] text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col">
      <header className="flex items-center px-4 py-3 border-b border-[#EFE5D8] bg-[#FFFBF5] sticky top-0 z-10">
        <button
          onClick={() => navigate('/poems')}
          className="p-2 -ml-2 text-[#786B5E] hover:text-[#3D2C1E]"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-base text-[#3D2C1E] font-medium truncate px-2">
          {currentDraft.title}
        </h1>
        <button
          onClick={() => navigate('/poems')}
          className="p-2 -mr-2 text-[#786B5E]"
        >
          <BookOpen size={20} />
        </button>
      </header>

      <div className="px-4 py-3 border-b border-[#EFE5D8]">
        <button
          onClick={() => setShowInspiration(!showInspiration)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-xs text-[#A8998B]">灵感原文</span>
          {showInspiration ? (
            <ChevronUp size={16} className="text-[#A8998B]" />
          ) : (
            <ChevronDown size={16} className="text-[#A8998B]" />
          )}
        </button>
        {showInspiration && (
          <p className="mt-2 text-sm text-[#786B5E] leading-relaxed bg-[#FFF8EE] rounded-lg p-3">
            {currentDraft.inspirationText}
          </p>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 pb-4">
        {currentDraft.chatHistory.slice(1).map((msg) => (
          <div key={msg.id} className="mb-6">
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-[#F59E0B] text-white rounded-2xl rounded-tr-md px-4 py-2.5 text-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[#3D2C1E] text-sm leading-relaxed pl-1">
                  {msg.content}
                </p>
                {msg.options && msg.options.length > 0 && (
                  <div className="space-y-2">
                    {msg.options.map((opt, idx) => (
                      <div
                        key={opt.id}
                        className={`bg-white rounded-xl p-3.5 shadow-sm border transition-all ${
                          opt.adopted
                            ? 'border-[#6B8E23] bg-[#F7FAF2]'
                            : 'border-[#EFE5D8] hover:border-[#F59E0B]/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-[#F59E0B] text-sm font-medium mt-0.5 w-5 flex-shrink-0">
                            {idx + 1}
                          </span>
                          <p className="flex-1 text-[#3D2C1E] text-sm leading-relaxed pt-0.5">
                            {opt.text}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-[#F5F0E6]">
                          <button
                            onClick={() => handleFeedback(opt.id, 'like')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              opt.feedback === 'like'
                                ? 'text-[#6B8E23] bg-[#F0F5E8]'
                                : 'text-[#C4B5A5] hover:text-[#6B8E23]'
                            }`}
                            title="像我的话"
                          >
                            <ThumbsUp size={16} />
                          </button>
                          <button
                            onClick={() => handleFeedback(opt.id, 'dislike')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              opt.feedback === 'dislike'
                                ? 'text-[#D47766] bg-[#FDF2F0]'
                                : 'text-[#C4B5A5] hover:text-[#D47766]'
                            }`}
                            title="不像我的话"
                          >
                            <ThumbsDown size={16} />
                          </button>
                          <div className="w-px h-4 bg-[#EFE5D8] mx-1" />
                          {opt.adopted ? (
                            <button
                              disabled
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#6B8E23] bg-[#F0F5E8] rounded-lg"
                            >
                              <Check size={14} />
                              已采纳
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAdopt(opt)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#F59E0B] bg-[#FFFBEB] rounded-lg hover:bg-[#FEF3C7] transition-colors"
                            >
                              <Plus size={14} />
                              采纳
                            </button>
                          )}
                          <button
                            onClick={() => handleSelectOption(opt)}
                            className="px-2.5 py-1 text-xs text-[#786B5E] hover:text-[#3D2C1E] hover:bg-[#F5F0E6] rounded-lg transition-colors"
                          >
                            继续深化
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-6">
            <div className="bg-white rounded-2xl rounded-tl-md px-5 py-4 shadow-sm border border-[#EFE5D8]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-[#D47766] text-sm py-4">
            {error}
            <button
              onClick={generateInspiration}
              className="ml-2 text-[#F59E0B] underline"
            >
              重试
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[#EFE5D8] bg-white">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#3D2C1E]">我的诗稿</span>
            <span className="text-xs text-[#A8998B]">
              {currentDraft.poemLines.length} 句
            </span>
          </div>

          {currentDraft.poemLines.length === 0 ? (
            <p className="text-xs text-[#C4B5A5] py-3 text-center">
              采纳喜欢的句子，慢慢凑成一首诗
            </p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-auto">
              {currentDraft.poemLines.map((line, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg group ${
                    draggedIndex === index ? 'bg-[#F5F0E6] opacity-50' : ''
                  }`}
                >
                  <GripVertical size={16} className="text-[#D4C4B0] cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  <span className="text-xs text-[#A8998B] w-5 flex-shrink-0">{index + 1}</span>
                  <p className="flex-1 text-sm text-[#3D2C1E]">{line}</p>
                  <button
                    onClick={() => handleRemoveLine(index)}
                    className="p-1 text-[#C4B5A5] hover:text-[#D47766] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-1">
          {(isVoiceRecording || isRecognizing) && voiceTranscript && (
            <div className="mb-3 bg-[#FFF8EE] rounded-xl p-3 border border-[#F5E6D3]">
              <p className="text-xs text-[#A8998B] mb-1">
                {isRecognizing ? '正在识别...' : '正在听你说...'}
              </p>
              <p className="text-sm text-[#3D2C1E] leading-relaxed">
                {voiceTranscript}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); startVoiceRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopVoiceRecording(); }}
              onMouseDown={startVoiceRecording}
              onMouseUp={stopVoiceRecording}
              onMouseLeave={() => { if (isVoiceRecording) stopVoiceRecording(); }}
              className={`px-3 py-3 rounded-xl flex items-center justify-center transition-all select-none ${
                isVoiceRecording
                  ? 'bg-[#D47766] text-white scale-95 shadow-inner'
                  : 'bg-[#F8F2E9] text-[#786B5E] hover:bg-[#F0E8DC]'
              }`}
              title="按住说话"
            >
              <Mic size={20} className={isVoiceRecording ? 'animate-pulse' : ''} />
            </button>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCustomInput();
                }
              }}
              placeholder="我有别的想法..."
              className="flex-1 px-4 py-3 bg-[#F8F2E9] rounded-xl text-sm text-[#3D2C1E] placeholder:text-[#C4B5A5] outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
            />
            <button
              onClick={handleAddCustomLine}
              disabled={!customInput.trim()}
              className="px-4 py-3 bg-[#6B8E23] text-white rounded-xl text-sm disabled:opacity-50 transition-all hover:bg-[#5A7D1E]"
              title="加入诗稿"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={handleCustomInput}
              disabled={isLoading || !customInput.trim()}
              className="px-4 py-3 bg-[#F59E0B] text-white rounded-xl text-sm disabled:opacity-50 transition-all hover:bg-[#E8890A]"
              title="找灵感"
            >
              <Sparkles size={20} />
            </button>
          </div>
          {isVoiceRecording && (
            <p className="text-center text-xs text-[#D47766] mt-2">
              松开结束，自动生成启发
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
