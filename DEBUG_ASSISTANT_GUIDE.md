# Debug Assistant - User Guide & Testing

## Overview

The Debug Assistant is an **on-device AI-powered debugging companion** that helps developers analyze errors, bugs, and stack traces entirely in the browser. All processing happens locally - no data ever leaves your device.

## Features

### 🔍 Three Analysis Modes

1. **Text Mode** - Paste error messages, stack traces, or code issues
2. **Vision Mode** - Upload screenshots or capture error screens with your camera
3. **Voice Mode** - Describe errors verbally and get spoken responses

### ✨ Key Capabilities

- **Structured Error Analysis** using AI Tool Calling
  - Error type identification
  - Severity assessment (Low/Medium/High/Critical)
  - Root cause analysis
  - Step-by-step fixes
  - Code examples
  - Additional debugging tips

- **Conversation History** - Ask follow-up questions about errors
- **Export Reports** - Download full debugging sessions as text files
- **100% Private** - All AI inference runs on-device via WebAssembly

---

## How to Use

### Text Mode (Recommended)

1. Click the **Debug** tab
2. Select **📝 Text** mode
3. Paste your error message or stack trace in the textarea
4. Click **Analyze Error**
5. Review the structured analysis with:
   - Error type
   - Severity badge
   - Root cause
   - Suggested fix
   - Code example

**Example Error to Test:**
```
TypeError: Cannot read property 'map' of undefined
    at UserList.render (UserList.js:45:18)
    at React.Component.render (react.js:1234)
```

### Vision Mode

1. Click the **Debug** tab
2. Select **📷 Vision** mode
3. Either:
   - Click **📁 Upload Screenshot** to select an image
   - Click **📷 Use Camera** to capture your screen
4. The VLM analyzes the image and describes visible errors
5. The LLM then provides debugging help

**Best for:**
- Console screenshots
- IDE error messages
- Terminal output
- Error dialogs

### Voice Mode

1. Click the **Debug** tab
2. Select **🎤 Voice** mode
3. Click **Start Voice Debugging**
4. Speak your error description clearly
5. The AI will transcribe, analyze, and speak the response

**Example voice input:**
> "I'm getting a null pointer exception when trying to access user data in my React component"

**Note:** Voice mode requires VAD, STT, TTS, and LLM models to be loaded. Make sure to load all models first by visiting the Voice tab.

---

## Testing Checklist

### ✅ Text Mode Tests

- [x] Build successful
- [x] Component renders correctly
- [x] Tool Calling integration working
- [x] Error analysis structured output
- [x] Conversation history maintained
- [x] Export report functionality

**Test Cases:**

1. **JavaScript TypeError**
```
Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
    at initEventListeners (app.js:23:15)
    at window.onload (app.js:45:5)
```

2. **Python Error**
```
Traceback (most recent call last):
  File "main.py", line 42, in process_data
    result = data['user']['name'].upper()
KeyError: 'user'
```

3. **React Error**
```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

### ✅ Vision Mode Tests

- [x] Component renders correctly
- [x] File upload working
- [x] Camera access implemented
- [x] Image processing with VLM
- [x] Follow-up analysis with LLM

**Test Cases:**

1. Upload a screenshot of console errors
2. Use camera to capture IDE error messages
3. Upload image of terminal output

### ✅ Voice Mode Tests

- [x] Component renders correctly
- [x] Voice pipeline integration
- [x] VAD speech detection
- [x] STT transcription
- [x] LLM response generation
- [x] TTS audio playback

**Test Cases:**

1. Speak: "I have a syntax error on line 10"
2. Speak: "My API call is returning 404 error"
3. Speak: "React component won't render"

### ✅ General Features

- [x] Mode switching works
- [x] Model loading banners display correctly
- [x] Export report generates valid text file
- [x] Clear history confirms and clears messages
- [x] Responsive UI design
- [x] Dark theme styling

---

## Architecture

```
DebugTab Component
├── Text Mode
│   ├── TextGeneration (LLM)
│   └── ToolCalling (analyze_error tool)
├── Vision Mode
│   ├── VLMWorkerBridge (Vision analysis)
│   └── TextGeneration (Follow-up analysis)
└── Voice Mode
    ├── AudioCapture (Microphone)
    ├── VAD (Voice Activity Detection)
    ├── VoicePipeline (STT → LLM → TTS)
    └── AudioPlayback (Speak response)
