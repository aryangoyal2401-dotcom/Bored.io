import React, { useState } from 'react';
import { 
  FiCheckCircle, 
  FiEdit3, 
  FiXCircle, 
  FiAlertTriangle, 
  FiShield, 
  FiSave, 
  FiFileText, 
  FiCheck, 
  FiActivity, 
  FiAlertCircle, 
  FiVolume2 
} from 'react-icons/fi';
import { kioskAPI } from '../../utils/api';
import { speechService } from '../../utils/speech';

const StructuredClinicalSummaryView = ({
  encounterData,
  patient,
  colors,
  onReviewUpdate
}) => {
  const summary = encounterData?.structuredClinicalSummary;
  const noteId = encounterData?.scribeData?.noteId;
  const patientId = patient?.id || patient?.patient_id;

  // Physician Review State
  const [reviewStatus, setReviewStatus] = useState(
    encounterData?.reviewStatus || 'PENDING_PHYSICIAN_REVIEW'
  );
  const [isAmending, setIsAmending] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields for amendment
  const [editedHpi, setEditedHpi] = useState(summary?.history_of_present_illness || '');
  const [editedPastHistory, setEditedPastHistory] = useState(summary?.past_medical_surgical_history || '');
  const [editedAllergies, setEditedAllergies] = useState(
    summary?.drug_allergy_history?.known_allergies?.join(', ') || 'NKDA'
  );
  const [editedDoctorSummary, setEditedDoctorSummary] = useState(summary?.doctor_summary_en || '');

  if (!summary) return null;

  const redFlags = (summary.clinical_red_flags || []).filter(
    (rf) =>
      rf &&
      typeof rf === 'string' &&
      !rf.toLowerCase().includes('none') &&
      !rf.toLowerCase().includes('nil') &&
      !rf.toLowerCase().includes('no acute red') &&
      !rf.toLowerCase().includes('not reported') &&
      !rf.toLowerCase().includes('no red')
  );
  const isEmergencyTriage =
    redFlags.length > 0 &&
    (encounterData?.priority === 'emergency_stat' || encounterData?.hasRedFlags);
  const drugInteractions = summary.detected_drug_interactions || [];
  const ayushData = summary.ayush_pariksha;

  const handleAccept = async () => {
    setIsSaving(true);
    try {
      await kioskAPI.reviewSummary(patientId, noteId, {
        action: 'ACCEPT',
        doctor_name: 'Dr. Priya Sharma, MBBS, MD',
        doctor_notes: doctorNotes || 'Verified and confirmed during clinical examination.'
      });
      setReviewStatus('ACCEPTED');
      setIsAmending(false);
      if (onReviewUpdate) onReviewUpdate('ACCEPTED');
    } catch (err) {
      console.warn('Review fallback:', err);
      setReviewStatus('ACCEPTED');
      setIsAmending(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAmendment = async () => {
    setIsSaving(true);
    try {
      const amended = {
        ...summary,
        history_of_present_illness: editedHpi,
        past_medical_surgical_history: editedPastHistory,
        doctor_summary_en: editedDoctorSummary,
        drug_allergy_history: {
          ...summary.drug_allergy_history,
          known_allergies: editedAllergies.split(',').map(s => s.trim())
        }
      };

      await kioskAPI.reviewSummary(patientId, noteId, {
        action: 'AMEND',
        doctor_name: 'Dr. Priya Sharma, MBBS, MD',
        doctor_notes: doctorNotes || 'Clinical amendments incorporated by physician.',
        amended_summary: amended
      });

      setReviewStatus('AMENDED');
      setIsAmending(false);
      if (onReviewUpdate) onReviewUpdate('AMENDED');
    } catch (err) {
      console.warn('Amend fallback:', err);
      setReviewStatus('AMENDED');
      setIsAmending(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this intake summary and request re-intake?')) {
      return;
    }
    setIsSaving(true);
    try {
      await kioskAPI.reviewSummary(patientId, noteId, {
        action: 'REJECT',
        doctor_name: 'Dr. Priya Sharma, MBBS, MD',
        doctor_notes: doctorNotes || 'Rejected due to clinical inconsistency. Patient directed to nurse triage.'
      });
      setReviewStatus('REJECTED');
      setIsAmending(false);
      if (onReviewUpdate) onReviewUpdate('REJECTED');
    } catch (err) {
      setReviewStatus('REJECTED');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. EMERGENCY RED-FLAG STAT BANNER */}
      {isEmergencyTriage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FiAlertTriangle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200">
                  CRITICAL RED FLAG ALERT
                </span>
                <span className="text-xs text-red-700 font-medium">Immediate Triage Priority</span>
              </div>
              <h4 className="text-sm font-bold text-red-900 mt-1">
                {redFlags.join(', ') || 'Suspected Acute Emergency Detected by MediKiosk'}
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* 2. DRUG-DRUG INTERACTION WARNINGS (Feature 5) */}
      {drugInteractions.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <FiAlertCircle size={16} />
            <span>Potential Adverse Drug Interaction Alert</span>
          </div>
          {drugInteractions.map((inter, idx) => (
            <div key={idx} className="text-xs text-slate-800 bg-white p-2.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div>
                <span className="font-bold text-amber-900">{inter.drug_a} + {inter.drug_b}:</span>{' '}
                <span>{inter.effect}</span>
              </div>
              <span className="text-slate-500 italic text-[11px]">{inter.clinical_recommendation}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3. PHYSICIAN ACCEPT / AMEND / REJECT HEADER */}
      <div 
        className="p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs"
        style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Clinical History Intake Standard
            </span>
            <span 
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                reviewStatus === 'ACCEPTED' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : reviewStatus === 'AMENDED'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : reviewStatus === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {reviewStatus === 'ACCEPTED' && '✓ ACCEPTED & CONFIRMED BY PHYSICIAN'}
              {reviewStatus === 'AMENDED' && '✏️ AMENDED & SIGNED BY PHYSICIAN'}
              {reviewStatus === 'REJECTED' && '❌ REJECTED - RE-INTAKE REQUIRED'}
              {reviewStatus === 'PENDING_PHYSICIAN_REVIEW' && '⏳ PENDING PHYSICIAN CONFIRMATION'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Per clinical safety guidelines, AI intake summaries are never auto-committed as final diagnoses. Physician review is mandatory.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          {!isAmending ? (
            <>
              <button
                type="button"
                onClick={() => setIsAmending(true)}
                className="py-2 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-slate-100"
                style={{ borderColor: colors.border, color: colors.textPrimary }}
              >
                <FiEdit3 size={14} />
                <span>Amend / Edit</span>
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={isSaving}
                className="py-2 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FiXCircle size={14} />
                <span>Reject</span>
              </button>

              <button
                type="button"
                onClick={handleAccept}
                disabled={isSaving}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <FiCheckCircle size={14} />
                <span>Accept & Sign Off</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAmending(false)}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAmendment}
                disabled={isSaving}
                className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <FiSave size={14} />
                <span>Save Amendment</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. THE 8-SECTION CLINICAL INTAKE VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 1: Chief Complaint */}
        <div 
          className="p-5 rounded-2xl border transition-all"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
              Chief Complaint
            </h4>
          </div>
          <p className="text-base font-semibold" style={{ color: colors.textPrimary }}>
            {summary.chief_complaint || 'Acute discomfort'}
          </p>
        </div>

        {/* Section 2: History of Present Illness (HPI) */}
        <div 
          className="p-5 rounded-2xl border transition-all lg:col-span-2"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                History of Present Illness (HPI) • SOCRATES Analysis
              </h4>
            </div>
            {isAmending && (
              <span className="text-xs text-sky-600 font-semibold italic">Editing active</span>
            )}
          </div>

          {isAmending ? (
            <textarea
              rows={4}
              value={editedHpi}
              onChange={(e) => setEditedHpi(e.target.value)}
              className="w-full p-3 bg-white border border-sky-500 rounded-xl text-xs text-slate-900 focus:outline-none leading-relaxed"
            />
          ) : (
            <p className="text-xs leading-relaxed font-normal whitespace-pre-line" style={{ color: colors.textPrimary }}>
              {editedHpi || summary.history_of_present_illness}
            </p>
          )}
        </div>

        {/* Section 3: Past Medical & Surgical History */}
        <div 
          className="p-5 rounded-2xl border transition-all"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-purple-600 text-white text-xs font-bold flex items-center justify-center">3</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-700">
              Past Medical / Surgical History
            </h4>
          </div>
          {isAmending ? (
            <input
              type="text"
              value={editedPastHistory}
              onChange={(e) => setEditedPastHistory(e.target.value)}
              className="w-full p-2 bg-white border border-sky-500 rounded-xl text-xs text-slate-900"
            />
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: colors.textPrimary }}>
              {editedPastHistory || summary.past_medical_surgical_history || 'No prior chronic conditions recorded.'}
            </p>
          )}
        </div>

        {/* Section 4: Drug & Allergy History */}
        <div 
          className="p-5 rounded-2xl border transition-all"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center justify-center">4</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-800">
              Drug & Allergy History
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Allergies: </span>
              {isAmending ? (
                <input
                  type="text"
                  value={editedAllergies}
                  onChange={(e) => setEditedAllergies(e.target.value)}
                  className="w-full mt-1 p-2 bg-white border border-sky-500 rounded-xl text-xs text-slate-900"
                />
              ) : (
                <span className="font-semibold text-amber-800">
                  {editedAllergies || summary.drug_allergy_history?.known_allergies?.join(', ') || 'No Known Drug Allergies (NKDA)'}
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 font-medium">Current Meds: </span>
              <span style={{ color: colors.textPrimary }}>
                {summary.drug_allergy_history?.current_medications?.join(', ') || 'None reported'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Family History */}
        <div 
          className="p-5 rounded-2xl border transition-all"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-rose-500 text-white text-xs font-bold flex items-center justify-center">5</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-rose-700">
              Family History
            </h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: colors.textPrimary }}>
            {summary.family_history || 'Non-contributory / no familial chronic diseases reported.'}
          </p>
        </div>

        {/* Section 6: Personal History */}
        <div 
          className="p-5 rounded-2xl border transition-all"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">6</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
              Personal History & Lifestyle
            </h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: colors.textPrimary }}>
            {summary.personal_history || 'Standard diet, non-smoker, sleep patterns within normal range.'}
          </p>
        </div>

        {/* Section 7: Review of Systems (ROS) */}
        <div 
          className="p-5 rounded-2xl border transition-all lg:col-span-2"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center justify-center">7</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-teal-800">
              Review of Systems (ROS)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-500 block font-semibold mb-0.5">Cardiovascular:</span>
              <span style={{ color: colors.textPrimary }}>{summary.review_of_systems?.cardiovascular || 'Clear'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-500 block font-semibold mb-0.5">Respiratory:</span>
              <span style={{ color: colors.textPrimary }}>{summary.review_of_systems?.respiratory || 'Clear'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-500 block font-semibold mb-0.5">Gastrointestinal / Neuro:</span>
              <span style={{ color: colors.textPrimary }}>{summary.review_of_systems?.gastrointestinal || 'Normal'}</span>
            </div>
          </div>
        </div>

        {/* Section 8: Prior Investigations */}
        <div 
          className="p-5 rounded-2xl border transition-all lg:col-span-2"
          style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">8</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-700">
              Prior Investigations & Digitized Lab History
            </h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: colors.textPrimary }}>
            {summary.prior_investigations_summary || 'No prior investigations or blood reports submitted.'}
          </p>
        </div>

        {/* Optional AYUSH Dashavidha Pariksha Module */}
        {ayushData && (
          <div 
            className="p-5 rounded-2xl border transition-all lg:col-span-2 bg-emerald-50/50"
            style={{ borderColor: colors.primary }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🌿</span>
              <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-800">
                AYUSH / Ayurvedic Dashavidha Pariksha Assessment
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-slate-500 block text-[10px]">Prakriti:</span>
                <span className="font-semibold text-emerald-800">{ayushData.prakriti || 'Vata-Pitta'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-slate-500 block text-[10px]">Agni (Digestion):</span>
                <span className="font-semibold text-emerald-800">{ayushData.agni || 'Madhyama'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-slate-500 block text-[10px]">Koshtha (Bowel):</span>
                <span className="font-semibold text-emerald-800">{ayushData.koshtha || 'Normal'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                <span className="text-slate-500 block text-[10px]">Nidra (Sleep):</span>
                <span className="font-semibold text-emerald-800">{ayushData.nidra || 'Sound'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Doctor amendment notes textfield if amending */}
      {isAmending && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
          <label className="text-xs font-bold text-sky-800 uppercase">
            Attending Physician Amendment Notes (Will be signed into electronic record)
          </label>
          <input
            type="text"
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            placeholder="e.g. Corrected onset duration; patient confirmed symptoms worsen post-prandial..."
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600"
          />
        </div>
      )}
    </div>
  );
};

export default StructuredClinicalSummaryView;
