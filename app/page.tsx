"use client";

import { useState, useEffect, useRef, useMemo, useCallback, MouseEvent } from "react";
import { fetchVideoTitles } from "./actions";
import { motion, useScroll, useTransform } from "framer-motion";

type YouTubePlayerOptions = {
  height: string;
  width: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady: (event: { target: YouTubePlayerInstance }) => void;
    onStateChange: (event: {
      data: number;
      target: YouTubePlayerInstance;
    }) => void;
  };
};

type YouTubePlayerInstance = {
  getVideoData: () => { title: string; author?: string; video_id?: string };
  getDuration: () => number;
  getCurrentTime: () => number;
  getPlaylist: () => string[] | undefined;
  getPlaylistIndex: () => number;
  loadPlaylist: (options: {
    listType: string;
    list: string;
    index: number;
    suggestedQuality: string;
  }) => void;
  pauseVideo: () => void;
  playVideo: () => void;
  playVideoAt: (index: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  setShuffle: (shufflePlaylist: boolean) => void;
};

type YouTubePlayerConstructor = new (
  elementId: HTMLElement | string,
  options: YouTubePlayerOptions,
) => YouTubePlayerInstance;

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: YouTubePlayerConstructor;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        CUED: number;
      };
    };
  }
}

const playlistId = "PLIFmN68fmX8A";

