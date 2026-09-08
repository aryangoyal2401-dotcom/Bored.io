import React, { useState } from 'react';
import { 
  FiShield, 
  FiSmartphone, 
  FiUserCheck, 
  FiKey, 
  FiCheckCircle, 
  FiVolume2, 
  FiUserPlus, 
  FiArrowRight, 
  FiAlertCircle, 
  FiLoader 
} from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';
import { kioskAPI } from '../../utils/api';
import { speechService } from '../../utils/speech';

const DEMO_PROFILES = [
  { label: 'Chahat Kesharwani (22M)', abha: '91-5043-5666-3218' },
  { label: 'Priya Sharma (28F)', abha: '91-2345-6789-0123' },
  { label: 'Ramesh Kumar (56M)', abha: '91-8899-7766-5544' }
];

const AbhaAuthStep = ({ language, onAuthenticated, onBack }) => {
  const [activeTab, setActiveTab] = useState('abha'); // 'abha', 'scan', 'new'
  const [abhaInput, setAbhaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // OTP State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpMessage, setOtpMessage] = useState('');

  // Verified Patient Profile State
  const [verifiedPatient, setVerifiedPatient] = useState(null);

  // New Patient Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('male');

  const isHindi = language === 'hi';

  const speakPrompt = () => {
    const text = isHindi
      ? 'कृपया अपनी 14 अंकों की आभा संख्या या मोबाइल नंबर दर्ज करें, या नए मरीज़ के रूप में पंजीकरण करें।'
      : 'Please enter your 14-digit ABHA number or mobile, or register as a new patient.';
    speechService.speak(text, language);
  };

  const handleVerifyAbha = async () => {
    if (!abhaInput.trim()) {
      setError(isHindi ? 'कृपया आभा संख्या या मोबाइल नंबर दर्ज करें' : 'Please enter ABHA Number or Mobile Number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Verify ABHA in ABDM registry
      const checkRes = await kioskAPI.verifyAbha(abhaInput);
      if (!checkRes.exists) {
        setError(checkRes.message || (isHindi ? 'आभा संख्या नहीं मिली। नया पंजीकरण चुनें।' : 'ABHA ID not found. Choose New Registration.'));
        setLoading(false);
        return;
      }

      // 2. Request OTP
      const otpRes = await kioskAPI.requestOtp(abhaInput);
      if (otpRes.success) {
        setTransactionId(otpRes.transaction_id);
        setOtpMessage(otpRes.message);
        setOtpModalOpen(true);
      } else {
        setError(otpRes.message || 'OTP generation failed');
      }
    } catch (err) {
      console.warn('ABHA verify fallback:', err);
      // Fallback local simulation
      setTransactionId(`TXN_${Date.now()}`);
      setOtpMessage(isHindi ? 'आपके मोबाइल पर ओटीपी भेजा गया है (डेमो: 123456)' : 'OTP sent to registered mobile (Demo: 123456)');
      setOtpModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!otpValue || otpValue.length < 4) {
      setError(isHindi ? 'कृपया 6 अंकों का ओटीपी दर्ज करें' : 'Please enter 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await kioskAPI.verifyOtp(transactionId, otpValue);
      if (res.success) {
        setVerifiedPatient(res.patient);
        setOtpModalOpen(false);
        speechService.speak(
          isHindi ? `आभा सत्यापन सफल। स्वागत है ${res.patient.name} जी।` : `ABHA verified successfully. Welcome ${res.patient.name}.`,
          language
        );
      } else {
        setError(res.message || 'Invalid OTP');
      }
    } catch (err) {
      // Fallback verified patient
      const fallbackPatient = {
        name: 'Chahat Kesharwani',
        abha_number: abhaInput || '91-5043-5666-3218',
        abha_address: 'chahat@abdm',
        age: 22,
        gender: 'male',
        phone: '9915972220',
        address: 'Prayagraj, UP'
      };
      setVerifiedPatient(fallbackPatient);
      setOtpModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNew = async (e) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      setError(isHindi ? 'कृपया नाम और मोबाइल नंबर भरें' : 'Please fill Name and Mobile');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await kioskAPI.registerAbha({
        name: newName,
        phone: newPhone,
        age: parseInt(newAge) || 30,
        gender: newGender,
        address: 'Local Catchment Area'
      });

      if (res.success) {
        setVerifiedPatient(res.patient);
        speechService.speak(
          isHindi ? `नया आभा कार्ड बन गया है। आपका स्वागत है ${newName} जी।` : `New ABHA registered. Welcome ${newName}.`,
          language
        );
      }
    } catch (err) {
      console.warn('Registration fallback:', err);
      setVerifiedPatient({
        name: newName,
        phone: newPhone,
        age: newAge || 30,
        gender: newGender,
        abha_number: `91-${Date.now().toString().slice(-4)}-${Date.now().toString().slice(-4)}-1122`,
        abha_address: `${newName.toLowerCase().replace(/\s/g, '')}@abdm`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateQRScan = () => {
    setLoading(true);
    setTimeout(() => {
      setAbhaInput('91-5043-5666-3218');
      setLoading(false);
      handleVerifyAbha();
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold uppercase tracking-wider">
          <FiShield className="text-sky-700" />
          Step 2 • पहचान एवं आभा प्रमाणीकरण / Patient Identity & ABHA
        </div>
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            {isHindi ? 'आभा / मरीज पहचान' : 'ABHA Health Identity'}
          </h1>
          <button
            type="button"
            onClick={speakPrompt}
            className="p-2.5 rounded-full bg-slate-100 hover:bg-sky-50 text-sky-700 transition-colors border border-slate-200 active:scale-95"
            title="Read instructions aloud"
          >
            <FiVolume2 size={22} />
          </button>
        </div>
        <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto font-normal">
          {isHindi
            ? 'आयुष्मान भारत डिजिटल मिशन (ABDM) के अंतर्गत अपने स्वास्थ्य खाते से जुड़ें'
            : 'Connect your Ayushman Bharat Digital Mission (ABDM) account or quick register'}
        </p>
      </div>

      {/* Verified Profile Card Preview */}
      {verifiedPatient ? (
        <div className="max-w-xl mx-auto bg-white border-2 border-sky-600 rounded-3xl p-7 shadow-lg mb-8 transform animate-fadeIn">
          {/* Official Ayushman Bharat Card Style Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-lg">
                🇮🇳
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-orange-600">
                  NATIONAL HEALTH AUTHORITY
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Ayushman Bharat Health Account (ABHA)
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold flex items-center gap-1.5">
              <FiCheckCircle size={14} />
              VERIFIED
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-sky-600 flex items-center justify-center text-white text-3xl font-bold border-2 border-white shadow-md">
              {verifiedPatient.name.charAt(0)}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">{verifiedPatient.name}</h2>
              <div className="text-sm text-slate-600">
                {verifiedPatient.age} Yrs • {verifiedPatient.gender?.toUpperCase()}
              </div>
              <div className="inline-block font-mono text-sm px-3 py-1 rounded-lg bg-sky-50 text-sky-900 font-bold border border-sky-200 tracking-wider">
                {verifiedPatient.abha_number || '91-5043-5666-3218'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ABHA Address: <span className="text-sky-700 font-semibold">{verifiedPatient.abha_address || 'patient@abdm'}</span>
              </div>
            </div>
          </div>

          <div className="mt-7 pt-5 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVerifiedPatient(null)}
              className="text-xs text-slate-500 hover:text-slate-900 underline"
            >
              {isHindi ? 'अलग मरीज चुनें' : 'Change Patient'}
            </button>

            <button
              type="button"
              onClick={() => onAuthenticated(verifiedPatient)}
              className="py-3 px-8 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 active:scale-98"
            >
              <span>{isHindi ? 'सहमति पर जाएं' : 'Proceed to Consent'}</span>
              <FiArrowRight />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          {/* Mode Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200 mb-8 max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => setActiveTab('abha')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'abha'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FiKey size={16} />
              <span>{isHindi ? 'आभा नंबर' : 'Enter ABHA'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'scan'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MdQrCodeScanner size={16} />
              <span>{isHindi ? 'क्यूआर स्कैन' : 'Scan Card'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'new'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FiUserPlus size={16} />
              <span>{isHindi ? 'नया पंजीकरण' : 'New Patient'}</span>
            </button>
          </div>

          {/* Tab 1: Enter ABHA / Mobile */}
          {activeTab === 'abha' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {isHindi ? '14-अंकों का आभा नंबर या आभा पता' : '14-Digit ABHA Number or ABHA Address'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={abhaInput}
                    onChange={(e) => setAbhaInput(e.target.value)}
                    placeholder="e.g. 91-5043-5666-3218 or name@abdm"
                    className="w-full py-4 pl-12 pr-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 text-lg font-mono focus:border-sky-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                  <FiKey className="absolute left-4 top-5 text-slate-400 text-xl" />
                </div>
              </div>

              {/* Quick Demo Profiles */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isHindi ? 'त्वरित डेमो परीक्षण (क्लिक करें):' : 'Demo Test Accounts (Click to test):'}
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DEMO_PROFILES.map((p) => (
                    <button
                      key={p.abha}
                      type="button"
                      onClick={() => setAbhaInput(p.abha)}
                      className="text-xs py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 transition-colors font-medium"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <FiAlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyAbha}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin text-xl" />
                    <span>{isHindi ? 'सत्यापित हो रहा है...' : 'Verifying via ABDM...'}</span>
                  </>
                ) : (
                  <>
                    <FiUserCheck size={20} />
                    <span>{isHindi ? 'ओटीपी प्राप्त करें • Verify via OTP' : 'Request OTP & Verify'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab 2: Scan QR */}
          {activeTab === 'scan' && (
            <div className="max-w-md mx-auto text-center space-y-6 py-4">
              <div className="w-48 h-48 mx-auto rounded-3xl border-4 border-dashed border-sky-300 bg-sky-50/50 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-pulse top-1/2" />
                <MdQrCodeScanner size={72} className="text-sky-600 mb-2" />
                <span className="text-xs font-semibold text-slate-600">
                  {isHindi ? 'आभा कार्ड स्कैनर' : 'Align ABHA QR Code'}
                </span>
              </div>

              <p className="text-sm text-slate-600">
                {isHindi
                  ? 'अपना आभा कार्ड या आयुष्मान भारत पर्ची स्कैनर के सामने रखें'
                  : 'Hold your physical ABHA card or printed QR in front of the camera'}
              </p>

              <button
                type="button"
                onClick={handleSimulateQRScan}
                disabled={loading}
                className="py-3 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm transition-all shadow-md active:scale-98"
              >
                {loading ? 'Simulating Scanner...' : 'Simulate Scan ABHA Card'}
              </button>
            </div>
          )}

          {/* Tab 3: New Patient Quick Registration */}
          {activeTab === 'new' && (
            <form onSubmit={handleRegisterNew} className="max-w-xl mx-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'मरीज का पूरा नाम *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? '10-अंकों का मोबाइल नंबर *' : '10-Digit Mobile Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'उम्र (वर्ष)' : 'Age (Years)'}
                  </label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="35"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'लिंग' : 'Gender'}
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  >
                    <option value="male">{isHindi ? 'पुरुष (Male)' : 'Male'}</option>
                    <option value="female">{isHindi ? 'महिला (Female)' : 'Female'}</option>
                    <option value="other">{isHindi ? 'अन्य (Other)' : 'Other'}</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 mt-2 active:scale-98"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin text-lg" />
                    <span>{isHindi ? 'पंजीकरण हो रहा है...' : 'Generating ABHA ID...'}</span>
                  </>
                ) : (
                  <>
                    <FiUserPlus size={18} />
                    <span>{isHindi ? 'आभा बनाएं एवं आगे बढ़ें' : 'Generate ABHA & Continue'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Nav Back */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← {isHindi ? 'भाषा चयन पर वापस जाएं' : 'Back to Language Selection'}
            </button>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-sky-600 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scaleIn">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-700 border border-sky-200 mx-auto flex items-center justify-center">
                <FiSmartphone size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {isHindi ? 'ओटीपी सत्यापन' : 'Verify One-Time Password'}
              </h3>
              <p className="text-xs text-slate-600">
                {otpMessage || (isHindi ? 'आपके पंजीकृत मोबाइल पर 6 अंकों का ओटीपी भेजा गया है' : 'Enter 6-digit OTP sent to registered mobile')}
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                placeholder="• • • • • •"
                className="w-full py-3 px-4 text-center tracking-[1em] font-mono text-2xl font-bold bg-slate-50 border-2 border-sky-600 rounded-2xl text-slate-900 focus:outline-none"
              />
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => setOtpValue('123456')}
                  className="text-xs font-semibold text-sky-700 hover:underline"
                >
                  {isHindi ? 'डेमो ओटीपी भरें (123456)' : 'Auto-fill Demo OTP (123456)'}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-700 text-center bg-red-50 p-2 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOtpModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm border border-slate-200"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md disabled:opacity-50 active:scale-98"
              >
                {loading ? 'Verifying...' : (isHindi ? 'पुष्टि करें' : 'Confirm & Login')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbhaAuthStep;
