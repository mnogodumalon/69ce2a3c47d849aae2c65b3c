import type { EnrichedKennzahlen, EnrichedNachweise, EnrichedRegelstatus, EnrichedVerpackungstypen } from '@/types/enriched';
import type { Kennzahlen, Nachweise, Regelstatus, Unternehmen, Verpackungstypen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface KennzahlenMaps {
  unternehmenMap: Map<string, Unternehmen>;
}

export function enrichKennzahlen(
  kennzahlen: Kennzahlen[],
  maps: KennzahlenMaps
): EnrichedKennzahlen[] {
  return kennzahlen.map(r => ({
    ...r,
    unternehmen_kpi_refName: resolveDisplay(r.fields.unternehmen_kpi_ref, maps.unternehmenMap, 'firmenname'),
  }));
}

interface VerpackungstypenMaps {
  unternehmenMap: Map<string, Unternehmen>;
}

export function enrichVerpackungstypen(
  verpackungstypen: Verpackungstypen[],
  maps: VerpackungstypenMaps
): EnrichedVerpackungstypen[] {
  return verpackungstypen.map(r => ({
    ...r,
    unternehmen_refName: resolveDisplay(r.fields.unternehmen_ref, maps.unternehmenMap, 'firmenname'),
  }));
}

interface NachweiseMaps {
  verpackungstypenMap: Map<string, Verpackungstypen>;
}

export function enrichNachweise(
  nachweise: Nachweise[],
  maps: NachweiseMaps
): EnrichedNachweise[] {
  return nachweise.map(r => ({
    ...r,
    verpackungstyp_refName: resolveDisplay(r.fields.verpackungstyp_ref, maps.verpackungstypenMap, 'verpackungs_id'),
  }));
}

interface RegelstatusMaps {
  verpackungstypenMap: Map<string, Verpackungstypen>;
}

export function enrichRegelstatus(
  regelstatus: Regelstatus[],
  maps: RegelstatusMaps
): EnrichedRegelstatus[] {
  return regelstatus.map(r => ({
    ...r,
    verpackungstyp_status_refName: resolveDisplay(r.fields.verpackungstyp_status_ref, maps.verpackungstypenMap, 'verpackungs_id'),
  }));
}
