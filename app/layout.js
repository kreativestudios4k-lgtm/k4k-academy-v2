import './globals.css';
import './idea-studio.css';
import './course-v3.css';
import './account-simple.css';
import './character-swap-studio.css';
import './kx-redesign.css';
export const metadata={
 metadataBase:new URL('https://kreativestudios4k.com'),
 title:{default:'K4K APP | AI Video Studio',template:'%s | K4K APP'},
 description:'Create AI videos, transfer motion and recast your next scene. Your studio, private video library and credits in one place.',
 applicationName:'K4K APP',
 openGraph:{type:'website',siteName:'K4K APP',title:'K4K APP | Your ideas in motion',description:'Your characters. Your scene. Create with K4K APP.'},
 twitter:{card:'summary_large_image',title:'K4K APP | AI Video Studio'}
};
export default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>}
