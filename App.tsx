
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HAND_SIGNS, JUTSU_LIST } from './constants';
import { Jutsu, Language } from './types';
import { classifySignLocally, initOnnxModel, getPoseDescription } from './services/localSignModel';
import { TRANSLATIONS } from './locales';

declare const Hands: any;
declare const Camera: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const HAND_CONNECTIONS: any;

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [selectedJutsu, setSelectedJutsu] = useState<Jutsu | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [chakra, setChakra] = useState(100);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');
  
  const [handDetected, setHandDetected] = useState(false);
  const [detectedSign, setDetectedSign] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const jutsuRef = useRef(selectedJutsu);
  const stepRef = useRef(currentStep);
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);

  useEffect(() => {
    jutsuRef.current = selectedJutsu;
    stepRef.current = currentStep;
  }, [selectedJutsu, currentStep]);

  const loadModel = useCallback(async () => {
    setModelState('loading');
    try {
      await initOnnxModel();
      setModelState('ready');
    } catch (e) {
      console.error("App: Model load failed", e);
      setModelState('error');
    }
  }, []);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (!selectedJutsu) setFeedback(t.welcome);
  }, [lang, selectedJutsu, t.welcome]);

  useEffect(() => {
    const timer = setInterval(() => {
      setChakra(prev => Math.min(100, prev + 5)); 
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progressToNext = useCallback(() => {
    const jutsu = jutsuRef.current;
    const step = stepRef.current;
    if (!jutsu) return;

    if (step === jutsu.sequence.length - 1) {
      setFeedback(`${jutsu.name[lang]} ${t.jutsuActivated}`);
      setActiveEffect(jutsu.id);
      setCurrentStep(step + 1);
      setChakra(prev => Math.max(0, prev - 30)); 
      setTimeout(() => {
        setActiveEffect(null);
        setSelectedJutsu(null);
        setCurrentStep(0);
      }, 6000);
    } else {
      setFeedback(`${t.nextSign} ${HAND_SIGNS[jutsu.sequence[step + 1]].name[lang]}`);
      setCurrentStep(prev => prev + 1);
      setScanProgress(0);
    }
  }, [lang, t.jutsuActivated, t.nextSign]);

  useEffect(() => {
    if (!isCapturing) return;

    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });

    hands.onResults(async (results: any) => {
      const canvasCtx = overlayCanvasRef.current?.getContext('2d');
      if (!canvasCtx || !overlayCanvasRef.current) return;
      canvasCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      
      const hasHands = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
      setHandDetected(hasHands);

      if (videoRef.current && modelState === 'ready') {
        const sign = await classifySignLocally(videoRef.current);
        if (sign) setDetectedSign(sign);
      }

      if (hasHands) {
        const currentJutsu = jutsuRef.current;
        const currentStepIdx = stepRef.current;
        const isMatch = currentJutsu && detectedSign === currentJutsu.sequence[currentStepIdx];
        const color = isMatch ? '#10b981' : '#3b82f6';

        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color, lineWidth: 3});
          drawLandmarks(canvasCtx, landmarks, {color, lineWidth: 1, radius: 2});
        }
      }
    });

    handsInstanceRef.current = hands;

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsInstanceRef.current && videoRef.current) {
            try {
              await handsInstanceRef.current.send({ image: videoRef.current });
            } catch (e) { }
          }
        },
        width: 1280,
        height: 720
      });
      cameraInstanceRef.current = camera;
      camera.start();
    }

    return () => {
      if (cameraInstanceRef.current) cameraInstanceRef.current.stop();
      if (handsInstanceRef.current) handsInstanceRef.current.close();
    };
  }, [isCapturing, detectedSign, modelState]);

  useEffect(() => {
    if (!isCapturing || !selectedJutsu || activeEffect || !handDetected) {
      setScanProgress(0);
      return;
    }

    const currentTarget = selectedJutsu.sequence[currentStep];
    const isMatch = detectedSign === currentTarget;

    if (isMatch) {
      const interval = 40;
      const totalTime = 400; 
      const timer = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            progressToNext();
            return 0;
          }
          return prev + (interval / totalTime) * 100;
        });
      }, interval);
      return () => clearInterval(timer);
    } else {
      setScanProgress(0);
    }
  }, [isCapturing, selectedJutsu, activeEffect, handDetected, detectedSign, currentStep, progressToNext]);

  const handleSelectJutsu = (jutsu: Jutsu) => {
    if (modelState !== 'ready') return;
    setSelectedJutsu(jutsu);
    setCurrentStep(0);
    setIsCapturing(true);
    setActiveEffect(null);
    setScanProgress(0);
    setFeedback(`${t.focusChakra} ${HAND_SIGNS[jutsu.sequence[0]].name[lang]}.`);
  };

  const currentSign = selectedJutsu ? HAND_SIGNS[selectedJutsu.sequence[currentStep]] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#0c0c0c] text-[#e5e5e5]">
      <header className="w-full max-w-[1600px] flex justify-between items-center mb-8 border-b border-orange-900 pb-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-ninja text-orange-500 tracking-wider flex items-center gap-4">
            {t.title}
            {modelState === 'loading' && (
              <span className="text-xs font-sans text-orange-400 animate-pulse uppercase tracking-[0.2em]">
                [ Summoning Model... ]
              </span>
            )}
            {modelState === 'error' && (
              <span className="text-xs font-sans text-red-500 uppercase tracking-[0.2em]">
                [ Summoning Failed! ]
              </span>
            )}
          </h1>
          <p className="text-gray-400 italic text-sm md:text-base">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col gap-1 w-48">
             <div className="flex justify-between text-[10px] font-black text-blue-400 uppercase">
                <span>Chakra Density</span>
                <span>{Math.round(chakra)}%</span>
             </div>
             <div className="h-2 w-full bg-zinc-800 rounded-full border border-zinc-700 overflow-hidden">
                <div className={`h-full bg-blue-500 transition-all duration-500`} style={{ width: `${chakra}%` }}></div>
             </div>
          </div>
          <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-700">
            {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </header>

      <main className="w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-xl font-ninja text-blue-400 uppercase mb-4">{t.jutsuScrolls}</h2>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {JUTSU_LIST.map(jutsu => (
              <button 
                key={jutsu.id} 
                disabled={modelState !== 'ready'}
                onClick={() => handleSelectJutsu(jutsu)} 
                className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${modelState !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''} ${selectedJutsu?.id === jutsu.id ? 'bg-orange-900/40 border-orange-500 shadow-lg' : 'bg-zinc-900 border-zinc-800 hover:border-blue-500 hover:bg-zinc-800'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-base font-ninja ${selectedJutsu?.id === jutsu.id ? 'text-orange-400' : 'text-white'}`}>{jutsu.name[lang]}</span>
                  <span className="text-[9px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 group-hover:text-blue-400">{jutsu.difficulty}</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug group-hover:text-zinc-300 mt-1">
                  {jutsu.description[lang]}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col items-center">
          <div className={`relative w-full aspect-video rounded-2xl overflow-hidden border-4 ${activeEffect ? 'border-orange-500 fire-glow' : 'border-zinc-800'} bg-black shadow-2xl transition-all duration-300`}>
            {!isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-50 text-center p-8">
                <div className="w-16 h-16 mb-4 shuriken-spin opacity-20"><svg viewBox="0 0 100 100" className="fill-orange-500"><path d="M50 0L60 40L100 50L60 60L50 100L40 60L0 50L40 40Z"/></svg></div>
                
                {modelState === 'error' ? (
                  <div className="flex flex-col items-center gap-4">
                    <h3 className="text-3xl font-ninja text-red-500 mb-2">Summoning Failed</h3>
                    <p className="text-zinc-500 text-sm max-w-md">Your network or browser blocked the neural scrolls. Please check your connection and try again.</p>
                    <button 
                      onClick={loadModel}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-ninja rounded-lg transition-colors shadow-lg"
                    >
                      Retry Ritual
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-3xl font-ninja text-orange-500 mb-2">{t.selectJutsu}</h3>
                    <p className="text-zinc-500 text-sm max-w-md">{t.selectJutsuSub}</p>
                    {modelState === 'loading' && (
                      <div className="mt-8 flex flex-col items-center gap-2">
                        <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 animate-[loading_2s_ease-in-out_infinite]"></div>
                        </div>
                        <span className="text-[10px] text-orange-900 uppercase font-black tracking-widest">Loading YOLOX Neural Scroll</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full z-10" width="1280" height="720" />

            {isCapturing && !activeEffect && (
              <>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                  <img src={currentSign?.imageUrl} alt="Guide" className="w-64 h-64 object-contain opacity-20 mix-blend-screen grayscale" />
                </div>
                
                <div className="absolute bottom-8 w-full flex justify-center z-30 pointer-events-none">
                    <div className={`bg-black/90 backdrop-blur-sm px-10 py-4 rounded-full border ${handDetected ? 'border-blue-500' : 'border-zinc-800'} flex items-center gap-6 transition-all pointer-events-auto shadow-2xl`}>
                       <div className="w-8 h-8">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="16" cy="16" r="14" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                            <circle cx="16" cy="16" r="14" fill="transparent" stroke={detectedSign === selectedJutsu?.sequence[currentStep] ? "#10b981" : "#3b82f6"} strokeWidth="3" 
                              strokeDasharray={88} strokeDashoffset={88 - (88 * scanProgress) / 100} />
                          </svg>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">YOLOX Detection: {getPoseDescription()}</span>
                          <span className="text-base font-ninja text-white tracking-wider">
                            {handDetected ? (detectedSign === selectedJutsu?.sequence[currentStep] ? "SEAL RECOGNIZED!" : `PERFORM ${currentSign?.name[lang].toUpperCase()}`) : "ALIGNING SENSES..."}
                          </span>
                       </div>
                    </div>
                </div>
              </>
            )}

            {activeEffect && (
              <div className="absolute inset-0 z-40 bg-black flex items-center justify-center overflow-hidden">
                {JUTSU_LIST.find(j => j.id === activeEffect)?.videoUrl && (
                  <video autoPlay muted playsInline className="w-full h-full object-cover">
                    <source src={JUTSU_LIST.find(j => j.id === activeEffect)!.videoUrl} type="video/mp4" />
                  </video>
                )}
                <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
                <h2 className="absolute z-50 text-6xl md:text-9xl font-ninja text-white uppercase drop-shadow-[0_0_50px_rgba(255,165,0,0.9)] scale-110 animate-pulse text-center px-4">
                  {JUTSU_LIST.find(j => j.id === activeEffect)?.name[lang]}
                </h2>
              </div>
            )}
          </div>

          <div className="w-full mt-8 bg-zinc-900 border-l-8 border-orange-500 p-6 rounded-r-2xl shadow-xl flex items-center min-h-[120px]">
            <div className="flex-1">
              <span className="text-orange-500 font-black mr-4 uppercase text-sm tracking-[0.3em]">{t.feedbackLabel}:</span>
              <p className="text-orange-100 font-medium italic text-xl md:text-2xl mt-2 leading-tight">
                "{feedback}"
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-ninja text-blue-400 uppercase mb-4">{t.sealGuide}</h2>
          {currentSign ? (
            <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-700 shadow-xl">
              <div className="relative aspect-square bg-zinc-800 flex items-center justify-center p-4">
                <img src={currentSign.imageUrl} alt={currentSign.name[lang]} className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
              </div>
              <div className="p-4 bg-zinc-900">
                <div className="text-orange-500 font-ninja text-sm mb-1">{currentSign.name[lang]}</div>
                <div className="text-[11px] text-zinc-400 leading-relaxed italic">
                  "{currentSign.description[lang]}"
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/30 rounded-2xl p-6 border border-dashed border-zinc-800 text-center min-h-[200px] flex items-center justify-center text-zinc-600 text-xs italic">
               The path of a ninja starts with a single seal. Choose wisely.
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
