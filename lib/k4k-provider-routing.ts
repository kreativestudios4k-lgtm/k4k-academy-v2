export type K4KFeature="motion-transfer"|"character-swap"|"object-swap"|"image-to-video";
export type ProviderRoute={feature:K4KFeature;provider:string;model:string;status:"candidate"|"private-pilot"|"unavailable";supportsReferenceVideo:boolean;supportsCharacterImages:boolean;estimatedCostUsd:null;requiresApproval:true;notes:string};
export const K4K_ROUTES:ReadonlyArray<ProviderRoute>=[
 {feature:"motion-transfer",provider:"unassigned",model:"unverified",status:"candidate",supportsReferenceVideo:false,supportsCharacterImages:false,estimatedCostUsd:null,requiresApproval:true,notes:"Verify reference-video-driven motion and camera preservation before selecting a provider."},
 {feature:"character-swap",provider:"unassigned",model:"unverified",status:"unavailable",supportsReferenceVideo:false,supportsCharacterImages:false,estimatedCostUsd:null,requiresApproval:true,notes:"Identity and full-body consistency tests required."},
 {feature:"object-swap",provider:"unassigned",model:"unverified",status:"unavailable",supportsReferenceVideo:false,supportsCharacterImages:false,estimatedCostUsd:null,requiresApproval:true,notes:"Object masking, temporal tracking and editing model required."},
 {feature:"image-to-video",provider:"Higgsfield",model:"bytedance/seedance-2.5/image-to-video",status:"private-pilot",supportsReferenceVideo:false,supportsCharacterImages:true,estimatedCostUsd:null,requiresApproval:true,notes:"Existing separate allowlisted pilot only. Not enabled for public K4K APP generation."}
];
export function getRoute(feature:string){return K4K_ROUTES.find(x=>x.feature===feature)||null}
