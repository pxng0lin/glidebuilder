import { useEffect, useRef, useState } from 'react';

interface MixerAnimationProps {
  isRunning: boolean;
}

export function MixerAnimation({ isRunning }: MixerAnimationProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (isRunning) {
      const playResult = video.play();
      if (playResult instanceof Promise) {
        playResult.catch(() => {
          // Autoplay can fail silently; fallback remains visible until ready.
        });
      }
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch (error) {
        console.warn('Unable to reset loader video:', error);
      }
      setIsVideoReady(false);
    }
  }, [isRunning]);

  const handleCanPlay = () => {
    setIsVideoReady(true);
    if (isRunning) {
      const video = videoRef.current;
      if (video) {
        const playResult = video.play();
        if (playResult instanceof Promise) {
          playResult.catch(() => {
            // Ignore autoplay rejection – fallback will stay visible.
          });
        }
      }
    }
  };

  const handleVideoError = () => {
    setIsVideoReady(false);
  };

  const className = ['mixer-scene', isRunning ? 'is-running' : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-hidden="true">
      <div className="mixer-halo" />
      <div className="mixer-scanline" />
      <div className="mixer-video" data-state={isRunning && isVideoReady ? 'playing' : 'idle'}>
        <video
          ref={videoRef}
          key={isRunning ? 'playing' : 'idle'}
          className="mixer-video__player"
          autoPlay={isRunning}
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
          onCanPlay={handleCanPlay}
          onLoadedData={handleCanPlay}
          onError={handleVideoError}
        >
          <source src="/assets/loader-loop.mp4" type="video/mp4" />
          <source src="/assets/loader-loop.mov" type="video/quicktime" />
        </video>
        <div className="mixer-video__fallback">
          <span className="mixer-video__icon" aria-hidden="true">🎞️</span>
          <span className="mixer-video__text">Loading preview</span>
        </div>
      </div>
      <div className="mixer-grid" />
    </div>
  );
}
