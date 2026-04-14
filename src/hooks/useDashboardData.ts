import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Unternehmen, Verpackungstypen, Nachweise, Regelstatus, Kennzahlen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [unternehmen, setUnternehmen] = useState<Unternehmen[]>([]);
  const [verpackungstypen, setVerpackungstypen] = useState<Verpackungstypen[]>([]);
  const [nachweise, setNachweise] = useState<Nachweise[]>([]);
  const [regelstatus, setRegelstatus] = useState<Regelstatus[]>([]);
  const [kennzahlen, setKennzahlen] = useState<Kennzahlen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [unternehmenData, verpackungstypenData, nachweiseData, regelstatusData, kennzahlenData] = await Promise.all([
        LivingAppsService.getUnternehmen(),
        LivingAppsService.getVerpackungstypen(),
        LivingAppsService.getNachweise(),
        LivingAppsService.getRegelstatus(),
        LivingAppsService.getKennzahlen(),
      ]);
      setUnternehmen(unternehmenData);
      setVerpackungstypen(verpackungstypenData);
      setNachweise(nachweiseData);
      setRegelstatus(regelstatusData);
      setKennzahlen(kennzahlenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [unternehmenData, verpackungstypenData, nachweiseData, regelstatusData, kennzahlenData] = await Promise.all([
          LivingAppsService.getUnternehmen(),
          LivingAppsService.getVerpackungstypen(),
          LivingAppsService.getNachweise(),
          LivingAppsService.getRegelstatus(),
          LivingAppsService.getKennzahlen(),
        ]);
        setUnternehmen(unternehmenData);
        setVerpackungstypen(verpackungstypenData);
        setNachweise(nachweiseData);
        setRegelstatus(regelstatusData);
        setKennzahlen(kennzahlenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const unternehmenMap = useMemo(() => {
    const m = new Map<string, Unternehmen>();
    unternehmen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [unternehmen]);

  const verpackungstypenMap = useMemo(() => {
    const m = new Map<string, Verpackungstypen>();
    verpackungstypen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [verpackungstypen]);

  return { unternehmen, setUnternehmen, verpackungstypen, setVerpackungstypen, nachweise, setNachweise, regelstatus, setRegelstatus, kennzahlen, setKennzahlen, loading, error, fetchAll, unternehmenMap, verpackungstypenMap };
}