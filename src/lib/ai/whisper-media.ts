import { shouldUseMockAi } from "@/lib/ai/aitunnel";
import { WHISPER_MAX_VIDEOS } from "@/lib/content/scrape-limits";
import {
  isSocialWatchPage,
  looksLikeAudioMediaUrl,
  looksLikeVideoMediaUrl,
  whisperCandidateUrls,
} from "@/lib/content/whisper-url";

export const MAX_WHISPER_BYTES = 20 * 1024 * 1024;
const PROBE_HEAD_BYTES = 512;

export type WhisperRejectReason =
  | "oversized"
  | "html"
  | "wrong-format"
  | "download-failed"
  | "watch-page";

export type WhisperMediaDecision = {
  accept: boolean;
  reason?: WhisperRejectReason;
  bytes?: number;
  contentType?: string;
  kind?: "audio" | "video";
};

export type WhisperProbeFn = (url: string) => Promise<WhisperMediaDecision>;

export function mediaDownloadHeaders(url: string): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  };
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("tiktok")) {
      headers.Referer = "https://www.tiktok.com/";
    } else if (
      host.includes("instagram") ||
      host.includes("cdninstagram") ||
      host.includes("fbcdn")
    ) {
      headers.Referer = "https://www.instagram.com/";
    }
  } catch {
    // keep default UA
  }
  return headers;
}

export function parseByteLength(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

/** `bytes 0-511/21900000` → 21900000 */
export function parseContentRangeTotal(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = /\/(\d+)\s*$/.exec(value);
  if (!match) return undefined;
  return parseByteLength(match[1]);
}

export function exceedsWhisperLimit(bytes: number, limit = MAX_WHISPER_BYTES): boolean {
  return bytes > limit;
}

function isHtmlOrTextType(type: string): boolean {
  const value = type.toLowerCase();
  return (
    value.includes("text/html") ||
    value.includes("application/json") ||
    value.includes("text/plain") ||
    value.includes("application/xml") ||
    value.includes("text/xml")
  );
}

function isAudioType(type: string): boolean {
  const value = type.toLowerCase();
  return (
    value.startsWith("audio/") ||
    value.includes("audio/mpeg") ||
    value.includes("audio/mp4") ||
    value.includes("audio/wav") ||
    value.includes("audio/ogg") ||
    value.includes("audio/flac") ||
    value.includes("audio/aac")
  );
}

function isVideoType(type: string): boolean {
  const value = type.toLowerCase();
  return value.startsWith("video/") || value.includes("video/mp4") || value.includes("video/webm");
}

function sniffKind(bytes: Uint8Array | null | undefined): "audio" | "video" | "html" | "image" | "unknown" {
  if (!bytes || bytes.length < 3) return "unknown";
  const start = bytes.subarray(0, Math.min(bytes.length, 16));
  const asText = new TextDecoder("utf-8", { fatal: false }).decode(start).replace(/^\uFEFF/, "").trimStart();
  if (/^<!doctype\s+html/i.test(asText) || /^<html/i.test(asText) || /^<head/i.test(asText)) {
    return "html";
  }
  if (asText.startsWith("{") || asText.startsWith("[")) return "html";
  const b0 = bytes[0];
  const b1 = bytes[1];
  const b2 = bytes[2];
  if (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) return "audio"; // ID3
  if (b0 === 0xff && (b1 === 0xfb || b1 === 0xf3 || b1 === 0xf2 || b1 === 0xf1 || b1 === 0xf9)) {
    return "audio";
  }
  if (b0 === 0x4f && b1 === 0x67 && b2 === 0x67 && bytes[3] === 0x53) return "audio"; // OggS
  if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && bytes[3] === 0x46) return "audio"; // RIFF/WAV
  if (b0 === 0x66 && b1 === 0x4c && b2 === 0x61 && bytes[3] === 0x43) return "audio"; // fLaC
  if (bytes.length >= 12) {
    const box = new TextDecoder("latin1").decode(bytes.subarray(4, 8));
    if (box === "ftyp") return "video";
  }
  if (b0 === 0x1a && b1 === 0x45 && b2 === 0xdf) return "video"; // EBML / WebM
  if (b0 === 0xff && b1 === 0xd8) return "image";
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e) return "image";
  return "unknown";
}

