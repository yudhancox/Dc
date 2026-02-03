"use client";

import { useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFreeReelsDetail } from "@/hooks/useFreeReels";

export default function FreeReelsWatchPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const activeEpisodeId = params.episodeId as string;
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { data } = useFreeReelsDetail(bookId);

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

  // Auto-select H264 (tanpa pilihan quality)
  const currentVideoUrl = useMemo(() => {
    if (!currentEpisodeData) return "";
    // Selalu gunakan H264
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

  return (
    <div className="fixed inset-0 bg-black">
      {/* Hanya Video - TIDAK ADA UI LAINNYA */}
      {currentVideoUrl ? (
        <video
          ref={videoRef}
          src={currentVideoUrl}
          controls
          autoPlay
          className="w-full h-full object-contain"
          poster={drama?.cover}
          onError={(e) => {
            // Jika video gagal load, coba dengan proxy
            if (e.currentTarget.src === currentVideoUrl) {
              e.currentTarget.src = `/api/proxy/video?url=${encodeURIComponent(currentVideoUrl)}`;
            }
          }}
          // @ts-ignore
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/60">
          Video tidak tersedia
        </div>
      )}
    </div>
  );
}
