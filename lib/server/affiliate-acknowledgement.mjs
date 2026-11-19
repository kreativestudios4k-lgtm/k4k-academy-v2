// Transactional K4K affiliate application acknowledgement.
// Never represents acceptance, commission entitlement or a referral grant.
const copy={
 en:{headline:"You're halfway to joining the K4K family.",intro:"We received your Creator Partner application and we're reviewing your Instagram profile.",next:"What happens next",steps:["Our team reviews your submitted details.","We'll email you the result and your partner terms if approved.","Referral codes and commissions become available only after approval."],footer:"This email confirms your application, not partner acceptance.",cta:"Explore K4K APP"},
 pt:{headline:"Você está a meio caminho de fazer parte da família K4K.",intro:"Recebemos sua candidatura para Creator Partner e estamos analisando seu perfil do Instagram.",next:"Próximos passos",steps:["Nossa equipe analisa os dados enviados.","Enviaremos a resposta por e-mail e as condições de parceria, caso seja aprovado.","Códigos de indicação e comissões só são ativados após a aprovação."],footer:"Este e-mail confirma sua candidatura, não a aprovação como parceiro.",cta:"Conheça a K4K APP"},
 es:{headline:"Ya estás a medio camino de formar parte de la familia K4K.",intro:"Recibimos tu solicitud para Creator Partner y estamos revisando tu perfil de Instagram.",next:"¿Qué sucede ahora?",steps:["Nuestro equipo revisa tus datos.","Te enviaremos el resultado por correo y, si te aprobamos, las condiciones de colaboración.","Los códigos de referido y las comisiones se activan solo después de la aprobación."],footer:"Este correo confirma la solicitud, no la aprobación como socio.",cta:"Explora K4K APP"}
};
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function affiliateAcknowledgementHtml({name,language}){
 const x=copy[language]||copy.en;
 const firstName=String(name||'').trim().split(/\s+/)[0].slice(0,50);
 const hello=firstName?`<p style="font-size:16px;line-height:1.6;color:#bdbdc5">Hi / Olá / Hola, ${escape(firstName)}.</p>`:'';
 const items=x.steps.map(s=>`<li style="padding:8px 0">${escape(s)}</li>`).join('');
 return `<!doctype html><html lang="${escape(language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
 <body style="margin:0;padding:28px 12px;background:#080808;color:#f8f8f8;font-family:Arial,Helvetica,sans-serif">
 <main style="max-width:580px;margin:0 auto;border:1px solid #333;border-radius:18px;overflow:hidden;background:#121214">
 <div style="padding:24px 30px;border-bottom:1px solid #343439;font-size:16px;font-weight:900;letter-spacing:2px">K4K <span style="font-weight:500">APP</span></div>
 <div style="padding:30px">${hello}
 <div style="font-size:11px;letter-spacing:3px;font-weight:800;color:#b2b2b9;margin-bottom:16px">CREATOR PARTNERS / APPLICATION RECEIVED</div>
 <h1 style="font-size:34px;line-height:1.12;letter-spacing:-1.6px;margin:0 0 20px;color:#fff">${escape(x.headline)}</h1>
 <p style="font-size:16px;line-height:1.65;color:#ceced4">${escape(x.intro)}</p>
 <section style="margin:25px 0;border:1px solid #37373b;border-radius:12px;padding:22px">
 <h2 style="font-size:18px;margin:0 0 12px">${escape(x.next)}</h2><ol style="color:#c6c6cd;font-size:14px;line-height:1.5;padding-left:22px;margin:0">${items}</ol></section>
 <a href="https://kreativestudios4k.com/dashboard" style="display:inline-block;padding:15px 22px;background:#fff;color:#101010;font-weight:800;border-radius:8px;text-decoration:none">${escape(x.cta)} &rarr;</a>
 <p style="font-size:12px;line-height:1.6;margin-top:24px;color:#acacb3">${escape(x.footer)}</p>
 </div><div style="border-top:1px solid #343439;padding:20px 30px;color:#888;font-size:11px">K4K APP &middot; KreativeStudios4K &middot; hello@kreativestudios4k.com</div>
 </main></body></html>`;
}
