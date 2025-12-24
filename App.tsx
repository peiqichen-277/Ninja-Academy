
import React, { useState, useRef, useEffect } from 'react';
import { HAND_SIGNS, JUTSU_LIST } from './constants';
import { Jutsu, Language, RecognitionResult } from './types';
import { verifyHandSign } from './services/geminiService';
import { TRANSLATIONS } from './locales';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [selectedJutsu, setSelectedJutsu] = useState<Jutsu | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<string>(TRANSLATIONS[lang].welcome);
  const [activationEffect, setActivationEffect] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = TRANSLATIONS[lang];

  // Update initial feedback when language changes
  useEffect(() => {
    if (!selectedJutsu) {
      setFeedback(t.welcome);
    }
  }, [lang]);

  useEffect(() => {
    if (isCapturing) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => {
          setFeedback(lang === 'en' ? "Camera denied!" : "相机权限被拒绝！");
        });
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  }, [isCapturing]);

  const handleSelectJutsu = (jutsu: Jutsu) => {
    setSelectedJutsu(jutsu);
    setCurrentStep(0);
    setIsCapturing(true);
    setActivationEffect(false);
    setFeedback(`${t.focusChakra} ${HAND_SIGNS[jutsu.sequence[0]].name[lang]}.`);
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedJutsu || isVerifying) return;

    setIsVerifying(true);
    setFeedback(t.observing);

    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, 640, 480);
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      const targetSignId = selectedJutsu.sequence[currentStep];
      const targetSign = HAND_SIGNS[targetSignId];
      
      const result = await verifyHandSign(base64, targetSign.name[lang], lang);

      if (result.match) {
        if (currentStep === selectedJutsu.sequence.length - 1) {
          setFeedback(`${selectedJutsu.name[lang]} ${t.jutsuActivated}`);
          setActivationEffect(true);
          setCurrentStep(currentStep + 1);
          setIsVerifying(false);
          setTimeout(() => setActivationEffect(false), 5000);
        } else {
          setFeedback(`${t.nextSign} ${HAND_SIGNS[selectedJutsu.sequence[currentStep + 1]].name[lang]}`);
          setCurrentStep(prev => prev + 1);
          setIsVerifying(false);
        }
      } else {
        setFeedback(result.tip || (lang === 'en' ? "Incorrect form." : "姿势不对。"));
        setIsVerifying(false);
      }
    }
  };

  const currentSignId = selectedJutsu?.sequence[currentStep];
  const currentSign = currentSignId ? HAND_SIGNS[currentSignId] : null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#0c0c0c] text-[#e5e5e5]">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-orange-900 pb-4">
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
          <div className="hidden sm:block">
            <div className="w-12 h-12 rounded-full border-2 border-orange-500 bg-orange-500/10 flex items-center justify-center overflow-hidden">
               <span className="text-orange-500 font-bold text-2xl">忍</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Jutsu Selection */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className={`text-2xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-blue-400 mb-4`}>{t.jutsuScrolls}</h2>
          {JUTSU_LIST.map(jutsu => (
            <button
              key={jutsu.id}
              onClick={() => handleSelectJutsu(jutsu)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                selectedJutsu?.id === jutsu.id 
                  ? 'bg-orange-900/40 border-orange-500 shadow-md shadow-orange-500/20' 
                  : 'bg-zinc-900 border-zinc-700 hover:border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-lg ${lang === 'en' ? 'font-ninja' : 'font-bold'}`}>{jutsu.name[lang]}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  jutsu.difficulty.includes('A') ? 'bg-red-600' : 
                  jutsu.difficulty.includes('B') ? 'bg-orange-600' : 'bg-blue-600'
                }`}>
                  {jutsu.difficulty}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2 line-clamp-2">{jutsu.description[lang]}</p>
            </button>
          ))}
        </div>

        {/* Center: Training Grounds */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className={`relative w-full aspect-video rounded-2xl overflow-hidden border-4 ${activationEffect ? 'border-red-500 fire-glow' : 'border-zinc-800 chakra-glow'} bg-black group`}>
            
            {!isCapturing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-10 text-center p-6">
                <div className="w-20 h-20 mb-6 border-4 border-orange-500 rounded-full flex items-center justify-center shuriken-spin">
                    <div className="w-1 h-12 bg-orange-500 absolute"></div>
                    <div className="w-12 h-1 bg-orange-500 absolute"></div>
                </div>
                <h3 className={`text-2xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-orange-500 mb-4`}>{t.selectJutsu}</h3>
                <p className="text-gray-400 text-sm">{t.selectJutsuSub}</p>
              </div>
            )}

            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} width="640" height="480" className="hidden" />

            {/* Overlays */}
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
              {selectedJutsu && (
                <div className="bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg">
                   <p className="text-[10px] uppercase text-blue-400 font-black tracking-tighter">{t.currentTask}</p>
                   <p className={`text-lg ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-white`}>{currentSign?.name[lang] || "---"}</p>
                </div>
              )}
              {selectedJutsu && (
                <div className="bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10 text-right shadow-lg">
                   <p className="text-[10px] uppercase text-orange-400 font-black tracking-tighter">{t.progress}</p>
                   <p className={`text-lg ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-white`}>{Math.min(currentStep + 1, selectedJutsu.sequence.length)}/{selectedJutsu.sequence.length}</p>
                </div>
              )}
            </div>

            {activationEffect && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-orange-600/25 animate-pulse overflow-hidden">
                <div className="absolute inset-0 animate-pulse bg-gradient-radial from-orange-500/20 to-transparent"></div>
                <div className={`text-6xl md:text-8xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-orange-500 drop-shadow-[0_0_30px_rgba(255,165,0,0.8)] animate-bounce`}>
                  {t.jutsuActivated}
                </div>
              </div>
            )}

            {isCapturing && !activationEffect && (
              <div className="absolute bottom-6 flex justify-center w-full z-10">
                <button
                  disabled={isVerifying}
                  onClick={captureAndVerify}
                  className={`px-8 py-4 rounded-full ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-2xl tracking-widest shadow-2xl transition-all duration-300 transform active:scale-95 ${
                    isVerifying ? 'bg-zinc-700 text-zinc-500 scale-95' : 'bg-orange-600 hover:bg-orange-500 text-white hover:scale-105 border-b-4 border-orange-800 active:border-b-0'
                  }`}
                >
                  {isVerifying ? t.analyzing : t.performingSeal}
                </button>
              </div>
            )}
          </div>

          <div className="w-full mt-6 bg-zinc-900/80 border-l-4 border-orange-500 p-5 rounded-r-xl shadow-2xl backdrop-blur-sm">
            <p className="text-orange-100 font-medium italic text-lg leading-relaxed">
              <span className="text-orange-500 font-black mr-3 uppercase text-sm tracking-widest">{t.senseiLabel}:</span>
              "{feedback}"
            </p>
          </div>
        </div>

        {/* Right: Hand Sign Guide */}
        <div className="lg:col-span-3">
          <h2 className={`text-2xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-blue-400 mb-4`}>{t.sealGuide}</h2>
          {currentSign ? (
             <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl animate-in slide-in-from-right duration-500">
               <div className="relative aspect-square bg-zinc-800 flex items-center justify-center p-6">
                 {/* Adding a subtle glow behind the seal image */}
                 <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full"></div>
                 <img 
                   src={currentSign.imageUrl} 
                   alt={currentSign.name[lang]} 
                   className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                 />
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                   <h3 className={`text-xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-white`}>{currentSign.name[lang]}</h3>
                 </div>
               </div>
               <div className="p-5 bg-zinc-900">
                 <p className="text-sm text-gray-300 leading-relaxed">{currentSign.description[lang]}</p>
                 <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
                    Active Training Reference
                 </div>
               </div>
             </div>
          ) : selectedJutsu && currentStep >= selectedJutsu.sequence.length ? (
            <div className="bg-orange-900/30 rounded-2xl p-8 border-2 border-orange-500/50 text-center shadow-2xl">
              <div className="text-5xl mb-6 animate-bounce">🔥</div>
              <h3 className={`text-2xl ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-orange-400 mb-3`}>{t.mastered}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{t.masteredSub}</p>
              <button 
                onClick={() => setSelectedJutsu(null)} 
                className="mt-8 w-full py-3 bg-zinc-800 hover:bg-orange-600 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all transform hover:scale-105 active:scale-95"
              >
                {t.chooseAnother}
              </button>
            </div>
          ) : (
            <div className="bg-zinc-900/50 rounded-2xl p-8 border border-dashed border-zinc-700 text-center flex flex-col items-center justify-center min-h-[300px]">
               <div className="text-4xl opacity-20 mb-4">📜</div>
               <p className="text-zinc-500 text-sm italic">The wisdom of the seals will appear here as you train.</p>
            </div>
          )}

          <div className="mt-10">
            <h3 className={`text-lg ${lang === 'en' ? 'font-ninja' : 'font-bold'} text-zinc-600 mb-4 flex items-center`}>
              <span className="mr-2">💡</span> {t.ninjaTips}
            </h3>
            <ul className="text-xs space-y-4 text-zinc-500">
              <li className="flex items-start">
                <span className="text-orange-500 mr-2 font-bold">•</span>
                <span>{t.tip1}</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2 font-bold">•</span>
                <span>{t.tip2}</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2 font-bold">•</span>
                <span>{t.tip3}</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="mt-auto w-full max-w-6xl pt-16 pb-8 border-t border-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-700 text-[10px] uppercase font-bold tracking-[0.2em]">
         <p>© 2025 SHINOBI ACADEMY</p>
         <div className="flex gap-6">
            <span className="hover:text-orange-500 cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-orange-500 cursor-pointer transition-colors">Archive</span>
            <span className="hover:text-orange-500 cursor-pointer transition-colors">Privacy Scroll</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
