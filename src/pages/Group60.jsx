// src/pages/Group60.jsx — Group 60 (capstone researchers/developers), separate from VFRB Enterprise's own Team page. Photos+CVs shown only for members who provided one (Araos/Espeja have none yet).
// CV data copied verbatim from real uploaded CVs; phone/address intentionally excluded from this public route.
import { useEffect, useRef, useState } from 'react';
import SitePage from '../components/site/SitePage';
import { PlainHead, Journey } from '../components/site/parts';
import Reveal from '../components/landing/Reveal';
import photoAraos from '../assets/team/araos.jpg';
import photoEspeja from '../assets/team/espeja.jpg';
import photoLlanto from '../assets/team/llanto.jpg';
import photoOgayon from '../assets/team/ogayon.jpg';

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

function Block({ title, children }) {
  return <><h3>{title}</h3>{children}</>;
}

function CVDialog({ member, onClose }) {
  const cv = member.cv;
  const box = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    document.body.style.overflow = 'hidden';
    box.current?.querySelector('.vs-cv__close')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = box.current.querySelectorAll('button, a[href]');
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="vs vs-cvwrap" onClick={onClose}>
      <div className="vs-cv" role="dialog" aria-modal="true" aria-labelledby="cv-name" ref={box} onClick={e => e.stopPropagation()}>
        <div className="vs-cv__top">
          <img src={member.photo} alt="" />
          <div><h2 id="cv-name">{member.name}</h2><p>{cv.contact.email}</p></div>
          <button type="button" className="vs-cv__close" onClick={onClose} aria-label="Close CV">×</button>
        </div>
        {cv.objective && <Block title="Objective"><p>{cv.objective}</p></Block>}
        {cv.skills?.length > 0 && <Block title="Skills"><ul className="vs-chips">{cv.skills.map(s => <li key={s}>{s}</li>)}</ul></Block>}
        {cv.qualifications?.length > 0 && <Block title="Qualifications"><ul>{cv.qualifications.map(q => <li key={q}>{q}</li>)}</ul></Block>}
        {cv.projects?.length > 0 && (
          <Block title="Projects">
            {cv.projects.map(p => (
              <div key={p.title} className="vs-cv__item">
                <p><strong>{p.title}</strong></p>
                <small>{p.subtitle}</small>
                <p>{p.desc}</p>
                <small>{p.tech}</small>
              </div>
            ))}
          </Block>
        )}
        {cv.experience?.length > 0 && (
          <Block title="Experience">
            {cv.experience.map(e => <p key={e.company}><strong>{e.role}</strong>, {e.company} ({e.period})</p>)}
          </Block>
        )}
        {cv.education?.length > 0 && (
          <Block title="Education">
            {cv.education.map(ed => <p key={ed.school + ed.period}><strong>{ed.school}</strong>, {ed.program} ({ed.period})</p>)}
          </Block>
        )}
        {cv.certifications?.length > 0 && <Block title="Certifications and seminars"><ul>{cv.certifications.map(c => <li key={c}>{c}</li>)}</ul></Block>}
      </div>
    </div>
  );
}

export default function Group60() {
  const [open, setOpen] = useState(null);
  return (
    <SitePage title="Group 60">
      <PlainHead kicker="Group 60" title="The researchers behind this system."
        lede="Group 60 developed VFRB Enterprise's AI-Enabled Sales and Inventory Management System with Raw Materials Recommendation as a capstone project at City College of Calamba (CCC BSIT 2026). The researchers are separate from VFRB Enterprise, the company this system was built for." />
      <section className="vs-sec" aria-label="Group 60 members">
        <div className="vs-wrap">
          <Reveal className="vs-g60">
            {TEAM.map(m => {
              const inner = (<><img src={m.photo} alt="" width="104" height="104" loading="lazy" /><b>{m.name}</b>{m.cv && <em>View CV</em>}</>);
              return m.cv
                ? <button key={m.name} type="button" className="vs-member" onClick={() => setOpen(m)} aria-haspopup="dialog">{inner}</button>
                : <div key={m.name} className="vs-member">{inner}</div>;
            })}
          </Reveal>
        </div>
      </section>
      <Journey current="/group-60" />
      {open && <CVDialog member={open} onClose={() => setOpen(null)} />}
    </SitePage>
  );
}
