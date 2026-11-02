import Link from 'next/link';
import VideoPreview from './VideoPreview';
import './studio.css';

const items=[
 ['Squad anthem','Music','Multiple performers',0],
 ['The arrival','Comedy','Lead character entrance',1],
 ['Touchline energy','Sports','Coach reaction',2],
 ['Celebration crew','Music','Group performance',3],
 ['Money spread','Comedy','Prop-driven scene',4],
 ['The boss','Comedy','Main character reveal',5],
 ['Press room','Sports','Interview moment',6],
 ['Metro entrance','Comedy','Street entrance',7],
 ['The group call','Comedy','Multi-character scene',8],
 ['Training ground','Sports','Training sequence',9]
];
const steps=[
 ['01','Find the movement','Start with one of our prepared reference clips, or use your own.'],
 ['02','Cast your character','Add a reference portrait or a set of character images.'],
 ['03','Direct the details','Choose a motion model and describe the wardrobe, action and setting.'],
 ['04','Review your creation','Check the reference and instructions before a future generation request.']
];
const faqs=[
 ['Can I use one of the example videos?','Yes. Open a K4K template and its motion reference loads into the Character Swap workspace automatically.'],
 ['Do I need to upload the video twice?','No. When you choose a template from our library, its reference is already selected.'],
 ['Can I start without a template?','Yes. Our separate Text to Video, Image to Video and Character Swap workspaces let you start with your own concept.'],
 ['Does the free beta produce a finished AI video?','Not yet. The current preview checks the creation flow without spending credits or making billable provider requests.'],
 ['How will credits work?','The proposed new K4K APP plan is £9.99 per month with 100 credits. Actual per-generation charges and paid checkout will activate only after provider prices, reservations and billing safeguards are verified. Existing Academy plans stay unchanged.']
];
export const metadata={title:'K4K APP — The creator-first AI video studio',description:'Explore K4K viral reference templates, create characters and plan motion-matched AI video remixes in a free preview studio.'};
export default function StudioHome(){
 return <main className="k4k-market">
  <header className="market-nav">
   <Link href="/" className="market-logo" aria-label="K4K APP homepage">K4K<span> APP</span><i>✳</i></Link>
   <nav aria-label="Main navigation"><Link href="#examples">Discover</Link><Link href="#workflow">How it works</Link><Link href="/templates">All templates</Link><Link href="/characters">Characters</Link><Link href="/create">Studio</Link></nav>
   <Link className="market-login" href="/academy">My account <span>↗</span></Link>
  </header>
  <section className="market-hero" aria-labelledby="market-title">
   <div className="market-hero-copy">
    <span className="market-kicker"><span className="market-dot"/> THE NEXT GENERATION OF REMIXES</span>
    <h1 id="market-title">One viral scene.<br/><em>Endless new characters.</em></h1>
    <p>Discover a movement you love. Cast your own characters. Reimagine the moment with K4K’s character-first AI video workflow.</p>
    <div className="market-hero-actions"><Link className="market-cta" href="/templates">Explore the template vault <span>↗</span></Link><Link className="market-outline" href="/create">Start from scratch</Link></div>
    <div className="market-hero-proof"><span>10 motion-ready references</span><span>3 separate creator modes</span><span>£0 preview simulation</span></div>
   </div>
   <div className="market-hero-visual" aria-label="K4K creator video previews">
    <div className="market-hero-halo"/>
    <div className="market-hero-sidecard market-hero-sidecard-a"><img src="/videos/template-3.webp" alt="Celebration crew motion reference" loading="lazy"/></div>
    <div className="market-hero-feature"><VideoPreview index={2} title="Touchline energy reference"/><div className="market-feature-label"><span>FEATURED MOTION</span><strong>Touchline energy</strong></div></div>
    <div className="market-hero-sidecard market-hero-sidecard-b"><img src="/videos/template-1.webp" alt="The arrival motion reference" loading="lazy"/></div>
    <Link href="/create?template=2" className="market-feature-action">Remix this scene <span>↗</span></Link>
   </div>
  </section>
  <section className="market-mode-strip" aria-label="Creator modes">
   <Link href="/create"><span className="market-mode-glyph">T</span><span><strong>Text to Video</strong><small>Describe the story</small></span><b>↗</b></Link>
   <Link href="/create"><span className="market-mode-glyph">I</span><span><strong>Image to Video</strong><small>Animate a still image</small></span><b>↗</b></Link>
   <Link href="/templates"><span className="market-mode-glyph">M</span><span><strong>Character Swap</strong><small>Keep the motion, change the cast</small></span><b>↗</b></Link>
  </section>
  <section id="examples" className="market-section">
   <div className="market-section-head"><div><span className="market-kicker">THE K4K TEMPLATE VAULT</span><h2>Find your next <em>viral moment.</em></h2><p>Reference video included. Tap any scene and bring your own cast.</p></div><Link href="/templates">Browse all templates ↗</Link></div>
   <div className="market-grid">{items.map(([name,kind,description,num])=><article className="market-tile" key={num}>
    <div className="market-video market-video-grid"><VideoPreview index={num} title={name}/><span className="market-tag">{kind} / MOTION REFERENCE</span></div>
    <div className="market-tile-caption"><div><strong>{name}</strong><small>{description}</small></div><span>↗</span></div>
    <Link className="market-use" href={`/create?template=${num}`}>Use this reference <span>↗</span></Link>
   </article>)}</div>
   <p className="market-note">These are K4K’s existing example assets, not clips copied from another website. Real AI generation remains disabled in this preview.</p>
  </section>
  <section className="market-reimagine">
   <div className="market-section-head"><div><span className="market-kicker">THE K4K DIFFERENCE</span><h2>Keep the energy.<br/><em>Change the story.</em></h2></div></div>
   <div className="market-compare">
    <div className="market-compare-media"><div className="market-compare-image"><img src="/videos/template-6.webp" alt="Existing K4K press-room reference video poster" loading="lazy"/><span>01 / ORIGINAL MOTION</span></div><div className="market-compare-arrow">→</div><div className="market-compare-target"><span>02 / YOUR VERSION</span><strong>Your character<br/>goes here.</strong><small>Choose a reference portrait and plan the swap in the studio.</small><Link href="/create?template=6">Open this reference ↗</Link></div></div>
    <div className="market-compare-copy"><p className="market-kicker">MOTION-FIRST STORYTELLING</p><h3>A remix that starts with the movement.</h3><p>Start with timing and camera action, then personalise the character and visual direction. Your reference stays loaded as you configure the scene.</p><div className="market-pill-group"><span>Reference video</span><span>Character photos</span><span>Motion direction</span><span>Wardrobe notes</span></div><small>Preview only — the right-hand panel is a workflow illustration, not an AI-generated result.</small></div>
   </div>
  </section>
  <section id="workflow" className="market-how"><div className="market-how-top"><div><span className="market-kicker">FOUR STEPS. ONE CREATIVE FLOW.</span><h2>From trending clip<br/>to <em>your own concept.</em></h2></div><p>A guided workspace with clear references, no unnecessary re-uploads, and a separate mode for each type of creation.</p></div><div className="market-steps">{steps.map(([number,title,desc])=><div key={number}><b>{number}</b><h3>{title}</h3><p>{desc}</p></div>)}</div><Link className="market-cta" href="/create">Open K4K Studio <span>↗</span></Link></section>
  <section className="market-character"><div className="market-character-heading"><span className="market-kicker">YOUR CAST, YOUR WORLD</span><h2>Give every character <em>a signature look.</em></h2><p>Reference images guide the identity, styling and tone of the scene. Build around faces, outfits and moments that belong to you.</p><Link href="/characters">Design a viral character ↗</Link></div><div className="market-character-grid"><div><img src="/prompts/03-orange-teal-portrait.webp" alt="K4K portrait styling example" loading="lazy"/><span>PORTRAIT / IDENTITY</span></div><div><img src="/prompts/05-football-locker.webp" alt="K4K football wardrobe styling example" loading="lazy"/><span>WARDROBE / STYLE</span></div><div><img src="/prompts/06-football-motion.webp" alt="K4K football action styling example" loading="lazy"/><span>ACTION / MOTION</span></div></div></section>
  <section className="market-faq"><span className="market-kicker">BEFORE YOU START</span><h2>Good questions. <em>Clear answers.</em></h2><div>{faqs.map(([question,answer])=><details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
  <section className="market-last"><span className="market-kicker">READY TO CREATE?</span><h2>Turn the next trend into<br/><em>your next story.</em></h2><p>Browse a reference or start with your own idea. No generation fees in the preview simulation.</p><div><Link className="market-cta" href="/templates">Pick a template <span>↗</span></Link><Link className="market-outline" href="/create">Open Studio</Link></div></section>
  <footer className="market-footer"><strong>K4K APP</strong><span>Original creator tools by Kreative Studios4K. Use only content you have permission to use.</span><div><Link href="/academy">My Academy</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div></footer>
 </main>;
}