import LandingExperience from './LandingExperience';
import MobileTemplateFeed from './MobileTemplateFeed';
import './landing.css';

export const metadata={
 title:'K4K APP — Recreate Viral Videos | Creator Studio',
 description:'Explore viral reference scenes, upload your character images and prepare video projects in K4K APP, by KreativeStudios4K.',
};
export default function StudioHome(){
 return <><div className="k4k-mobile-only-feed"><MobileTemplateFeed/></div><div className="k4k-desktop-only-landing"><LandingExperience/></div></>;
}
