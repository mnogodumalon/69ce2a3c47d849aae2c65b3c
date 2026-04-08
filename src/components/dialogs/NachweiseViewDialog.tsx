import type { Nachweise, Verpackungstypen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface NachweiseViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Nachweise | null;
  onEdit: (record: Nachweise) => void;
  verpackungstypenList: Verpackungstypen[];
}

export function NachweiseViewDialog({ open, onClose, record, onEdit, verpackungstypenList }: NachweiseViewDialogProps) {
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
          <DialogTitle>Nachweise anzeigen</DialogTitle>
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
            <p className="text-sm">{getVerpackungstypenDisplayName(record.fields.verpackungstyp_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokumentart</Label>
            <Badge variant="secondary">{record.fields.dokumentart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aussteller</Label>
            <p className="text-sm">{record.fields.aussteller ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausstellungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.ausstellungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gültig bis</Label>
            <p className="text-sm">{formatDate(record.fields.gueltig_bis)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokument (Datei-Upload)</Label>
            {record.fields.dokument_datei ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.dokument_datei} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokument-Link (URL)</Label>
            <p className="text-sm">{record.fields.dokument_url ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweise / Anmerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.nachweis_hinweise ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}