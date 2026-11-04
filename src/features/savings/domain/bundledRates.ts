import raw from '../data/regulated.json';
import { parseRatesFile, type RatesFile } from './rates';

/** Rates shipped with this version of the app, validated once at startup. */
export const BUNDLED_RATES: RatesFile = parseRatesFile(raw);
