// ====================================
// scraper.js - Podcast Data Scraper
// ====================================

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://danskioererne.dk';
const PODCAST_ARCHIVE_URL = `${BASE_URL}/index.php/podcast`;
const TOTAL_PAGES = 10; // صفحات 1 تا 10

/**
 * تابع اصلی: دریافت لیست کامل پادکست‌ها از تمام صفحات
 */
async function fetchAllPodcasts() {
  console.log('🚀 Starting podcast scraping...\n');
  
  const allPodcasts = [];
  
  // حلقه روی تمام صفحات (1 تا 10)
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    console.log(`📄 Scraping page ${page}/${TOTAL_PAGES}...`);
    
    try {
      const podcasts = await fetchPodcastsFromPage(page);
      allPodcasts.push(...podcasts);
      console.log(`✅ Found ${podcasts.length} podcasts on page ${page}\n`);
      
      // تاخیر کوتاه برای محترم بودن به سرور
      await delay(1000);
      
    } catch (error) {
      console.error(`❌ Error on page ${page}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Total podcasts found: ${allPodcasts.length}\n`);
  return allPodcasts;
}

/**
 * دریافت لیست پادکست‌ها از یک صفحه خاص
 */
async function fetchPodcastsFromPage(pageNumber) {
  const url = pageNumber === 1 
    ? `${PODCAST_ARCHIVE_URL}/` 
    : `${PODCAST_ARCHIVE_URL}/page/${pageNumber}/`;
  
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  const podcasts = [];
  
  // هر پادکست در یک article tag هست
  $('article').each((index, element) => {
    const title = $(element).find('h2 a').text().trim();
    const url = $(element).find('h2 a').attr('href');
    const date = $(element).find('.entry-meta time').text().trim();
    
    if (title && url) {
      // استخراج شماره اپیزود از عنوان
      const episodeMatch = title.match(/#(\d+)/);
      const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : null;
      
      podcasts.push({
        episodeNumber,
        title,
        url,
        date,
        scraped: false, // برای track کردن اینکه جزئیات گرفته شده یا نه
        audioUrl: null,
        transcript: null,
        duration: null
      });
    }
  });
  
  return podcasts;
}

/**
 * دریافت جزئیات کامل یک پادکست (متن، صوت، مدت زمان)
 */
async function fetchPodcastDetails(podcast) {
  console.log(`🔍 Fetching details for: ${podcast.title}`);
  
  try {
    const { data } = await axios.get(podcast.url);
    const $ = cheerio.load(data);
    
    // 1. دریافت لینک فایل صوتی
    const audioUrl = $('#audio-source').attr('src') || 
                     $('audio source').attr('src') ||
                     $('a[href*=".mp4"], a[href*=".mp3"]').attr('href');
    
    // 2. دریافت مدت زمان
    const durationText = $('.entry-content').text();
    const durationMatch = durationText.match(/Duration:\s*(\d+:\d+)/);
    const duration = durationMatch ? durationMatch[1] : null;
    
    // 3. دریافت متن کامل پادکست
    // متن معمولاً بعد از جمله "Du kan finde teksten til episoden..." شروع میشه
    let transcript = '';
    const paragraphs = $('.entry-content p');
    
    let startCollecting = false;
    paragraphs.each((i, elem) => {
      const text = $(elem).text().trim();
      
      // شروع جمع‌آوری متن بعد از پاراگراف خوش‌آمدگویی
      if (text.includes('Hej') || text.includes('velkommen')) {
        startCollecting = true;
      }
      
      if (startCollecting && text.length > 20) {
        transcript += text + '\n\n';
      }
    });
    
    return {
      ...podcast,
      audioUrl: audioUrl || null,
      transcript: transcript.trim(),
      duration: duration,
      scraped: true
    };
    
  } catch (error) {
    console.error(`❌ Error fetching details for ${podcast.title}:`, error.message);
    return podcast;
  }
}

/**
 * دریافت جزئیات تمام پادکست‌ها
 */
async function fetchAllPodcastDetails(podcasts, startFrom = 0, limit = null) {
  console.log('\n📝 Fetching detailed information...\n');
  
  const detailedPodcasts = [];
  const endIndex = limit ? Math.min(startFrom + limit, podcasts.length) : podcasts.length;
  
  for (let i = startFrom; i < endIndex; i++) {
    const podcast = podcasts[i];
    console.log(`[${i + 1}/${podcasts.length}] Processing: ${podcast.title}`);
    
    const detailed = await fetchPodcastDetails(podcast);
    detailedPodcasts.push(detailed);
    
    // تاخیر برای محترم بودن به سرور
    await delay(2000);
  }
  
  return detailedPodcasts;
}

/**
 * ذخیره داده‌ها در فایل JSON
 */
function savePodcastsToJSON(podcasts, filename = 'podcasts.json') {
  const dataDir = path.join(__dirname, '..', 'data');
  
  // ساخت پوشه data اگر وجود نداره
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filepath = path.join(dataDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(podcasts, null, 2), 'utf-8');
  console.log(`\n💾 Saved ${podcasts.length} podcasts to: ${filepath}`);
  
  return filepath;
}

/**
 * خواندن داده‌ها از فایل JSON
 */
function loadPodcastsFromJSON(filename = 'podcasts.json') {
  const filepath = path.join(__dirname, '..', 'data', filename);
  
  if (fs.existsSync(filepath)) {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  }
  
  return null;
}

/**
 * تابع کمکی: تاخیر
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * اسکریپت اصلی برای اجرای scraper
 */
async function main() {
  try {
    // مرحله 1: دریافت لیست اولیه پادکست‌ها
    console.log('='.repeat(50));
    console.log('STEP 1: Fetching podcast list from all pages');
    console.log('='.repeat(50) + '\n');
    
    const podcastList = await fetchAllPodcasts();
    
    // ذخیره لیست اولیه
    savePodcastsToJSON(podcastList, 'podcasts_list.json');
    
    // مرحله 2: دریافت جزئیات همه پادکست‌ها
    console.log('\n' + '='.repeat(50));
    console.log('STEP 2: Fetching detailed info for ALL podcasts');
    console.log('='.repeat(50) + '\n');
    
    const detailedPodcasts = await fetchAllPodcastDetails(podcastList, 0, null);
    
    // ذخیره داده‌های کامل
    savePodcastsToJSON(detailedPodcasts, 'podcasts_detailed.json');
    
    console.log('\n✅ Scraping completed successfully!');
    console.log('📂 Check the "data" folder for results.');
    
  } catch (error) {
    console.error('\n❌ Scraping failed:', error.message);
    process.exit(1);
  }
}

// اجرای اسکریپت اگر مستقیماً صدا زده بشه
if (require.main === module) {
  main();
}

// Export توابع برای استفاده در جاهای دیگه
module.exports = {
  fetchAllPodcasts,
  fetchPodcastDetails,
  fetchAllPodcastDetails,
  savePodcastsToJSON,
  loadPodcastsFromJSON
};