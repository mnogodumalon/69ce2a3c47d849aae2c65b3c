import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Unternehmen, Kennzahlen, Verpackungstypen, Nachweise, Regelstatus } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [unternehmen, setUnternehmen] = useState<Unternehmen[]>([]);
  const [kennzahlen, setKennzahlen] = useState<Kennzahlen[]>([]);
  const [verpackungstypen, setVerpackungstypen] = useState<Verpackungstypen[]>([]);
  const [nachweise, setNachweise] = useState<Nachweise[]>([]);
  const [regelstatus, setRegelstatus] = useState<Regelstatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [unternehmenData, kennzahlenData, verpackungstypenData, nachweiseData, regelstatusData] = await Promise.all([
        LivingAppsService.getUnternehmen(),
        LivingAppsService.getKennzahlen(),
        LivingAppsService.getVerpackungstypen(),
        LivingAppsService.getNachweise(),
        LivingAppsService.getRegelstatus(),
      ]);
      setUnternehmen(unternehmenData);
      setKennzahlen(kennzahlenData);
      setVerpackungstypen(verpackungstypenData);
      setNachweise(nachweiseData);
      setRegelstatus(regelstatusData);
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
        const [unternehmenData, kennzahlenData, verpackungstypenData, nachweiseData, regelstatusData] = await Promise.all([
          LivingAppsService.getUnternehmen(),
          LivingAppsService.getKennzahlen(),
          LivingAppsService.getVerpackungstypen(),
          LivingAppsService.getNachweise(),
          LivingAppsService.getRegelstatus(),
        ]);
        setUnternehmen(unternehmenData);
        setKennzahlen(kennzahlenData);
        setVerpackungstypen(verpackungstypenData);
        setNachweise(nachweiseData);
        setRegelstatus(regelstatusData);
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

  return { unternehmen, setUnternehmen, kennzahlen, setKennzahlen, verpackungstypen, setVerpackungstypen, nachweise, setNachweise, regelstatus, setRegelstatus, loading, error, fetchAll, unternehmenMap, verpackungstypenMap };
}