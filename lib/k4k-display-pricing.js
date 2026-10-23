// K4K Academy — location-based pricing display.
// Base subscription (and existing Payment Link) is priced in GBP. Stripe's
// active multi-currency Price has these manually configured exact amounts:
// GBP 799, EUR 899, BRL 4999, USD 999 minor units, per month.
// We never claim an arbitrary foreign conversion is the checkout total.
const euroArea=new Set([
 'AD','AT','BE','BG','CY','DE','EE','ES','FI','FR','GR','HR','IE',
 'IT','LT','LU','LV','MC','ME','MT','NL','PT','SI','SK','SM','VA'
]);
const manualPrices={
 GBP:{minor:799,locale:'en-GB'},
 EUR:{minor:899,locale:'en-IE'},
 BRL:{minor:4999,locale:'pt-BR'},
 USD:{minor:999,locale:'en-US'}
};
const localCurrencies={
 AO:'AOA',AU:'AUD',CA:'CAD',CH:'CHF',CN:'CNY',CZ:'CZK',
 DK:'DKK',EG:'EGP',GH:'GHS',HK:'HKD',HU:'HUF',ID:'IDR',
 IL:'ILS',IN:'INR',IS:'ISK',JP:'JPY',KE:'KES',KR:'KRW',
 MX:'MXN',MY:'MYR',NG:'NGN',NO:'NOK',NZ:'NZD',PH:'PHP',
 PK:'PKR',PL:'PLN',RO:'RON',SA:'SAR',SE:'SEK',SG:'SGD',
 TH:'THB',TR:'TRY',TW:'TWD',UA:'UAH',UG:'UGX',VN:'VND',
 ZA:'ZAR',ZM:'ZMW'
};
const money=(minor,currency,locale)=>new Intl.NumberFormat(locale,{
 style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2
}).format(minor/100);
const region=(country)=>{
 if(country==='BR')return 'BRL';
 if(country==='GB')return 'GBP';
 if(euroArea.has(country))return 'EUR';
 if(country==='US')return 'USD';
 if(!country||country==='ZZ')return 'GBP';// Same currency as the active Stripe Payment Link.
 return localCurrencies[country]||null;
};
export function getK4KDisplayPricing(inputCountry){
 // Use only the platform-inferred two-letter IP country, never user-submitted location.
 const country=typeof inputCountry==='string'&&/^[A-Za-z]{2}$/.test(inputCountry)
  ?inputCountry.toUpperCase():'ZZ';
 const currency=region(country);
 const isBrazil=country==='BR';
 const locale=isBrazil?'pt-BR':'en';
 const price=currency&&manualPrices[currency];
 if(price){
  const promoMinor=Math.round(price.minor*0.30);
  return {
   locale,currency,verifiedPrice:true,
   firstPrice:money(promoMinor,currency,price.locale),
   regularPrice:money(price.minor,currency,price.locale),
   perMonth:isBrazil?'/ MÊS':'/ MONTH',
   renewText:isBrazil
    ?'Depois '+money(price.minor,currency,price.locale)+' / mês. Cancele quando quiser.'
    :'Then '+money(price.minor,currency,price.locale)+' / month. Cancel anytime.'
  };
 }
 // Stripe Adaptive Pricing, where enabled and supported, sets these other
 // currencies and exchange rates in its own checkout. Never manufacture a total.
 return {
  locale,currency,verifiedPrice:false,
  firstPrice:isBrazil?'NO CHECKOUT':'AT CHECKOUT',
  regularPrice:currency?currency+' · CHECKOUT':'SEE CHECKOUT',
  perMonth:'',
  renewText:'The exact amount and renewal currency are confirmed securely by Stripe before payment.'
 };
}
