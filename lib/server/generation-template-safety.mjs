// Wan Prime generation is available. High-risk repeated requests are controlled by
// per-user failure history before quote and again before any credit reservation.
// Keep this separate circuit breaker for future confirmed template-wide incidents.
export const generationTemplateBlocked=job=>false;
export const generationTemplateBlocker=job=>generationTemplateBlocked(job)?'TEMPLATE_UNDER_REVIEW':null;
