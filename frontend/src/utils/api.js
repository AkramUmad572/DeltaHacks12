import { API_BASE } from '../constants';

export const loadSuggestions = async () => {
  try {
    const response = await fetch(`${API_BASE}/suggestions`);
    const data = await response.json();
    if (response.ok) {
      return data.suggestions || [];
    }
    return [];
  } catch (err) {
    console.error('Failed to load suggestions:', err);
    return [];
  }
};

export const loadEvents = async (category = 'All') => {
  try {
    const url = category === 'All' 
      ? `${API_BASE}/search?limit=100`
      : `${API_BASE}/search?category=${encodeURIComponent(category)}&limit=100`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      return {
        events: data.events || [],
        stats: { total: data.total, returned: data.returned }
      };
    }
    throw new Error(data.error || 'Failed to load events');
  } catch (err) {
    throw err;
  }
};

export const searchEvents = async (query, category = 'All') => {
  try {
    const params = new URLSearchParams();
    if (query?.trim()) params.set('query', query.trim());
    if (category !== 'All') params.set('category', category);
    params.set('limit', '100');

    const response = await fetch(`${API_BASE}/search?${params}`);
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Search failed');
    
    return {
      events: data.events || [],
      stats: { total: data.total, returned: data.returned }
    };
  } catch (err) {
    throw err;
  }
};

export const fetchMarketDetails = async (ticker) => {
  try {
    const response = await fetch(`${API_BASE}/markets/${ticker}/full`);
    const data = await response.json();
    
    if (response.ok) {
      return data;
    }
    throw new Error(data.error || 'Failed to fetch market details');
  } catch (err) {
    console.error('Error fetching market details:', err);
    throw err;
  }
};

export const analyzeForInsiderTrading = async (ticker) => {
  try {
    if (!ticker) {
      throw new Error('Ticker is required');
    }
    
    const response = await fetch(`${API_BASE}/markets/${ticker}/analyze`);
    
    if (!response.ok) {
      let errorMessage = `Analysis failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If response is not JSON, use the status message
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (!data.analysis) {
      throw new Error('Invalid response: analysis data missing');
    }
    
    return data.analysis;
  } catch (err) {
    console.error('Error analyzing market:', err);
    throw err;
  }
};
