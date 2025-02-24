import { getApiKey } from './config.js';
import { fetchVideoDetails, getRelatedVideos } from './api.js';

let player;
let currentVideoId = null;
let isPlaying = false;
let currentQuality = 'auto';

function initializePlayer() {
  const urlParams = new URLSearchParams(window.location.search);
  currentVideoId = urlParams.get('v');
  
  if (!currentVideoId) {
    showError('No video ID provided');
    return;
  }

  // Create YouTube player with properly structured parameters
  player = new YT.Player('player', {
    height: '360',
    width: '640',
    videoId: currentVideoId,
    playerVars: {
      'playsinline': 1,
      'autoplay': 1,
      'controls': 0,
      'modestbranding': 1,
      'rel': 0,
      'enablejsapi': 1,
      'origin': window.location.origin
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError,
      'onPlaybackQualityChange': onPlaybackQualityChange
    }
  });
}

async function onPlayerReady(event) {
  try {
    const videoData = await fetchVideoDetails(currentVideoId);
    if (!videoData) throw new Error('Failed to load video data');
    
    document.getElementById('videoTitle').textContent = videoData.snippet.title;
    document.getElementById('videoDescription').textContent = videoData.snippet.description;
    document.getElementById('channelName').textContent = videoData.snippet.channelTitle;
    document.getElementById('videoStats').textContent = `${formatCount(videoData.statistics.viewCount)} views`;
    document.getElementById('likeCount').textContent = formatCount(videoData.statistics.likeCount);
    
    // Load related videos
    const relatedVideos = await getRelatedVideos(currentVideoId);
    displayRelatedVideos(relatedVideos);
  } catch (error) {
    console.error('Error in onPlayerReady:', error);
    showError('Failed to load video details');
  }
}

function displayRelatedVideos(videos) {
  const container = document.getElementById('recommendedVideos');
  container.innerHTML = '';
  
  videos.forEach(video => {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'video-thumbnail';
    thumbnail.innerHTML = `
      <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}">
      <p>${video.snippet.title}</p>
      <div class="video-stats">${video.snippet.channelTitle}</div>
    `;
    thumbnail.onclick = () => {
      window.location.href = `player.html?v=${video.id.videoId}`;
    };
    container.appendChild(thumbnail);
  });
}

function showError(error) {
  const container = document.getElementById('player');
  container.innerHTML = `
    <div class="error-container">
      <div class="error-title">
        <span class="error-icon"></span>
        Error Loading Video
      </div>
      <div class="error-message">
        The video could not be loaded due to a technical error.
      </div>
      <pre class="error-details">${JSON.stringify(error, null, 2)}</pre>
      <button class="error-action" onclick="window.location.href='index.html'">
        Return to Homepage
      </button>
    </div>
  `;
}

// Format view counts
function formatCount(count) {
  if (!count) return '0';
  if (count >= 1000000) {
    return Math.floor(count / 1000000) + 'M';
  } else if (count >= 1000) {
    return Math.floor(count / 1000) + 'K';
  }
  return count;
}

function updateControls() {
  const playPauseButton = document.getElementById('playPauseButton');
  playPauseButton.textContent = isPlaying ? '⏸' : '▶';
  
  const currentTimeEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  const progressFill = document.getElementById('progressFill');
  const loadedProgress = document.getElementById('loadedProgress');
  
  if (player && player.getCurrentTime) {
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    const loadedFraction = player.getVideoLoadedFraction();
    
    currentTimeEl.textContent = formatTime(currentTime);
    durationEl.textContent = formatTime(duration);
    progressFill.style.width = `${(currentTime / duration) * 100}%`;
    loadedProgress.style.width = `${loadedFraction * 100}%`;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const playPauseButton = document.getElementById('playPauseButton');
  const muteButton = document.getElementById('muteButton');
  const volumeSlider = document.getElementById('volumeSlider');
  const qualitySelect = document.getElementById('qualitySelect');
  const fullscreenButton = document.getElementById('fullscreenButton');
  const progressBar = document.querySelector('.progress-bar');
  const tabs = document.querySelectorAll('.retro-tab');
  
  playPauseButton.addEventListener('click', () => {
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
    isPlaying = !isPlaying;
    updateControls();
  });
  
  muteButton.addEventListener('click', () => {
    const isMuted = player.isMuted();
    if (isMuted) {
      player.unMute();
      muteButton.textContent = '🔊';
    } else {
      player.mute();
      muteButton.textContent = '🔇';
    }
  });
  
  volumeSlider.addEventListener('input', (e) => {
    player.setVolume(e.target.value);
  });
  
  qualitySelect.addEventListener('change', (e) => {
    player.setPlaybackQuality(e.target.value);
    currentQuality = e.target.value;
  });
  
  fullscreenButton.addEventListener('click', () => {
    const container = document.getElementById('playerContainer');
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  });
  
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    player.seekTo(pos * player.getDuration());
  });
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
      });
      document.getElementById(`${tabId}Tab`).style.display = 'block';
    });
  });
  
  // Update controls every second
  setInterval(updateControls, 1000);
  
  // Initialize tooltips
  document.querySelectorAll('[title]').forEach(element => {
    const tooltip = document.getElementById('tooltip');
    
    element.addEventListener('mouseover', (e) => {
      tooltip.textContent = e.target.title;
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
    });
    
    element.addEventListener('mouseout', () => {
      tooltip.style.display = 'none';
    });
  });
});

function onPlayerStateChange(event) {
  switch (event.data) {
    case YT.PlayerState.PLAYING:
      isPlaying = true;
      updateControls();
      break;
    case YT.PlayerState.PAUSED:
      isPlaying = false;
      updateControls();
      break;
  }
  
  // Update video stats
  if (event.data === YT.PlayerState.PLAYING) {
    updateVideoStats();
  }
}

function updateVideoStats() {
  const currentRes = document.getElementById('currentRes');
  const connectionSpeed = document.getElementById('connectionSpeed');
  const bufferHealth = document.getElementById('bufferHealth');
  const droppedFrames = document.getElementById('droppedFrames');
  
  currentRes.textContent = player.getPlaybackQuality();
  connectionSpeed.textContent = `${Math.round(player.getVideoLoadedFraction() * 100)}%`;
  bufferHealth.textContent = `${Math.round(player.getVideoLoadedFraction() * 100)}%`;
  
  // Simulate dropped frames for retro effect
  let drops = parseInt(droppedFrames.textContent);
  if (Math.random() < 0.1) {
    drops += 1;
    droppedFrames.textContent = drops;
  }
}

function onPlayerError(event) {
  showError('Failed to load video');
}

function onPlaybackQualityChange(event) {
  currentQuality = event.data;
  document.getElementById('currentRes').textContent = currentQuality;
}

// Remove version parameter from API calls
window.onYouTubeIframeAPIReady = () => {
  try {
    initializePlayer();
  } catch (error) {
    console.error('Error initializing player:', error);
    showError('Failed to initialize video player');
  }
};

// Check for API key on page load
document.addEventListener('DOMContentLoaded', () => {
  if (!getApiKey()) {
    window.location.href = 'index.html';
    return;
  }
});