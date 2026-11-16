// Production circuit breaker for a template with repeated verified provider-policy rejections.
// Keep the original preview in the catalogue; don't send new billable jobs to the provider.
export const generationTemplateBlocked=job=>job?.template_id==='new-1';
export const generationTemplateBlocker=job=>generationTemplateBlocked(job)?'TEMPLATE_UNDER_REVIEW':null;
