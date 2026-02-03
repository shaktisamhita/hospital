
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { MessageCircle, X, Send, Bot, User, Loader2, Info, Mic, MicOff, Volume2, Sparkles, AlertCircle, Headphones } from 'lucide-react';
import { useLanguage } from '../App';
import { api } from '../services/api';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

// Manual implementation of base64 encode/decode as per guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ChatBot = () => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputText = useRef('');
  const currentOutputText = useRef('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isVoiceActive, liveTranscription]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'bot', text: t('chat_welcome') }]);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopVoiceMode();
    };
  }, []);

  const stopVoiceMode = () => {
    setIsVoiceActive(false);
    setLiveTranscription('');
    
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch (e) {}
      liveSessionRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
      try { inputAudioContextRef.current.close(); } catch (e) {}
      inputAudioContextRef.current = null;
    }
    
    if (outputAudioContextRef.current) {
      try { outputAudioContextRef.current.close(); } catch (e) {}
      outputAudioContextRef.current = null;
    }
    
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    currentInputText.current = '';
    currentOutputText.current = '';
  };

  const getWaitTimeFunction: FunctionDeclaration = {
    name: 'get_hospital_wait_times',
    parameters: {
      type: Type.OBJECT,
      description: 'Get the estimated wait time for a specific doctor or department in minutes.',
      properties: {
        doctor_name: { type: Type.STRING, description: 'The name of the doctor (e.g. Sarah Jones)' },
        specialty: { type: Type.STRING, description: 'The department or specialty name' }
      }
    }
  };

  const startVoiceMode = async () => {
    try {
      setConnectionError(null);
      setIsVoiceActive(true);
      setLiveTranscription('Initializing MedLink Voice...');

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      await inputCtx.resume();
      await outputCtx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setLiveTranscription('MedLink Voice Active. Speak now.');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Function Calling
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'get_hospital_wait_times') {
                  const waitTime = Math.floor(Math.random() * 40) + 5;
                  const result = `The current wait time is approximately ${waitTime} minutes.`;
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: result } }
                    });
                  });
                }
              }
            }

            // Audio Logic
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const oCtx = outputAudioContextRef.current;
              if (oCtx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, oCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), oCtx, 24000, 1);
                const sourceNode = oCtx.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(oCtx.destination);
                sourceNode.addEventListener('ended', () => activeSourcesRef.current.delete(sourceNode));
                sourceNode.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                activeSourcesRef.current.add(sourceNode);
              }
            }

            // Transcription
            if (message.serverContent?.inputTranscription) {
              currentInputText.current += message.serverContent.inputTranscription.text;
              setLiveTranscription(`You: ${currentInputText.current}`);
            } else if (message.serverContent?.outputTranscription) {
              currentOutputText.current += message.serverContent.outputTranscription.text;
              setLiveTranscription(`MedLink: ${currentOutputText.current}`);
            }

            if (message.serverContent?.turnComplete) {
              const userT = currentInputText.current.trim();
              const botT = currentOutputText.current.trim();
              if (userT || botT) {
                setMessages(prev => [
                  ...prev,
                  ...(userT ? [{ role: 'user', text: userT }] as Message[] : []),
                  ...(botT ? [{ role: 'bot', text: botT }] as Message[] : [])
                ]);
              }
              currentInputText.current = '';
              currentOutputText.current = '';
              setLiveTranscription('Ready for your question...');
            }

            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setLiveTranscription('Listening...');
            }
          },
          onerror: (e) => {
            console.error("Live Audio Session Error:", e);
            setConnectionError("Voice session disconnected. Please check your mic.");
            stopVoiceMode();
          },
          onclose: () => stopVoiceMode(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [getWaitTimeFunction] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are the MedLink Hospital Multilingual Voice Assistant.
          Respond in ${language === 'gu' ? 'Gujarati' : language === 'hi' ? 'Hindi' : 'English'}.
          You can provide hospital info and estimated wait times. 
          Be professional, concise, and helpful. Do not provide medical prescriptions.`,
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Voice initialization failed:", err);
      setConnectionError("Failed to access microphone.");
      setIsVoiceActive(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: `You are the MedLink Hospital Assistant. Respond in ${language === 'gu' ? 'Gujarati' : language === 'hi' ? 'Hindi' : 'English'}.`,
        },
      });
      const botText = response.text || "I couldn't process that.";
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: "Service error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 group relative"
        >
          <MessageCircle className="w-8 h-8" />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Consult AI
          </span>
        </button>
      ) : (
        <div className="bg-white w-[380px] h-[650px] rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="bg-slate-900 p-6 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Headphones className="w-24 h-24 text-white" />
            </div>
            <div className="flex items-center gap-4 z-10">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-900/50">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-widest">{t('chat_title')}</h3>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isVoiceActive ? 'bg-blue-400 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                    {isVoiceActive ? 'Voice Active' : 'Online'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => { stopVoiceMode(); setIsOpen(false); }} className="text-slate-400 hover:text-white transition-colors z-10">
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/50 relative">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 shadow-sm text-slate-500'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            
            {isVoiceActive && (
              <div className="sticky bottom-0 left-0 right-0 py-8 px-4 flex flex-col items-center gap-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
                 <div className="flex items-center gap-2.5 h-10">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-blue-500 rounded-full animate-bounce" 
                      style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s`, animationDuration: `${0.5 + Math.random()}s` }}
                    ></div>
                  ))}
                </div>
                <div className="bg-slate-900/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 border border-slate-700">
                  <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                  {liveTranscription}
                </div>
              </div>
            )}

            {connectionError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3 text-xs font-black uppercase tracking-tight">
                <AlertCircle className="w-5 h-5" />
                {connectionError}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 items-center bg-white/50 px-4 py-2 rounded-full border border-slate-100">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consulting AI...</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Area */}
          <div className="flex flex-col bg-white border-t border-slate-100">
            <div className="p-4 flex flex-col gap-3">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  disabled={isVoiceActive}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isVoiceActive ? "Listening for voice..." : t('chat_placeholder')}
                  className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none font-medium disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || isVoiceActive}
                  className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              
              <button
                onClick={isVoiceActive ? stopVoiceMode : startVoiceMode}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] ${
                  isVoiceActive 
                    ? 'bg-red-600 text-white shadow-red-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                {isVoiceActive ? (
                  <>
                    <MicOff className="w-5 h-5" /> Stop Voice Assistant
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" /> Start Voice Consultation
                  </>
                )}
              </button>
            </div>
            <div className="px-6 py-3 bg-slate-50/50 flex items-center justify-center gap-2 border-t border-slate-100">
              <Info className="w-3 h-3 text-slate-300" />
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">
                AI can provide info only. Not medical advice.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
