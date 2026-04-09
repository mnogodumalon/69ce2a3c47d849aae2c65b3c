import { useState, useEffect, useRef, useCallback } from 'react';
import type { Kennzahlen, Unternehmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';

interface KennzahlenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kennzahlen['fields']) => Promise<void>;
  defaultValues?: Kennzahlen['fields'];
  unternehmenList: Unternehmen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function KennzahlenDialog({ open, onClose, onSubmit, defaultValues, unternehmenList, enablePhotoScan = true, enablePhotoLocation = true }: KennzahlenDialogProps) {
  const [fields, setFields] = useState<Partial<Kennzahlen['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'kennzahlen');
      await onSubmit(clean as Kennzahlen['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="unternehmen_kpi_ref" entity="Unternehmen">\n${JSON.stringify(unternehmenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "unternehmen_kpi_ref": string | null, // Display name from Unternehmen (see <available-records>)\n  "berichtsjahr": number | null, // Berichtsjahr\n  "standort": string | null, // Standort / Werk\n  "gesamtmenge_kg": number | null, // Gesamtmenge Verpackungen (kg/Jahr)\n  "menge_kunststoff_kg": number | null, // Menge Kunststoff (kg/Jahr)\n  "menge_papier_pappe_kg": number | null, // Menge Papier/Pappe (kg/Jahr)\n  "menge_glas_kg": number | null, // Menge Glas (kg/Jahr)\n  "menge_metall_kg": number | null, // Menge Metall (kg/Jahr)\n  "menge_verbund_kg": number | null, // Menge Verbund (kg/Jahr)\n  "rezyklatanteil_gesamt_prozent": number | null, // Rezyklatanteil gesamt (%)\n  "rezyklatanteil_kunststoff_prozent": number | null, // Rezyklatanteil Kunststoff (%)\n  "rezyklatanteil_papier_prozent": number | null, // Rezyklatanteil Papier/Pappe (%)\n  "rezyklatanteil_glas_prozent": number | null, // Rezyklatanteil Glas (%)\n  "rezyklatanteil_metall_prozent": number | null, // Rezyklatanteil Metall (%)\n  "mehrwegquote_prozent": number | null, // Mehrwegquote (%)\n  "recyclingfaehigkeitsquote_prozent": number | null, // Anteil recyclingfähiger Verpackungen (%)\n  "anzahl_verpackungstypen": number | null, // Anzahl Verpackungstypen gesamt\n  "anzahl_konform": number | null, // Davon konform\n  "anzahl_kritisch": number | null, // Davon kritisch\n  "anzahl_nicht_konform": number | null, // Davon nicht konform\n  "kpi_hinweise": string | null, // Hinweise / Anmerkungen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["unternehmen_kpi_ref"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const unternehmen_kpi_refName = raw['unternehmen_kpi_ref'] as string | null;
        if (unternehmen_kpi_refName) {
          const unternehmen_kpi_refMatch = unternehmenList.find(r => matchName(unternehmen_kpi_refName!, [String(r.fields.firmenname ?? '')]));
          if (unternehmen_kpi_refMatch) merged['unternehmen_kpi_ref'] = createRecordUrl(APP_IDS.UNTERNEHMEN, unternehmen_kpi_refMatch.record_id);
        }
        return merged as Partial<Kennzahlen['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Kennzahlen bearbeiten' : 'Kennzahlen hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unternehmen_kpi_ref">Unternehmen</Label>
            <Select
              value={extractRecordId(fields.unternehmen_kpi_ref) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, unternehmen_kpi_ref: v === 'none' ? undefined : createRecordUrl(APP_IDS.UNTERNEHMEN, v) }))}
            >
              <SelectTrigger id="unternehmen_kpi_ref"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {unternehmenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.firmenname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="berichtsjahr">Berichtsjahr</Label>
            <Input
              id="berichtsjahr"
              type="number"
              value={fields.berichtsjahr ?? ''}
              onChange={e => setFields(f => ({ ...f, berichtsjahr: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="standort">Standort / Werk</Label>
            <Input
              id="standort"
              value={fields.standort ?? ''}
              onChange={e => setFields(f => ({ ...f, standort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtmenge_kg">Gesamtmenge Verpackungen (kg/Jahr)</Label>
            <Input
              id="gesamtmenge_kg"
              type="number"
              value={fields.gesamtmenge_kg ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtmenge_kg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_kunststoff_kg">Menge Kunststoff (kg/Jahr)</Label>
            <Input
              id="menge_kunststoff_kg"
              type="number"
              value={fields.menge_kunststoff_kg ?? ''}
              onChange={e => setFields(f => ({ ...f, menge_kunststoff_kg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_papier_pappe_kg">Menge Papier/Pappe (kg/Jahr)</Label>
            <Input
              id="menge_papier_pappe_kg"
              type="number"
              value={fields.menge_papier_pappe_kg ?? ''}
              onChange={e => setFields(f => ({ ...f, menge_papier_pappe_kg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_glas_kg">Menge Glas (kg/Jahr)</Label>
            <Input
              id="menge_glas_kg"
              type="number"
              value={fields.menge_glas_kg ?? ''}
              onChange={e => setFields(f => ({ ...f, menge_glas_kg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_metall_kg">Menge Metall (kg/Jahr)</Label>
            <Input
              id="menge_metall_kg"
              type="number"
              value={fields.menge_metall_kg ?? ''}
              onChange={e => setFields(f => ({ ...f, menge_metall_kg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_verbund_kg">Menge Verbund (kg/Jahr)</Label>
            <Input
              id="menge_verbund_kg"
              type="number"
              value={fields.menge_verbund_kg ?? ''}
              onChange={e => setFields(f => ({ ...f, menge_verbund_kg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_gesamt_prozent">Rezyklatanteil gesamt (%)</Label>
            <Input
              id="rezyklatanteil_gesamt_prozent"
              type="number"
              value={fields.rezyklatanteil_gesamt_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklatanteil_gesamt_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_kunststoff_prozent">Rezyklatanteil Kunststoff (%)</Label>
            <Input
              id="rezyklatanteil_kunststoff_prozent"
              type="number"
              value={fields.rezyklatanteil_kunststoff_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklatanteil_kunststoff_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_papier_prozent">Rezyklatanteil Papier/Pappe (%)</Label>
            <Input
              id="rezyklatanteil_papier_prozent"
              type="number"
              value={fields.rezyklatanteil_papier_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklatanteil_papier_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_glas_prozent">Rezyklatanteil Glas (%)</Label>
            <Input
              id="rezyklatanteil_glas_prozent"
              type="number"
              value={fields.rezyklatanteil_glas_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklatanteil_glas_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_metall_prozent">Rezyklatanteil Metall (%)</Label>
            <Input
              id="rezyklatanteil_metall_prozent"
              type="number"
              value={fields.rezyklatanteil_metall_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklatanteil_metall_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mehrwegquote_prozent">Mehrwegquote (%)</Label>
            <Input
              id="mehrwegquote_prozent"
              type="number"
              value={fields.mehrwegquote_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, mehrwegquote_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recyclingfaehigkeitsquote_prozent">Anteil recyclingfähiger Verpackungen (%)</Label>
            <Input
              id="recyclingfaehigkeitsquote_prozent"
              type="number"
              value={fields.recyclingfaehigkeitsquote_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, recyclingfaehigkeitsquote_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_verpackungstypen">Anzahl Verpackungstypen gesamt</Label>
            <Input
              id="anzahl_verpackungstypen"
              type="number"
              value={fields.anzahl_verpackungstypen ?? ''}
              onChange={e => setFields(f => ({ ...f, anzahl_verpackungstypen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_konform">Davon konform</Label>
            <Input
              id="anzahl_konform"
              type="number"
              value={fields.anzahl_konform ?? ''}
              onChange={e => setFields(f => ({ ...f, anzahl_konform: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_kritisch">Davon kritisch</Label>
            <Input
              id="anzahl_kritisch"
              type="number"
              value={fields.anzahl_kritisch ?? ''}
              onChange={e => setFields(f => ({ ...f, anzahl_kritisch: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_nicht_konform">Davon nicht konform</Label>
            <Input
              id="anzahl_nicht_konform"
              type="number"
              value={fields.anzahl_nicht_konform ?? ''}
              onChange={e => setFields(f => ({ ...f, anzahl_nicht_konform: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kpi_hinweise">Hinweise / Anmerkungen</Label>
            <Textarea
              id="kpi_hinweise"
              value={fields.kpi_hinweise ?? ''}
              onChange={e => setFields(f => ({ ...f, kpi_hinweise: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}