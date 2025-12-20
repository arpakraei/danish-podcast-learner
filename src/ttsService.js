// ====================================
// ttsService.js - Text-to-Speech Service (Microsoft Edge)
// ====================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Generate speech using Microsoft Edge TTS (Free!)
 * @param {string} text - Text to speak
 * @param {string} voice - Voice name
 * @returns {Promise<Buffer>} - Audio data
 */
async function generateSpeechEdge(text, voice = 'da-DK-ChristelNeural') {
  try {
    console.log(`🔊 Generating speech with Edge TTS: "${text}"`);
    
    // Edge TTS uses a simple REST API
    const response = await axios({
      method: 'GET',
      url: 'https://api.streamelements.com/kappa/v2/speech',
      params: {
        voice: voice,
        text: text
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const audioBuffer = Buffer.from(response.data);
    console.log(`✅ Speech generated successfully (${audioBuffer.length} bytes)`);
    
    return audioBuffer;
    
  } catch (error) {
    console.error('❌ Edge TTS Error:', error.message);
    throw new Error(`TTS generation failed: ${error.message}`);
  }
}

/**
 * Get cached audio or generate new
 * @param {string} text - Text to speak
 * @returns {Promise<Buffer>} - Audio data
 */
async function getSpeech(text) {
  // Create cache directory
  const cacheDir = path.join(__dirname, '..', 'data', 'tts_cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // Generate cache filename
  const sanitizedText = text.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
  const cacheFile = path.join(cacheDir, `${sanitizedText}.mp3`);
  
  // Check cache
  if (fs.existsSync(cacheFile)) {
    console.log(`📦 Cache hit for: "${text}"`);
    return fs.readFileSync(cacheFile);
  }
  
  // Generate new audio
  const audioBuffer = await generateSpeechEdge(text);
  
  // Save to cache
  fs.writeFileSync(cacheFile, audioBuffer);
  console.log(`💾 Cached audio for: "${text}"`);
  
  return audioBuffer;
}

/**
 * Available Danish voices (Microsoft Edge TTS)
 * All are free and unlimited!
 */
const EDGE_DANISH_VOICES = {
  'christel': {
    name: 'da-DK-ChristelNeural',
    gender: 'Female',
    description: 'Danish female voice - natural and clear'
  },
  'jeppe': {
    name: 'da-DK-JeppeNeural',
    gender: 'Male',
    description: 'Danish male voice - warm and friendly'
  }
};

module.exports = {
  generateSpeechEdge,
  getSpeech,
  EDGE_DANISH_VOICES
};