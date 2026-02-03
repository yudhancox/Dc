"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Hls from "hls.js";

interface VideoItem {
  url: string;
  encode: string;
  quality: number;
  bitrate: string;
}

interface EpisodeData {
  success: boolean;
  isLocked: boolean;
  videoList: VideoItem[];
}

interface DetailData {
  success: boolean;
  bookId: string;
  title: string;
  cover: string;
  totalEpisodes: number;
}

import { decryptData } from "@/lib/crypto";

async function fetchEpisode(bookId: string, episodeNumber: number): Promise<EpisodeData> {
  const response = await fetch(`/api/reelshort/watch?bookId=${bookId}&episodeNumber=${episodeNumber}`);
  if (!response.ok) {
    throw new Error("Failed to fetch episode");
  }
  const json = await response.json();
  if (json.data && typeof json.data === "string") {
    return decryptData(json.data);
  }
  return json;
}

async function fetchDetail(bookId: string): Promise<DetailData> {
  const response = await fetch(`/api/reelshort/detail?bookId=${bookId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch detail");
  }
  const json = await response.json();
  if (json.data && typeof json.data === "string") {
    return decryptData(json.data);
  }
  return json;
}

export default function ReelShortWatchPage() {
  const params = useParams<{ bookId: string }>();
  const searchParams = useSearchParams();
  const bookId = params.bookId;
  const router = useRouter();
  
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Get episode from URL
  useEffect(() => {
    const ep = searchParams.get("ep");
    if (ep) {
      setCurrentEpisode(parseInt(ep) || 1);
    }
  }, [searchParams]);

  // Fetch detail for title and episode count
  const { data: detailData } = useQuery({
    queryKey: ["reelshort", "detail", bookId],
    queryFn: () => fetchDetail(bookId || ""),
    enabled: !!bookId,
  });

  // Fetch episode video
  const { data: episodeData, isLoading, error } = useQuery({
    queryKey: ["reelshort", "episode", bookId, currentEpisode],
    queryFn: () => fetchEpisode(bookId || "", currentEpisode),
    enabled: !!bookId && currentEpisode > 0,
  });

  // Auto-select H264 for compatibility (clean, no UI)
  const getCurrentVideoUrl = useCallback(() => {
    if (!episodeData?.videoList?.length) return null;
    
    // Always prefer H264 for best compatibility
    const h264Video = episodeData.videoList.find(v => v.encode === "H264");
    return h264Video || episodeData.videoList[0];
  }, [episodeData]);

  // Load video source
  const loadVideo = useCallback((videoUrl: string) => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
      video.play().catch(() => {});
    }
  }, []);

  // Setup HLS player when episode data changes
  useEffect(() => {
    const currentVideo = getCurrentVideoUrl();
    if (!currentVideo || !videoRef.current) return;

    loadVideo(currentVideo.url);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [episodeData, getCurrentVideoUrl, loadVideo]);

  return (
    <main className="fixed inset-0 bg-black">
      {/* Only minimal back button - no title, no episode number */}
      <div className="absolute top-0 left-0 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <Link
            href={`/detail/reelshort/${bookId}`}
            className="absolute top-4 left-4 p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10 z-50"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Main Video Area - Clean, no overlays */}
      <div className="w-full h-full relative bg-black flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20">
            <AlertCircle className="w-10 h-10 text-destructive mb-4" />
            <p className="text-white mb-4">Gagal memuat video</p>
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {episodeData?.isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-center p-4 z-20">
            <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
            <p className="text-white text-lg font-medium mb-4">Episode ini terkunci</p>
            <Link
              href={`/detail/reelshort/${bookId}`}
              className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              Kembali ke Detail
            </Link>
          </div>
        )}

        {/* Video Player - Full screen, no controls overlay */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls={true} // Letakkan native controls saja
          playsInline
          autoPlay
          muted={false}
        />
      </div>
    </main>
  );
}
