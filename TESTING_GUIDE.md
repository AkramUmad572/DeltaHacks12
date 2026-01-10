# AI Assistant Testing Guide

## Quick Start Testing

### 1. General Questions (No specific market data needed)
- "What patterns indicate insider trading?"
- "How do I detect suspicious trading activity?"
- "Explain volume spikes in prediction markets"

### 2. Market Analysis Questions
- "What markets are available on Kalshi?"
- "Show me popular markets"
- "What are the most active markets?"

### 3. Pattern Detection Questions
- "What should I look for to detect insider trading?"
- "How can I identify unusual trading patterns?"
- "What are red flags in market behavior?"

### 4. Specific Market Questions (if you know a ticker)
- "Analyze market [TICKER] for suspicious patterns"
- "What's happening with market [TICKER]?"
- "Explain the trading activity in [TICKER]"

## Expected Behavior

### ✅ Success Indicators:
- Chat interface opens when you click the button
- Messages appear in chat bubbles (user messages on right, AI on left)
- Typing indicator shows while AI is thinking
- AI responses are formatted with markdown (headers, lists, etc.)
- Responses are relevant to your questions

### ⚠️ Common Issues:

**"AI service is not available"**
- Check that `GEMINI_API_KEY` is set in `backend/.env`
- Verify the API key is valid
- Restart the backend server after adding the key

**"Rate limit exceeded"**
- You've made too many requests too quickly
- Wait a minute and try again
- Consider using a different API key or upgrading your quota

**No response / Timeout**
- Check backend console for errors
- Verify backend is running on port 3001
- Check network tab in browser dev tools

**Chat doesn't open**
- Check browser console for errors
- Verify frontend is running
- Try refreshing the page

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Chat button appears in header
- [ ] Chat interface opens when button is clicked
- [ ] Can type and send messages
- [ ] AI responds to general questions
- [ ] AI responds to market-related questions
- [ ] Markdown formatting works in responses
- [ ] Error messages display properly if API fails
- [ ] Chat can be closed and reopened

## Debugging Tips

1. **Check Backend Console**: Look for initialization messages and any errors
2. **Check Browser Console**: Open DevTools (F12) and look for JavaScript errors
3. **Check Network Tab**: Verify API calls to `/api/chat` are being made
4. **Test API Directly**: Use curl or Postman to test the endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello"}'
   ```

## Next Steps After Testing

Once basic functionality works:
1. Test with real market tickers from Kalshi
2. Ask complex questions about patterns
3. Test error handling (invalid API key, network issues)
4. Verify context gathering works (check backend logs for data fetching)
