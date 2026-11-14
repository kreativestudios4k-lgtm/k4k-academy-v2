// UI-side composition; the server always adds the independent consistency layer.
export const MAX_CREATIVE_DIRECTION=1200;
export const MAX_CHARACTER_TARGET=80;
export function buildCharacterDirection(prompt='',targets=[]){
 if(typeof prompt!=='string'||!Array.isArray(targets)||targets.length>8)throw Error('Invalid character directions.');
 const lines=[];
 for(let i=0;i<targets.length;i++){
  if(typeof targets[i]!=='string'||targets[i].length>MAX_CHARACTER_TARGET)throw Error('Invalid character target.');
  const target=targets[i].replace(/\s+/g,' ').trim();
  if(target)lines.push('Image '+(i+1)+' replaces source person: '+target+'.');
 }
 const direction=[lines.length?'CHARACTER ASSIGNMENTS:\n'+lines.join('\n'):'',prompt.trim()].filter(Boolean).join('\n\n');
 if(direction.length>MAX_CREATIVE_DIRECTION)throw Error('Shorten the creative prompt or character assignments to 1200 characters total.');
 return direction;
}
