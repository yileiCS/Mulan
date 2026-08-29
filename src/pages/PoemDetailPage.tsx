import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle2, Edit3 } from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import { exportDraftAsFile } from '../utils/export';

export default function PoemDetailPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { loadDraft, currentDraft, updateCurrentDraft, markAsFinished, markAsDraft, updatePoemLine } = useDraftStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTexts, setEditTexts] = useState<string[]>([]);

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId, loadDraft]);

  useEffect(() => {
    if (currentDraft) {
      setEditTexts([...currentDraft.poemLines]);
    }
  }, [currentDraft?.draftId]);

  if (!currentDraft) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="text-[#A8998B] text-sm">加载中...</div>
      </div>
    );
  }

  const handleExport = () => {
    exportDraftAsFile(currentDraft);
  };

  const handleToggleStatus = async () => {
    if (currentDraft.status === 'draft') {
      await markAsFinished();
    } else {
      await markAsDraft();
    }
  };

  const handleStartEdit = () => {
    setEditTexts([...currentDraft.poemLines]);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    for (let i = 0; i < editTexts.length; i++) {
      if (editTexts[i] !== currentDraft.poemLines[i]) {
        await updatePoemLine(i, editTexts[i]);
      }
    }
    setIsEditing(false);
  };

  const handleLineChange = (index: number, value: string) => {
    const newTexts = [...editTexts];
    newTexts[index] = value;
    setEditTexts(newTexts);
  };

  const displayLines = currentDraft.poemLines.length > 0
    ? currentDraft.poemLines
    : [currentDraft.inspirationText];

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col">
      <header className="flex items-center px-4 py-4 border-b border-[#EFE5D8]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#786B5E] hover:text-[#3D2C1E]"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-lg text-[#3D2C1E] font-medium truncate px-2">
          {currentDraft.title}
        </h1>
        <button
          onClick={handleExport}
          className="p-2 -mr-2 text-[#786B5E] hover:text-[#3D2C1E]"
        >
          <Download size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <span
              className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                currentDraft.status === 'finished'
                  ? 'bg-[#F0F5E8] text-[#6B8E23]'
                  : 'bg-[#FFF5E8] text-[#F59E0B]'
              }`}
            >
              {currentDraft.status === 'finished' ? (
                <><CheckCircle2 size={14} /> 已完成</>
              ) : (
                '创作中'
              )}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#EFE5D8]">
            {isEditing ? (
              <div className="space-y-3">
                {editTexts.map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-[#C4B5A5] w-5">{index + 1}</span>
                    <input
                      type="text"
                      value={line}
                      onChange={(e) => handleLineChange(index, e.target.value)}
                      className="flex-1 py-2 px-3 bg-[#F8F2E9] rounded-lg text-[#3D2C1E] text-base outline-none focus:ring-2 focus:ring-[#F59E0B]/30"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 text-center font-serif">
                {displayLines.map((line, index) => (
                  <p
                    key={index}
                    className="text-[#3D2C1E] text-base leading-loose tracking-wide"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-[#C4B5A5]">
              —— 来自烟火诗笺
            </p>
          </div>

          {currentDraft.inspirationText && currentDraft.poemLines.length > 0 && (
            <div className="mt-8">
              <p className="text-xs text-[#A8998B] mb-2">灵感来源</p>
              <p className="text-sm text-[#786B5E] leading-relaxed bg-[#FFF8EE] rounded-xl p-4">
                {currentDraft.inspirationText}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[#EFE5D8] flex gap-3">
        <button
          onClick={isEditing ? handleSaveEdit : handleStartEdit}
          className="flex-1 py-3.5 bg-white border border-[#EFE5D8] text-[#786B5E] rounded-xl text-base font-medium flex items-center justify-center gap-2 hover:bg-[#FFF8EE] transition-colors"
        >
          <Edit3 size={18} />
          {isEditing ? '保存修改' : '编辑作品'}
        </button>
        <button
          onClick={handleToggleStatus}
          className={`flex-1 py-3.5 text-white rounded-xl text-base font-medium flex items-center justify-center gap-2 transition-all ${
            currentDraft.status === 'finished'
              ? 'bg-[#A8998B] hover:bg-[#96887A]'
              : 'bg-gradient-to-r from-[#6B8E23] to-[#5A7D1E] hover:shadow-lg'
          }`}
        >
          <CheckCircle2 size={18} />
          {currentDraft.status === 'finished' ? '恢复草稿' : '标记完成'}
        </button>
      </div>
    </div>
  );
}
