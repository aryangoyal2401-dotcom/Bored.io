// Speech Synthesis (TTS) & Multilingual Speech Recognition (STT) Utility for MediKiosk
// Enables dual-input voice interaction for low-literacy patient accessibility across 12+ Indian languages
//
// TTS Priority: Server TTS → Browser SpeechSynthesis (fallback)
// STT Priority: Browser SpeechRecognition (real-time) + Server ASR (audio recording pipeline)

import { kioskAPI } from './api';

export const LANG_LOCALES = {
  hi: 'hi-IN',
  en: 'en-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  pa: 'pa-IN',
  ml: 'ml-IN',
  or: 'or-IN',
  as: 'as-IN'
};

class KioskSpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.isListening = false;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.recordedChunks = [];
    this.supported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

    // Server TTS audio context for playback
    this._audioContext = null;
    this._currentAudioSource = null;
  }

  // ==================== TEXT-TO-SPEECH (TTS) ====================

  /**
   * Speak text using server TTS first, then fallback to browser SpeechSynthesis.
   * For Indian languages (hi, mr, bn, ta, te, gu, kn, pa, ml, or, as), the server
   * provides much more natural-sounding voices than browser defaults.
   * 
   * @param {string} text - Text to speak
   * @param {string} lang - Language code (e.g., 'hi', 'en', 'mr')
   * @param {string} gender - Voice gender ('female' or 'male')
   */
  speak(text, lang = 'hi', gender = 'female') {
    if (!text) return;

    // For Indian languages, try server TTS first (async, non-blocking)
    const isIndianLang = lang !== 'en' && LANG_LOCALES[lang];
    if (isIndianLang) {
      this.speakWithServer(text, lang, gender).catch(() => {
        // If server TTS fails, fall back to browser synthesis
        this._speakWithBrowser(text, lang);
      });
    } else {
      // English or unsupported: use browser synthesis directly
      this._speakWithBrowser(text, lang);
    }
  }

  /**
   * Speak text using server TTS pipeline.
   * Returns natural Indian language audio via the backend /kiosk/speech/tts endpoint.
   * 
   * @param {string} text - Text to speak
   * @param {string} lang - Language code
   * @param {string} gender - Voice gender
   * @returns {Promise<boolean>} - true if TTS succeeded
   */
  async speakWithServer(text, lang = 'hi', gender = 'female') {
    if (!text) return false;

    try {
      // Stop any currently playing audio
      this.stopSpeaking();

      const result = await kioskAPI.textToSpeech(text, lang, gender);

      if (result.success && result.audio_content) {
        // Decode base64 audio and play via AudioContext
        await this._playBase64Audio(result.audio_content);
        return true;
      }

      // If server indicates fallback to browser
      if (result.fallback_to_browser) {
        this._speakWithBrowser(text, lang);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[TTS] Failed, falling back to browser:', err.message || err);
      this._speakWithBrowser(text, lang);
      return false;
    }
  }

  /**
   * Browser-native SpeechSynthesis fallback
   * @private
   */
  _speakWithBrowser(text, lang = 'hi') {
    if (!this.synth || !text) return;

    try {
      this.synth.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      const targetLocale = LANG_LOCALES[lang] || 'hi-IN';
      utterance.lang = targetLocale;
      utterance.rate = 0.95; // Slightly slower for low-literacy clarity
      utterance.pitch = 1.0;

      // Select natural voice matching language if available in browser
      const voices = this.synth.getVoices();
      const targetVoice = voices.find(v => 
        v.lang === targetLocale || 
        v.lang.startsWith(lang) || 
        v.name.toLowerCase().includes(lang)
      );
      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      this.synth.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  /**
   * Play base64-encoded audio content using Web Audio API
   * @private
   */
  async _playBase64Audio(base64Audio) {
    try {
      // Initialize AudioContext on first use (must be after user gesture)
      if (!this._audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this._audioContext = new AudioContextClass();
      }

      // Resume context if suspended (browser autoplay policy)
      if (this._audioContext.state === 'suspended') {
        await this._audioContext.resume();
      }

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this._audioContext.decodeAudioData(bytes.buffer);

      // Stop any currently playing source
      if (this._currentAudioSource) {
        try {
          this._currentAudioSource.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }

      // Create and play buffer source
      const source = this._audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this._audioContext.destination);
      source.start(0);
      this._currentAudioSource = source;

      // Clean up reference when playback ends
      source.onended = () => {
        this._currentAudioSource = null;
      };
    } catch (err) {
      console.warn('[TTS] Audio playback error:', err);
      throw err; // Re-throw to trigger browser fallback
    }
  }

  stopSpeaking() {
    // Stop browser synthesis
    if (this.synth) {
      this.synth.cancel();
    }

    // Stop server audio playback
    if (this._currentAudioSource) {
      try {
        this._currentAudioSource.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this._currentAudioSource = null;
    }
  }

  // ==================== SPEECH RECOGNITION (STT) ====================

  // Engine A: Browser Speech Recognition (STT with Indian Language Locales)
  startListening({
    lang = 'hi',
    onResult,
    onError,
    onEnd
  }) {
    if (!this.supported) {
      if (onError) onError('Browser speech recognition not supported in this browser. Falling back to Bhashini Audio Recording.');
      return false;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true; // Stay active during natural sentence pauses
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = LANG_LOCALES[lang] || 'hi-IN';

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (onResult) {
          onResult({
            final: finalTranscript,
            interim: interimTranscript,
            text: finalTranscript || interimTranscript
          });
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Browser speech recognition notice:', event.error);
        if (event.error === 'no-speech') {
          // Keep listening on brief silence
          return;
        }
        this.isListening = false;
        if (onError) onError(event.error);
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Restart if user hasn't explicitly stopped listening
          try {
            this.recognition.start();
          } catch (e) {
            this.isListening = false;
            if (onEnd) onEnd();
          }
        } else {
          if (onEnd) onEnd();
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('Failed to start browser speech recognition:', err);
      this.isListening = false;
      if (onError) onError(err.message);
      return false;
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore stop error
      }
      this.recognition = null;
    }
  }

  // Engine B: Native MediaRecorder Audio Capture for Server ASR Pipeline
  // Works on ALL browsers and mobile devices even when browser SpeechRecognition fails
  async startRecordingAudio({ onStart, onError } = {}) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio recording API not available in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      this.mediaStream = stream;
      this.recordedChunks = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // Slice into 250ms chunks
      this.isRecording = true;
      if (onStart) onStart();
      return true;
    } catch (err) {
      console.warn('Failed to start MediaRecorder:', err);
      this.isRecording = false;
      if (onError) onError(err.message || 'Microphone access denied');
      return false;
    }
  }

  async stopRecordingAudio() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.isRecording = false;
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
        this.isRecording = false;

        // Release microphone hardware
        if (this.mediaStream) {
          try {
            this.mediaStream.getTracks().forEach(track => track.stop());
          } catch (e) {
            // Ignore track release errors
          }
          this.mediaStream = null;
        }

        resolve(audioBlob);
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this.isRecording = false;
        resolve(null);
      }
    });
  }

  // Transcribe audio using the server backend pipeline
  async transcribeWithServer(audioBlob, language = 'hi', patientId = null) {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('No audio data recorded.');
    }
    return await kioskAPI.transcribeAudio(audioBlob, language, patientId);
  }

  // ==================== TRANSLATION (NMT) UTILITY ====================

  /**
   * Translate text between Indian languages using NMT.
   * Convenience wrapper around kioskAPI.translateText.
   * 
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {Promise<Object>} - Translation result
   */
  async translate(text, sourceLang = 'hi', targetLang = 'en') {
    return await kioskAPI.translateText(text, sourceLang, targetLang);
  }

  /**
   * Translate text and speak it in the target language.
   * Chains NMT + TTS in a single call.
   * 
   * @param {string} text - Text to translate and speak
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {string} gender - Voice gender
   * @returns {Promise<Object>} - Result with translated text and audio
   */
  async translateAndSpeak(text, sourceLang = 'en', targetLang = 'hi', gender = 'female') {
    const result = await kioskAPI.translateAndSpeak(text, sourceLang, targetLang, gender);

    // Auto-play the audio if available
    if (result.audio_content) {
      await this._playBase64Audio(result.audio_content);
    } else if (result.translated_text) {
      // Fallback: speak translated text with browser synthesis
      this._speakWithBrowser(result.translated_text, targetLang);
    }

    return result;
  }
}

export const speechService = new KioskSpeechService();
export default speechService;
