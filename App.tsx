
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HAND_SIGNS, JUTSU_LIST } from './constants';
import { Jutsu, Language } from './types';
import { verifyHandSign } from './services/geminiService';
import { TRANSLATIONS } from './locales';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [selectedJutsu, setSelectedJutsu] = useState<Jutsu | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = TRANSLATIONS[lang];

  // Initial feedback
  useEffect(() => {
    if (!selectedJutsu) {
      setFeedback(t.welcome);
    }
  }, [lang, selectedJutsu]);

  // Camera Management
  useEffect(() => {
    if (isCapturing) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => {
          setFeedback(lang === 'en' ? "Camera access denied!" : "相机权限被拒绝！");
        });
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  }, [isCapturing, lang]);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !selectedJutsu || isVerifying || activeEffect) return;

    setIsVerifying(true);
    setFeedback(t.analyzing);

    const context = canvasRef.current.getContext('2d');
    if (context) {
      const videoWidth = videoRef.current.videoWidth || 640;
      const videoHeight = videoRef.current.videoHeight || 480;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
      context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      const targetSignId = selectedJutsu.sequence[currentStep];
      const targetSign = HAND_SIGNS[targetSignId];
      
      const result = await verifyHandSign(base64, targetSign.name[lang], lang);

      if (result.match) {
        if (currentStep === selectedJutsu.sequence.length - 1) {
          setFeedback(`${selectedJutsu.name[lang]} ${t.jutsuActivated}`);
          setActiveEffect(selectedJutsu.id);
          setCurrentStep(currentStep + 1);
          setIsVerifying(false);
          
          // Show effect for a few seconds then reset
          setTimeout(() => {
            setActiveEffect(null);
            setSelectedJutsu(null);
            setCurrentStep(0);
            setScanProgress(0);
          }, 6000);
        } else {
          setFeedback(`${t.nextSign} ${HAND_SIGNS[selectedJutsu.sequence[currentStep + 1]].name[lang]}`);
          setCurrentStep(prev => prev + 1);
          setIsVerifying(false);
          setScanProgress(0);
        }
      } else {
        setFeedback(result.tip || (lang === 'en' ? "Incorrect form." : "姿势不对。"));
        setIsVerifying(false);
        setScanProgress(0);
      }
    }
  }, [selectedJutsu, currentStep, isVerifying, activeEffect, lang, t]);

  // Hands-free Loop: Slowed down to 6 seconds to prevent 429 errors
  useEffect(() => {
    if (isCapturing && selectedJutsu && !isVerifying && !activeEffect) {
      const interval = 50; 
      const totalTime = 6000; // Increased from 3000 to 6000
      
      const timer = window.setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            captureAndVerify();
            return 0;
          }
          return prev + (interval / totalTime) * 100;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [isCapturing, selectedJutsu, isVerifying, activeEffect, captureAndVerify]);

  const handleSelectJutsu = (jutsu: Jutsu) => {
    setSelectedJutsu(jutsu);
    setCurrentStep(0);
    setIsCapturing(true);
    setActiveEffect(null);
    setScanProgress(0);
    setFeedback(`${t.focusChakra} ${HAND_SIGNS[jutsu.sequence[0]].name[lang]}.`);
  };

  const currentSignId = selectedJutsu?.sequence[currentStep];
  const currentSign = currentSignId ? HAND_SIGNS[currentSignId] : null;

  // Visual Effect Components with Video
  const JutsuVisualOverlay = () => {
    if (!activeEffect) return null;
    const activeJutsu = JUTSU_LIST.find(j => j.id === activeEffect);

    return (
      <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden bg-black">
        {/* Jutsu Video Clip */}
        {activeJutsu?.videoUrl && (
          <video 
            autoPlay 
            muted 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-1000"
          >
            <source src={activeJutsu.videoUrl} type="video/mp4" />
          </video>
        )}

        {/* Universal Text Overlay */}
        <div className="z-50 text-center animate-bounce-short">
          <h2 className={`text-6xl md:text-9xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-white drop-shadow-[0_0_30px_rgba(255,165,0,1)] uppercase tracking-widest`}>
            {activeJutsu?.name[lang]}
          </h2>
        </div>

        {/* Element Specific Particle/Flash Effects */}
        {activeEffect === 'chidori' && (
          <div className="absolute inset-0 bg-blue-500/20 mix-blend-screen">
            <div className="absolute inset-0 animate-lightning-flash"></div>
          </div>
        )}
        {activeEffect === 'fireball' && (
          <div className="absolute inset-0 bg-orange-600/20 mix-blend-screen">
             <div className="fireball-blast"></div>
          </div>
        )}
        {activeEffect === 'summoning' && (
          <div className="summon-smoke"></div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#0c0c0c] text-[#e5e5e5]">
      {/* Header */}
      <header className="w-full max-w-[1600px] flex justify-between items-center mb-8 border-b border-orange-900 pb-4">
        <div>
          <h1 className={`text-4xl md:text-5xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-orange-500 tracking-wider`}>
            {t.title}
          </h1>
          <p className="text-gray-400 italic text-sm md:text-base">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-zinc-800 rounded-full p-1 flex items-center shadow-inner border border-zinc-700">
             <button 
               onClick={() => setLang('en')}
               className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
             >EN</button>
             <button 
               onClick={() => setLang('zh')}
               className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'zh' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
             >中</button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Jutsu Selection */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className={`text-xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-blue-400 mb-4`}>{t.jutsuScrolls}</h2>
          {JUTSU_LIST.map(jutsu => (
            <button
              key={jutsu.id}
              onClick={() => handleSelectJutsu(jutsu)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                selectedJutsu?.id === jutsu.id 
                  ? 'bg-orange-900/40 border-orange-500 shadow-md shadow-orange-500/20' 
                  : 'bg-zinc-900 border-zinc-700 hover:border-blue-500'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2">
                  <span className={`text-sm md:text-base leading-tight ${lang === 'en' ? 'font-ninja' : 'font-bold'}`}>{jutsu.name[lang]}</span>
                  <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${
                    jutsu.difficulty.includes('A') ? 'bg-red-600' : 
                    jutsu.difficulty.includes('B') ? 'bg-orange-600' : 'bg-blue-600'
                  }`}>
                    {jutsu.difficulty}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{jutsu.description[lang]}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Center: Training Grounds */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className={`relative w-full aspect-video rounded-2xl overflow-hidden border-4 ${activeEffect ? 'border-orange-500 fire-glow' : 'border-zinc-800 chakra-glow'} bg-black shadow-2xl`}>
            
            {!isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-10 text-center p-6">
                <div className="w-24 h-24 mb-6 border-4 border-orange-500 rounded-full flex items-center justify-center shuriken-spin">
                    <div className="w-1 h-14 bg-orange-500 absolute"></div>
                    <div className="w-14 h-1 bg-orange-500 absolute"></div>
                </div>
                <h3 className={`text-3xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-orange-500 mb-4`}>{t.selectJutsu}</h3>
                <p className="text-gray-400 text-base">{t.selectJutsuSub}</p>
              </div>
            )}

            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Guide Overlay: Shown in center of screen */}
            {isCapturing && currentSign && !activeEffect && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
                <div className="relative group">
                  <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                  <img 
                    src={currentSign.imageUrl} 
                    alt="Guide" 
                    className="w-48 h-48 md:w-64 md:h-64 object-contain opacity-40 mix-blend-screen filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-500 hover:opacity-60"
                  />
                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className={`text-xs font-black text-blue-400/60 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm`}>
                      {t.sealGuide}: {currentSign.name[lang]}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Jutsu Completion Visuals & Video */}
            <JutsuVisualOverlay />

            {/* Scanning Line Animation */}
            {isCapturing && !activeEffect && !isVerifying && (
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/80 shadow-[0_0_20px_blue] animate-scan z-10 pointer-events-none"></div>
            )}

            {/* Overlays */}
            <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none z-20">
              {selectedJutsu && (
                <div className="bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
                   <p className="text-[10px] uppercase text-blue-400 font-black tracking-widest mb-1">{t.currentTask}</p>
                   <p className={`text-2xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-white`}>{currentSign?.name[lang] || "---"}</p>
                </div>
              )}
              {selectedJutsu && (
                <div className="bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right shadow-2xl">
                   <p className="text-[10px] uppercase text-orange-400 font-black tracking-widest mb-1">{t.progress}</p>
                   <p className={`text-2xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-white`}>{Math.min(currentStep + 1, selectedJutsu.sequence.length)}/{selectedJutsu.sequence.length}</p>
                </div>
              )}
            </div>

            {/* Hands-free Status */}
            {isCapturing && !activeEffect && (
              <div className="absolute bottom-8 flex flex-col items-center w-full z-20 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-xl px-10 py-4 rounded-full border border-orange-500/30 flex items-center gap-6 shadow-2xl scale-110 transition-all duration-300">
                   <div className="relative w-10 h-10 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="20" cy="20" r="18" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                        <circle cx="20" cy="20" r="18" fill="transparent" stroke="#f97316" strokeWidth="4" 
                          strokeDasharray={113}
                          strokeDashoffset={113 - (113 * scanProgress) / 100}
                          className="transition-all duration-75"
                        />
                      </svg>
                      {isVerifying && <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-50"></div>}
                   </div>
                   <span className={`text-2xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-white tracking-[0.2em]`}>
                     {isVerifying ? t.analyzing : "SENSEI WATCHING..."}
                   </span>
                </div>
              </div>
            )}
          </div>

          <div className="w-full mt-8 bg-zinc-900/90 border-l-8 border-orange-500 p-6 rounded-r-2xl shadow-2xl backdrop-blur-md min-h-[120px] flex items-center">
            <p className="text-orange-100 font-medium italic text-xl md:text-2xl leading-relaxed">
              <span className="text-orange-500 font-black mr-4 uppercase text-sm tracking-[0.3em]">{t.senseiLabel}:</span>
              "{feedback}"
            </p>
          </div>
        </div>

        {/* Right: Hand Sign Guide */}
        <div className="lg:col-span-2">
          <h2 className={`text-xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-blue-400 mb-4`}>{t.sealGuide}</h2>
          {currentSign ? (
             <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl animate-in slide-in-from-right duration-500">
               <div className="relative aspect-square bg-zinc-800 flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-full"></div>
                 <img 
                   src={currentSign.imageUrl} 
                   alt={currentSign.name[lang]} 
                   className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" 
                 />
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                   <h3 className={`text-sm font-bold text-white`}>{currentSign.name[lang]}</h3>
                 </div>
               </div>
               <div className="p-4 bg-zinc-900">
                 <p className="text-xs text-gray-400 leading-relaxed italic">"{currentSign.description[lang]}"</p>
               </div>
             </div>
          ) : (
            <div className="bg-zinc-900/50 rounded-2xl p-6 border border-dashed border-zinc-700 text-center flex flex-col items-center justify-center min-h-[200px]">
               <div className="text-3xl opacity-20 mb-3">📜</div>
               <p className="text-zinc-500 text-[10px] italic">Target seal reference will appear here.</p>
            </div>
          )}

          <div className="mt-8">
            <h3 className={`text-sm font-bold text-zinc-600 mb-3 flex items-center uppercase tracking-widest`}>
              <span className="mr-2">💡</span> Mastery Tips
            </h3>
            <ul className="text-[10px] space-y-3 text-zinc-500">
              <li className="flex items-start">
                <span className="text-orange-500 mr-2 font-bold">•</span>
                <span>Wait for the circular meter to auto-scan (Every 6s).</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2 font-bold">•</span>
                <span>The central image shows the Target Seal you must match.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
