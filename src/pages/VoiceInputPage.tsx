import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Sparkles, AlertCircle } from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';

export default function VoiceInputPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { createNewDraft } = useDraftStore();

  const state = location.state as { transcript?: string; duration?: number } | null;
  const [transcript, setTranscript] = useState(state?.transcript || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showShortTip, setShowShortTip] = useState(false);

  const charCount = transcript.trim().length;
  const isTooShort = charCount < 15;

  useEffect(() => {
    if (!state?.transcript) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  const handleFindInspiration = async () => {
    const text = transcript.trim();
    if (text.length < 2) return;

    if (isTooShort) {
      setShowShortTip(true);
      return;
    }

    setIsCreating(true);
    try {
      const draft = await createNewDraft(text);
      navigate(`/creation/${draft.draftId}`, { replace: true });
    } catch (error) {
      console.error('创建草稿失败:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleForceContinue = async () => {
    const text = transcript.trim();
    if (text.length < 2) return;

    setShowShortTip(false);
    setIsCreating(true);
    try {
      const draft = await createNewDraft(text);
      navigate(`/creation/${draft.draftId}`, { replace: true });
    } catch (error) {
      console.error('创建草稿失败:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col">
      <header className="flex items-center px-4 py-4 border-b border-[#EFE5D8]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#786B5E] hover:text-[#3D2C1E]"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-lg text-[#3D2C1E] font-medium">
          灵感记录
        </h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-[#A8998B]">
            已自动修正识别结果
          </span>
          <span className={`text-xs ${isTooShort ? 'text-[#D47766]' : 'text-[#A8998B]'}`}>
            {charCount} 字
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE5D8]">
          {isEditing ? (
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              autoFocus
              className="w-full min-h-[200px] text-[#3D2C1E] text-base leading-relaxed resize-none outline-none bg-transparent"
              placeholder="修改一下识别结果..."
            />
          ) : (
            <p
              className="text-[#3D2C1E] text-base leading-relaxed whitespace-pre-wrap"
              onClick={() => setIsEditing(true)}
            >
              {transcript || '暂无内容'}
            </p>
          )}
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#786B5E] hover:text-[#3D2C1E]"
          >
            <Edit3 size={16} />
            {isEditing ? '完成修改' : '修改原文'}
          </button>
        </div>

        {isTooShort && (
          <div className="mt-6 bg-[#FFF5E8] border border-[#FDE68A] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[#3D2C1E] text-sm font-medium mb-1">
                  灵感内容有点短哦
                </p>
                <p className="text-[#786B5E] text-xs leading-relaxed">
                  多说一点当时的画面或心情，写15字以上，灵感会更贴合～
                  说够15秒效果更好。
                </p>
              </div>
            </div>
          </div>
        )}

        {showShortTip && (
          <div className="mt-4 bg-[#FFF5E8] rounded-xl p-4 border border-[#FDE68A]">
            <p className="text-[#3D2C1E] text-sm mb-3">
              内容有点短，确定要直接进入吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowShortTip(false)}
                className="flex-1 py-2.5 text-[#786B5E] text-sm bg-white rounded-lg border border-[#EFE5D8]"
              >
                再补充一下
              </button>
              <button
                onClick={handleForceContinue}
                className="flex-1 py-2.5 text-[#F59E0B] text-sm bg-[#FFFBEB] rounded-lg border border-[#FDE68A]"
              >
                直接进入
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-4 border-t border-[#EFE5D8]">
        <button
          onClick={handleFindInspiration}
          disabled={isCreating || transcript.trim().length < 2}
          className={`w-full py-4 rounded-2xl text-white text-base font-medium flex items-center justify-center gap-2 transition-all ${
            isCreating || transcript.trim().length < 2
              ? 'bg-[#D4C4B0] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:shadow-lg active:scale-[0.98]'
          }`}
        >
          <Sparkles size={20} />
          {isCreating ? '生成中...' : '找灵感'}
        </button>
      </div>
    </div>
  );
}
