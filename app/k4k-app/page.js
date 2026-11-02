import Link from 'next/link';
import './studio.css';
const items=[
 ['Viral Remix','Character Swap','Put yourself in the scene',1],
 ['Locker Room','Motion Transfer','Keep the original performance',2],
 ['Matchday','Sports Edit','Create your football moment',3],
 ['Street Style','Video Remix','Turn references into a trend',4],
 ['The Reveal','Face & Character','Stay consistent across frames',5],
 ['Big Moment','Cinematic Edit','Make every second count',6],
 ['Final Whistle','Sports Motion','Your story, your movement',7]
];
export const metadata={title:'K4K APP — Create Viral AI Videos',description:'Discover viral AI video templates and create your own with K4K APP.'};
export default function StudioHome(){return <main className="k4k-market"><header className="market-nav"><Link href="/" className="market-logo">K4K<span> APP</span></Link><nav><a href="#trending">Templates</a><Link href="/create">Create video</Link><Link href="/academy">My videos</Link></nav><Link className="market-login" href="/academy">Sign in / Account ↗</Link></header>
<section className="market-hero"><span className="market-kicker">AI VIDEO CREATION, MADE SIMPLE</span><h1>Recreate the videos<br/><em>everyone is watching.</em></h1><p>Pick a viral template, add your own characters and bring your idea to life. No complicated editing.</p><Link className="market-cta" href="#trending">Explore viral templates <span>↗</span></Link></section>
<section id="trending" className="market-section"><div className="market-section-head"><div><span className="market-kicker">DISCOVER YOUR NEXT VIRAL</span><h2>Trending now <span>✦</span></h2></div><Link href="/create">Create from scratch ↗</Link></div>
<div className="market-grid">{items.map(([name,kind,description,num])=><Link href="/create" className="market-tile" key={num}><div className={'market-video market-video-'+num}><video autoPlay muted loop playsInline preload="none" poster={'/videos/viral-'+num+'.jpg'}><source src={'/videos/viral-'+num+'.mp4'} type="video/mp4"/></video><span className="market-play">▶</span><span className="market-tag">TEMPLATE · {kind}</span></div><div className="market-tile-caption"><div><strong>{name}</strong><small>{description}</small></div><span>↗</span></div></Link>)}</div>
<p className="market-note">Preview videos are being prepared for publication. Templates open the creator workspace. Video generation requires a validated provider integration.</p></section>
<section className="market-how"><span className="market-kicker">CREATE WITHOUT THE COMPLEXITY</span><h2>Your idea. Your face.<br/><em>Your viral moment.</em></h2><div className="market-steps"><div><b>01</b><h3>Choose a template</h3><p>Find a scene or motion you love.</p></div><div><b>02</b><h3>Add your references</h3><p>Bring your character or image.</p></div><div><b>03</b><h3>Start creating</h3><p>Use the K4K Studio workflow.</p></div></div><Link className="market-cta" href="/create">Open K4K Studio ↗</Link></section>
<footer className="market-footer"><strong>K4K APP</strong><span>Made for the next generation of creators.</span><Link href="/academy">Existing students → Academy</Link></footer></main>}
