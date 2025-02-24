// API configuration
export const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Get API key from localStorage or return null
export function getApiKey() {
  return localStorage.getItem('youtubeApiKey');
}

// Set API key in localStorage
export function setApiKey(key) {
  localStorage.setItem('youtubeApiKey', key);
}

// Helper functions for API formatting
export function formatCount(count) {
  if (!count) return '0';
  if (count >= 1000000) {
    return Math.floor(count / 1000000) + 'M';
  } else if (count >= 1000) {
    return Math.floor(count / 1000) + 'K';
  }
  return count;
}