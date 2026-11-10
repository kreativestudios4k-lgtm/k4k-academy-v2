'use client';

import {useEffect, useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {MESSAGES, SUPPORTED_LOCALES, resolveLocale} from '../../lib/i18n/k4k-still.mjs';

const LANGUAGE_LABELS = {en: 'EN', 'pt-BR': 'PT', es: 'ES'};
const LOCALE_KEY = 'k4kStillLocale';
const ASPECTS = ['9:16', '1:1', '16:9'];
const DEFAULT_OPTIONS = {realism: true, candid: false, selfie: false, face: false, antiDistortion: true};

// Labels for the controls added on top of the base page copy in lib/i18n/k4k-still.mjs.
const LABELS = {
  en: {
    aspect: 'Aspect ratio',
    aspectOptions: {'9:16': 'Vertical 9:16', '1:1': 'Square 1:1', '16:9': 'Horizontal 16:9'},
    presets: 'Scene presets',
    presetCafe: 'Simple café',
    presetBeach: 'Beach at sunset',
    presetStreet: 'Urban street',
    presetCafeText: 'A relaxed café table by a window, natural daylight',
    presetBeachText: 'A beach at sunset, soft warm light on the sand',
    presetStreetText: 'A city street at dusk, shop lights and passing people',
    options: 'Options',
    realism: 'Natural colours and detail',
    realismHint: 'True-to-life colour, no artificial boosting.',
    candid: 'Candid moment',
    candidHint: 'Relaxed, unposed, everyday framing.',
    selfie: 'Selfie angle',
    selfieHint: 'Front-facing with the arm extended, no lens distortion.',
    face: 'Face detail',
    faceHint: 'Sharp, natural facial features.',
    antiDistortion: 'Structural accuracy',
    antiDistortionHint: 'Correct perspective, limbs and backgrounds.',
  },
  'pt-BR': {
    aspect: 'Proporção',
    aspectOptions: {'9:16': 'Vertical 9:16', '1:1': 'Quadrado 1:1', '16:9': 'Horizontal 16:9'},
    presets: 'Cenas prontas',
    presetCafe: 'Café simples',
    presetBeach: 'Praia ao pôr do sol',
    presetStreet: 'Rua urbana',
    presetCafeText: 'Uma mesa de café tranquila perto de uma janela, luz natural do dia',
    presetBeachText: 'Uma praia ao pôr do sol, luz quente e suave sobre a areia',
    presetStreetText: 'Uma rua da cidade ao entardecer, luzes de lojas e pessoas passando',
    options: 'Opções',
    realism: 'Cores e detalhes naturais',
    realismHint: 'Cores fiéis à realidade, sem saturação artificial.',
    candid: 'Momento espontâneo',
    candidHint: 'Natural, sem pose, com enquadramento do dia a dia.',
    selfie: 'Ângulo de selfie',
    selfieHint: 'De frente, com o braço estendido, sem distorção de lente.',
    face: 'Detalhes do rosto',
    faceHint: 'Traços faciais nítidos e naturais.',
    antiDistortion: 'Precisão estrutural',
    antiDistortionHint: 'Perspectiva, membros e fundos corretos.',
  },
  es: {
    aspect: 'Proporción',
    aspectOptions: {'9:16': 'Vertical 9:16', '1:1': 'Cuadrado 1:1', '16:9': 'Horizontal 16:9'},
    presets: 'Escenas rápidas',
    presetCafe: 'Café sencillo',
    presetBeach: 'Playa al atardecer',
    presetStreet: 'Calle urbana',
    presetCafeText: 'Una mesa de café tranquila junto a una ventana, luz natural del día',
    presetBeachText: 'Una playa al atardecer, luz cálida y suave sobre la arena',
    presetStreetText: 'Una calle de la ciudad al anochecer, luces de tiendas y gente que pasa',
    options: 'Opciones',
    realism: 'Colores y detalles naturales',
    realismHint: 'Colores fieles a la realidad, sin saturación artificial.',
    candid: 'Momento espontáneo',
    candidHint: 'Natural, sin pose, con encuadre cotidiano.',
    selfie: 'Ángulo de selfie',
    selfieHint: 'De frente, con el brazo extendido, sin distorsión de lente.',
    face: 'Detalle del rostro',
    faceHint: 'Rasgos faciales nítidos y naturales.',
    antiDistortion: 'Precisión estructural',
    antiDistortionHint: 'Perspectiva, extremidades y fondos correctos.',
  },
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, {auth: {persistSession: true}}) : null;
}

