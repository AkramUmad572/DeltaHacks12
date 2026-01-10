# 1. Install backend
cd backend
npm install

# 2. Install frontend  
cd ../frontend
npm install

# 3. Set up environment variables
# Create a .env file in the backend directory with:
# GEMINI_API_KEY=your_gemini_api_key_here
# (Optional) KALSHI_API_KEY_ID=your_kalshi_key
# (Optional) KALSHI_PRIVATE_KEY_PATH=path_to_private_key

# 4. Run backend (Terminal 1)
cd ../backend
npm start

# 5. Run frontend (Terminal 2)
cd ../frontend
npm run dev

# 6. Open http://localhost:3000
# Click the "🤖 AI Assistant" button in the header to open the chat interface