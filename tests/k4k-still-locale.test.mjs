import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLocale, localeFromCountry, localeFromAcceptLanguage, MESSAGES, SUPPORTED_LOCALES} from '../lib/i18n/k4k-still.mjs';

test('Brazil and other Portuguese-speaking countries get pt-BR', () => {
  for (const country of ['BR', 'PT', 'AO', 'MZ']) {
    assert.equal(localeFromCountry(country), 'pt-BR');
  }
});

test('Spanish-speaking countries get es', () => {
  for (const country of ['ES', 'MX', 'AR', 'CO', 'CL', 'PE']) {
    assert.equal(localeFromCountry(country), 'es');
  }
});

test('English-speaking and other countries fall through to browser language', () => {
  assert.equal(localeFromCountry('GB'), null);
  assert.equal(localeFromCountry('US'), null);
  assert.equal(localeFromCountry(null), null);
});

test('country codes are case-insensitive', () => {
  assert.equal(localeFromCountry('br'), 'pt-BR');
});

test('browser language is used when country gives no answer', () => {
  assert.equal(localeFromAcceptLanguage('pt-PT,pt;q=0.9'), 'pt-BR');
  assert.equal(localeFromAcceptLanguage('es-MX'), 'es');
  assert.equal(localeFromAcceptLanguage('fr-FR,fr;q=0.9'), 'en');
  assert.equal(localeFromAcceptLanguage(''), 'en');
});

test('saved override wins over country and browser language', () => {
  assert.equal(resolveLocale({override: 'en', country: 'BR', acceptLanguage: 'es'}), 'en');
});

test('invalid override is ignored', () => {
  assert.equal(resolveLocale({override: 'fr', country: 'ES'}), 'es');
});

test('country takes priority over browser language', () => {
  assert.equal(resolveLocale({country: 'BR', acceptLanguage: 'en-GB'}), 'pt-BR');
  assert.equal(resolveLocale({country: 'GB', acceptLanguage: 'es-ES'}), 'es');
});

test('every supported locale has the same message keys', () => {
  const keys = Object.keys(MESSAGES.en).sort();
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(Object.keys(MESSAGES[locale]).sort(), keys);
  }
});
