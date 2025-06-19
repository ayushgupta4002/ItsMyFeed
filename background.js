// Background script for YouTube Video Filter Extension
console.log('🚀 Background script loaded and running!');

// Function to analyze video titles using AI
async function analyzeTitles(titles, aiFilterCriteria, apiKey = null) {
  console.log('🤖 analyzeTitles function called with:', titles.length, 'titles');
  
  try {
    const titlesArray = Array.from(titles);
    
    // Create a more structured prompt
    const prompt = `You are helping filter YouTube videos based on user preferences.

User's filter criteria: "${aiFilterCriteria}"

Your task: Analyze each YouTube video title below and determine if it should be HIDDEN based on the user's criteria.

Video titles to analyze:
${titlesArray.map((title, index) => `${index + 1}. ${title}`).join('\n')}

Instructions:
- Respond with ONLY "HIDE" or "SHOW" for each title (one per line)
- Be precise - only hide videos that clearly match the user's filtering criteria
- Consider the context and intent of the user's filter
- If unsure, default to "SHOW" to avoid over-filtering
- Maintain the exact same order as the input titles

Response format (one decision per line, same order as titles):`;

    console.log(`🌐 Making AI API call for ${titlesArray.length} titles with criteria: "${aiFilterCriteria}"`);
    console.log('📝 Prompt being sent:', prompt.substring(0, 200) + '...');
    
    // Use user's API key if provided, otherwise fall back to default
    const defaultApiKey = '';
    const keyToUse = apiKey || defaultApiKey;
    
    console.log(`🔑 Using ${apiKey ? 'user-provided' : 'default'} API key`);
    
    // Use the correct Gemini API endpoint with the right model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        }
      })
    });

    console.log('📡 API Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error response:', errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Raw API response:', data);

    // Extract the text from the response
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error('❌ No response text in API response:', data);
      throw new Error('No response text received from API');
    }

    console.log('📄 AI Response text:', responseText);

    // Parse the results
    const results = responseText.trim().split('\n').map(line => line.trim().toUpperCase());
    console.log('🔍 Parsed results array:', results);

    // Create results object
    const analysisResults = {};
    titlesArray.forEach((title, index) => {
      const shouldHide = results[index] === "HIDE";
      analysisResults[title] = shouldHide;
      console.log(`📹 Title: "${title}" -> ${shouldHide ? '❌ HIDE' : '✅ SHOW'}`);
    });

    console.log(`✅ AI Analysis completed:`, analysisResults);
    return analysisResults;
  } catch (error) {
    console.error('💥 AI analysis failed:', error);
    console.error('💥 Error stack:', error.stack);
    
    // Return all false on error
    const errorResults = {};
    titles.forEach(title => {
      errorResults[title] = false;
    });
    console.log('🔄 Returning error results:', errorResults);
    return errorResults;
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received in background script:', request);
  
  if (request.type === 'ANALYZE_TITLES_BATCH') {
    console.log('🎯 Processing ANALYZE_TITLES_BATCH request');
    const titles = request.titles || [];
    console.log('📋 Titles to analyze:', titles);
    
    chrome.storage.sync.get(['aiEnabled', 'aiFilter', 'geminiApiKey'], async (settings) => {
      console.log('⚙️ Retrieved settings:', settings);
      
      if (!settings.aiEnabled || !settings.aiFilter) {
        console.log('⚠️ AI filtering disabled or no criteria set');
        sendResponse({
          results: {},
          aiEnabled: false
        });
        return;
      }
      
      console.log(`🔍 Analyzing ${titles.length} titles with AI filter: "${settings.aiFilter}"`);
      
      try {
        const results = await analyzeTitles(titles, settings.aiFilter, settings.geminiApiKey);
        console.log('✅ Sending successful response:', results);
        sendResponse({
          results: results,
          aiEnabled: true,
          aiFilter: settings.aiFilter
        });
      } catch (error) {
        console.error('💥 Analysis failed in message handler:', error);
        sendResponse({
          results: {},
          aiEnabled: true,
          aiFilter: settings.aiFilter,
          error: error.message
        });
      }
    });
    
    return true; 
  }
  
  if (request.type === 'TEST_BACKGROUND') {
    console.log('🧪 Test message received');
    sendResponse({ success: true, message: 'Background script is working!' });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 ItsMyFeed extension installed');

});

chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 ItsMyFeed Video Filter extension started');
});

console.log('✅ Background script setup complete - ready to receive messages');