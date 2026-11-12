// Treat the copied credential as opaque. Never split, trim or reconstruct it.
export function higgsfieldAuthorization(credentials) {
 if(typeof window!=='undefined')throw new Error('Server only');
 if(typeof credentials!=='string'||!credentials.length||credentials.length>8192||/[\s\x00-\x1f\x7f]/u.test(credentials))throw new Error('Invalid Higgsfield API key');
 return `Key ${credentials}`;
}
