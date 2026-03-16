import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * YAYA LIVE 2026 - FINAL LIQUID GLASS EDITION
 * Fixed Gemini 3.0 (400) logic and implemented 429 Anti-Spam safety.
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_KEY = "AIzaSyAyxDJ2X-1pGbZciGIbeuxAY7CfvznyldM";
const MODEL_NAME = "gemini-3-flash-preview";

// ─── HUME AI TTS (Premium Voice) ─────────────────────────────────────────────
const HUME_KEYS = ["o9HesXre4W5Jvk1ZPvEWxVNk01mLJPmvjBJUTngAEU74T2A1"];
const playPremiumVoice = async (text, onEnd) => {
  if (window.currentHumeAudio) {
    window.currentHumeAudio.pause();
    window.currentHumeAudio.currentTime = 0;
    window.currentHumeAudio = null;
  }
  try {
    const response = await fetch('https://api.hume.ai/v0/tts/file', {
      method: 'POST',
      headers: { 'X-Hume-Api-Key': HUME_KEYS[0], 'Content-Type': 'application/json' },
      body: JSON.stringify({ utterances: [{ text, voice: { name: "Male English Actor", provider: "HUME_AI" } }] })
    });
    if (!response.ok) throw new Error();
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    window.currentHumeAudio = audio;
    audio.playbackRate = 1.15;
    if (onEnd) audio.onended = onEnd;
    audio.play();
  } catch {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = text.match(/[a-zA-Z]/) ? 'en-US' : 'ar-EG';
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  }
};

const speak = (text, onEnd) => {
  window.speechSynthesis.cancel();
  playPremiumVoice(text, onEnd);
};

// ─── LOCAL STORAGE ──────────────────────────────────────────────────────────
const ls = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { } },
};

export default function App() {
  const [userProfile] = useState(() => ls.get('yaya_profile', { goal: 'general health' }));
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [liveResponse, setLiveResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState('user');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isCallingRef = useRef(false);

  // ─── CAMERA ───
  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.warn('Preferred camera not found, falling back to any camera...', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) videoRef.current.srcObject = fallbackStream;
      } catch (fallbackErr) {
        console.error('Camera completely failed:', fallbackErr);
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const switchCamera = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const video = devices.filter(d => d.kind === 'videoinput');
    if (video.length <= 1) return;
    const curIdx = video.findIndex(c => c.deviceId === activeDeviceId);
    const nextIdx = (curIdx + 1) % video.length;
    setActiveDeviceId(video[nextIdx].deviceId);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraOn || video.readyState < 2) return null;
    canvas.width = 320; canvas.height = 240;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
  };

  useEffect(() => {
    if (isCameraOn) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isCameraOn, activeDeviceId]);

  // ─── GEMINI 3.0 API (FIX 400 & 429) ───
  const callYayaAI = async (message) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const frame = captureFrame();
    const frames = frame ? [frame] : [];

    const systemPrompt = `Egyptian Arabic health AI. CASUAL. Brief voice-only replies. User goal: ${userProfile.goal}.`;

    const contents = [{
      role: "user",
      parts: [
        { text: `${systemPrompt}\n\nActual User Message: ${message}` },
        ...frames.map(f => ({ inlineData: { mimeType: 'image/jpeg', data: f } }))
      ]
    }];

    try {
      // Standard non-streaming URL for Gemini 3 Compatibility
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=AIzaSyAyxDJ2X-1pGbZciGIbeuxAY7CfvznyldM`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (!res.ok) {
        const errData = await res.json();
        const errMsg = errData?.error?.message || "Unknown error";
        alert("🚨 رسالة من سيرفر جوجل:\n" + errMsg);
        console.error("GEMINI ERROR DETAILS:", errData);
        throw new Error("Gemini API Error");
      }

      const data = await res.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'معلش في مشكلة.';
      speak(aiText);

    } catch (err) {
      console.error('API error:', err);
      speak('معلش في مشكلة في الاتصال، حاول تاني.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── VOICE INPUT (ANTI-SPAM 429) ───
  const handleMicPress = useCallback(() => {
    if (isRecording || isProcessing) return;
    window.speechSynthesis.cancel();
    if (window.currentHumeAudio) { window.currentHumeAudio.pause(); window.currentHumeAudio = null; }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ar-EG';
    rec.interimResults = false; // AS REQUESTED

    rec.onstart = () => setIsRecording(true);
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    rec.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      if (result.isFinal && !isProcessing) {
        const transcript = result[0].transcript;
        if (transcript.trim()) callYayaAI(transcript);
      }
    };
    rec.start();
  }, [isRecording, isProcessing]);

  const startRecording = handleMicPress;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #e0f2fe 0%, #dcfce3 50%, #f3e8ff 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* التوب بار - زجاج سائل شفاف */}
      <div style={{ position: 'absolute', top: '45px', left: '50%', transform: 'translateX(-50%)', padding: '12px 30px', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)', border: '1px solid rgba(255, 255, 255, 0.7)', borderRadius: '40px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 20, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 12px #10b981' }}></div>
      </div>

      {/* الكاميرا (مفيش أي صور ولا قطط هنا) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {isCameraOn && (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>


      {/* شريط الأزرار (Liquid Glass Dock) - ستايل 2026 */}
      <div style={{ position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)', padding: '12px 15px', background: 'rgba(255, 255, 255, 0.35)', backdropFilter: 'blur(35px)', WebkitBackdropFilter: 'blur(35px)', border: '1.5px solid rgba(255, 255, 255, 0.6)', borderRadius: '60px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>

        {/* 1. زر الكاميرا */}
        <button onClick={() => setIsCameraOn(!isCameraOn)} style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', opacity: isCameraOn ? 1 : 0.5 }}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22" height="22"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
        </button>

        {/* 2. قلب الكاميرا */}
        <button onClick={switchCamera} style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22" height="22"><path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" /></svg>
        </button>

        {/* 3. المايك في المنتصف */}
        <button onClick={startRecording} style={{ width: '70px', height: '70px', borderRadius: '50%', background: isRecording ? 'linear-gradient(135deg, #ef4444, #f87171)' : 'linear-gradient(135deg, #10b981, #34d399)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', transition: 'all 0.3s' }}>
          <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="30" height="30"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" /></svg>
        </button>

        {/* 4. إعدادات / ملف شخصي */}
        <button style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </button>
      </div>
    </div>
  );
}