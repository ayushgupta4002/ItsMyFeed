// Pre-filtering system - hide videos before they're shown to users
console.log('🎬 YouTube Pre-Filter Extension loaded');

// Global state
let settings = { keywords: [], aiEnabled: false, aiFilter: '', geminiApiKey: '' };
let aiResultsCache = {};
let processedElements = new WeakSet();
let isInitialized = false;

// Track hidden videos for popup display
let hiddenVideosTracker = [];

// Track elements waiting for AI analysis
let elementsWaitingForAI = new WeakSet();

// Load settings on startup
async function loadSettings() {
  try {
    settings = await new Promise(resolve => {
      chrome.storage.sync.get(['keywords', 'aiEnabled', 'aiFilter', 'geminiApiKey'], (result) => {
        resolve({
          keywords: result.keywords || [],
          aiEnabled: result.aiEnabled || false,
          aiFilter: result.aiFilter || '',
          geminiApiKey: result.geminiApiKey || ''
        });
      });
    });
    console.log('⚙️ Settings loaded:', settings);
  } catch (error) {
    console.error('❌ Failed to load settings:', error);
  }
}

// Function to check if a video should be hidden based on keywords
function shouldHideByKeywords(title, keywords) {
  if (!keywords || keywords.length === 0) return false;
  return keywords.some(keyword => 
    title.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Function to extract title from video element
function extractTitle(element) {
  // Try different selectors for video titles
  let titleElement = element.querySelector('#video-title');
  
  // Fallback selectors
  if (!titleElement) {
    titleElement = element.querySelector('.yt-lockup-metadata-view-model-wiz__title');
  }
  
  if (!titleElement) {
    titleElement = element.querySelector('a[title]');
    if (titleElement) {
      return titleElement.getAttribute('title');
    }
  }
  
  if (!titleElement) {
    titleElement = element.querySelector('h3[title]');
    if (titleElement) {
      return titleElement.getAttribute('title');
    }
  }
  
  return titleElement ? titleElement.textContent.trim() : '';
}

// Function to extract video URL from video element
function extractVideoUrl(element) {
  // Try different selectors for video links
  let linkElement = element.querySelector('#video-title-link');
  
  // Fallback selectors
  if (!linkElement) {
    linkElement = element.querySelector('a[href*="/watch?v="]');
  }
  
  if (!linkElement) {
    linkElement = element.querySelector('a[href*="/shorts/"]');
  }
  
  if (!linkElement) {
    linkElement = element.querySelector('a#video-title');
  }
  
  if (linkElement && linkElement.href) {
    const url = linkElement.href;
    // Convert relative URLs to absolute
    if (url.startsWith('/')) {
      return 'https://www.youtube.com' + url;
    }
    return url;
  }
  
  return null;
}

// Function to create and inject loader overlay
function createLoaderOverlay(element) {
  // Remove any existing loader
  const existingLoader = element.querySelector('.yt-filter-loader');
  if (existingLoader) {
    existingLoader.remove();
  }

  const loader = document.createElement('div');
  loader.className = 'yt-filter-loader';
  loader.innerHTML = `
    <div class="yt-filter-loader-content">
      <div class="yt-filter-spinner"></div>
      <span class="yt-filter-text">🤖 AI analyzing...</span>
    </div>
  `;
  
  // Position the loader overlay
  element.style.position = 'relative';
  element.appendChild(loader);
  
  return loader;
}

// Function to remove loader overlay
function removeLoaderOverlay(element) {
  const loader = element.querySelector('.yt-filter-loader');
  if (loader) {
    loader.remove();
  }
}

// Function to immediately hide element and mark for processing
function preHideElement(element) {
  element.style.visibility = 'hidden';
  element.style.opacity = '0';
  element.setAttribute('data-filter-processing', 'true');
}

// Function to show element after filtering decision
function showElement(element) {
  element.style.visibility = '';
  element.style.opacity = '';
  element.removeAttribute('data-filter-processing');
  removeLoaderOverlay(element);
}

// Function to show element with loader while waiting for AI
function showElementWithLoader(element) {
  element.style.visibility = '';
  element.style.opacity = '';
  element.removeAttribute('data-filter-processing');
  createLoaderOverlay(element);
  elementsWaitingForAI.add(element);
}

// Function to permanently hide element
function hideElement(element, reason) {
  element.style.display = 'none';
  element.setAttribute('data-filter-hidden', reason);
  element.removeAttribute('data-filter-processing');
  removeLoaderOverlay(element);
  elementsWaitingForAI.delete(element);
}

// Function to add video to hidden tracker
function addToHiddenTracker(title, reason, videoElement = null) {
  // Avoid duplicates
  const existing = hiddenVideosTracker.find(v => v.title === title);
  if (!existing) {
    const url = videoElement ? extractVideoUrl(videoElement) : null;
    hiddenVideosTracker.push({
      title: title,
      reason: reason,
      timestamp: Date.now(),
      url: url
    });
    
    // Keep only last 50 hidden videos to prevent memory issues
    if (hiddenVideosTracker.length > 50) {
      hiddenVideosTracker = hiddenVideosTracker.slice(-50);
    }
  }
}

// Function to process a single video element
async function processVideoElement(element) {
  if (processedElements.has(element)) return;
  
  const title = extractTitle(element);
  if (!title) {
    showElement(element);
    return;
  }
  
  processedElements.add(element);
  
  // Check keyword filtering first (immediate)
  if (shouldHideByKeywords(title, settings.keywords)) {
    hideElement(element, 'keyword');
    addToHiddenTracker(title, 'keyword', element);
    console.log(`🚫 Hidden by keyword: "${title}"`);
    return;
  }
  
  // Check AI cache
  if (settings.aiEnabled && settings.aiFilter && aiResultsCache[title] === true) {
    hideElement(element, 'ai');
    addToHiddenTracker(title, 'ai', element);
    console.log(`🤖 Hidden by AI: "${title}"`);
    return;
  }
  
  // If AI is enabled but we don't have a cached result, show with loader and queue for AI analysis
  if (settings.aiEnabled && settings.aiFilter && !(title in aiResultsCache)) {
    // Show the element with loader while waiting for AI analysis
    showElementWithLoader(element);
    queueForAIAnalysis(title, element);
    return;
  }
  
  // Show the element if it passes all filters
  showElement(element);
}

// Queue for AI analysis
const aiAnalysisQueue = new Map(); // title -> Set of elements
let aiAnalysisTimeout = null;

function queueForAIAnalysis(title, element) {
  if (!aiAnalysisQueue.has(title)) {
    aiAnalysisQueue.set(title, new Set());
  }
  aiAnalysisQueue.get(title).add(element);
  
  // Debounce AI analysis
  if (aiAnalysisTimeout) {
    clearTimeout(aiAnalysisTimeout);
  }
  
  aiAnalysisTimeout = setTimeout(processAIAnalysisQueue, 2000);
}

// Process AI analysis queue
async function processAIAnalysisQueue() {
  if (aiAnalysisQueue.size === 0) return;
  
  const titlesToAnalyze = Array.from(aiAnalysisQueue.keys());
  console.log(`🤖 Analyzing ${titlesToAnalyze.length} titles with AI`);
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_TITLES_BATCH',
      titles: titlesToAnalyze
    });
    
    if (response && response.results) {
      // Update cache
      Object.assign(aiResultsCache, response.results);

      console.log('🤖 AI analysis results:', response.results);
      
      // Apply results to queued elements
      for (const [title, elements] of aiAnalysisQueue) {
        const shouldHide = response.results[title] === true;
        
        for (const element of elements) {
          // Remove from waiting set
          elementsWaitingForAI.delete(element);
          
          if (shouldHide) {
            hideElement(element, 'ai');
            addToHiddenTracker(title, 'ai', element);
          } else {
            // Show element and remove loader
            showElement(element);
          }
        }
      }
      
      console.log(`✅ AI analysis completed for ${titlesToAnalyze.length} titles`);
    }
  } catch (error) {
    console.error('❌ AI analysis failed:', error);
    // Show all queued elements on error and remove loaders
    for (const elements of aiAnalysisQueue.values()) {
      for (const element of elements) {
        elementsWaitingForAI.delete(element);
        showElement(element);
      }
    }
  }
  
  // Clear the queue
  aiAnalysisQueue.clear();
}

