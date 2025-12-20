// ====================================
// dictionaryService.js - Interactive Dictionary
// ====================================

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Load dictionary cache
 */
function loadDictionaryCache() {
  const cachePath = path.join(__dirname, '..', 'data', 'dictionary_cache.json');
  
  if (fs.existsSync(cachePath)) {
    const data = fs.readFileSync(cachePath, 'utf-8');
    return JSON.parse(data);
  }
  
  return {};
}

/**
 * Save to dictionary cache
 */
function saveToDictionaryCache(word, definition) {
  const cachePath = path.join(__dirname, '..', 'data', 'dictionary_cache.json');
  const cache = loadDictionaryCache();
  
  cache[word.toLowerCase()] = {
    ...definition,
    cachedAt: new Date().toISOString()
  };
  
  const dataDir = path.dirname(cachePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

/**
 * Lookup word using OpenAI
 */
async function lookupWordWithAI(word, context = '') {
  try {
    console.log(`🔍 Looking up word: "${word}"`);
    
    const prompt = context 
      ? `Translate this Danish word to Persian (Farsi) considering the context.

Word: "${word}"
Context: "${context}"

Provide the response in JSON format:
{
  "word": "the Danish word",
  "persian": "Persian translation",
  "pronunciation": "IPA pronunciation",
  "example": "a simple example sentence in Danish",
  "examplePersian": "Persian translation of example"
}`
      : `Translate this Danish word to Persian (Farsi).

Word: "${word}"

Provide the response in JSON format:
{
  "word": "the Danish word",
  "persian": "Persian translation",
  "pronunciation": "IPA pronunciation",
  "example": "a simple example sentence in Danish",
  "examplePersian": "Persian translation of example"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Danish-Persian dictionary. Always respond with valid JSON only, no other text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    const definition = JSON.parse(response);
    
    console.log(`✅ Definition found for "${word}"`);
    
    return definition;

  } catch (error) {
    console.error(`❌ Error looking up "${word}":`, error.message);
    throw error;
  }
}

/**
 * Main lookup function with caching
 */
async function lookupWord(word, context = '') {
  const normalizedWord = word.toLowerCase().trim();
  
  // Check cache first
  const cache = loadDictionaryCache();
  
  if (cache[normalizedWord]) {
    console.log(`📦 Cache hit for "${word}"`);
    return cache[normalizedWord];
  }
  
  // Not in cache, lookup with AI
  const definition = await lookupWordWithAI(word, context);
  
  // Save to cache
  saveToDictionaryCache(normalizedWord, definition);
  
  return definition;
}

/**
 * Load user's saved words
 */
function loadSavedWords() {
  const savedPath = path.join(__dirname, '..', 'data', 'saved_words.json');
  
  if (fs.existsSync(savedPath)) {
    const data = fs.readFileSync(savedPath, 'utf-8');
    return JSON.parse(data);
  }
  
  return [];
}

/**
 * Save a word to user's vocabulary list
 */
function saveWord(word, definition) {
  const savedPath = path.join(__dirname, '..', 'data', 'saved_words.json');
  const saved = loadSavedWords();
  
  // Check if already saved
  const existing = saved.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (existing) {
    return { message: 'Word already saved', saved: false };
  }
  
  saved.push({
    ...definition,
    savedAt: new Date().toISOString()
  });
  
  const dataDir = path.dirname(savedPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(savedPath, JSON.stringify(saved, null, 2));
  
  return { message: 'Word saved successfully', saved: true };
}

/**
 * Remove word from saved list
 */
function unsaveWord(word) {
  const savedPath = path.join(__dirname, '..', 'data', 'saved_words.json');
  let saved = loadSavedWords();
  
  const initialLength = saved.length;
  saved = saved.filter(w => w.word.toLowerCase() !== word.toLowerCase());
  
  fs.writeFileSync(savedPath, JSON.stringify(saved, null, 2));
  
  return {
    removed: initialLength > saved.length,
    message: initialLength > saved.length ? 'Word removed' : 'Word not found'
  };
}

module.exports = {
  lookupWord,
  loadSavedWords,
  saveWord,
  unsaveWord
};