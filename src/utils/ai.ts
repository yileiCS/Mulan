import { buildPrompt, parseAIResponse } from './prompt';
import type { InspirationOption } from '../types';

const CACHE_KEY = 'ai_cache';
const REQUEST_CACHE_KEY = 'ai_pending_requests';

interface AICacheEntry {
  key: string;
  response: string;
  timestamp: number;
}

interface PendingRequest {
  prompt: string;
  timestamp: number;
}

function getCache(): AICacheEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCache(cache: AICacheEntry[]): void {
  try {
    if (cache.length > 50) {
      cache = cache.slice(-50);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function getCacheKey(text: string): string {
  return text.slice(0, 100).toLowerCase().trim();
}

export function getCachedResponse(inspirationText: string): string | null {
  const cache = getCache();
  const key = getCacheKey(inspirationText);
  const entry = cache.find(e => e.key === key);
  if (entry && Date.now() - entry.timestamp < 7 * 24 * 60 * 60 * 1000) {
    return entry.response;
  }
  return null;
}

export function saveToCache(inspirationText: string, response: string): void {
  const cache = getCache();
  const key = getCacheKey(inspirationText);
  const existingIndex = cache.findIndex(e => e.key === key);
  if (existingIndex >= 0) {
    cache[existingIndex] = { key, response, timestamp: Date.now() };
  } else {
    cache.push({ key, response, timestamp: Date.now() });
  }
  setCache(cache);
}

function getPendingRequests(): PendingRequest[] {
  try {
    const raw = localStorage.getItem(REQUEST_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingRequest(prompt: string): void {
  const pending = getPendingRequests();
  pending.push({ prompt, timestamp: Date.now() });
  try {
    localStorage.setItem(REQUEST_CACHE_KEY, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

function removePendingRequest(prompt: string): void {
  const pending = getPendingRequests().filter(p => p.prompt !== prompt);
  try {
    localStorage.setItem(REQUEST_CACHE_KEY, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

const API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DEFAULT_MODEL_ID = 'doubao-lite-4k-241028';
const REQUEST_TIMEOUT = 30000;

export interface AIResult {
  confirmation: string;
  options: InspirationOption[];
  rawText: string;
}

function normalizeApiKey(key: string): string {
  return key.trim().replace(/^`+|`+$/g, '').trim();
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callAI(
  apiKey: string,
  inspirationText: string,
  recentHistory: { role: string; content: string }[],
  modelEndpoint?: string | null
): Promise<AIResult> {
  const cached = getCachedResponse(inspirationText);
  if (cached) {
    const parsed = parseAIResponse(cached);
    return {
      confirmation: parsed.confirmation,
      options: parsed.options.map((o, i) => ({
        ...o,
        id: `opt_${Date.now()}_${i}`,
      })),
      rawText: cached,
    };
  }

  const cleanKey = normalizeApiKey(apiKey);
  const modelId = modelEndpoint || DEFAULT_MODEL_ID;
  const prompt = buildPrompt(inspirationText, recentHistory);

  try {
    const response = await fetchWithTimeout(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    }, REQUEST_TIMEOUT);

    if (response.status === 401) {
      throw new Error('401 认证失败：API Key 无效，请检查 Key 是否正确');
    }
    if (response.status === 403) {
      throw new Error('403 权限不足：请检查账户是否已开通豆包轻量版服务');
    }
    if (response.status === 404) {
      throw new Error('404 模型不存在：请检查模型 ID 是否正确');
    }
    if (response.status === 429) {
      throw new Error('429 请求过于频繁，请稍后再试');
    }
    if (response.status >= 500) {
      throw new Error(`${response.status} 服务器错误，请稍后重试`);
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`API 请求失败：${errorMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('API 返回内容为空');
    }

    saveToCache(inspirationText, content);
    removePendingRequest(prompt);

    const parsed = parseAIResponse(content);
    return {
      confirmation: parsed.confirmation,
      options: parsed.options.map((o, i) => ({
        ...o,
        id: `opt_${Date.now()}_${i}`,
      })),
      rawText: content,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试');
    }
    if (error instanceof TypeError || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      savePendingRequest(prompt);
      throw new Error('网络连接失败，请检查网络是否正常');
    }
    throw error;
  }
}

export function validateApiKey(key: string): boolean {
  return key.startsWith('ark-') && key.length > 20;
}

export function getApiKey(): string | null {
  try {
    return localStorage.getItem('doubao_api_key');
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): void {
  try {
    localStorage.setItem('doubao_api_key', key);
  } catch {
    // ignore
  }
}
