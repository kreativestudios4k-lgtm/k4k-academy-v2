import {NextResponse} from "next/server";
import pending from "../../../../../lib/k4k-motion-new-templates.json";
export const runtime="nodejs";
const featured=[
 {id:"trophy-moment",name:"The Trophy Moment",url:"https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/11e3c0ea-c9d0-495c-acc3-f38e1a360aec.mp4"},
 {id:"viral-performance",name:"The Viral Performance",url:"https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/cab01ca5-c1fe-4d94-88e9-f502d185b5d0.mp4"},
 {id:"ultimate-rivalry",name:"The Ultimate Rivalry",url:"https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/372e3d98-a597-4624-84fc-b548197d37d3.mp4"},
 {id:"cinematic-reveal",name:"The Cinematic Reveal",url:"https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/3a09d792-0270-4c2d-8e20-b7b23c5527c3.mp4"},
 {id:"unexpected-reaction",name:"The Unexpected Reaction",url:"https://d2ol7oe51mr4n9.cloudfront.net/user_3Fzv4wKUSDX4s66inQmCD1u4yFc/091689b9-08e8-49a0-9d66-4c9edc43b7c2.mp4"}
];
export async function GET(){return NextResponse.json({platform:"K4K APP",featured:featured.map(x=>({...x,available:true})),pendingCount:pending.filter(x=>x.status==="awaiting-hosted-source").length,totalFeatured:featured.length},{headers:{"Cache-Control":"no-store"}})}
