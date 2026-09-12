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
  
  // Cancel any ongoing speech
  stop();
  
  // Small delay to ensure previous speech is cancelled
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 0.8;
    
    // Get voices if not loaded yet
    if (!voicesLoaded) {
      availableVoices = window.speechSynthesis.getVoices();
      voicesLoaded = availableVoices.length > 0;
    }
    
    // Select voice
    if (options?.voice) {
      utterance.voice = options.voice;
    } else {
      // Try to find a good English voice
      const englishVoice = availableVoices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural'))
      ) || availableVoices.find(v => v.lang.startsWith('en-US')) ||
         availableVoices.find(v => v.lang.startsWith('en-GB')) ||
         availableVoices.find(v => v.lang.startsWith('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }
    
    utterance.onstart = () => {
      isSpeaking = true;
      console.log('TTS started:', text);
    };
    
    utterance.onend = () => {
      isSpeaking = false;
      currentUtterance = null;
      console.log('TTS ended');
    };
    
    utterance.onerror = (event) => {
      console.error('TTS error:', event.error);
      isSpeaking = false;
      currentUtterance = null;
    };
    
    currentUtterance = utterance;
    
    try {
      window.speechSynthesis.speak(utterance);
      console.log('Speaking:', text);
    } catch (error) {
      console.error('Failed to speak:', error);
    }
  }, 100);
}

// Stop speaking
export function stop(): void {
  if (!isTTSAvailable()) return;
  
  try {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    currentUtterance = null;
  } catch (error) {
    console.error('Failed to stop TTS:', error);
  }
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
