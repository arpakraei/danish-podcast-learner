// ============================================
// progressController.js
// Central decision engine for podcast learning
// ============================================

/**
 * 🎯 Main Progress Controller
 * @param {Object} progress - user progress for ONE podcast
 * @returns {Object} UI permissions + feedback
 */
function progressController(progress) {

    // ===============================
    // 🧠 Safety defaults
    // ===============================
    const safeProgress = progress || {};
  
    const firstListenCompleted = !!safeProgress.firstListenCompleted;
    const secondListenCompleted = !!safeProgress.secondListenCompleted;
  
    const quizACompleted = !!safeProgress.quizA?.completed;
    const quizBCompleted = !!safeProgress.quizB?.completed;
  
    // ===============================
    // 🔓 Access rules
    // ===============================
  
    // Audio is ALWAYS allowed
    const canPlayAudio = true;
  
    // Transcript locked until first listen + quiz A
    const canSeeTranscript =
      firstListenCompleted && quizACompleted;
  
    // Translation is optional and friendly
    const canSeeTranslation =
      canSeeTranscript && secondListenCompleted;
  
    // Quiz availability
    const canTakeQuizA = firstListenCompleted;
    const canTakeQuizB = quizACompleted;
  
    // Next podcast rule (non-strict)
    const canGoNextPodcast =
      firstListenCompleted && quizACompleted;
  
    // ===============================
    // 💬 Feedback message engine
    // ===============================
    let message = "";
  
    if (!firstListenCompleted) {
      message = "🎧 فقط گوش بده، لازم نیست کاری بکنی 🙂";
    } 
    else if (firstListenCompleted && !quizACompleted) {
      message = "🧠 یک آزمون کوتاه داریم، فقط برای بازخورد";
    } 
    else if (quizACompleted && !secondListenCompleted) {
      message = "📖 حالا با متن دوباره گوش بده";
    } 
    else if (secondListenCompleted && !quizBCompleted) {
      message = "💪 اگر دوست داشتی، آزمون پیشرفته‌تر هم داریم";
    } 
    else if (quizBCompleted) {
      message = "🌟 عالی بود! آماده‌ی پادکست بعدی هستی";
    }
  
    // ===============================
    // 🧾 Final decision object
    // ===============================
    return {
      canPlayAudio,
      canSeeTranscript,
      canSeeTranslation,
      canTakeQuizA,
      canTakeQuizB,
      canGoNextPodcast,
      message
    };
  }
  
  // ============================================
  // 🔚 Export
  // ============================================
  module.exports = {
    progressController
  };
  