export default function Home() {
  const [flash, setFlash] = useState(false);
  const [bluetoothStep, setBluetoothStep] = useState<
    "idle" | "pairing" | "found" | "done"
  >("idle");
  const [playerTrack, setPlayerTrack] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentVideoTitle, setCurrentVideoTitle] =
    useState("BLUETOOTH ERA MIX");
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const [isShuffle, setIsShuffle] = useState(false);
  const [playlistDrawerOpen, setPlaylistDrawerOpen] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [shareToast, setShareToast] = useState(false);
  const [volume, setVolume] = useState(72);
  const [currentVideoAuthor, setCurrentVideoAuthor] = useState<string | null>(
    null,
  );
  const [playlistVideoIds, setPlaylistVideoIds] = useState<string[]>([]);
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({});
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);

  const playlistItems = useMemo(
    () =>
      playlistVideoIds.map((id, index) => ({
        id,
        index,
        label: `TRACK ${String(index + 1).padStart(2, "0")}`,
        title:
          index === playerTrack
            ? currentVideoTitle
            : videoTitles[id] || `Track ${String(index + 1).padStart(2, "0")}`,
        artist:
          index === playerTrack && currentVideoAuthor
            ? currentVideoAuthor
            : "Honey Singh Classics",
        duration: videoDurations[id] || 0,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        active: index === playerTrack,
      })),
    [playlistVideoIds, playerTrack, currentVideoTitle, currentVideoAuthor, videoTitles, videoDurations],
  );

  useEffect(() => {
    if (playlistVideoIds.length === 0) return;
    
    // Find IDs we haven't fetched yet
    const missingIds = playlistVideoIds.filter((id) => !videoTitles[id]);
    if (missingIds.length > 0) {
      fetchVideoTitles(missingIds).then((results) => {
        if (results && results.length > 0) {
          setVideoTitles((prev) => {
            const nextMap = { ...prev };
            results.forEach((r) => {
              if (r && r.id && r.title) {
                // Remove some common YouTube suffixes if present
                nextMap[r.id] = r.title.replace(/\|.*/, '').replace(/\(Official Video\).*/i, '').trim();
              }
            });
            return nextMap;
          });
        }
      });
    }
  }, [playlistVideoIds]);

  const filteredPlaylistItems = useMemo(() => {
    const query = playlistSearch.toLowerCase().trim();
    if (!query) return playlistItems;
    return playlistItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.artist.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query),
    );
  }, [playlistItems, playlistSearch]);

  const currentThumbnail = playlistVideoIds[playerTrack]
    ? `https://i.ytimg.com/vi/${playlistVideoIds[playerTrack]}/hqdefault.jpg`
    : undefined;

  const handleShare = useCallback(async () => {
    const videoId = playlistVideoIds[playerTrack];
    if (!videoId) return;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  }, [playlistVideoIds, playerTrack]);

  const startBluetoothPulse = useCallback(() => {
    if (bluetoothStep !== "idle") return;
    setBluetoothStep("pairing");
    window.setTimeout(() => setBluetoothStep("found"), 1400);
    window.setTimeout(() => {
      setBluetoothStep("done");
      setFlash(true);
      window.setTimeout(() => setFlash(false), 140);
    }, 3200);
    window.setTimeout(() => setBluetoothStep("idle"), 5600);
  }, [bluetoothStep]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Do not intercept if the user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        startBluetoothPulse();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startBluetoothPulse]);

  useEffect(() => {
    const initializePlayer = () => {
      if (
        playerRef.current ||
        !playerContainerRef.current ||
        !window.YT?.Player
      ) {
        return;
      }

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        height: "0",
        width: "0",
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          listType: "playlist",
          list: playlistId,
          index: 0,
          origin: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
        },
        events: {
          onReady: (event: { target: YouTubePlayerInstance }) => {
            setPlayerReady(true);
            const player = event.target;
            setCurrentVideoTitle(
              player.getVideoData().title || "BLUETOOTH ERA MIX",
            );
            setDuration(player.getDuration() || 0);
            setPlaylistCount(player.getPlaylist()?.length ?? 0);
            setPlayerTrack(player.getPlaylistIndex() ?? 0);
          },
          onStateChange: (event: {
            data: number;
            target: YouTubePlayerInstance;
          }) => {
            const player = event.target;
            const YT = window.YT;
            if (!YT) return;

            if (event.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (
              event.data === YT.PlayerState.PAUSED ||
              event.data === YT.PlayerState.ENDED
            ) {
              setIsPlaying(false);
            }

            if (
              event.data === YT.PlayerState.CUED ||
              event.data === YT.PlayerState.PLAYING
            ) {
              setCurrentVideoTitle(
                player.getVideoData().title || "BLUETOOTH ERA MIX",
              );
              
              const currentDur = player.getDuration() || 0;
              setDuration(currentDur);
              if (currentDur > 0) {
                const id = player.getVideoData().video_id;
                if (id) {
                  setVideoDurations((prev) => prev[id] === currentDur ? prev : { ...prev, [id]: currentDur });
                }
              }
              
              setPlaylistCount(player.getPlaylist()?.length ?? 0);
              setPlayerTrack(player.getPlaylistIndex() ?? 0);
            }
          },
        },
      });
    };

    const handleApiReady = () => initializePlayer();

    if (window.YT?.Player) {
      initializePlayer();
    } else {
      const scriptId = "youtube-iframe-api";
      if (!document.getElementById(scriptId)) {
        const tag = document.createElement("script");
        tag.id = scriptId;
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = handleApiReady;
    }

    return () => {
      if (window.onYouTubeIframeAPIReady === handleApiReady) {
        window.onYouTubeIframeAPIReady = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (player?.getCurrentTime) {
        setCurrentTime(player.getCurrentTime());
        setDuration(player.getDuration() || 0);
      }
      if (player?.getPlaylist) {
        const playlistIds = player.getPlaylist() ?? [];
        setPlaylistVideoIds(playlistIds);
        setPlaylistCount(playlistIds.length);
        setPlayerTrack(player.getPlaylistIndex() ?? 0);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const loadPlaylistTrack = (index: number) => {
    const player = playerRef.current;
    if (!player) return;

    if (player.playVideoAt) {
      player.playVideoAt(index);
      setPlayerTrack(index);
      setIsPlaying(true);
      
      const videoId = playlistVideoIds[index];
      if (videoId && videoTitles[videoId]) {
        setCurrentVideoTitle(videoTitles[videoId]);
      } else {
        setCurrentVideoTitle("Loading...");
      }
    }
  };

  const switchTrack = (direction: "prev" | "next") => {
    const count = playlistCount || 8;
    if (isShuffle && direction === "next") {
      const randomIndex = Math.floor(Math.random() * count);
      loadPlaylistTrack(randomIndex);
    } else {
      const next = direction === "next" ? playerTrack + 1 : playerTrack - 1;
      const wrapped = (next + count) % count;
      loadPlaylistTrack(wrapped);
    }
  };

  const togglePlayback = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
    } else if (playerReady) {
      player.playVideo();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    const player = playerRef.current;
    if (player && player.setShuffle) {
      player.setShuffle(isShuffle);
    }
  }, [isShuffle]);

  const seekOnBar = (event: MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const target = event.currentTarget.getBoundingClientRect();
    const percent = Math.min(
      Math.max((event.clientX - target.left) / target.width, 0),
      1,
    );
    const seconds = percent * duration;
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(seconds, true);
    setCurrentTime(seconds);
  };

  const closePlaylist = () => setPlaylistDrawerOpen(false);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const { scrollYProgress } = useScroll();

  // Background animations (scale, darken, blur)
  const bgScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.04]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.3]);
  const bgFilter = useTransform(scrollYProgress, [0, 0.3], ["blur(0px)", "blur(12px)"]);

  // Hero Text animations
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.94]);

  return (
    <main className="relative min-h-[600vh] w-full bg-[#0a0503] text-[#f7f3eb] font-sans selection:bg-[#ff8eb6]/30">
      
      {/* 1. Cinematic Background & Hero - Fixed */}
      <div className="fixed inset-0 w-full h-[100svh] pointer-events-none z-0">
        <motion.div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 origin-center"
          style={{ 
            backgroundImage: `url('/yoyo-hero.png')`,
            scale: bgScale,
            opacity: bgOpacity,
            filter: bgFilter
          }}
        />
        
        {/* Sepia/Brown gradient overlay to match the nostalgic vibe */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0503] via-[#2d1b13]/40 to-[#0a0503]/80 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,5,3,0.8)_100%)] pointer-events-none z-0" />
        
        {/* Film grain effect */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }} />

        {/* Bluetooth Flash Effect */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 z-50 ${flash ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-0 bg-[#ffeedd]/30 backdrop-blur-sm" />
        </div>

        {/* Content Container (Fixed for Hero) */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-5xl mx-auto px-5 sm:px-8 pb-32">
          
          <motion.div 
            className="flex flex-col items-center text-center z-20"
            style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          >
            <h1 className="text-[clamp(2.8rem,8vw,5.5rem)] leading-[1] font-bold tracking-tight text-[#ffeedd] mb-4 drop-shadow-2xl">
              DESI KALAKAAR<br />MEMORIES
            </h1>
            <p className="text-[#ffeedd]/80 text-xl md:text-3xl max-w-2xl font-light tracking-wide mb-12">
              The songs we passed around.<br />
              The era we never forgot.
            </p>
            
            {/* Bluetooth Interaction */}
            <button 
              type="button"
              onClick={startBluetoothPulse}
              className="mt-10 px-6 py-2.5 rounded-full border border-[#ffeedd]/20 bg-[#2d1b13]/50 backdrop-blur-md text-xs tracking-[0.2em] font-medium text-[#ffeedd]/70 hover:text-[#ffeedd] hover:bg-[#2d1b13]/80 transition-all shadow-xl pointer-events-auto"
            >
              {bluetoothStep === "idle" && "BHAAI, GAANA BHEJ →"}
              {bluetoothStep === "pairing" && "DEVICE DHOONDH RAHA HAI..."}
              {bluetoothStep === "found" && "GAANA BHEJ RAHA HAI..."}
              {bluetoothStep === "done" && "GAANA MIL GAYA ✓"}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Scrollable Overlay Area */}
      <div className="relative z-10 w-full flex flex-col pb-[30vh]">
        {/* Spacer to push memory sections down below the hero */}
        <div className="h-[100vh] w-full" />

        {/* Memory Section 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[80vh] flex items-center justify-start px-10 md:px-32 lg:px-48"
        >
          <div className="max-w-xl">
            <h2 className="text-[#ffeedd]/50 text-sm md:text-base font-bold tracking-[0.4em] mb-4">"2011"</h2>
            <h3 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-6 text-[#ffeedd] tracking-tight drop-shadow-lg">
              BLUETOOTH<br/>ERA
            </h3>
            <p className="text-[#ffeedd]/70 text-lg md:text-2xl font-medium tracking-wide">
              "Bhai song bhej."<br />
              "Bluetooth on kar."
            </p>
          </div>
        </motion.div>

        {/* Memory Section 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[80vh] flex items-center justify-end px-10 md:px-32 lg:px-48 text-right"
        >
          <div className="max-w-xl">
            <h2 className="text-[#ffeedd]/50 text-sm md:text-base font-bold tracking-[0.4em] mb-4">"2012"</h2>
            <h3 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-6 text-[#ffeedd] tracking-tight drop-shadow-lg">
              320 KBPS
            </h3>
            <p className="text-[#ffeedd]/70 text-lg md:text-2xl font-medium tracking-wide">
              Ek phone.<br />
              Ek gaana.<br />
              Puri gang ready.
            </p>
          </div>
        </motion.div>

        {/* Memory Section 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[80vh] flex items-center justify-start px-10 md:px-32 lg:px-48"
        >
          <div className="max-w-xl">
            <h2 className="text-[#ffeedd]/50 text-sm md:text-base font-bold tracking-[0.4em] mb-4">"2013"</h2>
            <h3 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-6 text-[#ffeedd] tracking-tight drop-shadow-lg">
              LATE NIGHT<br/>DRIVES
            </h3>
            <p className="text-[#ffeedd]/70 text-lg md:text-2xl font-medium tracking-wide">
              Windows down.<br/>
              Bass full.<br/>
              Gaana repeat pe.
            </p>
          </div>
        </motion.div>

        {/* Memory Section 4 — 2014 */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[80vh] flex items-center justify-end px-10 md:px-32 lg:px-48 text-right"
        >
          <div className="max-w-xl">
            <h2 className="text-[#ffeedd]/50 text-sm md:text-base font-bold tracking-[0.4em] mb-4">
              "2014"
            </h2>

            <h3 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-6 text-[#ffeedd] tracking-tight drop-shadow-lg">
              DESI<br />KALAKAAR
            </h3>

            <p className="text-[#ffeedd]/70 text-lg md:text-2xl font-medium tracking-wide">
              Desi sound.<br />
              Global attitude.<br />
              Ek poora era.
            </p>
          </div>
        </motion.div>

        {/* Memory Section 5 — 2015 */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-[80vh] flex items-center justify-start px-10 md:px-32 lg:px-48"
        >
          <div className="max-w-xl">
            <h2 className="text-[#ffeedd]/50 text-sm md:text-base font-bold tracking-[0.4em] mb-4">
              "2015"
            </h2>

            <h3 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-6 text-[#ffeedd] tracking-tight drop-shadow-lg">
              ONE MORE<br />SONG
            </h3>

            <p className="text-[#ffeedd]/70 text-lg md:text-2xl font-medium tracking-wide">
              Gaana khatam?<br />
              Nahi bhai.<br />
              Ek aur chala.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Scroll Progress Indicator */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 flex-col items-center gap-6 z-20 opacity-50 hidden md:flex pointer-events-none">
         <span className="text-xs tracking-widest text-[#ffeedd]/50 rotate-180" style={{ writingMode: 'vertical-rl' }}>2010</span>
         <div className="h-32 w-[1px] bg-gradient-to-b from-[#ffeedd]/0 via-[#ffeedd]/40 to-[#ffeedd]/0" />
         <span className="text-xs tracking-widest text-[#ffeedd]/50 rotate-180" style={{ writingMode: 'vertical-rl' }}>2015</span>
      </div>

      {/* Fixed UI Layer for Player & Drawers */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-50">

        {/* Modal Backdrop for clicking outside */}
        {playlistDrawerOpen && (
          <div 
            className="absolute inset-0 z-[55] pointer-events-auto"
            onClick={() => setPlaylistDrawerOpen(false)} 
          />
        )}

        {/* Playlist Modal Overlay (Positioned above the player) */}
        <div 
          className={`absolute bottom-[100px] left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-[720px] z-[60] transition-all duration-300 ease-out origin-bottom ${playlistDrawerOpen ? "opacity-100 scale-100 pointer-events-auto translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"}`}
        >
          {/* Modal Panel Container */}
          <div className="w-full max-h-[60svh] bg-gradient-to-br from-[#40271c]/40 to-[#2a1a11]/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-[24px] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">THE DESI KALAKAAR PLAYLIST</h3>
                <p className="text-xs text-white/50 mt-0.5">{playlistCount} tracks from the golden era</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] uppercase tracking-wider text-white/40 hidden sm:inline-block">PLAYING FROM YOUTUBE ↗</span>
                <button 
                  type="button" 
                  onClick={closePlaylist}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 pb-4 shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tracks..."
                  value={playlistSearch}
                  onChange={(e) => setPlaylistSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-colors"
                />
              </div>
            </div>
            
            {/* Track List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent" style={{ WebkitOverflowScrolling: "touch" }}>
              {filteredPlaylistItems.length > 0 ? (
                <div className="flex flex-col">
                  {filteredPlaylistItems.map((item, idx) => {
                    const isActive = item.active;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          loadPlaylistTrack(item.index);
                        }}
                        className={`flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all ${isActive ? "bg-white/10" : "bg-transparent hover:bg-white/5"}`}
                      >
                        {/* Number or Play Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-transparent text-white" : "bg-white/5 text-white/40 font-medium text-xs"}`}>
                          {isActive ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        
                        {/* Track Info */}
                        <div className="min-w-0 flex-1 text-left flex justify-between items-center pr-2">
                          <div className="flex flex-col truncate pr-4">
                            <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-white/80"}`}>{item.title}</p>
                            <p className="text-[11px] text-white/40 mt-0.5 truncate">{item.artist || "DESI KALAKAAR ERA"}</p>
                          </div>
                          {/* Show actual duration once fetched */}
                          <span className="text-xs text-white/30 shrink-0">
                            {item.duration > 0 ? formatTime(item.duration) : "--:--"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 flex items-center justify-center text-sm text-white/30">
                  No tracks found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Minimal Floating Player (Pill shape, sepia gradient) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-[720px] z-50 pointer-events-auto">
          <div className="bg-gradient-to-r from-[#422619]/95 to-[#2a1a11]/95 backdrop-blur-3xl border border-white/5 rounded-full p-2.5 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
            <div className="flex flex-row items-center justify-between">
              
              {/* Left: Artwork */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full overflow-hidden bg-black/20 shadow-inner ml-1">
                 {currentThumbnail ? <img src={currentThumbnail} alt="Track" className="w-full h-full object-cover" /> : null}
              </div>

              {/* Middle: Track Info & Progress */}
              <div className="flex-1 min-w-0 mx-4 flex flex-col justify-center">
                <div className="flex flex-col truncate">
                  {currentVideoTitle === "Loading..." ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-white/50 text-sm">Loading track...</span>
                    </div>
                  ) : (
                    <h3 className="text-sm sm:text-[15px] font-bold text-white truncate">{currentVideoTitle}</h3>
                  )}
                  <p className="text-[11px] sm:text-xs text-white/60 truncate mt-0.5">{currentVideoAuthor || "DESI KALAKAAR ERA"}</p>
                </div>
                
                {/* Progress Bar under text */}
                <div className="flex items-center gap-3 mt-1.5 w-full">
                   <div className="flex-1 h-[5px] bg-white/20 rounded-full cursor-pointer overflow-hidden relative" onClick={seekOnBar}>
                     <div 
                       className="absolute top-0 left-0 h-full bg-white/90 rounded-full transition-all duration-200"
                       style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
                     />
                   </div>
                   <span className="text-[10px] text-white/50 font-medium whitespace-nowrap w-auto text-right">
                     {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : "0:00"}
                   </span>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center shrink-0 gap-1 sm:gap-3 mr-2 sm:mr-4">
                <button type="button" onClick={() => switchTrack("prev")} className="text-white/50 hover:text-white transition-colors p-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                </button>
                <button type="button" onClick={togglePlayback} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg mx-1">
                  {isPlaying ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  )}
                </button>
                <button type="button" onClick={() => switchTrack("next")} className="text-white/50 hover:text-white transition-colors p-2">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                </button>
                
                {/* Shuffle Toggle */}
                <button 
                  type="button" 
                  onClick={() => setIsShuffle(!isShuffle)} 
                  className={`p-2 hidden sm:block transition-colors ${isShuffle ? "text-white" : "text-white/50 hover:text-white"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                </button>
                
                {/* Playlist Toggle */}
                <button 
                  type="button" 
                  onClick={() => setPlaylistDrawerOpen(!playlistDrawerOpen)} 
                  className={`p-2 ml-1 transition-colors ${playlistDrawerOpen ? "text-white" : "text-white/50 hover:text-white"}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Visually Hidden YouTube Player Container */}
      <div ref={playerContainerRef} className="absolute opacity-0 pointer-events-none w-0 h-0" />
    </main>
  );
}
