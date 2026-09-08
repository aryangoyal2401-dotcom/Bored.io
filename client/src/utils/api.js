// API utility functions for the Doctor Dashboard
import { apiBaseUrl } from './env';

const BASE_URL = apiBaseUrl;

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Patient Management APIs
export const patientsAPI = {
  // Get all patients
  getAll: async () => {
    const response = await fetch(`${BASE_URL}/patients`);
    return handleResponse(response);
  },

  // Get patient details
  getDetails: async (patientId) => {
    const response = await fetch(`${BASE_URL}/patients/${patientId}`);
    return handleResponse(response);
  },

  // Get complete patient record
  getComplete: async (patientId) => {
    const response = await fetch(`${BASE_URL}/patients/${patientId}/complete`);
    return handleResponse(response);
  },

  // Get patient summary (recommended for quick view)
  getSummary: async (patientId) => {
    const response = await fetch(`${BASE_URL}/summary/${patientId}`);
    return handleResponse(response);
  },

  // Get patient timeline (RECOMMENDED FOR DOCTOR DASHBOARD)
  getTimeline: async (patientId) => {
    const response = await fetch(`${BASE_URL}/timeline/${patientId}`);
    return handleResponse(response);
  },

  // Get patient medical timeline (NEW DOCUMENTED API)
  getMedicalTimeline: async (patientId) => {
    const response = await fetch(`${BASE_URL}/documents/${patientId}/timeline`);
    return handleResponse(response);
  },

  // Generate medical timeline
  generateTimeline: async (patientId, batchId) => {
    const response = await fetch(`${BASE_URL}/documents/${patientId}/complete-batch?batch_id=${batchId}`, {
      method: 'POST',
    });
    return handleResponse(response);
  }
};

