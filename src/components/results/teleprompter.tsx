"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Download,
  Pause,
  Play,
  RotateCcw,
  Square,
  Type,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPEEDS = [
  { id: "slow", label: "Медленно", ms: 120 },
  { id: "normal", label: "Норм", ms: 70 },
  { id: "fast", label: "Быстро", ms: 40 },
] as const;

type Mode = "read" | "record";

export function TeleprompterMode({
  title,
  script,
  onClose,
}: {
  title: string;
  script: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("record");
  const [playing, setPlaying] = useState(true);
  const [offset, setOffset] = useState(0);
  const [speedId, setSpeedId] =
    useState<(typeof SPEEDS)[number]["id"]>("normal");
  const speed = SPEEDS.find((s) => s.id === speedId) || SPEEDS[1];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setRecording(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraError(
        "Не удалось открыть камеру. Разреши доступ в настройках телефона или используй режим «Только текст».",
      );
      setCameraReady(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "record") {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  useEffect(() => {
    if (!playing || videoUrl) return;
    const id = window.setInterval(() => {
      setOffset((v) => v + 1);
    }, speed.ms);
    return () => window.clearInterval(id);
  }, [playing, speed.ms, videoUrl]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  function pickMimeType() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    setRecSeconds(0);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      setVideoUrl(URL.createObjectURL(blob));
      setPlaying(false);
    };

    recorderRef.current = recorder;
    recorder.start(250);
    setRecording(true);
    setOffset(0);
    setPlaying(true);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  async function shareOrDownload() {
    if (!videoUrl) return;
    const blob = await fetch(videoUrl).then((r) => r.blob());
    const file = new File([blob], `reelsfactory-${Date.now()}.webm`, {
      type: blob.type || "video/webm",
    });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title,
          text: "Ролик из ReelsFactory",
        });
        return;
      } catch {
        // user cancelled or share failed → download
      }
    }

    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = file.name;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#07080c] text-white">
      <div className="relative z-20 flex items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white/55">
            {mode === "record"
              ? "Суфлёр + камера · один телефон"
              : "Суфлёр · только текст"}
          </p>
          <h2 className="font-display mt-1 truncate text-base font-semibold">
            {title}
          </h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-white hover:bg-white/10"
          onClick={() => {
            stopCamera();
            onClose();
          }}
        >
          <X className="size-5" />
        </Button>
      </div>

      <div className="relative z-20 mx-4 mb-2 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("record");
            setOffset(0);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition",
            mode === "record" ? "bg-primary text-primary-foreground" : "text-white/70",
          )}
        >
          <Camera className="size-3.5" /> Снимать здесь
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("read");
            setOffset(0);
            setVideoUrl(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition",
            mode === "read" ? "bg-card text-foreground" : "text-white/70",
          )}
        >
          <Type className="size-3.5" /> Только текст
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {mode === "record" && (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />
            {recording && (
              <div className="absolute left-4 top-3 z-20 flex items-center gap-2 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                REC {formatTime(recSeconds)}
              </div>
            )}
          </>
        )}

        {mode === "read" && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-[#07080c] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-[#07080c] to-transparent" />
          </>
        )}

        {!videoUrl && (
          <>
            <div
              className={cn(
                "pointer-events-none absolute inset-x-6 z-10 h-px",
                mode === "record" ? "top-[38%] bg-white/50" : "top-[42%] bg-primary/70",
              )}
            />
            <div
              className={cn(
                "relative z-10 h-full overflow-hidden px-5",
                mode === "record" && "pt-[18%]",
              )}
            >
              <div
                className={cn(
                  "whitespace-pre-wrap text-center font-medium leading-[1.45] transition-transform",
                  mode === "record"
                    ? "text-[1.35rem] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                    : "text-[1.75rem] text-white",
                )}
                style={{ transform: `translateY(${120 - offset}px)` }}
              >
                {script}
              </div>
            </div>
          </>
        )}

        {videoUrl && (
          <div className="absolute inset-0 z-20 flex flex-col bg-black">
            <video
              src={videoUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          </div>
        )}

        {cameraError && mode === "record" && !videoUrl && (
          <div className="absolute inset-x-4 top-1/3 z-30 rounded-2xl bg-black/80 p-4 text-center text-sm leading-6">
            {cameraError}
          </div>
        )}
      </div>

      <div className="relative z-20 space-y-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        {!videoUrl && (
          <div className="flex gap-2">
            {SPEEDS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSpeedId(item.id)}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition",
                  speedId === item.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/15 bg-white/5 text-white/80",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {videoUrl ? (
          <div className="grid gap-2">
            <Button
              className="h-12 bg-white text-black hover:bg-white/90"
              onClick={() => void shareOrDownload()}
            >
              <Download className="size-4" />
              Сохранить / отправить в Reels
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={() => {
                setVideoUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                setOffset(0);
                setPlaying(true);
                if (mode === "record") void startCamera();
              }}
            >
              <RotateCcw className="size-4" />
              Переснять
            </Button>
          </div>
        ) : mode === "record" ? (
          <div className="flex items-center justify-center gap-3">
            {!recording ? (
              <Button
                size="lg"
                className="min-w-44 bg-primary"
                disabled={!cameraReady}
                onClick={startRecording}
              >
                <span className="size-3 rounded-full bg-white" />
                Запись
              </Button>
            ) : (
              <Button
                size="lg"
                className="min-w-44 bg-white text-black hover:bg-white/90"
                onClick={stopRecording}
              >
                <Square className="size-4 fill-current" />
                Стоп
              </Button>
            )}
            <Button
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={() => {
                setOffset(0);
                setPlaying(true);
              }}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              className="min-w-36 bg-white text-black hover:bg-white/90"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <>
                  <Pause className="size-4" /> Пауза
                </>
              ) : (
                <>
                  <Play className="size-4" /> Старт
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={() => {
                setOffset(0);
                setPlaying(true);
              }}
            >
              <RotateCcw className="size-4" />
              Сначала
            </Button>
          </div>
        )}

        {mode === "record" && !videoUrl && (
          <p className="text-center text-[12px] leading-5 text-white/55">
            Текст виден только тебе на экране. После записи сохрани ролик и
            выложи в Instagram / TikTok.
          </p>
        )}
      </div>
    </div>
  );
}

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
