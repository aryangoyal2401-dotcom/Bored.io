import React from 'react'
import { colors } from '../../utils/colors'

const AboutUs = () => {
  return (
    <section 
      className="min-h-[100vh] flex items-center px-12" 
      style={{backgroundColor: colors.textPrimary}}
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Tag */}
        <div className="mb-8">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{backgroundColor: colors.primary}}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{backgroundColor: colors.secondary}}
            />
            <span 
              className="text-sm font-medium tracking-wide"
              style={{color: colors.secondary}}
            >
              About Us
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <h2 
            className="font-ptserif text-2xl md:text-3xl lg:text-4xl font-normal leading-tight" 
            style={{color: colors.secondary}}
          >
            At Sahayak, we make patient case-taking{' '}
            <span style={{color: colors.primary}}>structured, intelligent, and practitioner-ready.</span>{' '}
            Through an in-hospital kiosk, AI-powered voice intake, and intelligent document digitization, 
            we ensure practitioners receive a complete patient story before consultation begins.
          </h2>
        </div>

        {/* Optional supporting text */}
        <div className="mt-12">
          <p 
            className="text-md md:text-xl font-light leading-relaxed max-w-3xl"
            style={{color: colors.primary}}
          >
            Built for SIH 2026 Problem Statement #26047 (Ministry of AYUSH) — our mission is to 
            digitize and streamline the case-taking process at primary healthcare centers across India.
          </p>
        </div>
      </div>
    </section>
  )
}

export default AboutUs