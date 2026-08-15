/** How many latest posts to ask Apify / RapidAPI for. */
export const SCRAPE_POSTS_LIMIT = 60;
/** Video rows kept for ranking / caption mining (Whisper still capped separately). */
export const CAPTION_VIDEOS_LIMIT = 16;
/** Max Whisper calls per analysis. */
export const WHISPER_MAX_VIDEOS = 3;
/** Stop spending after this many unusable transcripts in a row. */
export const WHISPER_GARBAGE_STREAK_STOP = 2;
/** Process/no-speech reels: how many videos get ffmpeg + vision OCR. */
export const VISION_MAX_VIDEOS = 2;
/** Frames sampled per video (early + mid). */
export const VISION_FRAMES_PER_VIDEO = 2;
/** Bump to invalidate scrape cache when the mapped profile shape changes. */
export const PROFILE_CACHE_VERSION = "v7-source";
