import type { Unternehmen } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface UnternehmenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Unternehmen | null;
  onEdit: (record: Unternehmen) => void;
}

export function UnternehmenViewDialog({ open, onClose, record, onEdit }: UnternehmenViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unternehmen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Firmenname</Label>
            <p className="text-sm">{record.fields.firmenname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Straße</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hausnummer</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Postleitzahl</Label>
            <p className="text-sm">{record.fields.plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ort</Label>
            <p className="text-sm">{record.fields.ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tätigkeitsländer</Label>
            <p className="text-sm">{record.fields.laender ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname Ansprechpartner</Label>
            <p className="text-sm">{record.fields.ansprechpartner_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname Ansprechpartner</Label>
            <p className="text-sm">{record.fields.ansprechpartner_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail Ansprechpartner</Label>
            <p className="text-sm">{record.fields.ansprechpartner_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefon Ansprechpartner</Label>
            <p className="text-sm">{record.fields.ansprechpartner_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Steuernummer / USt-IdNr.</Label>
            <p className="text-sm">{record.fields.steuernummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EPR-Registrierungsnummern (je Land)</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.epr_registrierungsnummern ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname verantwortliche Person</Label>
            <p className="text-sm">{record.fields.verantwortlich_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname verantwortliche Person</Label>
            <p className="text-sm">{record.fields.verantwortlich_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Funktion / Position</Label>
            <p className="text-sm">{record.fields.verantwortlich_funktion ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail verantwortliche Person</Label>
            <p className="text-sm">{record.fields.verantwortlich_email ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}