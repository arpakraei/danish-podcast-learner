// ====================================
// ttsService.js - Text-to-Speech Service (ElevenLabs)
// ====================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Generate speech using ElevenLabs
 * @param {string} text - Text to speak
 * @param {string} voiceId - Voice ID (default: Danish voice)
 * @returns {Promise<Buffer>} - Audio data
 */
async function generateSpeechElevenLabs(text, voiceId = 'ThT5KcBeYPX3keUQqHPh') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not found in environment variables');
  }
  
  try {
    console.log(`🔊 Generating speech with ElevenLabs: "${text}"`);
    
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      data: {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.5,
          style: 0,
          use_speaker_boost: false
        }
      },
      responseType: 'arraybuffer'
    });
    
    const audioBuffer = Buffer.from(response.data);
    console.log(`✅ Speech generated successfully (${audioBuffer.length} bytes)`);
    
    return audioBuffer;
    
  } catch (error) {
    console.error('❌ ElevenLabs Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid ElevenLabs API key');
    } else if (error.response?.status === 429) {
      throw new Error('ElevenLabs quota exceeded');
    }
    
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
  const audioBuffer = await generateSpeechElevenLabs(text);
  
  // Save to cache
  fs.writeFileSync(cacheFile, audioBuffer);
  console.log(`💾 Cached audio for: "${text}"`);
  
  return audioBuffer;
}

/**
 * Available ElevenLabs voices (multilingual)
 * These voices can speak Danish
 */
const ELEVENLABS_VOICES = {
  'dorothy': {
    id: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    description: 'Pleasant British female voice - works great with Danish'
  },
  'rachel': {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Young, calm American female - excellent for Danish'
  },
  'clyde': {
    id: '2EiwWnXFnvU5JabPnv8n',
    name: 'Clyde',
    description: 'Middle-aged American male - clear Danish pronunciation'
  },
  'george': {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    description: 'British male, mature and warm - good for Danish'
  }
};

module.exports = {
  generateSpeechElevenLabs,
  getSpeech,
  ELEVENLABS_VOICES
};