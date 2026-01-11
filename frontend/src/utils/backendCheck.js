// Utility to check if backend is available
let backendAvailable = true;
let lastCheck = 0;
const CHECK_INTERVAL = 5000; // Check every 5 seconds

export async function checkBackendAvailable() {
  const now = Date.now();
  
  // Only check if enough time has passed since last check
  if (now - lastCheck < CHECK_INTERVAL) {
    return backendAvailable;
  }
  
  lastCheck = now;
  
  try {
    const response = await fetch('/api/suggestions', {
      method: 'HEAD', // Just check if server responds
      signal: AbortSignal.timeout(1000), // 1 second timeout
    });
    backendAvailable = response.ok;
  } catch (err) {
    backendAvailable = false;
  }
  
  return backendAvailable;
}

export function isBackendAvailable() {
  return backendAvailable;
}
