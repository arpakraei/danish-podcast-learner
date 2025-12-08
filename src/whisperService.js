// ====================================
// whisperService.js - OpenAI Whisper Integration
// ====================================

const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Download audio file from URL
 * @param {string} url - Audio file URL
 * @param {string} filename - Local filename to save
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadAudioFile(url, filename) {
  const filepath = path.join(__dirname, '..', 'temp', filename);
  
  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // Download file
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filepath));
    writer.on('error', reject);
  });
}

/**
 * Transcribe audio using OpenAI Whisper API
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<Object>} - Transcription with timestamps
 */
async function transcribeAudio(audioFilePath) {
  try {
    console.log('🔤 Sending audio to Whisper API...');
    
    // Call Whisper API with timestamp_granularities
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      language: "da", // Danish language
      response_format: "verbose_json", // Get detailed response with timestamps
      timestamp_granularities: ["segment"] // Get timestamps for segments
    });

    console.log('✅ Transcription completed!');
    return transcription;

  } catch (error) {
    console.error('❌ Whisper API Error:', error.message);
    throw error;
  }
}

/**
 * Process transcript into segments with timestamps
 * @param {Object} transcription - Raw Whisper response
 * @returns {Object} - Formatted segments
 */
function processTranscript(transcription) {
  const segments = transcription.segments || [];
  
  return {
    text: transcription.text,
    language: transcription.language,
    duration: transcription.duration,
    segments: segments.map(segment => ({
      id: segment.id,
      start: segment.start,
      end: segment.end,
      text: segment.text.trim()
    }))
  };
}

/**
 * Clean up temporary audio file
 * @param {string} filepath - Path to file
 */
function cleanupFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('🗑️ Temporary file deleted:', filepath);
    }
  } catch (error) {
    console.error('Warning: Could not delete temp file:', error.message);
  }
}

/**
 * Main function: Download, transcribe, and process audio
 * @param {string} audioUrl - URL of audio file
 * @param {string} podcastId - Unique podcast identifier
 * @returns {Promise<Object>} - Processed transcript with timestamps
 */
async function processAudioWithWhisper(audioUrl, podcastId) {
  let tempFilePath = null;

  try {
    // Step 1: Download audio file
    console.log('⬇️ Downloading audio file...');
    const filename = `podcast_${podcastId}_${Date.now()}.mp4`;
    tempFilePath = await downloadAudioFile(audioUrl, filename);
    console.log('✅ Audio downloaded:', tempFilePath);

    // Step 2: Transcribe with Whisper
    const transcription = await transcribeAudio(tempFilePath);

    // Step 3: Process and format the result
    const processedData = processTranscript(transcription);

    // Step 4: Cleanup
    cleanupFile(tempFilePath);

    return processedData;

  } catch (error) {
    // Cleanup on error
    if (tempFilePath) {
      cleanupFile(tempFilePath);
    }
    throw error;
  }
}

module.exports = {
  processAudioWithWhisper
};