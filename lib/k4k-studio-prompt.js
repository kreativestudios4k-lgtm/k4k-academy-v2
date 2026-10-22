// K4K Academy Character Swap Studio — browser-only prompt construction.
// No files are uploaded here. Media uploads and credit spending take place on Higgsfield.
export const K4K_VIDEO_MODES = [
  {value:'object',label:'Object Swap',summary:'Change selected people; keep the original scene.'},
  {value:'motion',label:'Motion Transfer',summary:'Reproduce movement with your new characters.'}
];
export const K4K_CHARACTER_POSITIONS = [
  {value:'left',label:'Person on the LEFT'},
  {value:'right',label:'Person on the RIGHT'},
  {value:'center',label:'Person in the CENTRE'},
  {value:'foreground',label:'Person in the FOREGROUND'},
  {value:'background',label:'Person in the BACKGROUND'}
];
const positions = Object.fromEntries(K4K_CHARACTER_POSITIONS.map(({value,label})=>[value,label]));
const formats = {'original':'the original reference-video aspect ratio','9:16':'vertical 9:16','16:9':'widescreen 16:9','4:5':'portrait 4:5'};
const normalize = (value,max=240)=>String(value||'').replace(/[\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);

export function makeK4KSwapPrompt(options={}){
 const mode=options.mode==='motion'?'motion':'object';
 const count=options.count===2?2:1;
 const first=positions[options.position1]||positions.left;
 const second=positions[options.position2]||positions.right;
 const format=formats[options.format]||formats.original;
 if(count===2 && first===second)throw new Error('Assign each replacement to a different person in the source video.');
 const subjectDetail=normalize(options.subjectDetail,180);
 const creativeNote=normalize(options.creativeNote,340);
 const keepOutfits=options.keepOutfits!==false;
 const keepAudio=options.keepAudio!==false;
 const keepScene=options.keepScene!==false;
 const lines=[
 'K4K ACADEMY — IDEA METHOD / GENJUTSU CHARACTER SWAP',
 '',
 'I — INVESTIGATE / INPUT ROLES',
 '@Video1: The ORIGINAL source video and driving reference for timing, actions, positions and camera movement.',
 '@Image1: Character sheet for replacing '+first+'.',
 ...(count===2?['@Image2: Character sheet for replacing '+second+'.']:[]),
 'DO NOT interpret a character-sheet panel as several different people.',
 '',
 'D — DIRECT / CHARACTER MAP',
 'Replace ONLY '+first+' in @Video1 with the exact person from @Image1.',
 ...(count===2?['Replace ONLY '+second+' in @Video1 with the exact person from @Image2.','Keep @Image1 and @Image2 identities, faces, clothing and left/right roles COMPLETELY SEPARATE.']:[]),
 ...(subjectDetail?['Additional identifier for the original target: '+subjectDetail+'.']:[]),
 keepOutfits?'Each replacement must wear precisely the outfit, shoes and accessories from THEIR OWN character sheet, consistently in all frames.':'Preserve each replacement’s facial identity and natural proportions; only change wardrobe if separately instructed and permitted.',
 'Lock eyes, facial features, hairstyle, natural anatomy, body scale and any headwear or eyewear shown in each assigned sheet.',
 ...(mode==='object'?[
 'MODE: OBJECT SWAP — replace only the named original subject(s).',
 keepScene?'KEEP ORIGINAL: location, background, unaffected people, props, camera framing, camera movement, scene transitions and lighting direction.':'Keep unaffected people and essential interactions; adjust the setting only if explicitly requested.',
 'Maintain the original target(s) position, timing, steps, reactions, gestures and interaction with objects.'
 ]:[
 'MODE: MOTION TRANSFER — drive the new reference characters using actions from @Video1.',
 'Faithfully follow @Video1 for choreography, gestures, reaction timing, camera movement and shot rhythm.',
 keepScene?'Keep the original setting and scene composition as closely as the motion-transfer workflow supports; do not invent unnecessary changes.':'Prioritise faithful motion and character identity while allowing the scene to be reconstructed where needed.'
 ]),
 ...(keepAudio?['Preserve the source audio or dialogue where the selected tool supports it.']:[]),
 '',
 'E — EXECUTE / GENERATION',
 'Output framing: '+format+'.',
 'Apply stable character tracking across ALL frames, believable movement, lighting integration, occlusion and contact shadows.',
 ...(creativeNote?['Additional creative direction: '+creativeNote]:[]),
 '',
 'A — AUDIT / QUALITY CONTROL',
 'Reject double faces, face morphing, swapped outfits, duplicated bodies, extra limbs, merged hands, changing eye colour, flicker, misplaced characters and accidental changes to untouched people.',
 'Verify the first, middle and final frames: same identity and outfit, correct original subject and correct motion.',
 'Do not add captions, artificial branding or watermarks unless explicitly requested.',
 '',
 'FINAL: Generate ONE consistent recast based on @Video1 with the exact mapped character-sheet reference(s).'
 ];
 return lines.join('\n');
}
