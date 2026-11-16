// A replacement count is not a head count. Preserve reviewed catalogue counts;
// provisional and unreviewed clips require an explicit selection.
export function templateCast(item){
 const n=Number(item?.requiredImages);
 const count=Number.isInteger(n)&&n>=1&&n<=8?n:null;
 const review=String(item?.characterCountReview||'');
 const verified=count!==null&&(/confirmed by creator/i.test(review)||/only one character is replaced/i.test(review))&&!/needs confirmation|provisional/i.test(review);
 return {count,verified,initialCount:verified?count:count||0,needsConfirmation:!verified};
}
export function castReady({count,files,targets,confirmed}){
 return Number.isInteger(count)&&count>=1&&count<=8&&confirmed===true&&Array.isArray(files)&&files.length===count&&files.every(Boolean)&&Array.isArray(targets)&&targets.length===count&&targets.every(t=>typeof t==='string'&&t.trim().length>=3&&t.trim().length<=80);
}
