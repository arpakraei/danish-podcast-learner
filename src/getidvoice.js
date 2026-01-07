// listVoices.js
require('dotenv').config();
const axios = require('axios');

async function listVoices() {
  try {
    const res = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });

    console.log("\n📢 Available Voices in YOUR ElevenLabs account:\n");
    res.data.voices.forEach(v => {
      console.log(`• ${v.name} → ${v.voice_id}   | Langs: ${v.language_codes?.join(', ') || 'N/A'}`);
    });

    console.log("\n⚙️ Total voices:", res.data.voices.length);
    
  } catch (err) {
    console.error("❌ Failed fetching voices:", err.response?.status, err.response?.data || err.message);
  }
}

listVoices();
