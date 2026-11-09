// Shared, deterministic preparation rules; never authorizes provider billing.
export const QUALITY_LEVELS=Object.freeze(['lite','pro','premium']);
export function requiredCharacterCount(template){
 const n=Number(template?.requiredImages);
 return Number.isInteger(n)&&n>=1&&n<=30?n:1;
}
export function validateTemplatePreparation(template,characters,quality){
 const required=requiredCharacterCount(template);
 if(!QUALITY_LEVELS.includes(quality))return {ready:false,reason:'INVALID_QUALITY',required};
 if(!Array.isArray(characters)||characters.length<required)return {ready:false,reason:'MISSING_CHARACTER_SLOTS',required};
 const assigned=characters.slice(0,required);
 if(assigned.some(c=>!c?.photo))return {ready:false,reason:'MISSING_CHARACTER_PHOTO',required};
 if(assigned.some(c=>!c?.target||!Number.isFinite(c.target.x)||!Number.isFinite(c.target.y)||c.target.x<0||c.target.x>100||c.target.y<0||c.target.y>100||!Number.isFinite(c.target.timestamp)||c.target.timestamp<0))return {ready:false,reason:'MISSING_CHARACTER_MAPPING',required};
 return {ready:true,reason:'READY_FOR_VALIDATION',required};
}
