// src/components/landing/GarmentHologram.jsx — animated hero SVG, split out of Landing.jsx (was 829 lines).
import { motion } from 'framer-motion';

export default function GarmentHologram() {
  return (
    <div style={{ position:'relative', width:'100%', maxWidth:360, margin:'0 auto' }}>
      <motion.div animate={{ opacity:[0.2,0.45,0.2], scale:[1,1.06,1] }}
        transition={{ duration:5, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', inset:-32, borderRadius:'50%',
          background:'radial-gradient(ellipse,rgba(2,195,154,0.2),transparent 70%)',
          filter:'blur(24px)', pointerEvents:'none' }}/>
      <svg viewBox="0 0 340 420" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width:'100%', filter:'drop-shadow(0 0 20px rgba(2,195,154,0.22))' }}>
        <defs>
          <pattern id="g" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(2,195,154,0.07)" strokeWidth="0.5"/>
          </pattern>
          <linearGradient id="fab" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(2,128,144,0.28)"/>
            <stop offset="100%" stopColor="rgba(2,195,154,0.07)"/>
          </linearGradient>
          <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)"/>
            <stop offset="100%" stopColor="rgba(2,195,154,0.04)"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="340" height="420" fill="url(#g)" rx="4"/>
        <motion.path d="M100 80L60 110L40 200L40 340L300 340L300 200L280 110L240 80Z"
          fill="url(#fab)" stroke="rgba(2,195,154,0.55)" strokeWidth="1.5"
          initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
          transition={{ duration:2, ease:'easeOut' }}/>
        <path d="M100 80L60 110L40 200L40 340L300 340L300 200L280 110L240 80Z" fill="url(#sh)"/>
        <motion.path d="M100 80L170 150L240 80" fill="none"
          stroke="rgba(2,195,154,0.9)" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength:0 }} animate={{ pathLength:1 }}
          transition={{ duration:1.2, delay:0.5 }} filter="url(#glow)"/>
        <motion.path d="M60 110L18 185L18 230L52 230L62 175L72 155"
          fill="rgba(2,128,144,0.14)" stroke="rgba(2,195,154,0.5)" strokeWidth="1.5"
          initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
          transition={{ duration:1.2, delay:1 }}/>
        <motion.path d="M280 110L322 185L322 230L288 230L278 175L268 155"
          fill="rgba(2,128,144,0.14)" stroke="rgba(2,195,154,0.5)" strokeWidth="1.5"
          initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
          transition={{ duration:1.2, delay:1.1 }}/>
        <motion.line x1="18" y1="226" x2="52" y2="226" stroke="rgba(2,195,154,0.8)" strokeWidth="2"
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:1.8 }}/>
        <motion.line x1="288" y1="226" x2="322" y2="226" stroke="rgba(2,195,154,0.8)" strokeWidth="2"
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:1.9 }}/>
        <motion.rect x="85" y="165" width="60" height="44" rx="4"
          fill="rgba(2,128,144,0.1)" stroke="rgba(2,195,154,0.65)" strokeWidth="1.5"
          initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:1.8, duration:0.5 }}/>
        <motion.circle cx="195" cy="185" r="18" fill="rgba(2,195,154,0.07)"
          stroke="rgba(2,195,154,0.55)" strokeWidth="1.5" strokeDasharray="3 2"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.1 }}/>
        <motion.text x="195" y="190" textAnchor="middle"
          fill="rgba(2,195,154,0.65)" fontSize="8" fontFamily="monospace" fontWeight="bold"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.3 }}>LOGO</motion.text>
        <motion.line x1="40" y1="335" x2="300" y2="335"
          stroke="rgba(2,195,154,0.55)" strokeWidth="2"
          initial={{ scaleX:0 }} animate={{ scaleX:1 }}
          transition={{ delay:1.3, duration:0.8 }} style={{ transformOrigin:'170px 335px' }}/>
        <motion.rect x="38" y="0" width="264" height="2" rx="1"
          fill="rgba(2,195,154,0.35)"
          animate={{ y:[80,338,80] }} transition={{ duration:4, repeat:Infinity, ease:'linear', delay:2.5 }}
          style={{ filter:'blur(1px)' }}/>
        {['M15,40 L15,15 L40,15','M300,15 L325,15 L325,40','M15,380 L15,405 L40,405','M300,405 L325,405 L325,380'].map((d,i)=>(
          <motion.path key={i} d={d} fill="none" stroke="rgba(2,195,154,0.5)" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:0.5, delay:0.1+i*0.1 }}/>
        ))}
        <motion.g initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.4 }}>
          <line x1="40" y1="358" x2="300" y2="358" stroke="rgba(255,200,0,0.35)" strokeWidth="1" strokeDasharray="3 3"/>
          <line x1="40" y1="354" x2="40" y2="362" stroke="rgba(255,200,0,0.45)" strokeWidth="1.5"/>
          <line x1="300" y1="354" x2="300" y2="362" stroke="rgba(255,200,0,0.45)" strokeWidth="1.5"/>
          <text x="170" y="372" textAnchor="middle" fill="rgba(255,200,0,0.45)" fontSize="8" fontFamily="monospace">96 cm — VFRB Proprietary M baseline</text>
        </motion.g>
        <motion.g initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.8 }}>
          <rect x="108" y="390" width="124" height="18" rx="9" fill="rgba(2,128,144,0.28)" stroke="rgba(2,195,154,0.4)" strokeWidth="1"/>
          <text x="170" y="402" textAnchor="middle" fill="rgba(2,195,154,0.9)" fontSize="7.5" fontFamily="monospace" letterSpacing="1">AI RECOMMENDATION</text>
        </motion.g>
      </svg>
    </div>
  );
}
