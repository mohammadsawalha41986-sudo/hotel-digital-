import { useState } from 'react';
import { Img, cx } from '../../components/ui';

/** Parses YouTube/Vimeo links into privacy-friendly embed URLs. */
export function embedUrl(url: string): string | null {
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&playsinline=1&modestbranding=1`;
  const vimeo = /vimeo\.com\/(\d+)/.exec(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?background=1&autoplay=1&muted=1&loop=1`;
  return null;
}

/**
 * Full-bleed image or video. Video falls back to the image (poster) when it
 * cannot play, and to the branded placeholder when neither loads.
 */
export function MediaBackground({ image, video, alt, eager, kenBurns, className }: { image?: string; video?: string; alt: string; eager?: boolean; kenBurns?: boolean; className?: string }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const embed = video ? embedUrl(video) : null;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const showVideo = !!video && !videoFailed && !reduceMotion;

  return (
    <div className={cx('absolute inset-0 overflow-hidden', className)}>
      <Img src={image} alt={alt} eager={eager} className={cx('h-full w-full', kenBurns && '[&_img]:kenburns')} />
      {showVideo &&
        (embed ? (
          <iframe
            src={embed}
            title={alt || 'Background video'}
            allow="autoplay; encrypted-media"
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
          />
        ) : (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={video}
            poster={image || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onError={() => setVideoFailed(true)}
          />
        ))}
    </div>
  );
}