```

---

## Models Used

| Mode   | Model                  | Size  | Purpose                |
|--------|------------------------|-------|------------------------|
| Text   | LFM2 350M Q4_K_M       | ~250MB| Error analysis         |
| Vision | LFM2-VL 450M Q4_0      | ~500MB| Screenshot OCR         |
| Voice  | Whisper Tiny (ONNX)    | ~105MB| Speech-to-text         |
| Voice  | Piper TTS (ONNX)       | ~65MB | Text-to-speech         |
| Voice  | Silero VAD v5          | ~5MB  | Voice activity detection|

---

## Technical Implementation Highlights

### Tool Calling for Structured Output

```typescript
ToolCalling.registerTool({
  name: 'analyze_error',
  description: 'Analyzes programming errors with structured output',
  parameters: [
    { name: 'errorType', type: 'string', required: true },
    { name: 'severity', type: 'string', enumValues: ['low','medium','high','critical'] },
    { name: 'rootCause', type: 'string', required: true },
    { name: 'suggestedFix', type: 'string', required: true },
    { name: 'codeExample', type: 'string', required: true },
    { name: 'additionalNotes', type: 'string' },
  ]
})
```

### Vision Processing

```typescript
const uint8Data = new Uint8Array(imageData.data.buffer);
const result = await VLMWorkerBridge.shared.process(
  uint8Data,
  width,
  height,
  'Analyze this screenshot of a programming error...'
);
```

### Voice Pipeline

```typescript
const pipeline = new VoicePipeline();
await pipeline.processTurn(audioData, {
  maxTokens: 150,
  temperature: 0.7,
  systemPrompt: 'You are a debugging assistant...'
}, {
  onTranscription: (text) => { /* handle transcription */ },
  onResponseToken: (token, accumulated) => { /* stream response */ },
  onSynthesisComplete: () => { /* audio playback done */ }
});
```

---

## Known Limitations

1. **Voice Mode Requirements**: Requires all voice models (VAD, STT, TTS) to be loaded. Visit the Voice tab first to pre-load models.

2. **Browser Support**: Requires Chrome 96+ or Edge 96+ with WebAssembly and OPFS support.

3. **Memory**: Larger models require 4GB+ RAM for optimal performance.

4. **Camera Access**: Vision mode camera requires HTTPS (except localhost).

---

## Browser Testing

### Recommended: Chrome/Edge 120+

```bash
npm run dev
# Open http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Future Enhancements

- [ ] Add more specialized debugging tools (memory leaks, performance)
- [ ] Support for more programming languages
- [ ] Integration with GitHub Issues
- [ ] Collaborative debugging sessions
- [ ] Code diff analysis
- [ ] Historical error tracking

---

## Troubleshooting

### Models not loading?
- Check browser console for errors
- Ensure stable internet for first download
- Models are cached in OPFS after first load

### Tool Calling not working?
- Verify LFM2 model is loaded
- Check console for tool registration errors
- Temperature too high may cause inconsistent output

### Vision mode camera not working?
- Grant camera permissions in browser
- Ensure HTTPS or localhost
- Check camera is not in use by another app

### Voice mode silent?
- Check microphone permissions
- Verify audio output not muted
- Ensure VAD model loaded correctly

---

## Success Criteria

✅ All three modes functional
✅ Structured error analysis with severity badges
✅ Conversation history preserved
✅ Export reports working
✅ Build successful with no errors
✅ Responsive UI on mobile and desktop
✅ Privacy-first: 100% on-device inference

---

## Conclusion

The Debug Assistant successfully demonstrates the power of **on-device AI** for real-world developer tools. By combining LLM, VLM, and Voice capabilities, it provides a comprehensive, privacy-preserving debugging experience that runs entirely in the browser.

**Ready to test!** Open http://localhost:5173 and click the 🐛 Debug tab.
