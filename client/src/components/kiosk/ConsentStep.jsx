import React, { useState, useEffect } from 'react';
import { 
  FiLock, 
  FiVolume2, 
  FiCheckCircle, 
  FiFileText, 
  FiTrash2, 
  FiShare2, 
  FiShield, 
  FiArrowRight, 
  FiInfo 
} from 'react-icons/fi';
import { speechService } from '../../utils/speech';
import { kioskAPI } from '../../utils/api';

const ConsentStep = ({ patient, language, onConsentGiven, onBack }) => {
  const isHindi = language === 'hi';

  const [consentClinical, setConsentClinical] = useState(true);
  const [consentDoctorShare, setConsentDoctorShare] = useState(true);
  const [consentAbdmLink, setConsentAbdmLink] = useState(true);
  const [consentEphemeralWipe, setConsentEphemeralWipe] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const consentAudioText = isHindi
    ? 'नमस्ते। कियोस्क पर आपके द्वारा बताए गए स्वास्थ्य लक्षणों और पुराने पर्चों की जानकारी को संकलित करके आपके डॉक्टर साहब को दिखाया जाएगा। यह डेटा पूरी तरह सुरक्षित रहेगा और आपकी आवाज़ का ऑडियो काम पूरा होते ही मिटा दिया जाएगा। क्या आप इस प्रक्रिया के लिए सहमत हैं?'
    : 'Hello. The clinical history and symptoms you provide at this kiosk will be summarized directly for your attending physician. Your raw audio is ephemeral and purged immediately after consultation queueing. Do you consent to proceed?';

  // Automatically read out consent prompt once step opens
  useEffect(() => {
    speechService.speak(consentAudioText, language);
    setIsPlayingAudio(true);
    const timeout = setTimeout(() => setIsPlayingAudio(false), 12000);
    return () => clearTimeout(timeout);
  }, [language]);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      speechService.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      speechService.speak(consentAudioText, language);
      setIsPlayingAudio(true);
    }
  };

  const handleAgreeAndProceed = async () => {
    setIsSubmitting(true);
    speechService.stopSpeaking();

    const consentPayload = {
      patient_id: patient?.patient_id || 'PAT_KIOSK',
      abha_number: patient?.abha_number || '91-5043-5666-3218',
      clinical_intake: consentClinical,
      doctor_review: consentDoctorShare,
      abdm_linking: consentAbdmLink,
      ephemeral_audio: consentEphemeralWipe,
      timestamp: new Date().toISOString()
    };

    try {
      await kioskAPI.recordConsent(consentPayload);
    } catch (e) {
      console.warn('Consent recording fallback:', e);
    } finally {
      setIsSubmitting(false);
      onConsentGiven(consentPayload);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold uppercase tracking-wider">
          <FiLock className="text-sky-700" />
          Step 3 • मरीज सहमति / Informed Patient Consent
        </div>
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            {isHindi ? 'मरीज की सहमति एवं गोपनीयता' : 'Informed Digital Consent'}
          </h1>
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`p-3 rounded-full border transition-all ${
              isPlayingAudio
                ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                : 'bg-slate-100 text-sky-700 border-slate-200 hover:bg-sky-50'
            }`}
            title="Listen to consent explanation"
          >
            <FiVolume2 size={24} />
          </button>
        </div>
        <p className="text-base text-slate-600 max-w-lg mx-auto font-normal">
          {isHindi
            ? 'आयुष्मान भारत डिजिटल मिशन (ABDM) के अंतर्गत पारदर्शी व स्वैच्छिक सहमति'
            : 'Granular, revocable consent compliant with ABDM / Data Protection Framework'}
        </p>
      </div>

      {/* Audio Guidance Banner */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-4 mb-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <FiVolume2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {isHindi ? 'ऑडियो मार्गदर्शिका (Audio Guided)' : 'Audio Guided Consent'}
            </div>
            <div className="text-xs text-slate-600">
              {isHindi
                ? 'सुनने या बंद करने के लिए स्पीकर बटन दबाएं'
                : 'Tap the audio button anytime to hear consent read aloud'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleAudio}
          className="text-xs font-bold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors shrink-0"
        >
          {isPlayingAudio ? (isHindi ? 'रोकें ⏹️' : 'Stop ⏹️') : (isHindi ? 'सुनें ▶️' : 'Play ▶️')}
        </button>
      </div>

      {/* Granular Toggles Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {isHindi ? 'सहमति बिंदु (Granular Scopes)' : 'Granular Consent Permissions'}
          </div>
          <span className="text-xs text-teal-700 font-bold">
            {isHindi ? 'स्वैच्छिक एवं वापस लेने योग्य' : 'Revocable Anytime'}
          </span>
        </div>

        {/* Scope 1: Clinical Data Capture */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
              <FiFileText size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {isHindi ? '1. प्राथमिक स्वास्थ्य लक्षणों का संकलन' : '1. Clinical Intake & Symptom Analysis'}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {isHindi
                  ? 'आपके द्वारा बताए गए दर्द, समय और लक्षणों का सुरक्षित सारांश तैयार करना'
                  : 'Capture chief complaints, SOCRATES symptom progression and vital context'}
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={consentClinical}
              onChange={(e) => setConsentClinical(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
          </label>
        </div>

        {/* Scope 2: Physician Sharing */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
              <FiShare2 size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {isHindi ? '2. डॉक्टर के साथ सारांश साझा करना' : '2. Share Intake Summary with Attending Doctor'}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {isHindi
                  ? 'ओपीडी परामर्श से पहले डॉक्टर के डैशबोर्ड पर स्वास्थ्य रिपोर्ट उपलब्ध कराना'
                  : 'Transmit structured intake to doctor console so consultation is informed'}
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={consentDoctorShare}
              onChange={(e) => setConsentDoctorShare(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
          </label>
        </div>

        {/* Scope 3: Ephemeral Audio Cleanup */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <FiTrash2 size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {isHindi ? '3. अस्थायी ऑडियो तुरंत नष्ट करना (Privacy Wipe)' : '3. Ephemeral Voice Purge Protocol'}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {isHindi
                  ? 'टोकन जारी होते ही कियोस्क पर रिकॉर्ड की गई कच्ची आवाज़ तुरंत मिटा दी जाएगी'
                  : 'Explicitly wipe temporary microphone audio files upon queue token issuance'}
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={consentEphemeralWipe}
              onChange={(e) => setConsentEphemeralWipe(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <button
            type="button"
            onClick={handleAgreeAndProceed}
            disabled={!consentClinical || isSubmitting}
            className="w-full py-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            <FiCheckCircle size={22} />
            <span>
              {isHindi ? 'मैं सहमत हूँ • स्वास्थ्य परीक्षण शुरू करें' : 'I Consent • Begin Clinical Intake'}
            </span>
            <FiArrowRight size={20} />
          </button>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>ABDM Consent Artifact ID: Auto-Generated</span>
            <button
              type="button"
              onClick={onBack}
              className="hover:text-slate-800 underline"
            >
              {isHindi ? 'पहचान स्क्रीन पर वापस' : 'Back to ABHA Identity'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentStep;
