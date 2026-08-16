/** How many latest posts to ask Apify for. Keep modest — one profile ping is enough. */
export const SCRAPE_POSTS_LIMIT = 12;
/** Video rows kept for ranking / caption mining (Whisper still capped separately). */
export const CAPTION_VIDEOS_LIMIT = 8;
/** Max Whisper calls per analysis. */
export const WHISPER_MAX_VIDEOS = 3;
