require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  console.log('Loading TensorFlow WASM + face-api...');
  const tf = require('@tensorflow/tfjs');
  require('@tensorflow/tfjs-backend-wasm');
  await tf.setBackend('wasm');
  await tf.ready();
  console.log('Backend:', tf.getBackend());

  require('@vladmandic/face-api/dist/face-api.node-wasm.js');
  console.log('face-api WASM module loaded OK');

  const { compareFaces } = require('../src/services/faceVerifyService');
  const result = await compareFaces(__filename, Buffer.from(''));
  console.log('Empty selfie test:', result.reason);
  console.log('Face verification service ready.');
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
