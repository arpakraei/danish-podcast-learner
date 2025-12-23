// ====================================
// ttsService.js - ElevenLabs TTS
// ====================================

require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;

// 🇩🇰 best danish voice
const DANISH_VOICE_ID = "ADRrvIX3j1uTFlD5q6DE";  // Casper Dansk

async function generateSpeech(text) {
  try {
    console.log(`🧠 ElevenLabs request: "${text}" voice:${DANISH_VOICE_ID}`);

    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${DANISH_VOICE_ID}`,
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      data: {
        text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      },
      timeout: 30000,
    });

    return Buffer.from(response.data);

  } catch (error) {
    console.error("❌ ElevenLabs failed:", error.response?.status, error.response?.data);
    throw new Error("TTS failed: " + error.message);
  }
}

async function getSpeech(text) {

  const cacheDir = path.join(__dirname, "..", "data", "tts_cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const filename = text.toLowerCase().replace(/[^a-z0-9]/gi, "_") + ".mp3";
  const filePath = path.join(cacheDir, filename);

  if (fs.existsSync(filePath)) {
    console.log(`📦 cache hit → ${text}`);
    return fs.readFileSync(filePath);
  }

  const audio = await generateSpeech(text);
  fs.writeFileSync(filePath, audio);

  console.log(`💾 cached → ${text}`);
  return audio;
}

module.exports = { getSpeech };
