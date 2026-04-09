import { useState, useEffect, useRef, useCallback } from 'react';
import type { Verpackungstypen, Unternehmen } from '@/types/app';
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
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface VerpackungstypenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Verpackungstypen['fields']) => Promise<void>;
  defaultValues?: Verpackungstypen['fields'];
  unternehmenList: Unternehmen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function VerpackungstypenDialog({ open, onClose, onSubmit, defaultValues, unternehmenList, enablePhotoScan = true, enablePhotoLocation = true }: VerpackungstypenDialogProps) {
  const [fields, setFields] = useState<Partial<Verpackungstypen['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'verpackungstypen');
      await onSubmit(clean as Verpackungstypen['fields']);
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
      contextParts.push(`<available-records field="unternehmen_ref" entity="Unternehmen">\n${JSON.stringify(unternehmenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "unternehmen_ref": string | null, // Display name from Unternehmen (see <available-records>)\n  "verpackungs_id": string | null, // Verpackungs-ID\n  "verpackungsname": string | null, // Name der Verpackung\n  "beschreibung": string | null, // Beschreibung\n  "produktkategorie": string | null, // Produktkategorie\n  "verwendungszweck": LookupValue | null, // Verwendungszweck (select one key: "verkaufsverpackung" | "versandverpackung" | "transportverpackung" | "serviceverpackung") mapping: verkaufsverpackung=Verkaufsverpackung, versandverpackung=Versandverpackung, transportverpackung=Transportverpackung, serviceverpackung=Serviceverpackung\n  "material_hauptkategorie": LookupValue | null, // Material-Hauptkategorie (select one key: "kunststoff" | "papier_pappe" | "glas" | "metall" | "verbund" | "sonstiges") mapping: kunststoff=Kunststoff, papier_pappe=Papier/Pappe, glas=Glas, metall=Metall, verbund=Verbund, sonstiges=Sonstiges\n  "materialzusammensetzung": string | null, // Detaillierte Materialzusammensetzung\n  "material_einzelmaterialien": string | null, // Einzelmaterialien (Bezeichnung)\n  "material_prozentsaetze": string | null, // Materialanteile in %\n  "material_gewichte_g": string | null, // Materialgewichte in Gramm\n  "laenge_mm": number | null, // Länge (mm)\n  "breite_mm": number | null, // Breite (mm)\n  "hoehe_mm": number | null, // Höhe (mm)\n  "wandstaerke_mm": number | null, // Wandstärke (mm)\n  "volumen_ml": number | null, // Volumen (ml)\n  "gesamtgewicht_g": number | null, // Gesamtgewicht (g)\n  "rezyklat_postconsumer_prozent": number | null, // Post-Consumer-Rezyklatanteil (%)\n  "rezyklat_postconsumer_kg_jahr": number | null, // Post-Consumer-Rezyklat (kg/Jahr)\n  "rezyklat_postindustrial_prozent": number | null, // Post-Industrial-Rezyklatanteil (%)\n  "rezyklat_postindustrial_kg_jahr": number | null, // Post-Industrial-Rezyklat (kg/Jahr)\n  "recyclingfaehigkeit_kategorie": LookupValue | null, // Recyclingfähigkeit – Kategorie (select one key: "gut_recyclingfaehig" | "eingeschraenkt_recyclingfaehig" | "nicht_recyclingfaehig" | "nicht_bewertet") mapping: gut_recyclingfaehig=Gut recyclingfähig, eingeschraenkt_recyclingfaehig=Eingeschränkt recyclingfähig, nicht_recyclingfaehig=Nicht recyclingfähig, nicht_bewertet=Nicht bewertet\n  "recyclingfaehigkeit_score": number | null, // Recyclingfähigkeit – Score (0–100)\n  "recyclingfaehigkeit_referenz": string | null, // Referenz Prüfstandard / Gutachten\n  "mehrwegfaehig": boolean | null, // Mehrwegfähig\n  "erwartete_umlaeufe": number | null, // Erwartete Umläufe\n  "ruecknahmesystem": string | null, // Beschreibung Rücknahmesystem\n  "ppwr_quoten_zuordnung": LookupValue[] | null, // Zuordnung zu PPWR-Quoten (select one or more keys: "rezyklatquote" | "mehrwegquote" | "recyclingfaehigkeitsquote") mapping: rezyklatquote=Rezyklatquote, mehrwegquote=Mehrwegquote, recyclingfaehigkeitsquote=Recyclingfähigkeitsquote\n  "kennzeichnung_vollstaendig": boolean | null, // Kennzeichnung vollständig\n  "kennzeichnung_hinweise": string | null, // Hinweise zur Kennzeichnung\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["unternehmen_ref"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const unternehmen_refName = raw['unternehmen_ref'] as string | null;
        if (unternehmen_refName) {
          const unternehmen_refMatch = unternehmenList.find(r => matchName(unternehmen_refName!, [String(r.fields.firmenname ?? '')]));
          if (unternehmen_refMatch) merged['unternehmen_ref'] = createRecordUrl(APP_IDS.UNTERNEHMEN, unternehmen_refMatch.record_id);
        }
        return merged as Partial<Verpackungstypen['fields']>;
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

  const DIALOG_INTENT = defaultValues ? 'Verpackungstypen bearbeiten' : 'Verpackungstypen hinzufügen';

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
            <Label htmlFor="unternehmen_ref">Unternehmen</Label>
            <Select
              value={extractRecordId(fields.unternehmen_ref) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, unternehmen_ref: v === 'none' ? undefined : createRecordUrl(APP_IDS.UNTERNEHMEN, v) }))}
            >
              <SelectTrigger id="unternehmen_ref"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="verpackungs_id">Verpackungs-ID</Label>
            <Input
              id="verpackungs_id"
              value={fields.verpackungs_id ?? ''}
              onChange={e => setFields(f => ({ ...f, verpackungs_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verpackungsname">Name der Verpackung</Label>
            <Input
              id="verpackungsname"
              value={fields.verpackungsname ?? ''}
              onChange={e => setFields(f => ({ ...f, verpackungsname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="produktkategorie">Produktkategorie</Label>
            <Input
              id="produktkategorie"
              value={fields.produktkategorie ?? ''}
              onChange={e => setFields(f => ({ ...f, produktkategorie: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verwendungszweck">Verwendungszweck</Label>
            <Select
              value={lookupKey(fields.verwendungszweck) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, verwendungszweck: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="verwendungszweck"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="verkaufsverpackung">Verkaufsverpackung</SelectItem>
                <SelectItem value="versandverpackung">Versandverpackung</SelectItem>
                <SelectItem value="transportverpackung">Transportverpackung</SelectItem>
                <SelectItem value="serviceverpackung">Serviceverpackung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="material_hauptkategorie">Material-Hauptkategorie</Label>
            <Select
              value={lookupKey(fields.material_hauptkategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, material_hauptkategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="material_hauptkategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="kunststoff">Kunststoff</SelectItem>
                <SelectItem value="papier_pappe">Papier/Pappe</SelectItem>
                <SelectItem value="glas">Glas</SelectItem>
                <SelectItem value="metall">Metall</SelectItem>
                <SelectItem value="verbund">Verbund</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialzusammensetzung">Detaillierte Materialzusammensetzung</Label>
            <Textarea
              id="materialzusammensetzung"
              value={fields.materialzusammensetzung ?? ''}
              onChange={e => setFields(f => ({ ...f, materialzusammensetzung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material_einzelmaterialien">Einzelmaterialien (Bezeichnung)</Label>
            <Input
              id="material_einzelmaterialien"
              value={fields.material_einzelmaterialien ?? ''}
              onChange={e => setFields(f => ({ ...f, material_einzelmaterialien: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material_prozentsaetze">Materialanteile in %</Label>
            <Input
              id="material_prozentsaetze"
              value={fields.material_prozentsaetze ?? ''}
              onChange={e => setFields(f => ({ ...f, material_prozentsaetze: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material_gewichte_g">Materialgewichte in Gramm</Label>
            <Input
              id="material_gewichte_g"
              value={fields.material_gewichte_g ?? ''}
              onChange={e => setFields(f => ({ ...f, material_gewichte_g: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="laenge_mm">Länge (mm)</Label>
            <Input
              id="laenge_mm"
              type="number"
              value={fields.laenge_mm ?? ''}
              onChange={e => setFields(f => ({ ...f, laenge_mm: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="breite_mm">Breite (mm)</Label>
            <Input
              id="breite_mm"
              type="number"
              value={fields.breite_mm ?? ''}
              onChange={e => setFields(f => ({ ...f, breite_mm: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hoehe_mm">Höhe (mm)</Label>
            <Input
              id="hoehe_mm"
              type="number"
              value={fields.hoehe_mm ?? ''}
              onChange={e => setFields(f => ({ ...f, hoehe_mm: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wandstaerke_mm">Wandstärke (mm)</Label>
            <Input
              id="wandstaerke_mm"
              type="number"
              value={fields.wandstaerke_mm ?? ''}
              onChange={e => setFields(f => ({ ...f, wandstaerke_mm: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="volumen_ml">Volumen (ml)</Label>
            <Input
              id="volumen_ml"
              type="number"
              value={fields.volumen_ml ?? ''}
              onChange={e => setFields(f => ({ ...f, volumen_ml: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtgewicht_g">Gesamtgewicht (g)</Label>
            <Input
              id="gesamtgewicht_g"
              type="number"
              value={fields.gesamtgewicht_g ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtgewicht_g: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postconsumer_prozent">Post-Consumer-Rezyklatanteil (%)</Label>
            <Input
              id="rezyklat_postconsumer_prozent"
              type="number"
              value={fields.rezyklat_postconsumer_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklat_postconsumer_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postconsumer_kg_jahr">Post-Consumer-Rezyklat (kg/Jahr)</Label>
            <Input
              id="rezyklat_postconsumer_kg_jahr"
              type="number"
              value={fields.rezyklat_postconsumer_kg_jahr ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklat_postconsumer_kg_jahr: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postindustrial_prozent">Post-Industrial-Rezyklatanteil (%)</Label>
            <Input
              id="rezyklat_postindustrial_prozent"
              type="number"
              value={fields.rezyklat_postindustrial_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklat_postindustrial_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postindustrial_kg_jahr">Post-Industrial-Rezyklat (kg/Jahr)</Label>
            <Input
              id="rezyklat_postindustrial_kg_jahr"
              type="number"
              value={fields.rezyklat_postindustrial_kg_jahr ?? ''}
              onChange={e => setFields(f => ({ ...f, rezyklat_postindustrial_kg_jahr: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recyclingfaehigkeit_kategorie">Recyclingfähigkeit – Kategorie</Label>
            <Select
              value={lookupKey(fields.recyclingfaehigkeit_kategorie) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, recyclingfaehigkeit_kategorie: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="recyclingfaehigkeit_kategorie"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="gut_recyclingfaehig">Gut recyclingfähig</SelectItem>
                <SelectItem value="eingeschraenkt_recyclingfaehig">Eingeschränkt recyclingfähig</SelectItem>
                <SelectItem value="nicht_recyclingfaehig">Nicht recyclingfähig</SelectItem>
                <SelectItem value="nicht_bewertet">Nicht bewertet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recyclingfaehigkeit_score">Recyclingfähigkeit – Score (0–100)</Label>
            <Input
              id="recyclingfaehigkeit_score"
              type="number"
              value={fields.recyclingfaehigkeit_score ?? ''}
              onChange={e => setFields(f => ({ ...f, recyclingfaehigkeit_score: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recyclingfaehigkeit_referenz">Referenz Prüfstandard / Gutachten</Label>
            <Input
              id="recyclingfaehigkeit_referenz"
              value={fields.recyclingfaehigkeit_referenz ?? ''}
              onChange={e => setFields(f => ({ ...f, recyclingfaehigkeit_referenz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mehrwegfaehig">Mehrwegfähig</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="mehrwegfaehig"
                checked={!!fields.mehrwegfaehig}
                onCheckedChange={(v) => setFields(f => ({ ...f, mehrwegfaehig: !!v }))}
              />
              <Label htmlFor="mehrwegfaehig" className="font-normal">Mehrwegfähig</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="erwartete_umlaeufe">Erwartete Umläufe</Label>
            <Input
              id="erwartete_umlaeufe"
              type="number"
              value={fields.erwartete_umlaeufe ?? ''}
              onChange={e => setFields(f => ({ ...f, erwartete_umlaeufe: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ruecknahmesystem">Beschreibung Rücknahmesystem</Label>
            <Textarea
              id="ruecknahmesystem"
              value={fields.ruecknahmesystem ?? ''}
              onChange={e => setFields(f => ({ ...f, ruecknahmesystem: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ppwr_quoten_zuordnung">Zuordnung zu PPWR-Quoten</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ppwr_quoten_zuordnung_rezyklatquote"
                  checked={lookupKeys(fields.ppwr_quoten_zuordnung).includes('rezyklatquote')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ppwr_quoten_zuordnung);
                      const next = checked ? [...current, 'rezyklatquote'] : current.filter(k => k !== 'rezyklatquote');
                      return { ...f, ppwr_quoten_zuordnung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ppwr_quoten_zuordnung_rezyklatquote" className="font-normal">Rezyklatquote</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ppwr_quoten_zuordnung_mehrwegquote"
                  checked={lookupKeys(fields.ppwr_quoten_zuordnung).includes('mehrwegquote')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ppwr_quoten_zuordnung);
                      const next = checked ? [...current, 'mehrwegquote'] : current.filter(k => k !== 'mehrwegquote');
                      return { ...f, ppwr_quoten_zuordnung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ppwr_quoten_zuordnung_mehrwegquote" className="font-normal">Mehrwegquote</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ppwr_quoten_zuordnung_recyclingfaehigkeitsquote"
                  checked={lookupKeys(fields.ppwr_quoten_zuordnung).includes('recyclingfaehigkeitsquote')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ppwr_quoten_zuordnung);
                      const next = checked ? [...current, 'recyclingfaehigkeitsquote'] : current.filter(k => k !== 'recyclingfaehigkeitsquote');
                      return { ...f, ppwr_quoten_zuordnung: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ppwr_quoten_zuordnung_recyclingfaehigkeitsquote" className="font-normal">Recyclingfähigkeitsquote</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kennzeichnung_vollstaendig">Kennzeichnung vollständig</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="kennzeichnung_vollstaendig"
                checked={!!fields.kennzeichnung_vollstaendig}
                onCheckedChange={(v) => setFields(f => ({ ...f, kennzeichnung_vollstaendig: !!v }))}
              />
              <Label htmlFor="kennzeichnung_vollstaendig" className="font-normal">Kennzeichnung vollständig</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kennzeichnung_hinweise">Hinweise zur Kennzeichnung</Label>
            <Textarea
              id="kennzeichnung_hinweise"
              value={fields.kennzeichnung_hinweise ?? ''}
              onChange={e => setFields(f => ({ ...f, kennzeichnung_hinweise: e.target.value }))}
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