import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Verpackungstypen, Unternehmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Verpackungstypen';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/Combobox';
import { UnternehmenDialog } from '@/components/dialogs/UnternehmenDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface VerpackungstypenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Verpackungstypen['fields']) => Promise<void>;
  defaultValues?: Verpackungstypen['fields'];
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  unternehmenList: Unternehmen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function VerpackungstypenDialog({ open, onClose, onSubmit, defaultValues, recordId, unternehmenList, enablePhotoScan = true, enablePhotoLocation = true }: VerpackungstypenDialogProps) {
  const [fields, setFields] = useState<Partial<Verpackungstypen['fields']>>({});
  const [saving, setSaving] = useState(false);
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!defaultValues) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(defaultValues);
    } catch {
      return true;
    }
  }, [fields, defaultValues]);
  // Inline-Create state for "Unternehmen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraUnternehmen` list, and select it in
  // the originating Combobox via the captured `createUnternehmenField`.
  const [createUnternehmenOpen, setCreateUnternehmenOpen] = useState(false);
  const [createUnternehmenInitial, setCreateUnternehmenInitial] = useState('');
  const [createUnternehmenField, setCreateUnternehmenField] = useState<string>('');
  const [extraUnternehmen, setExtraUnternehmen] = useState< Unternehmen[]>([]);
  const unternehmenListAll = useMemo(
    () => [...unternehmenList, ...extraUnternehmen],
    [unternehmenList, extraUnternehmen],
  );
  function openCreateUnternehmen(fieldKey: string, q: string) {
    setCreateUnternehmenField(fieldKey);
    setCreateUnternehmenInitial(q);
    setCreateUnternehmenOpen(true);
  }
  const [aiOpen, setAiOpen] = useState(false);
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
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'unternehmen_ref': unternehmenList,
    },
  }), [unternehmenList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults((defaultValues ?? {}) as Record<string, unknown>, formEnhancements.defaults) as Partial<Verpackungstypen['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
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
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'verpackungstypen');
      await onSubmit(clean as Verpackungstypen['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
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
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
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
      setAiText('');
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
    if (f) handleAiExtract(f);
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
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Verpackungstypen bearbeiten' : 'Verpackungstypen hinzufügen';

  const fieldBlocks: Record<string, React.ReactNode> = {
    'unternehmen_ref': (
      <div key="unternehmen_ref" className="space-y-1.5">
        <Label htmlFor="unternehmen_ref">Unternehmen</Label>
        <Combobox
          id="unternehmen_ref"
          placeholder=""
          items={unternehmenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.firmenname ?? r.record_id),
          }))}
          value={extractRecordId(fields.unternehmen_ref)}
          onChange={id => setFields(f => ({ ...f, unternehmen_ref: id ? createRecordUrl(APP_IDS.UNTERNEHMEN, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateUnternehmen("unternehmen_ref", q)}
          createLabel="Neu in Unternehmen"
        />
      </div>
    ),
    'verpackungs_id': (
      <div key="verpackungs_id" className="space-y-1.5">
        <Label htmlFor="verpackungs_id">Verpackungs-ID</Label>
        <Input
          id="verpackungs_id"
          placeholder=""
          value={fields.verpackungs_id ?? ''}
          onChange={e => setFields(f => ({ ...f, verpackungs_id: e.target.value }))}
        />
      </div>
    ),
    'verpackungsname': (
      <div key="verpackungsname" className="space-y-1.5">
        <Label htmlFor="verpackungsname">Name der Verpackung</Label>
        <Input
          id="verpackungsname"
          placeholder=""
          value={fields.verpackungsname ?? ''}
          onChange={e => setFields(f => ({ ...f, verpackungsname: e.target.value }))}
        />
      </div>
    ),
    'beschreibung': (
      <div key="beschreibung" className="space-y-1.5">
        <Label htmlFor="beschreibung">Beschreibung</Label>
        <Textarea
          id="beschreibung"
          placeholder=""
          value={fields.beschreibung ?? ''}
          onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'produktkategorie': (
      <div key="produktkategorie" className="space-y-1.5">
        <Label htmlFor="produktkategorie">Produktkategorie</Label>
        <Input
          id="produktkategorie"
          placeholder=""
          value={fields.produktkategorie ?? ''}
          onChange={e => setFields(f => ({ ...f, produktkategorie: e.target.value }))}
        />
      </div>
    ),
    'verwendungszweck': (
      <div key="verwendungszweck" className="space-y-1.5">
        <Label htmlFor="verwendungszweck">Verwendungszweck</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.verwendungszweck) === 'verkaufsverpackung'}
            onClick={() => setFields(f => ({ ...f, verwendungszweck: (lookupKey(f.verwendungszweck) === 'verkaufsverpackung' ? undefined : 'verkaufsverpackung') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.verwendungszweck) === 'verkaufsverpackung'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Verkaufsverpackung
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.verwendungszweck) === 'versandverpackung'}
            onClick={() => setFields(f => ({ ...f, verwendungszweck: (lookupKey(f.verwendungszweck) === 'versandverpackung' ? undefined : 'versandverpackung') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.verwendungszweck) === 'versandverpackung'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Versandverpackung
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.verwendungszweck) === 'transportverpackung'}
            onClick={() => setFields(f => ({ ...f, verwendungszweck: (lookupKey(f.verwendungszweck) === 'transportverpackung' ? undefined : 'transportverpackung') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.verwendungszweck) === 'transportverpackung'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Transportverpackung
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.verwendungszweck) === 'serviceverpackung'}
            onClick={() => setFields(f => ({ ...f, verwendungszweck: (lookupKey(f.verwendungszweck) === 'serviceverpackung' ? undefined : 'serviceverpackung') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.verwendungszweck) === 'serviceverpackung'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Serviceverpackung
          </button>
        </div>
      </div>
    ),
    'material_hauptkategorie': (
      <div key="material_hauptkategorie" className="space-y-1.5">
        <Label htmlFor="material_hauptkategorie">Material-Hauptkategorie</Label>
        <Select
          value={lookupKey(fields.material_hauptkategorie) ?? ''}
          onValueChange={v => setFields(f => ({ ...f, material_hauptkategorie: v === 'none' ? undefined : v as any }))}
        >
          <SelectTrigger id="material_hauptkategorie"><SelectValue placeholder="" /></SelectTrigger>
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
    ),
    'materialzusammensetzung': (
      <div key="materialzusammensetzung" className="space-y-1.5">
        <Label htmlFor="materialzusammensetzung">Detaillierte Materialzusammensetzung</Label>
        <Textarea
          id="materialzusammensetzung"
          placeholder=""
          value={fields.materialzusammensetzung ?? ''}
          onChange={e => setFields(f => ({ ...f, materialzusammensetzung: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'material_einzelmaterialien': (
      <div key="material_einzelmaterialien" className="space-y-1.5">
        <Label htmlFor="material_einzelmaterialien">Einzelmaterialien (Bezeichnung)</Label>
        <Input
          id="material_einzelmaterialien"
          placeholder=""
          value={fields.material_einzelmaterialien ?? ''}
          onChange={e => setFields(f => ({ ...f, material_einzelmaterialien: e.target.value }))}
        />
      </div>
    ),
    'material_prozentsaetze': (
      <div key="material_prozentsaetze" className="space-y-1.5">
        <Label htmlFor="material_prozentsaetze">Materialanteile in %</Label>
        <Input
          id="material_prozentsaetze"
          placeholder=""
          value={fields.material_prozentsaetze ?? ''}
          onChange={e => setFields(f => ({ ...f, material_prozentsaetze: e.target.value }))}
        />
      </div>
    ),
    'material_gewichte_g': (
      <div key="material_gewichte_g" className="space-y-1.5">
        <Label htmlFor="material_gewichte_g">Materialgewichte in Gramm</Label>
        <Input
          id="material_gewichte_g"
          placeholder=""
          value={fields.material_gewichte_g ?? ''}
          onChange={e => setFields(f => ({ ...f, material_gewichte_g: e.target.value }))}
        />
      </div>
    ),
    'laenge_mm': (
      <div key="laenge_mm" className="space-y-1.5">
        <Label htmlFor="laenge_mm">Länge (mm)</Label>
        <Input
          id="laenge_mm"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'laenge_mm')}
          placeholder=""
          value={fields.laenge_mm !== undefined ? fields.laenge_mm : (computedValues['laenge_mm'] ?? '')}
          onChange={e => setFields(f => ({ ...f, laenge_mm: clampNumberValue(formEnhancements, 'laenge_mm', e.target.value) }))}
        />
      </div>
    ),
    'breite_mm': (
      <div key="breite_mm" className="space-y-1.5">
        <Label htmlFor="breite_mm">Breite (mm)</Label>
        <Input
          id="breite_mm"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'breite_mm')}
          placeholder=""
          value={fields.breite_mm !== undefined ? fields.breite_mm : (computedValues['breite_mm'] ?? '')}
          onChange={e => setFields(f => ({ ...f, breite_mm: clampNumberValue(formEnhancements, 'breite_mm', e.target.value) }))}
        />
      </div>
    ),
    'hoehe_mm': (
      <div key="hoehe_mm" className="space-y-1.5">
        <Label htmlFor="hoehe_mm">Höhe (mm)</Label>
        <Input
          id="hoehe_mm"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'hoehe_mm')}
          placeholder=""
          value={fields.hoehe_mm !== undefined ? fields.hoehe_mm : (computedValues['hoehe_mm'] ?? '')}
          onChange={e => setFields(f => ({ ...f, hoehe_mm: clampNumberValue(formEnhancements, 'hoehe_mm', e.target.value) }))}
        />
      </div>
    ),
    'wandstaerke_mm': (
      <div key="wandstaerke_mm" className="space-y-1.5">
        <Label htmlFor="wandstaerke_mm">Wandstärke (mm)</Label>
        <Input
          id="wandstaerke_mm"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'wandstaerke_mm')}
          placeholder=""
          value={fields.wandstaerke_mm !== undefined ? fields.wandstaerke_mm : (computedValues['wandstaerke_mm'] ?? '')}
          onChange={e => setFields(f => ({ ...f, wandstaerke_mm: clampNumberValue(formEnhancements, 'wandstaerke_mm', e.target.value) }))}
        />
      </div>
    ),
    'volumen_ml': (
      <div key="volumen_ml" className="space-y-1.5">
        <Label htmlFor="volumen_ml">Volumen (ml)</Label>
        <Input
          id="volumen_ml"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'volumen_ml')}
          placeholder=""
          value={fields.volumen_ml !== undefined ? fields.volumen_ml : (computedValues['volumen_ml'] ?? '')}
          onChange={e => setFields(f => ({ ...f, volumen_ml: clampNumberValue(formEnhancements, 'volumen_ml', e.target.value) }))}
        />
      </div>
    ),
    'gesamtgewicht_g': (
      <div key="gesamtgewicht_g" className="space-y-1.5">
        <Label htmlFor="gesamtgewicht_g">Gesamtgewicht (g)</Label>
        <Input
          id="gesamtgewicht_g"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'gesamtgewicht_g')}
          placeholder=""
          value={fields.gesamtgewicht_g !== undefined ? fields.gesamtgewicht_g : (computedValues['gesamtgewicht_g'] ?? '')}
          onChange={e => setFields(f => ({ ...f, gesamtgewicht_g: clampNumberValue(formEnhancements, 'gesamtgewicht_g', e.target.value) }))}
        />
      </div>
    ),
    'rezyklat_postconsumer_prozent': (
      <div key="rezyklat_postconsumer_prozent" className="space-y-1.5">
        <Label htmlFor="rezyklat_postconsumer_prozent">Post-Consumer-Rezyklatanteil (%)</Label>
        <Input
          id="rezyklat_postconsumer_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklat_postconsumer_prozent')}
          placeholder=""
          value={fields.rezyklat_postconsumer_prozent !== undefined ? fields.rezyklat_postconsumer_prozent : (computedValues['rezyklat_postconsumer_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklat_postconsumer_prozent: clampNumberValue(formEnhancements, 'rezyklat_postconsumer_prozent', e.target.value) }))}
        />
      </div>
    ),
    'rezyklat_postconsumer_kg_jahr': (
      <div key="rezyklat_postconsumer_kg_jahr" className="space-y-1.5">
        <Label htmlFor="rezyklat_postconsumer_kg_jahr">Post-Consumer-Rezyklat (kg/Jahr)</Label>
        <Input
          id="rezyklat_postconsumer_kg_jahr"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklat_postconsumer_kg_jahr')}
          placeholder=""
          value={fields.rezyklat_postconsumer_kg_jahr !== undefined ? fields.rezyklat_postconsumer_kg_jahr : (computedValues['rezyklat_postconsumer_kg_jahr'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklat_postconsumer_kg_jahr: clampNumberValue(formEnhancements, 'rezyklat_postconsumer_kg_jahr', e.target.value) }))}
        />
      </div>
    ),
    'rezyklat_postindustrial_prozent': (
      <div key="rezyklat_postindustrial_prozent" className="space-y-1.5">
        <Label htmlFor="rezyklat_postindustrial_prozent">Post-Industrial-Rezyklatanteil (%)</Label>
        <Input
          id="rezyklat_postindustrial_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklat_postindustrial_prozent')}
          placeholder=""
          value={fields.rezyklat_postindustrial_prozent !== undefined ? fields.rezyklat_postindustrial_prozent : (computedValues['rezyklat_postindustrial_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklat_postindustrial_prozent: clampNumberValue(formEnhancements, 'rezyklat_postindustrial_prozent', e.target.value) }))}
        />
      </div>
    ),
    'rezyklat_postindustrial_kg_jahr': (
      <div key="rezyklat_postindustrial_kg_jahr" className="space-y-1.5">
        <Label htmlFor="rezyklat_postindustrial_kg_jahr">Post-Industrial-Rezyklat (kg/Jahr)</Label>
        <Input
          id="rezyklat_postindustrial_kg_jahr"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklat_postindustrial_kg_jahr')}
          placeholder=""
          value={fields.rezyklat_postindustrial_kg_jahr !== undefined ? fields.rezyklat_postindustrial_kg_jahr : (computedValues['rezyklat_postindustrial_kg_jahr'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklat_postindustrial_kg_jahr: clampNumberValue(formEnhancements, 'rezyklat_postindustrial_kg_jahr', e.target.value) }))}
        />
      </div>
    ),
    'recyclingfaehigkeit_kategorie': (
      <div key="recyclingfaehigkeit_kategorie" className="space-y-1.5">
        <Label htmlFor="recyclingfaehigkeit_kategorie">Recyclingfähigkeit – Kategorie</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.recyclingfaehigkeit_kategorie) === 'gut_recyclingfaehig'}
            onClick={() => setFields(f => ({ ...f, recyclingfaehigkeit_kategorie: (lookupKey(f.recyclingfaehigkeit_kategorie) === 'gut_recyclingfaehig' ? undefined : 'gut_recyclingfaehig') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.recyclingfaehigkeit_kategorie) === 'gut_recyclingfaehig'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Gut recyclingfähig
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.recyclingfaehigkeit_kategorie) === 'eingeschraenkt_recyclingfaehig'}
            onClick={() => setFields(f => ({ ...f, recyclingfaehigkeit_kategorie: (lookupKey(f.recyclingfaehigkeit_kategorie) === 'eingeschraenkt_recyclingfaehig' ? undefined : 'eingeschraenkt_recyclingfaehig') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.recyclingfaehigkeit_kategorie) === 'eingeschraenkt_recyclingfaehig'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Eingeschränkt recyclingfähig
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.recyclingfaehigkeit_kategorie) === 'nicht_recyclingfaehig'}
            onClick={() => setFields(f => ({ ...f, recyclingfaehigkeit_kategorie: (lookupKey(f.recyclingfaehigkeit_kategorie) === 'nicht_recyclingfaehig' ? undefined : 'nicht_recyclingfaehig') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.recyclingfaehigkeit_kategorie) === 'nicht_recyclingfaehig'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Nicht recyclingfähig
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.recyclingfaehigkeit_kategorie) === 'nicht_bewertet'}
            onClick={() => setFields(f => ({ ...f, recyclingfaehigkeit_kategorie: (lookupKey(f.recyclingfaehigkeit_kategorie) === 'nicht_bewertet' ? undefined : 'nicht_bewertet') as any }))}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.recyclingfaehigkeit_kategorie) === 'nicht_bewertet'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            Nicht bewertet
          </button>
        </div>
      </div>
    ),
    'recyclingfaehigkeit_score': (
      <div key="recyclingfaehigkeit_score" className="space-y-1.5">
        <Label htmlFor="recyclingfaehigkeit_score">Recyclingfähigkeit – Score (0–100)</Label>
        <Input
          id="recyclingfaehigkeit_score"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'recyclingfaehigkeit_score')}
          placeholder=""
          value={fields.recyclingfaehigkeit_score !== undefined ? fields.recyclingfaehigkeit_score : (computedValues['recyclingfaehigkeit_score'] ?? '')}
          onChange={e => setFields(f => ({ ...f, recyclingfaehigkeit_score: clampNumberValue(formEnhancements, 'recyclingfaehigkeit_score', e.target.value) }))}
        />
      </div>
    ),
    'recyclingfaehigkeit_referenz': (
      <div key="recyclingfaehigkeit_referenz" className="space-y-1.5">
        <Label htmlFor="recyclingfaehigkeit_referenz">Referenz Prüfstandard / Gutachten</Label>
        <Input
          id="recyclingfaehigkeit_referenz"
          placeholder=""
          value={fields.recyclingfaehigkeit_referenz ?? ''}
          onChange={e => setFields(f => ({ ...f, recyclingfaehigkeit_referenz: e.target.value }))}
        />
      </div>
    ),
    'mehrwegfaehig': (
      <div key="mehrwegfaehig" className="space-y-1.5">
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
    ),
    'erwartete_umlaeufe': (
      <div key="erwartete_umlaeufe" className="space-y-1.5">
        <Label htmlFor="erwartete_umlaeufe">Erwartete Umläufe</Label>
        <Input
          id="erwartete_umlaeufe"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'erwartete_umlaeufe')}
          placeholder=""
          value={fields.erwartete_umlaeufe !== undefined ? fields.erwartete_umlaeufe : (computedValues['erwartete_umlaeufe'] ?? '')}
          onChange={e => setFields(f => ({ ...f, erwartete_umlaeufe: clampNumberValue(formEnhancements, 'erwartete_umlaeufe', e.target.value) }))}
        />
      </div>
    ),
    'ruecknahmesystem': (
      <div key="ruecknahmesystem" className="space-y-1.5">
        <Label htmlFor="ruecknahmesystem">Beschreibung Rücknahmesystem</Label>
        <Textarea
          id="ruecknahmesystem"
          placeholder=""
          value={fields.ruecknahmesystem ?? ''}
          onChange={e => setFields(f => ({ ...f, ruecknahmesystem: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'ppwr_quoten_zuordnung': (
      <div key="ppwr_quoten_zuordnung" className="space-y-1.5">
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
    ),
    'kennzeichnung_vollstaendig': (
      <div key="kennzeichnung_vollstaendig" className="space-y-1.5">
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
    ),
    'kennzeichnung_hinweise': (
      <div key="kennzeichnung_hinweise" className="space-y-1.5">
        <Label htmlFor="kennzeichnung_hinweise">Hinweise zur Kennzeichnung</Label>
        <Textarea
          id="kennzeichnung_hinweise"
          placeholder=""
          value={fields.kennzeichnung_hinweise ?? ''}
          onChange={e => setFields(f => ({ ...f, kennzeichnung_hinweise: e.target.value }))}
          rows={3}
        />
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"unternehmen_ref": "Unternehmen", "verpackungs_id": "Verpackungs-ID", "verpackungsname": "Name der Verpackung", "beschreibung": "Beschreibung", "produktkategorie": "Produktkategorie", "verwendungszweck": "Verwendungszweck", "material_hauptkategorie": "Material-Hauptkategorie", "materialzusammensetzung": "Detaillierte Materialzusammensetzung", "material_einzelmaterialien": "Einzelmaterialien (Bezeichnung)", "material_prozentsaetze": "Materialanteile in %", "material_gewichte_g": "Materialgewichte in Gramm", "laenge_mm": "Länge (mm)", "breite_mm": "Breite (mm)", "hoehe_mm": "Höhe (mm)", "wandstaerke_mm": "Wandstärke (mm)", "volumen_ml": "Volumen (ml)", "gesamtgewicht_g": "Gesamtgewicht (g)", "rezyklat_postconsumer_prozent": "Post-Consumer-Rezyklatanteil (%)", "rezyklat_postconsumer_kg_jahr": "Post-Consumer-Rezyklat (kg/Jahr)", "rezyklat_postindustrial_prozent": "Post-Industrial-Rezyklatanteil (%)", "rezyklat_postindustrial_kg_jahr": "Post-Industrial-Rezyklat (kg/Jahr)", "recyclingfaehigkeit_kategorie": "Recyclingfähigkeit – Kategorie", "recyclingfaehigkeit_score": "Recyclingfähigkeit – Score (0–100)", "recyclingfaehigkeit_referenz": "Referenz Prüfstandard / Gutachten", "mehrwegfaehig": "Mehrwegfähig", "erwartete_umlaeufe": "Erwartete Umläufe", "ruecknahmesystem": "Beschreibung Rücknahmesystem", "ppwr_quoten_zuordnung": "Zuordnung zu PPWR-Quoten", "kennzeichnung_vollstaendig": "Kennzeichnung vollständig", "kennzeichnung_hinweise": "Hinweise zur Kennzeichnung"};
  const CURRENCY_KEYS = new Set<string>(["gesamtgewicht_g"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"unternehmen_ref": {"firmenname": "Firmenname", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "Postleitzahl", "ort": "Ort", "laender": "Tätigkeitsländer", "ansprechpartner_vorname": "Vorname Ansprechpartner", "ansprechpartner_nachname": "Nachname Ansprechpartner", "ansprechpartner_email": "E-Mail Ansprechpartner", "ansprechpartner_telefon": "Telefon Ansprechpartner", "steuernummer": "Steuernummer / USt-IdNr.", "epr_registrierungsnummern": "EPR-Registrierungsnummern (je Land)", "verantwortlich_vorname": "Vorname verantwortliche Person", "verantwortlich_nachname": "Nachname verantwortliche Person", "verantwortlich_funktion": "Funktion / Position", "verantwortlich_email": "E-Mail verantwortliche Person"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all mr-7 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">KI-Ausfüllen</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
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

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.VERPACKUNGSTYPEN} recordId={recordId} />
              </div>
            )}
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={saving || !isDirty}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createUnternehmenOpen && (
      <UnternehmenDialog
        open={createUnternehmenOpen}
        onClose={() => setCreateUnternehmenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createUnternehmenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Unternehmen;
            setExtraUnternehmen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.UNTERNEHMEN, result.id);
            setFields(prev => ({ ...prev, [createUnternehmenField]: url } as any));
          }
          setCreateUnternehmenOpen(false);
        }}
        defaultValues={createUnternehmenInitial
          ? ({ firmenname: createUnternehmenInitial } as any)
          : undefined}
      />
    )}
    </>
  );
}