let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recognition: any = null;
let isRecording = false;
let mediaStream: MediaStream | null = null;

export interface VoiceRecognitionResult {
  text: string;
  duration: number;
}

export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function isMediaRecorderSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined');
}

function getRecognition(): any {
  if (recognition) return recognition;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function recognizeWithServer(
  audioBlob: Blob,
  appKey: string,
  accessKey: string
): Promise<string> {
  const audioBase64 = await blobToBase64(audioBlob);

  const response = await fetch('/api/asr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, appKey, accessKey }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '识别失败');
  }
  return data.text || '';
}

export function startBrowserRecognition(
  onResult: (text: string, isFinal: boolean) => void,
  onError?: (error: string) => void
): () => void {
  const rec = getRecognition();
  if (!rec) {
    onError?.('浏览器不支持语音识别');
    return () => {};
  }

  let finalText = '';

  rec.onresult = (event: any) => {
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }
    onResult(finalText + interimText, false);
  };

  rec.onerror = (event: any) => {
    const errorMsg = event.error === 'not-allowed'
      ? '请允许麦克风权限后再试'
      : event.error === 'network'
      ? '语音识别需要网络连接'
      : `语音识别出错: ${event.error}`;
    onError?.(errorMsg);
  };

  rec.onend = () => {
    if (isRecording) {
      try {
        rec.start();
      } catch {
        // ignore
      }
    }
  };

  try {
    rec.start();
    isRecording = true;
  } catch (e) {
    onError?.('无法启动语音识别');
  }

  return () => {
    isRecording = false;
    try {
      rec.stop();
    } catch {
      // ignore
    }
  };
}

export function stopBrowserRecognition(): Promise<VoiceRecognitionResult> {
  isRecording = false;
  const rec = getRecognition();

  return new Promise((resolve) => {
    if (!rec) {
      resolve({ text: '', duration: 0 });
      return;
    }

    let finalText = '';
    const handleResult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
    };

    const handleEnd = () => {
      rec.removeEventListener('result', handleResult);
      rec.removeEventListener('end', handleEnd);
      resolve({
        text: finalText.trim(),
        duration: 0,
      });
    };

    rec.addEventListener('result', handleResult);
    rec.addEventListener('end', handleEnd);

    try {
      rec.stop();
    } catch {
      resolve({ text: '', duration: 0 });
    }
  });
}

export async function startMediaRecording(
  onError?: (error: string) => void
): Promise<() => void> {
  audioChunks = [];

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };
    mediaRecorder.start();
    isRecording = true;

    return () => {
      isRecording = false;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
    };
  } catch (e) {
    onError?.('无法访问麦克风，请检查权限设置');
    throw e;
  }
}

export function stopMediaRecording(): Promise<Blob> {
  isRecording = false;
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error('未开始录音'));
      return;
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
      resolve(audioBlob);
    };

    mediaRecorder.onerror = () => {
      reject(new Error('录音失败'));
    };

    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else {
      resolve(new Blob(audioChunks, { type: 'audio/webm' }));
    }
  });
}

export function correctTranscript(text: string): string {
  if (!text) return '';
  let corrected = text.trim();
  corrected = corrected.replace(/[，。、]$/, '');
  if (corrected.length > 0) {
    corrected = corrected.charAt(0) + corrected.slice(1);
  }
  return corrected;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}分${secs}秒`;
  }
  return `${secs}秒`;
}
