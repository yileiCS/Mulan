import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';

export default function TextInputPage() {
  const navigate = useNavigate();
  const { createNewDraft } = useDraftStore();
  const [text, setText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = text.trim().length;
  const isTooShort = charCount < 15;
  const isTooLong = charCount > 200;
  const canSubmit = charCount >= 2;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleFindInspiration = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;

    setIsCreating(true);
    try {
      const draft = await createNewDraft(trimmed);
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
          写下灵感
        </h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 px-6 py-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[#A8998B]">
            记录你当下的画面或感受
          </span>
          <span
            className={`text-xs ${
              isTooShort
                ? 'text-[#D47766]'
                : isTooLong
                ? 'text-[#F59E0B]'
                : 'text-[#A8998B]'
            }`}
          >
            {charCount} 字
          </span>
        </div>

        <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-[#EFE5D8]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="比如：今天摊前来了个小朋友，低着头很伤心，不知道是不是挨骂了..."
            className="w-full h-full min-h-[280px] text-[#3D2C1E] text-base leading-relaxed resize-none outline-none bg-transparent placeholder:text-[#C4B5A5]"
          />
        </div>

        {isTooShort && charCount > 0 && (
          <p className="mt-4 text-xs text-[#F59E0B]">
            💡 写15字以上，灵感会更贴合哦
          </p>
        )}

        {isTooLong && (
          <p className="mt-4 text-xs text-[#F59E0B]">
            💡 内容有点长，可以分成几条灵感分开记录哦
          </p>
        )}
      </div>

      <div className="px-6 pb-8 pt-4 border-t border-[#EFE5D8]">
        <button
          onClick={handleFindInspiration}
          disabled={isCreating || !canSubmit}
          className={`w-full py-4 rounded-2xl text-white text-base font-medium flex items-center justify-center gap-2 transition-all ${
            isCreating || !canSubmit
              ? 'bg-[#D4C4B0] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:shadow-lg active:scale-[0.98]'
          }`}
        >
          <Sparkles size={20} />
          {isCreating ? '生成中...' : '找灵感'}
        </button>

        {isTooShort && canSubmit && (
          <p className="text-center text-xs text-[#A8998B] mt-3">
            内容较短时，启发可能不够贴合
          </p>
        )}
      </div>
    </div>
  );
}
