// ====================================
// batchWhisper.js - Batch Process Podcasts with Whisper
// ====================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { processAudioWithWhisper } = require('./whisperService');

/**
 * Load suitable podcasts
 */
function loadSuitablePodcasts() {
  const filepath = path.join(__dirname, '..', 'data', 'suitable_podcasts.json');
  
  if (!fs.existsSync(filepath)) {
    throw new Error('suitable_podcasts.json not found! Run checkAudioSizes.js first.');
  }
  
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

/**
 * Check if transcript already exists
 */
function transcriptExists(podcastId) {
  const transcriptPath = path.join(__dirname, '..', 'data', 'transcripts', `podcast_${podcastId}.json`);
  return fs.existsSync(transcriptPath);
}

/**
 * Save transcript
 */
function saveTranscript(podcastId, data) {
  const transcriptDir = path.join(__dirname, '..', 'data', 'transcripts');
  
  if (!fs.existsSync(transcriptDir)) {
    fs.mkdirSync(transcriptDir, { recursive: true });
  }
  
  const filepath = path.join(transcriptDir, `podcast_${podcastId}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

/**
 * Save progress log
 */
function saveProgress(processed, failed, skipped) {
  const logPath = path.join(__dirname, '..', 'data', 'whisper_progress.json');
  
  const progress = {
    lastUpdated: new Date().toISOString(),
    processed: processed,
    failed: failed,
    skipped: skipped,
    total: processed.length + failed.length + skipped.length
  };
  
  fs.writeFileSync(logPath, JSON.stringify(progress, null, 2));
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process podcasts with Whisper
 */
async function batchProcess(startIndex = 0, limit = 10) {
  console.log('\n' + '='.repeat(70));
  console.log('🎙️  BATCH WHISPER PROCESSING');
  console.log('='.repeat(70));
  
  // Load suitable podcasts
  const podcasts = loadSuitablePodcasts();
  console.log(`\n📚 Total suitable podcasts: ${podcasts.length}`);
  
  // Calculate range
  const endIndex = Math.min(startIndex + limit, podcasts.length);
  const toProcess = podcasts.slice(startIndex, endIndex);
  
  console.log(`📊 Processing range: ${startIndex + 1} to ${endIndex}`);
  console.log(`🔢 Will process: ${toProcess.length} podcasts\n`);
  
  // Estimate
  const estimatedMinutes = toProcess.length * 2;
  const estimatedCost = toProcess.length * 0.50;
  console.log(`⏰ Estimated time: ~${estimatedMinutes} minutes`);
  console.log(`💰 Estimated cost: ~$${estimatedCost.toFixed(2)}\n`);
  
  // Confirm
  console.log('Starting in 5 seconds... (Ctrl+C to cancel)');
  await delay(5000);
  
  // Process
  const processed = [];
  const failed = [];
  const skipped = [];
  
  for (let i = 0; i < toProcess.length; i++) {
    const podcast = toProcess[i];
    const current = startIndex + i + 1;
    
    console.log('\n' + '─'.repeat(70));
    console.log(`[${current}/${endIndex}] Processing: ${podcast.title}`);
    console.log(`Episode: #${podcast.episode} | Format: ${podcast.format} | Size: ${podcast.sizeMB}MB`);
    console.log('─'.repeat(70));
    
    // Check if already processed
    if (transcriptExists(podcast.episode)) {
      console.log('⏭️  SKIPPED: Transcript already exists');
      skipped.push(podcast.episode);
      continue;
    }
    
    try {
      // Process with Whisper
      const result = await processAudioWithWhisper(podcast.audioUrl, podcast.episode);
      
      // Save transcript
      saveTranscript(podcast.episode, result);
      
      console.log(`✅ SUCCESS: ${result.segments.length} segments processed`);
      processed.push(podcast.episode);
      
      // Save progress after each success
      saveProgress(processed, failed, skipped);
      
      // Delay between requests (respect rate limits)
      if (i < toProcess.length - 1) {
        console.log('\n⏳ Waiting 10 seconds before next request...');
        await delay(10000);
      }
      
    } catch (error) {
      console.error(`❌ FAILED: ${error.message}`);
      failed.push({
        episode: podcast.episode,
        error: error.message
      });
      
      // Save progress after failure
      saveProgress(processed, failed, skipped);
      
      // Longer delay after error
      if (i < toProcess.length - 1) {
        console.log('\n⏳ Waiting 30 seconds after error...');
        await delay(30000);
      }
    }
  }
  
  // Final report
  console.log('\n' + '='.repeat(70));
  console.log('📊 BATCH PROCESSING COMPLETED');
  console.log('='.repeat(70));
  console.log(`✅ Successfully processed: ${processed.length}`);
  console.log(`⏭️  Skipped (already exist): ${skipped.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed episodes:');
    failed.forEach(f => {
      console.log(`  #${f.episode}: ${f.error}`);
    });
  }
  
  console.log('\n💾 Progress saved to: data/whisper_progress.json');
  console.log('📂 Transcripts saved to: data/transcripts/');
  console.log('='.repeat(70) + '\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let startIndex = 0;
  let limit = 10;
  
  if (args.includes('--all')) {
    limit = 999; // Process all
  } else if (args.includes('--limit')) {
    const limitIndex = args.indexOf('--limit');
    limit = parseInt(args[limitIndex + 1]) || 10;
  }
  
  if (args.includes('--start')) {
    const startArgIndex = args.indexOf('--start');
    startIndex = parseInt(args[startArgIndex + 1]) || 0;
  }
  
  try {
    await batchProcess(startIndex, limit);
  } catch (error) {
    console.error('\n❌ Batch processing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  batchProcess
};