const fs = require('fs');
const path = require('path');
const { Canvas, Image, ImageData } = require('canvas');

let faceapi = null;
let tf = null;
let modelsLoaded = false;
let loadError = null;

const DEFAULT_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.55);

function getModelPath() {
  const bundled = path.join(
    __dirname,
    '..',
    '..',
    'node_modules',
    '@vladmandic',
    'face-api',
    'model'
  );
  if (fs.existsSync(bundled)) return bundled;
  return path.join(__dirname, '..', '..', 'models', 'face-api');
}

async function ensureModels() {
  if (modelsLoaded) return;
  if (loadError) throw loadError;

  try {
    tf = require('@tensorflow/tfjs');
    require('@tensorflow/tfjs-backend-wasm');

    await tf.setBackend('wasm');
    await tf.ready();

    // Use WASM build — does not require @tensorflow/tfjs-node (native build).
    faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    const modelPath = getModelPath();
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Face models not found at ${modelPath}`);
    }

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    modelsLoaded = true;
  } catch (err) {
    loadError = err;
    throw err;
  }
}

async function loadImageFromBuffer(buffer) {
  await ensureModels();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = buffer;
  });
}

async function loadImageFromFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return loadImageFromBuffer(buffer);
}

async function extractFaceDescriptor(image) {
  await ensureModels();
  const detection = await faceapi
    .detectSingleFace(image)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return null;
  }
  return detection.descriptor;
}

/**
 * Compare stored student photo with live selfie.
 * @returns {{ matched: boolean, distance: number|null, threshold: number, reason?: string }}
 */
async function compareFaces(referenceFilePath, selfieBuffer) {
  const threshold = DEFAULT_THRESHOLD;

  if (!referenceFilePath || !fs.existsSync(referenceFilePath)) {
    return {
      matched: false,
      distance: null,
      threshold,
      reason: 'Reference photo file not found on server',
    };
  }

  if (!selfieBuffer?.length) {
    return {
      matched: false,
      distance: null,
      threshold,
      reason: 'Selfie image is required',
    };
  }

  try {
    const [referenceImage, selfieImage] = await Promise.all([
      loadImageFromFile(referenceFilePath),
      loadImageFromBuffer(selfieBuffer),
    ]);

    const [referenceDescriptor, selfieDescriptor] = await Promise.all([
      extractFaceDescriptor(referenceImage),
      extractFaceDescriptor(selfieImage),
    ]);

    if (!referenceDescriptor) {
      return {
        matched: false,
        distance: null,
        threshold,
        reason: 'No face detected in saved student photo',
      };
    }

    if (!selfieDescriptor) {
      return {
        matched: false,
        distance: null,
        threshold,
        reason: 'No face detected in selfie — look at the camera in good light',
      };
    }

    const distance = faceapi.euclideanDistance(referenceDescriptor, selfieDescriptor);
    const matched = distance <= threshold;

    return {
      matched,
      distance: Number(distance.toFixed(4)),
      threshold,
      reason: matched
        ? undefined
        : `Face does not match saved photo (distance ${distance.toFixed(3)} > ${threshold})`,
    };
  } catch (err) {
    return {
      matched: false,
      distance: null,
      threshold,
      reason: err.message || 'Face verification failed',
    };
  }
}

module.exports = { compareFaces, DEFAULT_THRESHOLD };