// Function to process new video elements
function processNewElements(elements) {
  const videoElements = [];
  
  for (const element of elements) {
    // Check if this is a video container
    if (element.matches && (
      element.matches('ytd-video-renderer') || 
      element.matches('ytd-rich-item-renderer') ||
      element.matches('ytd-compact-video-renderer')
    )) {
      videoElements.push(element);
    }
    
    // Also check child elements
    if (element.querySelectorAll) {
      const childVideos = element.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer');
      videoElements.push(...childVideos);
    }
  }
  
  // Pre-hide all video elements immediately
  videoElements.forEach(element => {
    if (!processedElements.has(element)) {
      preHideElement(element);
    }
  });
  
  // Process each element
  videoElements.forEach(element => {
    processVideoElement(element);
  });
}

// Enhanced MutationObserver to catch elements before they're rendered
const observer = new MutationObserver((mutations) => {
  const addedElements = [];
  
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        addedElements.push(node);
      }
    });
  });
  
  if (addedElements.length > 0) {
    processNewElements(addedElements);
  }
});

// Function to process existing elements on page
function processExistingElements() {
  const existingVideos = document.querySelectorAll('ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer');
  console.log(`🔍 Processing ${existingVideos.length} existing video elements`);
  
  existingVideos.forEach(element => {
    if (!processedElements.has(element)) {
      preHideElement(element);
      processVideoElement(element);
    }
  });
}

