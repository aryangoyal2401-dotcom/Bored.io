import React, { useState, useCallback } from 'react';
import { FiGlobe, FiVolume2, FiRefreshCw, FiCopy, FiCheck, FiArrowRight, FiRepeat } from 'react-icons/fi';
import { kioskAPI } from '../../utils/api';
import { speechService, LANG_LOCALES } from '../../utils/speech';

const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi',     native: 'हिन्दी' },
  { code: 'en', name: 'English',   native: 'English' },
  { code: 'mr', name: 'Marathi',   native: 'मराठी' },
  { code: 'bn', name: 'Bengali',   native: 'বাংলা' },
  { code: 'ta', name: 'Tamil',     native: 'தமிழ்' },
  { code: 'te', name: 'Telugu',    native: 'తెలుగు' },
  { code: 'gu', name: 'Gujarati',  native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada',   native: 'ಕನ್ನಡ' },
  { code: 'pa', name: 'Punjabi',   native: 'ਪੰਜਾਬੀ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
];

/**
 * TranslationPanel — Translation Widget
 * Reusable component for translating text between Indian languages.
 * 
 * Props:
 *   - initialText (string): Pre-filled text for translation
 *   - initialSourceLang (string): Source language code (default: 'hi')
 *   - initialTargetLang (string): Target language code (default: 'en')
 *   - compact (boolean): If true, renders in a smaller inline mode for dashboard
 *   - onTranslated (function): Callback with (translatedText, sourceLang, targetLang)
 *   - className (string): Additional CSS classes
 */
const TranslationPanel = ({
  initialText = '',
  initialSourceLang = 'hi',
  initialTargetLang = 'en',
  compact = false,
  onTranslated,
  className = ''
}) => {
  const [sourceText, setSourceText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState(initialSourceLang);
  const [targetLang, setTargetLang] = useState(initialTargetLang);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [engine, setEngine] = useState('');
  const [error, setError] = useState('');

  // Swap source <-> target languages
  const handleSwapLangs = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    // Also swap text if translated text exists
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  }, [sourceLang, targetLang, sourceText, translatedText]);

  // Translate text
  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;
    if (sourceLang === targetLang) {
      setTranslatedText(sourceText);
      setEngine('Same language — no translation needed');
      return;
    }

    setIsTranslating(true);
    setError('');
    setTranslatedText('');

    try {
      const result = await kioskAPI.translateText(sourceText.trim(), sourceLang, targetLang);
      if (result.success && result.translated_text) {
        setTranslatedText(result.translated_text);
        setEngine(result.engine || 'Translation Engine');
        if (onTranslated) {
          onTranslated(result.translated_text, sourceLang, targetLang);
        }
      } else {
        setError(result.error || 'Translation failed');
      }
    } catch (err) {
      setError(err.message || 'Translation request failed');
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, onTranslated]);

  // Speak translated text
  const handleSpeak = useCallback(async (text, lang) => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      await speechService.speakWithServer(text, lang);
    } catch {
      speechService._speakWithBrowser(text, lang);
    }
    // Allow some time for audio
    setTimeout(() => setIsSpeaking(false), 2000);
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const getLangName = (code) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.native} (${lang.name})` : code;
  };

  // ==================== COMPACT MODE (Inline for Dashboard) ====================
  if (compact) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <FiGlobe className="text-sky-600" size={16} />
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
            Translate
          </span>
        </div>

        {/* Language pair selector */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSwapLangs}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 transition-colors"
            title="Swap languages"
          >
            <FiRepeat size={14} />
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        </div>

        {/* Source text input */}
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Enter text to translate..."
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
          rows={2}
        />

        {/* Translate button */}
        <button
          type="button"
          onClick={handleTranslate}
          disabled={isTranslating || !sourceText.trim()}
          className={`mt-2 w-full py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            isTranslating
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm active:scale-[0.98]'
          }`}
        >
          {isTranslating ? (
            <>
              <FiRefreshCw size={14} className="animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <FiGlobe size={14} />
              Translate
            </>
          )}
        </button>

        {/* Translation result */}
        {translatedText && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-sm text-slate-800 leading-relaxed">{translatedText}</div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleSpeak(translatedText, targetLang)}
                className="p-1.5 rounded-lg bg-white hover:bg-sky-50 text-sky-700 border border-emerald-200 transition-colors"
                title="Listen"
              >
                <FiVolume2 size={14} className={isSpeaking ? 'animate-pulse' : ''} />
              </button>
              <button
                type="button"
                onClick={() => handleCopy(translatedText)}
                className="p-1.5 rounded-lg bg-white hover:bg-sky-50 text-slate-600 border border-emerald-200 transition-colors"
                title="Copy"
              >
                {copied ? <FiCheck size={14} className="text-emerald-600" /> : <FiCopy size={14} />}
              </button>
              <span className="text-[10px] text-slate-400 ml-auto">{engine}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ==================== FULL MODE (Kiosk / Standalone) ====================
  return (
    <div className={`max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <FiGlobe size={22} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Translate</h3>
            <p className="text-xs text-sky-100">
              Multilingual Translation Engine
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Language Pair Selector */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              From
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.native} ({l.name})</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapLangs}
            className="mt-6 p-2.5 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 transition-all active:scale-95"
            title="Swap languages"
          >
            <FiRepeat size={18} />
          </button>

          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              To
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.native} ({l.name})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Source Text Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {getLangName(sourceLang)}
            </label>
            <button
              type="button"
              onClick={() => handleSpeak(sourceText, sourceLang)}
              disabled={!sourceText.trim()}
              className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-30"
              title="Listen source text"
            >
              <FiVolume2 size={16} />
            </button>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={sourceLang === 'hi' ? 'यहाँ टेक्स्ट दर्ज करें...' : 'Enter text here...'}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 resize-none transition-all"
            rows={4}
          />
        </div>

        {/* Translate Button */}
        <button
          type="button"
          onClick={handleTranslate}
          disabled={isTranslating || !sourceText.trim()}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 ${
            isTranslating
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/25 active:scale-[0.98]'
          }`}
        >
          {isTranslating ? (
            <>
              <FiRefreshCw size={18} className="animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <FiGlobe size={18} />
              Translate
              <FiArrowRight size={18} />
            </>
          )}
        </button>

        {/* Translation Result */}
        {translatedText && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                {getLangName(targetLang)}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSpeak(translatedText, targetLang)}
                  className="p-2 rounded-lg bg-white hover:bg-sky-50 text-sky-700 border border-emerald-200 transition-colors"
                  title="Listen translation"
                >
                  <FiVolume2 size={16} className={isSpeaking ? 'animate-pulse' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(translatedText)}
                  className="p-2 rounded-lg bg-white hover:bg-sky-50 text-slate-600 border border-emerald-200 transition-colors"
                  title="Copy translation"
                >
                  {copied ? <FiCheck size={16} className="text-emerald-600" /> : <FiCopy size={16} />}
                </button>
              </div>
            </div>
            <div className="text-base text-slate-800 leading-relaxed">
              {translatedText}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-emerald-100">
              <FiGlobe size={11} />
              {engine}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200 flex items-start gap-2">
            <span className="text-red-500 mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationPanel;
