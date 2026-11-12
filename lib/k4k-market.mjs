// Server-derived country determines display and checkout currency.
// Unrecognised countries default to GBP rather than guessing a local currency.
const EURO=new Set(['AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK']);
export function currencyForCountry(country){
 const code=typeof country==='string'?country.toUpperCase():'';
 if(code==='BR')return 'BRL';
 if(code==='US')return 'USD';
 if(EURO.has(code))return 'EUR';
 return 'GBP';
}
export function localeForCountry(country){
 const code=typeof country==='string'?country.toUpperCase():'';
 if(code==='BR')return 'pt';
 if(code==='ES')return 'es';
 if(code==='GB'||code==='UK'||code==='US')return 'en';
 return null;
}