export default function K4KStillPage() {
  const [locale, setLocale] = useState('en');
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('1K');
  const [aspect, setAspect] = useState('9:16');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [status, setStatus] = useState(null); // {kind: 'estimate' | 'error', credits?, text}
  const [busy, setBusy] = useState(false);

  // Pick the language once on load: saved choice, then country, then browser language.
  useEffect(() => {
    let override = null;
    try {
      override = window.localStorage.getItem(LOCALE_KEY);
    } catch {
      override = null;
    }
    fetch('/api/k4k-region', {cache: 'no-store'})
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((region) => {
        setLocale(resolveLocale({override, country: region.country, acceptLanguage: navigator.language}));
      });
  }, []);

  const t = MESSAGES[locale];
  const L = LABELS[locale];

  function chooseLocale(next) {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocale(next);
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // Storage may be unavailable; the choice still applies for this visit.
    }
  }

  function toggleOption(key) {
    setOptions((current) => ({...current, [key]: !current[key]}));
  }

  async function generate() {
    setBusy(true);
    setStatus(null);
    try {
      const supabase = getSupabase();
      const {data} = supabase ? await supabase.auth.getSession() : {data: {}};
      const token = data?.session?.access_token;
      if (!token) {
        setStatus({kind: 'error', text: t.unauthenticated});
        return;
      }
      const res = await fetch('/api/generation/images', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({resolution, aspectRatio: aspect, referenceImageCount: 0}),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setStatus({kind: 'error', text: t.unauthenticated});
      } else if (body.quote) {
        // Generation is off, so this is an estimate only.
        setStatus({kind: 'estimate', credits: body.quote.credits, text: t.disabled});
      } else {
        setStatus({kind: 'error', text: t.error});
      }
    } catch {
      setStatus({kind: 'error', text: t.error});
    } finally {
      setBusy(false);
    }
  }

  const optionRows = [
    ['realism', L.realism, L.realismHint],
    ['candid', L.candid, L.candidHint],
    ['selfie', L.selfie, L.selfieHint],
    ['face', L.face, L.faceHint],
    ['antiDistortion', L.antiDistortion, L.antiDistortionHint],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label={t.language}>
          {SUPPORTED_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => chooseLocale(code)}
              aria-pressed={locale === code}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                locale === code ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {LANGUAGE_LABELS[code]}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-8 md:grid-cols-2">
        <section className="space-y-6">
          <div className="rounded-md border border-blue-500/40 bg-blue-950/40 px-3 py-2 text-xs text-blue-200">
            {t.aiLabel}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">{L.presets}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                [L.presetCafe, L.presetCafeText],
                [L.presetBeach, L.presetBeachText],
                [L.presetStreet, L.presetStreetText],
              ].map(([name, text]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setPrompt(text)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-800"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="scene" className="mb-2 block text-sm font-medium text-slate-300">
              {t.promptLabel}
            </label>
            <textarea
              id="scene"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">{L.aspect}</p>
            <div className="grid grid-cols-3 gap-2">
              {ASPECTS.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspect(ratio)}
                  aria-pressed={aspect === ratio}
                  className={`rounded-lg px-2 py-2 text-xs ${
                    aspect === ratio ? 'bg-blue-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {L.aspectOptions[ratio]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="resolution" className="mb-2 block text-sm font-medium text-slate-300">
              {t.resolutionLabel}
            </label>
            <select
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100"
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K</option>
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">{L.options}</p>
            <div className="space-y-2">
              {optionRows.map(([key, title, hint]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3"
                >
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={() => toggleOption(key)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="block text-sm text-slate-200">{title}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">{t.referencesLabel}</p>
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
              {t.referencesSoon}
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={busy || prompt.trim().length === 0}
            className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.generate}
          </button>
        </section>

        <section className="flex flex-col justify-center space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {status?.kind === 'estimate' && (
            <>
              <p className="text-lg font-semibold text-slate-100">{t.cost.replace('{credits}', String(status.credits))}</p>
              <p className="text-sm text-slate-400">{status.text}</p>
            </>
          )}
          {status?.kind === 'error' && <p className="text-sm text-red-300">{status.text}</p>}
          {!status && <p className="text-sm text-slate-500">{t.aiLabel}</p>}
        </section>
      </div>
    </main>
  );
}
