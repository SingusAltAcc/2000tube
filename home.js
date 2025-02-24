import { getApiKey, setApiKey } from './config.js';
import { API_BASE_URL } from './config.js';

let currentPage = 1;
const VIDEOS_PER_PAGE = 8;
let searchPageToken = '';
let isSearchMode = false;

async function fetchTrendingVideos(pageToken = '') {
  const API_KEY = getApiKey();
  if (!API_KEY) throw new Error('No API key provided');
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/videos?part=snippet,statistics&chart=mostPopular&maxResults=${VIDEOS_PER_PAGE}&regionCode=US&key=${API_KEY}${pageToken ? '&pageToken=' + pageToken : ''}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items) {
      throw new Error('No items returned from API');
    }
    
    return {
      videos: data.items,
      nextPageToken: data.nextPageToken,
      prevPageToken: data.prevPageToken
    };
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    throw error;
  }
}

function formatCount(count) {
  if (count < 1000) return count;
  if (count < 1000000) return (count / 1000).toFixed(1) + 'K';
  return (count / 1000000).toFixed(1) + 'M';
}

function showApiKeyDialog() {
  const dialog = document.createElement('div');
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = '#d4d0c8';
  dialog.style.border = '2px solid #808080';
  dialog.style.padding = '20px';
  dialog.style.boxShadow = '2px 2px 4px rgba(0, 0, 0, 0.2)';
  dialog.style.zIndex = '1000';

  dialog.innerHTML = `
    <h2 style="margin-top: 0;">Welcome to 2000Tube!</h2>
    <p>Please enter your YouTube Data API v3 key to continue:</p>
    <input type="text" id="apiKeyInput" style="width: 100%; padding: 5px; margin: 10px 0;">
    <button onclick="submitApiKey()">Submit</button>
    <p style="font-size: 0.8em; margin-top: 10px;">
      Need an API key? Visit the 
      <a href="https://console.developers.google.com/" target="_blank">Google Cloud Console</a>
      to get one.
    </p>
  `;

  document.body.appendChild(dialog);

  // Add the submitApiKey function to window scope
  window.submitApiKey = function() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (apiKey) {
      setApiKey(apiKey);
      dialog.remove();
      initHomepage();
    }
  };
}

async function initHomepage() {
  const trendingContainer = document.getElementById('trendingVideos');
  const paginationContainer = document.getElementById('pagination');
  
  if (!getApiKey()) {
    showApiKeyDialog();
    return;
  }
  
  try {
    // Show loading state
    trendingContainer.innerHTML = '<div class="loading">Loading trending videos...</div>';
    
    const { videos, nextPageToken, prevPageToken } = await fetchTrendingVideos();
    
    // Clear loading state
    trendingContainer.innerHTML = '';
    
    // Render videos
    videos.forEach(video => {
      const videoCard = document.createElement('div');
      videoCard.className = 'video-thumbnail';
      videoCard.innerHTML = `
        <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" style="width: 100%">
        <p>${video.snippet.title}</p>
        <div class="video-stats">
          ${formatCount(video.statistics.viewCount)} views • 
          ${new Date(video.snippet.publishedAt).toLocaleDateString()}
        </div>
      `;
      videoCard.onclick = () => {
        window.location.href = `player.html?v=${video.id}`;
      };
      trendingContainer.appendChild(videoCard);
    });

    // Update pagination
    updatePagination(prevPageToken, nextPageToken);

  } catch (error) {
    console.error('Error in initHomepage:', error);
    trendingContainer.innerHTML = `
      <div class="error-message">
        <p>Unable to load trending videos at this time.</p>
        <p>Please check your API key configuration or try again later.</p>
        <p>Error details: ${error.message}</p>
      </div>
    `;
  }
}

function updatePagination(prevPageToken, nextPageToken) {
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = `
    <button 
      ${!prevPageToken ? 'disabled' : ''} 
      onclick="changePage('${prevPageToken}')"
      class="pagination-button"
    >◀ Previous</button>
    <button 
      class="pagination-button" 
      disabled
    >Page ${currentPage}</button>
    <button 
      ${!nextPageToken ? 'disabled' : ''} 
      onclick="changePage('${nextPageToken}')"
      class="pagination-button"
    >Next ▶</button>
  `;
}

