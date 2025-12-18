// ====================================
// server.js - Main Application Server
// ====================================

// 1️⃣ Import required libraries
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 2️⃣ Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// 3️⃣ Middleware configuration
app.use(cors()); // Enable CORS for frontend-backend communication
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public')); // Serve static files from 'public' folder

// 4️⃣ Helper function: Load podcasts from JSON
function loadPodcasts() {
  try {
    const dataPath = path.join(__dirname, 'data', 'podcasts_detailed.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(data);
    }
    console.warn('⚠️ podcasts_detailed.json not found, using test data');
    return getTestData();
  } catch (error) {
    console.error('❌ Error loading podcasts:', error.message);
    return getTestData();
  }
}

// 5️⃣ Helper function: Get test data (fallback)
function getTestData() {
  return [
    {
      episodeNumber: 39,
      id: 39,
      title: '#39 Danske juletraditioner',
      url: 'https://danskioererne.dk/index.php/podcast/39-danske-juletraditioner/',
      audioUrl: 'http://danskioererne.dk/wp-content/uploads/2022/12/59c4b26f0c45189c55e91ebf87d67f66.mp4',
      duration: '8:44',
      date: '06/12/2022',
      transcript: 'Hej, og velkommen til "Dansk i ørerne"...'
    }
  ];
}

// 6️⃣ Main route - Podcast list page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7️⃣ Player page route
app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// 8️⃣ API endpoint - Get podcast list
app.get('/api/podcasts', (req, res) => {
  try {
    const podcasts = loadPodcasts();
    
    // Format data for frontend
    const formatted = podcasts.map(p => ({
      id: p.episodeNumber || p.id,
      title: p.title,
      url: p.url,
      audioUrl: p.audioUrl || '',
      duration: p.duration || 'N/A',
      date: p.date
    }));
    
    console.log(`📋 Serving ${formatted.length} podcasts`);
    res.json(formatted);
    
  } catch (error) {
    console.error('❌ Error in /api/podcasts:', error);
    res.status(500).json({ error: 'Failed to load podcasts' });
  }
});

// 9️⃣ API endpoint - Get specific podcast details
app.get('/api/podcast/:id', (req, res) => {
  try {
    const podcastId = parseInt(req.params.id);
    const podcasts = loadPodcasts();
    
    // Find podcast by episode number
    const podcast = podcasts.find(p => 
      (p.episodeNumber === podcastId) || (p.id === podcastId)
    );
    
    if (!podcast) {
      return res.status(404).json({ 
        error: 'Podcast not found',
        message: `No podcast with ID ${podcastId}` 
      });
    }
    
    console.log(`🎧 Serving podcast: ${podcast.title}`);
    
    res.json({
      id: podcast.episodeNumber || podcast.id,
      title: podcast.title,
      text: podcast.transcript || 'متن در دسترس نیست',
      audioUrl: podcast.audioUrl,
      duration: podcast.duration,
      date: podcast.date,
      url: podcast.url
    });
    
  } catch (error) {
    console.error('❌ Error in /api/podcast/:id:', error);
    res.status(500).json({ error: 'Failed to load podcast details' });
  }
});

// 🔟 API endpoint - Whisper transcription
const { processAudioWithWhisper } = require('./src/whisperService');
const { loadTranslation } = require('./src/translationService');

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioUrl, podcastId } = req.body;

    if (!audioUrl || !podcastId) {
      return res.status(400).json({ 
        error: 'Missing required fields: audioUrl and podcastId' 
      });
    }

    console.log(`🎙️ Starting transcription for podcast ${podcastId}...`);
    
    // Check if we already have transcript with timestamps
    const transcriptPath = path.join(__dirname, 'data', 'transcripts', `podcast_${podcastId}.json`);
    
    if (fs.existsSync(transcriptPath)) {
      console.log(`✅ Using cached transcript for podcast ${podcastId}`);
      const cachedData = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
      
      // Check if translation exists
      const translation = loadTranslation(podcastId);
      if (translation) {
        cachedData.segments = translation.segments;
      }
      
      return res.json(cachedData);
    }
    
    // Process audio with Whisper
    const result = await processAudioWithWhisper(audioUrl, podcastId);
    
    // Save transcript for future use
    const transcriptDir = path.join(__dirname, 'data', 'transcripts');
    if (!fs.existsSync(transcriptDir)) {
      fs.mkdirSync(transcriptDir, { recursive: true });
    }
    fs.writeFileSync(transcriptPath, JSON.stringify(result, null, 2));
    
    console.log(`✅ Transcription completed and saved for podcast ${podcastId}`);
    res.json(result);

  } catch (error) {
    console.error('❌ Transcription error:', error);
    res.status(500).json({ 
      error: 'Transcription failed',
      message: error.message 
    });
  }
});

// 1️⃣1️⃣ Dictionary API endpoints
const { lookupWord, loadSavedWords, saveWord, unsaveWord } = require('./src/dictionaryService');

// Lookup word
app.post('/api/dictionary/lookup', async (req, res) => {
  try {
    const { word, context } = req.body;
    
    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }
    
    console.log(`🔍 Dictionary lookup: "${word}"`);
    const definition = await lookupWord(word, context);
    
    res.json(definition);
    
  } catch (error) {
    console.error('❌ Dictionary lookup error:', error);
    res.status(500).json({ 
      error: 'Lookup failed',
      message: error.message 
    });
  }
});

// Get saved words
app.get('/api/dictionary/saved', (req, res) => {
  try {
    const saved = loadSavedWords();
    res.json(saved);
  } catch (error) {
    console.error('❌ Error loading saved words:', error);
    res.status(500).json({ error: 'Failed to load saved words' });
  }
});

// Save word
app.post('/api/dictionary/save', (req, res) => {
  try {
    const { word, definition } = req.body;
    
    if (!word || !definition) {
      return res.status(400).json({ error: 'Word and definition are required' });
    }
    
    const result = saveWord(word, definition);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error saving word:', error);
    res.status(500).json({ error: 'Failed to save word' });
  }
});

// Remove saved word
app.delete('/api/dictionary/saved/:word', (req, res) => {
  try {
    const { word } = req.params;
    const result = unsaveWord(word);
    res.json(result);
  } catch (error) {
    console.error('❌ Error removing word:', error);
    res.status(500).json({ error: 'Failed to remove word' });
  }
});

// 1️⃣2️⃣ Start the server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║   🎉 Server Started Successfully!            ║
  ╚═══════════════════════════════════════════════╝
  
  🌐 URL: http://localhost:${PORT}
  📂 Static files: ./public
  📊 Data source: ./data/podcasts_detailed.json
  
  Available endpoints:
  • GET  /                    → Home page
  • GET  /player              → Player page
  • GET  /api/podcasts        → List all podcasts
  • GET  /api/podcast/:id     → Get podcast details
  • POST /api/transcribe      → Whisper transcription
  
  ✨ Ready to serve!
  `);
  
  // Check if data files exist
  const dataPath = path.join(__dirname, 'data', 'podcasts_detailed.json');
  if (!fs.existsSync(dataPath)) {
    console.warn(`
  ⚠️  WARNING: podcasts_detailed.json not found!
  📌 Run: node src/scraper.js
    `);
  }
});

// 1️⃣2️⃣ Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});