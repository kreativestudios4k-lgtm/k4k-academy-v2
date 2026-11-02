const has=(value,pattern)=>pattern.test(String(value||''));
export function reviewPrompt({prompt='',mapping='',locks={},imageCount=0,videoSelected=false}={}){
 const notes=[];
 const add=(id,title,tip)=>notes.push({id,title,tip});
 if(!String(prompt).trim())add('action','Describe the intended action','Explain what the replacement character does, the key action and the intended result.');
 else if(String(prompt).trim().length<35)add('detail','Add specific scene direction','Describe the action, shot and expected outcome instead of a short instruction.');
 if(!String(mapping).trim()||!has(mapping,/(?:image\s*\d+|@image\s*\d+|character|person|subject|actor|role)/i))add('mapping','Clarify character mapping','Identify each person or role and the corresponding reference image.');
 if(Number(imageCount)===0)add('images','Choose reference images','Select local character images, preferably clear face and matching camera angles.');
 if(!videoSelected)add('video','Choose a source clip','Select a reference clip if you need to preserve its original movement and timing.');
 if(!locks?.motion&&!has(prompt,/(motion|movement|timing|camera|tracking|frame|choreograph)/i))add('motion','Specify motion continuity','State whether to preserve the original camera motion, body movements and timing.');
 if(!locks?.identity&&!has(prompt,/(identity|face|facial|likeness|appearance|character consistency)/i))add('identity','Protect character identity','Specify that the replacement face and identity stay consistent across all frames.');
 if(!locks?.background&&!has(prompt,/(background|environment|location|setting|scene)/i))add('background','Specify background handling','Say whether the original background should remain unchanged.');
 return {ready:notes.length===0,notes,passed:7-notes.length,total:7};
}
