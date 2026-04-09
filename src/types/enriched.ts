import type { Kennzahlen, Nachweise, Regelstatus, Verpackungstypen } from './app';

export type EnrichedKennzahlen = Kennzahlen & {
  unternehmen_kpi_refName: string;
};

export type EnrichedVerpackungstypen = Verpackungstypen & {
  unternehmen_refName: string;
};

export type EnrichedNachweise = Nachweise & {
  verpackungstyp_refName: string;
};

export type EnrichedRegelstatus = Regelstatus & {
  verpackungstyp_status_refName: string;
};
