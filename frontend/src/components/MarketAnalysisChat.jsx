import React, { useState, useRef, useEffect } from 'react';

const API_BASE = '/api';

function MarketAnalysisChat({ isOpen, onClose, marketData, analysisData, tradesData, orderbookData, embedded = false, preventInitialScroll = false }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize messages when market data is available
  useEffect(() => {
    if (marketData && isOpen && messages.length === 0) {
      let initialMessage;
      
      if (analysisData) {
        initialMessage = `I've analyzed this market.

Your suspicion score is **${analysisData.suspicionScore}/100** (${analysisData.riskLevel} risk) with ${analysisData.confidence}% confidence.

${analysisData.summary || ''}

Ask me why this market might be suspicious, what any terms mean, or dive deeper into specific signals!`;
      } else {
        initialMessage = `I am here to help you understand this market.`;
      }

      setMessages([
        {
          role: 'assistant',
          content: initialMessage
        }
      ]);
    }
  }, [marketData, isOpen, analysisData, messages.length]);

  // Auto-scroll to bottom when new messages arrive (but not on initial load if preventInitialScroll is true)
  useEffect(() => {
    // Don't scroll on initial load if preventInitialScroll is set
    if (preventInitialScroll && messages.length === 1) {
      return;
    }
    // Only auto-scroll if there are existing messages (user has already interacted)
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, preventInitialScroll]);

  // Focus input when chat opens (but don't scroll if preventInitialScroll is true)
  useEffect(() => {
    if (isOpen && inputRef.current && !preventInitialScroll) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen, preventInitialScroll]);

  const handleSend = async (e) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isLoading) {
      return;
    }

    if (!marketData) {
      setError('Market data is required. Please select a market first.');
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build analysis context from props
      const analysisContext = {
        market: marketData,
        analysis: analysisData || null, // Allow null if no analysis yet
        trades: tradesData || [],
        orderbook: orderbookData || { yes: [], no: [] }
      };

      const response = await fetch(`${API_BASE}/chat/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          analysisContext: analysisContext,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response. Please restart the backend server. Status: ${response.status}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.response || 'No response received',
        },
      ]);
    } catch (err) {
      console.error('Analysis chat error:', err);
      setError(err.message || 'Failed to send message');
      
      // Add error message
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    // Convert **bold** to <strong>
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    // Convert line breaks
    formatted = formatted.split('\n').map((line, idx) => {
      // Check for headers
      if (line.startsWith('### ')) {
        return `<h3>${line.substring(4)}</h3>`;
      }
      if (line.startsWith('## ')) {
        return `<h2>${line.substring(3)}</h2>`;
      }
      if (line.startsWith('# ')) {
        return `<h1>${line.substring(2)}</h1>`;
      }
      // Check for lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return `<li>${line.trim().substring(2)}</li>`;
      }
      return line ? `<p>${line}</p>` : '<br/>';
    }).join('');

    return { __html: formatted };
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`market-analysis-chat ${embedded ? 'embedded' : ''}`}>
      {/* Header only shown when there are messages */}
      {messages.length > 0 && (
        <div className="chat-header">
          <div className="chat-title">
            <span className="chat-icon">🔍</span>
            <h2>Analysis Assistant</h2>
            {marketData && (
              <span className="chat-market-ticker">{marketData.ticker}</span>
            )}
          </div>
          <button className="chat-close-btn" onClick={onClose}>✕</button>
        </div>
      )}

      {/* Messages area - only show if there are messages */}
      {messages.length > 0 && (
        <div className="chat-messages">
        
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={formatMessage(message.content)} />
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="chat-message assistant-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
          <div ref={messagesEndRef} />
        </div>
      )}

      {error && (
        <div className="chat-error">
          {error}
        </div>
      )}

      {/* Input form always visible when embedded */}
      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask questions about this market through AI"
          className="chat-input"
          disabled={isLoading || !marketData}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isLoading || !inputValue.trim() || !marketData}
        >
          {isLoading ? '...' : '→'}
        </button>
      </form>
    </div>
  );
}

export default MarketAnalysisChat;
