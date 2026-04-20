type FaceDetection = {
  boundingBox: DOMRectReadOnly;
};

type BrowserFaceDetector = new (options?: { fastMode?: boolean }) => {
  detect(image: CanvasImageSource): Promise<FaceDetection[]>;
};

type SmartCropOptions = {
  outputSize?: number;
  quality?: number;
};

const DEFAULT_OUTPUT_SIZE = 512;
const DEFAULT_QUALITY = 0.9;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getOutputType(file: File) {
  if (file.type === "image/png" || file.type === "image/webp") {
    return file.type;
  }

  return "image/jpeg";
}

function extensionForType(type: string) {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function filenameForType(name: string, type: string) {
  const base = name.replace(/\.[^/.]+$/, "") || "photo";
  return `${base}.${extensionForType(type)}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to crop image"));
        }
      },
      type,
      quality
    );
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    image.src = url;
  });
}

async function getFaceCenter(image: HTMLImageElement) {
  const FaceDetector = (globalThis as { FaceDetector?: BrowserFaceDetector }).FaceDetector;
  if (!FaceDetector) {
    return null;
  }

  try {
    const detector = new FaceDetector({ fastMode: true });
    const faces = await detector.detect(image);
    const largestFace = faces.sort(
      (a, b) =>
        b.boundingBox.width * b.boundingBox.height -
        a.boundingBox.width * a.boundingBox.height
    )[0];

    if (!largestFace) {
      return null;
    }

    const box = largestFace.boundingBox;
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height * 0.45,
    };
  } catch {
    return null;
  }
}

export async function smartCropImageToSquare(file: File, options: SmartCropOptions = {}) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Invalid image dimensions");
  }

  const cropSize = Math.min(sourceWidth, sourceHeight);
  const faceCenter = await getFaceCenter(image);
  const centerX = faceCenter?.x ?? sourceWidth / 2;
  const centerY = faceCenter?.y ?? sourceHeight / 2;
  const sourceX = clamp(centerX - cropSize / 2, 0, sourceWidth - cropSize);
  const sourceY = clamp(centerY - cropSize / 2, 0, sourceHeight - cropSize);
  const outputSize = Math.min(options.outputSize ?? DEFAULT_OUTPUT_SIZE, cropSize);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to crop image");
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    outputSize,
    outputSize
  );

  const outputType = getOutputType(file);
  const blob = await canvasToBlob(
    canvas,
    outputType,
    options.quality ?? DEFAULT_QUALITY
  );

  return new File([blob], filenameForType(file.name, outputType), {
    type: outputType,
    lastModified: Date.now(),
  });
}