export function decideWhisperMedia(input: {
  url: string;
  contentType?: string | null;
  contentLength?: number | null;
  headBytes?: Uint8Array | null;
}): WhisperMediaDecision {
  const url = (input.url || "").trim();
  const contentType = (input.contentType || "").split(";")[0]?.trim() || "";
  const bytes = input.contentLength ?? input.headBytes?.length;
  const sniffed = sniffKind(input.headBytes);

  if (!url || isSocialWatchPage(url)) {
    return { accept: false, reason: "watch-page", contentType, bytes };
  }
  if (typeof input.contentLength === "number" && exceedsWhisperLimit(input.contentLength)) {
    return {
      accept: false,
      reason: "oversized",
      bytes: input.contentLength,
      contentType,
    };
  }
  if (contentType && isHtmlOrTextType(contentType)) {
    return { accept: false, reason: "html", bytes, contentType };
  }
  if (sniffed === "html" || sniffed === "image") {
    return { accept: false, reason: sniffed === "html" ? "html" : "wrong-format", bytes, contentType };
  }
  if (sniffed === "audio" || isAudioType(contentType) || looksLikeAudioMediaUrl(url)) {
    return { accept: true, kind: "audio", bytes, contentType };
  }
  if (sniffed === "video" || isVideoType(contentType) || looksLikeVideoMediaUrl(url)) {
    return { accept: true, kind: "video", bytes, contentType };
  }
  return { accept: false, reason: "wrong-format", bytes, contentType };
}

function headerRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}

export async function readResponseCapped(
  res: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > maxBytes) {
      throw new Error(`Медиа слишком большое для Whisper (${buf.length} bytes)`);
    }
    return buf;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.length) continue;
    if (total + value.length > maxBytes) {
      await reader.cancel();
      throw new Error(`Медиа слишком большое для Whisper (${total + value.length} bytes)`);
    }
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function cancelBody(res: Response) {
  try {
    await res.body?.cancel();
  } catch {
    // already closed
  }
}

export async function probeWhisperUrl(
  url: string,
  opts?: { fetch?: typeof fetch; signal?: AbortSignal },
): Promise<WhisperMediaDecision> {
  if (isSocialWatchPage(url)) {
    return { accept: false, reason: "watch-page" };
  }
  const fetchFn = opts?.fetch || fetch;
  const headers = headerRecord(mediaDownloadHeaders(url));

  try {
    const head = await fetchFn(url, {
      method: "HEAD",
      headers,
      signal: opts?.signal,
      redirect: "follow",
    });
    if (head.ok) {
      const contentLength = parseByteLength(head.headers.get("content-length"));
      const contentType = head.headers.get("content-type");
      if (contentLength != null || (contentType && isHtmlOrTextType(contentType))) {
        await cancelBody(head);
        return decideWhisperMedia({ url, contentType, contentLength });
      }
      await cancelBody(head);
    } else {
      await cancelBody(head);
    }
  } catch {
    // CDN often blocks HEAD — Range GET next
  }

  try {
    const range = await fetchFn(url, {
      method: "GET",
      headers: { ...headers, Range: `bytes=0-${PROBE_HEAD_BYTES - 1}` },
      signal: opts?.signal,
      redirect: "follow",
    });
    if (!range.ok && range.status !== 206) {
      await cancelBody(range);
      return { accept: false, reason: "download-failed" };
    }
    const declared =
      parseContentRangeTotal(range.headers.get("content-range")) ??
      parseByteLength(range.headers.get("content-length"));
    if (declared != null && exceedsWhisperLimit(declared)) {
      await cancelBody(range);
      return {
        accept: false,
        reason: "oversized",
        bytes: declared,
        contentType: range.headers.get("content-type") || undefined,
      };
    }
    const headBytes = await readResponseCapped(range, PROBE_HEAD_BYTES);
    return decideWhisperMedia({
      url,
      contentType: range.headers.get("content-type"),
      contentLength: declared,
      headBytes,
    });
  } catch (error) {
    if (error instanceof Error && /слишком большое/i.test(error.message)) {
      return { accept: false, reason: "oversized" };
    }
    return { accept: false, reason: "download-failed" };
  }
}

