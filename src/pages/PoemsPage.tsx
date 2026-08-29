import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Download, Trash2, FileText, CheckCircle2, Settings, MoreVertical } from 'lucide-react';
import { useDraftStore } from '../store/useDraftStore';
import { downloadBackup, readJsonFile } from '../utils/export';
import type { Draft } from '../types';

type TabType = 'draft' | 'finished';

export default function PoemsPage() {
  const navigate = useNavigate();
  const { drafts, loadAllDrafts, deleteDraftById } = useDraftStore();
  const [activeTab, setActiveTab] = useState<TabType>('draft');
  const [showMenu, setShowMenu] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadAllDrafts();
  }, [loadAllDrafts]);

  const filteredDrafts = drafts.filter((d) => d.status === activeTab);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return mins <= 1 ? '刚刚' : `${mins}分钟前`;
      }
      return `${hours}小时前`;
    }
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getProgressLabel = (draft: Draft) => {
    if (draft.status === 'finished') return '已完成';
    const msgCount = draft.chatHistory.length;
    if (msgCount <= 1) return '仅输入';
    if (msgCount <= 3) return '1轮启发';
    return '多轮深化';
  };

  const handleDelete = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(draftId);
  };

  const confirmDelete = async (draftId: string) => {
    await deleteDraftById(draftId);
    setDeletingId(null);
  };

  const handleExportBackup = async () => {
    downloadBackup(drafts);
    setShowMenu(false);
  };

  const handleImportBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data = await readJsonFile(file);
        if (data.drafts && Array.isArray(data.drafts)) {
          let count = 0;
          for (const draft of data.drafts) {
            await useDraftStore.getState().createNewDraft(draft.inspirationText);
            count++;
          }
          await loadAllDrafts();
          alert(`成功导入 ${count} 篇作品`);
        }
      } catch (err) {
        alert('导入失败：' + (err as Error).message);
      }
    };
    input.click();
    setShowMenu(false);
  };

  const handleNewTextDraft = () => {
    navigate('/text-input');
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col">
      <header className="flex items-center px-4 py-4 border-b border-[#EFE5D8] sticky top-0 bg-[#FFFBF5] z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#786B5E] hover:text-[#3D2C1E]"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-lg text-[#3D2C1E] font-medium">
          我的诗集
        </h1>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 -mr-2 text-[#786B5E] hover:text-[#3D2C1E] relative"
        >
          <MoreVertical size={20} />
        </button>
      </header>

      {showMenu && (
        <div className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border border-[#EFE5D8] z-20 overflow-hidden">
          <button
            onClick={handleExportBackup}
            className="w-full px-4 py-3 text-left text-sm text-[#3D2C1E] hover:bg-[#FFF8EE] flex items-center gap-2"
          >
            <Download size={16} />
            导出备份
          </button>
          <div className="h-px bg-[#EFE5D8]" />
          <button
            onClick={handleImportBackup}
            className="w-full px-4 py-3 text-left text-sm text-[#3D2C1E] hover:bg-[#FFF8EE] flex items-center gap-2"
          >
            <FileText size={16} />
            导入备份
          </button>
          <div className="h-px bg-[#EFE5D8]" />
          <button
            onClick={() => {
              setShowMenu(false);
              navigate('/settings');
            }}
            className="w-full px-4 py-3 text-left text-sm text-[#3D2C1E] hover:bg-[#FFF8EE] flex items-center gap-2"
          >
            <Settings size={16} />
            API 设置
          </button>
        </div>
      )}

      <div className="flex border-b border-[#EFE5D8]">
        <button
          onClick={() => setActiveTab('draft')}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'draft'
              ? 'text-[#F59E0B]'
              : 'text-[#A8998B]'
          }`}
        >
          全部草稿
          <span className="ml-1 text-xs opacity-70">
            ({drafts.filter((d) => d.status === 'draft').length})
          </span>
          {activeTab === 'draft' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#F59E0B] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'finished'
              ? 'text-[#F59E0B]'
              : 'text-[#A8998B]'
          }`}
        >
          已完成
          <span className="ml-1 text-xs opacity-70">
            ({drafts.filter((d) => d.status === 'finished').length})
          </span>
          {activeTab === 'finished' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#F59E0B] rounded-full" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#FFF5E8] flex items-center justify-center mb-4">
              {activeTab === 'draft' ? (
                <Plus size={28} className="text-[#F59E0B]" />
              ) : (
                <CheckCircle2 size={28} className="text-[#6B8E23]" />
              )}
            </div>
            <p className="text-[#786B5E] text-sm mb-2">
              {activeTab === 'draft' ? '还没有草稿' : '还没有完成的作品'}
            </p>
            <p className="text-[#C4B5A5] text-xs mb-6">
              {activeTab === 'draft'
                ? '回到首页，记录今天的灵感吧'
                : '慢慢写，写好了就是完成了'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-[#F59E0B] text-white rounded-full text-sm hover:bg-[#E8890A] transition-colors"
            >
              去写点什么
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrafts.map((draft) => (
              <div
                key={draft.draftId}
                onClick={() => navigate(`/creation/${draft.draftId}`)}
                className="bg-white rounded-xl p-4 shadow-sm border border-[#EFE5D8] active:scale-[0.99] transition-transform cursor-pointer relative group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[#3D2C1E] font-medium pr-8 line-clamp-1">
                    {draft.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      draft.status === 'finished'
                        ? 'bg-[#F0F5E8] text-[#6B8E23]'
                        : 'bg-[#FFF5E8] text-[#F59E0B]'
                    }`}
                  >
                    {getProgressLabel(draft)}
                  </span>
                </div>

                {draft.poemLines.length > 0 ? (
                  <div className="space-y-1 mb-3">
                    {draft.poemLines.slice(0, 3).map((line, i) => (
                      <p key={i} className="text-sm text-[#786B5E] line-clamp-1">
                        {line}
                      </p>
                    ))}
                    {draft.poemLines.length > 3 && (
                      <p className="text-xs text-[#C4B5A5]">
                        ...还有 {draft.poemLines.length - 3} 句
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#A8998B] line-clamp-2 mb-3">
                    {draft.inspirationText}
                  </p>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#C4B5A5]">
                    {formatDate(draft.updatedAt)}
                  </span>
                  <button
                    onClick={(e) => handleDelete(draft.draftId, e)}
                    className="p-1.5 text-[#C4B5A5] hover:text-[#D47766] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {deletingId === draft.draftId && (
                  <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center p-4">
                    <p className="text-sm text-[#3D2C1E] mb-4 text-center">
                      确定要删除这篇吗？
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                        className="px-5 py-2 text-sm text-[#786B5E] bg-[#F5F0E6] rounded-lg"
                      >
                        取消
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(draft.draftId);
                        }}
                        className="px-5 py-2 text-sm text-white bg-[#D47766] rounded-lg"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#EFE5D8]">
        <button
          onClick={handleNewTextDraft}
          className="w-full py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-xl text-base font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all"
        >
          <Plus size={20} />
          新建文字草稿
        </button>
      </div>
    </div>
  );
}
