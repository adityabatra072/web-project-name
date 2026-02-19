import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelCategory, VoicePipeline, ModelManager } from '@runanywhere/web';
import { TextGeneration, ToolCalling, toToolValue, getStringArg } from '@runanywhere/web-llamacpp';
import { VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { AudioCapture, VAD, SpeechActivity } from '@runanywhere/web-onnx';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

type DebugMode = 'text' | 'vision' | 'voice';

interface DebugAnalysis {
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  suggestedFix: string;
  codeExample: string;
  additionalNotes: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  analysis?: DebugAnalysis;
  timestamp: number;
}

export function DebugTab() {
  const llmLoader = useModelLoader(ModelCategory.Language);
  const vlmLoader = useModelLoader(ModelCategory.Multimodal);
  const [mode, setMode] = useState<DebugMode>('text');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('');
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const voicePipelineRef = useRef<VoicePipeline | null>(null);
  const micRef = useRef<AudioCapture | null>(null);
  const vadUnsubRef = useRef<(() => void) | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Register debug analysis tool
  useEffect(() => {
    ToolCalling.registerTool(
      {
        name: 'analyze_error',
        description: 'Analyzes a programming error or bug and provides structured debugging information',
        parameters: [
          { name: 'errorType', type: 'string', description: 'Type of error (e.g., TypeError, ReferenceError, SyntaxError)', required: true },
          { name: 'severity', type: 'string', description: 'Severity level: low, medium, high, or critical', required: true, enumValues: ['low', 'medium', 'high', 'critical'] },
          { name: 'rootCause', type: 'string', description: 'Root cause explanation of the error', required: true },
          { name: 'suggestedFix', type: 'string', description: 'Detailed steps to fix the error', required: true },
          { name: 'codeExample', type: 'string', description: 'Code example showing the fix', required: true },
          { name: 'additionalNotes', type: 'string', description: 'Additional debugging tips or related issues', required: false },
        ],
        category: 'Debug',
      },
      async (args) => {
        return {
          errorType: args.errorType || toToolValue('Unknown'),
          severity: args.severity || toToolValue('medium'),
          rootCause: args.rootCause || toToolValue(''),
          suggestedFix: args.suggestedFix || toToolValue(''),
          codeExample: args.codeExample || toToolValue(''),
          additionalNotes: args.additionalNotes || toToolValue(''),
        };
      }
    );

    return () => {
      ToolCalling.unregisterTool('analyze_error');
    };
  }, []);

  const analyzeError = useCallback(async (errorText: string) => {
    if (!errorText.trim() || processing) return;

    // Ensure model is loaded
    if (llmLoader.state !== 'ready') {
      const ok = await llmLoader.ensure();
      if (!ok) return;
    }

    const userMessage: Message = {
      role: 'user',
      content: errorText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setProcessing(true);

    const assistantIdx = messages.length + 1;
    const tempMessage: Message = {
      role: 'assistant',
      content: 'Analyzing error...',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const systemPrompt = `You are an expert debugging assistant. Analyze programming errors and bugs with precision.
When given an error message, stack trace, or code issue:
1. Identify the error type
2. Assess severity
3. Explain the root cause
4. Provide a clear fix
5. Give a code example

Always use the analyze_error tool to structure your response. Be concise but thorough.`;

      const result = await ToolCalling.generateWithTools(
        `Analyze this error and provide debugging help:\n\n${errorText}`,
        {
          maxToolCalls: 1,
          autoExecute: true,
          temperature: 0.3,
          maxTokens: 800,
          systemPrompt,
          replaceSystemPrompt: true,
        }
      );

      let analysis: DebugAnalysis | undefined;

      // Extract analysis from tool results
      if (result.toolResults && result.toolResults.length > 0) {
        const toolResult = result.toolResults[0];
        if (toolResult.success && toolResult.result) {
          const res = toolResult.result as Record<string, any>;
          analysis = {
            errorType: getStringArg(res, 'errorType') || 'Unknown Error',
            severity: (getStringArg(res, 'severity') as any) || 'medium',
            rootCause: getStringArg(res, 'rootCause') || '',
            suggestedFix: getStringArg(res, 'suggestedFix') || '',
            codeExample: getStringArg(res, 'codeExample') || '',
            additionalNotes: getStringArg(res, 'additionalNotes') || '',
          };
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = {
          role: 'assistant',
          content: result.text || 'Analysis complete.',
          analysis,
          timestamp: Date.now(),
        };
        return updated;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = {
          role: 'assistant',
          content: `Error during analysis: ${msg}`,
          timestamp: Date.now(),
        };
        return updated;
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, messages.length, llmLoader]);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await analyzeError(input);
    setInput('');
  };

  // Vision mode - screenshot analysis
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      alert('Camera access denied: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Ensure VLM model is loaded
    if (vlmLoader.state !== 'ready') {
      const ok = await vlmLoader.ensure();
      if (!ok) return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setProcessing(true);
    stopCamera();

    try {
      const uint8Data = new Uint8Array(imageData.data.buffer);
      const result = await VLMWorkerBridge.shared.process(
        uint8Data,
        canvas.width,
        canvas.height,
        'Analyze this screenshot of a programming error or console output. Describe what you see and identify any errors or issues visible in the image.'
      );

      if (result.text) {
        await analyzeError(`[From Screenshot]\n${result.text}`);
      }
    } catch (err) {
      alert('Vision analysis failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ensure VLM model is loaded
    if (vlmLoader.state !== 'ready') {
      const ok = await vlmLoader.ensure();
      if (!ok) return;
    }

    setProcessing(true);

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const uint8Data = new Uint8Array(imageData.data.buffer);
      const result = await VLMWorkerBridge.shared.process(
        uint8Data,
        canvas.width,
        canvas.height,
        'Analyze this screenshot of a programming error or console output. Describe what you see and identify any errors or issues visible in the image.'
      );

      if (result.text) {
        await analyzeError(`[From Uploaded Image]\n${result.text}`);
      }
    } catch (err) {
      alert('Image analysis failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Voice mode
  const startVoiceDebugging = async () => {
    try {
      // Ensure all models are loaded
      const anyMissing = !ModelManager.getLoadedModel(ModelCategory.Audio)
        || !ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)
        || !ModelManager.getLoadedModel(ModelCategory.Language)
        || !ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis);

      if (anyMissing) {
        setVoiceStatus('Loading voice models...');
        // Load the essential models
        await llmLoader.ensure();
        // Note: VAD, STT, TTS loaders would need to be added similar to VoiceTab
        setVoiceStatus('Models loaded. Click Start again.');
        return;
      }

      setVoiceStatus('Initializing voice pipeline...');
      setProcessing(true);

      const mic = new AudioCapture({ sampleRate: 16000 });
      micRef.current = mic;

      if (!voicePipelineRef.current) {
        voicePipelineRef.current = new VoicePipeline();
      }

      VAD.reset();

      vadUnsubRef.current = VAD.onSpeechActivity((activity: SpeechActivity) => {
        if (activity === SpeechActivity.Ended) {
          const segment = VAD.popSpeechSegment();
          if (segment && segment.samples.length > 1600) {
            processVoiceSpeech(segment.samples);
          }
        }
      });

      await mic.start(
        (chunk: Float32Array) => { VAD.processSamples(chunk); },
        (_level: number) => { /* audio level */ },
      );

      setVoiceStatus('Listening... Speak your error or issue.');
      setProcessing(false);
    } catch (err) {
      setVoiceStatus('Failed to start: ' + (err instanceof Error ? err.message : String(err)));
      setProcessing(false);
    }
  };

  const processVoiceSpeech = async (audioData: Float32Array) => {
    const pipeline = voicePipelineRef.current;
    if (!pipeline) return;

    micRef.current?.stop();
    vadUnsubRef.current?.();
    setVoiceStatus('Processing...');

    try {
      const result = await pipeline.processTurn(audioData, {
        maxTokens: 150,
        temperature: 0.7,
        systemPrompt: 'You are a debugging assistant. Analyze errors and provide concise debugging help.',
      }, {
        onTranscription: (text: string) => {
          setVoiceStatus(`You said: "${text}"`);
          setMessages((prev) => [
            ...prev,
            { role: 'user', content: text, timestamp: Date.now() },
          ]);
        },
        onResponseToken: (_token: string, accumulated: string) => {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: accumulated,
              };
              return updated;
            } else {
              return [...prev, { role: 'assistant', content: accumulated, timestamp: Date.now() }];
            }
          });
        },
        onResponseComplete: (text: string) => {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: text,
              };
              return updated;
            }
            return prev;
          });
          setVoiceStatus('Speaking response...');
        },
        onSynthesisComplete: async () => {
          setVoiceStatus('Response complete. Stopped.');
          setProcessing(false);
        },
      });

      if (result) {
        setVoiceStatus('Turn complete');
      }
    } catch (err) {
      setVoiceStatus('Error: ' + (err instanceof Error ? err.message : String(err)));
      setProcessing(false);
    }
  };

  const stopVoiceDebugging = async () => {
    micRef.current?.stop();
    vadUnsubRef.current?.();
    setVoiceStatus('');
    setProcessing(false);
  };

  const exportReport = () => {
    const report = messages
      .map((msg) => {
        let text = `[${new Date(msg.timestamp).toLocaleString()}] ${msg.role.toUpperCase()}:\n${msg.content}`;
        if (msg.analysis) {
          text += `\n\n--- ANALYSIS ---\nError Type: ${msg.analysis.errorType}\nSeverity: ${msg.analysis.severity}\nRoot Cause: ${msg.analysis.rootCause}\nSuggested Fix: ${msg.analysis.suggestedFix}\nCode Example:\n${msg.analysis.codeExample}\nNotes: ${msg.analysis.additionalNotes}`;
        }
        return text;
      })
      .join('\n\n---\n\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    if (confirm('Clear all messages?')) {
      setMessages([]);
    }
  };

  return (
    <div className="tab-panel debug-panel">
      <div className="debug-header">
        <h2>Debug Assistant</h2>
        <p className="debug-subtitle">Analyze errors with AI - Text, Vision, or Voice</p>
      </div>

      {/* Mode Selector */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
          onClick={() => setMode('text')}
          disabled={processing}
        >
          📝 Text
        </button>
        <button
          className={`mode-btn ${mode === 'vision' ? 'active' : ''}`}
          onClick={() => setMode('vision')}
          disabled={processing}
        >
          📷 Vision
        </button>
        <button
          className={`mode-btn ${mode === 'voice' ? 'active' : ''}`}
          onClick={() => setMode('voice')}
          disabled={processing}
        >
          🎤 Voice
        </button>
      </div>

      {/* Model Banners */}
      {mode === 'text' && (
        <ModelBanner
          state={llmLoader.state}
          progress={llmLoader.progress}
          error={llmLoader.error}
          onLoad={llmLoader.ensure}
          label="LLM for Debug Analysis"
        />
      )}

      {mode === 'vision' && (
        <>
          <ModelBanner
            state={vlmLoader.state}
            progress={vlmLoader.progress}
            error={vlmLoader.error}
            onLoad={vlmLoader.ensure}
            label="VLM for Screenshot Analysis"
          />
          <ModelBanner
            state={llmLoader.state}
            progress={llmLoader.progress}
            error={llmLoader.error}
            onLoad={llmLoader.ensure}
            label="LLM for Debug Analysis"
          />
        </>
      )}

      {mode === 'voice' && (
        <ModelBanner
          state={llmLoader.state}
          progress={llmLoader.progress}
          error={llmLoader.error}
          onLoad={llmLoader.ensure}
          label="Voice Pipeline"
        />
      )}

      {/* Messages Display */}
      <div className="message-list debug-message-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <h3>Debug Assistant Ready</h3>
            <p>
              {mode === 'text' && 'Paste your error message or stack trace below'}
              {mode === 'vision' && 'Upload a screenshot or use camera to capture errors'}
              {mode === 'voice' && 'Click Start to describe your error verbally'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-bubble">
              <div className="message-header">
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}</strong>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="message-content">{msg.content}</p>

              {msg.analysis && (
                <div className="debug-analysis">
                  <div className="analysis-header">
                    <span className="error-type">{msg.analysis.errorType}</span>
                    <span className={`severity-badge severity-${msg.analysis.severity}`}>
                      {msg.analysis.severity.toUpperCase()}
                    </span>
                  </div>

                  <div className="analysis-section">
                    <strong>Root Cause:</strong>
                    <p>{msg.analysis.rootCause}</p>
                  </div>

                  <div className="analysis-section">
                    <strong>Suggested Fix:</strong>
                    <p>{msg.analysis.suggestedFix}</p>
                  </div>

                  {msg.analysis.codeExample && (
                    <div className="analysis-section">
                      <strong>Code Example:</strong>
                      <pre className="code-block">{msg.analysis.codeExample}</pre>
                    </div>
                  )}

                  {msg.analysis.additionalNotes && (
                    <div className="analysis-section">
                      <strong>Additional Notes:</strong>
                      <p>{msg.analysis.additionalNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mode-specific Controls */}
      <div className="debug-controls">
        {mode === 'text' && (
          <form className="debug-text-form" onSubmit={handleTextSubmit}>
            <textarea
              className="debug-textarea"
              placeholder="Paste your error message, stack trace, or describe the bug..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={processing}
              rows={4}
            />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={!input.trim() || processing}>
                {processing ? 'Analyzing...' : 'Analyze Error'}
              </button>
              {messages.length > 0 && (
                <>
                  <button type="button" className="btn" onClick={exportReport}>
                    Export Report
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={clearHistory}>
                    Clear
                  </button>
                </>
              )}
            </div>
          </form>
        )}

        {mode === 'vision' && (
          <div className="debug-vision-controls">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            {!cameraActive ? (
              <div className="vision-buttons">
                <button
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                >
                  📁 Upload Screenshot
                </button>
                <button className="btn" onClick={startCamera} disabled={processing}>
                  📷 Use Camera
                </button>
                {messages.length > 0 && (
                  <>
                    <button className="btn" onClick={exportReport}>
                      Export Report
                    </button>
                    <button className="btn btn-secondary" onClick={clearHistory}>
                      Clear
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="camera-preview">
                <video ref={videoRef} className="video-preview" />
                <div className="camera-actions">
                  <button className="btn btn-primary" onClick={captureAndAnalyze} disabled={processing}>
                    📸 Capture & Analyze
                  </button>
                  <button className="btn btn-secondary" onClick={stopCamera}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {mode === 'voice' && (
          <div className="debug-voice-controls">
            {voiceStatus && (
              <div className="voice-status">
                <span className="status-indicator" />
                {voiceStatus}
              </div>
            )}

            <div className="voice-buttons">
              {!processing && !voiceStatus ? (
                <button className="btn btn-primary btn-large" onClick={startVoiceDebugging}>
                  🎤 Start Voice Debugging
                </button>
              ) : (
                <button className="btn btn-secondary btn-large" onClick={stopVoiceDebugging}>
                  ⏹️ Stop
                </button>
              )}

              {messages.length > 0 && (
                <>
                  <button className="btn" onClick={exportReport}>
                    Export Report
                  </button>
                  <button className="btn btn-secondary" onClick={clearHistory}>
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
