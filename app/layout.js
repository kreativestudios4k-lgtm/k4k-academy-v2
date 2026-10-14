import './globals.css';
import './idea-studio.css';
export const metadata={
 metadataBase:new URL('https://kreativestudios4k.com'),
 title:{default:'K4K Academy | The IDEA Method for AI Video',template:'%s | K4K Academy'},
 description:'Learn K4K IDEA: Investigate, Direct, Execute, Audit. Structured AI video education with honest production notes, tested prompt systems and practical quality checks. Monthly membership £7.99.',
 applicationName:'K4K Academy',
 keywords:['K4K Academy','KreativeStudios4K','IDEA method','AI video education','AI creative direction','character continuity','video production training'],
 openGraph:{type:'website',url:'https://kreativestudios4k.com',siteName:'K4K Academy',title:'K4K Academy | The IDEA Production Method',description:'Practical AI video production education: clear briefs, consistent characters, test logs, prompt systems and quality checks.'},
 twitter:{card:'summary',title:'K4K Academy | Make Better AI Video',description:'Investigate, Direct, Execute and Audit. Learn production skills without promises of viral results.'}
};
export default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>}