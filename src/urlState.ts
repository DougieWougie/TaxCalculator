import { sanitizeNumber } from './sanitize';
import type { TaxRegion } from './taxEngine';

export interface UrlStatePayload {
  annualSalary: string;
  salarySacrifice: string;
  pensionContribution: string;
  employerPension: string;
  militaryPension: string;
  hasMilitaryPension: boolean;
  taxRegion: TaxRegion;
  employmentTaxCode: string;
  militaryPensionTaxCode: string;
  postTaxDeductions: { name: string; amount: string }[];
}

export const DEFAULTS: UrlStatePayload = {
  annualSalary: '45000',
  salarySacrifice: '0',
  pensionContribution: '0',
  employerPension: '0',
  militaryPension: '0',
  hasMilitaryPension: false,
  taxRegion: 'scottish',
  employmentTaxCode: '',
  militaryPensionTaxCode: '',
  postTaxDeductions: [],
};

const MAX_TAX_CODE_LEN = 10;
const MAX_DEDUCTION_NAME_LEN = 40;
const MAX_DEDUCTIONS = 20;

function encodeMoney(raw: string): string {
  const n = sanitizeNumber(raw);
  return n === 0 ? '' : String(n);
}

function encodeDeductions(rows: { name: string; amount: string }[]): string {
  return rows
    .filter((r) => sanitizeNumber(r.amount) > 0 || r.name.trim() !== '')
    .map((r) => `${encodeURIComponent(r.name)}:${sanitizeNumber(r.amount)}`)
    .join(';');
}

function decodeDeductions(raw: string): { name: string; amount: string }[] {
  if (!raw) return [];
  return raw
    .split(';')
    .slice(0, MAX_DEDUCTIONS)
    .map((entry) => {
      const idx = entry.lastIndexOf(':');
      if (idx < 0) return null;
      const encodedName = entry.slice(0, idx);
      const amountRaw = entry.slice(idx + 1);
      let name: string;
      try {
        name = decodeURIComponent(encodedName);
      } catch {
        return null;
      }
      if (name.length > MAX_DEDUCTION_NAME_LEN) {
        name = name.slice(0, MAX_DEDUCTION_NAME_LEN);
      }
      const amount = sanitizeNumber(amountRaw);
      if (amount === 0 && name.trim() === '') return null;
      return { name, amount: String(amount) };
    })
    .filter((row): row is { name: string; amount: string } => row !== null);
}

function sanitizeTaxCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, MAX_TAX_CODE_LEN);
}

export function encodeInput(input: UrlStatePayload): URLSearchParams {
  const params = new URLSearchParams();

  const salary = encodeMoney(input.annualSalary);
  if (salary && salary !== DEFAULTS.annualSalary) params.set('s', salary);

  const sacrifice = encodeMoney(input.salarySacrifice);
  if (sacrifice) params.set('ss', sacrifice);

  const pension = encodeMoney(input.pensionContribution);
  if (pension) params.set('p', pension);

  const employer = encodeMoney(input.employerPension);
  if (employer) params.set('ep', employer);

  if (input.hasMilitaryPension) {
    const mil = encodeMoney(input.militaryPension);
    if (mil) params.set('mp', mil);
  }

  if (input.taxRegion !== DEFAULTS.taxRegion) {
    params.set('r', input.taxRegion === 'english' ? 'e' : 's');
  }

  const empCode = input.employmentTaxCode.trim();
  if (empCode) params.set('ec', empCode);

  const milCode = input.militaryPensionTaxCode.trim();
  if (milCode && input.hasMilitaryPension) params.set('mc', milCode);

  const deductions = encodeDeductions(input.postTaxDeductions);
  if (deductions) params.set('d', deductions);

  return params;
}

export function decodeInput(search: string | URLSearchParams): UrlStatePayload {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;

  const out: UrlStatePayload = { ...DEFAULTS, postTaxDeductions: [] };

  const s = params.get('s');
  if (s !== null) out.annualSalary = String(sanitizeNumber(s));

  const ss = params.get('ss');
  if (ss !== null) out.salarySacrifice = String(sanitizeNumber(ss));

  const p = params.get('p');
  if (p !== null) out.pensionContribution = String(sanitizeNumber(p));

  const ep = params.get('ep');
  if (ep !== null) out.employerPension = String(sanitizeNumber(ep));

  const mp = params.get('mp');
  if (mp !== null) {
    const n = sanitizeNumber(mp);
    if (n > 0) {
      out.militaryPension = String(n);
      out.hasMilitaryPension = true;
    }
  }

  const r = params.get('r');
  if (r === 'e') out.taxRegion = 'english';
  else if (r === 's') out.taxRegion = 'scottish';

  const ec = params.get('ec');
  if (ec !== null) out.employmentTaxCode = sanitizeTaxCode(ec);

  const mc = params.get('mc');
  if (mc !== null && out.hasMilitaryPension) {
    out.militaryPensionTaxCode = sanitizeTaxCode(mc);
  }

  const d = params.get('d');
  if (d !== null) out.postTaxDeductions = decodeDeductions(d);

  return out;
}

export function buildShareableUrl(input: UrlStatePayload): string {
  const params = encodeInput(input);
  const query = params.toString();
  const { origin, pathname } = window.location;
  return query ? `${origin}${pathname}?${query}` : `${origin}${pathname}`;
}
