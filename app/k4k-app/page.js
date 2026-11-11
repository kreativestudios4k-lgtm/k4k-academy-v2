import MobileTemplateFeed from './MobileTemplateFeed';
export const metadata={title:{absolute:'K4K APP — Don’t just scroll. Steal the scene.'},description:'Find your next scene in K4K’s video-first template feed. Explore references, add your characters and create your own version.',openGraph:{title:'K4K APP — Don’t just scroll. Steal the scene.',description:'Your ideas. Your characters. A whole new story.',siteName:'K4K APP'},twitter:{card:'summary_large_image',title:'K4K APP — Create · Swap · Generate',description:'Your ideas. Your characters. A whole new story.'}};
// The live homepage is the template feed. The waitlist landing and its
// release-date banner are no longer shown; the components stay in the
// repository, unused, in case a pre-launch page is needed again.
export default function StudioHome(){return <MobileTemplateFeed/>;}
