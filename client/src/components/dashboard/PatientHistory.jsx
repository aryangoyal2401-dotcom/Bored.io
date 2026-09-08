import React, { useState, useEffect } from 'react';
import { colors } from '../../utils/colors';
import { FiUser, FiPhone, FiCalendar, FiActivity, FiClock, FiFileText, FiHeart, FiAlertCircle, FiChevronDown, FiChevronUp, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { CiPill } from "react-icons/ci";
import { patientsAPI } from '../../utils/api';
import { apiBaseUrl } from '../../utils/env';

const PatientHistory = ({ selectedPatient }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [medicalTimeline, setMedicalTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: false,
    medications: false,
    conditions: false,
    timeline: true, // Timeline expanded by default to showcase the improved UI
    soapNotes: false,
    medicalSummary: false,
    visitInfo: false
  });

  // Fetch patient timeline data when selectedPatient changes
  useEffect(() => {
    if (selectedPatient?.id) {
      fetchPatientData(selectedPatient.id);
    }
  }, [selectedPatient?.id]);

  const fetchPatientData = async (patientId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch both timeline formats
      const [existingTimeline, documentTimeline] = await Promise.allSettled([
        patientsAPI.getTimeline(patientId),
        fetch(`${apiBaseUrl}/documents/${patientId}/timeline`).then(r => r.json())
      ]);

      if (existingTimeline.status === 'fulfilled') {
        setTimelineData(existingTimeline.value);
      }

      if (documentTimeline.status === 'fulfilled' && documentTimeline.value.success) {
        setMedicalTimeline(documentTimeline.value);
      }
    } catch (err) {
      setError(`Failed to load patient data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Time not available';
    }
  };

  if (!selectedPatient) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ backgroundColor: colors.surfaceSecondary }}>
        <div className="text-center space-y-4 max-w-md">
          <div 
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ backgroundColor: colors.primary20 }}
          >
            <FiUser size={32} style={{ color: colors.primary }} />
          </div>
          <h3 className="text-xl font-medium" style={{ color: colors.textPrimary }}>
            Patient Medical History
          </h3>
          <p className="text-base font-light" style={{ color: colors.textSecondary }}>
            Select a patient to view their comprehensive medical history, medications, and timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: colors.surface }}>
      {/* Header */}
      <div className="h-20 flex flex-col justify-center p-6 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium" style={{ color: colors.textPrimary }}>
            Medical History
          </h2>
          <div className="flex items-center gap-2">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }}></div>
                <span className="text-sm font-medium" style={{ color: colors.primary }}>Loading...</span>
              </>
            ) : (
              <>
                <FiActivity size={16} style={{ color: colors.success }} />
                <span className="text-sm font-medium" style={{ color: colors.success }}>Live Data</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          
          {/* Error State */}
          {error && (
            <div 
              className="p-4 rounded-xl border-2"
              style={{ 
                backgroundColor: colors.error10, 
                borderColor: colors.error + '40' 
              }}
            >
              <div className="flex items-center gap-2">
                <FiAlertCircle size={16} style={{ color: colors.error }} />
                <span className="text-sm font-medium" style={{ color: colors.error }}>
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <div 
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleSection('basicInfo')}
            >
              <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <FiUser size={18} style={{ color: colors.primary }} />
                Basic Information
              </h3>
              {expandedSections.basicInfo ? 
                <FiChevronUp size={20} style={{ color: colors.textSecondary }} /> : 
                <FiChevronDown size={20} style={{ color: colors.textSecondary }} />
              }
            </div>
            
            {expandedSections.basicInfo && (
              <div className="space-y-4">
                <div 
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: colors.background, borderColor: colors.border }}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        Full Name:
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPatient.name}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        Patient ID:
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPatient.displayId}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        Age:
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPatient.age} years
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        Gender:
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPatient.gender === 'M' ? 'Male' : 'Female'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        Mobile Number:
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPatient.mobile}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Medications */}
          {medicalTimeline?.timeline?.current_medications && medicalTimeline.timeline.current_medications.length > 0 && (
            <div>
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => toggleSection('medications')}
              >
                <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
                  <CiPill size={18} style={{ color: colors.accent }} />
                  Current Medications ({medicalTimeline.timeline.current_medications.length})
                </h3>
                {expandedSections.medications ? 
                  <FiChevronUp size={20} style={{ color: colors.textSecondary }} /> : 
                  <FiChevronDown size={20} style={{ color: colors.textSecondary }} />
                }
              </div>
              
              {expandedSections.medications && (
                <div className="space-y-3">
                  {medicalTimeline.timeline.current_medications.map((medication, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl border"
                      style={{ backgroundColor: colors.background, borderColor: colors.border }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium" style={{ color: colors.textPrimary }}>
                          {medication.name}
                        </h4>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ 
                          backgroundColor: colors.success20, 
                          color: colors.success 
                        }}>
                          Active
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span style={{ color: colors.textSecondary }}>Dosage:</span>
                          <span style={{ color: colors.textPrimary }}>{medication.dosage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: colors.textSecondary }}>Frequency:</span>
                          <span style={{ color: colors.textPrimary }}>{medication.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: colors.textSecondary }}>Prescribed:</span>
                          <span style={{ color: colors.textPrimary }}>{formatDate(medication.prescribed_date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chronic Conditions */}
          {medicalTimeline?.timeline?.chronic_conditions && medicalTimeline.timeline.chronic_conditions.length > 0 && (
            <div>
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => toggleSection('conditions')}
              >
                <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
                  <FiHeart size={18} style={{ color: colors.warning }} />
                  Chronic Conditions ({medicalTimeline.timeline.chronic_conditions.length})
                </h3>
                {expandedSections.conditions ? 
                  <FiChevronUp size={20} style={{ color: colors.textSecondary }} /> : 
                  <FiChevronDown size={20} style={{ color: colors.textSecondary }} />
                }
              </div>
              
              {expandedSections.conditions && (
                <div className="space-y-3">
                  {medicalTimeline.timeline.chronic_conditions.map((condition, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl border"
                      style={{ backgroundColor: colors.background, borderColor: colors.border }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium" style={{ color: colors.textPrimary }}>
                          {typeof condition === 'string' ? condition : condition.condition}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full" style={{ 
                          backgroundColor: colors.warning20, 
                          color: colors.warning 
                        }}>
                          Chronic
                        </span>
                      </div>
                      {typeof condition === 'object' && condition.diagnosed_date && (
                        <div className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                          Diagnosed: {formatDate(condition.diagnosed_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Medical Timeline Events - Compact Clean Design */}
          {medicalTimeline?.timeline?.timeline_events && medicalTimeline.timeline.timeline_events.length > 0 && (
            <div>
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => toggleSection('timeline')}
              >
                <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
                  <FiClock size={18} style={{ color: colors.primary }} />
                  Medical Timeline ({medicalTimeline.timeline.timeline_events.length})
                </h3>
                {expandedSections.timeline ? 
                  <FiChevronUp size={20} style={{ color: colors.textSecondary }} /> : 
                  <FiChevronDown size={20} style={{ color: colors.textSecondary }} />
                }
              </div>
              
              {expandedSections.timeline && (
                <div className="relative">
                  {/* Module B Feature: Abnormal Lab Findings Alert Banner */}
                  {medicalTimeline.timeline.abnormal_lab_findings && medicalTimeline.timeline.abnormal_lab_findings.length > 0 && (
                    <div className="mb-4 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                          <FiAlertTriangle size={18} />
                          <span>🚨 Abnormal Out-of-Range Lab Values</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 uppercase">
                          Physician Attention Required
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {medicalTimeline.timeline.abnormal_lab_findings.map((finding, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs">
                            <div className="flex justify-between font-bold" style={{ color: colors.textPrimary }}>
                              <span>{finding.test_name}</span>
                              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-bold text-[10px]">
                                {finding.flag || 'HIGH'}
                              </span>
                            </div>
                            <div className="text-red-400 font-mono font-bold mt-1">
                              {finding.observed_value} {finding.unit}
                              <span className="text-[11px] font-normal ml-2" style={{ color: colors.textSecondary }}>
                                [Ref: {finding.reference_range}]
                              </span>
                            </div>
                            {finding.clinical_implication && (
                              <div className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>
                                {finding.clinical_implication}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module B Feature: Potential Drug-Drug Interaction Alert */}
                  {medicalTimeline.timeline.detected_drug_interactions && medicalTimeline.timeline.detected_drug_interactions.length > 0 && (
                    <div className="mb-4 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
                      <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
                        <CiPill size={18} className="stroke-[1.5]" />
                        <span>⚠️ Potential Drug-Drug Interaction Flagged</span>
                      </div>
                      <div className="space-y-1.5">
                        {medicalTimeline.timeline.detected_drug_interactions.map((interaction, idx) => (
                          <div key={idx} className="text-xs" style={{ color: colors.textPrimary }}>
                            <span className="font-bold underline text-amber-300">
                              {interaction.drugs?.join(' + ')}
                            </span>
                            : {interaction.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Module B Feature: Past Procedures & Surgical History */}
                  {medicalTimeline.timeline.procedure_surgery_history && medicalTimeline.timeline.procedure_surgery_history.length > 0 && (
                    <div className="mb-4 p-4 rounded-xl border" style={{ borderColor: colors.border, backgroundColor: colors.surfaceSecondary }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: colors.textSecondary }}>
                        <span>🏥 Past Procedures & Surgical History</span>
                      </h4>
                      <div className="space-y-2">
                        {medicalTimeline.timeline.procedure_surgery_history.map((proc, idx) => (
                          <div key={idx} className="flex justify-between items-start text-xs">
                            <div>
                              <span className="font-bold" style={{ color: colors.textPrimary }}>
                                {proc.procedure_name}
                              </span>
                              {proc.hospital && <span className="ml-2 text-slate-400">({proc.hospital})</span>}
                              {proc.notes && <div className="text-[11px] text-slate-400">{proc.notes}</div>}
                            </div>
                            <span className="px-2 py-0.5 rounded-md font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 shrink-0">
                              {proc.date_or_year}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compact Timeline Line */}
                  <div 
                    className="absolute left-3 top-0 bottom-0 w-px"
                    style={{ backgroundColor: colors.border }}
                  />
                  
                  <div className="space-y-4">
                    {medicalTimeline.timeline.timeline_events
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((event, index) => {
                        const eventDate = new Date(event.date);
                        const isRecent = (new Date() - eventDate) < (30 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <div key={index} className="relative flex items-start gap-4">
                            {/* Compact Timeline Dot */}
                            <div className="relative z-10 shrink-0 mt-1">
                              <div 
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ 
                                  backgroundColor: isRecent ? colors.primary : colors.textTertiary
                                }}
                              />
                            </div>
                            
                            {/* Compact Content */}
                            <div className="flex-1">
                              <div 
                                className="p-4 rounded-lg border"
                                style={{ 
                                  backgroundColor: colors.background,
                                  borderColor: colors.border
                                }}
                              >
                                {/* Compact Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="text-xs font-medium px-2 py-1 rounded-md"
                                      style={{ 
                                        backgroundColor: colors.primary + '15',
                                        color: colors.primary
                                      }}
                                    >
                                      {event.document_type_label || event.event_type}
                                    </span>
                                    {isRecent && (
                                      <div 
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: colors.success }}
                                      />
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div 
                                      className="text-sm font-medium"
                                      style={{ color: colors.textPrimary }}
                                    >
                                      {eventDate.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </div>
                                    {event.doctor && (
                                      <div className="text-[11px]" style={{ color: colors.textSecondary }}>
                                        {event.doctor}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Compact Description */}
                                <p 
                                  className="text-sm mb-3"
                                  style={{ color: colors.textPrimary }}
                                >
                                  {event.description}
                                </p>

                                {/* Diagnoses Tags */}
                                {event.diagnoses && event.diagnoses.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {event.diagnoses.map((diag, dIdx) => (
                                      <span
                                        key={dIdx}
                                        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: colors.success + '15', color: colors.success }}
                                      >
                                        📋 {diag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Compact Medications */}
                                {event.medications && event.medications.length > 0 && (
                                  <div className="mb-3">
                                    <h5 
                                      className="text-xs font-medium mb-2 flex items-center gap-1"
                                      style={{ color: colors.textSecondary }}
                                    >
                                      <CiPill size={14} />
                                      {event.medications.length} medication{event.medications.length > 1 ? 's' : ''}
                                    </h5>
                                    <div className="space-y-2">
                                      {event.medications.map((med, medIndex) => (
                                        <div 
                                          key={medIndex}
                                          className="p-3 rounded-lg"
                                          style={{ 
                                            backgroundColor: colors.surfaceSecondary
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span 
                                              className="text-sm font-medium"
                                              style={{ color: colors.textPrimary }}
                                            >
                                              {med.name}
                                            </span>
                                            {med.dosage && (
                                              <span 
                                                className="text-xs px-2 py-0.5 rounded-md"
                                                style={{ 
                                                  backgroundColor: colors.accent + '15',
                                                  color: colors.accent 
                                                }}
                                              >
                                                {med.dosage}
                                              </span>
                                            )}
                                          </div>
                                          {(med.frequency || med.duration) && (
                                            <div className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                                              {med.frequency}
                                              {med.duration && med.frequency && ' • '}
                                              {med.duration}
                                            </div>
                                          )}
                                          {med.instructions && (
                                            <div className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>
                                              {med.instructions}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Investigation Results with Values and Reference Ranges */}
                                {event.investigation_results && event.investigation_results.length > 0 && (
                                  <div className="mb-3">
                                    <h5 
                                      className="text-xs font-medium mb-2 flex items-center gap-1" 
                                      style={{ color: colors.textSecondary }}
                                    >
                                      <FiActivity size={14} />
                                      Investigation Results ({event.investigation_results.length})
                                    </h5>
                                    <div className="space-y-1.5">
                                      {event.investigation_results.map((inv, invIdx) => (
                                        <div
                                          key={invIdx}
                                          className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                                            inv.is_abnormal ? 'bg-red-500/5 border-red-500/30' : ''
                                          }`}
                                          style={!inv.is_abnormal ? { backgroundColor: colors.surfaceSecondary, borderColor: colors.border } : {}}
                                        >
                                          <div>
                                            <span className="font-bold" style={{ color: colors.textPrimary }}>
                                              {inv.test_name}
                                            </span>
                                            <span className="text-[11px] ml-2" style={{ color: colors.textSecondary }}>
                                              [Ref: {inv.reference_range}]
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span 
                                              className={`font-mono font-bold ${inv.is_abnormal ? 'text-red-400' : ''}`} 
                                              style={!inv.is_abnormal ? { color: colors.textPrimary } : {}}
                                            >
                                              {inv.observed_value} {inv.unit}
                                            </span>
                                            {inv.is_abnormal ? (
                                              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold text-[9px]">
                                                {inv.flag || 'HIGH'}
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">
                                                NORMAL
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Procedure / Surgery History */}
                                {event.procedures_surgeries && event.procedures_surgeries.length > 0 && (
                                  <div className="mb-3 text-xs">
                                    <span className="font-bold text-blue-400">Procedures/Surgeries: </span>
                                    <span style={{ color: colors.textSecondary }}>
                                      {event.procedures_surgeries.map(p => typeof p === 'string' ? p : p.procedure_name).join(', ')}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Compact Notes */}
                                {event.notes && event.notes.trim() && (
                                  <div 
                                    className="p-3 rounded-lg border-l-2"
                                    style={{ 
                                      backgroundColor: colors.primary + '05',
                                      borderLeftColor: colors.primary
                                    }}
                                  >
                                    <p 
                                      className="text-xs"
                                      style={{ color: colors.textPrimary }}
                                    >
                                      {event.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  
                  {/* Compact Footer */}
                  <div className="mt-6 text-center">
                    <span className="text-xs" style={{ color: colors.textSecondary }}>
                      Generated {new Date(medicalTimeline.timeline.generated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })} • {medicalTimeline.timeline.total_documents} documents
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent SOAP Notes */}
          {timelineData?.timeline && timelineData.timeline.filter(entry => 
            entry.type === 'note' && entry.entry.soap_note && 
            (entry.entry.soap_note.subjective || entry.entry.soap_note.assessment)
          ).length > 0 && (
            <div>
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => toggleSection('soapNotes')}
              >
                <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
                  <FiFileText size={18} style={{ color: colors.success }} />
                  Recent SOAP Notes
                </h3>
                {expandedSections.soapNotes ? 
                  <FiChevronUp size={20} style={{ color: colors.textSecondary }} /> : 
                  <FiChevronDown size={20} style={{ color: colors.textSecondary }} />
                }
              </div>
              
              {expandedSections.soapNotes && (
                <div className="space-y-4">
                  {timelineData.timeline
                    .filter(entry => entry.type === 'note' && entry.entry.soap_note)
                    .slice(0, 3)
                    .map((note, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl border"
                      style={{ backgroundColor: colors.background, borderColor: colors.border }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                          Visit on {formatDate(note.date)}
                        </span>
                        <span className="text-xs" style={{ color: colors.textSecondary }}>
                          {formatTime(note.date)}
                        </span>
                      </div>
                      
                      {note.entry.soap_note.subjective && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-1" style={{ color: colors.primary }}>
                            Subjective:
                          </h5>
                          <p className="text-sm" style={{ color: colors.textPrimary }}>
                            {note.entry.soap_note.subjective}
                          </p>
                        </div>
                      )}
                      
                      {note.entry.soap_note.objective && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-1" style={{ color: colors.accent }}>
                            Objective:
                          </h5>
                          <p className="text-sm" style={{ color: colors.textPrimary }}>
                            {note.entry.soap_note.objective}
                          </p>
                        </div>
                      )}
                      
                      {note.entry.soap_note.assessment && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-1" style={{ color: colors.warning }}>
                            Assessment:
                          </h5>
                          <p className="text-sm" style={{ color: colors.textPrimary }}>
                            {note.entry.soap_note.assessment}
                          </p>
                        </div>
                      )}
                      
                      {note.entry.soap_note.plan && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium mb-1" style={{ color: colors.success }}>
                            Plan:
                          </h5>
                          <p className="text-sm" style={{ color: colors.textPrimary }}>
                            {note.entry.soap_note.plan}
                          </p>
                        </div>
                      )}
                      
                      {note.entry.chief_complaint && (
                        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: colors.surfaceSecondary }}>
                          <h5 className="text-xs font-medium mb-1" style={{ color: colors.textSecondary }}>
                            Chief Complaint:
                          </h5>
                          <p className="text-sm" style={{ color: colors.textPrimary }}>
                            {note.entry.chief_complaint}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Medical Summary */}
          {medicalTimeline?.timeline?.summary && (
            <div>
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => toggleSection('medicalSummary')}
              >
                <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
                  <FiFileText size={18} style={{ color: colors.primary }} />
                  Medical Summary
                </h3>
                {expandedSections.medicalSummary ? 
                  <FiChevronUp size={20} style={{ color: colors.textSecondary }} /> : 
                  <FiChevronDown size={20} style={{ color: colors.textSecondary }} />
                }
              </div>
              
              {expandedSections.medicalSummary && (
                <div 
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: colors.background, borderColor: colors.border }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: colors.textPrimary }}>
                    {medicalTimeline.timeline.summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Current Visit Information */}
          <div>
            <div 
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleSection('visitInfo')}
            >
              <h3 className="text-lg font-medium flex items-center gap-2" style={{ color: colors.textPrimary }}>
                <FiCalendar size={18} style={{ color: colors.warning }} />
                Current Visit Information
              </h3>
              {expandedSections.visitInfo ? 
                <FiChevronUp size={20} style={{ color: colors.textSecondary }} /> : 
                <FiChevronDown size={20} style={{ color: colors.textSecondary }} />
              }
            </div>
            
            {expandedSections.visitInfo && (
              <div 
                className="p-4 rounded-xl border"
                style={{ backgroundColor: colors.background, borderColor: colors.border }}
              >
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                      Check-in Time:
                    </span>
                    <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                      {selectedPatient.checkInTime}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                      Current Status:
                    </span>
                    <span 
                      className="text-sm font-medium px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: selectedPatient.status === 'ready' ? colors.success20 : 
                                       selectedPatient.status === 'with-nurse' ? colors.warning20 : 
                                       colors.textTertiary + '20',
                        color: selectedPatient.status === 'ready' ? colors.success : 
                              selectedPatient.status === 'with-nurse' ? colors.warning : 
                              colors.textTertiary
                      }}
                    >
                      {selectedPatient.status === 'ready' ? 'Ready for Doctor' :
                       selectedPatient.status === 'with-nurse' ? 'With Nurse' :
                       selectedPatient.status === 'completed' ? 'Completed' :
                       'Waiting'}
                    </span>
                  </div>

                  {selectedPatient.queueNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        Queue Number:
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        #{selectedPatient.queueNumber}
                      </span>
                    </div>
                  )}

                  {selectedPatient.visitCount && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        Total Visits:
                      </span>
                      <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPatient.visitCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Data Status */}
          {!loading && (!timelineData && !medicalTimeline) && (
            <div 
              className="p-4 rounded-xl border-2 border-dashed"
              style={{ 
                backgroundColor: colors.primary10, 
                borderColor: colors.primary + '40' 
              }}
            >
              <p className="text-sm text-center" style={{ color: colors.primary }}>
                📋 No medical history available for this patient yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientHistory;