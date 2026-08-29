import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, CheckCircle, XCircle, Loader2, ExternalLink, Copy, Eye, EyeOff, Server, Mic } from 'lucide-react';
import { useConfigStore } from '../store/useConfigStore';
import { callAI } from '../utils/ai';

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    apiKey,
    setApiKey,
    modelEndpoint,
    setModelEndpoint,
    voiceApiProvider,
    setVoiceApiProvider,
    asrAppId,
    setAsrAppId,
    asrAccessKey,
    setAsrAccessKey,
  } = useConfigStore();
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [inputEndpoint, setInputEndpoint] = useState(modelEndpoint || '');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [inputAsrAppId, setInputAsrAppId] = useState(asrAppId || '');
  const [inputAsrAccessKey, setInputAsrAccessKey] = useState(asrAccessKey || '');
  const [showAsrKey, setShowAsrKey] = useState(false);
  const [isTestingAsr, setIsTestingAsr] = useState(false);
  const [asrTestResult, setAsrTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = () => {
    const trimmed = inputKey.trim();
    const trimmedEndpoint = inputEndpoint.trim();
    const trimmedAsrAppId = inputAsrAppId.trim();
    const trimmedAsrAccessKey = inputAsrAccessKey.trim();
    setApiKey(trimmed || null);
    setModelEndpoint(trimmedEndpoint || null);
    setAsrAppId(trimmedAsrAppId || null);
    setAsrAccessKey(trimmedAsrAccessKey || null);
    setTestResult(null);
    setAsrTestResult(null);
  };

  const handleTestConnection = async () => {
    const trimmed = inputKey.trim();
    const trimmedEndpoint = inputEndpoint.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: '请先输入 API Key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testText = '今天天气很好，阳光照进屋里';
      const result = await callAI(trimmed, testText, [], trimmedEndpoint || null);

      if (result.options && result.options.length > 0) {
        setTestResult({ success: true, message: '连接成功！API 正常工作' });
      } else {
        setTestResult({ success: false, message: '连接成功但返回内容异常，请检查模型配置' });
      }
    } catch (error: any) {
      const msg = error.message || '未知错误';
      if (msg.includes('401') || msg.includes('未授权') || msg.includes('Unauthorized') || msg.includes('认证')) {
        setTestResult({ success: false, message: 'API Key 无效，请检查 Key 是否正确' });
      } else if (msg.includes('403') || msg.includes('权限')) {
        setTestResult({ success: false, message: '权限不足，请检查账户是否开通对应服务' });
      } else if (msg.includes('404') || msg.includes('Not Found') || msg.includes('模型不存在')) {
        setTestResult({ success: false, message: '模型接入点 ID 不正确，请检查 ep- 开头的接入点 ID' });
      } else if (msg.includes('网络') || msg.includes('fetch') || msg.includes('TypeError')) {
        setTestResult({ success: false, message: '网络连接失败，请检查网络是否正常' });
      } else if (msg.includes('超时') || msg.includes('timeout')) {
        setTestResult({ success: false, message: '请求超时，请稍后重试' });
      } else if (msg.includes('额度') || msg.includes('quota') || msg.includes('insufficient')) {
        setTestResult({ success: false, message: 'API 额度不足，请充值或更换 Key' });
      } else {
        setTestResult({ success: false, message: `连接失败：${msg}` });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestAsr = async () => {
    const appId = inputAsrAppId.trim();
    const accessKey = inputAsrAccessKey.trim();
    if (!appId || !accessKey) {
      setAsrTestResult({ success: false, message: '请先填写 AppID 和 Access Key' });
      return;
    }

    setIsTestingAsr(true);
    setAsrTestResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start();

      await new Promise((resolve) => setTimeout(resolve, 1500));

      mediaRecorder.stop();
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
      });
      stream.getTracks().forEach((t) => t.stop());

      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, appKey: appId, accessKey }),
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setAsrTestResult({ success: true, message: `识别成功："${data.text}"` });
      } else {
        setAsrTestResult({ success: false, message: data.error || '识别失败' });
      }
    } catch (error: any) {
      const msg = error.message || '未知错误';
      if (msg.includes('麦克风') || msg.includes('not-allowed') || msg.includes('Permission')) {
        setAsrTestResult({ success: false, message: '需要麦克风权限，请允许后重试' });
      } else if (msg.includes('403') || msg.includes('权限') || msg.includes('45000001')) {
        setAsrTestResult({ success: false, message: '认证失败，请检查 AppID 和 Access Key 是否正确' });
      } else {
        setAsrTestResult({ success: false, message: `测试失败：${msg}` });
      }
    } finally {
      setIsTestingAsr(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('https://www.volcengine.com/product/doubao');
  };

  const isValidKeyFormat = inputKey.trim().startsWith('ark-') && inputKey.trim().length > 20;

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
          API 设置
        </h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE5D8] mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#FFF5E8] flex items-center justify-center">
              <Key size={20} className="text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#3D2C1E]">豆包 API Key</h2>
              <p className="text-xs text-[#A8998B]">火山方舟平台 · 豆包轻量版</p>
            </div>
          </div>

          <div className="relative mb-3">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="请输入 API Key（ark- 开头）"
              className="w-full px-4 py-3 pr-24 bg-[#F8F2E9] rounded-xl text-sm text-[#3D2C1E] placeholder:text-[#C4B5A5] outline-none focus:ring-2 focus:ring-[#F59E0B]/30 font-mono"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-2 text-[#A8998B] hover:text-[#786B5E]"
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {inputKey && !isValidKeyFormat && (
            <p className="text-xs text-[#D47766] mb-3">
              Key 格式似乎不对，火山方舟 API Key 通常以 ark- 开头
            </p>
          )}

          <div className="pt-4 mt-4 border-t border-[#EFE5D8]">
            <div className="flex items-center gap-2 mb-3">
              <Server size={16} className="text-[#786B5E]" />
              <span className="text-sm font-medium text-[#3D2C1E]">模型接入点 ID（选填）</span>
            </div>
            <input
              type="text"
              value={inputEndpoint}
              onChange={(e) => {
                setInputEndpoint(e.target.value);
                setTestResult(null);
              }}
              placeholder="ep-xxxxxxxx  留空则使用默认模型"
              className="w-full px-4 py-3 bg-[#F8F2E9] rounded-xl text-sm text-[#3D2C1E] placeholder:text-[#C4B5A5] outline-none focus:ring-2 focus:ring-[#F59E0B]/30 font-mono"
            />
            <p className="text-xs text-[#A8998B] mt-2">
              进入火山方舟「推理接入点」创建接入点，选择豆包轻量版模型，复制 ep- 开头的 ID
            </p>
          </div>

          {testResult && (
            <div
              className={`rounded-xl p-3 mb-4 flex items-start gap-2 ${
                testResult.success
                  ? 'bg-[#F0F5E8] border border-[#C5DDB0]'
                  : 'bg-[#FDF2F0] border border-[#F5D5CE]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle size={18} className="text-[#6B8E23] mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-[#D47766] mt-0.5 flex-shrink-0" />
              )}
              <p
                className={`text-sm ${
                  testResult.success ? 'text-[#5A7D1E]' : 'text-[#B85A48]'
                }`}
              >
                {testResult.message}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !inputKey.trim()}
              className="flex-1 py-3 bg-[#FFF8EE] text-[#F59E0B] border border-[#FDE68A] rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#FEF3C7] transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
            >
              保存设置
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE5D8] mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#F0F5E8] flex items-center justify-center">
              <Mic size={20} className="text-[#6B8E23]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-[#3D2C1E]">语音识别</h2>
              <p className="text-xs text-[#A8998B]">解决安卓等浏览器语音识别不可用问题</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-[#3D2C1E] mb-2">识别方式</p>
            <div className="flex gap-2">
              <button
                onClick={() => setVoiceApiProvider('browser')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  voiceApiProvider === 'browser'
                    ? 'bg-[#F59E0B] text-white'
                    : 'bg-[#F8F2E9] text-[#786B5E] hover:bg-[#F0E8DC]'
                }`}
              >
                浏览器内置
              </button>
              <button
                onClick={() => setVoiceApiProvider('volcengine')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  voiceApiProvider === 'volcengine'
                    ? 'bg-[#6B8E23] text-white'
                    : 'bg-[#F8F2E9] text-[#786B5E] hover:bg-[#F0E8DC]'
                }`}
              >
                火山语音识别
              </button>
            </div>
            <p className="text-xs text-[#A8998B] mt-2">
              {voiceApiProvider === 'browser'
                ? 'iOS Safari 效果好，免费实时，但安卓可能不可用'
                : '全平台兼容，需要配置火山语音服务，录音后识别'}
            </p>
          </div>

          {voiceApiProvider === 'volcengine' && (
            <div className="pt-4 border-t border-[#EFE5D8]">
              <div className="mb-3">
                <label className="text-sm font-medium text-[#3D2C1E] mb-2 block">
                  AppID
                </label>
                <input
                  type="text"
                  value={inputAsrAppId}
                  onChange={(e) => {
                    setInputAsrAppId(e.target.value);
                    setAsrTestResult(null);
                  }}
                  placeholder="请输入火山语音 AppID"
                  className="w-full px-4 py-3 bg-[#F8F2E9] rounded-xl text-sm text-[#3D2C1E] placeholder:text-[#C4B5A5] outline-none focus:ring-2 focus:ring-[#6B8E23]/30 font-mono"
                />
              </div>

              <div className="mb-3">
                <label className="text-sm font-medium text-[#3D2C1E] mb-2 block">
                  Access Key
                </label>
                <div className="relative">
                  <input
                    type={showAsrKey ? 'text' : 'password'}
                    value={inputAsrAccessKey}
                    onChange={(e) => {
                      setInputAsrAccessKey(e.target.value);
                      setAsrTestResult(null);
                    }}
                    placeholder="请输入 Access Key"
                    className="w-full px-4 py-3 pr-12 bg-[#F8F2E9] rounded-xl text-sm text-[#3D2C1E] placeholder:text-[#C4B5A5] outline-none focus:ring-2 focus:ring-[#6B8E23]/30 font-mono"
                  />
                  <button
                    onClick={() => setShowAsrKey(!showAsrKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#A8998B] hover:text-[#786B5E]"
                  >
                    {showAsrKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {asrTestResult && (
                <div
                  className={`rounded-xl p-3 mb-4 flex items-start gap-2 ${
                    asrTestResult.success
                      ? 'bg-[#F0F5E8] border border-[#C5DDB0]'
                      : 'bg-[#FDF2F0] border border-[#F5D5CE]'
                  }`}
                >
                  {asrTestResult.success ? (
                    <CheckCircle size={18} className="text-[#6B8E23] mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-[#D47766] mt-0.5 flex-shrink-0" />
                  )}
                  <p
                    className={`text-sm ${
                      asrTestResult.success ? 'text-[#5A7D1E]' : 'text-[#B85A48]'
                    }`}
                  >
                    {asrTestResult.message}
                  </p>
                </div>
              )}

              <button
                onClick={handleTestAsr}
                disabled={isTestingAsr || !inputAsrAppId.trim() || !inputAsrAccessKey.trim()}
                className="w-full py-3 bg-[#F0F5E8] text-[#6B8E23] border border-[#C5DDB0] rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#E8F0DC] transition-colors disabled:opacity-50"
              >
                {isTestingAsr ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    录音测试中（约1.5秒）...
                  </>
                ) : (
                  '测试语音识别'
                )}
              </button>

              <div className="mt-4 p-3 bg-[#FFF8EE] rounded-xl">
                <p className="text-xs text-[#786B5E] leading-relaxed">
                  <strong className="text-[#3D2C1E]">获取方式：</strong>
                  火山引擎控制台 → 豆包语音 → 语音识别 → 大模型极速版 →
                  开通服务后获取 AppID 和 Access Key。
                  <a
                    href="https://www.volcengine.com/docs/6561/1631584"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F59E0B] underline ml-1"
                  >
                    查看文档
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EFE5D8]">
          <h3 className="text-base font-medium text-[#3D2C1E] mb-3">如何获取 API Key？</h3>
          <div className="space-y-4 text-sm text-[#786B5E]">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F59E0B] text-white text-xs flex items-center justify-center">1</span>
              <div>
                <p className="text-[#3D2C1E] font-medium">注册火山引擎账号</p>
                <p className="text-xs mt-1">访问火山方舟官网，完成实名认证</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F59E0B] text-white text-xs flex items-center justify-center">2</span>
              <div>
                <p className="text-[#3D2C1E] font-medium">开通豆包轻量版服务</p>
                <p className="text-xs mt-1">在「模型服务」中找到豆包轻量版（Doubao-Lite），开通服务</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F59E0B] text-white text-xs flex items-center justify-center">3</span>
              <div>
                <p className="text-[#3D2C1E] font-medium">创建 API Key</p>
                <p className="text-xs mt-1">在「API Key 管理」中创建新 Key，复制以 ark- 开头的完整 Key</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#6B8E23] text-white text-xs flex items-center justify-center">✓</span>
              <div>
                <p className="text-[#3D2C1E] font-medium">免费额度充足</p>
                <p className="text-xs mt-1">个人实名认证后每月100万免费Tokens，新用户额外赠送50万，日常使用完全够用</p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#EFE5D8]">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-sm text-[#F59E0B] hover:text-[#D97706]"
            >
              <ExternalLink size={16} />
              火山方舟官网
              <Copy size={14} />
            </button>
          </div>
        </div>

        <div className="mt-6 bg-[#FFF5E8] rounded-xl p-4 border border-[#FDE68A]">
          <p className="text-xs text-[#786B5E] leading-relaxed">
            💡 <strong className="text-[#3D2C1E]">温馨提示：</strong>
            API Key 仅保存在你的设备本地，不会上传到任何服务器。
            没有配置 Key 时，应用会使用演示模式，可以体验交互流程，但生成内容为固定示例。
          </p>
        </div>
      </div>
    </div>
  );
}
