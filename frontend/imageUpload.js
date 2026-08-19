const MAX_WIDTH = 800;
const MAX_HEIGHT = 1200;
const MAX_BYTES = 300 * 1024;
const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5];
const SCALE_STEPS = [1, 0.92, 0.84, 0.76];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load the selected image"));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Unable to process the selected image"));
    }, type, quality);
  });
}

function getScaledSize(width, height, scale = 1) {
  const ratio = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
  return {
    width: Math.max(1, Math.round(width * ratio * scale)),
    height: Math.max(1, Math.round(height * ratio * scale)),
  };
}

function buildOutputName(originalName = "upload", type = "image/webp") {
  const baseName = String(originalName).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "upload";
  const extension = type === "image/jpeg" ? "jpg" : "webp";
  return `${baseName}.${extension}`;
}

export function sanitizeImageReference(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return "";
  }
  return trimmed;
}

export function sanitizeImageRecord(record) {
  if (!record || typeof record !== "object") return record;
  const next = { ...record };
  if (!next.imageUrl && next.image) {
    next.imageUrl = sanitizeImageReference(next.image);
  }
  next.imageUrl = sanitizeImageReference(next.imageUrl);
  next.imagePublicId = sanitizeImageReference(next.imagePublicId);
  delete next._pendingImageFile;
  delete next._previewImage;
  return next;
}

export function sanitizeImageCollection(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => sanitizeImageRecord(item));
}

export function createPreviewUrl(file) {
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export async function compressImageFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Please choose an image file");
  }

  const image = await loadImage(file);
  let bestBlob = null;
  let bestType = "image/webp";

  for (const scale of SCALE_STEPS) {
    const size = getScaledSize(image.width, image.height, scale);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Image compression is not supported in this browser");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const type of ["image/webp", "image/jpeg"]) {
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, type, quality);
        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
          bestType = type;
        }
        if (blob.size <= MAX_BYTES) {
          return new File([blob], buildOutputName(file.name, type), {
            type,
            lastModified: Date.now(),
          });
        }
      }
    }
  }

  if (!bestBlob) {
    throw new Error("Unable to process the selected image");
  }

  if (bestBlob.size > MAX_BYTES) {
    throw new Error("Image is still too large after compression. Please choose a smaller image.");
  }

  return new File([bestBlob], buildOutputName(file.name, bestType), {
    type: bestType,
    lastModified: Date.now(),
  });
}