// Queue Management APIs
export const queueAPI = {
  // Get current queue
  getCurrent: async () => {
    const response = await fetch(`${BASE_URL}/queue`);
    return handleResponse(response);
  },

  // Get waiting patients only
  getWaiting: async () => {
    const response = await fetch(`${BASE_URL}/queue/waiting`);
    return handleResponse(response);
  },

  // Get current patient in consultation
  getCurrentPatient: async () => {
    const response = await fetch(`${BASE_URL}/queue/current`);
    return handleResponse(response);
  },

  // Add patient to queue
  addPatient: async (patientId, priority = 'normal') => {
    const response = await fetch(`${BASE_URL}/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient_id: patientId,
        priority: priority
      }),
    });
    return handleResponse(response);
  },

  // Nurse complete patient (NEW)
  nurseComplete: async (queueId) => {
    const response = await fetch(`${BASE_URL}/queue/${queueId}/nurse-complete`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Start consultation
  startConsultation: async (queueId) => {
    const response = await fetch(`${BASE_URL}/queue/${queueId}/start`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Complete consultation
  completeConsultation: async (queueId) => {
    const response = await fetch(`${BASE_URL}/queue/${queueId}/complete`, {
      method: 'POST',
    });
    return handleResponse(response);
  }
};

// Medical Notes APIs
export const notesAPI = {
  // Get all patient notes
  getAll: async (patientId) => {
    const response = await fetch(`${BASE_URL}/notes/${patientId}`);
    return handleResponse(response);
  },

  // Get latest note only
  getLatest: async (patientId) => {
    const response = await fetch(`${BASE_URL}/notes/${patientId}/latest`);
    return handleResponse(response);
  },

  // WORKAROUND: Get actual latest note from patient details API
  getActualLatest: async (patientId) => {
    try {
      const patientDetails = await patientsAPI.getDetails(patientId);
      if (patientDetails.success && patientDetails.latest_notes && patientDetails.latest_notes.length > 0) {
        // The latest_notes array is already sorted by newest first
        const latestNote = patientDetails.latest_notes[0];
        return {
          success: true,
          patient_id: patientId,
          patient_name: patientDetails.patient.name,
          note: latestNote
        };
      }
      return { success: false, error: 'No notes found' };
    } catch (error) {
      console.error('Error fetching actual latest note:', error);
      throw error;
    }
  }
};

// Prescription History APIs
export const historyAPI = {
  // Get all prescription history
  getAll: async (patientId) => {
    const response = await fetch(`${BASE_URL}/history/${patientId}`);
    return handleResponse(response);
  },

  // Get all medications timeline
  getMedications: async (patientId) => {
    const response = await fetch(`${BASE_URL}/history/${patientId}/medications`);
    return handleResponse(response);
  }
};

// System Statistics API
export const statsAPI = {
  // Get dashboard statistics
  get: async () => {
    const response = await fetch(`${BASE_URL}/stats`);
    return handleResponse(response);
  }
};

// MediKiosk Patient Self-Service APIs
export const kioskAPI = {
  // Verify ABHA ID or mobile number
  verifyAbha: async (abhaId) => {
    const response = await fetch(`${BASE_URL}/kiosk/abha/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abha_id: abhaId })
    });
    return handleResponse(response);
  },

  // Request OTP for ABHA auth
  requestOtp: async (abhaId, authMethod = 'AADHAAR_OTP') => {
    const response = await fetch(`${BASE_URL}/kiosk/abha/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ abha_id: abhaId, auth_method: authMethod })
    });
    return handleResponse(response);
  },

  // Verify OTP
  verifyOtp: async (transactionId, otp) => {
    const response = await fetch(`${BASE_URL}/kiosk/abha/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: transactionId, otp: otp })
    });
    return handleResponse(response);
  },

  // Register new ABHA citizen profile
  registerAbha: async (profile) => {
    const response = await fetch(`${BASE_URL}/kiosk/abha/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    return handleResponse(response);
  },

  // Log granular consent
  recordConsent: async (consentData) => {
    const response = await fetch(`${BASE_URL}/kiosk/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consentData)
    });
    return handleResponse(response);
  },

  // Start new Kiosk session
  startSession: async (patientInfo, mode = 'ALLOPATHIC', language = 'hi') => {
    const response = await fetch(`${BASE_URL}/kiosk/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_info: patientInfo,
        mode: mode,
        language: language
      })
    });
    return handleResponse(response);
  },

  // Send message (touch chip or voice transcript) & get next question + red flag check
  sendMessage: async (sessionId, userInput) => {
    const response = await fetch(`${BASE_URL}/kiosk/session/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_input: userInput
      })
    });
    return handleResponse(response);
  },

  // Complete session, generate 8-section summary, and obtain token slip
  completeSession: async (payload) => {
    const response = await fetch(`${BASE_URL}/kiosk/session/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  // Physician Review: Accept, Amend, Reject
  reviewSummary: async (patientId, noteId, reviewData) => {
    const response = await fetch(`${BASE_URL}/kiosk/review/${patientId}/${noteId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    return handleResponse(response);
  },

  // Module B: Medical Document Digitization & Intelligence
  analyzeDocuments: async (files = [], patientInfo = null) => {
    const formData = new FormData();
    if (files && files.length > 0) {
      files.forEach((f) => {
        formData.append('files', f);
      });
    }
    if (patientInfo) {
      formData.append('patient_info_json', JSON.stringify(patientInfo));
    }
    const response = await fetch(`${BASE_URL}/kiosk/documents/analyze`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  },

  // Ephemeral cleanup
  cleanupSession: async (sessionId) => {
    const response = await fetch(`${BASE_URL}/kiosk/session/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });
    return handleResponse(response);
  },

  // Speech-to-Text (ASR)
  transcribeAudio: async (audioBlob, language = 'hi', patientId = null) => {
    const formData = new FormData();
    const ext = audioBlob.type?.includes('wav') ? 'wav' : 'webm';
    formData.append('file', audioBlob, `speech_recording.${ext}`);
    formData.append('language', language);
    if (patientId) {
      formData.append('patient_id', patientId);
    }
    const response = await fetch(`${BASE_URL}/kiosk/speech/transcribe`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(response);
  },

  // Supported languages
  getSpeechLanguages: async () => {
    const response = await fetch(`${BASE_URL}/kiosk/speech/languages`);
    return handleResponse(response);
  },

  // NMT - Translate text between Indian languages
  translateText: async (text, sourceLang = 'hi', targetLang = 'en') => {
    const response = await fetch(`${BASE_URL}/kiosk/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        source_language: sourceLang,
        target_language: targetLang
      })
    });
    return handleResponse(response);
  },

  // TTS - Convert text to natural Indian language speech
  textToSpeech: async (text, language = 'hi', gender = 'female') => {
    const response = await fetch(`${BASE_URL}/kiosk/speech/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        language: language,
        gender: gender
      })
    });
    return handleResponse(response);
  },

  // Chained: Translate + Speak in target language
  translateAndSpeak: async (text, sourceLang = 'en', targetLang = 'hi', gender = 'female') => {
    const response = await fetch(`${BASE_URL}/kiosk/translate-and-speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        source_language: sourceLang,
        target_language: targetLang,
        gender: gender
      })
    });
    return handleResponse(response);
  },

};

