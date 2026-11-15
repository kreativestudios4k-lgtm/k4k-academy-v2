const currencies=new Set(['GBP','EUR','USD','BRL']);
// Readiness uses the same trusted server country as checkout. A late or failed
// secondary region request must not hide an otherwise eligible Pix option.
export function manualPixCheckoutState({billing,regionCurrency,requestedPix=false,paymentChoice='pix'}={}){
 const currency=currencies.has(billing?.currency)?billing.currency:regionCurrency;
 const available=currency==='BRL'&&billing?.manualPixReady===true;
 return {currency,manualPix:available&&paymentChoice==='pix',pixBlocked:requestedPix&&paymentChoice==='pix'&&!available};
}
