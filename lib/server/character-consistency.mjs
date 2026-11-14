// The provider uses Image n and Video n, separately indexed by upload order.
// Keep the user's creative direction, but always send explicit identity rules.
export const CHARACTER_CONSISTENCY_VERSION='k4k-character-lock-v1';
export function buildCharacterConsistencyPrompt(prompt,count){
 if(typeof prompt!=='string'||prompt.length>1200||!Number.isInteger(count)||count<1||count>8)throw Error('INVALID_PROVIDER_INPUT');
 const ids=Array.from({length:count},(_,i)=>'Image '+(i+1));
 const direction=prompt.trim();
 return [
  'TASK: Edit Video 1 into a consistent character replacement video, retaining its action, timing, camera, scene, props and shot sequence.',
  'REFERENCE ROLES: Video 1 drives motion, expressions, blocking, camera and scene only. Its original people must not donate faces, hair, body shape or wardrobe to replacements.',
  'CHARACTER REFERENCES (in upload order): '+ids.join(', ')+'.',
  ...ids.map((label,i)=>label+': one distinct replacement identity, character '+(i+1)+'. Use only this image for that character’s face, skin tone, hairstyle, build, visible tattoos and outfit.'),
  'ASSIGNMENT: Follow explicit source-person assignments in the creative direction below. Where none are given, assign references to distinct intended source subjects in order of first clear appearance (simultaneous subjects: screen left to right). Do not invent additional subjects. If several images are explicitly described as views of one person, treat them as one identity. Leave all unassigned people unchanged.',
  'IDENTITY LOCK: Once assigned, track each character as the SAME person through the entire video, including camera pans, cuts, occlusions, turns, exits and re-entries. Screen position may change; identity must not. Never swap identities when a new person enters or the camera changes angle. Never duplicate an assigned character into another role.',
  'WARDROBE LOCK: Keep each character’s own reference clothing, colors, collar, badges, logos, numbers and accessories throughout all shots unless the user explicitly requests a wardrobe change. No clothing transfer from Video 1 or from another reference character. Maintain facial geometry, hair, facial hair, visible tattoos and natural proportions. Preserve realistic hands, limbs and object contact.',
  'CREATIVE DIRECTION: '+(direction||'Recreate the source actions with the assigned replacement characters.'),
  'FINAL QUALITY: First, middle and last frames must agree on character identity and outfit. No face morphing, identity drift, hybrid faces, duplicated bodies, disappearing characters, extra limbs, jersey changes or invented cuts. Preserve the intended scene and natural movement.'
 ].join('\n');
}
