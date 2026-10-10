import './globals.css';
export const metadata={
 metadataBase:new URL('https://kreativestudios4k.com'),
 title:{default:'K4K Academy | AI Video Creation Workflows',template:'%s | K4K Academy'},
 description:'Learn realistic AI character swaps, video recreation and Higgsfield Genjutsu workflows with practical tutorials and copy-ready prompts. K4K Academy membership from £7.99/month.',
 applicationName:'K4K Academy',
 keywords:['K4K Academy','KreativeStudios4K','AI video','character swap','Higgsfield Genjutsu','AI creator tutorials','video motion transfer'],
 alternates:{canonical:'/'},
 openGraph:{type:'website',url:'https://kreativestudios4k.com',siteName:'K4K Academy',title:'K4K Academy | Learn the AI Video Method',description:'Real AI video examples, copy-ready prompts and private step-by-step creator workflows.'},
 twitter:{card:'summary',title:'K4K Academy | AI Creator Workflows',description:'Learn the method behind realistic AI video recreations.'}
};
export default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>}