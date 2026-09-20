/**
 * Client-Side Smart Image Compression Utility
 *
 * Compresses raw camera photos (5MB - 12MB) into lightweight e-commerce WebP
 * images (~30KB - 60KB) in ~40ms directly in the browser/app before uploading.
 */

export interface CompressionResult {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  sizeKb: number;
  originalSizeKb: number;
  savingsPercent: number;
}

export async function compressProductImage(
  inputFile: File,
  maxDimension = 800,
  quality = 0.82
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!inputFile.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file."));
    }

    const originalSizeKb = Math.round(inputFile.size / 1024);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional dimensions
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          return reject(new Error("Unable to create canvas 2D rendering context."));
        }

        // Fill background with white in case of transparent sources
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Smooth image downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Encode to WebP first, fallback to JPEG if unsupported
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = inputFile.name.replace(/\.[^/.]+$/, "");
              const optimizedFile = new File([blob], `${baseName}.webp`, {
                type: "image/webp",
                lastModified: Date.now(),
              });
              const sizeKb = Math.round(blob.size / 1024);
              const savingsPercent = Math.max(
                0,
                Math.round(((originalSizeKb - sizeKb) / (originalSizeKb || 1)) * 100)
              );

              resolve({
                blob,
                file: optimizedFile,
                width,
                height,
                sizeKb,
                originalSizeKb,
                savingsPercent,
              });
            } else {
              // Fallback to JPEG
              canvas.toBlob(
                (fallbackBlob) => {
                  if (!fallbackBlob) {
                    return reject(new Error("Image compression encoding failed."));
                  }
                  const baseName = inputFile.name.replace(/\.[^/.]+$/, "");
                  const fallbackFile = new File([fallbackBlob], `${baseName}.jpg`, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  const sizeKb = Math.round(fallbackBlob.size / 1024);
                  const savingsPercent = Math.max(
                    0,
                    Math.round(((originalSizeKb - sizeKb) / (originalSizeKb || 1)) * 100)
                  );

                  resolve({
                    blob: fallbackBlob,
                    file: fallbackFile,
                    width,
                    height,
                    sizeKb,
                    originalSizeKb,
                    savingsPercent,
                  });
                },
                "image/jpeg",
                quality
              );
            }
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image for compression."));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(inputFile);
  });
}
