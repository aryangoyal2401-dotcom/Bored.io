import React, { useState, useRef } from 'react';
import { 
  FiCamera, 
  FiUploadCloud, 
  FiFileText, 
  FiCheck, 
  FiArrowRight, 
  FiX, 
  FiMessageSquare,
  FiCheckCircle,
  FiInfo,
  FiAlertTriangle,
  FiClock,
  FiActivity,
  FiPlus,
  FiTrash2,
  FiLoader,
  FiRefreshCw
} from 'react-icons/fi';
import { CiPill } from "react-icons/ci";
import { kioskAPI } from '../../utils/api';

const DocumentScanStep = ({ 
  language, 
  patient,
  onComplete, 
  onSkip, 
  hasAnsweredQuestions = false, 
  onGoToDialogue 
}) => {
  const isHindi = language === 'hi';
  const fileInputRef = useRef(null);

  // Multi-document state
  const [documents, setDocuments] = useState([]);
  const [selectedType, setSelectedType] = useState('prescription');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'meds' | 'labs' | 'procedures' | 'diagnoses'
  
  // Extracted clinical intelligence state
  const [extractionResult, setExtractionResult] = useState(null);

  // Supported document categories
  const docCategories = [
    { id: 'prescription', label_en: 'Prescription (Rx)', label_hi: 'डॉक्टर पर्ची (Rx)', icon: '💊' },
    { id: 'lab_report', label_en: 'Lab Report', label_hi: 'खून / लैब जांच रिपोर्ट', icon: '🧪' },
    { id: 'discharge_summary', label_en: 'Discharge Summary', label_hi: 'अस्पताल डिस्चार्ज सारांश', icon: '🏥' },
    { id: 'other', label_en: 'Other Clinical Record', label_hi: 'अन्य मेडिकल रिकॉर्ड', icon: '📄' }
  ];

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newDocs = files.map((file, idx) => ({
      id: `doc_${Date.now()}_${idx}`,
      file: file,
      name: file.name,
      type: selectedType,
      previewUrl: URL.createObjectURL(file),
      date: new Date().toISOString().slice(0, 10)
    }));

    const updated = [...documents, ...newDocs];
    setDocuments(updated);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Automatically trigger AI extraction analysis
    await analyzeDocumentsBatch(updated);
  };

  // Remove a document from batch
  const handleRemoveDoc = (id) => {
    const remaining = documents.filter(d => d.id !== id);
    setDocuments(remaining);
    if (remaining.length === 0) {
      setExtractionResult(null);
    } else {
      analyzeDocumentsBatch(remaining);
    }
  };

  // Trigger Module B: Document-AI OCR & Intelligence Pipeline
  const analyzeDocumentsBatch = async (docsToAnalyze) => {
    if (!docsToAnalyze || docsToAnalyze.length === 0) return;
    setIsAnalyzing(true);

    try {
      const files = docsToAnalyze.map(d => d.file).filter(Boolean);
      const res = await kioskAPI.analyzeDocuments(files, patient);
      if (res && res.timeline) {
        setExtractionResult(res.timeline);
      } else {
        setExtractionResult(buildHonestClientExtraction(docsToAnalyze));
      }
    } catch (err) {
      console.warn('Document analysis fallback:', err);
      setExtractionResult(buildHonestClientExtraction(docsToAnalyze));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Honest extraction for user-uploaded documents when offline
  const buildHonestClientExtraction = (docs) => {
    const events = docs.map((d, idx) => ({
      date: d.date || new Date().toISOString().slice(0, 10),
      event_type: d.type || 'prescription',
      document_type_label: (d.type || 'prescription').replace('_', ' ').toUpperCase(),
      doctor: "Attending Clinical Physician",
      hospital: "Healthcare Center",
      description: `Patient uploaded file: ${d.name}`,
      diagnoses: ["Awaiting doctor examination of uploaded record"],
      medications: [],
      investigation_results: [],
      procedures_surgeries: [],
      notes: `Original uploaded document: ${d.name}. Full image available on physician dashboard.`
    }));

    return {
      timeline_events: events,
      abnormal_lab_findings: [],
      detected_drug_interactions: [],
      procedure_surgery_history: [],
      all_diagnoses: ["Clinical record uploaded - awaiting direct review"],
      current_medications: [],
      summary: `${docs.length} document(s) uploaded (${docs.map(d => d.name).join(', ')}). Awaiting direct physician examination.`
    };
  };

  // Demo shortcut: load sample documents
  const handleLoadDemoDocuments = async () => {
    const demoDocs = [
      {
        id: 'demo_rx_1',
        name: 'OPD_Prescription_DrSharma.jpg',
        type: 'prescription',
        date: '2024-10-15',
        previewUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80'
      },
      {
        id: 'demo_lab_2',
        name: 'Biochemistry_Blood_Panel.pdf',
        type: 'lab_report',
        date: '2024-10-14',
        previewUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&q=80'
      },
      {
        id: 'demo_discharge_3',
        name: 'Civil_Hospital_Discharge_2018.pdf',
        type: 'discharge_summary',
        date: '2018-06-20',
        previewUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&q=80'
      }
    ];

    setDocuments(demoDocs);
    setIsAnalyzing(true);
    setTimeout(() => {
      setExtractionResult(getSimulatedClinicalExtraction());
      setIsAnalyzing(false);
    }, 800);
  };

  // Standardized simulated clinical extraction compliant with Module B
  const getSimulatedClinicalExtraction = () => ({
    timeline_events: [
      {
        date: "2024-10-15",
        event_type: "prescription",
        document_type_label: "OPD Prescription (Allopathic)",
        doctor: "Dr. R. K. Sharma, MBBS, MD (Medicine)",
        hospital: "Primary Health Centre, Ward 4",
        description: "Routine diabetic & hypertensive follow-up with prescription renewal",
        diagnoses: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
        medications: [
          { name: "Metformin", dosage: "500mg", frequency: "BD", duration: "30 days", instructions: "With meals" },
          { name: "Amlodipine", dosage: "5mg", frequency: "OD", duration: "30 days", instructions: "Morning after breakfast" },
          { name: "Aspirin", dosage: "75mg", frequency: "OD", duration: "30 days", instructions: "Post lunch" },
          { name: "Warfarin", dosage: "2.5mg", frequency: "OD (Night)", duration: "30 days", instructions: "Bedtime (INR target 2.0-3.0)" }
        ],
        investigation_results: [],
        procedures_surgeries: [],
        notes: "Advised salt-restricted diet, daily 30-min brisk walk, and HbA1c repeat in 3 months."
      },
      {
        date: "2024-10-14",
        event_type: "lab_report",
        document_type_label: "Diagnostic Lab Blood Panel",
        doctor: "Dr. Anjali Mehta, MD (Pathology)",
        hospital: "District Diagnostic Pathology Lab",
        description: "Fasting blood sugar, glycated hemoglobin (HbA1c), and renal function panel",
        diagnoses: ["Impaired Glycemic Control"],
        medications: [],
        investigation_results: [
          { test_name: "Fasting Blood Sugar (FBS)", observed_value: 165.0, unit: "mg/dL", reference_range: "70 - 100 mg/dL", is_abnormal: true, flag: "HIGH" },
          { test_name: "Glycated Hemoglobin (HbA1c)", observed_value: 8.2, unit: "%", reference_range: "< 5.7 %", is_abnormal: true, flag: "HIGH" },
          { test_name: "Serum Creatinine", observed_value: 1.1, unit: "mg/dL", reference_range: "0.7 - 1.3 mg/dL", is_abnormal: false, flag: "NORMAL" },
          { test_name: "Hemoglobin (Hb)", observed_value: 13.8, unit: "g/dL", reference_range: "13.0 - 17.0 g/dL", is_abnormal: false, flag: "NORMAL" }
        ],
        procedures_surgeries: [],
        notes: "Marked hyperglycemia. Fasting glucose and HbA1c significantly elevated."
      },
      {
        date: "2018-06-20",
        event_type: "discharge_summary",
        document_type_label: "Hospital Discharge Summary",
        doctor: "Dr. S. K. Mukherjee, MS (General Surgery)",
        hospital: "Sub-Divisional Civil Hospital",
        description: "Emergency surgical admission for acute appendicitis; uneventful laparoscopic appendectomy",
        diagnoses: ["Acute Suppurative Appendicitis"],
        medications: [
          { name: "Amoxicillin-Clavulanate", dosage: "625mg", frequency: "TDS", duration: "5 days", instructions: "Completed in 2018" }
        ],
        investigation_results: [],
        procedures_surgeries: [
          { procedure_name: "Laparoscopic Appendectomy", date_or_year: "2018", notes: "Laparoscopic 3-port resection, histopathology confirmed acute appendicitis, wound healed per primam." }
        ],
        notes: "Discharged in stable hemodynamic condition. Suture removal done on Day 8."
      }
    ],
    abnormal_lab_findings: [
      {
        test_name: "Fasting Blood Sugar (FBS)",
        observed_value: 165.0,
        unit: "mg/dL",
        reference_range: "70 - 100 mg/dL",
        flag: "HIGH",
        date: "2024-10-14",
        clinical_implication: "Significant fasting hyperglycemia (+65% above upper normal limit). Requires antidiabetic dose titration."
      },
      {
        test_name: "Glycated Hemoglobin (HbA1c)",
        observed_value: 8.2,
        unit: "%",
        reference_range: "< 5.7 %",
        flag: "HIGH",
        date: "2024-10-14",
        clinical_implication: "Poor glycemic control over prior 3-month period. Elevated risk of microvascular diabetic complications."
      }
    ],
    detected_drug_interactions: [
      {
        drugs: ["Warfarin", "Aspirin"],
        severity: "HIGH",
        description: "Concurrent anticoagulant (Warfarin) + antiplatelet (Aspirin) significantly amplifies risk of major gastrointestinal and systemic hemorrhage. Requires immediate physician review."
      }
    ],
    procedure_surgery_history: [
      {
        procedure_name: "Laparoscopic Appendectomy",
        date_or_year: "2018",
        hospital: "Sub-Divisional Civil Hospital",
        indication: "Acute Suppurative Appendicitis",
        notes: "Uneventful 3-port laparoscopic appendectomy"
      }
    ],
    all_diagnoses: [
      "Type 2 Diabetes Mellitus (Uncontrolled, HbA1c 8.2%)",
      "Essential Hypertension",
      "Past Acute Appendicitis (Status post-appendectomy)"
    ],
    current_medications: [
      { name: "Metformin", dosage: "500mg", frequency: "BD", duration: "Ongoing", prescribed_date: "2024-10-15", doctor: "Dr. R. K. Sharma" },
      { name: "Amlodipine", dosage: "5mg", frequency: "OD", duration: "Ongoing", prescribed_date: "2024-10-15", doctor: "Dr. R. K. Sharma" },
      { name: "Aspirin", dosage: "75mg", frequency: "OD", duration: "Ongoing", prescribed_date: "2024-10-15", doctor: "Dr. R. K. Sharma" },
      { name: "Warfarin", dosage: "2.5mg", frequency: "OD", duration: "Ongoing", prescribed_date: "2024-10-15", doctor: "Dr. R. K. Sharma" }
    ],
    summary: "Patient possesses an active chronic history of Type 2 Diabetes with elevated HbA1c (8.2%) and Essential Hypertension. Concurrently prescribed Aspirin and Warfarin. Prior surgical history positive for laparoscopic appendectomy (2018)."
  });

  const handleProceed = () => {
    onComplete({
      documentsList: documents,
      extractedTimeline: extractionResult || getSimulatedClinicalExtraction()
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold uppercase tracking-wider">
          Module B • दस्तावेज़ डिजिटाइज़ेशन / Medical Document Digitization & Intelligence
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
          {isHindi ? 'पुरानी पर्ची, रिपोर्ट व डिस्चार्ज समरी स्कैन करें' : 'Scan Prescriptions, Lab Reports & Records'}
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          {isHindi
            ? 'AI स्कैनर पुरानी डॉक्टर पर्ची, खून जांच और अस्पताल छुट्टी पत्र से बीमारी, दवाइयां, जांच परिणाम और सर्जरी इतिहास का स्वचालित विश्लेषण करता है।'
            : 'AI-powered clinical OCR extracts diagnoses, medications with dosages, lab investigations with reference ranges, and procedure history into a coherent medical timeline.'}
        </p>
      </div>

      {/* Pathway Status Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <FiInfo className="text-sky-600 shrink-0" size={16} />
            <span>
              {isHindi
                ? '💡 पर्ची अपलोड करना और सवाल पूछना दोनों ऐच्छिक हैं — आप अपनी सुविधा अनुसार कोई भी या दोनों चुन सकते हैं।'
                : '💡 Complete flexibility: upload documents only, answer questions only, or do both.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasAnsweredQuestions ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                <FiCheckCircle size={13} />
                {isHindi ? 'लक्षण प्रश्न उत्तरित' : 'Symptom Questions Answered'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-semibold text-[11px]">
                ⚡ {isHindi ? 'सीधा दस्तावेज़ मार्ग' : 'Direct Document Track'}
              </span>
            )}
            
            <button
              type="button"
              onClick={handleLoadDemoDocuments}
              className="px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-semibold text-[11px] transition-colors flex items-center gap-1.5"
              title="Load pre-configured prescription and lab test report"
            >
              <span>✨ {isHindi ? 'नमूना पर्ची लोड करें (डेमो)' : 'Load Demo Documents'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Type Category Selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          {isHindi ? 'अपलोड की जाने वाली श्रेणी चुनें:' : 'Select Document Category to Add:'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {docCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedType(cat.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                selectedType === cat.id
                  ? 'bg-sky-50 border-2 border-sky-600 text-sky-900 shadow-sm ring-2 ring-sky-100'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <div>
                <div className="text-xs font-bold leading-tight">
                  {isHindi ? cat.label_hi : cat.label_en}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Upload Box */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Capture / Upload Dropzone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-2xl bg-slate-50 hover:bg-sky-50/50 border-2 border-dashed border-slate-300 hover:border-sky-500 text-center space-y-2 transition-all group active:scale-98"
          >
            <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center mx-auto transition-colors">
              <FiCamera size={28} />
            </div>
            <div className="text-base font-bold text-slate-900 group-hover:text-sky-700">
              {isHindi ? 'कैमरे से फोटो खींचें / स्कैन करें' : 'Camera Scan (Multi-Page)'}
            </div>
            <div className="text-xs text-slate-500">
              {isHindi ? 'पर्ची, खून जांच या डिस्चार्ज समरी की फोटो लें' : 'Scan printed or handwritten document via camera'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-2xl bg-slate-50 hover:bg-teal-50/50 border-2 border-dashed border-slate-300 hover:border-teal-500 text-center space-y-2 transition-all group active:scale-98"
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center mx-auto transition-colors">
              <FiUploadCloud size={28} />
            </div>
            <div className="text-base font-bold text-slate-900 group-hover:text-teal-700">
              {isHindi ? 'फ़ाइलें अपलोड करें (JPG, PNG, PDF)' : 'Upload Files (Multiple PDFs / Images)'}
            </div>
            <div className="text-xs text-slate-500">
              {isHindi ? 'गैलरी या स्टोरेज से एक से अधिक रिपोर्ट चुनें' : 'Choose multiple reports from device memory'}
            </div>
          </button>
        </div>

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold uppercase">
              <span>{isHindi ? `स्कैन किए गए दस्तावेज़ (${documents.length})` : `Scanned Documents (${documents.length})`}</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sky-700 hover:text-sky-800 flex items-center gap-1 normal-case font-bold"
              >
                <FiPlus size={14} />
                <span>{isHindi ? '+ और दस्तावेज़ जोड़ें' : '+ Add More Documents'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 group relative overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-2xl shrink-0">
                      {doc.type === 'prescription' ? '💊' : doc.type === 'lab_report' ? '🧪' : doc.type === 'discharge_summary' ? '🏥' : '📄'}
                    </span>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-900 truncate">{doc.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">
                        {doc.type?.replace('_', ' ')} • {doc.date}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(doc.id)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                    title="Remove"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing State */}
        {isAnalyzing && (
          <div className="p-6 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-10 h-10 rounded-full border-3 border-sky-600 border-t-transparent animate-spin" />
            <div className="text-sm font-bold text-sky-900">
              {isHindi ? 'AI क्लिनिकल OCR व इकाई निष्कर्षण प्रगति पर है...' : 'AI Clinical OCR & Intelligence Pipeline Processing...'}
            </div>
            <div className="text-xs text-slate-600 max-w-md">
              Extracting handwritten/printed diagnoses, medications with dosages, lab reference values, and ordering medical timeline...
            </div>
          </div>
        )}

        {/* MODULE B INTELLIGENT CLINICAL EXTRACTION BREAKDOWN */}
        {extractionResult && !isAnalyzing && (
          <div className="pt-4 border-t border-slate-200 space-y-5">
            {/* Highlight Alert 1: Abnormal Lab Values */}
            {extractionResult.abnormal_lab_findings && extractionResult.abnormal_lab_findings.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0">
                    <FiAlertTriangle size={20} />
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-red-900">
                        {isHindi ? '🚨 असामान्य जांच परिणाम (Abnormal-Value Flags)' : '🚨 Abnormal Out-of-Range Lab Values Detected'}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 uppercase">
                        Physician Attention Flag
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {extractionResult.abnormal_lab_findings.map((finding, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white border border-red-200 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{finding.test_name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-semibold text-[10px]">
                              {finding.flag}
                            </span>
                          </div>
                          <div className="text-red-700 font-mono text-sm font-bold mt-1">
                            {finding.observed_value} {finding.unit}{' '}
                            <span className="text-xs text-slate-500 font-normal">
                              [Ref: {finding.reference_range}]
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 leading-tight">
                            {finding.clinical_implication}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Highlight Alert 2: Potential Drug Interactions */}
            {extractionResult.detected_drug_interactions && extractionResult.detected_drug_interactions.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                    <CiPill size={22} className="stroke-[1.5]" />
                  </div>
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-amber-900">
                        {isHindi ? '⚠️ संभावित दवा पारस्परिक प्रभाव (Drug Interaction Warning)' : '⚠️ Potential Drug-Drug Interaction Detected'}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                        High Alert
                      </span>
                    </div>
                    {extractionResult.detected_drug_interactions.map((interaction, idx) => (
                      <div key={idx} className="text-xs text-amber-900 leading-relaxed">
                        <span className="font-bold text-slate-900 underline">
                          {interaction.drugs?.join(' + ')}
                        </span>
                        : {interaction.description}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs for Extracted Entities */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'timeline' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FiClock size={14} />
                  <span>{isHindi ? 'कालानुक्रमिक टाइमलाइन' : 'Chronological Timeline'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('meds')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'meds' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CiPill size={16} />
                  <span>{isHindi ? 'दवाइयां व खुराक' : 'Medications & Dosages'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('labs')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'labs' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FiActivity size={14} />
                  <span>{isHindi ? 'जांच व संदर्भ मान' : 'Investigation Results'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('procedures')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'procedures' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>🏥 {isHindi ? 'सर्जरी व प्रक्रिया इतिहास' : 'Procedure / Surgery History'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('diagnoses')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'diagnoses' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>📋 {isHindi ? 'निदान (Diagnoses)' : 'Diagnoses'}</span>
                </button>
              </div>

              {/* Tab 1: Chronological Medical Timeline */}
              {activeTab === 'timeline' && (
                <div className="pt-4 space-y-4">
                  <div className="text-xs text-slate-500 font-medium">
                    {isHindi
                      ? 'दस्तावेज़ों को स्वचालित रूप से दिनांक अनुसार क्रमबद्ध किया गया है:'
                      : 'Documents automatically dated and ordered into a coherent medical timeline for the physician:'}
                  </div>

                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {extractionResult.timeline_events?.map((ev, idx) => (
                      <div key={idx} className="relative pl-8">
                        <div className="absolute left-1.5 top-2 w-3.5 h-3.5 rounded-full bg-sky-600 ring-4 ring-white" />
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-sky-700">{ev.date}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                                {ev.document_type_label || ev.event_type}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {ev.doctor} • {ev.hospital}
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-slate-900">{ev.description}</div>

                          {ev.diagnoses && ev.diagnoses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ev.diagnoses.map((d, dIdx) => (
                                <span key={dIdx} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}

                          {ev.medications && ev.medications.length > 0 && (
                            <div className="text-[11px] text-slate-600">
                              <span className="font-bold text-slate-800">Medications: </span>
                              {ev.medications.map(m => `${m.name} ${m.dosage} (${m.frequency})`).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Prescribed Medications with Dosages */}
              {activeTab === 'meds' && (
                <div className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {extractionResult.current_medications?.map((med, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 shadow-2xs">
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-slate-900">{med.name}</div>
                          <div className="text-xs text-emerald-700 font-semibold flex items-center gap-2">
                            <span>Dosage: {med.dosage}</span>
                            <span>•</span>
                            <span>Freq: {med.frequency}</span>
                          </div>
                          {med.instructions && (
                            <div className="text-[11px] text-slate-500">{med.instructions}</div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Investigation Results with Reference Ranges */}
              {activeTab === 'labs' && (
                <div className="pt-4 space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Test Investigation</th>
                          <th className="p-3">Observed Value</th>
                          <th className="p-3">Reference Range</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-medium">
                        {extractionResult.timeline_events
                          ?.flatMap(e => e.investigation_results || [])
                          .map((inv, idx) => (
                            <tr key={idx} className={inv.is_abnormal ? 'bg-red-50/50' : ''}>
                              <td className="p-3 font-bold text-slate-900">{inv.test_name}</td>
                              <td className={`p-3 font-mono font-bold ${inv.is_abnormal ? 'text-red-600' : 'text-slate-800'}`}>
                                {inv.observed_value} {inv.unit}
                              </td>
                              <td className="p-3 text-slate-600">{inv.reference_range}</td>
                              <td className="p-3">
                                {inv.is_abnormal ? (
                                  <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-700 font-bold text-[10px]">
                                    🔴 {inv.flag || 'ABNORMAL'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                                    🟢 NORMAL
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: Procedure & Surgery History */}
              {activeTab === 'procedures' && (
                <div className="pt-4 space-y-3">
                  {extractionResult.procedure_surgery_history?.map((proc, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-900">{proc.procedure_name}</div>
                        <span className="text-xs font-semibold text-sky-700">{proc.date_or_year}</span>
                      </div>
                      {proc.hospital && <div className="text-xs text-slate-500">{proc.hospital}</div>}
                      <div className="text-xs text-slate-700 pt-1">{proc.notes}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 5: Diagnoses */}
              {activeTab === 'diagnoses' && (
                <div className="pt-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {extractionResult.all_diagnoses?.map((diag, idx) => (
                      <div key={idx} className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{diag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!hasAnsweredQuestions && onGoToDialogue && (
              <button
                type="button"
                onClick={onGoToDialogue}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-teal-800 border border-teal-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <FiMessageSquare size={15} />
                <span>{isHindi ? '💬 लक्षण पूछताछ भी करें' : 'Also Answer Symptom Questions'}</span>
              </button>
            )}

            {documents.length > 0 && (
              <button
                type="button"
                onClick={() => analyzeDocumentsBatch(documents)}
                disabled={isAnalyzing}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5"
                title="Re-run AI analysis"
              >
                <FiRefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                <span>{isHindi ? 'पुनः विश्लेषण' : 'Re-Analyze'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {documents.length === 0 ? (
              <button
                type="button"
                onClick={onSkip}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {hasAnsweredQuestions
                    ? (isHindi ? 'कोई पर्ची नहीं है (टोकन लें) ➔' : 'No Records (Get Token) ➔')
                    : (isHindi ? 'बिना पर्ची सामान्य टोकन लें ➔' : 'No Records • Get Walk-in Token ➔')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProceed}
                disabled={isAnalyzing}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-base shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>
                  {isHindi
                    ? '✅ दस्तावेज़ व टाइमलाइन के साथ टोकन प्राप्त करें'
                    : 'Complete & Get Token with Timeline'}
                </span>
                <FiArrowRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentScanStep;