// Initialize the extension
async function initialize() {
  if (isInitialized) return;
  
  console.log('🚀 Initializing ItsMyFeed Extension');
  
  await loadSettings();
  
  // Process existing elements
  processExistingElements();
  
  // Start observing for new elements
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  isInitialized = true;
  console.log('✅ Extension initialized successfully');
}

// Listen for messages from popup and other scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_FILTERS') {
    console.log('⚙️ Settings updated, reloading and re-filtering');
    loadSettings().then(() => {
      // Clear processed elements to reprocess everything
      processedElements = new WeakSet();
      aiResultsCache = {}; // Clear AI cache to respect new settings
      hiddenVideosTracker = []; // Clear hidden videos tracker
      elementsWaitingForAI = new WeakSet(); // Clear waiting elements
      
      // Remove all existing loaders
      document.querySelectorAll('.yt-filter-loader').forEach(loader => loader.remove());
      
      // Reprocess all elements
      processExistingElements();
    });
    sendResponse({ success: true });
  } else if (request.type === 'GET_HIDDEN_VIDEOS') {
    // Return current hidden videos data
    sendResponse({
      hiddenVideos: hiddenVideosTracker.slice().reverse(), // Most recent first
      totalCount: hiddenVideosTracker.length,
      keywordCount: hiddenVideosTracker.filter(v => v.reason === 'keyword').length,
      aiCount: hiddenVideosTracker.filter(v => v.reason === 'ai').length
    });
  } else {
    sendResponse({});
  }
});

// Enhanced CSS styles for loader and smooth transitions
const style = document.createElement('style');
style.textContent = `
  [data-filter-processing] {
    transition: opacity 0.1s ease-in-out !important;
  }

  .yt-filter-loader {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: blur(4px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 1000 !important;
    border-radius: 8px !important;
  }

  .yt-filter-loader-content {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 8px !important;
    padding: 16px !important;
    background: rgba(30, 41, 59, 0.95) !important;
    border-radius: 8px !important;
    border: 1px solid rgba(59, 130, 246, 0.3) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  }

  .yt-filter-spinner {
    width: 20px !important;
    height: 20px !important;
    border: 2px solid rgba(59, 130, 246, 0.3) !important;
    border-top: 2px solid #3b82f6 !important;
    border-radius: 50% !important;
    animation: yt-filter-spin 1s linear infinite !important;
  }

  .yt-filter-text {
    color: #e2e8f0 !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    text-align: center !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }

  @keyframes yt-filter-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Fade in animation for loader */
  .yt-filter-loader {
    animation: yt-filter-fade-in 0.3s ease-out !important;
  }

  @keyframes yt-filter-fade-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Also initialize on page navigation (for SPA behavior)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('📍 Page navigation detected, reinitializing');
    // Clear tracker on navigation to new page
    hiddenVideosTracker = [];
    elementsWaitingForAI = new WeakSet();
    // Remove all loaders on navigation
    document.querySelectorAll('.yt-filter-loader').forEach(loader => loader.remove());
    setTimeout(initialize, 1000); // Give YouTube time to load content
  }
}).observe(document, { subtree: true, childList: true });

console.log('🎯 ItsMyFeed content script loaded');