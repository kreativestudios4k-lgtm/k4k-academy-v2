import Link from 'next/link';

const navStyle = {
 display: 'flex',
 gap: '1.25rem',
 flexWrap: 'wrap',
 padding: '0.75rem 1.5rem',
 borderBottom: '1px solid rgba(255,255,255,0.12)',
 fontSize: '0.9rem',
 letterSpacing: '0.04em'
};

export default function AcademyLayout({children}) {
 return (
  <>
   <nav aria-label="Member area" style={navStyle}>
    <Link href="/academy">ACADEMY</Link>
    <Link href="/academy/updates">UPDATES</Link>
   </nav>
   {children}
  </>
 );
}
