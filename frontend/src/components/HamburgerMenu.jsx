import React from 'react';
import './HamburgerMenu.css';

const HamburgerMenu = ({ isOpen, onClose, activeCategory, onCategoryChange, onGoHome, watchlistCount = 0, onWatchlistClick, activeView, onViewChange }) => {
  if (!isOpen) return null;

  const browseItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'all', label: 'All Markets', icon: 'chart' },
    { id: 'trending', label: 'Trending', icon: 'flame' },
    { id: 'breaking', label: 'Breaking News', icon: 'news' },
    { id: 'new', label: 'New', icon: 'sparkles' },
    { id: 'watchlist', label: 'Watchlist', icon: 'watchlist', badge: watchlistCount }
  ];

  const categoryItems = [
    { id: 'Politics', label: 'Politics', icon: 'politics' },
    { id: 'Crypto', label: 'Crypto', icon: 'crypto' },
    { id: 'Sports', label: 'Sports', icon: 'sports' },
    { id: 'Economics', label: 'Economics', icon: 'economics' },
    { id: 'Climate and Weather', label: 'Climate and Weather', icon: 'climate' },
    { id: 'World', label: 'World', icon: 'world' },
    { id: 'Science and Technology', label: 'Science and Technology', icon: 'science' },
    { id: 'Companies', label: 'Companies', icon: 'companies' },
    { id: 'Entertainment', label: 'Entertainment', icon: 'entertainment' },
    { id: 'Health', label: 'Health', icon: 'health' },
    { id: 'Elections', label: 'Elections', icon: 'elections' }
  ];

  const handleItemClick = (itemId) => {
    console.log('Menu item clicked:', itemId);
    if (itemId === 'home') {
      onGoHome();
      onClose();
    } else if (itemId === 'watchlist') {
      onWatchlistClick();
    } else if (browseItems.find(item => item.id === itemId)) {
      // Handle browse items
      if (itemId === 'all') {
        onViewChange('all');
        onCategoryChange('All');
        onClose();
      } else if (itemId === 'trending') {
        console.log('Setting view to trending');
        onViewChange('trending');
        // Don't call onCategoryChange here - let the view handle it
        onClose();
      } else if (itemId === 'breaking') {
        console.log('Setting view to breaking');
        onViewChange('breaking');
        // Don't call onCategoryChange here - let the view handle it
        onClose();
      } else if (itemId === 'new') {
        console.log('Setting view to new');
        onViewChange('new');
        // Don't call onCategoryChange here - let the view handle it
        onClose();
      }
    } else {
      onCategoryChange(itemId);
      onClose();
    }
  };

  const renderIcon = (iconType) => {
    switch (iconType) {
      case 'home':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" opacity="0.2"/>
            <path d="M9 22V12h6v10" fill="currentColor" opacity="0.6"/>
            <path d="M3 9l9-7 9 7" stroke="currentColor"/>
          </svg>
        );
      case 'chart':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="none"/>
            <rect x="5" y="12" width="3" height="6" fill="#00ff88"/>
            <rect x="10" y="8" width="3" height="10" fill="#ff4444"/>
            <rect x="15" y="6" width="3" height="12" fill="#aa44ff"/>
          </svg>
        );
      case 'flame':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="#ff8800"/>
          </svg>
        );
      case 'news':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="1" fill="white" opacity="0.1"/>
            <path d="M6 8h12M6 12h8M6 16h6" stroke="currentColor" strokeWidth="2"/>
            <circle cx="16" cy="8" r="1" fill="currentColor" opacity="0.6"/>
          </svg>
        );
      case 'sparkles':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#ffd700" fill="#ffd700" opacity="0.8"/>
            <circle cx="12" cy="12" r="2" fill="#ffd700" opacity="0.6"/>
            <circle cx="8" cy="6" r="1" fill="#ffd700"/>
            <circle cx="16" cy="6" r="1" fill="#ffd700"/>
            <circle cx="8" cy="18" r="1" fill="#ffd700"/>
            <circle cx="16" cy="18" r="1" fill="#ffd700"/>
          </svg>
        );
      case 'politics':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="none"/>
            <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" opacity="0.2"/>
            <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="2" fill="#00ff88"/>
          </svg>
        );
      case 'crypto':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="none"/>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#f7931a" fill="none" opacity="0.8"/>
            <path d="M12 6v12M6 12h12" stroke="#f7931a" strokeWidth="2.5"/>
            <circle cx="12" cy="12" r="3" fill="#f7931a" opacity="0.3"/>
          </svg>
        );
      case 'sports':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="#4a90e2" opacity="0.2"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="white" opacity="0.4"/>
            <path d="M2 12h20" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2v20" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="4" fill="white" opacity="0.6"/>
            <path d="M8 8l4 4 4-4" stroke="#4a90e2" strokeWidth="2" fill="none"/>
          </svg>
        );
      case 'economics':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="1" fill="white" opacity="0.1"/>
            <polyline points="3 18 7 14 11 16 15 10 21 12" stroke="currentColor" strokeWidth="2" fill="none"/>
            <polyline points="7 18 7 14" stroke="currentColor" strokeWidth="2"/>
            <polyline points="15 10 15 12" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      case 'climate':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" fill="#4a90e2" opacity="0.3"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="#00ff88" opacity="0.4"/>
            <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5"/>
            <ellipse cx="12" cy="12" rx="8" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        );
      case 'world':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            <path d="M12 2c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6zM12 10c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6z" fill="currentColor" opacity="0.2"/>
          </svg>
        );
      case 'science':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="#9b59b6" opacity="0.15"/>
            <circle cx="12" cy="12" r="3" fill="#9b59b6" opacity="0.4"/>
            <circle cx="12" cy="7" r="2" fill="#9b59b6" opacity="0.6"/>
            <circle cx="12" cy="17" r="2" fill="#9b59b6" opacity="0.6"/>
            <path d="M12 5v14M5 12h14" stroke="#9b59b6" strokeWidth="1.5"/>
            <path d="M8 8l8 8M16 8l-8 8" stroke="#9b59b6" strokeWidth="1" opacity="0.5"/>
          </svg>
        );
      case 'companies':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" fill="#3498db" opacity="0.15"/>
            <path d="M3 10h18M10 4v18" stroke="#3498db" strokeWidth="2"/>
            <rect x="12" y="8" width="6" height="4" rx="1" fill="#3498db" opacity="0.4"/>
            <rect x="12" y="14" width="6" height="4" rx="1" fill="#3498db" opacity="0.4"/>
            <rect x="4" y="8" width="4" height="4" rx="1" fill="#3498db" opacity="0.3"/>
            <rect x="4" y="14" width="4" height="4" rx="1" fill="#3498db" opacity="0.3"/>
          </svg>
        );
      case 'entertainment':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="#e74c3c" opacity="0.15"/>
            <path d="M8 12h8M12 8v8" stroke="#e74c3c" strokeWidth="2.5"/>
            <circle cx="12" cy="12" r="3" fill="#e74c3c" opacity="0.3"/>
            <path d="M10 10l4 4M14 10l-4 4" stroke="#e74c3c" strokeWidth="1.5" fill="none"/>
            <circle cx="8" cy="8" r="1" fill="#e74c3c" opacity="0.6"/>
            <circle cx="16" cy="8" r="1" fill="#e74c3c" opacity="0.6"/>
          </svg>
        );
      case 'health':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="#ff4444" opacity="0.15"/>
            <path d="M12 2v20M2 12h20" stroke="#ff4444" strokeWidth="2"/>
            <circle cx="12" cy="12" r="4" fill="#ff4444" opacity="0.3"/>
            <path d="M9 12h6M12 9v6" stroke="#ff4444" strokeWidth="2.5" fill="none"/>
            <circle cx="12" cy="12" r="1.5" fill="#ff4444"/>
          </svg>
        );
      case 'elections':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity="0.1"/>
            <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor"/>
            <circle cx="12" cy="12" r="2" fill="#00ff88"/>
            <path d="M10 10l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
        );
      case 'watchlist':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#ffd700" opacity="0.4" stroke="#ffd700"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="hamburger-menu-overlay" onClick={onClose}></div>
      <div className="hamburger-menu">
        <div className="hamburger-menu-header">
          <div className="hamburger-logo" onClick={onGoHome}>
            <div className="hamburger-logo-container">
              <svg className="hamburger-logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#hamburger-shield-gradient)" stroke="currentColor"/>
                <defs>
                  <linearGradient id="hamburger-shield-gradient" x1="4" y1="2" x2="20" y2="22">
                    <stop offset="0%" stopColor="rgba(0,255,136,0.3)"/>
                    <stop offset="100%" stopColor="rgba(0,200,255,0.1)"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="hamburger-logo-glow"></div>
            </div>
            <h2 className="hamburger-title">TRADEGUARD</h2>
          </div>
          <button className="hamburger-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="hamburger-menu-content">
          <div className="hamburger-section">
            <h3 className="hamburger-section-title">BROWSE</h3>
            <ul className="hamburger-menu-list">
              {browseItems.map((item) => {
                const isActive = (item.id === 'all' && activeCategory === 'All' && activeView === 'all') ||
                                (item.id === 'trending' && activeView === 'trending') ||
                                (item.id === 'breaking' && activeView === 'breaking') ||
                                (item.id === 'new' && activeView === 'new');
                return (
                  <li key={item.id}>
                    <button
                      className={`hamburger-menu-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleItemClick(item.id)}
                    >
                      <span className="hamburger-menu-icon">{renderIcon(item.icon)}</span>
                      <span className="hamburger-menu-label">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="hamburger-menu-badge">{item.badge}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="hamburger-section">
            <h3 className="hamburger-section-title">CATEGORIES</h3>
            <ul className="hamburger-menu-list">
              {categoryItems.map((item) => {
                const isActive = activeCategory === item.id;
                return (
                  <li key={item.id}>
                    <button
                      className={`hamburger-menu-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleItemClick(item.id)}
                    >
                      <span className="hamburger-menu-icon">{renderIcon(item.icon)}</span>
                      <span className="hamburger-menu-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default HamburgerMenu;
