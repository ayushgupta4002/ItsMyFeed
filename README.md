# 🎬 ItsMyFeed - YouTube Video Filter Extension

<div align="center">
  <img src="public/logo.png" alt="ItsMyFeed Logo" width="128" height="128">
  
  **Smart content filtering for YouTube with AI-powered analysis**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://developer.chrome.com/docs/extensions/)
  [![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black.svg)](https://nextjs.org/)
</div>

---

## 🌟 Features

### 🎯 **Keyword Filtering**
- **Instant filtering** based on video title keywords
- **Always active** - no need to enable/disable
- **Case-insensitive** matching
- **Real-time** video hiding as you browse

### 🤖 **AI-Powered Smart Filtering**
- **Gemini AI integration** for intelligent content analysis
- **Natural language descriptions** - describe what you want to filter

### 📊 **Hidden Videos Tracking**
- **Real-time counter** of hidden videos
- **Quick access** to hidden content when needed

### ⚡ **Performance Optimized**
- **Pre-filtering system** - videos hidden before display
- **Minimal impact** on YouTube's performance
- **Smart caching** to reduce API calls
- **Efficient DOM processing** with WeakSet tracking

---

## 🚀 Installation

### Option 1: Install from Chrome Web Store (Recommended)
*Coming soon - extension pending review*

### Option 2: Manual Installation (Developer Mode)

1. **Download or Clone** this repository:
   ```bash
   git clone https://github.com/ayushgupta4002/ItsMyFeed.git
   cd ItsMyFeed
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   ```bash
   npm run build:extension
   ```

4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `dist` folder from the project directory

5. **Pin the Extension** (optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Pin "ItsMyFeed" for easy access

---

## 🎮 How to Use

### 🔧 **Initial Setup**

1. **Click the extension icon** while on YouTube
2. **Set up Gemini API Key** (optional but recommended):
   - Expand the "Gemini API Key Setup" section
   - Get a free API key from [Google AI Studio](https://aistudio.google.com/)
   - Enter your API key
   - **Why use your own key?** Better reliability, no rate limits, your data stays private

### 📝 **Configure Keyword Filtering**

1. **Expand "Keyword Filtering"** section
2. **Enter keywords** separated by commas:
   ```
    drama, reaction, gaming
   ```
3. **Keywords are case-insensitive** and match partial words
4. **Save settings** - filtering starts immediately

### 🧠 **Configure AI Smart Filtering**

1. **Expand "AI Smart Filtering"** section
2. **Toggle the switch** to enable AI filtering
3. **Describe content to filter** in natural language:
   - `"music videos and concerts"`
   - `"reaction videos and commentary"`
   - `"gaming streams and playthroughs"`
4. **Save settings** - AI analysis begins on new videos

### 📈 **Monitor Hidden Videos**

1. **Expand "Hidden Videos"** section to see:
   - **Total count** of hidden videos
   - **Recent hidden videos** with timestamps
   - **Direct links** to hidden content (click to open)

---

## 🔑 Gemini API Key Setup

### **Getting Your API Key**

1. **Visit** [Google AI Studio](https://aistudio.google.com/)
2. **Sign in** with your Google account
3. **Click "Get API Key"** in the top navigation
4. **Create new project** or select existing one
5. **Generate API key** - copy the key

---

## 🛠️ Development

### **Tech Stack**

- **Frontend**: Next.js 15.3.3 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **AI Integration**: Google Gemini API via `@google/genai`

### **Project Structure**

```
my-yt-filter-extension/
├── src/
│   ├── app/popup/page.tsx      # Main popup interface
│   ├── popup-entry.tsx         # Popup entry point
│   └── types/chrome.d.ts       # Chrome API types
├── content.js                  # Content script (YouTube integration)
├── background.js               # Service worker
├── popup.html                  # Popup HTML template
├── manifest.json               # Extension manifest
├── build.js                    # Custom build script
└── dist/                       # Built extension files
```

### **Development Commands**

```bash
# Install dependencies
npm install

# Start Next.js development server (for popup UI)
npm run dev

# Build extension for testing
npm run build:extension

```

### **Building for Production**

```bash
# Build everything
npm run build:extension

# Files will be generated in /dist directory
# Load /dist folder in Chrome for testing
```

---

## 🔒 Privacy

### **Data Privacy**

- ✅ **All settings stored locally** in Chrome storage
- ✅ **No data sent to our servers**
- ✅ **API calls go directly to Google** (if using AI features)
- ✅ **No tracking or analytics**
- ✅ **Open source code** - verify what it does

---

## 🐛 Troubleshooting

### **Extension Not Working**

1. **Refresh YouTube** after installing/updating
2. **Check Developer Console** (F12) for errors
3. **Verify permissions** in `chrome://extensions/`
4. **Try disabling/re-enabling** the extension

### **AI Filtering Issues**

1. **Check API key format**
2. **Verify API key permissions** in Google Cloud Console
3. **Check rate limits** - wait a few minutes if exceeded
4. **Try simpler filter descriptions**

### **Videos Not Being Hidden**

1. **Check keyword spelling** and formatting
2. **Ensure keywords are comma-separated**
3. **Try refreshing the page**
4. **Check if video titles actually contain keywords**

---

## 🤝 Contributing

I welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** and test thoroughly
4. **Submit a pull request** with a clear description

### **Areas for Contribution**

- 🐛 Bug fixes and stability improvements
- ⚡ Performance optimizations
- 🎨 UI/UX enhancements
- 🌐 Internationalization (i18n)
- 🔧 Additional filtering options

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/ayushgupta4002/ItsMyFeed/issues)
- 💡 **Feature Requests**: [Start a New Feature](https://github.com/ayushgupta4002/ItsMyFeed/issues)
- 🐦 **X (Twitter)**: [@Ayush3241](https://x.com/Ayush3241)

---

<div align="center">
  <strong>Made with ❤️ for a better YouTube experience</strong>
  
  ⭐ **Star this repo** if it helps you filter your feed!
</div> 