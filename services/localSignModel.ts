
declare const ort: any;

interface Point {
  x: number;
  y: number;
  z: number;
}

// Canonical Naruto hand seal labels
const LABELS = [
  'bird', 'boar', 'dog', 'dragon', 'hare', 'horse', 
  'monkey', 'ox', 'ram', 'rat', 'snake', 'tiger'
];

let session: any = null;
const INPUT_SIZE = 416;

/**
 * Initializes ONNX Runtime with a resilient fetching strategy.
 */
export const initOnnxModel = async () => {
  if (session) return;
  try {
    console.log("Shinobi Academy: Preparing the YOLOX Summoning Ritual...");
    
    // 1. Configure ONNX Runtime environment
    // Setting proxy to false to avoid worker-fetch issues in some environments
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
    ort.env.wasm.proxy = false; 
    ort.env.wasm.numThreads = 1;

    // 2. Define source and proxy rotation
    const driveId = '18HvHluoCAkzRqNwTDkOh3JgP0jBlaT8x';
    // Adding a cache-buster to the drive URL
    const driveUrl = `https://docs.google.com/uc?export=download&id=${driveId}&t=${Date.now()}`;
    
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(driveUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(driveUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(driveUrl)}`
    ];

    let modelBuffer: ArrayBuffer | null = null;
    let lastError = "";

    for (const url of proxies) {
      try {
        console.log(`Attempting summon via: ${url.split('?')[0]}...`);
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit'
        });

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          // Check if it's actually an ONNX file (usually starts with a specific magic number or is large enough)
          // If it's < 100KB, it's likely a Google Drive "Virus Warning" HTML page
          if (buffer.byteLength > 200000) {
            modelBuffer = buffer;
            console.log("Scroll acquired! Length:", buffer.byteLength);
            break;
          } else {
            console.warn("Fetched scroll is too small, likely a warning page. Trying next proxy...");
          }
        } else {
          console.warn(`Proxy returned status ${response.status}.`);
        }
      } catch (e: any) {
        lastError = e.message;
        console.warn(`Proxy fetch error: ${e.message}`);
      }
    }

    if (!modelBuffer) {
      throw new Error(`All summoning proxies failed. Last error: ${lastError || 'Access Denied'}`);
    }

    // 3. Create Inference Session from the successfully fetched buffer
    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });

    console.log("%c YOLOX SCROLL UNROLLED: ACTIVATED SUCCESSFULLY ", "background: #f97316; color: white; font-weight: bold; padding: 4px;");
  } catch (e: any) {
    console.error("YOLOX Activation Failed:", e.message);
    // Propagate error to UI if needed
    throw e;
  }
};

/**
 * Prepares the video frame for YOLOX.
 */
const preprocess = (video: HTMLVideoElement): Float32Array => {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Float32Array();

  // Flip horizontally to match the mirrored video stream
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -INPUT_SIZE, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.restore();

  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = imageData;

  const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const offset = INPUT_SIZE * INPUT_SIZE;

  // BGR [0, 1] normalization
  for (let i = 0; i < offset; i++) {
    floatData[i] = data[i * 4 + 2] / 255.0;       // B
    floatData[i + offset] = data[i * 4 + 1] / 255.0; // G
    floatData[i + 2 * offset] = data[i * 4] / 255.0; // R
  }
  return floatData;
};

/**
 * Decodes anchor-free YOLOX output tensor.
 */
const decodeYolox = (output: any, numClasses: number) => {
  const data = output.data;
  const numPredictions = data.length / (5 + numClasses);
  
  let bestScore = -1;
  let bestClass = -1;

  for (let i = 0; i < numPredictions; i++) {
    const start = i * (5 + numClasses);
    const objectness = data[start + 4];
    
    if (objectness > 0.4) { // Higher threshold for object presence
      for (let c = 0; c < numClasses; c++) {
        const classProb = data[start + 5 + c];
        const score = objectness * classProb;
        if (score > bestScore) {
          bestScore = score;
          bestClass = c;
        }
      }
    }
  }

  return { classId: bestClass, confidence: bestScore };
};

export const classifySignLocally = async (video: HTMLVideoElement | null): Promise<string | null> => {
  if (!session || !video) return null;

  try {
    const inputData = preprocess(video);
    if (inputData.length === 0) return null;

    const inputTensor = new ort.Tensor('float32', inputData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    const results = await session.run({ [session.inputNames[0]]: inputTensor });
    const output = results[session.outputNames[0]];

    const { classId, confidence } = decodeYolox(output, LABELS.length);

    if (confidence > 0.6) {
      return LABELS[classId];
    }
  } catch (e) {
    // Inference skipped for this frame
  }

  return null;
};

export const getPoseDescription = (): string => {
  return session ? "Byakugan Active" : "Sensors Offline";
};
