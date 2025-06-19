'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Gem, 
  Hash, 
  Bot, 
  Eye, 
  Save, 
  ChevronDown, 
  Info, 
  ExternalLink,
  CheckCircle,
  Lightbulb
} from 'lucide-react';

interface HiddenVideo {
  title: string;
  reason: 'keyword' | 'ai';
  timestamp: number;
  url?: string;
}

interface HiddenVideosData {
  hiddenVideos: HiddenVideo[];
  totalCount: number;
  keywordCount: number;
  aiCount: number;
}

export default function Popup() {
  // Settings state
  const [keywords, setKeywords] = useState<string>('');
  const [aiEnabled, setAiEnabled] = useState<boolean>(false);
  const [aiFilter, setAiFilter] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  
  // UI state
  const [isApiKeyDropdownExpanded, setIsApiKeyDropdownExpanded] = useState<boolean>(false);
  const [isKeywordDropdownExpanded, setIsKeywordDropdownExpanded] = useState<boolean>(false);
  const [isAiDropdownExpanded, setIsAiDropdownExpanded] = useState<boolean>(false);
  const [isDropdownExpanded, setIsDropdownExpanded] = useState<boolean>(false);
  const [hiddenVideosData, setHiddenVideosData] = useState<HiddenVideosData>({
    hiddenVideos: [],
    totalCount: 0,
    keywordCount: 0,
    aiCount: 0
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showStatus, setShowStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Validation state
  const [keywordsError, setKeywordsError] = useState<string>('');
  const [aiFilterError, setAiFilterError] = useState<string>('');
  const [apiKeyError, setApiKeyError] = useState<string>('');

  // Load settings on component mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['keywords', 'aiEnabled', 'aiFilter', 'geminiApiKey'], (result) => {
        if (result.keywords) {
          setKeywords(result.keywords.join(', '));
        }
        setAiEnabled(result.aiEnabled || false);
        if (result.aiFilter) {
          setAiFilter(result.aiFilter);
        }
        if (result.geminiApiKey) {
          setGeminiApiKey(result.geminiApiKey);
        }
      });
    }
  }, []);

  // Load hidden videos data
  const loadHiddenVideos = useCallback(async () => {
    if (typeof chrome === 'undefined') return;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.url?.includes('youtube.com')) {
        setHiddenVideosData({
          hiddenVideos: [],
          totalCount: 0,
          keywordCount: 0,
          aiCount: 0
        });
        return;
      }

      chrome.tabs.sendMessage(tab.id!, { type: 'GET_HIDDEN_VIDEOS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting hidden videos:', chrome.runtime.lastError);
          return;
        }
        
        if (response) {
          setHiddenVideosData({
            hiddenVideos: response.hiddenVideos || [],
            totalCount: response.totalCount || 0,
            keywordCount: response.keywordCount || 0,
            aiCount: response.aiCount || 0
          });
        }
      });
    } catch (error) {
      console.error('Error loading hidden videos:', error);
    }
  }, []);

  // Auto-refresh hidden videos when dropdown is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isDropdownExpanded) {
      loadHiddenVideos();
      interval = setInterval(loadHiddenVideos, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDropdownExpanded, loadHiddenVideos]);

  // Load initial data
  useEffect(() => {
    loadHiddenVideos();
  }, [loadHiddenVideos]);

  // Handle AI enabled toggle
  const handleAiEnabledChange = (checked: boolean) => {
    setAiEnabled(checked);
    if (!checked) {
      setAiFilter('');
    }
  };

  // Handle dropdown toggle
  const handleDropdownToggle = () => {
    setIsDropdownExpanded(!isDropdownExpanded);
  };

  // Handle API key dropdown toggle
  const handleApiKeyDropdownToggle = () => {
    setIsApiKeyDropdownExpanded(!isApiKeyDropdownExpanded);
  };

  // Handle keyword dropdown toggle
  const handleKeywordDropdownToggle = () => {
    setIsKeywordDropdownExpanded(!isKeywordDropdownExpanded);
  };

  // Handle AI dropdown toggle
  const handleAiDropdownToggle = () => {
    setIsAiDropdownExpanded(!isAiDropdownExpanded);
  };

  // Handle video click to open in new tab
  const handleVideoClick = (url: string | undefined) => {
    if (url && typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: url });
    }
  };

  // Validate inputs
  const validateInputs = () => {
    let isValid = true;
    
    // Validate keywords
    const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (keywordList.length > 20) {
      setKeywordsError('Too many keywords (max 20)');
      isValid = false;
    } else {
      setKeywordsError('');
    }
    
    // Validate AI filter
    if (aiFilter.length > 200) {
      setAiFilterError('Description too long (max 200 characters)');
      isValid = false;
    } else {
      setAiFilterError('');
    }
    
    // Clear any existing API key errors
    setApiKeyError('');
    
    return isValid;
  };

  // Save settings
  const handleSave = async () => {
    if (!validateInputs()) return;
    
    setIsSaving(true);
    
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const settings = {
        keywords: keywordList,
        aiEnabled,
        aiFilter: aiEnabled ? aiFilter.trim() : '',
        geminiApiKey: geminiApiKey.trim()
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise<void>((resolve) => {
          chrome.storage.sync.set(settings, () => {
            resolve();
          });
        });
        
        // Show success message
        setStatusMessage('✅ Settings saved successfully!');
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
        
        // Notify content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url?.includes('youtube.com')) {
          chrome.tabs.sendMessage(tab.id!, { type: 'UPDATE_FILTERS' }, () => {
            // Refresh hidden videos after settings update
            setTimeout(loadHiddenVideos, 1000);
          });
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setStatusMessage('❌ Error saving settings');
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
      
      // Escape to close dropdowns
      if (e.key === 'Escape') {
        if (isDropdownExpanded) {
          setIsDropdownExpanded(false);
        }
        if (isApiKeyDropdownExpanded) {
          setIsApiKeyDropdownExpanded(false);
        }
        if (isKeywordDropdownExpanded) {
          setIsKeywordDropdownExpanded(false);
        }
        if (isAiDropdownExpanded) {
          setIsAiDropdownExpanded(false);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownExpanded, isApiKeyDropdownExpanded, isKeywordDropdownExpanded, isAiDropdownExpanded]);

  return (
    <div className="w-full min-w-80 max-w-100 p-6 font-inter bg-black text-white leading-relaxed min-h-screen antialiased">
      <div className="text-center mb-8 pb-6 border-b border-gray-800">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/logo.png" alt="ItsMyFeed Logo" className="w-7 h-7" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
            ItsMyFeed
          </h1>
        </div>
        <p className="text-sm text-gray-400 font-medium">
          Smart content filtering for YouTube
        </p>
      </div>
      
      {/* Gemini API Key Section */}
      <div className="mb-6 p-5 bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/90">
        <div 
          className="flex items-center justify-between cursor-pointer py-2 transition-all duration-300 hover:text-red-400"
          onClick={handleApiKeyDropdownToggle}
        >
          <div className="flex items-center gap-3">
            <Gem className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white tracking-tight">Gemini API Key Setup</h3>
            {geminiApiKey.trim() && (
              <span className="ml-2 px-3 py-1 bg-red-600/80 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Configured
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 text-gray-400 ${
            isApiKeyDropdownExpanded ? 'transform rotate-180' : ''
          }`} />
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${
          isApiKeyDropdownExpanded ? 'max-h-96 mt-4' : 'max-h-0'
        }`}>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed font-medium">
            Enter your own Gemini API key (optional - leave blank to use shared key)
          </p>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className={`w-full p-4 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg text-white text-sm font-medium transition-all duration-300 focus:outline-none focus:border-red-500 focus:shadow-lg focus:shadow-red-500/20 placeholder:text-gray-500 placeholder:font-normal ${
              apiKeyError ? 'border-red-500' : ''
            }`}
          />
          {apiKeyError && <div className="text-red-400 text-sm mt-2 font-medium">{apiKeyError}</div>}
          <div className="mt-3 p-3 bg-gray-800/60 backdrop-blur-sm rounded-lg border-l-4 border-red-500">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <Info className="w-4 h-4" />
              About API Keys:
            </div>
            <div className="text-sm text-gray-400 leading-relaxed space-y-1 font-medium">
              <div>• Get your free API key from <span className="text-red-400 font-semibold">console.cloud.google.com</span></div>
              <div>• Using your own key ensures better reliability and avoids rate limits</div>
              <div>• Your key is stored locally and never shared</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Keyword Filtering Section */}
      <div className="mb-6 p-5 bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/90">
        <div 
          className="flex items-center justify-between cursor-pointer py-2 transition-all duration-300 hover:text-red-400"
          onClick={handleKeywordDropdownToggle}
        >
          <div className="flex items-center gap-3">
            <Hash className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white tracking-tight">Keyword Filtering</h3>
            {keywords.trim() && (
              <span className="ml-2 px-3 py-1 bg-red-600/80 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 text-gray-400 ${
            isKeywordDropdownExpanded ? 'transform rotate-180' : ''
          }`} />
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${
          isKeywordDropdownExpanded ? 'max-h-96 mt-4' : 'max-h-0'
        }`}>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed font-medium">
            Hide videos containing these keywords (always active)
          </p>
          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Enter keywords separated by commas&#10;e.g., clickbait, drama, reaction, shorts"
            className={`w-full p-4 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg text-white text-sm font-medium transition-all duration-300 resize-y min-h-24 max-h-32 focus:outline-none focus:border-red-500 focus:shadow-lg focus:shadow-red-500/20 placeholder:text-gray-500 placeholder:font-normal ${
              keywordsError ? 'border-red-500' : ''
            }`}
          />
          {keywordsError && <div className="text-red-400 text-sm mt-2 font-medium">{keywordsError}</div>}
        </div>
      </div>

      {/* AI Smart Filtering Section */}
      <div className="mb-6 p-5 bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/90">
        <div 
          className="flex items-center justify-between cursor-pointer py-2 transition-all duration-300 hover:text-red-400"
          onClick={handleAiDropdownToggle}
        >
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white tracking-tight">AI Smart Filtering</h3>
            {aiEnabled && (
              <span className="ml-2 px-3 py-1 bg-red-600/80 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Enabled
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 text-gray-400 ${
            isAiDropdownExpanded ? 'transform rotate-180' : ''
          }`} />
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${
          isAiDropdownExpanded ? 'max-h-96 mt-4' : 'max-h-0'
        }`}>
          <div className={`flex items-center mb-5 p-4 bg-gray-800/60 backdrop-blur-sm rounded-lg transition-all duration-300 hover:bg-gray-800/80 ${
            aiEnabled ? 'bg-red-500/10 border border-red-500/30' : ''
          }`}>
            <div className="relative w-12 h-6 mr-4">
              <input
                type="checkbox"
                id="aiEnabled"
                checked={aiEnabled}
                onChange={(e) => handleAiEnabledChange(e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <label
                htmlFor="aiEnabled"
                className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition-all duration-300 ${
                  aiEnabled 
                    ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/40' 
                    : 'bg-gray-600'
                }`}
              >
                <span className={`absolute h-4.5 w-4.5 left-0.75 bottom-0.75 bg-white rounded-full transition-all duration-300 ${
                  aiEnabled ? 'transform translate-x-6' : ''
                }`} />
              </label>
            </div>
            <label htmlFor="aiEnabled" className="text-sm font-semibold text-white cursor-pointer flex-1">
              Enable AI-powered filtering
            </label>
          </div>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed font-medium">
            Describe what type of content you want to filter out
          </p>
          <input
            type="text"
            value={aiFilter}
            onChange={(e) => setAiFilter(e.target.value)}
            placeholder="e.g., 'music videos', 'reaction content', 'gaming streams'"
            disabled={!aiEnabled}
            className={`w-full p-4 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg text-white text-sm font-medium transition-all duration-300 focus:outline-none placeholder:text-gray-500 placeholder:font-normal ${
              !aiEnabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'focus:border-red-500 focus:shadow-lg focus:shadow-red-500/20'
            } ${
              aiFilterError ? 'border-red-500' : ''
            }`}
          />
          {aiFilterError && <div className="text-red-400 text-sm mt-2 font-medium">{aiFilterError}</div>}
          <div className="mt-3 p-3 bg-gray-800/60 backdrop-blur-sm rounded-lg border-l-4 border-red-500">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <Lightbulb className="w-4 h-4" />
              Examples:
            </div>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              &quot;music videos&quot; • &quot;reaction videos&quot; • &quot;clickbait content&quot; • &quot;gaming streams&quot; • &quot;shorts under 1 minute&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Hidden Videos Section */}
      <div className="mb-8 p-5 bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-800 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/90">
        <div 
          className="flex items-center justify-between cursor-pointer py-2 transition-all duration-300 hover:text-red-400"
          onClick={handleDropdownToggle}
        >
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white tracking-tight">Hidden Videos</h3>
            {hiddenVideosData.totalCount > 0 && (
              <span className="ml-2 px-3 py-1 bg-red-600/80 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                {hiddenVideosData.totalCount}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 text-gray-400 ${
            isDropdownExpanded ? 'transform rotate-180' : ''
          }`} />
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${
          isDropdownExpanded ? 'max-h-96 mt-4' : 'max-h-0'
        }`}>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed font-medium">
            Videos hidden on this page
          </p>
          {hiddenVideosData.hiddenVideos.length === 0 ? (
            <div className="text-center text-gray-500 text-sm p-6 italic bg-gray-800/30 backdrop-blur-sm rounded-lg font-medium">
              No videos hidden on this page yet
            </div>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {hiddenVideosData.hiddenVideos.map((video, index) => (
                <div 
                  key={index} 
                  onClick={() => handleVideoClick(video.url)}
                  className={`p-4 bg-gray-800/60 backdrop-blur-sm rounded-lg border-l-4 text-sm leading-relaxed transition-all duration-200 ${
                    video.reason === 'keyword' 
                      ? 'border-red-500 hover:bg-gray-800/80 hover:border-red-400' 
                      : 'border-red-400 hover:bg-gray-800/80 hover:border-red-300'
                  } ${video.url ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-red-500/10' : 'cursor-default'}`}
                  title={video.url ? 'Click to open video in new tab' : 'Video URL not available'}
                >
                  <div className="text-white font-semibold mb-2 line-clamp-2 flex items-start gap-3">
                    <span className="flex-1">{video.title}</span>
                    {video.url && (
                      <ExternalLink className="w-4 h-4 text-red-400 opacity-70 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 font-medium">
                    {video.reason === 'keyword' ? (
                      <Hash className="w-3 h-3" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                    <span className="text-xs">
                      {video.reason === 'keyword' ? 'Hidden by keyword' : 'Hidden by AI'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button 
        className="w-full py-4 px-6 bg-gradient-to-r from-red-700 to-red-600 text-white border-none rounded-lg cursor-pointer text-base font-bold transition-all duration-300 shadow-lg shadow-red-600/40 hover:shadow-red-600/60 hover:-translate-y-1 hover:from-red-600 hover:to-red-500 active:translate-y-0 disabled:opacity-70 disabled:scale-95 disabled:cursor-not-allowed backdrop-blur-sm tracking-wide"
        onClick={handleSave}
        disabled={isSaving}
      >
        <span className="flex items-center justify-center gap-3">
          <Save className="w-5 h-5" />
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </span>
      </button>
      
      <div className={`mt-4 p-4 bg-gray-800/60 backdrop-blur-sm text-white text-center rounded-lg text-sm font-semibold border border-gray-700 transition-all duration-300 tracking-wide ${
        showStatus ? 'block animate-slide-in shadow-lg' : 'hidden'
      }`}>
        {statusMessage}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 pt-6 border-t border-gray-800">
        <div className="text-sm text-gray-400 font-medium">
          Made with <span className="text-red-500">❤️</span> for a better YouTube experience
        </div>
        <div className="text-xs text-gray-500 mt-2">
         <a href="https://github.com/ayushgupta4002/ItsMyFeed" target="_blank" rel="noopener noreferrer"> ⭐ <strong>Star this repo</strong> if it helps you filter your feed!</a>
        </div>
      </div>
    </div>
  );
}
