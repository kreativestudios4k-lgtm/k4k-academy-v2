'use client';
import Link from 'next/link';
import {LayoutDashboard,Images,Film,BriefcaseBusiness,Clapperboard,FolderOpen,Coins,UserRound,LifeBuoy,ArrowUpRight} from 'lucide-react';
import './workspace-dashboard.css';

const groups=[
 {label:'WORKSPACE',items:[
  {href:'/k4k-app/dashboard',title:'Dashboard',icon:LayoutDashboard,id:'dashboard'},
  {href:'/k4k-app/image',title:'Image generator',icon:Images,id:'image'},
  {href:'/k4k-app/video',title:'Video generator',icon:Film,id:'video'},
  {href:'/k4k-app/motion',title:'K4K Motion',icon:Clapperboard,id:'motion'},
  {href:'/k4k-app/business',title:'Business Studio',icon:BriefcaseBusiness,id:'business'},
  {href:'/k4k-app/videos',title:'My library',icon:FolderOpen,id:'library'}
 ]},
 {label:'ACCOUNT',items:[
  {href:'/k4k-app/credits',title:'Plans & credits',icon:Coins,id:'credits'},
  {href:'/k4k-app/account',title:'Profile',icon:UserRound,id:'profile'},
  {href:'/k4k-app/support',title:'Help & support',icon:LifeBuoy,id:'support'}
 ]}
];
export default function StudioSidebar({active='dashboard'}){
 return <aside className="k4k-workspace-sidebar" aria-label="K4K APP workspace">
   <div className="k4k-workspace-space"><span className="k4k-workspace-space-icon">✦</span><div><strong>Creative Studio</strong><small>Your personal workspace</small></div></div>
   {groups.map(group=><div key={group.label} className="k4k-workspace-nav" role="navigation" aria-label={group.label}><span className="k4k-workspace-group">{group.label}</span>{group.items.map(item=><Link href={item.href} key={item.id} className={'k4k-workspace-nav-link'+(active===item.id?' active':'')} aria-current={active===item.id?'page':undefined}><item.icon size={17} strokeWidth={1.8}/><span>{item.title}</span></Link>)}</div>)}
   <div className="k4k-workspace-sidebar-bottom"><span className="k4k-workspace-group">CREATE WITH K4K</span><p>Build your next original image or video in one place.</p><Link href="/k4k-app/business">Open Business Studio <ArrowUpRight size={15}/></Link></div>
 </aside>
}
