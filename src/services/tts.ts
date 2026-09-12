// Text-to-Speech service for AI commentary
let isSpeaking = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voicesLoaded = false;
let availableVoices: SpeechSynthesisVoice[] = [];

// Load voices (they load asynchronously)
function loadVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  const loadVoicesList = () => {
    availableVoices = window.speechSynthesis.getVoices();
    voicesLoaded = availableVoices.length > 0;
  };
  
  // Load immediately if available
  loadVoicesList();
  
  // Also listen for voiceschanged event
  window.speechSynthesis.onvoiceschanged = loadVoicesList;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  loadVoices();
}

// Check if TTS is available
export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Get available voices
export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTTSAvailable()) return [];
  if (!voicesLoaded) {
    availableVoices = window.speechSynthesis.getVoices();
  }
  return availableVoices;
}

// Speak text
export function speak(text: string, options?: {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
}): void {
  if (!isTTSAvailable()) {
    console.warn('TTS not available in this browser');
    return;
  }

  // Stop any current speech
  stop();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;
  utterance.volume = options?.volume ?? 0.8;

  if (options?.voice) {
    utterance.voice = options.voice;
  } else if (availableVoices.length > 0) {
    // Try to find a good English voice
    const englishVoice = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
  }

  utterance.onstart = () => { isSpeaking = true; };
  utterance.onend = () => { isSpeaking = false; currentUtterance = null; };
  utterance.onerror = () => { isSpeaking = false; currentUtterance = null; };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

// Stop speaking
export function stop(): void {
  if (isTTSAvailable()) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    currentUtterance = null;
  }
}

// Check if currently speaking
export function getIsSpeaking(): boolean {
  return isSpeaking;
}
