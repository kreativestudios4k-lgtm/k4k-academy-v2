'use client';
import PreviewShell from '../PreviewShell';
import MotionLibrary from '../higgsfield-preview/customer-generation';
import VideoLibrary from '../VideoLibrary';
import CreativeLibrary from '../CreativeLibrary';
import '../creator/creator.css';
export default function Videos(){return <PreviewShell active="Videos" studio><div style={{maxWidth:1350,margin:'0 auto',padding:'10px 12px 40px'}}><CreativeLibrary/><VideoLibrary/><section style={{background:"#111b16",padding:24,borderRadius:16,marginTop:24,color:"#edf7ed"}}><MotionLibrary customer libraryOnly/></section></div></PreviewShell>}
