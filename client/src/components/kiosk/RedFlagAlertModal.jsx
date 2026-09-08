import React from 'react';
import { FiAlertTriangle, FiPhoneCall, FiUserCheck, FiArrowRight } from 'react-icons/fi';

const RedFlagAlertModal = ({ alertData, language, onAcknowledge }) => {
  const isHindi = language === 'hi';

  if (!alertData || !alertData.is_emergency) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-red-500 rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 shadow-xl">
        {/* Siren Icon & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto text-red-600">
            <FiAlertTriangle size={36} className="stroke-[2.5]" />
          </div>

          <div className="inline-block px-4 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider border border-red-200">
            🚨 EMERGENCY TRIAGE INTERCEPT • आपातकालीन अलर्ट
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {isHindi ? 'आपातकालीन लक्षण पाए गए हैं!' : 'Critical Red-Flag Detected!'}
          </h2>

          <div className="text-sm text-red-800 font-medium bg-red-50 p-3.5 rounded-xl border border-red-200">
            {alertData.condition || 'Suspected Acute Cardiovascular / Stroke Emergency'}
          </div>
        </div>

        {/* Immediate Instructions */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-sm text-slate-700">
          <div className="flex items-center gap-3 text-slate-900 font-semibold text-sm">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              1
            </span>
            <span>
              {isHindi ? 'तुरंत आपातकालीन कक्ष / नर्स काउंटर पर जाएं' : 'Proceed directly to Emergency Triage Bay'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-900 font-semibold text-sm">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              2
            </span>
            <span>
              {isHindi ? 'ड्यूटी नर्स व डॉक्टर को अलर्ट भेज दिया गया है' : 'Stat alert dispatched to Staff Nurse & Physician'}
            </span>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
            {isHindi
              ? 'सिस्टम ने आपकी कतार प्राथमिकता को "उच्च प्राथमिकता / इमरजेंसी" में बदल दिया है। नियमित लाइन में प्रतीक्षा न करें।'
              : 'System has promoted patient to Priority 1 STAT triage queue. Do not wait in standard outpatient line.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onAcknowledge}
            className="flex-1 py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{isHindi ? 'समझ गया, आगे बढ़ें' : 'Acknowledge & Continue'}</span>
            <FiArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RedFlagAlertModal;
