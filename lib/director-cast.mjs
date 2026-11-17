export function buildDirectorPrompt({targets,main=0,direction=''}){
 if(!Array.isArray(targets)||targets.length<1||targets.length>8||!Number.isInteger(main)||main<0||main>=targets.length)throw Error('Choose 1–8 characters and a main character.');
 const clean=targets.map(t=>typeof t==='string'?t.replace(/\s+/g,' ').trim():'');
 if(clean.some(t=>t.length<3||t.length>80))throw Error('Describe each source person in 3–80 characters.');
 if(new Set(clean.map(t=>t.toLowerCase())).size!==clean.length)throw Error('Give each source person a different description.');
 if(typeof direction!=='string'||direction.length>500)throw Error('Keep extra direction under 500 characters.');
 return ['CHARACTER ASSIGNMENTS:',...clean.map((t,i)=>`Image ${i+1} replaces only the source person described as: ${t}. Role: ${i===main?'main character':'supporting character'}.`),'Keep each identity attached to its assigned source person throughout every shot. Preserve the reference photo face, hair and clothing. Preserve the source actions, timing, camera and scene. Leave all unassigned people unchanged. Do not merge or duplicate characters.',direction.trim()].filter(Boolean).join('\n');
}
