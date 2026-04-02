import type { Regelstatus, Verpackungstypen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface RegelstatusViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Regelstatus | null;
  onEdit: (record: Regelstatus) => void;
  verpackungstypenList: Verpackungstypen[];
}

export function RegelstatusViewDialog({ open, onClose, record, onEdit, verpackungstypenList }: RegelstatusViewDialogProps) {
  function getVerpackungstypenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return verpackungstypenList.find(r => r.record_id === id)?.fields.verpackungs_id ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regelstatus anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verpackungstyp</Label>
            <p className="text-sm">{getVerpackungstypenDisplayName(record.fields.verpackungstyp_status_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">PPWR-Konformitätsstatus</Label>
            <Badge variant="secondary">{record.fields.konformitaetsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datenlücke vorhanden</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.datanluecke_flag ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.datanluecke_flag ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erkannte Problemfelder</Label>
            <p className="text-sm">{Array.isArray(record.fields.problemfelder) ? record.fields.problemfelder.map((v: any) => v?.label ?? v).join(', ') : '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kommentar / Maßnahmenempfehlung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.status_kommentar ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Bewertung</Label>
            <p className="text-sm">{formatDate(record.fields.bewertungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname bewertende Person</Label>
            <p className="text-sm">{record.fields.bewerter_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname bewertende Person</Label>
            <p className="text-sm">{record.fields.bewerter_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abteilung</Label>
            <p className="text-sm">{record.fields.bewerter_abteilung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}