import {redirect} from 'next/navigation';
const oldToNew={
 'truth-behind-ai':'reality-engine',
 'first-ai-video':'reality-engine',
 'ai-creator-toolkit':'prompt-control',
 'build-ai-video-from-scratch':'scene-transfer',
 'signature-k4k-method':'wardrobe-lock',
 'professional-ai-creator':'final-quality-gate'
};
export default async function OldTopic({params}){const {slug}=await params;redirect('/academy/lessons/'+(oldToNew[slug]||'reality-engine'));}
