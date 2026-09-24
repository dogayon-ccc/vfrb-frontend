// src/pages/Team.jsx — Our Team. Photos+CVs shown only for members who provided one (Araos/Espeja have none yet).
// CV data copied verbatim from real uploaded CVs; phone/address intentionally excluded from this public route.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MarketingNav from '../components/MarketingNav';
import Footer from '../components/Footer';
import photoAraos from '../assets/team/araos.jpg';
import photoEspeja from '../assets/team/espeja.jpg';
import photoLlanto from '../assets/team/llanto.jpg';
import photoOgayon from '../assets/team/ogayon.jpg';

const T = { teal: 'var(--teal)', accent: 'var(--teal-2)', dark: 'var(--bg-surface)' };

const TEAM = [
  { name: 'Araos, Alvin II B.', photo: photoAraos },
  { name: 'Espeja, Riemar D.', photo: photoEspeja },
  {
    name: 'Llanto, John Christian C.', photo: photoLlanto,
    cv: {
      contact: { email: 'llantojohnchristian1119@gmail.com' },
      objective: 'Motivated fourth-year BSIT student at City College of Calamba (CCC) seeking an On-the-Job Training (OJT) opportunity to apply technical knowledge, enhance practical skills, and gain valuable industry experience while contributing to organizational goals.',
      skills: ['Basic Computer Hardware Assembly and Troubleshooting', 'PC Assembly', 'PC Disassembly', 'Hardware Installation'],
      qualifications: ['Detail oriented and adaptable to new technologies', 'Strong analytical and problem-solving skills', 'Able to work independently or in a team environment', 'Committed to professionalism and workplace ethics', 'Good communication skills'],
      education: [
        { school: 'City College of Calamba', program: 'Bachelor of Science in Information Technology', period: 'Currently Studying' },
        { school: 'Calamba Integrated School', program: 'Senior High School', period: '2017–2019' },
        { school: 'Calamba Integrated School', program: 'Junior High School', period: '2013–2017' },
        { school: 'Calamba Elementary School', program: 'Elementary', period: '2007–2013' },
      ],
      experience: [{ company: 'Jollibee', role: 'Service Crew', period: 'June 2, 2023 – February 2, 2026' }],
    },
  },
  {
    name: 'Ogayon, Dave Laurence S.', photo: photoOgayon,
    cv: {
      contact: { email: 'dsogayon@ccc.edu.ph' },
      objective: 'Fourth-year BSIT student at City College of Calamba applying for an IT internship. Has completed coursework in web development, software engineering, and database management, and is currently finishing a capstone project. Eager to apply classroom knowledge in a real workplace setting and learn from industry professionals.',
      skills: ['HTML', 'CSS', 'Responsive Web Design', 'Basic JavaScript', 'Figma (UI/UX)', 'Basic C, Java, C++', 'Microsoft Office Suite', 'Basic Networking (TCP/IP, DNS, DHCP)', 'Technical Documentation'],
      projects: [
        { title: 'VFRB Enterprise – AI-Enabled Sales & Inventory System', subtitle: 'Capstone Project · AY 2026–2027', desc: 'Team-developed system featuring AI-assisted sales and inventory management with an interactive garment design studio. Team: Araos, Espeja, Llanto, Ogayon.', tech: 'React, Laravel, Figma, MySQL' },
        { title: 'Inventory Management System – Janstro Prime Renewable Energy Solutions Corp.', subtitle: 'Software Engineering 2 (IT 301) · Group 89 · AY 2025–2026', desc: 'Developed and documented a web-based inventory management system for product tracking and stock monitoring. Completed all documentation and revision cycles for final submission.', tech: 'HTML, CSS, JavaScript, PHP, MySQL' },
      ],
      education: [
        { school: 'City College of Calamba', program: 'Bachelor of Science in Information Technology', period: '2023 – Present' },
        { school: 'University of Perpetual Help System DALTA Calamba', program: 'Senior High School · STEM Strand', period: '2021 – 2023' },
        { school: 'Palo Alto Integrated School', program: 'Junior High School', period: '2017 – 2021' },
        { school: 'Holy Redeemer School of Calamba', program: 'Elementary · With Honors, Loyalty Award', period: '2011 – 2017' },
      ],
      certifications: [
        'freeCodeCamp — Responsive Web Design Developer Certification (Dec 7, 2024, ~300 hrs)',
        'Wadhwani Foundation — Employability Skills: JobReady, Certificate of Completion (Nov 19, 2024)',
        'FIGMAgination — Figma Workshop & Seminar, CCC-ITS (Nov 14, 2025)',
        'ITS General Assembly 2025 — "Empowering Innovation, Driving the Future," CCC (Aug 30, 2025)',
        'Flowcharting 101: Basics of Designing a Flowchart, CCC Dept. of Computing and Informatics (Oct 21, 2023)',
      ],
    },
  },
];

function Pill({ children }) {
  return (
    <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 99, fontSize: 12, margin: '0 6px 6px 0',
      background: 'rgba(2,195,154,0.08)', border: '1px solid rgba(2,195,154,0.25)', color: T.accent }}>
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <p style={{ color: T.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</p>
      {children}
    </div>
  );
}

