// ====================================
// checkAudioSizes.js - Check audio file sizes
// ====================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Get file size and format from URL
 */
async function getFileInfo(url) {
  try {
    const response = await axios({
      method: 'HEAD',
      url: url,
      timeout: 10000
    });
    
    const sizeBytes = parseInt(response.headers['content-length'] || 0);
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    
    // Detect format from URL
    const format = url.match(/\.(mp3|mp4|wav|m4a)$/i)?.[1]?.toUpperCase() || 'UNKNOWN';
    
    return {
      bytes: sizeBytes,
      mb: parseFloat(sizeMB),
      format: format,
      ok: sizeBytes > 0 && sizeBytes < 25 * 1024 * 1024 // Under 25MB
    };
  } catch (error) {
    return { 
      error: error.message,
      mb: 0,
      format: 'ERROR',
      ok: false
    };
  }
}

/**
 * Check all podcasts
 */
async function checkAllPodcasts() {
  console.log('🔍 Checking audio file sizes and formats...\n');
  
  // Load podcasts
  const dataPath = path.join(__dirname, '..', 'data', 'podcasts_detailed.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ podcasts_detailed.json not found!');
    return;
  }
  
  const podcasts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log(`Found ${podcasts.length} podcasts\n`);
  console.log('='.repeat(90));
  console.log('Episode | Format | Size (MB) | Status    | Title');
  console.log('='.repeat(90));
  
  const suitablePodcasts = [];
  const stats = {
    total: podcasts.length,
    noAudio: 0,
    suitable: 0,
    tooBig: 0,
    byFormat: {}
  };
  
  for (const podcast of podcasts) {
    const episodeNum = podcast.episodeNumber || '?';
    
    if (!podcast.audioUrl) {
      console.log(`#${episodeNum}`.padEnd(8) + '| N/A    | N/A       | ⚠️ NO URL | ' + podcast.title);
      stats.noAudio++;
      continue;
    }
    
    const info = await getFileInfo(podcast.audioUrl);
    
    // Update format stats
    stats.byFormat[info.format] = (stats.byFormat[info.format] || 0) + 1;
    
    if (info.error) {
      console.log(`#${episodeNum}`.padEnd(8) + `| ERROR  | N/A       | ❌ ERROR  | ${podcast.title}`);
    } else {
      const status = info.ok ? '✅ OK    ' : '❌ TOO BIG';
      const sizeStr = info.mb.toFixed(2).padStart(6);
      
      console.log(`#${episodeNum}`.padEnd(8) + `| ${info.format.padEnd(6)} | ${sizeStr}    | ${status} | ${podcast.title}`);
      
      if (info.ok) {
        suitablePodcasts.push({
          episode: podcast.episodeNumber,
          title: podcast.title,
          sizeMB: info.mb,
          format: info.format,
          audioUrl: podcast.audioUrl,
          duration: podcast.duration,
          transcript: podcast.transcript
        });
        stats.suitable++;
      } else {
        stats.tooBig++;
      }
    }
    
    // Small delay to be nice to server
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('='.repeat(90));
  
  // Print statistics
  console.log('\n📊 Statistics:');
  console.log('─'.repeat(50));
  console.log(`Total podcasts:        ${stats.total}`);
  console.log(`No audio URL:          ${stats.noAudio}`);
  console.log(`✅ Suitable (<25MB):   ${stats.suitable}`);
  console.log(`❌ Too big (>25MB):    ${stats.tooBig}`);
  console.log('\n📁 By format:');
  Object.entries(stats.byFormat).forEach(([format, count]) => {
    console.log(`  ${format.padEnd(10)}: ${count}`);
  });
  
  if (suitablePodcasts.length > 0) {
    console.log(`\n✅ Found ${suitablePodcasts.length} suitable podcasts for Whisper!\n`);
    
    // Save suitable podcasts
    const outputPath = path.join(__dirname, '..', 'data', 'suitable_podcasts.json');
    fs.writeFileSync(outputPath, JSON.stringify(suitablePodcasts, null, 2));
    console.log(`💾 Suitable podcasts saved to: ${outputPath}\n`);
    
    // Show first 10
    console.log('📋 First 10 suitable episodes:');
    console.log('─'.repeat(50));
    suitablePodcasts.slice(0, 10).forEach(p => {
      console.log(`  #${p.episode} - ${p.title}`);
      console.log(`    ${p.format} | ${p.sizeMB}MB | ${p.duration || 'N/A'}`);
    });
  } else {
    console.log('\n❌ No suitable podcasts found under 25MB!\n');
  }
}

// Run
checkAllPodcasts().catch(console.error);