import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2 } from './dsShared';

const STEPS = [
  {
    icon:  'garmentType',
    title: 'Pick Your Garment',
    body:  'Start by choosing a garment type in the left panel. Pick from School Polo, Scrub Top, Lab Coat and more. Each has its own shape on the canvas.',
    hint:  'Look left → Type tab is already open.',
    arrow: 'left',
  },
  {
    icon:  'colorZone',
    title: 'Paint the Color Zones',
    body:  'Click any zone on the garment (body, collar, sleeve, pocket) — it will highlight. Then pick a Philippine institutional color or dial in a custom shade with the HSL color picker.',
    hint:  'Try clicking directly on the garment canvas.',
    arrow: 'left',
  },
  {
    icon:  'ai',
    title: 'Describe Your Design with AI',
    body:  'Open the AI tab on the left, type a description like "navy blue school polo, white collar, left chest logo", and Gemini will fill the canvas automatically.',
    hint:  'Works best with specific colors and placement details.',
    arrow: 'left',
  },
  {
    icon:  'cart',
    title: 'Place Your Order',
    body:  'When your design is ready, click "Order This →" in the top-right. Your design will be saved and carried into the order form — sizes, quantities, and payment terms next.',
    hint:  'You can also save a draft anytime with the Save button.',
    arrow: 'top-right',
  },
];

export default function OnboardingOverlay({ showOnboarding, onboardStep, nextOnboardStep, dismissOnboarding }) {
  return (
    <AnimatePresence>
      {showOnboarding && (() => {
        const step = STEPS[onboardStep];
        return (
          <motion.div
            key={`ob-${onboardStep}`}
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{   opacity:0 }}
            transition={{ duration:.22 }}
            style={{
              position:'absolute', inset:0, zIndex:200,
              background:'rgba(2,8,20,.78)',
              backdropFilter:'blur(3px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:20,
            }}
            // Clicking the scrim skips to next step (power users)
            onClick={nextOnboardStep}
          >
            <motion.div
              key={`card-${onboardStep}`}
              initial={{ opacity:0, scale:.93, y:12 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{   opacity:0, scale:.96, y:-6 }}
              transition={{ duration:.25, ease:'easeOut' }}
              onClick={e => e.stopPropagation()} // card click doesn't advance scrim
              style={{
                width: 'min(400px, calc(100vw - 40px))',
                background:'rgba(255,255,255,.99)',
                border:`1px solid rgba(2,195,154,.3)`,
                borderRadius:20,
                padding:'28px 28px 22px',
                boxShadow:`0 0 0 1px rgba(2,195,154,.1),
                           0 32px 80px rgba(15,23,42,.28),
                           0 0 60px rgba(2,128,144,.1)`,
                position:'relative',
              }}>

              {/* Step dots */}
              <div style={{ display:'flex', gap:5, marginBottom:20 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    width: i === onboardStep ? 18 : 6,
                    height:6, borderRadius:3,
                    background: i === onboardStep
                      ? '#02C39A'
                      : 'rgba(15,23,42,.15)',
                    transition:'all .25s ease',
                  }}/>
                ))}
              </div>

              {/* Icon */}
              <div style={{
                width:56, height:56, borderRadius:16,
                background:`rgba(2,195,154,.12)`,
                border:`1px solid rgba(2,195,154,.22)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                marginBottom:16,
              }}>
                <NavIcon name={step.icon} size={26} color={T2}/>
              </div>

              {/* Title */}
              <p style={{ fontSize:18, fontWeight:800, color:'#1a2332', margin:'0 0 10px',
                lineHeight:1.2 }}>
                {step.title}
              </p>

              {/* Body */}
              <p style={{ fontSize:13, color:'rgba(15,23,42,.6)', margin:'0 0 14px',
                lineHeight:1.65 }}>
                {step.body}
              </p>

              {/* Hint pill */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'5px 11px', borderRadius:8,
                background:'rgba(2,195,154,.08)',
                border:'1px solid rgba(2,195,154,.16)',
                marginBottom:22,
              }}>
                <NavIcon name="tip" size={12} color="rgba(2,195,154,.8)"/>
                <span style={{ fontSize:10, color:'rgba(2,195,154,.8)', fontWeight:600 }}>
                  {step.hint}
                </span>
              </div>

              {/* Actions row */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <motion.button
                  whileTap={{ scale:.95 }}
                  onClick={nextOnboardStep}
                  style={{
                    flex:1, padding:'11px 0', borderRadius:11, border:'none',
                    background:`linear-gradient(135deg,${T},${T2})`,
                    color:'#000', fontSize:13, fontWeight:800, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  }}>
                  {onboardStep < 3
                    ? 'Next  →'
                    : <>Start Designing <NavIcon name="designStudio" size={14}/></>}
                </motion.button>
                {onboardStep < 3 && (
                  <button
                    onClick={dismissOnboarding}
                    style={{
                      padding:'11px 14px', borderRadius:11, border:'none',
                      background:'rgba(15,23,42,.06)',
                      color:'rgba(15,23,42,.35)', fontSize:12, cursor:'pointer',
                    }}>
                    Skip
                  </button>
                )}
              </div>

              {/* Step counter */}
              <p style={{ fontSize:9, color:'rgba(15,23,42,.2)', textAlign:'center',
                margin:'10px 0 0', letterSpacing:'.04em' }}>
                {onboardStep + 1} of 4
              </p>
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
