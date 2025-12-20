// ====================================
// translationService.js - Danish to Persian Translation
// ====================================

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Translate text from Danish to Persian using GPT
 * @param {string} danishText - Danish text to translate
 * @returns {Promise<string>} - Persian translation
 */
async function translateDanishToPersian(danishText) {
  try {
    console.log('🌐 Translating text to Persian...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Faster and cheaper than GPT-4
      messages: [
        {
          role: "system",
          content: `You are a professional Danish to Persian translator. 
Translate the following Danish text to Persian (Farsi).
Keep the translation natural and accurate.
Preserve any special formatting or line breaks.
Only provide the Persian translation, no explanations.`
        },
        {
          role: "user",
          content: danishText
        }
      ],
      temperature: 0.3 // Lower temperature for more consistent translations
    });

    const translation = completion.choices[0].message.content.trim();
    console.log('✅ Translation completed');
    
    return translation;

  } catch (error) {
    console.error('❌ Translation error:', error.message);
    throw error;
  }
}

/**
 * Translate segments with timestamps
 * @param {Array} segments - Array of transcript segments
 * @returns {Promise<Array>} - Segments with translations
 */
async function translateSegments(segments) {
  console.log(`🔄 Translating ${segments.length} segments...`);
  
  const translatedSegments = [];
  
  // Translate in batches to avoid rate limits
  const batchSize = 10;
  
  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(segments.length/batchSize)}`);
    
    // Combine batch for efficient translation
    const combinedText = batch.map((seg, idx) => `[${i + idx}] ${seg.text}`).join('\n');
    
    try {
      const translatedText = await translateDanishToPersian(combinedText);
      
      // Split back into segments
      const translatedLines = translatedText.split('\n');
      
      batch.forEach((segment, idx) => {
        // Find matching translated line
        const translatedLine = translatedLines.find(line => line.startsWith(`[${i + idx}]`));
        const translation = translatedLine 
          ? translatedLine.replace(/^\[\d+\]\s*/, '').trim()
          : '(ترجمه در دسترس نیست)';
        
        translatedSegments.push({
          ...segment,
          translation: translation
        });
      });
      
      // Delay between batches
      if (i + batchSize < segments.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ Error translating batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      
      // Add segments without translation on error
      batch.forEach(segment => {
        translatedSegments.push({
          ...segment,
          translation: '(خطا در ترجمه)'
        });
      });
    }
  }
  
  return translatedSegments;
}

/**
 * Save translation
 */
function saveTranslation(podcastId, translatedData) {
  const translationDir = path.join(__dirname, '..', 'data', 'translations');
  
  if (!fs.existsSync(translationDir)) {
    fs.mkdirSync(translationDir, { recursive: true });
  }
  
  const filepath = path.join(translationDir, `podcast_${podcastId}_fa.json`);
  fs.writeFileSync(filepath, JSON.stringify(translatedData, null, 2));
  
  console.log(`💾 Translation saved: ${filepath}`);
}

/**
 * Load translation if exists
 */
function loadTranslation(podcastId) {
  const filepath = path.join(__dirname, '..', 'data', 'translations', `podcast_${podcastId}_fa.json`);
  
  if (fs.existsSync(filepath)) {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  }
  
  return null;
}

/**
 * Main function: Translate podcast transcript
 */
async function translatePodcast(podcastId) {
  console.log('\n' + '='.repeat(70));
  console.log(`🌐 Translating Podcast #${podcastId}`);
  console.log('='.repeat(70));
  
  try {
    // Check if translation already exists
    const existingTranslation = loadTranslation(podcastId);
    if (existingTranslation) {
      console.log('✅ Translation already exists, loading from cache...');
      return existingTranslation;
    }
    
    // Load transcript
    const transcriptPath = path.join(__dirname, '..', 'data', 'transcripts', `podcast_${podcastId}.json`);
    
    if (!fs.existsSync(transcriptPath)) {
      throw new Error(`Transcript not found for podcast ${podcastId}`);
    }
    
    const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
    
    // Translate segments
    const translatedSegments = await translateSegments(transcript.segments);
    
    // Create translated data
    const translatedData = {
      ...transcript,
      segments: translatedSegments,
      translatedAt: new Date().toISOString()
    };
    
    // Save translation
    saveTranslation(podcastId, translatedData);
    
    console.log('✅ Translation completed successfully!');
    console.log('='.repeat(70) + '\n');
    
    return translatedData;
    
  } catch (error) {
    console.error('❌ Translation failed:', error.message);
    throw error;
  }
}

module.exports = {
  translateDanishToPersian,
  translatePodcast,
  loadTranslation
};