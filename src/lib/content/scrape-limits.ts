/** How many latest posts to ask Apify for. Keep modest — one profile ping is enough. */
export const SCRAPE_POSTS_LIMIT = 12;
/** Video rows kept for ranking / caption mining (Whisper still capped separately). */
export const CAPTION_VIDEOS_LIMIT = 8;
/** Max Whisper calls per analysis. Never transcribe the whole grid. */
export const WHISPER_MAX_VIDEOS = 3;

export function whisperSourceUrl(video: {
  audioUrl?: string;
  videoUrl?: string;
}) {
  const audio = (video.audioUrl || "").trim();
  if (audio) return audio;
  const file = (video.videoUrl || "").trim();
  return file || undefined;
}

/** Top-N videos for Whisper. Captions on the rest still go to the LLM. */
export function videosForWhisper<
  T extends { audioUrl?: string; videoUrl?: string },
>(videos: T[] | undefined | null): T[] {
  const list = videos || [];
  const withMedia = list.filter((video) => Boolean(whisperSourceUrl(video)));
  const source = withMedia.length > 0 ? withMedia : list;
  return source.slice(0, WHISPER_MAX_VIDEOS);
}
