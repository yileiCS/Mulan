import type { Draft } from '../types';

export function exportAsText(draft: Draft): string {
  const lines = draft.poemLines.length > 0 ? draft.poemLines : [draft.inspirationText];
  const content = lines.join('\n');
  const title = draft.title || '无题';
  return `${title}\n\n${content}\n\n—— 来自烟火诗笺`;
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDraftAsFile(draft: Draft): void {
  const content = exportAsText(draft);
  const safeTitle = draft.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30) || '无题';
  downloadTextFile(`${safeTitle}.txt`, content);
}

export function generateBackupJson(drafts: Draft[]): string {
  return JSON.stringify(
    {
      version: 1,
      app: '烟火诗笺',
      exportedAt: new Date().toISOString(),
      drafts,
      count: drafts.length,
    },
    null,
    2
  );
}

export function downloadBackup(drafts: Draft[]): void {
  const content = generateBackupJson(drafts);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadTextFile(`烟火诗笺_备份_${dateStr}.json`, content);
}

export function readJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (err) {
        reject(new Error('文件格式错误，无法解析 JSON'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
