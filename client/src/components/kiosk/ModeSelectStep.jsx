import React from 'react';
import { FiActivity, FiFeather, FiCheck, FiVolume2, FiArrowRight, FiUploadCloud } from 'react-icons/fi';
import { speechService } from '../../utils/speech';

const ModeSelectStep = ({ selectedMode, onSelectMode, language, onNext, onBack, onDirectUpload }) => {
  const isHindi = language === 'hi';

  const modes = [
    {
      id: 'ALLOPATHIC',
      title: isHindi ? 'सामान्य ओपीडी (Allopathic Medicine)' : 'General OPD (Allopathic)',
      badge: isHindi ? 'मुख्य चिकित्सा पद्धति' : 'Standard Clinical Intake',
      subtitle: isHindi
        ? 'आधुनिक चिकित्सा intake • SOCRATES लक्षण विश्लेषण (दर्द, बुखार, खांसी, बीपी आदि)'
        : 'Modern clinical intake • SOCRATES symptom progression & acute triage',
      icon: <FiActivity size={32} className="text-blue-400" />,
      features: isHindi
        ? ['SOCRATES दर्द व लक्षण विश्लेषण', 'आपातकालीन रेड-फ्लैग अलर्ट', 'दवा व एलर्जी इतिहास']
        : ['SOCRATES Pain & Symptom Progression', 'Emergency Red-Flag Screening', 'Medication & Allergy Profile'],
      accentColor: 'blue',
      audioText: isHindi
        ? 'सामान्य ओपीडी - आधुनिक चिकित्सा और लक्षणों के विस्तृत विश्लेषण के लिए इसे चुनें।'
        : 'General OPD - Select for standard allopathic medical consultation and symptom analysis.'
    },
    {
      id: 'AYUSH',
      title: isHindi ? 'आयुष / आयुर्वेदिक ओपीडी (AYUSH Mode)' : 'AYUSH / Ayurvedic OPD',
      badge: isHindi ? 'दशविध परीक्षा पद्धति' : 'Traditional Medicine',
      subtitle: isHindi
        ? 'दशविध परीक्षा • प्रकृति, अग्नि (पाचन), कोष्ठ (पेट), निद्रा व आहार-विहार का आकलन'
        : 'Dashavidha Pariksha • Prakriti, Agni (digestion), Koshtha, Nidra & Ahara-Vihara',
      icon: <FiFeather size={32} className="text-emerald-400" />,
      features: isHindi
        ? ['वात-पित्त-कफ प्रकृति निर्धारण', 'अग्नि व आहार शक्ति परीक्षा', 'आहार-विहार जीवनशैली विश्लेषण']
        : ['Vata-Pitta-Kapha Prakriti Assessment', 'Agni & Digestive Fire Evaluation', 'Dietary & Lifestyle Analysis'],
      accentColor: 'emerald',
      audioText: isHindi
        ? 'आयुष और आयुर्वेदिक ओपीडी - प्रकृति, पाचन अग्नि और आहार-विहार के विश्लेषण के लिए इसे चुनें।'
        : 'AYUSH Mode - Select for Ayurvedic consultation, Prakriti, and lifestyle assessment.'
    }
  ];

  const handlePlayVoice = (e, text) => {
    e.stopPropagation();
    speechService.speak(text, language);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold uppercase tracking-wider">
          Step 4 • चिकित्सा पद्धति चयन / Clinical Mode Selection
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
          {isHindi ? 'परामर्श श्रेणी चुनें' : 'Select Consultation Mode'}
        </h1>
        <p className="text-base text-slate-600 max-w-xl mx-auto font-normal">
          {isHindi
            ? 'अपनी स्वास्थ्य आवश्यकता अनुसार सामान्य ओपीडी अथवा आयुष / आयुर्वेदिक ओपीडी चुनें'
            : 'Choose between General Allopathic OPD or AYUSH / Ayurvedic intake'}
        </p>
      </div>

      {/* Direct Document Upload Option Banner */}
      <div className="mb-8 p-5 rounded-2xl bg-sky-50/80 border-2 border-sky-200 transition-all shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-2xl shrink-0 border border-sky-200">
              <FiUploadCloud size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 uppercase tracking-wider mb-1">
                <span>{isHindi ? 'त्वरित पर्ची अपलोड' : 'Direct Upload Track'}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isHindi ? 'सिर्फ पुरानी पर्ची या टेस्ट रिपोर्ट सीधे अपलोड करें' : 'Upload Prescriptions or Reports Directly'}
              </h3>
              <p className="text-xs text-slate-600 max-w-lg mt-0.5 leading-relaxed">
                {isHindi 
                  ? 'सवालों के जवाब दिए बिना सीधे अपनी डॉक्टर पर्ची या लैब रिपोर्ट अपलोड करें। सवाल पूछना पूर्णतः ऐच्छिक है।'
                  : 'Skip the symptom questionnaire and directly upload your prescription or medical reports to join the doctor queue.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDirectUpload}
            className="w-full md:w-auto px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <FiUploadCloud size={17} />
            <span>{isHindi ? 'सीधे दस्तावेज़ अपलोड करें ➔' : 'Direct Document Upload ➔'}</span>
          </button>
        </div>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {modes.map((m) => {
          const isSelected = selectedMode === m.id;
          return (
            <div
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`relative cursor-pointer rounded-2xl p-6 transition-all duration-200 border-2 transform active:scale-98 ${
                isSelected
                  ? 'bg-white border-sky-600 ring-4 ring-sky-100 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-md hover:bg-slate-50/50 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-700">
                  {m.icon}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handlePlayVoice(e, m.audioText)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 transition-colors border border-slate-200"
                    title={isHindi ? 'ऑडियो सुनें' : 'Listen audio guidance'}
                  >
                    <FiVolume2 size={16} />
                  </button>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'border-slate-300 bg-slate-50 text-transparent'
                    }`}
                  >
                    <FiCheck size={14} />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {m.title}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {m.badge}
                  </span>
                </div>
                <div className="text-xs font-semibold text-sky-700 mb-2">
                  {m.subtitle}
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    {isHindi ? 'मुख्य विशेषताएं:' : 'Key Features:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm border border-slate-300 transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          ← {isHindi ? 'सहमति स्क्रीन पर वापस' : 'Back to Consent'}
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onDirectUpload}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 font-semibold text-sm border border-sky-300 transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <FiUploadCloud size={16} />
            <span>{isHindi ? 'सिर्फ पर्ची अपलोड करें' : 'Upload Docs Directly'}</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-80 py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{isHindi ? 'लक्षण जांच शुरू करें' : 'Start Intake Dialogue'}</span>
            <FiArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModeSelectStep;
