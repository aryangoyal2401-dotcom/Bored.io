

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { colors } from '../../utils/colors'

const Hero = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  const buttonStyles = {
    primary: {
      backgroundColor: colors.primary,
      color: colors.secondary,
      border: 'none',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: colors.primary,
      border: `1px solid ${colors.primary}`,
    }
  };

  const handleButtonHover = (e, type) => {
    if (type === 'primary') {
      e.target.style.backgroundColor = colors.primaryHover;
    } else {
      e.target.style.color = colors.primaryHover;
      e.target.style.borderColor = colors.primaryHover;
    }
  };

  const handleButtonLeave = (e, type) => {
    if (type === 'primary') {
      e.target.style.backgroundColor = colors.primary;
    } else {
      e.target.style.color = colors.primary;
      e.target.style.borderColor = colors.primary;
    }
  };

  return (
    <section 
      className="h-screen flex items-center justify-center px-6" 
      style={{backgroundColor: colors.background}}
    >
      <div className="max-w-4xl mx-auto text-center">
        <div className="space-y-12">
          {/* Subtle product tag */}
          <div className="inline-block">
            <span 
              className="text-sm font-medium tracking-wide uppercase" 
              style={{color: colors.textTertiary}}
            >
              Sahayak
            </span>
          </div>

          {/* Main Headline */}
          <div className="space-y-8">
            <h1 
              className="text-5xl md:text-6xl lg:text-7xl font-light leading-tight tracking-tight" 
              style={{color: colors.textPrimary}}
            >
              Turning dialogue into{' '}
              <span className="font-medium" style={{color: colors.primary}}>data</span>{' '}
              and data into{' '}
              <span className="font-medium" style={{color: colors.primary}}>clarity</span>.
            </h1>
            
            <p 
              className="text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto font-light" 
              style={{color: colors.textSecondary}}
            >
              AI-powered medical transcription that listens, reads and summarizes, 
              so doctors get the complete patient story before consultation begins.
            </p>
          </div>

          {/* Clean CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              className="px-8 py-4 rounded-full text-base font-bold transition-all duration-200 shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 flex items-center gap-2"
              style={{
                backgroundColor: colors.primary,
                color: '#0F172A',
              }}
              onClick={() => navigate('/kiosk')}
            >
              <span>🏥 Launch MediKiosk (Patient Self-Service)</span>
              <span>➔</span>
            </button>
            <button 
              className="px-8 py-4 text-base font-semibold transition-all duration-200 rounded-full hover:bg-slate-800/20"
              style={buttonStyles.secondary}
              onClick={() => navigate('/dashboard')}
            >
              Doctor Dashboard (Sahayak Sync)
            </button>
          </div>

          {/* Minimal feature highlights */}
          <div 
            className="flex flex-wrap justify-center items-center gap-6 text-sm font-medium" 
            style={{color: colors.textSecondary}}
          >
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">●</span> Patient Self-Service Kiosk</span>
            <span style={{color: colors.separator}}>•</span>
            <span className="flex items-center gap-1.5"><span className="text-blue-500">●</span> SOCRATES Adaptive Intake</span>
            <span style={{color: colors.separator}}>•</span>
            <span className="flex items-center gap-1.5"><span className="text-purple-500">●</span> ABHA / ABDM Authentication</span>
            <span style={{color: colors.separator}}>•</span>
            <span className="flex items-center gap-1.5"><span className="text-red-500">●</span> Emergency Red-Flag Triage</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero