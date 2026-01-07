// ====================================
// keywordService.js - استخراج کلمات کلیدی پادکست‌ها
// ====================================

/**
 * 🧹 نرمال‌سازی متن دانمارکی
 * - حروف را کوچک می‌کند
 * - کاراکترهای غیر لازم را حذف می‌کند
 */
function normalizeText(text) {
    if (!text) return "";
    
    return text
      .toLowerCase()
      // حذف علامت‌ها (نقطه، ویرگول، ...)، به‌جز حروف æøå
      .replace(/[^a-zæøååäöéü0-9\s\-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  /**
   * ✂️ توکنایز متن به کلمات
   */
  function tokenize(text) {
    const normalized = normalizeText(text);
    if (!normalized) return [];
    return normalized.split(/\s+/).filter(Boolean);
  }
  
  /**
   * 🛑 لیست اولیه stopwordهای دانمارکی
   * (بعداً می‌توانیم گسترش یا از فایل جداگانه لود کنیم)
   */
  const DANISH_STOPWORDS = new Set([
    "og", "i", "jeg", "det", "at", "en", "den", "til", "er", "som", "på", "de",
    "med", "han", "af", "for", "ikke", "der", "var", "mig", "sig", "men",
    "et", "har", "om", "vi", "min", "havde", "ham", "hun", "nu", "over",
    "da", "fra", "du", "ud", "sin", "dem", "os", "op", "man", "hans",
    "hvor", "eller", "hvad", "skal", "selv", "her", "alle", "din", "bliver",
    "noget", "ville", "jo", "deres", "kunne", "være", "ind", "når",
    "kom", "noget", "kun", "mere", "godt", "nej", "ja"
  ]);
  
  /**
   * 🧮 تبدیل لیست کلمات به map فراوانی
   */
  function buildFrequencyMap(tokens) {
    const freq = new Map();
  
    for (const token of tokens) {
      // حذف stopwords و کلمات خیلی کوتاه
      if (token.length < 2) continue;
      if (DANISH_STOPWORDS.has(token)) continue;
  
      const count = freq.get(token) || 0;
      freq.set(token, count + 1);
    }
  
    return freq;
  }
  
  /**
   * ⭐ استخراج کلمات کلیدی از segments پادکست
   * @param {Array} segments - آرایه segmentها (هر segment شامل text)
   * @param {number} maxKeywords - حداکثر تعداد کلمات برگشتی
   * @returns {Array<{ word: string, count: number }>}
   */
  function extractKeywordsFromSegments(segments, maxKeywords = 30) {
    if (!Array.isArray(segments) || segments.length === 0) {
      return [];
    }
  
    // 1) ساخت متن کامل از تمام segmentها
    const fullText = segments
      .map((s) => s.text || "")
      .join(" ");
  
    // 2) توکنایز
    const tokens = tokenize(fullText);
  
    // 3) محاسبه فراوانی
    const freqMap = buildFrequencyMap(tokens);
  
    // 4) تبدیل map به آرایه و sort
    const freqArray = Array.from(freqMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  
    // 5) برگرداندن فقط top N
    return freqArray.slice(0, maxKeywords);
  }
  
  // 🚀 خروجی ماژول
  module.exports = {
    extractKeywordsFromSegments
  };
  
  // ====================================
  // END OF keywordService.js
  // ====================================
  