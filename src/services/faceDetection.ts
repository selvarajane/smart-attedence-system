import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

export async function toggleHardwareAcceleration(enabled: boolean): Promise<void> {
  if (enabled) {
    if ((faceapi.tf as any).setBackend) {
       await (faceapi.tf as any).setBackend('webgl');
    }
  } else {
    if ((faceapi.tf as any).setBackend) {
       await (faceapi.tf as any).setBackend('cpu');
    }
  }
}

export async function detectFaces(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement, fast = false) {
  if (input instanceof HTMLVideoElement && input.readyState < 2) return [];

  const options = fast 
    ? new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
    : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

  const detections = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.slice(0, 10); // Limit to 10 members as requested
}

export async function detectFace(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement, fast = false) {
  if (input instanceof HTMLVideoElement && input.readyState < 2) return null;

  const options = fast 
    ? new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
    : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

  const detection = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
}

export function compareFaces(descriptor1: Float32Array, descriptor2: Float32Array): number {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}

export function isFaceMatch(distance: number, threshold: number = 0.6): boolean {
  return distance < threshold;
}

export function getConfidenceScore(distance: number): number {
  return Math.max(0, Math.min(1, 1 - distance));
}
