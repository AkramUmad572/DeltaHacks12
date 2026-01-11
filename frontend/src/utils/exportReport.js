export const exportReport = (analysis, market) => {
  // Generate readable text report
  let textReport = `
╔══════════════════════════════════════════════════════════════════╗
║           INSIDER TRADING DETECTION REPORT                       ║
╚══════════════════════════════════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARKET INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticker:     ${market?.ticker || 'N/A'}
Title:      ${market?.title || 'N/A'}
Status:     ${market?.status || 'N/A'}
Close Time: ${market?.close_time ? new Date(market.close_time).toLocaleString() : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RISK ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Suspicion Score: ${analysis.suspicionScore}/100
Risk Level:      ${analysis.riskLevel}
Confidence:      ${analysis.confidence}%

Summary: ${analysis.summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Trades:      ${analysis.metrics?.totalTrades || 0}
Avg Trade Size:    ${analysis.metrics?.avgTradeSize || 0}
Time Span:         ${analysis.metrics?.timeSpan || 'N/A'}
Signals Analyzed:  ${analysis.metrics?.signalsAnalyzed || 0}
Signals Triggered: ${analysis.metrics?.signalsTriggered || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRIGGERED SIGNALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  if (analysis.signals && analysis.signals.length > 0) {
    analysis.signals.forEach((s, i) => {
      const signalType = (s.type || s.id || 'Unknown').replace(/_/g, ' ');
      const severity = s.severity || 0;
      const description = s.description || s.result || 'No description';
      textReport += `
${i + 1}. ${signalType}
   Severity: ${'●'.repeat(severity)}${'○'.repeat(5 - severity)} (${severity}/5)
   ${description}
`;
    });
  } else {
    textReport += '\nNo suspicious signals detected.\n';
  }

  textReport += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALL SIGNALS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const categories = ['Timing', 'Order Flow', 'Price', 'Size', 'Statistical'];
  categories.forEach(cat => {
    const catSignals = analysis.allSignals?.filter(s => s.category === cat) || [];
    if (catSignals.length > 0) {
      textReport += `\n[${cat.toUpperCase()}]\n`;
      catSignals.forEach(s => {
        const status = s.triggered ? `⚠ TRIGGERED (${s.severity}/5)` : '✓ Normal';
        textReport += `  ${s.name}: ${status}\n`;
      });
    }
  });

  textReport += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
METHODOLOGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This analysis uses 14 quantitative signals based on market microstructure
research, including:
- VPIN (Volume-Synchronized Probability of Informed Trading)
- Shannon entropy for timing analysis  
- Benford's Law for trade size distribution
- Kyle's Lambda for price impact measurement
- Run-length analysis for directional pressure

Risk Thresholds:
  0-17:  LOW      - Normal trading patterns
  18-34: MEDIUM   - Minor irregularities
  35-54: HIGH     - Significant anomalies  
  55+:   CRITICAL - Strong evidence of insider trading

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     Delta Hacks 12 - Insider Trading Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Create download
  const blob = new Blob([textReport], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `insider-trading-report-${market?.ticker || 'analysis'}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
