"use client";

import { useState } from "react";

interface GalleryImage {
  url: string;
  altText?: string;
  isPrimary: boolean;
}

export function ImageGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const primaryIndex = Math.max(0, images.findIndex((i) => i.isPrimary));
  const [activeIndex, setActiveIndex] = useState(primaryIndex);
  const active = images[activeIndex] ?? images[0];

  if (!active) return null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start">
      {/* Main image */}
      <div className="flex-1">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white border border-[#F0F0F0] shadow-sm">
          <img
            src={active.url}
            alt={active.altText ?? name}
            className="h-full w-full object-cover transition-all duration-500 hover:scale-110 cursor-zoom-in"
          />
          
          {/* Mobile Overlay Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 lg:hidden">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? "w-6 bg-primary" : "w-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex flex-row gap-3 overflow-x-auto pb-2 scrollbar-hide lg:flex-col lg:overflow-visible lg:pb-0 lg:max-h-[600px]">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-pressed={activeIndex === i}
              className={`group relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all duration-300 sm:h-24 sm:w-20 ${
                activeIndex === i
                  ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20 scale-105 z-10"
                  : "border-[#F0F0F0] hover:border-primary/50 opacity-70 hover:opacity-100"
              }`}
            >
              <img 
                src={img.url} 
                alt={img.altText ?? ""} 
                className={`h-full w-full object-cover transition-transform duration-300 ${activeIndex === i ? "scale-110" : "group-hover:scale-105"}`} 
              />
              {activeIndex === i && (
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
