import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Kennzahlen, Unternehmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { KennzahlenDialog } from '@/components/dialogs/KennzahlenDialog';
import { KennzahlenViewDialog } from '@/components/dialogs/KennzahlenViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

export default function KennzahlenPage() {
  const [records, setRecords] = useState<Kennzahlen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Kennzahlen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kennzahlen | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Kennzahlen | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [unternehmenList, setUnternehmenList] = useState<Unternehmen[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, unternehmenData] = await Promise.all([
        LivingAppsService.getKennzahlen(),
        LivingAppsService.getUnternehmen(),
      ]);
      setRecords(mainData);
      setUnternehmenList(unternehmenData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Kennzahlen['fields']) {
    await LivingAppsService.createKennzahlenEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Kennzahlen['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateKennzahlenEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteKennzahlenEntry(deleteTarget.record_id);
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
      title="Kennzahlen"
      subtitle={`${records.length} Kennzahlen im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kennzahlen suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('unternehmen_kpi_ref')}>
                <span className="inline-flex items-center gap-1">
                  Unternehmen
                  {sortKey === 'unternehmen_kpi_ref' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('berichtsjahr')}>
                <span className="inline-flex items-center gap-1">
                  Berichtsjahr
                  {sortKey === 'berichtsjahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('standort')}>
                <span className="inline-flex items-center gap-1">
                  Standort / Werk
                  {sortKey === 'standort' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gesamtmenge_kg')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtmenge Verpackungen (kg/Jahr)
                  {sortKey === 'gesamtmenge_kg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('menge_kunststoff_kg')}>
                <span className="inline-flex items-center gap-1">
                  Menge Kunststoff (kg/Jahr)
                  {sortKey === 'menge_kunststoff_kg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('menge_papier_pappe_kg')}>
                <span className="inline-flex items-center gap-1">
                  Menge Papier/Pappe (kg/Jahr)
                  {sortKey === 'menge_papier_pappe_kg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('menge_glas_kg')}>
                <span className="inline-flex items-center gap-1">
                  Menge Glas (kg/Jahr)
                  {sortKey === 'menge_glas_kg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('menge_metall_kg')}>
                <span className="inline-flex items-center gap-1">
                  Menge Metall (kg/Jahr)
                  {sortKey === 'menge_metall_kg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('menge_verbund_kg')}>
                <span className="inline-flex items-center gap-1">
                  Menge Verbund (kg/Jahr)
                  {sortKey === 'menge_verbund_kg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklatanteil_gesamt_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Rezyklatanteil gesamt (%)
                  {sortKey === 'rezyklatanteil_gesamt_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklatanteil_kunststoff_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Rezyklatanteil Kunststoff (%)
                  {sortKey === 'rezyklatanteil_kunststoff_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklatanteil_papier_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Rezyklatanteil Papier/Pappe (%)
                  {sortKey === 'rezyklatanteil_papier_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklatanteil_glas_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Rezyklatanteil Glas (%)
                  {sortKey === 'rezyklatanteil_glas_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rezyklatanteil_metall_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Rezyklatanteil Metall (%)
                  {sortKey === 'rezyklatanteil_metall_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('mehrwegquote_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Mehrwegquote (%)
                  {sortKey === 'mehrwegquote_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('recyclingfaehigkeitsquote_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Anteil recyclingfähiger Verpackungen (%)
                  {sortKey === 'recyclingfaehigkeitsquote_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anzahl_verpackungstypen')}>
                <span className="inline-flex items-center gap-1">
                  Anzahl Verpackungstypen gesamt
                  {sortKey === 'anzahl_verpackungstypen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anzahl_konform')}>
                <span className="inline-flex items-center gap-1">
                  Davon konform
                  {sortKey === 'anzahl_konform' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anzahl_kritisch')}>
                <span className="inline-flex items-center gap-1">
                  Davon kritisch
                  {sortKey === 'anzahl_kritisch' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anzahl_nicht_konform')}>
                <span className="inline-flex items-center gap-1">
                  Davon nicht konform
                  {sortKey === 'anzahl_nicht_konform' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kpi_hinweise')}>
                <span className="inline-flex items-center gap-1">
                  Hinweise / Anmerkungen
                  {sortKey === 'kpi_hinweise' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getUnternehmenDisplayName(record.fields.unternehmen_kpi_ref)}</span></TableCell>
                <TableCell>{record.fields.berichtsjahr ?? '—'}</TableCell>
                <TableCell className="font-medium">{record.fields.standort ?? '—'}</TableCell>
                <TableCell>{record.fields.gesamtmenge_kg ?? '—'}</TableCell>
                <TableCell>{record.fields.menge_kunststoff_kg ?? '—'}</TableCell>
                <TableCell>{record.fields.menge_papier_pappe_kg ?? '—'}</TableCell>
                <TableCell>{record.fields.menge_glas_kg ?? '—'}</TableCell>
                <TableCell>{record.fields.menge_metall_kg ?? '—'}</TableCell>
                <TableCell>{record.fields.menge_verbund_kg ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklatanteil_gesamt_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklatanteil_kunststoff_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklatanteil_papier_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklatanteil_glas_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.rezyklatanteil_metall_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.mehrwegquote_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.recyclingfaehigkeitsquote_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.anzahl_verpackungstypen ?? '—'}</TableCell>
                <TableCell>{record.fields.anzahl_konform ?? '—'}</TableCell>
                <TableCell>{record.fields.anzahl_kritisch ?? '—'}</TableCell>
                <TableCell>{record.fields.anzahl_nicht_konform ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.kpi_hinweise ?? '—'}</span></TableCell>
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
                <TableCell colSpan={22} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Kennzahlen. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <KennzahlenDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        unternehmenList={unternehmenList}
        enablePhotoScan={AI_PHOTO_SCAN['Kennzahlen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlen']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Kennzahlen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <KennzahlenViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        unternehmenList={unternehmenList}
      />
    </PageShell>
  );
}