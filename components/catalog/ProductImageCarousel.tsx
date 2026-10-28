/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cleanProductImages } from "@/lib/productImages";
import { cn } from "@/lib/utils";

interface ProductImageCarouselProps {
  images?: (string | null | undefined)[] | null;
  fallbackImage?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallback?: React.ReactNode;
  showArrows?: boolean;
}

/**
 * Blinkit/Zepto-style product gallery.
 *
 * - One image (or none): renders exactly like the old single <img>, with no
 *   dots or arrows.
 * - Two or more: a snap-scrolling strip with page dots, desktop chevrons and
 *   swipe detection that suppresses the card's open-details click.
 */
export function ProductImageCarousel({
  images,
  fallbackImage,
  alt,
  className,
  imageClassName,
  fallback,
  showArrows = true,
}: ProductImageCarouselProps) {
  const gallery = React.useMemo(
    () => cleanProductImages([...(images || []), fallbackImage]),
    [images, fallbackImage]
  );

  const galleryKey = gallery.join("|");
  const [broken, setBroken] = React.useState<string[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pointerRef = React.useRef({ startX: 0, moved: false });

  React.useEffect(() => {
    setBroken([]);
    setActiveIndex(0);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [galleryKey]);

  const visibleImages = gallery.filter((src) => !broken.includes(src));

  const handleScroll = React.useCallback(() => {
    const node = scrollRef.current;
    if (!node || node.clientWidth === 0) return;
    const index = Math.round(node.scrollLeft / node.clientWidth);
    setActiveIndex(Math.max(0, Math.min(index, visibleImages.length - 1)));
  }, [visibleImages.length]);

  const scrollToIndex = (index: number) => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ left: node.clientWidth * index, behavior: "smooth" });
  };

  if (visibleImages.length === 0) {
    return <>{fallback ?? null}</>;
  }

  const markBroken = (src: string) => {
    setBroken((prev) => (prev.includes(src) ? prev : [...prev, src]));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerRef.current = { startX: e.clientX, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (Math.abs(e.clientX - pointerRef.current.startX) > 8) {
      pointerRef.current.moved = true;
    }
  };

  // A horizontal swipe must scroll the gallery, not open the product sheet.
  // Compare the click position too: some WebViews coalesce pointermove while
  // the finger is moving, so `moved` alone is not reliable on iOS.
  const handleClickCapture = (e: React.MouseEvent) => {
    if (e.detail === 0) return; // keyboard activation
    const dragged =
      pointerRef.current.moved ||
      Math.abs(e.clientX - pointerRef.current.startX) > 8;
    pointerRef.current.moved = false;
    if (!dragged) return;
    e.preventDefault();
    e.stopPropagation();
  };

  if (visibleImages.length === 1) {
    return (
      <img
        src={visibleImages[0]}
        alt={alt}
        onError={() => markBroken(visibleImages[0])}
        className={imageClassName}
        loading="lazy"
        draggable={false}
      />
    );
  }

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden group/carousel", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClickCapture={handleClickCapture}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain sq-no-scrollbar"
        role="group"
        aria-roledescription="carousel"
        aria-label={`${alt} images`}
      >
        {visibleImages.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="relative flex h-full w-full min-w-full shrink-0 snap-center items-center justify-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${visibleImages.length}`}
          >
            <img
              src={src}
              alt={`${alt} — image ${index + 1}`}
              onError={() => markBroken(src)}
              className={imageClassName}
              loading={index === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {visibleImages.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/85 px-1.5 py-1 shadow-xs backdrop-blur-xs">
          {visibleImages.map((src, index) => (
            <button
              key={`dot-${src}-${index}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollToIndex(index);
              }}
              aria-label={`Show image ${index + 1} of ${visibleImages.length}`}
              aria-current={activeIndex === index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                activeIndex === index
                  ? "w-3.5 bg-primary"
                  : "w-1.5 bg-slate-400/70 hover:bg-slate-500"
              )}
            />
          ))}
        </div>
      )}

      {showArrows && visibleImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollToIndex(Math.max(0, activeIndex - 1));
            }}
            disabled={activeIndex === 0}
            aria-label="Previous image"
            className="absolute left-1 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollToIndex(Math.min(visibleImages.length - 1, activeIndex + 1));
            }}
            disabled={activeIndex >= visibleImages.length - 1}
            aria-label="Next image"
            className="absolute right-1 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
