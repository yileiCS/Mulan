import { create } from 'zustand';
import type { AppConfig } from '../types';

const STORAGE_KEY = 'yanhuo_poetry_config';

const DEFAULT_CONFIG: AppConfig = {
  activeDraftId: null,
  inputMode: 'voice',
  fontSize: 'normal',
  apiKey: null,
  modelEndpoint: null,
  voiceApiProvider: 'browser',
  asrAppId: null,
  asrAccessKey: null,
};

function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

interface ConfigStore extends AppConfig {
  setActiveDraftId: (id: string | null) => void;
  setInputMode: (mode: 'voice' | 'text') => void;
  setFontSize: (size: 'normal' | 'large') => void;
  setApiKey: (key: string | null) => void;
  setModelEndpoint: (endpoint: string | null) => void;
  setVoiceApiProvider: (provider: 'browser' | 'volcengine') => void;
  setAsrAppId: (id: string | null) => void;
  setAsrAccessKey: (key: string | null) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => {
  const initial = loadConfig();

  return {
    ...initial,

    setActiveDraftId: (id) => {
      const state = get();
      const updated = { ...state, activeDraftId: id };
      saveConfig(updated);
      set({ activeDraftId: id });
    },

    setInputMode: (mode) => {
      const state = get();
      const updated = { ...state, inputMode: mode };
      saveConfig(updated);
      set({ inputMode: mode });
    },

    setFontSize: (size) => {
      const state = get();
      const updated = { ...state, fontSize: size };
      saveConfig(updated);
      set({ fontSize: size });
    },

    setApiKey: (key) => {
      const state = get();
      const updated = { ...state, apiKey: key };
      saveConfig(updated);
      set({ apiKey: key });
    },

    setModelEndpoint: (endpoint) => {
      const state = get();
      const updated = { ...state, modelEndpoint: endpoint };
      saveConfig(updated);
      set({ modelEndpoint: endpoint });
    },

    setVoiceApiProvider: (provider) => {
      const state = get();
      const updated = { ...state, voiceApiProvider: provider };
      saveConfig(updated);
      set({ voiceApiProvider: provider });
    },

    setAsrAppId: (id) => {
      const state = get();
      const updated = { ...state, asrAppId: id };
      saveConfig(updated);
      set({ asrAppId: id });
    },

    setAsrAccessKey: (key) => {
      const state = get();
      const updated = { ...state, asrAccessKey: key };
      saveConfig(updated);
      set({ asrAccessKey: key });
    },
  };
});
