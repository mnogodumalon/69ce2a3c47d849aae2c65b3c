/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'verpackungstypen'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.verpackungstypen.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.verpackungstypen.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.verpackungstypen.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.verpackungstypen              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   verpackungstypen: unternehmen_ref, verpackungs_id, verpackungsname, beschreibung, produktkategorie, verwendungszweck, material_hauptkategorie, materialzusammensetzung, …  ·  → unternehmen · ← regelstatus (list + contextual +) · ← nachweise (list + contextual +)
 *   unternehmen: firmenname, strasse, hausnummer, plz, ort, laender, ansprechpartner_vorname, ansprechpartner_nachname, …  ·  ← verpackungstypen (list + contextual +) · ← kennzahlen (list + contextual +)
 *   regelstatus: verpackungstyp_status_ref, konformitaetsstatus, datanluecke_flag, problemfelder, status_kommentar, bewertungsdatum, bewerter_vorname, bewerter_nachname, …  ·  → verpackungstypen
 *   nachweise: verpackungstyp_ref, dokumentart, aussteller, dokument_url, ausstellungsdatum, gueltig_bis, dokument_datei, nachweis_hinweise  ·  → verpackungstypen
 *   kennzahlen: unternehmen_kpi_ref, berichtsjahr, standort, gesamtmenge_kg, menge_kunststoff_kg, menge_papier_pappe_kg, menge_glas_kg, menge_metall_kg, …  ·  → unternehmen
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Verpackungstypen, Unternehmen, Regelstatus, Nachweise, Kennzahlen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichVerpackungstypen, enrichRegelstatus, enrichNachweise, enrichKennzahlen } from '@/lib/enrich';
import type { EnrichedVerpackungstypen, EnrichedRegelstatus, EnrichedNachweise, EnrichedKennzahlen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { VerpackungstypenDialog, type VerpackungstypenDialogDefaults } from '@/components/dialogs/VerpackungstypenDialog';
import { VerpackungstypenDetails } from '@/components/details/VerpackungstypenDetails';
import { UnternehmenDialog, type UnternehmenDialogDefaults } from '@/components/dialogs/UnternehmenDialog';
import { UnternehmenDetails } from '@/components/details/UnternehmenDetails';
import { RegelstatusDialog, type RegelstatusDialogDefaults } from '@/components/dialogs/RegelstatusDialog';
import { RegelstatusDetails } from '@/components/details/RegelstatusDetails';
import { NachweiseDialog, type NachweiseDialogDefaults } from '@/components/dialogs/NachweiseDialog';
import { NachweiseDetails } from '@/components/details/NachweiseDetails';
import { KennzahlenDialog, type KennzahlenDialogDefaults } from '@/components/dialogs/KennzahlenDialog';
import { KennzahlenDetails } from '@/components/details/KennzahlenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'verpackungstypen'; record: EnrichedVerpackungstypen }
  | { type: 'unternehmen'; record: Unternehmen }
  | { type: 'regelstatus'; record: EnrichedRegelstatus }
  | { type: 'nachweise'; record: EnrichedNachweise }
  | { type: 'kennzahlen'; record: EnrichedKennzahlen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  verpackungstypen: EntityCrudApi<Verpackungstypen, VerpackungstypenDialogDefaults>;
  unternehmen: EntityCrudApi<Unternehmen, UnternehmenDialogDefaults>;
  regelstatus: EntityCrudApi<Regelstatus, RegelstatusDialogDefaults>;
  nachweise: EntityCrudApi<Nachweise, NachweiseDialogDefaults>;
  kennzahlen: EntityCrudApi<Kennzahlen, KennzahlenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { verpackungstypen: EnrichedVerpackungstypen[]; unternehmen: Unternehmen[]; regelstatus: EnrichedRegelstatus[]; nachweise: EnrichedNachweise[]; kennzahlen: EnrichedKennzahlen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [verpackungstypenDialog, setVerpackungstypenDialog] = useState<{ defaults?: VerpackungstypenDialogDefaults; editing?: Verpackungstypen } | null>(null);
  const [unternehmenDialog, setUnternehmenDialog] = useState<{ defaults?: UnternehmenDialogDefaults; editing?: Unternehmen } | null>(null);
  const [regelstatusDialog, setRegelstatusDialog] = useState<{ defaults?: RegelstatusDialogDefaults; editing?: Regelstatus } | null>(null);
  const [nachweiseDialog, setNachweiseDialog] = useState<{ defaults?: NachweiseDialogDefaults; editing?: Nachweise } | null>(null);
  const [kennzahlenDialog, setKennzahlenDialog] = useState<{ defaults?: KennzahlenDialogDefaults; editing?: Kennzahlen } | null>(null);
  const enrichedVerpackungstypen = useMemo(() => enrichVerpackungstypen(data.verpackungstypen, { unternehmenMap: data.unternehmenMap }), [data.verpackungstypen, data.unternehmenMap]);
  const enrichedRegelstatus = useMemo(() => enrichRegelstatus(data.regelstatus, { verpackungstypenMap: data.verpackungstypenMap }), [data.regelstatus, data.verpackungstypenMap]);
  const enrichedNachweise = useMemo(() => enrichNachweise(data.nachweise, { verpackungstypenMap: data.verpackungstypenMap }), [data.nachweise, data.verpackungstypenMap]);
  const enrichedKennzahlen = useMemo(() => enrichKennzahlen(data.kennzahlen, { unternehmenMap: data.unternehmenMap }), [data.kennzahlen, data.unternehmenMap]);

  function detailVerpackungstypen(record: Verpackungstypen, push = false) {
    const rec = enrichedVerpackungstypen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'verpackungstypen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitVerpackungstypen(fields: Verpackungstypen['fields']) {
    const editing = verpackungstypenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setVerpackungstypen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateVerpackungstypenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('verpackungstypen')} — ${t('crud_updated')}`, async () => {
        data.setVerpackungstypen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateVerpackungstypenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createVerpackungstypenEntry(fields);
      undoToast(`${appLabel('verpackungstypen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailUnternehmen(record: Unternehmen, push = false) {
    const item: OverlayItem = { type: 'unternehmen', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitUnternehmen(fields: Unternehmen['fields']) {
    const editing = unternehmenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setUnternehmen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateUnternehmenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('unternehmen')} — ${t('crud_updated')}`, async () => {
        data.setUnternehmen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateUnternehmenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createUnternehmenEntry(fields);
      undoToast(`${appLabel('unternehmen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailRegelstatus(record: Regelstatus, push = false) {
    const rec = enrichedRegelstatus.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'regelstatus', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitRegelstatus(fields: Regelstatus['fields']) {
    const editing = regelstatusDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setRegelstatus(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateRegelstatu(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('regelstatus')} — ${t('crud_updated')}`, async () => {
        data.setRegelstatus(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateRegelstatu(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createRegelstatu(fields);
      undoToast(`${appLabel('regelstatus')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailNachweise(record: Nachweise, push = false) {
    const rec = enrichedNachweise.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'nachweise', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitNachweise(fields: Nachweise['fields']) {
    const editing = nachweiseDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setNachweise(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateNachweiseEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('nachweise')} — ${t('crud_updated')}`, async () => {
        data.setNachweise(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateNachweiseEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createNachweiseEntry(fields);
      undoToast(`${appLabel('nachweise')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKennzahlen(record: Kennzahlen, push = false) {
    const rec = enrichedKennzahlen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kennzahlen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKennzahlen(fields: Kennzahlen['fields']) {
    const editing = kennzahlenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKennzahlen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKennzahlenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kennzahlen')} — ${t('crud_updated')}`, async () => {
        data.setKennzahlen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKennzahlenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKennzahlenEntry(fields);
      undoToast(`${appLabel('kennzahlen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <VerpackungstypenDialog
        open={verpackungstypenDialog !== null}
        onClose={() => setVerpackungstypenDialog(null)}
        onSubmit={submitVerpackungstypen}
        defaultValues={verpackungstypenDialog?.defaults}
        recordId={verpackungstypenDialog?.editing?.record_id}
        unternehmenList={data.unternehmen}
        enablePhotoScan={AI_PHOTO_SCAN['Verpackungstypen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Verpackungstypen']}
      />
      <UnternehmenDialog
        open={unternehmenDialog !== null}
        onClose={() => setUnternehmenDialog(null)}
        onSubmit={submitUnternehmen}
        defaultValues={unternehmenDialog?.defaults}
        recordId={unternehmenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Unternehmen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmen']}
      />
      <RegelstatusDialog
        open={regelstatusDialog !== null}
        onClose={() => setRegelstatusDialog(null)}
        onSubmit={submitRegelstatus}
        defaultValues={regelstatusDialog?.defaults}
        recordId={regelstatusDialog?.editing?.record_id}
        verpackungstypenList={data.verpackungstypen}
        enablePhotoScan={AI_PHOTO_SCAN['Regelstatus']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Regelstatus']}
      />
      <NachweiseDialog
        open={nachweiseDialog !== null}
        onClose={() => setNachweiseDialog(null)}
        onSubmit={submitNachweise}
        defaultValues={nachweiseDialog?.defaults}
        recordId={nachweiseDialog?.editing?.record_id}
        verpackungstypenList={data.verpackungstypen}
        enablePhotoScan={AI_PHOTO_SCAN['Nachweise']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Nachweise']}
      />
      <KennzahlenDialog
        open={kennzahlenDialog !== null}
        onClose={() => setKennzahlenDialog(null)}
        onSubmit={submitKennzahlen}
        defaultValues={kennzahlenDialog?.defaults}
        recordId={kennzahlenDialog?.editing?.record_id}
        unternehmenList={data.unternehmen}
        enablePhotoScan={AI_PHOTO_SCAN['Kennzahlen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'verpackungstypen') {
            return (
              <>
                <RecordHeader title={top.record.fields.verpackungs_id ?? appLabel('verpackungstypen')} subtitle={undefined} />
                <VerpackungstypenDetails
                  record={top.record}
                  unternehmenList={data.unternehmen}
                  onOpenUnternehmen={(r) => detailUnternehmen(r, true)}
                  regelstatusList={data.regelstatus}
                  onOpenRegelstatus={(r) => detailRegelstatus(r, true)}
                  onAddRegelstatus={perms.canWrite('regelstatus') ? () => setRegelstatusDialog({ defaults: { verpackungstyp_status_ref: createRecordUrl(APP_IDS.VERPACKUNGSTYPEN, top.record.record_id) } }) : undefined}
                  nachweiseList={data.nachweise}
                  onOpenNachweise={(r) => detailNachweise(r, true)}
                  onAddNachweise={perms.canWrite('nachweise') ? () => setNachweiseDialog({ defaults: { verpackungstyp_ref: createRecordUrl(APP_IDS.VERPACKUNGSTYPEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'unternehmen') {
            return (
              <>
                <RecordHeader title={top.record.fields.firmenname ?? appLabel('unternehmen')} subtitle={undefined} />
                <UnternehmenDetails
                  record={top.record}
                  verpackungstypenList={data.verpackungstypen}
                  onOpenVerpackungstypen={(r) => detailVerpackungstypen(r, true)}
                  onAddVerpackungstypen={perms.canWrite('verpackungstypen') ? () => setVerpackungstypenDialog({ defaults: { unternehmen_ref: createRecordUrl(APP_IDS.UNTERNEHMEN, top.record.record_id) } }) : undefined}
                  kennzahlenList={data.kennzahlen}
                  onOpenKennzahlen={(r) => detailKennzahlen(r, true)}
                  onAddKennzahlen={perms.canWrite('kennzahlen') ? () => setKennzahlenDialog({ defaults: { unternehmen_kpi_ref: createRecordUrl(APP_IDS.UNTERNEHMEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'regelstatus') {
            return (
              <>
                <RecordHeader title={top.record.fields.bewerter_vorname ?? appLabel('regelstatus')} subtitle={top.record.fields.bewertungsdatum ? formatDate(top.record.fields.bewertungsdatum) : undefined} />
                <RegelstatusDetails
                  record={top.record}
                  verpackungstypenList={data.verpackungstypen}
                  onOpenVerpackungstypen={(r) => detailVerpackungstypen(r, true)}
                />
              </>
            );
          }
          if (top.type === 'nachweise') {
            return (
              <>
                <RecordHeader title={top.record.fields.aussteller ?? appLabel('nachweise')} subtitle={top.record.fields.ausstellungsdatum ? formatDate(top.record.fields.ausstellungsdatum) : undefined} />
                <NachweiseDetails
                  record={top.record}
                  verpackungstypenList={data.verpackungstypen}
                  onOpenVerpackungstypen={(r) => detailVerpackungstypen(r, true)}
                />
              </>
            );
          }
          if (top.type === 'kennzahlen') {
            return (
              <>
                <RecordHeader title={top.record.fields.standort ?? appLabel('kennzahlen')} subtitle={undefined} />
                <KennzahlenDetails
                  record={top.record}
                  unternehmenList={data.unternehmen}
                  onOpenUnternehmen={(r) => detailUnternehmen(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'verpackungstypen') return perms.canWrite('verpackungstypen');
          if (top.type === 'unternehmen') return perms.canWrite('unternehmen');
          if (top.type === 'regelstatus') return perms.canWrite('regelstatus');
          if (top.type === 'nachweise') return perms.canWrite('nachweise');
          if (top.type === 'kennzahlen') return perms.canWrite('kennzahlen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'verpackungstypen') setVerpackungstypenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'unternehmen') setUnternehmenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'regelstatus') setRegelstatusDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'nachweise') setNachweiseDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kennzahlen') setKennzahlenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    verpackungstypen: {
      openCreate: (defaults?: VerpackungstypenDialogDefaults) => (perms.canWrite('verpackungstypen') ? setVerpackungstypenDialog({ defaults }) : refuse()),
      openEdit: (record: Verpackungstypen) => (perms.canWrite('verpackungstypen') ? setVerpackungstypenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Verpackungstypen) => detailVerpackungstypen(record, false),
      canWrite: perms.canWrite('verpackungstypen'),
    },
    unternehmen: {
      openCreate: (defaults?: UnternehmenDialogDefaults) => (perms.canWrite('unternehmen') ? setUnternehmenDialog({ defaults }) : refuse()),
      openEdit: (record: Unternehmen) => (perms.canWrite('unternehmen') ? setUnternehmenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Unternehmen) => detailUnternehmen(record, false),
      canWrite: perms.canWrite('unternehmen'),
    },
    regelstatus: {
      openCreate: (defaults?: RegelstatusDialogDefaults) => (perms.canWrite('regelstatus') ? setRegelstatusDialog({ defaults }) : refuse()),
      openEdit: (record: Regelstatus) => (perms.canWrite('regelstatus') ? setRegelstatusDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Regelstatus) => detailRegelstatus(record, false),
      canWrite: perms.canWrite('regelstatus'),
    },
    nachweise: {
      openCreate: (defaults?: NachweiseDialogDefaults) => (perms.canWrite('nachweise') ? setNachweiseDialog({ defaults }) : refuse()),
      openEdit: (record: Nachweise) => (perms.canWrite('nachweise') ? setNachweiseDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Nachweise) => detailNachweise(record, false),
      canWrite: perms.canWrite('nachweise'),
    },
    kennzahlen: {
      openCreate: (defaults?: KennzahlenDialogDefaults) => (perms.canWrite('kennzahlen') ? setKennzahlenDialog({ defaults }) : refuse()),
      openEdit: (record: Kennzahlen) => (perms.canWrite('kennzahlen') ? setKennzahlenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kennzahlen) => detailKennzahlen(record, false),
      canWrite: perms.canWrite('kennzahlen'),
    },
    enriched: { verpackungstypen: enrichedVerpackungstypen, unternehmen: data.unternehmen, regelstatus: enrichedRegelstatus, nachweise: enrichedNachweise, kennzahlen: enrichedKennzahlen },
  };
}
