"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFreeReelsDetail } from "@/hooks/useFreeReels";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function FreeReelsWatchPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const activeEpisodeId = params.episodeId as string;
  
  const [useProxy, setUseProxy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { data, isLoading, error } = useFreeReelsDetail(bookId);

  // Derived state
  const drama = data?.data;
  const episodes = useMemo(() => drama?.episodes || [], [drama]);
  
  const currentIndex = useMemo(() => {
    return episodes.findIndex((ep: any) => ep.id === activeEpisodeId);
  }, [episodes, activeEpisodeId]);

  const currentEpisodeData = useMemo(() => {
    if (currentIndex === -1) return episodes[0] || null;
    return episodes[currentIndex];
  }, [episodes, currentIndex]);

  // Auto-select H264 for best compatibility
  const currentVideoUrl = useMemo(() => {
      if (!currentEpisodeData) return "";
      // Always use H264, no UI for quality selection
      return currentEpisodeData.external_audio_h264_m3u8 || currentEpisodeData.videoUrl || "";
  }, [currentEpisodeData]);

  // Auto-play next episode when video ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < episodes.length) {
        const nextEpisode = episodes[nextIndex];
        router.push(`/watch/freereels/${bookId}/${nextEpisode.id}`);
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [currentIndex, episodes, bookId, router]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !drama) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <Link href="/" className="text-primary hover:underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Minimal back button only */}
      <div className="absolute top-0 left-0 z-40">
        <Link
          href={`/detail/freereels/${bookId}`}
          className="absolute top-4 left-4 p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10 z-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
      </div>

      {/* Main Video Area - Clean */}
      <div className="w-full h-full relative bg-black flex items-center justify-center">
        {currentVideoUrl ? (
          <video
            key={`${activeEpisodeId}`}
            ref={videoRef}
            src={useProxy ? `/api/proxy/video?url=${encodeURIComponent(currentVideoUrl)}` : currentVideoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
            poster={drama.cover}
            onError={(e) => {
                if (!useProxy) {
                    setUseProxy(true);
                }
            }}
            // @ts-ignore
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center z-20 flex-col gap-4">
             <p className="text-white/60">URL Video tidak ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}
