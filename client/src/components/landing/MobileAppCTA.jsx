import React from 'react'
import { colors } from '../../utils/colors'

const MobileAppCTA = () => {
  const handleDownload = () => {
    // For demo purposes - could link to app stores
    alert('Mobile app download would be initiated here');
  };

  const gradientStyle = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.primary} 100%)`,
    borderRadius: '24px',
  };

  return (
    <section 
      className="py-20 px-6" 
      style={{backgroundColor: colors.background}}
    >
      <div className="md:max-w-[70vw] mx-auto">
        <div 
          className="relative overflow-hidden px-12 py-16 text-center"
          style={gradientStyle}
        >
          {/* Decorative elements matching the attached design */}
          <div className="absolute top-6 left-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.3}}></div>
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.2}}></div>
            </div>
          </div>
          
          <div className="absolute top-6 right-6">
            <div className="grid grid-cols-2 gap-2">
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.3}}></div>
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.2}}></div>
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.2}}></div>
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.3}}></div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.2}}></div>
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors.secondary, opacity: 0.3}}></div>
            </div>
          </div>

          {/* Brand placeholder */}
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/20 text-white">
              Optional Staff Assisted Mode
            </span>
            <h3 className="text-2xl font-bold mt-2 text-white">Sahayak Nurse Assist App</h3>
          </div>

          {/* Main content */}
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-base md:text-lg font-light text-white/90 leading-relaxed">
              While the MediKiosk self-service tablet handles primary patient intake unassisted, 
              healthcare staff can use the Flutter companion app to assist elderly, differently-abled, 
              or non-literate patients who need hands-on help.
            </h2>
            <button 
              onClick={handleDownload}
              className="inline-flex items-center px-8 py-3.5 rounded-full text-sm font-bold transition-all duration-200 hover:shadow-xl transform hover:scale-105 bg-white text-slate-900 shadow-md"
            >
              Nurse Companion App (Assisted Mode)
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MobileAppCTA