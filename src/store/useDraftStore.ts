import { create } from 'zustand';
import type { Draft, ChatMessage, InspirationOption, StyleWeight } from '../types';
import {
  createDraft as dbCreateDraft,
  getDraft as dbGetDraft,
  updateDraft as dbUpdateDraft,
  deleteDraft as dbDeleteDraft,
  getAllDrafts as dbGetAllDrafts,
  generateDraftId,
} from '../utils/db';

interface DraftStore {
  drafts: Draft[];
  currentDraft: Draft | null;
  isLoading: boolean;

  loadAllDrafts: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<Draft | null>;
  createNewDraft: (inspirationText: string, fromVoice?: boolean) => Promise<Draft>;
  updateCurrentDraft: (updates: Partial<Draft>) => Promise<void>;
  addChatMessage: (message: ChatMessage) => Promise<void>;
  adoptLine: (text: string, index?: number) => Promise<void>;
  removePoemLine: (index: number) => Promise<void>;
  reorderPoemLines: (fromIndex: number, toIndex: number) => Promise<void>;
  updatePoemLine: (index: number, text: string) => Promise<void>;
  setOptionFeedback: (optionId: string, feedback: 'like' | 'dislike' | null) => Promise<void>;
  markAsFinished: () => Promise<void>;
  markAsDraft: () => Promise<void>;
  deleteDraftById: (draftId: string) => Promise<void>;
  setCurrentDraft: (draft: Draft | null) => void;
}

function createEmptyStyleWeight(): StyleWeight {
  return {
    preferredWords: {},
    preferredThemes: {},
    likeCount: 0,
    dislikeCount: 0,
  };
}

function extractTitle(text: string): string {
  const firstLine = text.split(/[。\n，！？.!?]/)[0] || '';
  return firstLine.slice(0, 20) || '无题';
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  drafts: [],
  currentDraft: null,
  isLoading: false,

  loadAllDrafts: async () => {
    set({ isLoading: true });
    try {
      const drafts = await dbGetAllDrafts();
      set({ drafts, isLoading: false });
    } catch (error) {
      console.error('加载草稿列表失败:', error);
      set({ isLoading: false });
    }
  },

  loadDraft: async (draftId: string) => {
    try {
      const draft = await dbGetDraft(draftId);
      if (draft) {
        set({ currentDraft: draft });
        return draft;
      }
      return null;
    } catch (error) {
      console.error('加载草稿失败:', error);
      return null;
    }
  },

  createNewDraft: async (inspirationText: string) => {
    const now = Date.now();
    const newDraft: Draft = {
      draftId: generateDraftId(),
      title: extractTitle(inspirationText),
      inspirationText,
      poemLines: [],
      chatHistory: [
        {
          id: `msg_${now}_0`,
          role: 'user',
          content: inspirationText,
          timestamp: now,
          type: 'inspiration',
        },
      ],
      status: 'draft',
      styleWeight: createEmptyStyleWeight(),
      createdAt: now,
      updatedAt: now,
    };

    await dbCreateDraft(newDraft);
    set((state) => ({
      drafts: [newDraft, ...state.drafts],
      currentDraft: newDraft,
    }));
    return newDraft;
  },

  updateCurrentDraft: async (updates: Partial<Draft>) => {
    const { currentDraft } = get();
    if (!currentDraft) return;

    const updated = { ...currentDraft, ...updates, updatedAt: Date.now() };
    await dbUpdateDraft(updated);
    set((state) => ({
      currentDraft: updated,
      drafts: state.drafts.map((d) =>
        d.draftId === updated.draftId ? updated : d
      ),
    }));
  },

  addChatMessage: async (message: ChatMessage) => {
    const { currentDraft } = get();
    if (!currentDraft) return;

    const updated = {
      ...currentDraft,
      chatHistory: [...currentDraft.chatHistory, message],
      updatedAt: Date.now(),
    };
    await dbUpdateDraft(updated);
    set((state) => ({
      currentDraft: updated,
      drafts: state.drafts.map((d) =>
        d.draftId === updated.draftId ? updated : d
      ),
    }));
  },

  adoptLine: async (text: string, index?: number) => {
    const { currentDraft } = get();
    if (!currentDraft) return;

    const newLines = [...currentDraft.poemLines];
    if (index !== undefined && index >= 0 && index < newLines.length) {
      newLines.splice(index, 0, text);
    } else {
      newLines.push(text);
    }

    const updated = {
      ...currentDraft,
      poemLines: newLines,
      updatedAt: Date.now(),
    };
    await dbUpdateDraft(updated);
    set((state) => ({
      currentDraft: updated,
      drafts: state.drafts.map((d) =>
        d.draftId === updated.draftId ? updated : d
      ),
    }));
  },

  removePoemLine: async (index: number) => {
    const { currentDraft } = get();
    if (!currentDraft || index < 0 || index >= currentDraft.poemLines.length) return;

    const newLines = currentDraft.poemLines.filter((_, i) => i !== index);
    const updated = {
      ...currentDraft,
      poemLines: newLines,
      updatedAt: Date.now(),
    };
    await dbUpdateDraft(updated);
    set((state) => ({
      currentDraft: updated,
      drafts: state.drafts.map((d) =>
        d.draftId === updated.draftId ? updated : d
      ),
    }));
  },

  reorderPoemLines: async (fromIndex: number, toIndex: number) => {
    const { currentDraft } = get();
    if (!currentDraft) return;

    const newLines = [...currentDraft.poemLines];
    const [removed] = newLines.splice(fromIndex, 1);
    newLines.splice(toIndex, 0, removed);

    const updated = {
      ...currentDraft,
      poemLines: newLines,
      updatedAt: Date.now(),
    };
    await dbUpdateDraft(updated);
    set((state) => ({
      currentDraft: updated,
      drafts: state.drafts.map((d) =>
        d.draftId === updated.draftId ? updated : d
      ),
    }));
  },

  updatePoemLine: async (index: number, text: string) => {
    const { currentDraft } = get();
    if (!currentDraft || index < 0 || index >= currentDraft.poemLines.length) return;

    const newLines = [...currentDraft.poemLines];
    newLines[index] = text;

    const updated = {
      ...currentDraft,
      poemLines: newLines,
      updatedAt: Date.now(),
    };
    await dbUpdateDraft(updated);
    set((state) => ({
      currentDraft: updated,
      drafts: state.drafts.map((d) =>
        d.draftId === updated.draftId ? updated : d
      ),
    }));
  },

  setOptionFeedback: async (optionId: string, feedback: 'like' | 'dislike' | null) => {
    const { currentDraft } = get();
    if (!currentDraft) return;

    const history = currentDraft.chatHistory.map((msg) => {
      if (msg.options) {
        return {
          ...msg,
          options: msg.options.map((opt: InspirationOption) =>
            opt.id === optionId ? { ...opt, feedback } : opt
          ),
        };
      }
      return msg;
    });

    const styleWeight = { ...currentDraft.styleWeight };
    if (feedback === 'like') {
      styleWeight.likeCount++;
    } else if (feedback === 'dislike') {
      styleWeight.dislikeCount++;
    }

    const updated = {
      ...currentDraft,
      chatHistory: history,
      styleWeight,
      updatedAt: Date.now(),
    };
    await dbUpdateDraft(updated);
    set((state) => ({
      currentDraft: updated,
      drafts: state.drafts.map((d) =>
        d.draftId === updated.draftId ? updated : d
      ),
    }));
  },

  markAsFinished: async () => {
    const { currentDraft, updateCurrentDraft } = get();
    if (!currentDraft) return;
    await updateCurrentDraft({ status: 'finished' });
  },

  markAsDraft: async () => {
    const { currentDraft, updateCurrentDraft } = get();
    if (!currentDraft) return;
    await updateCurrentDraft({ status: 'draft' });
  },

  deleteDraftById: async (draftId: string) => {
    await dbDeleteDraft(draftId);
    set((state) => ({
      drafts: state.drafts.filter((d) => d.draftId !== draftId),
      currentDraft: state.currentDraft?.draftId === draftId ? null : state.currentDraft,
    }));
  },

  setCurrentDraft: (draft: Draft | null) => {
    set({ currentDraft: draft });
  },
}));