// Add this to window scope for the onclick handlers
window.changePage = async function(pageToken) {
  if (isSearchMode) {
    await searchVideos(pageToken);
  } else {
    if (pageToken) {
      const trendingContainer = document.getElementById('trendingVideos');
      trendingContainer.innerHTML = '<div class="loading">Loading trending videos...</div>';
      
      try {
        const { videos, nextPageToken, prevPageToken } = await fetchTrendingVideos(pageToken);
        
        // Update current page based on direction
        if (pageToken === prevPageToken) {
          currentPage--;
        } else {
          currentPage++;
        }
        
        // Clear and repopulate videos
        trendingContainer.innerHTML = '';
        videos.forEach(video => {
          const videoCard = document.createElement('div');
          videoCard.className = 'video-thumbnail';
          videoCard.innerHTML = `
            <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" style="width: 100%">
            <p>${video.snippet.title}</p>
            <div class="video-stats">
              ${formatCount(video.statistics.viewCount)} views • 
              ${new Date(video.snippet.publishedAt).toLocaleDateString()}
            </div>
          `;
          videoCard.onclick = () => {
            window.location.href = `player.html?v=${video.id}`;
          };
          trendingContainer.appendChild(videoCard);
        });
        
        // Update pagination
        updatePagination(prevPageToken, nextPageToken);
        
        // Scroll to top of trending section
        document.querySelector('.trending-section').scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error changing page:', error);
        trendingContainer.innerHTML = `
          <div class="error-message">
            <p>Unable to load more videos at this time.</p>
            <p>Please try again later.</p>
          </div>
        `;
      }
    }
  }
};

// Add search functionality
async function searchYouTubeVideos(query, pageToken = '') {
  const API_KEY = getApiKey();
  if (!API_KEY) throw new Error('No API key provided');
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?part=id,snippet&maxResults=${VIDEOS_PER_PAGE}&q=${query}&type=video&key=${API_KEY}${pageToken ? '&pageToken=' + pageToken : ''}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items) {
      throw new Error('No items returned from API');
    }
    
    return {
      videos: data.items,
      nextPageToken: data.nextPageToken,
      prevPageToken: data.prevPageToken
    };
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    throw error;
  }
}

window.searchVideos = async function(pageToken = '') {
  const searchInput = document.getElementById('searchInput');
  const query = searchInput.value.trim();
  
  if (!query) return;
  
  const trendingContainer = document.getElementById('trendingVideos');
  const paginationContainer = document.getElementById('pagination');
  
  trendingContainer.innerHTML = '<div class="loading">Searching videos...</div>';
  
  try {
    const { videos, nextPageToken, prevPageToken } = await searchYouTubeVideos(query, pageToken);
    
    // Set search mode
    isSearchMode = true;
    searchPageToken = pageToken;
    
    // Update page number based on direction
    if (pageToken === prevPageToken) {
      currentPage--;
    } else if (pageToken) {
      currentPage++;
    } else {
      currentPage = 1;
    }
    
    trendingContainer.innerHTML = '';
    videos.forEach(video => {
      const videoCard = document.createElement('div');
      videoCard.className = 'video-thumbnail';
      videoCard.innerHTML = `
        <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}" style="width: 100%">
        <p>${video.snippet.title}</p>
        <div class="video-stats">
          ${video.snippet.channelTitle} • 
          ${new Date(video.snippet.publishedAt).toLocaleDateString()}
        </div>
      `;
      videoCard.onclick = () => {
        window.location.href = `player.html?v=${video.id.videoId}`;
      };
      trendingContainer.appendChild(videoCard);
    });
    
    if (videos.length === 0) {
      trendingContainer.innerHTML = `
        <div class="error-message">
          <p>No videos found for "${query}"</p>
        </div>
      `;
      paginationContainer.innerHTML = '';
    } else {
      // Update pagination for search results
      paginationContainer.innerHTML = `
        <button 
          ${!prevPageToken ? 'disabled' : ''} 
          onclick="searchVideos('${prevPageToken}')"
          class="pagination-button"
        >◀ Previous</button>
        <button 
          class="pagination-button" 
          disabled
        >Page ${currentPage}</button>
        <button 
          ${!nextPageToken ? 'disabled' : ''} 
          onclick="searchVideos('${nextPageToken}')"
          class="pagination-button"
        >Next ▶</button>
      `;
    }
    
  } catch (error) {
    console.error('Error searching videos:', error);
    trendingContainer.innerHTML = `
      <div class="error-message">
        <p>Unable to search videos at this time.</p>
        <p>Please try again later.</p>
      </div>
    `;
    paginationContainer.innerHTML = '';
  }
};

// Add search on Enter key
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      currentPage = 1;
      isSearchMode = false;
      searchVideos();
    }
  });
  
  initHomepage();
});