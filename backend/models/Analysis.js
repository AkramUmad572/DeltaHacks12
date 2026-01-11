/**
 * Analysis Model - Stores insider trading analysis results
 */
export class AnalysisModel {
  constructor(db) {
    this.collection = db.collection('analyses');
  }

  /**
   * Save analysis result
   */
  async saveAnalysis(ticker, analysis, marketData = null) {
    const analysisDoc = {
      ticker,
      market: marketData || null,
      suspicionScore: analysis.suspicionScore,
      riskLevel: analysis.riskLevel,
      signals: analysis.signals || [],
      allSignals: analysis.allSignals || [],
      summary: analysis.summary,
      confidence: analysis.confidence,
      metrics: analysis.metrics || {},
      methodology: analysis.methodology || 'Quantitative analysis using market microstructure research methods',
      timestamp: new Date(),
      tradesAnalyzed: analysis.tradesAnalyzed || 0
    };

    await this.collection.insertOne(analysisDoc);
    return analysisDoc;
  }

  /**
   * Get latest analysis for a market
   */
  async getLatestAnalysis(ticker) {
    return await this.collection
      .findOne(
        { ticker: ticker },
        { sort: { timestamp: -1 } }
      );
  }

  /**
   * Get analysis history for a market
   */
  async getAnalysisHistory(ticker, limit = 10) {
    return await this.collection
      .find({ ticker: ticker })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get all high-risk analyses
   */
  async getHighRiskAnalyses(riskLevel = 'HIGH', limit = 50) {
    return await this.collection
      .find({ riskLevel: { $in: ['HIGH', 'CRITICAL'] } })
      .sort({ suspicionScore: -1, timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get analyses by score range
   */
  async getAnalysesByScore(minScore, maxScore = 100, limit = 50) {
    return await this.collection
      .find({
        suspicionScore: { $gte: minScore, $lte: maxScore }
      })
      .sort({ suspicionScore: -1, timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get statistics about analyses
   */
  async getAnalysisStats() {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          avgScore: { $avg: '$suspicionScore' },
          maxScore: { $max: '$suspicionScore' },
          minScore: { $min: '$suspicionScore' },
          highRiskCount: {
            $sum: { $cond: [{ $in: ['$riskLevel', ['HIGH', 'CRITICAL']] }, 1, 0] }
          },
          criticalCount: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] }
          }
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || {
      totalAnalyses: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      highRiskCount: 0,
      criticalCount: 0
    };
  }
}
