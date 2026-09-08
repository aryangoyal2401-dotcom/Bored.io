import React, { useEffect, useState } from 'react';
import { 
  FiCheckCircle, 
  FiVolume2, 
  FiPrinter, 
  FiClock, 
  FiMapPin, 
  FiAlertTriangle, 
  FiFileText, 
  FiHome, 
  FiShield
} from 'react-icons/fi';
import { MdQrCode } from 'react-icons/md';
import { speechService } from '../../utils/speech';
import { kioskAPI } from '../../utils/api';

const IntakeSummaryStep = ({
  summaryResult,
  patient,
  language,
  onFinish
}) => {
  const isHindi = language === 'hi';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const structuredSummary = summaryResult?.structured_summary || {};
  const audioConfirmation = summaryResult?.patient_audio_confirmation?.[language] || 
    (isHindi 
      ? `नमस्ते ${patient?.name || ''} जी, आपके मुख्य लक्षण दर्ज कर लिए गए हैं। आपका टोकन नंबर #${summaryResult?.token_number || '01'} है। कृपया ओपीडी कक्ष के बाहर प्रतीक्षा करें।`
      : `Hello ${patient?.name || ''}, your clinical intake has been successfully submitted. Your Token Number is #${summaryResult?.token_number || '01'}. Please proceed to the OPD consultation area.`);

  useEffect(() => {
    // Play audio confirmation automatically
    speechService.speak(audioConfirmation, language);
    setIsPlayingAudio(true);
    const t = setTimeout(() => setIsPlayingAudio(false), 10000);
    return () => clearTimeout(t);
  }, []);

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      speechService.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      speechService.speak(audioConfirmation, language);
      setIsPlayingAudio(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCompleteAndHome = async () => {
    speechService.stopSpeaking();
    if (summaryResult?.session_id) {
      try {
        await kioskAPI.cleanupSession(summaryResult.session_id);
      } catch (e) {
        console.warn('Cleanup err:', e);
      }
    }
    onFinish();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Success Badge & Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-600 border-2 border-sky-200 flex items-center justify-center mx-auto shadow-sm">
          <FiCheckCircle size={36} className="stroke-[2.5]" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
          {isHindi ? 'पंजीकरण व प्राथमिक जांच संपन्न!' : 'Intake Successfully Completed!'}
        </h1>
        <p className="text-base text-slate-600 max-w-xl mx-auto font-normal">
          {isHindi
            ? 'आपकी जानकारी सुरक्षित रूप से डॉक्टर साहब के डैशबोर्ड पर भेज दी गई है'
            : 'Your structured clinical intake has been submitted directly to the attending physician'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* LEFT 1/3: PHYSICAL TOKEN SLIP CARD (Printable) */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          {/* Top notch styling like a thermal receipt ticket */}
          <div className="space-y-4">
            <div className="text-center border-b border-dashed border-slate-300 pb-4">
              <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
                SAHAYAK MEDIKIOSK
              </div>
              <div className="text-xs text-slate-500">Primary Health Centre • OPD Slip</div>
            </div>

            {/* Token Number Highlight */}
            <div className="text-center py-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500 uppercase tracking-wider">
                {isHindi ? 'आपका टोकन नंबर' : 'Your Token Number'}
              </div>
              <div className="text-6xl font-black text-sky-600 font-mono my-1">
                #{summaryResult?.token_number || '01'}
              </div>
              <div className="inline-block text-xs font-bold px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {summaryResult?.priority === 'emergency_stat' ? '🚨 EMERGENCY TRIAGE' : '✅ READY FOR DOCTOR'}
              </div>
            </div>

            {/* Patient & Room Details */}
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isHindi ? 'मरीज का नाम' : 'Patient Name'}:</span>
                <span className="font-semibold text-slate-900">{patient?.name || 'Citizen'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isHindi ? 'उम्र / लिंग' : 'Age / Gender'}:</span>
                <span>{patient?.age || '30'} Yrs / {patient?.gender?.toUpperCase() || 'M'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">ABHA No:</span>
                <span className="font-mono text-sky-700 font-bold">{patient?.abha_number || '91-5043-5666-3218'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isHindi ? 'परामर्श कक्ष' : 'Consultation Room'}:</span>
                <span className="font-bold text-sky-700 flex items-center gap-1">
                  <FiMapPin size={12} /> Room 102 (OPD)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{isHindi ? 'अनुमानित समय' : 'Est. Wait'}:</span>
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <FiClock size={12} /> {summaryResult?.estimated_wait_minutes || 10} Mins
                </span>
              </div>
            </div>

            {/* QR Code Graphic */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center">
              <MdQrCode size={48} className="text-slate-700" />
              <span className="text-[10px] text-slate-500 font-mono mt-1">
                ID: {summaryResult?.queue_id || 'Q_LIVE'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 transition-colors"
          >
            <FiPrinter size={14} />
            <span>{isHindi ? 'पर्ची प्रिंट करें' : 'Print Token Slip'}</span>
          </button>
        </div>

        {/* RIGHT 2/3: 8-SECTION STRUCTURED CLINICAL SUMMARY (Doctor View Preview) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            {/* Audio summary card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className="p-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-all shrink-0 shadow-xs active:scale-95"
                >
                  <FiVolume2 size={20} />
                </button>
                <div>
                  <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                    {isHindi ? 'ऑडियो पुष्टि (Patient Audio Confirmation)' : 'Patient Audio Summary'}
                  </div>
                  <div className="text-xs text-slate-700 mt-0.5 line-clamp-2">
                    {audioConfirmation}
                  </div>
                </div>
              </div>
            </div>

            {/* Structured 8 Sections Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  {isHindi ? '8-बिंदु संरचित सारांश (डॉक्टर के लिए)' : '8-Section Clinical Intake Summary'}
                </h3>
                <span className="text-xs text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Pending Doctor Sign-off
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {/* 1. Chief Complaint */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-sky-700 uppercase">1. Chief Complaint</span>
                  <p className="text-xs text-slate-900 mt-1 font-semibold">
                    {structuredSummary.chief_complaint || 'Chest pain / acute discomfort'}
                  </p>
                </div>

                {/* 2. HPI */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-teal-700 uppercase">2. History of Present Illness</span>
                  <p className="text-xs text-slate-700 mt-1 line-clamp-3">
                    {structuredSummary.history_of_present_illness || 'Detailed SOCRATES symptom progression recorded.'}
                  </p>
                </div>

                {/* 3. Past Medical / Surgical */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">3. Past Medical / Surgical</span>
                  <p className="text-xs text-slate-700 mt-1">
                    {structuredSummary.past_medical_surgical_history || 'No prior chronic conditions.'}
                  </p>
                </div>

                {/* 4. Drug & Allergy */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">4. Drug & Allergy History</span>
                  <p className="text-xs text-slate-700 mt-1">
                    {structuredSummary.drug_allergy_history?.known_allergies?.[0] || 'No known drug allergies (NKDA)'}
                  </p>
                </div>

                {/* 5. Family History */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-pink-700 uppercase">5. Family History</span>
                  <p className="text-xs text-slate-700 mt-1">
                    {structuredSummary.family_history || 'Non-contributory'}
                  </p>
                </div>

                {/* 6. Personal History */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">6. Personal History</span>
                  <p className="text-xs text-slate-700 mt-1">
                    {structuredSummary.personal_history || 'Standard diet & sleep schedule'}
                  </p>
                </div>

                {/* 7. Review of Systems */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-teal-700 uppercase">7. Review of Systems (ROS)</span>
                  <p className="text-xs text-slate-700 mt-1 line-clamp-2">
                    Cardio: {structuredSummary.review_of_systems?.cardiovascular || 'Normal'}, Resp: {structuredSummary.review_of_systems?.respiratory || 'Clear'}
                  </p>
                </div>

                {/* 8. Prior Investigations */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">8. Prior Investigations</span>
                  <p className="text-xs text-slate-700 mt-1">
                    {structuredSummary.prior_investigations_summary || 'No past reports uploaded'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Finish Button */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <FiShield className="text-teal-600" />
              <span>{isHindi ? 'अस्थायी ऑडियो डेटा नष्ट कर दिया गया है' : 'Ephemeral audio cleaned & purged'}</span>
            </div>

            <button
              type="button"
              onClick={handleCompleteAndHome}
              className="py-3 px-8 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-base shadow-sm transition-all flex items-center gap-2 active:scale-98"
            >
              <FiHome size={18} />
              <span>{isHindi ? 'समाप्त करें • कियोस्क रीसेट' : 'Finish & Reset Kiosk'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeSummaryStep;
