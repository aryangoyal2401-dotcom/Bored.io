import React from 'react'
import { colors } from '../../utils/colors'
import { 
  FiMic, 
  FiFileText, 
  FiMonitor, 
  FiArrowRight
} from 'react-icons/fi'

const HowItWorks = () => {
  const steps = [
    {
      id: 1,
      icon: FiMic,
      title: "Patient arrives at Sahayak Kiosk",
      description: "The patient authenticates via ABHA/Aadhaar, selects their language, and answers adaptive SOCRATES questions via voice or touch. Emergency red-flags are detected in real-time.",
      microcopy: "Voice → Text → Key symptoms extracted at the kiosk.",
      alt: "Kiosk icon for patient self-service intake"
    },
    {
      id: 2,
      icon: FiFileText,
      title: "Documents scanned with Sahayak Scan",
      description: "Upload prescriptions, lab reports and notes at the kiosk. AI builds a structured medical timeline with drug interaction checks.",
      microcopy: "OCR + clinical data extraction + chronological ordering.",
      alt: "Document with scan lines for OCR processing"
    },
    {
      id: 3,
      icon: FiMonitor,
      title: "Practitioner reviews on Sahayak Sync",
      description: "Before the consultation, the practitioner views the AI-generated 8-section clinical summary, medical timeline, and can accept, amend, or reject the intake.",
      microcopy: "Walk in prepared — diagnose faster.",
      alt: "Desktop dashboard showing patient information"
    }
  ];

  return (
    <section 
      className="py-20 px-6" 
      style={{backgroundColor: colors.background}}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-6">
          <h2 
            className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight tracking-tight" 
            style={{color: colors.textPrimary}}
          >
            How Sahayak fits into your{' '}
            <span className="font-medium" style={{color: colors.primary}}>clinic workflow</span>
          </h2>
          
          <p 
            className="text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto font-light" 
            style={{color: colors.textSecondary}}
          >
            From triage to consultation — we automate the parts that slow doctors down.
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step) => {
            const IconComponent = step.icon;
            
            return (
              <div 
                key={step.id} 
                className="group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              >
                <div 
                  className="flex items-start gap-6 p-6 rounded-2xl transition-all duration-200"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-1">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{backgroundColor: colors.surfaceSecondary}}
                    >
                      <IconComponent 
                        size={24} 
                        style={{color: colors.primary}}
                        aria-label={step.alt}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <h3 
                      className="text-xl font-medium leading-tight" 
                      style={{color: colors.textPrimary}}
                    >
                      {step.title}
                    </h3>
                    
                    <p 
                      className="text-base leading-relaxed font-light" 
                      style={{color: colors.textSecondary}}
                    >
                      {step.description}
                    </p>
                    
                    <p 
                      className="text-sm font-medium" 
                      style={{color: colors.textTertiary}}
                    >
                      {step.microcopy}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button 
            className="px-8 py-3 rounded-full text-base font-medium transition-colors duration-200"
            style={{
              backgroundColor: colors.primary,
              color: colors.secondary
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = colors.primaryHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = colors.primary}
          >
            See it in action
          </button>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks