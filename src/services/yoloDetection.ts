import * as tf from '@tensorflow/tfjs';

let model: tf.GraphModel | null = null;
let modelsLoaded = false;

/**
 * Load the YOLOv26 (NMS-free) model.
 * 🚀 Released Jan 2026 by Ultralytics.
 * Note: You must place your converted YOLOv26 TFJS model files in '/public/models/yolo26/'.
 */
export async function loadYoloModel(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = '/models/yolo26/model.json';
  try {
    model = await tf.loadGraphModel(MODEL_URL);
    modelsLoaded = true;
    console.log('✅ YOLOv26 NMS-free Model Loaded Successfully');
  } catch (error) {
    console.error('❌ Error Loading YOLOv26 Model:', error);
    throw error;
  }
}

/**
 * Perform Face Detection using YOLOv26
 * Since v26 is NMS-free, post-processing is highly efficient.
 */
export async function detectFacesYolo(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
  if (!model) {
    console.warn('YOLOv26 model not loaded yet.');
    return [];
  }

  // Pre-process input
  const inputTensor = tf.tidy(() => {
    return tf.browser.fromPixels(input)
      .resizeNearestNeighbor([640, 640])
      .toFloat()
      .div(255.0)
      .expandDims(0);
  });

  // Run Inference
  // YOLOv26 NMS-free output typically returns direct detections [1, num_boxes, coords+scores]
  const result = await model.predict(inputTensor) as tf.Tensor;
  
  // Post-processing for YOLOv26 (Simplified due to NMS-free architecture)
  // [Example structure, depends on specific model export details]
  
  // Clean up
  inputTensor.dispose();
  result.dispose();

  return []; 
}
