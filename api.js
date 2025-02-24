import { API_BASE_URL, getApiKey } from './config.js';

export async function fetchVideoDetails(videoId) {
  const API_KEY = getApiKey();
  if (!API_KEY || !videoId) return null;
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

export async function searchYouTubeVideos(query) {
  const API_KEY = getApiKey();
  if (!API_KEY) return [];
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=4&key=${API_KEY}`
    );
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error searching videos:', error);
    return [];
  }
}

export async function getRelatedVideos(videoId) {
  const API_KEY = getApiKey();
  if (!API_KEY) return [];
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?part=snippet&relatedToVideoId=${videoId}&type=video&maxResults=4&key=${API_KEY}`
    );
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Error fetching related videos:', error);
    return [];
  }
}