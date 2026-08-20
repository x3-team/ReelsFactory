/** URL-only Whisper gate. No fetch — size/format probe lives in whisper-media. */

export function isSocialWatchPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "tiktok.com" ||
      host === "www.tiktok.com" ||
      host === "m.tiktok.com" ||
      host === "vm.tiktok.com" ||
      host === "vt.tiktok.com"
    ) {
      return true;
    }
    if (host === "instagram.com" || host === "www.instagram.com") {
      return /\/(reel|p|tv)\//i.test(parsed.pathname);
    }
    return false;
  } catch {
    return true;
  }
}

export function isHttpMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return false;
  if (isSocialWatchPage(url)) return false;
  return true;
}

/** musicMeta.playUrl that is actually a video path — not audio. */
export function looksLikeVideoMediaUrl(url: string): boolean {
  const value = url.toLowerCase();
  if (/[?&]mime_type=audio/i.test(value) || /\/audio(\?|$)/i.test(value)) {
    return false;
  }
  return (
    /[?&]mime_type=video/i.test(value) ||
    /video_mp4/i.test(value) ||
    /\/video\/tos\//i.test(value) ||
    /\/video\//i.test(value) ||
    /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(value)
  );
}

export function looksLikeAudioMediaUrl(url: string): boolean {
  const value = url.toLowerCase();
  if (looksLikeVideoMediaUrl(value)) return false;
  return (
    /[?&]mime_type=audio/i.test(value) ||
    /audio_mpeg/i.test(value) ||
    /\/audio(\?|$)/i.test(value) ||
    /\.(mp3|m4a|wav|ogg|oga|flac|mpeg|aac)(\?|$)/i.test(value)
  );
}

export function isWhisperCandidateUrl(url: string): boolean {
  return isHttpMediaUrl(url);
}

/** Audio-looking first, then a smaller/other file URL. Watch pages dropped. */
export function whisperCandidateUrls(video: {
  audioUrl?: string;
  videoUrl?: string;
}): string[] {
  const seen = new Set<string>();
  const raw: string[] = [];
  for (const value of [video.audioUrl, video.videoUrl]) {
    const url = (value || "").trim();
    if (!url || seen.has(url) || !isWhisperCandidateUrl(url)) continue;
    seen.add(url);
    raw.push(url);
  }
  return raw.sort((left, right) => {
    const audioDelta =
      Number(looksLikeAudioMediaUrl(right)) - Number(looksLikeAudioMediaUrl(left));
    if (audioDelta !== 0) return audioDelta;
    return 0;
  });
}
