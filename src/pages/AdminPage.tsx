import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Unternehmen, Kennzahlen, Verpackungstypen, Nachweise, Regelstatus } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { UnternehmenDialog } from '@/components/dialogs/UnternehmenDialog';
import { UnternehmenViewDialog } from '@/components/dialogs/UnternehmenViewDialog';
import { KennzahlenDialog } from '@/components/dialogs/KennzahlenDialog';
import { KennzahlenViewDialog } from '@/components/dialogs/KennzahlenViewDialog';
import { VerpackungstypenDialog } from '@/components/dialogs/VerpackungstypenDialog';
import { VerpackungstypenViewDialog } from '@/components/dialogs/VerpackungstypenViewDialog';
import { NachweiseDialog } from '@/components/dialogs/NachweiseDialog';
import { NachweiseViewDialog } from '@/components/dialogs/NachweiseViewDialog';
import { RegelstatusDialog } from '@/components/dialogs/RegelstatusDialog';
import { RegelstatusViewDialog } from '@/components/dialogs/RegelstatusViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const UNTERNEHMEN_FIELDS = [
  { key: 'firmenname', label: 'Firmenname', type: 'string/text' },
  { key: 'strasse', label: 'Straße', type: 'string/text' },
  { key: 'hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'plz', label: 'Postleitzahl', type: 'string/text' },
  { key: 'ort', label: 'Ort', type: 'string/text' },
  { key: 'laender', label: 'Tätigkeitsländer', type: 'string/text' },
  { key: 'ansprechpartner_vorname', label: 'Vorname Ansprechpartner', type: 'string/text' },
  { key: 'ansprechpartner_nachname', label: 'Nachname Ansprechpartner', type: 'string/text' },
  { key: 'ansprechpartner_email', label: 'E-Mail Ansprechpartner', type: 'string/email' },
  { key: 'ansprechpartner_telefon', label: 'Telefon Ansprechpartner', type: 'string/tel' },
  { key: 'steuernummer', label: 'Steuernummer / USt-IdNr.', type: 'string/text' },
  { key: 'epr_registrierungsnummern', label: 'EPR-Registrierungsnummern (je Land)', type: 'string/textarea' },
  { key: 'verantwortlich_vorname', label: 'Vorname verantwortliche Person', type: 'string/text' },
  { key: 'verantwortlich_nachname', label: 'Nachname verantwortliche Person', type: 'string/text' },
  { key: 'verantwortlich_funktion', label: 'Funktion / Position', type: 'string/text' },
  { key: 'verantwortlich_email', label: 'E-Mail verantwortliche Person', type: 'string/email' },
];
const KENNZAHLEN_FIELDS = [
  { key: 'unternehmen_kpi_ref', label: 'Unternehmen', type: 'applookup/select', targetEntity: 'unternehmen', targetAppId: 'UNTERNEHMEN', displayField: 'firmenname' },
  { key: 'berichtsjahr', label: 'Berichtsjahr', type: 'number' },
  { key: 'standort', label: 'Standort / Werk', type: 'string/text' },
  { key: 'gesamtmenge_kg', label: 'Gesamtmenge Verpackungen (kg/Jahr)', type: 'number' },
  { key: 'menge_kunststoff_kg', label: 'Menge Kunststoff (kg/Jahr)', type: 'number' },
  { key: 'menge_papier_pappe_kg', label: 'Menge Papier/Pappe (kg/Jahr)', type: 'number' },
  { key: 'menge_glas_kg', label: 'Menge Glas (kg/Jahr)', type: 'number' },
  { key: 'menge_metall_kg', label: 'Menge Metall (kg/Jahr)', type: 'number' },
  { key: 'menge_verbund_kg', label: 'Menge Verbund (kg/Jahr)', type: 'number' },
  { key: 'rezyklatanteil_gesamt_prozent', label: 'Rezyklatanteil gesamt (%)', type: 'number' },
  { key: 'rezyklatanteil_kunststoff_prozent', label: 'Rezyklatanteil Kunststoff (%)', type: 'number' },
  { key: 'rezyklatanteil_papier_prozent', label: 'Rezyklatanteil Papier/Pappe (%)', type: 'number' },
  { key: 'rezyklatanteil_glas_prozent', label: 'Rezyklatanteil Glas (%)', type: 'number' },
  { key: 'rezyklatanteil_metall_prozent', label: 'Rezyklatanteil Metall (%)', type: 'number' },
  { key: 'mehrwegquote_prozent', label: 'Mehrwegquote (%)', type: 'number' },
  { key: 'recyclingfaehigkeitsquote_prozent', label: 'Anteil recyclingfähiger Verpackungen (%)', type: 'number' },
  { key: 'anzahl_verpackungstypen', label: 'Anzahl Verpackungstypen gesamt', type: 'number' },
  { key: 'anzahl_konform', label: 'Davon konform', type: 'number' },
  { key: 'anzahl_kritisch', label: 'Davon kritisch', type: 'number' },
  { key: 'anzahl_nicht_konform', label: 'Davon nicht konform', type: 'number' },
  { key: 'kpi_hinweise', label: 'Hinweise / Anmerkungen', type: 'string/textarea' },
];
const VERPACKUNGSTYPEN_FIELDS = [
  { key: 'unternehmen_ref', label: 'Unternehmen', type: 'applookup/select', targetEntity: 'unternehmen', targetAppId: 'UNTERNEHMEN', displayField: 'firmenname' },
  { key: 'verpackungs_id', label: 'Verpackungs-ID', type: 'string/text' },
  { key: 'verpackungsname', label: 'Name der Verpackung', type: 'string/text' },
  { key: 'beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'produktkategorie', label: 'Produktkategorie', type: 'string/text' },
  { key: 'verwendungszweck', label: 'Verwendungszweck', type: 'lookup/select', options: [{ key: 'verkaufsverpackung', label: 'Verkaufsverpackung' }, { key: 'versandverpackung', label: 'Versandverpackung' }, { key: 'transportverpackung', label: 'Transportverpackung' }, { key: 'serviceverpackung', label: 'Serviceverpackung' }] },
  { key: 'material_hauptkategorie', label: 'Material-Hauptkategorie', type: 'lookup/select', options: [{ key: 'kunststoff', label: 'Kunststoff' }, { key: 'papier_pappe', label: 'Papier/Pappe' }, { key: 'glas', label: 'Glas' }, { key: 'metall', label: 'Metall' }, { key: 'verbund', label: 'Verbund' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'materialzusammensetzung', label: 'Detaillierte Materialzusammensetzung', type: 'string/textarea' },
  { key: 'material_einzelmaterialien', label: 'Einzelmaterialien (Bezeichnung)', type: 'string/text' },
  { key: 'material_prozentsaetze', label: 'Materialanteile in %', type: 'string/text' },
  { key: 'material_gewichte_g', label: 'Materialgewichte in Gramm', type: 'string/text' },
  { key: 'laenge_mm', label: 'Länge (mm)', type: 'number' },
  { key: 'breite_mm', label: 'Breite (mm)', type: 'number' },
  { key: 'hoehe_mm', label: 'Höhe (mm)', type: 'number' },
  { key: 'wandstaerke_mm', label: 'Wandstärke (mm)', type: 'number' },
  { key: 'volumen_ml', label: 'Volumen (ml)', type: 'number' },
  { key: 'gesamtgewicht_g', label: 'Gesamtgewicht (g)', type: 'number' },
  { key: 'rezyklat_postconsumer_prozent', label: 'Post-Consumer-Rezyklatanteil (%)', type: 'number' },
  { key: 'rezyklat_postconsumer_kg_jahr', label: 'Post-Consumer-Rezyklat (kg/Jahr)', type: 'number' },
  { key: 'rezyklat_postindustrial_prozent', label: 'Post-Industrial-Rezyklatanteil (%)', type: 'number' },
  { key: 'rezyklat_postindustrial_kg_jahr', label: 'Post-Industrial-Rezyklat (kg/Jahr)', type: 'number' },
  { key: 'recyclingfaehigkeit_kategorie', label: 'Recyclingfähigkeit – Kategorie', type: 'lookup/select', options: [{ key: 'gut_recyclingfaehig', label: 'Gut recyclingfähig' }, { key: 'eingeschraenkt_recyclingfaehig', label: 'Eingeschränkt recyclingfähig' }, { key: 'nicht_recyclingfaehig', label: 'Nicht recyclingfähig' }, { key: 'nicht_bewertet', label: 'Nicht bewertet' }] },
  { key: 'recyclingfaehigkeit_score', label: 'Recyclingfähigkeit – Score (0–100)', type: 'number' },
  { key: 'recyclingfaehigkeit_referenz', label: 'Referenz Prüfstandard / Gutachten', type: 'string/text' },
  { key: 'mehrwegfaehig', label: 'Mehrwegfähig', type: 'bool' },
  { key: 'erwartete_umlaeufe', label: 'Erwartete Umläufe', type: 'number' },
  { key: 'ruecknahmesystem', label: 'Beschreibung Rücknahmesystem', type: 'string/textarea' },
  { key: 'ppwr_quoten_zuordnung', label: 'Zuordnung zu PPWR-Quoten', type: 'multiplelookup/checkbox', options: [{ key: 'rezyklatquote', label: 'Rezyklatquote' }, { key: 'mehrwegquote', label: 'Mehrwegquote' }, { key: 'recyclingfaehigkeitsquote', label: 'Recyclingfähigkeitsquote' }] },
  { key: 'kennzeichnung_vollstaendig', label: 'Kennzeichnung vollständig', type: 'bool' },
  { key: 'kennzeichnung_hinweise', label: 'Hinweise zur Kennzeichnung', type: 'string/textarea' },
];
const NACHWEISE_FIELDS = [
  { key: 'verpackungstyp_ref', label: 'Verpackungstyp', type: 'applookup/select', targetEntity: 'verpackungstypen', targetAppId: 'VERPACKUNGSTYPEN', displayField: 'verpackungs_id' },
  { key: 'dokumentart', label: 'Dokumentart', type: 'lookup/select', options: [{ key: 'zertifikat', label: 'Zertifikat' }, { key: 'laboranalyse', label: 'Laboranalyse' }, { key: 'gutachten', label: 'Gutachten' }, { key: 'sonstiges', label: 'Sonstiges' }, { key: 'pruefbericht', label: 'Prüfbericht' }] },
  { key: 'aussteller', label: 'Aussteller', type: 'string/text' },
  { key: 'ausstellungsdatum', label: 'Ausstellungsdatum', type: 'date/date' },
  { key: 'gueltig_bis', label: 'Gültig bis', type: 'date/date' },
  { key: 'dokument_datei', label: 'Dokument (Datei-Upload)', type: 'file' },
  { key: 'dokument_url', label: 'Dokument-Link (URL)', type: 'string/url' },
  { key: 'nachweis_hinweise', label: 'Hinweise / Anmerkungen', type: 'string/textarea' },
];
const REGELSTATUS_FIELDS = [
  { key: 'verpackungstyp_status_ref', label: 'Verpackungstyp', type: 'applookup/select', targetEntity: 'verpackungstypen', targetAppId: 'VERPACKUNGSTYPEN', displayField: 'verpackungs_id' },
  { key: 'konformitaetsstatus', label: 'PPWR-Konformitätsstatus', type: 'lookup/radio', options: [{ key: 'konform', label: 'Konform' }, { key: 'kritisch', label: 'Kritisch' }, { key: 'nicht_konform', label: 'Nicht konform' }] },
  { key: 'datanluecke_flag', label: 'Datenlücke vorhanden', type: 'bool' },
  { key: 'problemfelder', label: 'Erkannte Problemfelder', type: 'multiplelookup/checkbox', options: [{ key: 'rezyklatquote_zu_niedrig', label: 'Rezyklatquote zu niedrig' }, { key: 'nicht_recyclingfaehig', label: 'Nicht recyclingfähig' }, { key: 'kennzeichnung_unvollstaendig', label: 'Kennzeichnung unvollständig' }, { key: 'mehrwegpflicht_verletzt', label: 'Mehrwegpflicht verletzt (Einwegverpackung)' }, { key: 'datanluecke', label: 'Datenlücke' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'status_kommentar', label: 'Kommentar / Maßnahmenempfehlung', type: 'string/textarea' },
  { key: 'bewertungsdatum', label: 'Datum der Bewertung', type: 'date/date' },
  { key: 'bewerter_vorname', label: 'Vorname bewertende Person', type: 'string/text' },
  { key: 'bewerter_nachname', label: 'Nachname bewertende Person', type: 'string/text' },
  { key: 'bewerter_abteilung', label: 'Abteilung', type: 'string/text' },
];

const ENTITY_TABS = [
  { key: 'unternehmen', label: 'Unternehmen', pascal: 'Unternehmen' },
  { key: 'kennzahlen', label: 'Kennzahlen', pascal: 'Kennzahlen' },
  { key: 'verpackungstypen', label: 'Verpackungstypen', pascal: 'Verpackungstypen' },
  { key: 'nachweise', label: 'Nachweise', pascal: 'Nachweise' },
  { key: 'regelstatus', label: 'Regelstatus', pascal: 'Regelstatus' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('unternehmen');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'unternehmen': new Set(),
    'kennzahlen': new Set(),
    'verpackungstypen': new Set(),
    'nachweise': new Set(),
    'regelstatus': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'unternehmen': {},
    'kennzahlen': {},
    'verpackungstypen': {},
    'nachweise': {},
    'regelstatus': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmen': return (data as any).unternehmen as Unternehmen[] ?? [];
      case 'kennzahlen': return (data as any).kennzahlen as Kennzahlen[] ?? [];
      case 'verpackungstypen': return (data as any).verpackungstypen as Verpackungstypen[] ?? [];
      case 'nachweise': return (data as any).nachweise as Nachweise[] ?? [];
      case 'regelstatus': return (data as any).regelstatus as Regelstatus[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'kennzahlen':
        lists.unternehmenList = (data as any).unternehmen ?? [];
        break;
      case 'verpackungstypen':
        lists.unternehmenList = (data as any).unternehmen ?? [];
        break;
      case 'nachweise':
        lists.verpackungstypenList = (data as any).verpackungstypen ?? [];
        break;
      case 'regelstatus':
        lists.verpackungstypenList = (data as any).verpackungstypen ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'kennzahlen' && fieldKey === 'unternehmen_kpi_ref') {
      const match = (lists.unternehmenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firmenname ?? '—';
    }
    if (entity === 'verpackungstypen' && fieldKey === 'unternehmen_ref') {
      const match = (lists.unternehmenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firmenname ?? '—';
    }
    if (entity === 'nachweise' && fieldKey === 'verpackungstyp_ref') {
      const match = (lists.verpackungstypenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.verpackungs_id ?? '—';
    }
    if (entity === 'regelstatus' && fieldKey === 'verpackungstyp_status_ref') {
      const match = (lists.verpackungstypenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.verpackungs_id ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmen': return UNTERNEHMEN_FIELDS;
      case 'kennzahlen': return KENNZAHLEN_FIELDS;
      case 'verpackungstypen': return VERPACKUNGSTYPEN_FIELDS;
      case 'nachweise': return NACHWEISE_FIELDS;
      case 'regelstatus': return REGELSTATUS_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmen': return {
        create: (fields: any) => LivingAppsService.createUnternehmenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateUnternehmenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteUnternehmenEntry(id),
      };
      case 'kennzahlen': return {
        create: (fields: any) => LivingAppsService.createKennzahlenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKennzahlenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKennzahlenEntry(id),
      };
      case 'verpackungstypen': return {
        create: (fields: any) => LivingAppsService.createVerpackungstypenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateVerpackungstypenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteVerpackungstypenEntry(id),
      };
      case 'nachweise': return {
        create: (fields: any) => LivingAppsService.createNachweiseEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateNachweiseEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteNachweiseEntry(id),
      };
      case 'regelstatus': return {
        create: (fields: any) => LivingAppsService.createRegelstatu(fields),
        update: (id: string, fields: any) => LivingAppsService.updateRegelstatu(id, fields),
        remove: (id: string) => LivingAppsService.deleteRegelstatu(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'unternehmen' || dialogState?.entity === 'unternehmen') && (
        <UnternehmenDialog
          open={createEntity === 'unternehmen' || dialogState?.entity === 'unternehmen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'unternehmen' ? handleUpdate : (fields: any) => handleCreate('unternehmen', fields)}
          defaultValues={dialogState?.entity === 'unternehmen' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Unternehmen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmen']}
        />
      )}
      {(createEntity === 'kennzahlen' || dialogState?.entity === 'kennzahlen') && (
        <KennzahlenDialog
          open={createEntity === 'kennzahlen' || dialogState?.entity === 'kennzahlen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'kennzahlen' ? handleUpdate : (fields: any) => handleCreate('kennzahlen', fields)}
          defaultValues={dialogState?.entity === 'kennzahlen' ? dialogState.record?.fields : undefined}
          unternehmenList={(data as any).unternehmen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Kennzahlen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlen']}
        />
      )}
      {(createEntity === 'verpackungstypen' || dialogState?.entity === 'verpackungstypen') && (
        <VerpackungstypenDialog
          open={createEntity === 'verpackungstypen' || dialogState?.entity === 'verpackungstypen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'verpackungstypen' ? handleUpdate : (fields: any) => handleCreate('verpackungstypen', fields)}
          defaultValues={dialogState?.entity === 'verpackungstypen' ? dialogState.record?.fields : undefined}
          unternehmenList={(data as any).unternehmen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Verpackungstypen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Verpackungstypen']}
        />
      )}
      {(createEntity === 'nachweise' || dialogState?.entity === 'nachweise') && (
        <NachweiseDialog
          open={createEntity === 'nachweise' || dialogState?.entity === 'nachweise'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'nachweise' ? handleUpdate : (fields: any) => handleCreate('nachweise', fields)}
          defaultValues={dialogState?.entity === 'nachweise' ? dialogState.record?.fields : undefined}
          verpackungstypenList={(data as any).verpackungstypen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Nachweise']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Nachweise']}
        />
      )}
      {(createEntity === 'regelstatus' || dialogState?.entity === 'regelstatus') && (
        <RegelstatusDialog
          open={createEntity === 'regelstatus' || dialogState?.entity === 'regelstatus'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'regelstatus' ? handleUpdate : (fields: any) => handleCreate('regelstatus', fields)}
          defaultValues={dialogState?.entity === 'regelstatus' ? dialogState.record?.fields : undefined}
          verpackungstypenList={(data as any).verpackungstypen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Regelstatus']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Regelstatus']}
        />
      )}
      {viewState?.entity === 'unternehmen' && (
        <UnternehmenViewDialog
          open={viewState?.entity === 'unternehmen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'unternehmen', record: r }); }}
        />
      )}
      {viewState?.entity === 'kennzahlen' && (
        <KennzahlenViewDialog
          open={viewState?.entity === 'kennzahlen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'kennzahlen', record: r }); }}
          unternehmenList={(data as any).unternehmen ?? []}
        />
      )}
      {viewState?.entity === 'verpackungstypen' && (
        <VerpackungstypenViewDialog
          open={viewState?.entity === 'verpackungstypen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'verpackungstypen', record: r }); }}
          unternehmenList={(data as any).unternehmen ?? []}
        />
      )}
      {viewState?.entity === 'nachweise' && (
        <NachweiseViewDialog
          open={viewState?.entity === 'nachweise'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'nachweise', record: r }); }}
          verpackungstypenList={(data as any).verpackungstypen ?? []}
        />
      )}
      {viewState?.entity === 'regelstatus' && (
        <RegelstatusViewDialog
          open={viewState?.entity === 'regelstatus'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'regelstatus', record: r }); }}
          verpackungstypenList={(data as any).verpackungstypen ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}