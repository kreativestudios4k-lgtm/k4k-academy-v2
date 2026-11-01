export const STUDIO_PACKS = [
 {id:"starter",name:"Starter",pricePence:499,credits:100},
 {id:"creator",name:"Creator",pricePence:1499,credits:350},
 {id:"pro",name:"Pro",pricePence:2999,credits:800},
] as const;
export type StudioPackId=(typeof STUDIO_PACKS)[number]["id"];
export function studioPack(id:string){return STUDIO_PACKS.find(p=>p.id===id)??null;}
