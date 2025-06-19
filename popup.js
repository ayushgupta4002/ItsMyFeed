document.addEventListener('DOMContentLoaded', () => {
  const keywordsInput = document.getElementById('keywords');
  const aiEnabledCheckbox = document.getElementById('aiEnabled');
  const aiFilterInput = document.getElementById('aiFilter');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  
  // Hidden videos elements
  const hiddenVideosToggle = document.getElementById('hiddenVideosToggle');
  const dropdownArrow = document.getElementById('dropdownArrow');
  const hiddenVideosList = document.getElementById('hiddenVideosList');
  
  // Stats elements
  const keywordCount = document.getElementById('keywordCount');
  const aiCount = document.getElementById('aiCount');
  const totalCount = document.getElementById('totalCount');

  let hiddenVideosData = [];
  let isDropdownExpanded = false;

  // Enable/disable AI filter input based on checkbox
  aiEnabledCheckbox.addEventListener('change', () => {
    aiFilterInput.disabled = !aiEnabledCheckbox.checked;
    if (!aiEnabledCheckbox.checked) {
      aiFilterInput.value = '';
    }
    
    // Add visual feedback
    const toggleContainer = aiEnabledCheckbox.closest('.toggle-container');
    if (aiEnabledCheckbox.checked) {
      toggleContainer.style.background = 'rgba(102, 126, 234, 0.1)';
    } else {
      toggleContainer.style.background = 'rgba(26, 32, 44, 0.4)';
    }
  });

  // Handle dropdown toggle
  hiddenVideosToggle.addEventListener('click', () => {
    isDropdownExpanded = !isDropdownExpanded;
    
    if (isDropdownExpanded) {
      hiddenVideosList.classList.add('expanded');
      dropdownArrow.classList.add('expanded');
      loadHiddenVideos();
    } else {
      hiddenVideosList.classList.remove('expanded');
      dropdownArrow.classList.remove('expanded');
    }
  });

  // Load saved settings
  chrome.storage.sync.get(['keywords', 'aiEnabled', 'aiFilter', 'geminiApiKey'], (result) => {
    // Load keywords
    if (result.keywords) {
      keywordsInput.value = result.keywords.join(', ');
    }
    
    // Load AI settings
    aiEnabledCheckbox.checked = result.aiEnabled || false;
    aiFilterInput.disabled = !aiEnabledCheckbox.checked;
    if (result.aiFilter) {
      aiFilterInput.value = result.aiFilter;
    }
    
    // Load API key
    if (result.geminiApiKey) {
      geminiApiKeyInput.value = result.geminiApiKey;
    }
    
    // Update toggle visual state
    const toggleContainer = aiEnabledCheckbox.closest('.toggle-container');
    if (aiEnabledCheckbox.checked) {
      toggleContainer.style.background = 'rgba(102, 126, 234, 0.1)';
    }
  });

  // Function to load hidden videos from current tab
  async function loadHiddenVideos() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.url?.includes('youtube.com')) {
        displayNoVideosMessage('Please navigate to YouTube to see hidden videos');
        return;
      }

      // Request hidden videos data from content script
      chrome.tabs.sendMessage(tab.id, { type: 'GET_HIDDEN_VIDEOS' }, (response) => {
        if (chrome.runtime.lastError) {
          displayNoVideosMessage('Unable to connect to YouTube page');
          return;
        }
        
        if (response && response.hiddenVideos) {
          hiddenVideosData = response.hiddenVideos;
          displayHiddenVideos(hiddenVideosData);
          updateStats(hiddenVideosData);
        } else {
          displayNoVideosMessage('No videos hidden on this page yet');
          updateStats([]);
        }
      });
    } catch (error) {
      console.error('Error loading hidden videos:', error);
      displayNoVideosMessage('Error loading hidden videos');
    }
  }

  // Function to display hidden videos
  function displayHiddenVideos(videos) {
    if (!videos || videos.length === 0) {
      displayNoVideosMessage('No videos hidden on this page yet');
      return;
    }

    const videosHtml = videos.map((video, index) => `
      <div class="hidden-video-item ${video.reason} ${video.url ? 'clickable' : ''}" 
           data-video-url="${video.url || ''}" 
           data-video-index="${index}"
           title="${video.url ? 'Click to open video in new tab' : 'Video URL not available'}">
        <div class="hidden-video-title">
          ${escapeHtml(video.title)}
          ${video.url ? '<span style="color: #667eea; font-size: 10px; margin-left: 4px;">🔗</span>' : ''}
        </div>
        <div class="hidden-video-reason">
          ${video.reason === 'keyword' ? '🔤 Hidden by keyword' : '🤖 Hidden by AI'}
        </div>
      </div>
    `).join('');

    hiddenVideosList.innerHTML = videosHtml;

    // Add click event listeners to clickable video items
    hiddenVideosList.querySelectorAll('.hidden-video-item.clickable').forEach(item => {
      item.addEventListener('click', (e) => {
        const videoUrl = e.currentTarget.getAttribute('data-video-url');
        if (videoUrl) {
          chrome.tabs.create({ url: videoUrl });
        }
      });
    });
  }

  // Function to display no videos message
  function displayNoVideosMessage(message) {
    hiddenVideosList.innerHTML = `<div class="no-hidden-videos">${message}</div>`;
  }

  // Function to update stats
  function updateStats(videos) {
    const keywordHidden = videos.filter(v => v.reason === 'keyword').length;
    const aiHidden = videos.filter(v => v.reason === 'ai').length;
    const total = videos.length;

    // Animate number changes
    animateNumber(keywordCount, keywordHidden);
    animateNumber(aiCount, aiHidden);
    animateNumber(totalCount, total);
  }

  // Function to animate number changes
  function animateNumber(element, targetNumber) {
    const currentNumber = parseInt(element.textContent) || 0;
    const increment = targetNumber > currentNumber ? 1 : -1;
    const duration = 300;
    const steps = Math.abs(targetNumber - currentNumber);
    const stepDuration = steps > 0 ? duration / steps : 0;

    if (steps === 0) return;

    let current = currentNumber;
    const timer = setInterval(() => {
      current += increment;
      element.textContent = current;
      
      if (current === targetNumber) {
        clearInterval(timer);
      }
    }, stepDuration);
  }

  // Function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Auto-refresh hidden videos when dropdown is open
  let refreshInterval;
  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      if (isDropdownExpanded) {
        loadHiddenVideos();
      }
    }, 3000); // Refresh every 3 seconds
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // Start auto-refresh when popup opens
  startAutoRefresh();

  // Stop auto-refresh when popup closes
  window.addEventListener('beforeunload', stopAutoRefresh);

  // Save settings with enhanced feedback
  saveButton.addEventListener('click', async () => {
    // Add loading state
    saveButton.style.opacity = '0.7';
    saveButton.style.transform = 'scale(0.98)';
    saveButton.textContent = '💾 Saving...';

    // Process keywords
    const keywords = keywordsInput.value
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    
    // Get AI settings
    const aiEnabled = aiEnabledCheckbox.checked;
    const aiFilter = aiEnabled ? aiFilterInput.value.trim() : '';
    const geminiApiKey = geminiApiKeyInput.value.trim();
    
    // Save to storage
    chrome.storage.sync.set({ 
      keywords, 
      aiEnabled,
      aiFilter,
      geminiApiKey
    }, () => {
      // Reset button state
      saveButton.style.opacity = '';
      saveButton.style.transform = '';
      saveButton.textContent = '💾 Save Settings';

      // Show success message with animation
      statusDiv.classList.add('show');
      setTimeout(() => {
        statusDiv.classList.remove('show');
      }, 3000);

      // Notify content script to update filtering
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url?.includes('youtube.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_FILTERS' }, () => {
            // Refresh hidden videos after settings update
            setTimeout(() => {
              if (isDropdownExpanded) {
                loadHiddenVideos();
              }
            }, 1000);
          });
        }
      });
    });
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      saveButton.click();
    }
    
    // Escape to close dropdown
    if (e.key === 'Escape' && isDropdownExpanded) {
      hiddenVideosToggle.click();
    }
  });

  // Add input validation and real-time feedback
  keywordsInput.addEventListener('input', () => {
    const keywords = keywordsInput.value.split(',').map(k => k.trim()).filter(Boolean);
    if (keywords.length > 20) {
      keywordsInput.style.borderColor = '#f56565';
      keywordsInput.title = 'Too many keywords (max 20)';
    } else {
      keywordsInput.style.borderColor = '';
      keywordsInput.title = '';
    }
  });

  aiFilterInput.addEventListener('input', () => {
    if (aiFilterInput.value.length > 200) {
      aiFilterInput.style.borderColor = '#f56565';
      aiFilterInput.title = 'Description too long (max 200 characters)';
    } else {
      aiFilterInput.style.borderColor = '';
      aiFilterInput.title = '';
    }
  });

  geminiApiKeyInput.addEventListener('input', () => {
    const apiKey = geminiApiKeyInput.value.trim();
    if (apiKey && !apiKey.startsWith('AIzaSy')) {
      geminiApiKeyInput.style.borderColor = '#f56565';
      geminiApiKeyInput.title = 'Invalid API key format. Should start with "AIzaSy"';
    } else {
      geminiApiKeyInput.style.borderColor = '';
      geminiApiKeyInput.title = '';
    }
  });

  // Load initial stats
  loadHiddenVideos();
}); 