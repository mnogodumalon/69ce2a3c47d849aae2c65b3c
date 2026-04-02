import type { Kennzahlen, Unternehmen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface KennzahlenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Kennzahlen | null;
  onEdit: (record: Kennzahlen) => void;
  unternehmenList: Unternehmen[];
}

export function KennzahlenViewDialog({ open, onClose, record, onEdit, unternehmenList }: KennzahlenViewDialogProps) {
  function getUnternehmenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmenList.find(r => r.record_id === id)?.fields.firmenname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kennzahlen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmen</Label>
            <p className="text-sm">{getUnternehmenDisplayName(record.fields.unternehmen_kpi_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berichtsjahr</Label>
            <p className="text-sm">{record.fields.berichtsjahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Standort / Werk</Label>
            <p className="text-sm">{record.fields.standort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtmenge Verpackungen (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.gesamtmenge_kg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge Kunststoff (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.menge_kunststoff_kg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge Papier/Pappe (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.menge_papier_pappe_kg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge Glas (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.menge_glas_kg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge Metall (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.menge_metall_kg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge Verbund (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.menge_verbund_kg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rezyklatanteil gesamt (%)</Label>
            <p className="text-sm">{record.fields.rezyklatanteil_gesamt_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rezyklatanteil Kunststoff (%)</Label>
            <p className="text-sm">{record.fields.rezyklatanteil_kunststoff_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rezyklatanteil Papier/Pappe (%)</Label>
            <p className="text-sm">{record.fields.rezyklatanteil_papier_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rezyklatanteil Glas (%)</Label>
            <p className="text-sm">{record.fields.rezyklatanteil_glas_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rezyklatanteil Metall (%)</Label>
            <p className="text-sm">{record.fields.rezyklatanteil_metall_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mehrwegquote (%)</Label>
            <p className="text-sm">{record.fields.mehrwegquote_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anteil recyclingfähiger Verpackungen (%)</Label>
            <p className="text-sm">{record.fields.recyclingfaehigkeitsquote_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl Verpackungstypen gesamt</Label>
            <p className="text-sm">{record.fields.anzahl_verpackungstypen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Davon konform</Label>
            <p className="text-sm">{record.fields.anzahl_konform ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Davon kritisch</Label>
            <p className="text-sm">{record.fields.anzahl_kritisch ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Davon nicht konform</Label>
            <p className="text-sm">{record.fields.anzahl_nicht_konform ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweise / Anmerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kpi_hinweise ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}