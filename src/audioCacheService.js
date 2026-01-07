// ====================================
// audioCacheService.js
// Responsible for downloading & caching podcast audio
// ====================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");

/**
 * Ensure podcast audio exists locally.
 * If not, download and save it.
 *
 * @param {number|string} podcastId
 * @param {string} remoteAudioUrl
 * @returns {Promise<string>} local audio URL (served by Express)
 */
async function ensurePodcastAudio(podcastId, remoteAudioUrl) {
  // ===== START =====

  const audioDir = path.join(__dirname, "..", "data", "audio");

  // Ensure directory exists
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const localFileName = `podcast_${podcastId}.mp3`;
  const localFilePath = path.join(audioDir, localFileName);

  // If file already exists → return local URL
  if (fs.existsSync(localFilePath)) {
    console.log(`📦 Audio cache HIT for podcast ${podcastId}`);
    return `/audio/${localFileName}`;
  }

  console.log(`⬇️ Audio cache MISS → downloading podcast ${podcastId}`);

  // Download audio stream
  const response = await axios({
    method: "GET",
    url: remoteAudioUrl,
    responseType: "stream",
    timeout: 60_000
  });

  // Save stream to file
  const writer = fs.createWriteStream(localFilePath);

  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(`✅ Audio downloaded & cached: ${localFileName}`);

  return `/audio/${localFileName}`;

  // ===== END =====
}

module.exports = {
  ensurePodcastAudio
};
