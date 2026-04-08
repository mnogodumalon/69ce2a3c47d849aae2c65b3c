import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Verpackungstypen, Unternehmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { VerpackungstypenDialog } from '@/components/dialogs/VerpackungstypenDialog';
import { VerpackungstypenViewDialog } from '@/components/dialogs/VerpackungstypenViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

export default function VerpackungstypenPage() {
  const [records, setRecords] = useState<Verpackungstypen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Verpackungstypen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Verpackungstypen | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Verpackungstypen | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [unternehmenList, setUnternehmenList] = useState<Unternehmen[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, unternehmenData] = await Promise.all([
        LivingAppsService.getVerpackungstypen(),
        LivingAppsService.getUnternehmen(),
      ]);
      setRecords(mainData);
      setUnternehmenList(unternehmenData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Verpackungstypen['fields']) {
    await LivingAppsService.createVerpackungstypenEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Verpackungstypen['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateVerpackungstypenEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteVerpackungstypenEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getUnternehmenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmenList.find(r => r.record_id === id)?.fields.firmenname ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Verpackungstypen"
      subtitle={`${records.length} Verpackungstypen im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Verpackungstypen suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('unternehmen_ref')}>
                <span className="inline-flex items-center gap-1">
                  Unternehmen
                  {sortKey === 'unternehmen_ref' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verpackungs_id')}>
                <span className="inline-flex items-center gap-1">
                  Verpackungs-ID
                  {sortKey === 'verpackungs_id' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verpackungsname')}>
                <span className="inline-flex items-center gap-1">
                  Name der Verpackung
                  {sortKey === 'verpackungsname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('beschreibung')}>
                <span className="inline-flex items-center gap-1">
                  Beschreibung
                  {sortKey === 'beschreibung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('produktkategorie')}>
                <span className="inline-flex items-center gap-1">
                  Produktkategorie
                  {sortKey === 'produktkategorie' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verwendungszweck')}>
                <span className="inline-flex items-center gap-1">
                  Verwendungszweck
                  {sortKey === 'verwendungszweck' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('material_hauptkategorie')}>
                <span className="inline-flex items-center gap-1">
                  Material-Hauptkategorie
                  {sortKey === 'material_hauptkategorie' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('materialzusammensetzung')}>
                <span className="inline-flex items-center gap-1">
                  Detaillierte Materialzusammensetzung
                  {sortKey === 'materialzusammensetzung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('material_einzelmaterialien')}>
                <span className="inline-flex items-center gap-1">
                  Einzelmaterialien (Bezeichnung)
                  {sortKey === 'material_einzelmaterialien' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('material_prozentsaetze')}>
                <span className="inline-flex items-center gap-1">
                  Materialanteile in %
                  {sortKey === 'material_prozentsaetze' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('material_gewichte_g')}>
                <span className="inline-flex items-center gap-1">
                  Materialgewichte in Gramm
                  {sortKey === 'material_gewichte_g' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('laenge_mm')}>
                <span className="inline-flex items-center gap-1">
                  Länge (mm)
                  {sortKey === 'laenge_mm' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('breite_mm')}>
                <span className="inline-flex items-center gap-1">
                  Breite (mm)
                  {sortKey === 'breite_mm' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('hoehe_mm')}>
                <span className="inline-flex items-center gap-1">
                  Höhe (mm)
                  {sortKey === 'hoehe_mm' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('wandstaerke_mm')}>
                <span className="inline-flex items-center gap-1">
                  Wandstärke (mm)
                  {sortKey === 'wandstaerke_mm' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('volumen_ml')}>
                <span className="inline-flex items-center gap-1">
                  Volumen (ml)
                  {sortKey === 'volumen_ml' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gesamtgewicht_g')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtgewicht (g)
                  {sortKey === 'gesamtgewicht_g' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklat_postconsumer_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Post-Consumer-Rezyklatanteil (%)
                  {sortKey === 'rezyklat_postconsumer_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklat_postconsumer_kg_jahr')}>
                <span className="inline-flex items-center gap-1">
                  Post-Consumer-Rezyklat (kg/Jahr)
                  {sortKey === 'rezyklat_postconsumer_kg_jahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklat_postindustrial_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Post-Industrial-Rezyklatanteil (%)
                  {sortKey === 'rezyklat_postindustrial_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklat_postindustrial_kg_jahr')}>
                <span className="inline-flex items-center gap-1">
                  Post-Industrial-Rezyklat (kg/Jahr)
                  {sortKey === 'rezyklat_postindustrial_kg_jahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('recyclingfaehigkeit_kategorie')}>
                <span className="inline-flex items-center gap-1">
                  Recyclingfähigkeit – Kategorie
                  {sortKey === 'recyclingfaehigkeit_kategorie' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('recyclingfaehigkeit_score')}>
                <span className="inline-flex items-center gap-1">
                  Recyclingfähigkeit – Score (0–100)
                  {sortKey === 'recyclingfaehigkeit_score' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('recyclingfaehigkeit_referenz')}>
                <span className="inline-flex items-center gap-1">
                  Referenz Prüfstandard / Gutachten
                  {sortKey === 'recyclingfaehigkeit_referenz' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('mehrwegfaehig')}>
                <span className="inline-flex items-center gap-1">
                  Mehrwegfähig
                  {sortKey === 'mehrwegfaehig' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('erwartete_umlaeufe')}>
                <span className="inline-flex items-center gap-1">
                  Erwartete Umläufe
                  {sortKey === 'erwartete_umlaeufe' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ruecknahmesystem')}>
                <span className="inline-flex items-center gap-1">
                  Beschreibung Rücknahmesystem
                  {sortKey === 'ruecknahmesystem' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ppwr_quoten_zuordnung')}>
                <span className="inline-flex items-center gap-1">
                  Zuordnung zu PPWR-Quoten
                  {sortKey === 'ppwr_quoten_zuordnung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kennzeichnung_vollstaendig')}>
                <span className="inline-flex items-center gap-1">
                  Kennzeichnung vollständig
                  {sortKey === 'kennzeichnung_vollstaendig' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kennzeichnung_hinweise')}>
                <span className="inline-flex items-center gap-1">
                  Hinweise zur Kennzeichnung
                  {sortKey === 'kennzeichnung_hinweise' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getUnternehmenDisplayName(record.fields.unternehmen_ref)}</span></TableCell>
                <TableCell className="font-medium">{record.fields.verpackungs_id ?? '—'}</TableCell>
                <TableCell>{record.fields.verpackungsname ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.beschreibung ?? '—'}</span></TableCell>
                <TableCell>{record.fields.produktkategorie ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.verwendungszweck?.label ?? '—'}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.material_hauptkategorie?.label ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.materialzusammensetzung ?? '—'}</span></TableCell>
                <TableCell>{record.fields.material_einzelmaterialien ?? '—'}</TableCell>
                <TableCell>{record.fields.material_prozentsaetze ?? '—'}</TableCell>
                <TableCell>{record.fields.material_gewichte_g ?? '—'}</TableCell>
                <TableCell>{record.fields.laenge_mm ?? '—'}</TableCell>
                <TableCell>{record.fields.breite_mm ?? '—'}</TableCell>
                <TableCell>{record.fields.hoehe_mm ?? '—'}</TableCell>
                <TableCell>{record.fields.wandstaerke_mm ?? '—'}</TableCell>
                <TableCell>{record.fields.volumen_ml ?? '—'}</TableCell>
                <TableCell>{record.fields.gesamtgewicht_g ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklat_postconsumer_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklat_postconsumer_kg_jahr ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklat_postindustrial_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklat_postindustrial_kg_jahr ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.recyclingfaehigkeit_kategorie?.label ?? '—'}</span></TableCell>
                <TableCell>{record.fields.recyclingfaehigkeit_score ?? '—'}</TableCell>
                <TableCell>{record.fields.recyclingfaehigkeit_referenz ?? '—'}</TableCell>
                <TableCell><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${record.fields.mehrwegfaehig ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{record.fields.mehrwegfaehig ? 'Ja' : 'Nein'}</span></TableCell>
                <TableCell>{record.fields.erwartete_umlaeufe ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.ruecknahmesystem ?? '—'}</span></TableCell>
                <TableCell>{Array.isArray(record.fields.ppwr_quoten_zuordnung) ? record.fields.ppwr_quoten_zuordnung.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>
                <TableCell><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${record.fields.kennzeichnung_vollstaendig ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{record.fields.kennzeichnung_vollstaendig ? 'Ja' : 'Nein'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.kennzeichnung_hinweise ?? '—'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={31} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Verpackungstypen. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <VerpackungstypenDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        unternehmenList={unternehmenList}
        enablePhotoScan={AI_PHOTO_SCAN['Verpackungstypen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Verpackungstypen']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Verpackungstypen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <VerpackungstypenViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        unternehmenList={unternehmenList}
      />
    </PageShell>
  );
}