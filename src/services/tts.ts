// Text-to-Speech service for AI commentary
let speechSynthesis: SpeechSynthesis | null = null;
let isSpeaking = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Check if TTS is available
export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Get available voices
export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTTSAvailable()) return [];
  return window.speechSynthesis.getVoices();
}

// Speak text
export function speak(text: string, options?: {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}): void {
  if (!isTTSAvailable()) return;
  
  // Cancel any ongoing speech
  stop();
  
  speechSynthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;
  utterance.volume = options?.volume || 1.0;
  
  if (options?.voice) {
    utterance.voice = options.voice;
  } else {
    // Try to find a good English voice
    const voices = getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                         voices.find(v => v.lang.startsWith('en-US')) ||
                         voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
  }
  
  utterance.onstart = () => {
    isSpeaking = true;
  };
  
  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
  };
  
  utterance.onerror = () => {
    isSpeaking = false;
    currentUtterance = null;
  };
  
  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

// Stop speaking
export function stop(): void {
  if (!isTTSAvailable()) return;
  
  if (speechSynthesis) {
    speechSynthesis.cancel();
  }
  isSpeaking = false;
  currentUtterance = null;
}

// Check if currently speaking
export function isCurrentlySpeaking(): boolean {
  return isSpeaking;
}

// Toggle TTS
export function toggleTTS(text: string, options?: {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}): void {
  if (isSpeaking) {
    stop();
  } else {
    speak(text, options);
  }
}