// Utility functions for data transformation
export const transformers = {
  // Transform API patient data to dashboard format
  transformPatient: (apiPatient) => {
    return {
      id: apiPatient.patient_id,
      displayId: apiPatient.uhid || apiPatient.patient_id.split('_')[1],
      name: apiPatient.name,
      mobile: apiPatient.phone,
      age: apiPatient.age,
      gender: apiPatient.gender === 'male' ? 'M' : 'F',
      uhid: apiPatient.uhid || apiPatient.patient_id,
      status: 'waiting', // Will be updated from queue data
      queueNumber: null,
      checkInTime: new Date(apiPatient.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      lastUpdated: new Date(apiPatient.last_visit || apiPatient.created_at),
      visitCount: apiPatient.visit_count || 0
    };
  },

  // Transform queue data to update patient status
  transformQueueEntry: (queueEntry) => {
    // Map API status to UI status - UPDATED for new workflow
    let status = 'waiting';
    switch (queueEntry.status) {
      case 'waiting':
        status = 'waiting'; // Patient just registered, waiting for nurse
        break;
      case 'nurse_completed':
        status = 'nurse_completed'; // Nurse finished, timeline generating
        break;
      case 'ready_for_doctor':
        status = 'ready_for_doctor'; // Timeline ready, waiting for doctor
        break;
      case 'in_consultation':
        status = 'in_consultation'; // Currently with doctor
        break;
      case 'completed':
        status = 'completed'; // Consultation finished
        break;
      default:
        status = 'waiting';
    }

    return {
      queueId: queueEntry.queue_id,
      patientId: queueEntry.patient_id,
      patientName: queueEntry.patient_name,
      tokenNumber: queueEntry.token_number,
      priority: queueEntry.priority,
      status: status,
      intakeMode: queueEntry.intake_mode || 'nurse_assisted',
      hasRedFlags: queueEntry.has_red_flags || (queueEntry.priority === 'emergency_stat' || queueEntry.priority === 'urgent'),
      addedAt: queueEntry.added_at,
      startedAt: queueEntry.started_at,
      completedAt: queueEntry.completed_at,
      nurseCompletedAt: queueEntry.nurse_completed_at,
      timelineReadyAt: queueEntry.timeline_ready_at
    };
  },

  // Transform timeline data for patient history
  transformTimeline: (timelineData) => {
    const timeline = timelineData.timeline || [];
    
    // Separate notes and prescriptions
    const notes = timeline.filter(entry => entry.type === 'note');
    const prescriptions = timeline.filter(entry => entry.type === 'prescription');

    // Transform for patient history component - ONLY show data available from API
    return {
      personalInfo: {
        name: timelineData.patient_name,
        age: null, // Will be filled from patient details API
        gender: null, // Will be filled from patient details API
        uhid: timelineData.patient_id,
        contact: null // Will be filled from patient details API
      },
      // Only show medications that actually have data
      medications: prescriptions
        .filter(p => p.entry.medications && p.entry.medications.length > 0)
        .flatMap(p => p.entry.medications.map(med => ({
          name: med.name || 'Unknown medication',
          dosage: med.dosage || 'Not specified',
          frequency: med.frequency || 'Not specified',
          prescriptionDate: new Date(p.date).toLocaleDateString(),
          diagnosis: p.entry.diagnosis || 'Not specified',
          doctor: p.entry.doctor_name || 'Unknown',
          hospital: p.entry.hospital || 'Not specified'
        }))),
      // Transform SOAP notes into visit history
      visitHistory: notes
        .filter(note => note.entry.soap_note && (
          note.entry.soap_note.subjective || 
          note.entry.soap_note.assessment || 
          note.entry.chief_complaint
        ))
        .map(note => ({
          date: new Date(note.date).toLocaleDateString(),
          time: new Date(note.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          chiefComplaint: note.entry.chief_complaint || 'Not recorded',
          assessment: note.entry.assessment || note.entry.soap_note?.assessment || 'No assessment',
          plan: note.entry.plan || note.entry.soap_note?.plan || 'No plan recorded',
          subjective: note.entry.soap_note?.subjective || 'No symptoms recorded',
          objective: note.entry.soap_note?.objective || 'No examination findings',
          noteId: note.entry.note_id,
          audioFile: note.entry.audio_file,
          language: note.entry.soap_note?.language || 'Unknown'
        })),
      statistics: timelineData.statistics || {}
    };
  },

  // Transform latest note for encounter data
  transformEncounterData: (noteData, patientId) => {
    if (!noteData || !noteData.note) {
      return null;
    }

    const note = noteData.note;
    const soapNote = note.soap_note || {};

    // Debug logging for chief complaint and medications
    console.log('🔍 Transform Debug:', {
      noteId: note.note_id,
      hasChiefComplaint: !!soapNote.chief_complaint,
      chiefComplaint: soapNote.chief_complaint,
      medications: soapNote.medications,
      medicationsType: typeof soapNote.medications,
      medicationsLength: soapNote.medications?.length,
      soapNoteKeys: Object.keys(soapNote)
    });

    return {
      patientId: patientId,
      chiefComplaint: soapNote.chief_complaint || note.chief_complaint || null,
      structuredClinicalSummary: note.structured_clinical_summary || null,
      reviewStatus: note.review_status || 'PENDING_PHYSICIAN_REVIEW',
      physicianAmendments: note.physician_amendments || null,
      intakeMode: note.intake_mode || 'nurse_assisted',
      hasRedFlags: note.has_red_flags || (note.structured_clinical_summary?.clinical_red_flags?.length > 0),
      scribeData: {
        noteId: note.note_id || null,
        rawTranscript: note.transcript || null,
        soapNote: {
          subjective: soapNote.subjective || null,
          objective: soapNote.objective || null,
          assessment: soapNote.assessment || null,
          plan: soapNote.plan || null,
          medications: soapNote.medications || []
        },
        isProcessing: false
      },
      audioFile: note.audio_file || null,
      timestamp: note.created_at || new Date().toISOString()
    };
  }
};

// Helper functions for real-time updates
export const polling = {
  // Start polling for queue updates
  startQueuePolling: (callback, interval = 5000) => {
    const poll = async () => {
      try {
        const queueData = await queueAPI.getCurrent();
        callback(queueData);
      } catch (error) {
        console.error('Queue polling error:', error);
      }
    };

    poll(); // Initial call
    const intervalId = setInterval(poll, interval);
    return intervalId;
  },

  // Start polling for current patient updates
  startCurrentPatientPolling: (callback, interval = 10000) => {
    const poll = async () => {
      try {
        const currentPatient = await queueAPI.getCurrentPatient();
        callback(currentPatient);
      } catch (error) {
        console.error('Current patient polling error:', error);
        // Don't callback on error to avoid clearing current patient
      }
    };

    const intervalId = setInterval(poll, interval);
    return intervalId;
  },

  // Start polling for latest notes
  startNotesPolling: (patientId, callback, interval = 15000) => {
    const poll = async () => {
      try {
        const latestNote = await notesAPI.getLatest(patientId);
        callback(latestNote);
      } catch (error) {
        console.error('Notes polling error:', error);
      }
    };

    const intervalId = setInterval(poll, interval);
    return intervalId;
  },

  // Stop polling
  stop: (intervalId) => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
};

export default {
  patientsAPI,
  queueAPI,
  notesAPI,
  historyAPI,
  statsAPI,
  kioskAPI,
  transformers,
  polling
};