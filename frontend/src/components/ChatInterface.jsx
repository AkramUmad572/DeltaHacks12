import React, { useState, useRef, useEffect } from 'react';

const API_BASE = '/api';

function ChatInterface({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your insider trading detection assistant. I can help you analyze Kalshi markets for suspicious patterns, explain trading behaviors, and answer questions about market data. What would you like to know?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    
    if (!inputValue.trim() || isLoading) {
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
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

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
      console.error('Chat error:', err);
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
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">🤖</span>
          <h2>AI Assistant</h2>
        </div>
        <button className="chat-close-btn" onClick={onClose}>✕</button>
      </div>

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

      {error && (
        <div className="chat-error">
          {error}
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about markets, patterns, or insider trading..."
          className="chat-input"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isLoading || !inputValue.trim()}
        >
          {isLoading ? '...' : '→'}
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;
