/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Camera, Loader2, Plus, Star, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_PRODUCT_IMAGES, cleanProductImages } from "@/lib/productImages";
import { cn } from "@/lib/utils";

interface ProductImageGalleryEditorProps {
  images: string[];
  onChange: (images: string[]) => void;
  uploading: boolean;
  onPickFile: (file: File) => void;
  onCamera: () => void;
  inputId: string;
  disabled?: boolean;
}

/**
 * Owner-side gallery editor. The first image is the primary photo used on
 * product cards, carts and order receipts; the rest become swipeable slides.
 */
export function ProductImageGalleryEditor({
  images,
  onChange,
  uploading,
  onPickFile,
  onCamera,
  inputId,
  disabled = false,
}: ProductImageGalleryEditorProps) {
  const [urlInput, setUrlInput] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const atLimit = images.length >= MAX_PRODUCT_IMAGES;

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;

    if (!/^(https?:\/\/|\/)/i.test(url)) {
      setUrlError("Enter a full https:// URL or an image path starting with /.");
      return;
    }
    if (images.includes(url)) {
      setUrlError("That image is already in the gallery.");
      return;
    }
    if (atLimit) {
      setUrlError(`You can add up to ${MAX_PRODUCT_IMAGES} images.`);
      return;
    }

    onChange(cleanProductImages([...images, url]));
    setUrlInput("");
    setUrlError(null);
  };

  const removeAt = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [picked] = next.splice(index, 1);
    onChange([picked, ...next]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-black text-slate-200 block">
          Product Images
        </label>
        <span
          className={cn(
            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
            atLimit
              ? "text-amber-300 bg-amber-500/10 border-amber-500/40"
              : "text-slate-300 bg-slate-800 border-slate-700"
          )}
        >
          {images.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        The first photo is the primary image. Add 2+ photos and customers can
        swipe through them like Blinkit / Zepto.
      </p>

      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className={cn(
                "relative aspect-square rounded-xl bg-slate-950 border overflow-hidden flex items-center justify-center p-1 group",
                index === 0
                  ? "border-emerald-500/70 ring-1 ring-emerald-500/30"
                  : "border-slate-700"
              )}
            >
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.opacity = "0.25";
                }}
              />

              {index === 0 ? (
                <span className="absolute top-1 left-1 bg-emerald-500 text-slate-950 text-[8px] font-black px-1 py-0.5 rounded shadow-xs">
                  PRIMARY
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makePrimary(index)}
                  title="Make primary image"
                  aria-label={`Make image ${index + 1} the primary image`}
                  className="absolute top-1 left-1 w-5 h-5 rounded-md bg-slate-950/85 text-amber-300 hover:text-amber-200 hover:bg-slate-900 border border-slate-700 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Star className="w-3 h-3" />
                </button>
              )}

              <button
                type="button"
                onClick={() => removeAt(index)}
                title="Remove image"
                aria-label={`Remove image ${index + 1}`}
                className="absolute top-1 right-1 w-5 h-5 rounded-md bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-xs"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-3 text-center">
          <p className="text-[11px] text-slate-400 font-semibold">
            No photos yet. Snap one with the camera or upload from the gallery.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            files.slice(0, MAX_PRODUCT_IMAGES - images.length).forEach((file) => {
              onPickFile(file);
            });
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || uploading || atLimit}
          onClick={onCamera}
          className="h-8 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 gap-1 shadow-2xs"
          title="Snap a photo with the in-app camera"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || uploading || atLimit}
          onClick={() => document.getElementById(inputId)?.click()}
          className="h-8 px-2.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200 gap-1 shadow-2xs"
          title="Upload one or more photos from the device"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Gallery</span>
        </Button>
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Compressing &amp; uploading...
          </span>
        )}
        {atLimit && (
          <span className="text-[10px] font-bold text-amber-300">
            Maximum {MAX_PRODUCT_IMAGES} photos reached.
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            setUrlError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Paste an image URL and press Add"
          disabled={disabled || atLimit}
          className="h-9 bg-slate-950 border-2 border-slate-700 focus:border-emerald-400 rounded-xl text-white font-mono text-[11px]"
        />
        <Button
          type="button"
          size="sm"
          onClick={addUrl}
          disabled={disabled || atLimit || !urlInput.trim()}
          className="h-9 px-3 rounded-xl text-[11px] font-black bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {urlError && (
        <p className="text-[10px] font-bold text-rose-400">{urlError}</p>
      )}
    </div>
  );
}
