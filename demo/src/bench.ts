// T67: the default page is the catalogue. The test bench (the page as it was: the board copies beside levain's pieces,
// the room the captures need) shows under ?bench=1 and on every ?only= address, so their frames don't change.
const q = new URLSearchParams(location.search);
export const BENCH = q.get('bench') === '1' || q.has('only');
