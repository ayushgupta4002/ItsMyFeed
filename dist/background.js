// background.js
console.log("\u{1F680} Background script loaded and running!");
async function analyzeTitles(titles, aiFilterCriteria, apiKey = null) {
  console.log("\u{1F916} analyzeTitles function called with:", titles.length, "titles");
  try {
    const titlesArray = Array.from(titles);
    const prompt = `You are helping filter YouTube videos based on user preferences.

User's filter criteria: "${aiFilterCriteria}"

Your task: Analyze each YouTube video title below and determine if it should be HIDDEN based on the user's criteria.

Video titles to analyze:
${titlesArray.map((title, index) => `${index + 1}. ${title}`).join("\n")}

Instructions:
- Respond with ONLY "HIDE" or "SHOW" for each title (one per line)
- Be precise - only hide videos that clearly match the user's filtering criteria
- Consider the context and intent of the user's filter
- If unsure, default to "SHOW" to avoid over-filtering
- Maintain the exact same order as the input titles

Response format (one decision per line, same order as titles):`;
    console.log(`\u{1F310} Making AI API call for ${titlesArray.length} titles with criteria: "${aiFilterCriteria}"`);
    console.log("\u{1F4DD} Prompt being sent:", prompt.substring(0, 200) + "...");
    const defaultApiKey = "";
    const keyToUse = apiKey || defaultApiKey;
    console.log(`\u{1F511} Using ${apiKey ? "user-provided" : "default"} API key`);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1e3
        }
      })
    });
    console.log("\u{1F4E1} API Response status:", response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("\u274C API Error response:", errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    console.log("\u{1F4E6} Raw API response:", data);
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error("\u274C No response text in API response:", data);
      throw new Error("No response text received from API");
    }
    console.log("\u{1F4C4} AI Response text:", responseText);
    const results = responseText.trim().split("\n").map((line) => line.trim().toUpperCase());
    console.log("\u{1F50D} Parsed results array:", results);
    const analysisResults = {};
    titlesArray.forEach((title, index) => {
      const shouldHide = results[index] === "HIDE";
      analysisResults[title] = shouldHide;
      console.log(`\u{1F4F9} Title: "${title}" -> ${shouldHide ? "\u274C HIDE" : "\u2705 SHOW"}`);
    });
    console.log(`\u2705 AI Analysis completed:`, analysisResults);
    return analysisResults;
  } catch (error) {
    console.error("\u{1F4A5} AI analysis failed:", error);
    console.error("\u{1F4A5} Error stack:", error.stack);
    const errorResults = {};
    titles.forEach((title) => {
      errorResults[title] = false;
    });
    console.log("\u{1F504} Returning error results:", errorResults);
    return errorResults;
  }
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("\u{1F4E8} Message received in background script:", request);
  if (request.type === "ANALYZE_TITLES_BATCH") {
    console.log("\u{1F3AF} Processing ANALYZE_TITLES_BATCH request");
    const titles = request.titles || [];
    console.log("\u{1F4CB} Titles to analyze:", titles);
    chrome.storage.sync.get(["aiEnabled", "aiFilter", "geminiApiKey"], async (settings) => {
      console.log("\u2699\uFE0F Retrieved settings:", settings);
      if (!settings.aiEnabled || !settings.aiFilter) {
        console.log("\u26A0\uFE0F AI filtering disabled or no criteria set");
        sendResponse({
          results: {},
          aiEnabled: false
        });
        return;
      }
      console.log(`\u{1F50D} Analyzing ${titles.length} titles with AI filter: "${settings.aiFilter}"`);
      try {
        const results = await analyzeTitles(titles, settings.aiFilter, settings.geminiApiKey);
        console.log("\u2705 Sending successful response:", results);
        sendResponse({
          results,
          aiEnabled: true,
          aiFilter: settings.aiFilter
        });
      } catch (error) {
        console.error("\u{1F4A5} Analysis failed in message handler:", error);
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
  if (request.type === "TEST_BACKGROUND") {
    console.log("\u{1F9EA} Test message received");
    sendResponse({ success: true, message: "Background script is working!" });
  }
});
chrome.runtime.onInstalled.addListener(() => {
  console.log("\u{1F389} ItsMyFeed extension installed");
});
chrome.runtime.onStartup.addListener(() => {
  console.log("\u{1F504} ItsMyFeed Video Filter extension started");
});
console.log("\u2705 Background script setup complete - ready to receive messages");