export function fileFromWhisperBytes(
  bytes: Uint8Array,
  url: string,
  contentType?: string | null,
): File {
  const decision = decideWhisperMedia({
    url,
    contentType,
    contentLength: bytes.length,
    headBytes: bytes.subarray(0, 32),
  });
  if (!decision.accept) {
    if (decision.reason === "oversized") {
      throw new Error(`Медиа слишком большое для Whisper (${bytes.length} bytes)`);
    }
    throw new Error(`Whisper: неподходящий формат (${decision.reason || "wrong-format"})`);
  }
  const copy = bytes.slice();
  if (decision.kind === "video") {
    return new File([copy], "video.mp4", { type: contentType || "video/mp4" });
  }
  return new File([copy], "audio.mp3", { type: contentType || "audio/mpeg" });
}

export async function loadWhisperFile(
  url: string,
  opts?: { fetch?: typeof fetch; signal?: AbortSignal },
): Promise<File> {
  const fetchFn = opts?.fetch || fetch;
  const res = await fetchFn(url, {
    signal: opts?.signal,
    headers: mediaDownloadHeaders(url),
    redirect: "follow",
  });
  if (!res.ok) {
    await cancelBody(res);
    throw new Error(`Не удалось скачать аудио (${res.status})`);
  }
  const declared =
    parseContentRangeTotal(res.headers.get("content-range")) ??
    parseByteLength(res.headers.get("content-length"));
  if (declared != null && exceedsWhisperLimit(declared)) {
    await cancelBody(res);
    throw new Error(`Медиа слишком большое для Whisper (${declared} bytes)`);
  }
  const bytes = await readResponseCapped(res, MAX_WHISPER_BYTES);
  return fileFromWhisperBytes(bytes, url, res.headers.get("content-type"));
}

export async function pickWhisperUrlForVideo(
  video: { audioUrl?: string; videoUrl?: string },
  probe: WhisperProbeFn,
): Promise<string | undefined> {
  const candidates = whisperCandidateUrls(video);
  const accepted: Array<{ url: string; bytes: number; kind: "audio" | "video" }> = [];
  for (const url of candidates) {
    const decision = await probe(url);
    if (!decision.accept) continue;
    accepted.push({
      url,
      bytes: decision.bytes ?? Number.POSITIVE_INFINITY,
      kind: decision.kind || (looksLikeAudioMediaUrl(url) ? "audio" : "video"),
    });
  }
  if (!accepted.length) return undefined;
  accepted.sort((left, right) => {
    if (left.kind === "audio" && right.kind !== "audio") return -1;
    if (right.kind === "audio" && left.kind !== "audio") return 1;
    return left.bytes - right.bytes;
  });
  return accepted[0]?.url;
}

export async function selectWhisperSources<
  T extends { audioUrl?: string; videoUrl?: string },
>(
  videos: T[] | undefined | null,
  opts?: {
    probe?: WhisperProbeFn;
    max?: number;
    fetch?: typeof fetch;
    signal?: AbortSignal;
  },
): Promise<Array<{ video: T; url: string }>> {
  const max = opts?.max ?? WHISPER_MAX_VIDEOS;
  const list = videos || [];
  const probe: WhisperProbeFn =
    opts?.probe ||
    ((url) => probeWhisperUrl(url, { fetch: opts?.fetch, signal: opts?.signal }));

  if (shouldUseMockAi() && !opts?.probe) {
    const picked: Array<{ video: T; url: string }> = [];
    for (const video of list) {
      if (picked.length >= max) break;
      const url = whisperCandidateUrls(video)[0];
      if (!url) continue;
      picked.push({ video, url });
    }
    return picked;
  }

  const picked: Array<{ video: T; url: string }> = [];
  for (const video of list) {
    if (picked.length >= max) break;
    const url = await pickWhisperUrlForVideo(video, probe);
    if (!url) continue;
    picked.push({ video, url });
  }
  return picked;
}
