import React, { useState, useEffect, useRef } from 'react';
import CandlestickTerrain from './CandlestickTerrain';
import './Landing.css';
import { checkBackendAvailable } from '../utils/backendCheck';

const API_BASE = '/api';

export default function Landing({ onEnter, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Autocomplete state (same as App.jsx)
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchWrapperRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);
  const autocompleteItemRefs = useRef([]);

  useEffect(() => {
    // Fade in content after mount
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Autocomplete: fetch suggestions as user types (same logic as App.jsx)
  useEffect(() => {
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      setSelectedIndex(-1);
      autocompleteItemRefs.current = [];
      return;
    }

    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        // Check if backend is available before making request
        const backendAvailable = await checkBackendAvailable();
        if (!backendAvailable) {
          setAutocompleteResults([]);
          setShowAutocomplete(false);
          return;
        }
        
        const params = new URLSearchParams();
        params.set('query', trimmedQuery);
        params.set('limit', '8'); // Limit to top 5-8 results (showing 8 for better coverage)

        const response = await fetch(`${API_BASE}/search?${params}`);
        
        // Check if response is ok and has content
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Check if response has content before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }
        
        const text = await response.text();
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response');
        }
        
        const data = JSON.parse(text);

        if (data.events) {
          // Extract unique suggestions with title and category
          const uniqueSuggestions = [];
          const seenTitles = new Set();

          for (const event of data.events) {
            if (!seenTitles.has(event.title)) {
              seenTitles.add(event.title);
              uniqueSuggestions.push({
                title: event.title,
                category: event.category || 'Uncategorized',
                event_ticker: event.event_ticker
              });
              if (uniqueSuggestions.length >= 8) break;
            }
          }

          setAutocompleteResults(uniqueSuggestions);
          setShowAutocomplete(uniqueSuggestions.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        // Silently handle errors - don't show autocomplete if API fails
        console.error('Autocomplete error:', err);
        setAutocompleteResults([]);
        setShowAutocomplete(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowAutocomplete(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && autocompleteItemRefs.current[selectedIndex]) {
      autocompleteItemRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleEnter(searchQuery.trim());
    }
  };

  const handleEnter = (query = '') => {
    setIsTransitioning(true);
    setShowAutocomplete(false);
    setSelectedIndex(-1);
    
    // Wait for transition animation
    setTimeout(() => {
      if (query) {
        onSearch(query);
      } else {
        onEnter();
      }
    }, 800);
  };

  const handleAutocompleteSelect = (suggestion) => {
    if (suggestion) {
      setSearchQuery(suggestion.title);
      handleEnter(suggestion.title);
    }
  };

  const handleKeyDown = (e) => {
    if (!showAutocomplete || autocompleteResults.length === 0) {
      // Allow normal form submission
      if (e.key === 'Enter') {
        handleSearch(e);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < autocompleteResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        // Only intercept if user navigated with arrow keys
        if (selectedIndex >= 0 && selectedIndex < autocompleteResults.length) {
          e.preventDefault();
          handleAutocompleteSelect(autocompleteResults[selectedIndex]);
        } else {
          // Close autocomplete but allow normal form submission
          setShowAutocomplete(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
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
            <div className="landing-input-wrapper" ref={searchWrapperRef}>
              <span className="landing-search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowAutocomplete(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (autocompleteResults.length > 0 && searchQuery.trim().length >= 2) {
                    setShowAutocomplete(true);
                  }
                }}
                placeholder="Search any market... bitcoin, trump, elections..."
                className="landing-search-input"
                autoFocus
              />
              <button type="submit" className="landing-search-btn">
                ANALYZE
              </button>
              
              {/* Autocomplete Dropdown */}
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div className="landing-autocomplete-dropdown">
                  {autocompleteResults.map((result, index) => (
                    <button
                      key={`${result.event_ticker || index}-${result.title}`}
                      ref={(el) => (autocompleteItemRefs.current[index] = el)}
                      type="button"
                      className={`landing-autocomplete-item ${selectedIndex === index ? 'selected' : ''}`}
                      onClick={() => handleAutocompleteSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <span className="landing-autocomplete-title">{result.title}</span>
                      <span className="landing-autocomplete-category">{result.category}</span>
                    </button>
                  ))}
                </div>
              )}
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
