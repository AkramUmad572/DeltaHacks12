import React, { useState, useEffect } from 'react';
import './HowItWorks.css';

const HowItWorks = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [animatedValue, setAnimatedValue] = useState(0);
  const totalSteps = 3;

  useEffect(() => {
    if (isOpen && currentStep === 2) {
      setAnimatedValue(0);
      const timer = setTimeout(() => setAnimatedValue(73), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  return (
    <>
      <div className="how-it-works-overlay" onClick={handleClose}></div>
      <div className="how-it-works-modal">
        <button className="how-it-works-close" onClick={handleClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="how-it-works-content">
          {/* Step 1: Browse Markets */}
          {currentStep === 1 && (
            <div className="how-it-works-step">
              <div className="step-visual-container">
                {/* Mini Market Card Preview */}
                <div className="preview-card">
                  <div className="preview-header">
                    <span className="preview-category">POLITICS</span>
                    <span className="preview-volume">📊 24.5K</span>
                  </div>
                  <div className="preview-title">Will the bill pass by March?</div>
                  <div className="preview-chart">
                    <svg viewBox="0 0 120 40" className="mini-chart">
                      <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#00ff88" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path 
                        d="M0,30 Q20,28 30,25 T50,20 T70,22 T90,15 T110,18 L120,16 L120,40 L0,40 Z" 
                        fill="url(#chartGradient)"
                      />
                      <path 
                        d="M0,30 Q20,28 30,25 T50,20 T70,22 T90,15 T110,18 L120,16" 
                        fill="none" 
                        stroke="#00ff88" 
                        strokeWidth="2"
                        className="chart-line"
                      />
                    </svg>
                  </div>
                  <div className="preview-odds">
                    <div className="odds-bar">
                      <div className="odds-fill" style={{width: '65%'}}></div>
                    </div>
                    <div className="odds-labels">
                      <span className="yes-label">Yes 65%</span>
                      <span className="no-label">No 35%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="step-number">1</div>
              <h2 className="step-title">Browse Prediction Markets</h2>
              <p className="step-description">
                Explore real-time prediction markets from Kalshi. Use categories like <strong>Politics</strong>, <strong>Sports</strong>, <strong>Crypto</strong>, or filter by <strong>Trending</strong> (highest volume), <strong>Breaking News</strong> (recent events), and <strong>New</strong> markets.
              </p>
              <p className="step-hint">
                Each market shows live odds, trading volume, and price charts.
              </p>
            </div>
          )}

          {/* Step 2: Analyze for Insider Trading */}
          {currentStep === 2 && (
            <div className="how-it-works-step">
              <div className="step-visual-container compact">
                {/* Risk Meter Visualization */}
                <div className="risk-meter-container">
                  <div className="risk-meter">
                    <svg viewBox="0 0 120 70" className="meter-svg">
                      <defs>
                        <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00ff88"/>
                          <stop offset="50%" stopColor="#ffaa00"/>
                          <stop offset="100%" stopColor="#ff4444"/>
                        </linearGradient>
                      </defs>
                      {/* Background arc */}
                      <path 
                        d="M10,60 A50,50 0 0,1 110,60" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.1)" 
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Colored arc */}
                      <path 
                        d="M10,60 A50,50 0 0,1 110,60" 
                        fill="none" 
                        stroke="url(#meterGradient)" 
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Needle - points up by default, rotates from -90 (left) to +90 (right) */}
                      <g style={{transform: `rotate(${-90 + (animatedValue * 1.8)}deg)`, transformOrigin: '60px 60px', transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'}}>
                        <line x1="60" y1="60" x2="60" y2="22" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                        <circle cx="60" cy="60" r="6" fill="#fff"/>
                      </g>
                    </svg>
                    <div className="meter-value">{animatedValue}</div>
                    <div className="meter-label">Suspicion Score</div>
                  </div>
                  {/* Signal bars */}
                  <div className="signal-bars">
                    <div className="signal-bar" style={{'--delay': '0.1s'}}>
                      <span className="bar-label">Volume</span>
                      <div className="bar-track"><div className="bar-fill" style={{width: '85%'}}></div></div>
                    </div>
                    <div className="signal-bar" style={{'--delay': '0.2s'}}>
                      <span className="bar-label">Timing</span>
                      <div className="bar-track"><div className="bar-fill warning" style={{width: '72%'}}></div></div>
                    </div>
                    <div className="signal-bar" style={{'--delay': '0.3s'}}>
                      <span className="bar-label">Price</span>
                      <div className="bar-track"><div className="bar-fill low" style={{width: '35%'}}></div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="step-number">2</div>
              <h2 className="step-title">Detect Insider Trading</h2>
              <p className="step-description">
                Click any market card, then open the <strong>"Insider Detection"</strong> tab. Our AI analyzes <strong>14 quantitative signals</strong> used by professional trading firms to detect suspicious activity.
              </p>
              <p className="step-hint">
                Signals include volume spikes, timing patterns, price anomalies, order flow toxicity, and statistical irregularities.
              </p>
            </div>
          )}

          {/* Step 3: Trade with Confidence */}
          {currentStep === 3 && (
            <div className="how-it-works-step">
              <div className="step-visual-container">
                {/* Dashboard Preview */}
                <div className="dashboard-preview">
                  <div className="dash-header">
                    <div className="dash-title">Market Analysis</div>
                    <div className="dash-badge safe">✓ Low Risk</div>
                  </div>
                  <div className="dash-content">
                    <div className="dash-stat">
                      <div className="stat-icon">📈</div>
                      <div className="stat-info">
                        <div className="stat-value">1,247</div>
                        <div className="stat-label">Trades Analyzed</div>
                      </div>
                    </div>
                    <div className="dash-stat">
                      <div className="stat-icon">🔍</div>
                      <div className="stat-info">
                        <div className="stat-value">14</div>
                        <div className="stat-label">Signals Checked</div>
                      </div>
                    </div>
                  </div>
                  <div className="dash-signals">
                    <div className="signal-pill ok">✓ Normal Volume</div>
                    <div className="signal-pill ok">✓ No Clustering</div>
                    <div className="signal-pill warning">⚠ Price Spike</div>
                  </div>
                </div>
              </div>
              <div className="step-number">3</div>
              <h2 className="step-title">Trade with Confidence</h2>
              <p className="step-description">
                Review detailed signal breakdowns to understand <strong>why</strong> a market is flagged. Each signal includes an explanation, threshold values, and academic citations.
              </p>
              <p className="step-hint">
                Add suspicious markets to your <strong>Watchlist</strong> to monitor them over time. Stay informed before placing your bets.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="how-it-works-nav">
            {currentStep > 1 ? (
              <button className="nav-btn prev" onClick={handlePrev}>Back</button>
            ) : (
              <div className="nav-spacer"></div>
            )}
            <div className="step-indicators">
              {[...Array(totalSteps)].map((_, i) => (
                <div
                  key={i}
                  className={`step-indicator ${currentStep === i + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentStep(i + 1)}
                />
              ))}
            </div>
            <button className="nav-btn next" onClick={handleNext}>
              {currentStep === totalSteps ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default HowItWorks;
