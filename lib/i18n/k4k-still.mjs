// K4K Still language rules and copy. Supported: English (default), Brazilian Portuguese, Spanish.

export const SUPPORTED_LOCALES = Object.freeze(['en', 'pt-BR', 'es']);

// Portuguese-speaking countries (ISO 3166-1 alpha-2).
const PORTUGUESE_COUNTRIES = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL']);

// Spanish-speaking countries.
const SPANISH_COUNTRIES = new Set([
  'ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO',
  'HN', 'PY', 'NI', 'SV', 'CR', 'PA', 'UY', 'GQ',
]);

export function localeFromCountry(country) {
  const code = String(country || '').toUpperCase();
  if (PORTUGUESE_COUNTRIES.has(code)) return 'pt-BR';
  if (SPANISH_COUNTRIES.has(code)) return 'es';
  return null; // all other countries fall through to the browser language, then English
}

export function localeFromAcceptLanguage(header) {
  const primary = String(header || '').split(',')[0].trim().toLowerCase();
  if (primary.startsWith('pt')) return 'pt-BR';
  if (primary.startsWith('es')) return 'es';
  return 'en';
}

// Priority: the visitor's saved choice, then their country, then browser language.
export function resolveLocale({override, country, acceptLanguage} = {}) {
  if (SUPPORTED_LOCALES.includes(override)) return override;
  return localeFromCountry(country) || localeFromAcceptLanguage(acceptLanguage);
}

export const MESSAGES = Object.freeze({
  en: Object.freeze({
    title: 'K4K Still',
    subtitle: 'Create AI-generated still images for your K4K projects.',
    aiLabel: 'AI-generated. Every image is labelled as AI-generated.',
    promptLabel: 'Describe the scene',
    promptPlaceholder: 'A street market at sunset, warm light, relaxed mood',
    resolutionLabel: 'Resolution',
    referencesLabel: 'Reference photos',
    referencesSoon: 'Reference photos are coming soon.',
    generate: 'Generate image',
    cost: 'Estimated cost: {credits} credit(s)',
    disabled: 'Image generation is not switched on yet. This is only an estimate; nothing has been charged.',
    unauthenticated: 'Please sign in to generate images.',
    error: 'Something went wrong. Please try again.',
    language: 'Language',
  }),
  'pt-BR': Object.freeze({
    title: 'K4K Still',
    subtitle: 'Crie imagens fotográficas geradas por IA para seus projetos K4K.',
    aiLabel: 'Gerado por IA. Toda imagem é identificada como gerada por IA.',
    promptLabel: 'Descreva a cena',
    promptPlaceholder: 'Um mercado de rua ao pôr do sol, luz quente, clima descontraído',
    resolutionLabel: 'Resolução',
    referencesLabel: 'Fotos de referência',
    referencesSoon: 'Fotos de referência em breve.',
    generate: 'Gerar imagem',
    cost: 'Custo estimado: {credits} crédito(s)',
    disabled: 'A geração de imagens ainda não está ativa. Este é apenas um cálculo estimado; nada foi cobrado.',
    unauthenticated: 'Entre na sua conta para gerar imagens.',
    error: 'Algo deu errado. Tente novamente.',
    language: 'Idioma',
  }),
  es: Object.freeze({
    title: 'K4K Still',
    subtitle: 'Crea imágenes fijas generadas por IA para tus proyectos K4K.',
    aiLabel: 'Generado por IA. Cada imagen se identifica como generada por IA.',
    promptLabel: 'Describe la escena',
    promptPlaceholder: 'Un mercado callejero al atardecer, luz cálida, ambiente relajado',
    resolutionLabel: 'Resolución',
    referencesLabel: 'Fotos de referencia',
    referencesSoon: 'Las fotos de referencia llegarán pronto.',
    generate: 'Generar imagen',
    cost: 'Costo estimado: {credits} crédito(s)',
    disabled: 'La generación de imágenes aún no está activada. Es solo un cálculo estimado; no se ha cobrado nada.',
    unauthenticated: 'Inicia sesión para generar imágenes.',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    language: 'Idioma',
  }),
});