function CVModal({ member, onClose }) {
  const cv = member.cv;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(640px,100%)', background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.1)',
          borderRadius: 18, padding: '32px 30px 28px', fontFamily: 'var(--font)', color: 'var(--ink)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.25)' }}>
        <button onClick={onClose} style={{ float: 'right', background: 'rgba(15,23,42,0.08)', border: 'none',
          color: 'rgba(15,23,42,0.7)', width: 30, height: 30, borderRadius: 9, cursor: 'pointer', fontSize: 14 }}>✕</button>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <img src={member.photo} alt={member.name} style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(2,195,154,0.35)' }}/>
          <div>
            <h2 style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 21, margin: 0 }}>{member.name}</h2>
            <p style={{ color: 'rgba(15,23,42,0.45)', fontSize: 12.5, marginTop: 4, lineHeight: 1.6 }}>
              {cv.contact.email}
            </p>
          </div>
        </div>

        {cv.objective && (
          <Section title="Objective">
            <p style={{ color: 'rgba(15,23,42,0.65)', fontSize: 13.5, lineHeight: 1.7 }}>{cv.objective}</p>
          </Section>
        )}

        {cv.skills?.length > 0 && (
          <Section title="Skills"><div>{cv.skills.map(s => <Pill key={s}>{s}</Pill>)}</div></Section>
        )}

        {cv.qualifications?.length > 0 && (
          <Section title="Qualifications">
            <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(15,23,42,0.65)', fontSize: 13.5, lineHeight: 1.9 }}>
              {cv.qualifications.map(q => <li key={q}>{q}</li>)}
            </ul>
          </Section>
        )}

        {cv.projects?.length > 0 && (
          <Section title="Projects">
            {cv.projects.map(p => (
              <div key={p.title} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{p.title}</p>
                <p style={{ color: T.accent, fontSize: 11.5, margin: '2px 0 6px' }}>{p.subtitle}</p>
                <p style={{ color: 'rgba(15,23,42,0.6)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
                <p style={{ color: 'rgba(15,23,42,0.35)', fontSize: 11.5, marginTop: 6 }}>{p.tech}</p>
              </div>
            ))}
          </Section>
        )}

        {cv.experience?.length > 0 && (
          <Section title="Experience">
            {cv.experience.map(e => (
              <p key={e.company} style={{ color: 'rgba(15,23,42,0.65)', fontSize: 13.5, lineHeight: 1.8, margin: 0 }}>
                <strong style={{ color: 'var(--ink)' }}>{e.role}</strong> — {e.company} <span style={{ color: 'rgba(15,23,42,0.4)' }}>({e.period})</span>
              </p>
            ))}
          </Section>
        )}

        {cv.education?.length > 0 && (
          <Section title="Education">
            {cv.education.map(ed => (
              <p key={ed.school + ed.period} style={{ color: 'rgba(15,23,42,0.65)', fontSize: 13.5, lineHeight: 1.8, margin: 0 }}>
                <strong style={{ color: 'var(--ink)' }}>{ed.school}</strong> — {ed.program} <span style={{ color: 'rgba(15,23,42,0.4)' }}>({ed.period})</span>
              </p>
            ))}
          </Section>
        )}

        {cv.certifications?.length > 0 && (
          <Section title="Certifications & Seminars">
            <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(15,23,42,0.65)', fontSize: 13, lineHeight: 1.9 }}>
              {cv.certifications.map(c => <li key={c}>{c}</li>)}
            </ul>
          </Section>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Team() {
  const [openMember, setOpenMember] = useState(null);

  return (
    <div style={{ fontFamily: 'var(--font)', background: T.dark, color: 'var(--ink)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;} body{margin:0;background:${T.dark};}
        .team-wrap { padding:48px 18px 32px; }
        @media (min-width:441px) { .team-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (min-width:640px) { .team-wrap { padding:64px 24px 40px; } }
        @media (min-width:721px) { .team-grid { grid-template-columns: repeat(4,1fr) !important; } }
      `}</style>

      <MarketingNav/>

      <div className="team-wrap" style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Our Team</p>
          <h1 style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 'clamp(28px,4vw,40px)', marginBottom: 14, lineHeight: 1.15 }}>
            The people behind this system
          </h1>
          <p style={{ color: 'rgba(15,23,42,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            VFRB Enterprise's AI-Enabled Sales and Inventory Management System with Raw Materials
            Recommendation is a capstone project by BSIT students at City College of Calamba (CCC BSIT 2026).
          </p>
        </motion.div>

        <div className="team-grid" style={{ marginTop: 44, display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
          {TEAM.map((m, i) => (
            <motion.button key={m.name} onClick={() => m.cv && setOpenMember(m)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={m.cv ? { y: -4 } : {}}
              style={{ padding: '22px 18px 18px', borderRadius: 16, background: 'rgba(15,23,42,0.04)',
                border: '1px solid rgba(15,23,42,0.09)', cursor: m.cv ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                fontFamily: 'inherit', transition: 'border-color .2s' }}
              onMouseEnter={e => { if (m.cv) e.currentTarget.style.borderColor = 'rgba(2,195,154,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.09)'; }}>
              <img src={m.photo} alt={m.name} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(2,195,154,0.35)' }}/>
              <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, margin: 0 }}>{m.name}</p>
              {m.cv && <span style={{ color: T.accent, fontSize: 11.5, fontWeight: 600 }}>View CV →</span>}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openMember && <CVModal member={openMember} onClose={() => setOpenMember(null)}/>}
      </AnimatePresence>

      <Footer light/>
    </div>
  );
}
