# Debug Assistant - On-Device AI Debugging Companion

A **production-ready React + TypeScript application** demonstrating the power of **on-device AI for developer tools** using the [`@runanywhere/web`](https://www.npmjs.com/package/@runanywhere/web) SDK. All inference runs locally via WebAssembly — no server, no API key, 100% private.

## 🎯 What is Debug Assistant?

An AI-powered debugging companion that analyzes programming errors, bugs, and stack traces **entirely in your browser**. Never send your proprietary code to external APIs again.

## ✨ Features

| Tab | What it does |
|-----|-------------|
| **🐛 Debug** | **NEW!** Analyze errors with Text, Vision, or Voice - get structured debugging help with severity levels, root causes, and code examples |
| **💬 Chat** | Stream text from an on-device LLM (LFM2 350M) |
| **📷 Vision** | Point your camera and describe what the VLM sees (LFM2-VL 450M) |
| **🎙️ Voice** | Speak naturally — VAD detects speech, STT transcribes, LLM responds, TTS speaks back |

### Debug Assistant Capabilities

- **📝 Text Mode:** Paste error messages, stack traces, or code issues for instant AI analysis
- **📷 Vision Mode:** Upload screenshots or capture error screens with your camera
- **🎤 Voice Mode:** Describe errors verbally and get spoken debugging help
- **🎯 Structured Analysis:** AI uses Tool Calling to provide:
  - Error type identification
  - Severity assessment (Low/Medium/High/Critical)
  - Root cause explanation
  - Step-by-step fixes
  - Working code examples
  - Additional debugging tips
- **💬 Conversation History:** Ask follow-up questions about your errors
- **📥 Export Reports:** Download complete debugging sessions as text files
- **🔒 100% Private:** All processing happens on-device via WebAssembly

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Click the **🐛 Debug** tab to start debugging with AI!

Models are downloaded on first use and cached in the browser's Origin Private File System (OPFS).

## Quick Demo

### Text Mode (Fastest)
1. Click **🐛 Debug** tab
2. Select **📝 Text** mode
3. Paste this error:
```
TypeError: Cannot read properties of undefined (reading 'map')
    at ProductList.jsx:34
```
4. Click **Analyze Error**
5. Get structured debugging help with severity, root cause, and fixes!

### Vision Mode
1. Select **📷 Vision** mode
2. Upload a screenshot of console errors or use camera
3. AI analyzes the image and provides debugging help

### Voice Mode
1. Select **🎤 Voice** mode
2. Click **Start Voice Debugging**
3. Speak: "I have a null pointer exception in my React component"
4. Listen to AI's debugging response

📖 **See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for comprehensive testing scenarios**  
📚 **Read [DEBUG_ASSISTANT_GUIDE.md](DEBUG_ASSISTANT_GUIDE.md) for full documentation**

## How It Works

```
@runanywhere/web (npm package)
  ├── WASM engine (llama.cpp, whisper.cpp, sherpa-onnx)
  ├── Model management (download, OPFS cache, load/unload)
  └── TypeScript API (TextGeneration, STT, TTS, VAD, VLM, VoicePipeline, ToolCalling)
```

The Debug Assistant uses advanced AI features:

```typescript
import { RunAnywhere, TextGeneration, VLMWorkerBridge, ToolCalling } from '@runanywhere/web';

await RunAnywhere.initialize({ environment: 'development' });

// Text Mode: Structured debugging with Tool Calling
ToolCalling.registerTool({
  name: 'analyze_error',
  description: 'Analyzes programming errors with structured output',
  parameters: [
    { name: 'errorType', type: 'string', required: true },
    { name: 'severity', type: 'string', enumValues: ['low','medium','high','critical'] },
    { name: 'rootCause', type: 'string', required: true },
    // ... more fields
  ]
}, async (args) => { /* implementation */ });

const result = await ToolCalling.generateWithTools('Analyze this error...', {
  maxToolCalls: 1,
  autoExecute: true,
  temperature: 0.3
});

// Vision Mode: Screenshot analysis
const result = await VLMWorkerBridge.shared.process(
  imageData, width, height,
  'Analyze this error screenshot...'
);

// Voice Mode: Full pipeline
const pipeline = new VoicePipeline();
await pipeline.processTurn(audioData, options, callbacks);
```

## Project Structure

```
src/
├── main.tsx              # React root
├── App.tsx               # Tab navigation (Debug | Chat | Vision | Voice)
├── runanywhere.ts        # SDK init + model catalog + VLM worker
├── workers/
│   └── vlm-worker.ts     # VLM Web Worker entry (2 lines)
├── hooks/
│   └── useModelLoader.ts # Shared model download/load hook
├── components/
│   ├── DebugTab.tsx       # 🆕 Debug Assistant (Text/Vision/Voice)
│   ├── ChatTab.tsx        # LLM streaming chat
│   ├── VisionTab.tsx      # Camera + VLM inference
│   ├── VoiceTab.tsx       # Full voice pipeline
│   └── ModelBanner.tsx    # Download progress UI
└── styles/
    └── index.css          # Dark theme CSS + Debug Assistant styles
```

### Debug Assistant Architecture

```
DebugTab.tsx (480 lines)
├── Text Mode
│   ├── TextGeneration (LLM inference)
│   ├── ToolCalling (structured analysis)
│   └── analyze_error tool (custom tool definition)
├── Vision Mode
│   ├── Camera/Upload (image capture)
│   ├── VLMWorkerBridge (screenshot OCR)
│   └── TextGeneration (follow-up analysis)
└── Voice Mode
    ├── AudioCapture (microphone)
    ├── VAD (voice activity detection)
    ├── VoicePipeline (full STT→LLM→TTS)
    └── Audio playback
```

## Models Used

| Model                  | Size  | Purpose                    | Used By        |
|------------------------|-------|----------------------------|----------------|
| LFM2 350M Q4_K_M       | ~250MB| Text generation & debugging| Debug, Chat    |
| LFM2-VL 450M Q4_0      | ~500MB| Vision + language          | Debug, Vision  |
| Whisper Tiny (ONNX)    | ~105MB| Speech-to-text             | Debug, Voice   |
| Piper TTS (ONNX)       | ~65MB | Text-to-speech             | Debug, Voice   |
| Silero VAD v5          | ~5MB  | Voice activity detection   | Debug, Voice   |

All models are automatically downloaded on first use and cached locally in OPFS.

## Deployment

### Vercel

```bash
npm run build
npx vercel --prod
```

The included `vercel.json` sets the required Cross-Origin-Isolation headers.

### Netlify

Add a `_headers` file:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

### Any static host

Serve the `dist/` folder with these HTTP headers on all responses:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

## Browser Requirements

- Chrome 96+ or Edge 96+ (recommended: 120+)
- WebAssembly (required)
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS (for persistent model cache)
- 4GB+ RAM recommended for optimal performance

## Why Debug Assistant?

Traditional debugging relies on:
- ❌ Copying errors to ChatGPT/Claude (privacy concerns)
- ❌ Searching Stack Overflow (time-consuming)
- ❌ Reading documentation (requires context switching)

**Debug Assistant provides:**
- ✅ **Instant analysis** - paste and get structured help in seconds
- ✅ **100% private** - code never leaves your device
- ✅ **Multi-modal** - text, vision, or voice input
- ✅ **Context-aware** - maintains conversation for follow-ups
- ✅ **Actionable** - get severity, root cause, and working code examples
- ✅ **Free** - no API costs, runs on your hardware

## Use Cases

### For Individual Developers
- Quick error analysis during coding
- Learning from mistakes with detailed explanations
- Screenshot debugging of console errors
- Voice debugging while hands are on keyboard

### For Teams
- Export debugging sessions for documentation
- Share analysis reports with team members
- Consistent error analysis format
- Privacy-compliant code review

### For Education
- Students learn debugging patterns
- Teachers demonstrate error analysis
- No external API dependencies
- Works offline after model download

## Technical Highlights

### 🎯 Tool Calling for Structured Output
Uses RunAnywhere's Tool Calling API to ensure consistent, parseable debugging analysis with predefined schema.

### 🖼️ Vision Language Models
Analyzes screenshots of errors using LFM2-VL 450M, enabling visual debugging workflows.

### 🎤 Full Voice Pipeline
Implements complete VAD → STT → LLM → TTS pipeline for hands-free debugging.

### 💾 Efficient Storage
Models cached in Origin Private File System (OPFS) for fast subsequent loads.

### ⚡ Web Workers
VLM inference runs in dedicated Web Worker to prevent UI blocking.

## Performance

### First Load (with model download)
- Text Mode: ~30-60 seconds (250MB LLM download)
- Vision Mode: ~90-120 seconds (750MB VLM + LLM download)
- Voice Mode: ~2-3 minutes (425MB total models)

### Subsequent Loads (cached)
- Text Mode: ~2-5 seconds
- Vision Mode: ~5-10 seconds
- Voice Mode: ~10-20 seconds

### Inference Speed
- Text Generation: 15-30 tokens/second (CPU), 40-80 tokens/second (WebGPU)
- Vision Analysis: ~10-30 seconds per image
- Voice Transcription: Real-time
- Speech Synthesis: ~2-5 seconds

## Adding Your Own Models

Edit the `MODELS` array in `src/runanywhere.ts`:

```typescript
{
  id: 'my-custom-model',
  name: 'My Model',
  repo: 'username/repo-name',           // HuggingFace repo
  files: ['model.Q4_K_M.gguf'],         // Files to download
  framework: LLMFramework.LlamaCpp,
  modality: ModelCategory.Language,      // or Multimodal, SpeechRecognition, etc.
  memoryRequirement: 500_000_000,        // Bytes
}
```

Any GGUF model compatible with llama.cpp works for LLM/VLM. STT/TTS/VAD use sherpa-onnx models.

## Documentation

- [Debug Assistant User Guide](DEBUG_ASSISTANT_GUIDE.md) - Complete feature documentation
- [Demo Script](DEMO_SCRIPT.md) - Step-by-step testing scenarios
- [SDK API Reference](https://docs.runanywhere.ai) - RunAnywhere Web SDK docs
- [npm package](https://www.npmjs.com/package/@runanywhere/web)
- [GitHub](https://github.com/RunanywhereAI/runanywhere-sdks)

## Roadmap

### Debug Assistant Future Features
- [ ] Multi-language support (Python, Java, Go, Rust)
- [ ] Code diff analysis
- [ ] Performance profiling insights
- [ ] Memory leak detection
- [ ] Integration with GitHub Issues
- [ ] Collaborative debugging sessions
- [ ] Custom tool definitions per language
- [ ] Historical error tracking

## Contributing

This is a demonstration project showcasing on-device AI capabilities. Feel free to:
- Report bugs via GitHub Issues
- Suggest features
- Fork and customize for your needs
- Share your debugging use cases

## License

MIT

---

## About RunAnywhere

RunAnywhere provides production-grade SDKs for on-device AI across all platforms:
- **Web SDK** (this project) - Browser-based AI via WebAssembly
- **iOS SDK** - Native Swift SDK for iPhone/iPad
- **Android SDK** - Native Kotlin SDK
- **React Native SDK** - Cross-platform mobile AI
- **Flutter SDK** - Cross-platform with Flutter

**All SDKs share:**
- ✅ Same C++ inference core (llama.cpp, whisper.cpp, sherpa-onnx)
- ✅ Privacy-first architecture
- ✅ Offline-capable
- ✅ No server dependencies
- ✅ Production-ready performance

Learn more at [docs.runanywhere.ai](https://docs.runanywhere.ai)

---

**Built with ❤️ using RunAnywhere Web SDK**

Transform your debugging workflow with the power of on-device AI! 🐛✨
