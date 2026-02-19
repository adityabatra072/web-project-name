# Debug Assistant - Quick Demo Script

This is a step-by-step demo script to showcase all features of the Debug Assistant.

---

## Demo 1: Text Mode - JavaScript Error Analysis

**Setup:** Open the app at http://localhost:5173, click the 🐛 Debug tab.

**Steps:**

1. Select **📝 Text** mode
2. Paste this error:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'map')
    at ProductList.render (ProductList.jsx:34:12)
    at React.Component.render (react.js:1523:14)
    at Object.updateComponent (react-dom.js:4523:5)
```

3. Click **Analyze Error**
4. Wait for analysis (model downloads on first use)

**Expected Output:**
- Error Type: TypeError
- Severity: Medium or High
- Root Cause: Trying to call .map() on undefined data
- Suggested Fix: Add null/undefined check before mapping
- Code Example: Conditional rendering or default value
- Additional Notes: Common React pattern issues

**Follow-up Test:**
5. Type: "How can I prevent this in the future?"
6. Click **Analyze Error** again
7. View conversational debugging help

---

## Demo 2: Text Mode - Python Stack Trace

**Steps:**

1. Clear the previous conversation (click **Clear**)
2. Paste this Python error:

```
Traceback (most recent call last):
  File "api_handler.py", line 156, in process_request
    user_id = request.data['userId']
  File "dict.py", line 234, in __getitem__
    raise KeyError(key)
KeyError: 'userId'
```

3. Click **Analyze Error**

**Expected Output:**
- Error Type: KeyError
- Severity: Medium
- Root Cause: Missing 'userId' key in request data
- Suggested Fix: Use .get() with default value or try/except
- Code Example: `user_id = request.data.get('userId', None)`

---

## Demo 3: Vision Mode - Screenshot Upload

**Setup:** Prepare a screenshot of any error message (console, IDE, terminal)

**Steps:**

1. Switch to **📷 Vision** mode
2. Click **📁 Upload Screenshot**
3. Select your error screenshot
4. Wait for VLM to analyze the image
5. View the generated description
6. See follow-up debugging analysis

**Expected Output:**
- VLM describes what's visible in the image
- LLM provides debugging help based on the description

**Alternative:** Use **📷 Use Camera** to capture your screen in real-time

---

## Demo 4: Vision Mode - Camera Capture

**Steps:**

1. In Vision mode, click **📷 Use Camera**
2. Grant camera permission if prompted
3. Point camera at your screen showing an error
4. Click **📸 Capture & Analyze**
5. View analysis results

**Tip:** This works best with clear, high-contrast error messages

---

## Demo 5: Voice Mode - Verbal Debugging

**Note:** This requires all voice models to be loaded. Visit the **🎙️ Voice** tab first to initialize models.

**Steps:**

1. Switch to **🎤 Voice** mode
2. Click **🎤 Start Voice Debugging**
3. Wait for "Listening..." status
4. Speak clearly:

> "I'm getting a 500 internal server error when I try to POST data to my API endpoint. The request works in Postman but fails in my React app."

5. Wait for processing
6. Listen to the AI's spoken response
7. View transcription and response in the message list

**Alternative test phrases:**
- "My useState hook isn't updating the component"
- "I have a memory leak in my event listeners"
- "The async function never resolves"

---

## Demo 6: Export Report

**Steps:**

1. After creating several debugging conversations
2. Click **Export Report** button
3. Check your downloads folder
4. Open the `debug-report-[timestamp].txt` file
5. Review the formatted conversation history with all analyses

**Expected Format:**
```
[Date/Time] USER:
<error message>

[Date/Time] ASSISTANT:
<response>

