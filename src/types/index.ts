export interface Draft {
  draftId: string;
  title: string;
  inspirationText: string;
  poemLines: string[];
  chatHistory: ChatMessage[];
  status: 'draft' | 'finished';
  styleWeight: StyleWeight;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'inspiration' | 'confirmation' | 'options' | 'deepening' | 'custom';
  options?: InspirationOption[];
}

export interface InspirationOption {
  id: string;
  text: string;
  direction: 'detail' | 'emotion' | 'extension';
  adopted?: boolean;
  feedback?: 'like' | 'dislike' | null;
}

export interface StyleWeight {
  preferredWords: Record<string, number>;
  preferredThemes: Record<string, number>;
  likeCount: number;
  dislikeCount: number;
}

export interface AppConfig {
  activeDraftId: string | null;
  inputMode: 'voice' | 'text';
  fontSize: 'normal' | 'large';
  apiKey: string | null;
  modelEndpoint: string | null;
  voiceApiProvider: 'browser' | 'volcengine';
  asrAppId: string | null;
  asrAccessKey: string | null;
}

export type DraftStatus = 'draft' | 'finished';
