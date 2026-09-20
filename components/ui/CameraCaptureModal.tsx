"use client";

import * as React from "react";
import {
  Camera,
  RotateCcw,
  X,
  Check,
  SwitchCamera,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "Snap Product Photo",
}: CameraCaptureModalProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [capturedBlobUrl, setCapturedBlobUrl] = React.useState<string | null>(null);
  const [capturedFile, setCapturedFile] = React.useState<File | null>(null);
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = React.useState<boolean>(true);
  const [isShutterFlashing, setIsShutterFlashing] = React.useState<boolean>(false);

  // Stop current active stream tracks
  const stopStream = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
  const startCamera = React.useCallback(async (facing: "environment" | "user") => {
    setIsLoadingCamera(true);
    setError(null);
    setCapturedBlobUrl(null);
    setCapturedFile(null);

    // Ensure previous stream is stopped
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this device/browser.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("[Camera Error]:", err);
      // If environment (rear) camera fails, try fallback without facingMode constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr: any) {
        console.error("[Camera Fallback Error]:", fallbackErr);
        setError(
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Camera permission was denied. Please allow camera access in app settings."
            : "Could not access camera. Please check permissions."
        );
      }
    } finally {
      setIsLoadingCamera(false);
    }
  }, [stream]);

  // Effect to handle modal open/close lifecycle
  React.useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedBlobUrl(null);
      setCapturedFile(null);
      setError(null);
    }

    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Toggle Front / Rear camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture snapshot from video stream
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Trigger shutter flash animation
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If front camera, flip horizontally for natural mirror feel
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `snap_${Date.now()}.webp`, {
          type: "image/webp",
        });
        const url = URL.createObjectURL(blob);
        setCapturedBlobUrl(url);
        setCapturedFile(file);
        stopStream();
      },
      "image/webp",
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
    }
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    startCamera(facingMode);
  };

  // Confirm and use photo
  const handleConfirmPhoto = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      handleClose();
    }
  };

  // Close modal safely
  const handleClose = () => {
    stopStream();
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
    }
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 text-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">In-app direct capture</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Preview Container */}
        <div className="relative flex-1 bg-black min-h-[360px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* Shutter flash */}
          {isShutterFlashing && (
            <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-out fade-out duration-200" />
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 text-center text-rose-400 space-y-3 z-10">
              <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
              <p className="text-xs font-semibold">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startCamera(facingMode)}
                className="mt-2 text-xs border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Loading Camera */}
          {isLoadingCamera && !error && !capturedBlobUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs font-medium">Starting camera...</p>
            </div>
          )}

          {/* Live Video Stream */}
          {!capturedBlobUrl && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover aspect-square sm:aspect-[4/3]"
              />

              {/* Viewfinder Overlay Lines */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 border border-white/40">
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-white/40" />
                <div className="border-r border-white/40" />
                <div />
              </div>

              {/* Target Square Accent */}
              <div className="absolute inset-8 border-2 border-emerald-400/50 rounded-2xl pointer-events-none flex items-start justify-end p-2">
                <span className="text-[10px] font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> 800×800 WebP
                </span>
              </div>
            </>
          )}

          {/* Captured Image Preview */}
          {capturedBlobUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedBlobUrl}
                alt="Captured product"
                className="w-full h-full object-contain max-h-[460px]"
              />
              <div className="absolute top-3 left-3 bg-emerald-500/90 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Check className="w-3 h-3" /> Captured Frame
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
          {!capturedBlobUrl ? (
            <>
              {/* Flip camera button */}
              <button
                type="button"
                onClick={handleToggleCamera}
                disabled={isLoadingCamera || !!error}
                className="w-12 h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all disabled:opacity-40"
                title="Switch Camera (Front/Rear)"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              {/* Big Shutter Button */}
              <button
                type="button"
                onClick={handleTakeSnapshot}
                disabled={isLoadingCamera || !!error}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.45)] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                title="Take Photo"
              >
                <div className="w-13 h-13 rounded-full border-2 border-slate-950 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="w-12 h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="w-full flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                className="flex-1 h-11 rounded-xl border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1.5 font-bold text-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </Button>
              <Button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-4 h-4" />
                <span>Use Photo</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