--- ANALYSIS ---
Error Type: ...
Severity: ...
Root Cause: ...
Suggested Fix: ...
Code Example:
...
```

---

## Demo 7: Conversation History & Follow-ups

**Steps:**

1. Analyze an error in Text mode
2. Without clearing, type a follow-up:
   - "What are best practices to avoid this?"
   - "Can you explain the root cause in more detail?"
   - "Show me a more robust solution"
3. The AI maintains context from previous messages

**Demonstrates:** 
- Conversation memory
- Context-aware debugging
- Iterative problem solving

---

## Performance Metrics to Observe

### Text Mode
- **Model Load Time:** ~2-5 seconds (first time only)
- **Analysis Time:** ~5-15 seconds depending on error complexity
- **Tokens/Second:** Check message stats for performance

### Vision Mode
- **VLM Load Time:** ~5-10 seconds (first time)
- **Image Processing:** ~10-30 seconds
- **Follow-up Analysis:** ~5-15 seconds

### Voice Mode
- **Pipeline Init:** ~10-20 seconds (all models)
- **Transcription:** Real-time as you speak
- **Response Generation:** ~5-10 seconds
- **Speech Synthesis:** ~2-5 seconds

---

## Key Features to Highlight

### 🔒 Privacy-First
- **Zero server calls** - all processing is on-device
- **No API keys** required
- **Proprietary code stays private**
- Models cached locally in browser OPFS

### 🎯 Structured Analysis
- **Tool Calling** for consistent output format
- **Severity badges** for priority assessment
- **Code examples** for immediate fixes
- **Additional context** for learning

### 🔄 Multi-Modal
- **Text** for quick paste-and-analyze
- **Vision** for screenshot debugging
- **Voice** for hands-free assistance

### 💾 Session Management
- **History preservation** for follow-ups
- **Export functionality** for documentation
- **Clear option** to start fresh

---

## Common Test Errors to Use

### JavaScript/React
```
Warning: Each child in a list should have a unique "key" prop.
```

### TypeScript
```
Type 'string | undefined' is not assignable to type 'string'.
```

### Python
```
IndentationError: unindent does not match any outer indentation level
```

### Node.js
```
Error: ENOENT: no such file or directory, open '/path/to/file'
```

### SQL
```
ERROR: column "user_id" does not exist
LINE 1: SELECT user_id FROM users WHERE name = 'John'
```

---

## Browser Console Checks

Open DevTools and verify:

1. **No errors** during model loading
2. **Tool registration** successful
3. **WASM initialization** complete
4. **OPFS storage** usage for model caching
5. **Event listeners** properly attached/removed

---

## Mobile Testing

Test on mobile browsers (Chrome/Edge on Android):

1. Responsive layout adapts to small screens
2. Touch interactions work smoothly
3. Camera access works for Vision mode
4. Microphone works for Voice mode
5. Export downloads correctly

---

## Stress Testing

### Long Error Messages
Paste very long stack traces (50+ lines) and verify:
- UI doesn't freeze
- Scrolling works smoothly
- Analysis completes successfully

### Multiple Follow-ups
Ask 10+ follow-up questions in a row:
- Conversation history maintained
- No memory leaks
- Export includes all messages

### Mode Switching
Rapidly switch between modes:
- No crashes
- State preserved appropriately
- Models load/unload correctly

---

## Success Indicators

✅ All three modes functional on first try
✅ No console errors during normal operation
✅ Models download and cache successfully
✅ Structured output matches schema
✅ Export generates valid text file
✅ UI responsive and smooth
✅ Dark theme looks professional
✅ Error messages are helpful and clear

---

## Next Steps After Demo

1. **Share with users** for real-world testing
2. **Collect feedback** on accuracy and usefulness
3. **Add more error patterns** to training prompts
4. **Optimize model sizes** for faster loading
5. **Add more programming languages**
6. **Implement error database** for common issues

---

## Conclusion

The Debug Assistant showcases the potential of **on-device AI** for developer tools:

- **Private:** No code leaves your device
- **Fast:** Local inference with WebAssembly
- **Comprehensive:** Text, Vision, and Voice modes
- **Professional:** Structured analysis with severity levels
- **Practical:** Export reports for documentation

**Ready to debug!** 🐛✨
