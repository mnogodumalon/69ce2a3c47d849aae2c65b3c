import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichVerpackungstypen, enrichRegelstatus } from '@/lib/enrich';
import type { EnrichedVerpackungstypen, EnrichedRegelstatus } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { VerpackungstypenDialog } from '@/components/dialogs/VerpackungstypenDialog';
import { RegelstatusDialog } from '@/components/dialogs/RegelstatusDialog';
import { NachweiseDialog } from '@/components/dialogs/NachweiseDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconPlus, IconPencil, IconTrash, IconPackage, IconBuilding,
  IconFileText, IconSearch, IconShieldCheck, IconAlertTriangle, IconAlertCircle,
  IconCheck, IconRefresh, IconTool, IconChevronRight, IconChartBar
} from '@tabler/icons-react';

const APPGROUP_ID = '69ce2a3c47d849aae2c65b3c';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    unternehmen, verpackungstypen, nachweise, regelstatus,
    unternehmenMap, verpackungstypenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedVerpackungstypen = enrichVerpackungstypen(verpackungstypen, { unternehmenMap });
  const enrichedRegelstatus = enrichRegelstatus(regelstatus, { verpackungstypenMap });

  // ── State (all hooks before early returns) ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const [verpackungDialog, setVerpackungDialog] = useState<{
    open: boolean;
    record: EnrichedVerpackungstypen | null;
  }>({ open: false, record: null });

  const [regelstatusDialog, setRegelstatusDialog] = useState<{
    open: boolean;
    record: EnrichedRegelstatus | null;
    verpackungId: string | null;
  }>({ open: false, record: null, verpackungId: null });

  const [nachweiseDialog, setNachweiseDialog] = useState<{
    open: boolean;
    verpackungId: string | null;
  }>({ open: false, verpackungId: null });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null);

  // ── Computed maps (useMemo before early returns) ─────────────────────────
  const regelstatusMap = useMemo(() => {
    const m = new Map<string, EnrichedRegelstatus>();
    enrichedRegelstatus.forEach(rs => {
      const id = extractRecordId(rs.fields.verpackungstyp_status_ref);
      if (!id) return;
      const existing = m.get(id);
      if (!existing || (rs.fields.bewertungsdatum ?? '') >= (existing.fields.bewertungsdatum ?? '')) {
        m.set(id, rs);
      }
    });
    return m;
  }, [enrichedRegelstatus]);

  const nachweiseCountMap = useMemo(() => {
    const m = new Map<string, number>();
    nachweise.forEach(n => {
      const id = extractRecordId(n.fields.verpackungstyp_ref);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    });
    return m;
  }, [nachweise]);

  const kpis = useMemo(() => {
    let konform = 0, kritisch = 0, nichtKonform = 0, ohneStatus = 0;
    enrichedVerpackungstypen.forEach(v => {
      const rs = regelstatusMap.get(v.record_id);
      const s = rs?.fields.konformitaetsstatus?.key;
      if (s === 'konform') konform++;
      else if (s === 'kritisch') kritisch++;
      else if (s === 'nicht_konform') nichtKonform++;
      else ohneStatus++;
    });
    return { total: enrichedVerpackungstypen.length, konform, kritisch, nichtKonform, ohneStatus };
  }, [enrichedVerpackungstypen, regelstatusMap]);

  const filteredVerpackungen = useMemo(() => {
    return enrichedVerpackungstypen.filter(v => {
      if (statusFilter !== 'all') {
        const rs = regelstatusMap.get(v.record_id);
        const s = rs?.fields.konformitaetsstatus?.key ?? 'none';
        if (statusFilter === 'none' && s !== 'none') return false;
        if (statusFilter !== 'none' && statusFilter !== 'all' && s !== statusFilter) return false;
      }
      if (companyFilter !== 'all') {
        const id = extractRecordId(v.fields.unternehmen_ref);
        if (id !== companyFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (v.fields.verpackungsname ?? '').toLowerCase().includes(q) ||
          (v.fields.verpackungs_id ?? '').toLowerCase().includes(q) ||
          v.unternehmen_refName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedVerpackungstypen, statusFilter, companyFilter, searchQuery, regelstatusMap]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await LivingAppsService.deleteVerpackungstypenEntry(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
      fetchAll();
    }
  };

  const statusFilterOptions = [
    { key: 'all', label: 'Alle', count: kpis.total },
    { key: 'konform', label: 'Konform', count: kpis.konform },
    { key: 'kritisch', label: 'Kritisch', count: kpis.kritisch },
    { key: 'nicht_konform', label: 'Nicht konform', count: kpis.nichtKonform },
    { key: 'none', label: 'Kein Status', count: kpis.ohneStatus },
  ];

  return (
    <div className="space-y-6">
      {/* ── Workflow Navigation ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/verpackung-erfassen"
          className="relative bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0"
        >
          <IconPackage size={22} className="text-primary shrink-0" stroke={1.5} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm leading-snug">Verpackung erfassen &amp; bewerten</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">Verpackungstyp anlegen, PPWR-Konformität bewerten, Nachweise hochladen</p>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
        <a
          href="#/intents/jahresbericht-erfassen"
          className="relative bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0"
        >
          <IconChartBar size={22} className="text-primary shrink-0" stroke={1.5} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm leading-snug">Jahresbericht erfassen</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">Jährliche KPI-Daten zu Verpackungsmengen und Recyclingquoten dokumentieren</p>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Verpackungstypen"
          value={String(kpis.total)}
          description="Gesamt erfasst"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Konform"
          value={String(kpis.konform)}
          description={kpis.total > 0 ? `${Math.round((kpis.konform / kpis.total) * 100)} % der Typen` : '0 %'}
          icon={<IconShieldCheck size={18} className="text-green-600" />}
        />
        <StatCard
          title="Kritisch"
          value={String(kpis.kritisch)}
          description="Handlungsbedarf"
          icon={<IconAlertTriangle size={18} className="text-amber-500" />}
        />
        <StatCard
          title="Nicht konform"
          value={String(kpis.nichtKonform)}
          description="Regelverstoß"
          icon={<IconAlertCircle size={18} className="text-destructive" />}
        />
      </div>

      {/* ── Compliance Cockpit ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Verpackungstypen</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredVerpackungen.length} von {kpis.total} Typen
            </p>
          </div>
          <Button size="sm" onClick={() => setVerpackungDialog({ open: true, record: null })}>
            <IconPlus size={14} className="mr-1.5 shrink-0" />
            Verpackung anlegen
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
          {/* Search */}
          <div className="relative min-w-[140px] flex-1">
            <IconSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <Input
              placeholder="Name, ID oder Unternehmen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>

          {/* Company filter */}
          {unternehmen.length > 0 && (
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Alle Unternehmen</option>
              {unternehmen.map(u => (
                <option key={u.record_id} value={u.record_id}>
                  {u.fields.firmenname ?? u.record_id}
                </option>
              ))}
            </select>
          )}

          {/* Status tabs */}
          <div className="flex flex-wrap gap-1">
            {statusFilterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === opt.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
                <span className={`rounded-full px-1 text-[10px] ${
                  statusFilter === opt.key
                    ? 'bg-white/20 text-primary-foreground'
                    : 'bg-background text-foreground'
                }`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        {filteredVerpackungen.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <IconPackage size={48} className="text-muted-foreground mb-3" stroke={1.5} />
            <p className="font-medium text-foreground mb-1">Keine Verpackungstypen gefunden</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || companyFilter !== 'all'
                ? 'Passe die Filter an oder setze sie zurück.'
                : 'Lege deine erste Verpackung an, um loszulegen.'}
            </p>
            {!searchQuery && statusFilter === 'all' && companyFilter === 'all' && (
              <Button size="sm" onClick={() => setVerpackungDialog({ open: true, record: null })}>
                <IconPlus size={14} className="mr-1.5" />
                Erste Verpackung anlegen
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {filteredVerpackungen.map(v => {
              const rs = regelstatusMap.get(v.record_id);
              const nachweiCount = nachweiseCountMap.get(v.record_id) ?? 0;
              const statusKey = rs?.fields.konformitaetsstatus?.key;
              const statusLabel = rs?.fields.konformitaetsstatus?.label;

              const stripeColor =
                statusKey === 'konform' ? 'bg-green-500' :
                statusKey === 'kritisch' ? 'bg-amber-400' :
                statusKey === 'nicht_konform' ? 'bg-destructive' :
                'bg-muted';

              const badgeClass =
                statusKey === 'konform'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : statusKey === 'kritisch'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : statusKey === 'nicht_konform'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'text-muted-foreground';

              return (
                <div
                  key={v.record_id}
                  className="rounded-xl border border-border bg-background overflow-hidden flex flex-col"
                >
                  {/* Color stripe */}
                  <div className={`h-1 w-full shrink-0 ${stripeColor}`} />

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Title & Status */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate leading-snug">
                          {v.fields.verpackungsname ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.fields.verpackungs_id ? `ID: ${v.fields.verpackungs_id}` : 'Keine ID'}
                        </p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-xs ${badgeClass}`}>
                        {statusLabel ?? 'Kein Status'}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="space-y-1.5">
                      {v.unternehmen_refName && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                          <IconBuilding size={12} className="shrink-0" />
                          <span className="truncate">{v.unternehmen_refName}</span>
                        </div>
                      )}

                      {(v.fields.material_hauptkategorie?.label || v.fields.verwendungszweck?.label) && (
                        <div className="flex flex-wrap gap-1">
                          {v.fields.material_hauptkategorie?.label && (
                            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                              {v.fields.material_hauptkategorie.label}
                            </span>
                          )}
                          {v.fields.verwendungszweck?.label && (
                            <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">
                              {v.fields.verwendungszweck.label}
                            </span>
                          )}
                          {v.fields.mehrwegfaehig && (
                            <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px]">
                              Mehrweg
                            </span>
                          )}
                        </div>
                      )}

                      {rs?.fields.bewertungsdatum && (
                        <p className="text-[11px] text-muted-foreground">
                          Bewertet am {formatDate(rs.fields.bewertungsdatum)}
                          {rs.fields.bewerter_nachname ? ` · ${rs.fields.bewerter_vorname ?? ''} ${rs.fields.bewerter_nachname}`.trim() : ''}
                        </p>
                      )}

                      {rs?.fields.problemfelder && rs.fields.problemfelder.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {rs.fields.problemfelder.slice(0, 2).map(pf => (
                            <span
                              key={pf.key}
                              className="rounded bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px]"
                            >
                              {pf.label}
                            </span>
                          ))}
                          {rs.fields.problemfelder.length > 2 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{rs.fields.problemfelder.length - 2} weitere
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex flex-wrap items-center gap-2 mt-auto pt-2.5 border-t border-border/60">
                      <button
                        onClick={() => setNachweiseDialog({ open: true, verpackungId: v.record_id })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <IconFileText size={12} className="shrink-0" />
                        {nachweiCount} Nachweis{nachweiCount !== 1 ? 'e' : ''}
                      </button>

                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            setRegelstatusDialog({
                              open: true,
                              record: rs ?? null,
                              verpackungId: v.record_id,
                            })
                          }
                        >
                          {rs ? 'Status ändern' : 'Status setzen'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Bearbeiten"
                          onClick={() => setVerpackungDialog({ open: true, record: v })}
                        >
                          <IconPencil size={13} className="shrink-0" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Löschen"
                          onClick={() => setDeleteTarget({ id: v.record_id })}
                        >
                          <IconTrash size={13} className="shrink-0" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <VerpackungstypenDialog
        open={verpackungDialog.open}
        onClose={() => setVerpackungDialog({ open: false, record: null })}
        onSubmit={async fields => {
          if (verpackungDialog.record) {
            await LivingAppsService.updateVerpackungstypenEntry(verpackungDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createVerpackungstypenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={verpackungDialog.record?.fields}
        unternehmenList={unternehmen}
        enablePhotoScan={AI_PHOTO_SCAN['Verpackungstypen']}
      />

      <RegelstatusDialog
        open={regelstatusDialog.open}
        onClose={() => setRegelstatusDialog({ open: false, record: null, verpackungId: null })}
        onSubmit={async fields => {
          if (regelstatusDialog.record) {
            await LivingAppsService.updateRegelstatu(regelstatusDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createRegelstatu(fields);
          }
          fetchAll();
        }}
        defaultValues={
          regelstatusDialog.record
            ? regelstatusDialog.record.fields
            : regelstatusDialog.verpackungId
            ? { verpackungstyp_status_ref: createRecordUrl(APP_IDS.VERPACKUNGSTYPEN, regelstatusDialog.verpackungId) }
            : undefined
        }
        verpackungstypenList={verpackungstypen}
        enablePhotoScan={AI_PHOTO_SCAN['Regelstatus']}
      />

      <NachweiseDialog
        open={nachweiseDialog.open}
        onClose={() => setNachweiseDialog({ open: false, verpackungId: null })}
        onSubmit={async fields => {
          await LivingAppsService.createNachweiseEntry(fields);
          fetchAll();
        }}
        defaultValues={
          nachweiseDialog.verpackungId
            ? { verpackungstyp_ref: createRecordUrl(APP_IDS.NACHWEISE, nachweiseDialog.verpackungId) }
            : undefined
        }
        verpackungstypenList={verpackungstypen}
        enablePhotoScan={AI_PHOTO_SCAN['Nachweise']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Verpackungstyp löschen"
        description="Möchtest du diesen Verpackungstyp wirklich löschen? Zugehörige Nachweise und Statuseinträge bleiben erhalten."
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Error State ─────────────────────────────────────────────────────────────
function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && (
        <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>
      )}
    </div>
  );
}
