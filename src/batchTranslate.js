// ====================================
// batchTranslate.js - Batch Translate Podcasts
// ====================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { translatePodcast, loadTranslation } = require('./translationService');

/**
 * Get list of transcribed podcasts
 */
function getTranscribedPodcasts() {
  const transcriptDir = path.join(__dirname, '..', 'data', 'transcripts');
  
  if (!fs.existsSync(transcriptDir)) {
    return [];
  }
  
  const files = fs.readdirSync(transcriptDir);
  
  return files
    .filter(f => f.startsWith('podcast_') && f.endsWith('.json'))
    .map(f => {
      const match = f.match(/podcast_(\d+)\.json/);
      return match ? parseInt(match[1]) : null;
    })
    .filter(id => id !== null)
    .sort((a, b) => a - b);
}

/**
 * Save progress
 */
function saveProgress(translated, failed, skipped) {
  const logPath = path.join(__dirname, '..', 'data', 'translation_progress.json');
  
  const progress = {
    lastUpdated: new Date().toISOString(),
    translated: translated,
    failed: failed,
    skipped: skipped,
    total: translated.length + failed.length + skipped.length
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
 * Batch translate podcasts
 */
async function batchTranslate(startIndex = 0, limit = 10) {
  console.log('\n' + '='.repeat(70));
  console.log('🌐 BATCH TRANSLATION');
  console.log('='.repeat(70));
  
  // Get transcribed podcasts
  const podcastIds = getTranscribedPodcasts();
  console.log(`\n📚 Found ${podcastIds.length} transcribed podcasts`);
  
  if (podcastIds.length === 0) {
    console.log('❌ No transcribed podcasts found!');
    console.log('💡 Run batchWhisper.js first to transcribe podcasts.');
    return;
  }
  
  // Calculate range
  const endIndex = Math.min(startIndex + limit, podcastIds.length);
  const toProcess = podcastIds.slice(startIndex, endIndex);
  
  console.log(`📊 Processing range: ${startIndex + 1} to ${endIndex}`);
  console.log(`🔢 Will translate: ${toProcess.length} podcasts\n`);
  
  // Estimate
  const estimatedMinutes = toProcess.length * 3; // ~3 min per podcast
  const estimatedCost = toProcess.length * 0.15; // ~$0.15 per podcast
  console.log(`⏰ Estimated time: ~${estimatedMinutes} minutes`);
  console.log(`💰 Estimated cost: ~$${estimatedCost.toFixed(2)}\n`);
  
  // Confirm
  console.log('Starting in 5 seconds... (Ctrl+C to cancel)');
  await delay(5000);
  
  // Process
  const translated = [];
  const failed = [];
  const skipped = [];
  
  for (let i = 0; i < toProcess.length; i++) {
    const podcastId = toProcess[i];
    const current = startIndex + i + 1;
    
    console.log('\n' + '─'.repeat(70));
    console.log(`[${current}/${endIndex}] Translating podcast #${podcastId}`);
    console.log('─'.repeat(70));
    
    // Check if already translated
    if (loadTranslation(podcastId)) {
      console.log('⏭️  SKIPPED: Translation already exists');
      skipped.push(podcastId);
      continue;
    }
    
    try {
      await translatePodcast(podcastId);
      
      console.log(`✅ SUCCESS: Podcast #${podcastId} translated`);
      translated.push(podcastId);
      
      // Save progress
      saveProgress(translated, failed, skipped);
      
      // Delay between requests
      if (i < toProcess.length - 1) {
        console.log('\n⏳ Waiting 5 seconds before next translation...');
        await delay(5000);
      }
      
    } catch (error) {
      console.error(`❌ FAILED: ${error.message}`);
      failed.push({
        podcastId: podcastId,
        error: error.message
      });
      
      // Save progress
      saveProgress(translated, failed, skipped);
      
      // Longer delay after error
      if (i < toProcess.length - 1) {
        console.log('\n⏳ Waiting 15 seconds after error...');
        await delay(15000);
      }
    }
  }
  
  // Final report
  console.log('\n' + '='.repeat(70));
  console.log('📊 BATCH TRANSLATION COMPLETED');
  console.log('='.repeat(70));
  console.log(`✅ Successfully translated: ${translated.length}`);
  console.log(`⏭️  Skipped (already exist): ${skipped.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed podcasts:');
    failed.forEach(f => {
      console.log(`  #${f.podcastId}: ${f.error}`);
    });
  }
  
  console.log('\n💾 Progress saved to: data/translation_progress.json');
  console.log('📂 Translations saved to: data/translations/');
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
    limit = 999;
  } else if (args.includes('--limit')) {
    const limitIndex = args.indexOf('--limit');
    limit = parseInt(args[limitIndex + 1]) || 10;
  }
  
  if (args.includes('--start')) {
    const startArgIndex = args.indexOf('--start');
    startIndex = parseInt(args[startArgIndex + 1]) || 0;
  }
  
  try {
    await batchTranslate(startIndex, limit);
  } catch (error) {
    console.error('\n❌ Batch translation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  batchTranslate
};