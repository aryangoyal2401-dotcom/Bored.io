import React from 'react';
import { FiCheck, FiVolume2 } from 'react-icons/fi';
import { speechService } from '../../utils/speech';

const LANGUAGES = [
  {
    id: 'hi',
    name: 'हिन्दी',
    englishName: 'Hindi',
    nativeGreeting: 'नमस्ते! कृपया अपनी भाषा चुनें',
    sampleAudio: 'नमस्ते, स्वास्थ्य सेवा कियोस्क में आपका स्वागत है।',
    accentColor: '#10B981',
    badge: 'प्राथमिक (Primary)'
  },
  {
    id: 'en',
    name: 'English',
    englishName: 'English',
    nativeGreeting: 'Welcome! Please select your language',
    sampleAudio: 'Welcome to Sahayak MediKiosk clinical intake.',
    accentColor: '#3B82F6',
    badge: 'Official'
  },
  {
    id: 'mr',
    name: 'मराठी',
    englishName: 'Marathi',
    nativeGreeting: 'नमस्कार! आपली भाषा निवडा',
    sampleAudio: 'नमस्कार, स्वागत आहे.',
    accentColor: '#F59E0B',
    badge: 'प्रादेशिक (Regional)'
  },
  {
    id: 'bn',
    name: 'বাংলা',
    englishName: 'Bengali',
    nativeGreeting: 'স্বাগতম! আপনার ভাষা নির্বাচন করুন',
    sampleAudio: 'স্বাগতম, আপনার স্বাস্থ্য সেবায়।',
    accentColor: '#EC4899',
    badge: 'আঞ্চলিক (Regional)'
  }
];

const LanguageStep = ({ selectedLang, onSelectLanguage, onNext }) => {
  const handlePlayVoice = (e, langObj) => {
    e.stopPropagation();
    speechService.speak(langObj.sampleAudio, langObj.id);
  };

  const handleSelect = (langId) => {
    onSelectLanguage(langId);
    const lang = LANGUAGES.find(l => l.id === langId);
    if (lang) {
      speechService.speak(lang.sampleAudio, lang.id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
          Step 1 • भाषा चयन / Language Selection
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
          Select Your Language
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-xl mx-auto font-normal">
          अपनी पसंदीदा भाषा चुनें या आवाज़ सुनने के लिए स्पीकर बटन दबाएं
        </p>
      </div>

      {/* Language Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        {LANGUAGES.map((lang) => {
          const isSelected = selectedLang === lang.id;
          return (
            <div
              key={lang.id}
              onClick={() => handleSelect(lang.id)}
              className={`relative cursor-pointer rounded-2xl p-6 transition-all duration-200 border-2 ${
                isSelected
                  ? 'bg-white border-sky-600 shadow-lg shadow-sky-100 ring-4 ring-sky-100 scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-md hover:bg-slate-50/50 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    isSelected 
                      ? 'bg-sky-50 text-sky-800 border-sky-200 font-semibold' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {lang.badge}
                  </span>
                  <div className="mt-3">
                    <div className="text-3xl md:text-4xl font-bold text-slate-900 tracking-wide">
                      {lang.name}
                    </div>
                    <div className="text-sm font-medium text-slate-500 mt-1">
                      {lang.englishName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handlePlayVoice(e, lang)}
                    className="p-3 rounded-xl bg-slate-100 hover:bg-sky-50 text-sky-700 transition-colors border border-slate-200 active:scale-95"
                    title="Listen pronunciation"
                  >
                    <FiVolume2 size={22} className="text-sky-600" />
                  </button>

                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isSelected
                        ? 'bg-sky-600 border-sky-600 text-white font-bold'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {isSelected && <FiCheck size={16} className="stroke-[3]" />}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 italic">
                "{lang.nativeGreeting}"
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue CTA */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-80 py-4 px-8 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg shadow-lg shadow-sky-600/25 transition-all duration-200 flex items-center justify-center gap-3 active:scale-98"
        >
          <span>आगे बढ़ें • Continue</span>
          <span className="text-xl">➔</span>
        </button>
      </div>
    </div>
  );
};

export default LanguageStep;
