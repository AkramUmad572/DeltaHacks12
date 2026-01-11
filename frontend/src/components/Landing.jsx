import React, { useState, useEffect } from 'react';
import CandlestickTerrain from './CandlestickTerrain';
import './Landing.css';

export default function Landing({ onEnter, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Fade in content after mount
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleEnter(searchQuery.trim());
    }
  };

  const handleEnter = (query = '') => {
    setIsTransitioning(true);
    
    // Wait for transition animation
    setTimeout(() => {
      if (query) {
        onSearch(query);
      } else {
        onEnter();
      }
    }, 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const suggestions = [
    'Bitcoin',
    'Trump',
    'Elections',
    'Fed Rate',
    'AI',
    'Crypto'
  ];

  return (
    <div className={`landing-container ${isTransitioning ? 'transitioning' : ''}`}>
      {/* 3D Background */}
      <CandlestickTerrain />
      
      {/* Overlay gradient */}
      <div className="landing-overlay" />
      
      {/* Content */}
      <div className={`landing-content ${showContent ? 'visible' : ''}`}>
        {/* Logo/Title */}
        <div className="landing-header">
          <div className="landing-logo">
            <span className="logo-icon-large">◈</span>
            <h1 className="landing-title">INSIDER DETECTOR</h1>
          </div>
          <p className="landing-subtitle">
            Uncover suspicious trading patterns in prediction markets using 
            <span className="highlight"> quantitative analysis</span>
          </p>
        </div>

        {/* Search Box */}
        <div className="landing-search-container">
          <form onSubmit={handleSearch} className="landing-search-form">
            <div className="landing-input-wrapper">
              <span className="landing-search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search any market... bitcoin, trump, elections..."
                className="landing-search-input"
                autoFocus
              />
              <button type="submit" className="landing-search-btn">
                ANALYZE
              </button>
            </div>
          </form>

          {/* Quick suggestions */}
          <div className="landing-suggestions">
            <span className="suggestions-label">Popular:</span>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-pill"
                onClick={() => handleEnter(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <div className="feature-text">
              <h3>14 Detection Signals</h3>
              <p>VPIN, Benford's Law, Kyle's Lambda & more</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <div className="feature-text">
              <h3>Real-Time Analysis</h3>
              <p>Live Kalshi market data</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <div className="feature-text">
              <h3>Risk Scoring</h3>
              <p>Quantitative suspicion rating</p>
            </div>
          </div>
        </div>

        {/* Enter without search */}
        <button className="enter-btn" onClick={() => handleEnter()}>
          Browse All Markets →
        </button>

        {/* Footer */}
        <div className="landing-footer">
          <span>Delta Hacks 12</span>
          <span className="separator">•</span>
          <span>Powered by Kalshi API</span>
        </div>
      </div>

      {/* Transition overlay */}
      <div className={`transition-overlay ${isTransitioning ? 'active' : ''}`}>
        <div className="transition-scanner">
          <div className="scanner-line" />
        </div>
        <span className="transition-text">Initializing Analysis...</span>
      </div>
    </div>
  );
}
