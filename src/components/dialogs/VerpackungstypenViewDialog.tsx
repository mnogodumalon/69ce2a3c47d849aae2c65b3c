import type { Verpackungstypen, Unternehmen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface VerpackungstypenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Verpackungstypen | null;
  onEdit: (record: Verpackungstypen) => void;
  unternehmenList: Unternehmen[];
}

export function VerpackungstypenViewDialog({ open, onClose, record, onEdit, unternehmenList }: VerpackungstypenViewDialogProps) {
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
          <DialogTitle>Verpackungstypen anzeigen</DialogTitle>
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
            <p className="text-sm">{getUnternehmenDisplayName(record.fields.unternehmen_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verpackungs-ID</Label>
            <p className="text-sm">{record.fields.verpackungs_id ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name der Verpackung</Label>
            <p className="text-sm">{record.fields.verpackungsname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Produktkategorie</Label>
            <p className="text-sm">{record.fields.produktkategorie ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verwendungszweck</Label>
            <Badge variant="secondary">{record.fields.verwendungszweck?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Material-Hauptkategorie</Label>
            <Badge variant="secondary">{record.fields.material_hauptkategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Detaillierte Materialzusammensetzung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.materialzusammensetzung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einzelmaterialien (Bezeichnung)</Label>
            <p className="text-sm">{record.fields.material_einzelmaterialien ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Materialanteile in %</Label>
            <p className="text-sm">{record.fields.material_prozentsaetze ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Materialgewichte in Gramm</Label>
            <p className="text-sm">{record.fields.material_gewichte_g ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Länge (mm)</Label>
            <p className="text-sm">{record.fields.laenge_mm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Breite (mm)</Label>
            <p className="text-sm">{record.fields.breite_mm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Höhe (mm)</Label>
            <p className="text-sm">{record.fields.hoehe_mm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wandstärke (mm)</Label>
            <p className="text-sm">{record.fields.wandstaerke_mm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Volumen (ml)</Label>
            <p className="text-sm">{record.fields.volumen_ml ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtgewicht (g)</Label>
            <p className="text-sm">{record.fields.gesamtgewicht_g ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Post-Consumer-Rezyklatanteil (%)</Label>
            <p className="text-sm">{record.fields.rezyklat_postconsumer_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Post-Consumer-Rezyklat (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.rezyklat_postconsumer_kg_jahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Post-Industrial-Rezyklatanteil (%)</Label>
            <p className="text-sm">{record.fields.rezyklat_postindustrial_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Post-Industrial-Rezyklat (kg/Jahr)</Label>
            <p className="text-sm">{record.fields.rezyklat_postindustrial_kg_jahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Recyclingfähigkeit – Kategorie</Label>
            <Badge variant="secondary">{record.fields.recyclingfaehigkeit_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Recyclingfähigkeit – Score (0–100)</Label>
            <p className="text-sm">{record.fields.recyclingfaehigkeit_score ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Referenz Prüfstandard / Gutachten</Label>
            <p className="text-sm">{record.fields.recyclingfaehigkeit_referenz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mehrwegfähig</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.mehrwegfaehig ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.mehrwegfaehig ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erwartete Umläufe</Label>
            <p className="text-sm">{record.fields.erwartete_umlaeufe ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung Rücknahmesystem</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ruecknahmesystem ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zuordnung zu PPWR-Quoten</Label>
            <p className="text-sm">{Array.isArray(record.fields.ppwr_quoten_zuordnung) ? record.fields.ppwr_quoten_zuordnung.map((v: any) => v?.label ?? v).join(', ') : '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kennzeichnung vollständig</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.kennzeichnung_vollstaendig ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.kennzeichnung_vollstaendig ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweise zur Kennzeichnung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.kennzeichnung_hinweise ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}