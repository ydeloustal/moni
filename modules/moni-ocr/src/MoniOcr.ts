import { requireOptionalNativeModule } from 'expo';

/** One recognized line. `box` is [x, y, width, height] in pixels, top-left origin. */
export interface OcrLine {
  text: string;
  box: [number, number, number, number];
  /** 0–1. ML Kit may report 0 when it has no estimate. */
  confidence: number;
}

export interface OcrResult {
  lines: OcrLine[];
  width: number;
  height: number;
  /** Time spent in the native engine only. */
  engineMs: number;
}

interface MoniOcrNative {
  recognize(uri: string): Promise<OcrResult>;
}

// null on the web and in Expo Go: the module needs a development build.
const native = requireOptionalNativeModule<MoniOcrNative>('MoniOcr');

export const isOcrAvailable = native !== null;

/** Recognizes the text of a local image (file:// or content:// URI), entirely on the device. */
export function recognize(uri: string): Promise<OcrResult> {
  if (!native) return Promise.reject(new Error('OCR indisponible sur cette plateforme'));
  return native.recognize(uri);
}
