import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Kennzahlen, Unternehmen } from '@/types/app';
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
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Kennzahlen';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/Combobox';
import { UnternehmenDialog } from '@/components/dialogs/UnternehmenDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';

interface KennzahlenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kennzahlen['fields']) => Promise<void>;
  defaultValues?: Kennzahlen['fields'];
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  unternehmenList: Unternehmen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function KennzahlenDialog({ open, onClose, onSubmit, defaultValues, recordId, unternehmenList, enablePhotoScan = true, enablePhotoLocation = true }: KennzahlenDialogProps) {
  const [fields, setFields] = useState<Partial<Kennzahlen['fields']>>({});
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
      'unternehmen_kpi_ref': unternehmenList,
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
      setFields(applyDefaults((defaultValues ?? {}) as Record<string, unknown>, formEnhancements.defaults) as Partial<Kennzahlen['fields']>);
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
      const clean = cleanFieldsForApi(merged, 'kennzahlen');
      await onSubmit(clean as Kennzahlen['fields']);
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

  const DIALOG_INTENT = defaultValues ? 'Kennzahlen bearbeiten' : 'Kennzahlen hinzufügen';

  const fieldBlocks: Record<string, React.ReactNode> = {
    'unternehmen_kpi_ref': (
      <div key="unternehmen_kpi_ref" className="space-y-1.5">
        <Label htmlFor="unternehmen_kpi_ref">Unternehmen</Label>
        <Combobox
          id="unternehmen_kpi_ref"
          placeholder=""
          items={unternehmenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.firmenname ?? r.record_id),
          }))}
          value={extractRecordId(fields.unternehmen_kpi_ref)}
          onChange={id => setFields(f => ({ ...f, unternehmen_kpi_ref: id ? createRecordUrl(APP_IDS.UNTERNEHMEN, id) : undefined }))}
          searchPlaceholder="Suchen…"
          emptyText="Kein Treffer"
          onCreateNew={(q) => openCreateUnternehmen("unternehmen_kpi_ref", q)}
          createLabel="Neu in Unternehmen"
        />
      </div>
    ),
    'berichtsjahr': (
      <div key="berichtsjahr" className="space-y-1.5">
        <Label htmlFor="berichtsjahr">Berichtsjahr</Label>
        <Input
          id="berichtsjahr"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'berichtsjahr')}
          placeholder=""
          value={fields.berichtsjahr !== undefined ? fields.berichtsjahr : (computedValues['berichtsjahr'] ?? '')}
          onChange={e => setFields(f => ({ ...f, berichtsjahr: clampNumberValue(formEnhancements, 'berichtsjahr', e.target.value) }))}
        />
      </div>
    ),
    'standort': (
      <div key="standort" className="space-y-1.5">
        <Label htmlFor="standort">Standort / Werk</Label>
        <Input
          id="standort"
          placeholder=""
          value={fields.standort ?? ''}
          onChange={e => setFields(f => ({ ...f, standort: e.target.value }))}
        />
      </div>
    ),
    'gesamtmenge_kg': (
      <div key="gesamtmenge_kg" className="space-y-1.5">
        <Label htmlFor="gesamtmenge_kg">Gesamtmenge Verpackungen (kg/Jahr)</Label>
        <Input
          id="gesamtmenge_kg"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'gesamtmenge_kg')}
          placeholder=""
          value={fields.gesamtmenge_kg !== undefined ? fields.gesamtmenge_kg : (computedValues['gesamtmenge_kg'] ?? '')}
          onChange={e => setFields(f => ({ ...f, gesamtmenge_kg: clampNumberValue(formEnhancements, 'gesamtmenge_kg', e.target.value) }))}
        />
      </div>
    ),
    'menge_kunststoff_kg': (
      <div key="menge_kunststoff_kg" className="space-y-1.5">
        <Label htmlFor="menge_kunststoff_kg">Menge Kunststoff (kg/Jahr)</Label>
        <Input
          id="menge_kunststoff_kg"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'menge_kunststoff_kg')}
          placeholder=""
          value={fields.menge_kunststoff_kg !== undefined ? fields.menge_kunststoff_kg : (computedValues['menge_kunststoff_kg'] ?? '')}
          onChange={e => setFields(f => ({ ...f, menge_kunststoff_kg: clampNumberValue(formEnhancements, 'menge_kunststoff_kg', e.target.value) }))}
        />
      </div>
    ),
    'menge_papier_pappe_kg': (
      <div key="menge_papier_pappe_kg" className="space-y-1.5">
        <Label htmlFor="menge_papier_pappe_kg">Menge Papier/Pappe (kg/Jahr)</Label>
        <Input
          id="menge_papier_pappe_kg"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'menge_papier_pappe_kg')}
          placeholder=""
          value={fields.menge_papier_pappe_kg !== undefined ? fields.menge_papier_pappe_kg : (computedValues['menge_papier_pappe_kg'] ?? '')}
          onChange={e => setFields(f => ({ ...f, menge_papier_pappe_kg: clampNumberValue(formEnhancements, 'menge_papier_pappe_kg', e.target.value) }))}
        />
      </div>
    ),
    'menge_glas_kg': (
      <div key="menge_glas_kg" className="space-y-1.5">
        <Label htmlFor="menge_glas_kg">Menge Glas (kg/Jahr)</Label>
        <Input
          id="menge_glas_kg"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'menge_glas_kg')}
          placeholder=""
          value={fields.menge_glas_kg !== undefined ? fields.menge_glas_kg : (computedValues['menge_glas_kg'] ?? '')}
          onChange={e => setFields(f => ({ ...f, menge_glas_kg: clampNumberValue(formEnhancements, 'menge_glas_kg', e.target.value) }))}
        />
      </div>
    ),
    'menge_metall_kg': (
      <div key="menge_metall_kg" className="space-y-1.5">
        <Label htmlFor="menge_metall_kg">Menge Metall (kg/Jahr)</Label>
        <Input
          id="menge_metall_kg"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'menge_metall_kg')}
          placeholder=""
          value={fields.menge_metall_kg !== undefined ? fields.menge_metall_kg : (computedValues['menge_metall_kg'] ?? '')}
          onChange={e => setFields(f => ({ ...f, menge_metall_kg: clampNumberValue(formEnhancements, 'menge_metall_kg', e.target.value) }))}
        />
      </div>
    ),
    'menge_verbund_kg': (
      <div key="menge_verbund_kg" className="space-y-1.5">
        <Label htmlFor="menge_verbund_kg">Menge Verbund (kg/Jahr)</Label>
        <Input
          id="menge_verbund_kg"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'menge_verbund_kg')}
          placeholder=""
          value={fields.menge_verbund_kg !== undefined ? fields.menge_verbund_kg : (computedValues['menge_verbund_kg'] ?? '')}
          onChange={e => setFields(f => ({ ...f, menge_verbund_kg: clampNumberValue(formEnhancements, 'menge_verbund_kg', e.target.value) }))}
        />
      </div>
    ),
    'rezyklatanteil_gesamt_prozent': (
      <div key="rezyklatanteil_gesamt_prozent" className="space-y-1.5">
        <Label htmlFor="rezyklatanteil_gesamt_prozent">Rezyklatanteil gesamt (%)</Label>
        <Input
          id="rezyklatanteil_gesamt_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklatanteil_gesamt_prozent')}
          placeholder=""
          value={fields.rezyklatanteil_gesamt_prozent !== undefined ? fields.rezyklatanteil_gesamt_prozent : (computedValues['rezyklatanteil_gesamt_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklatanteil_gesamt_prozent: clampNumberValue(formEnhancements, 'rezyklatanteil_gesamt_prozent', e.target.value) }))}
        />
      </div>
    ),
    'rezyklatanteil_kunststoff_prozent': (
      <div key="rezyklatanteil_kunststoff_prozent" className="space-y-1.5">
        <Label htmlFor="rezyklatanteil_kunststoff_prozent">Rezyklatanteil Kunststoff (%)</Label>
        <Input
          id="rezyklatanteil_kunststoff_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklatanteil_kunststoff_prozent')}
          placeholder=""
          value={fields.rezyklatanteil_kunststoff_prozent !== undefined ? fields.rezyklatanteil_kunststoff_prozent : (computedValues['rezyklatanteil_kunststoff_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklatanteil_kunststoff_prozent: clampNumberValue(formEnhancements, 'rezyklatanteil_kunststoff_prozent', e.target.value) }))}
        />
      </div>
    ),
    'rezyklatanteil_papier_prozent': (
      <div key="rezyklatanteil_papier_prozent" className="space-y-1.5">
        <Label htmlFor="rezyklatanteil_papier_prozent">Rezyklatanteil Papier/Pappe (%)</Label>
        <Input
          id="rezyklatanteil_papier_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklatanteil_papier_prozent')}
          placeholder=""
          value={fields.rezyklatanteil_papier_prozent !== undefined ? fields.rezyklatanteil_papier_prozent : (computedValues['rezyklatanteil_papier_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklatanteil_papier_prozent: clampNumberValue(formEnhancements, 'rezyklatanteil_papier_prozent', e.target.value) }))}
        />
      </div>
    ),
    'rezyklatanteil_glas_prozent': (
      <div key="rezyklatanteil_glas_prozent" className="space-y-1.5">
        <Label htmlFor="rezyklatanteil_glas_prozent">Rezyklatanteil Glas (%)</Label>
        <Input
          id="rezyklatanteil_glas_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklatanteil_glas_prozent')}
          placeholder=""
          value={fields.rezyklatanteil_glas_prozent !== undefined ? fields.rezyklatanteil_glas_prozent : (computedValues['rezyklatanteil_glas_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklatanteil_glas_prozent: clampNumberValue(formEnhancements, 'rezyklatanteil_glas_prozent', e.target.value) }))}
        />
      </div>
    ),
    'rezyklatanteil_metall_prozent': (
      <div key="rezyklatanteil_metall_prozent" className="space-y-1.5">
        <Label htmlFor="rezyklatanteil_metall_prozent">Rezyklatanteil Metall (%)</Label>
        <Input
          id="rezyklatanteil_metall_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'rezyklatanteil_metall_prozent')}
          placeholder=""
          value={fields.rezyklatanteil_metall_prozent !== undefined ? fields.rezyklatanteil_metall_prozent : (computedValues['rezyklatanteil_metall_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rezyklatanteil_metall_prozent: clampNumberValue(formEnhancements, 'rezyklatanteil_metall_prozent', e.target.value) }))}
        />
      </div>
    ),
    'mehrwegquote_prozent': (
      <div key="mehrwegquote_prozent" className="space-y-1.5">
        <Label htmlFor="mehrwegquote_prozent">Mehrwegquote (%)</Label>
        <Input
          id="mehrwegquote_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'mehrwegquote_prozent')}
          placeholder=""
          value={fields.mehrwegquote_prozent !== undefined ? fields.mehrwegquote_prozent : (computedValues['mehrwegquote_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, mehrwegquote_prozent: clampNumberValue(formEnhancements, 'mehrwegquote_prozent', e.target.value) }))}
        />
      </div>
    ),
    'recyclingfaehigkeitsquote_prozent': (
      <div key="recyclingfaehigkeitsquote_prozent" className="space-y-1.5">
        <Label htmlFor="recyclingfaehigkeitsquote_prozent">Anteil recyclingfähiger Verpackungen (%)</Label>
        <Input
          id="recyclingfaehigkeitsquote_prozent"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'recyclingfaehigkeitsquote_prozent')}
          placeholder=""
          value={fields.recyclingfaehigkeitsquote_prozent !== undefined ? fields.recyclingfaehigkeitsquote_prozent : (computedValues['recyclingfaehigkeitsquote_prozent'] ?? '')}
          onChange={e => setFields(f => ({ ...f, recyclingfaehigkeitsquote_prozent: clampNumberValue(formEnhancements, 'recyclingfaehigkeitsquote_prozent', e.target.value) }))}
        />
      </div>
    ),
    'anzahl_verpackungstypen': (
      <div key="anzahl_verpackungstypen" className="space-y-1.5">
        <Label htmlFor="anzahl_verpackungstypen">Anzahl Verpackungstypen gesamt</Label>
        <Input
          id="anzahl_verpackungstypen"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'anzahl_verpackungstypen')}
          placeholder=""
          value={fields.anzahl_verpackungstypen !== undefined ? fields.anzahl_verpackungstypen : (computedValues['anzahl_verpackungstypen'] ?? '')}
          onChange={e => setFields(f => ({ ...f, anzahl_verpackungstypen: clampNumberValue(formEnhancements, 'anzahl_verpackungstypen', e.target.value) }))}
        />
      </div>
    ),
    'anzahl_konform': (
      <div key="anzahl_konform" className="space-y-1.5">
        <Label htmlFor="anzahl_konform">Davon konform</Label>
        <Input
          id="anzahl_konform"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'anzahl_konform')}
          placeholder=""
          value={fields.anzahl_konform !== undefined ? fields.anzahl_konform : (computedValues['anzahl_konform'] ?? '')}
          onChange={e => setFields(f => ({ ...f, anzahl_konform: clampNumberValue(formEnhancements, 'anzahl_konform', e.target.value) }))}
        />
      </div>
    ),
    'anzahl_kritisch': (
      <div key="anzahl_kritisch" className="space-y-1.5">
        <Label htmlFor="anzahl_kritisch">Davon kritisch</Label>
        <Input
          id="anzahl_kritisch"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'anzahl_kritisch')}
          placeholder=""
          value={fields.anzahl_kritisch !== undefined ? fields.anzahl_kritisch : (computedValues['anzahl_kritisch'] ?? '')}
          onChange={e => setFields(f => ({ ...f, anzahl_kritisch: clampNumberValue(formEnhancements, 'anzahl_kritisch', e.target.value) }))}
        />
      </div>
    ),
    'anzahl_nicht_konform': (
      <div key="anzahl_nicht_konform" className="space-y-1.5">
        <Label htmlFor="anzahl_nicht_konform">Davon nicht konform</Label>
        <Input
          id="anzahl_nicht_konform"
          type="number"
          step="any"
          {...numberInputProps(formEnhancements, 'anzahl_nicht_konform')}
          placeholder=""
          value={fields.anzahl_nicht_konform !== undefined ? fields.anzahl_nicht_konform : (computedValues['anzahl_nicht_konform'] ?? '')}
          onChange={e => setFields(f => ({ ...f, anzahl_nicht_konform: clampNumberValue(formEnhancements, 'anzahl_nicht_konform', e.target.value) }))}
        />
      </div>
    ),
    'kpi_hinweise': (
      <div key="kpi_hinweise" className="space-y-1.5">
        <Label htmlFor="kpi_hinweise">Hinweise / Anmerkungen</Label>
        <Textarea
          id="kpi_hinweise"
          placeholder=""
          value={fields.kpi_hinweise ?? ''}
          onChange={e => setFields(f => ({ ...f, kpi_hinweise: e.target.value }))}
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
  const FIELD_LABELS: Record<string, string> = {"unternehmen_kpi_ref": "Unternehmen", "berichtsjahr": "Berichtsjahr", "standort": "Standort / Werk", "gesamtmenge_kg": "Gesamtmenge Verpackungen (kg/Jahr)", "menge_kunststoff_kg": "Menge Kunststoff (kg/Jahr)", "menge_papier_pappe_kg": "Menge Papier/Pappe (kg/Jahr)", "menge_glas_kg": "Menge Glas (kg/Jahr)", "menge_metall_kg": "Menge Metall (kg/Jahr)", "menge_verbund_kg": "Menge Verbund (kg/Jahr)", "rezyklatanteil_gesamt_prozent": "Rezyklatanteil gesamt (%)", "rezyklatanteil_kunststoff_prozent": "Rezyklatanteil Kunststoff (%)", "rezyklatanteil_papier_prozent": "Rezyklatanteil Papier/Pappe (%)", "rezyklatanteil_glas_prozent": "Rezyklatanteil Glas (%)", "rezyklatanteil_metall_prozent": "Rezyklatanteil Metall (%)", "mehrwegquote_prozent": "Mehrwegquote (%)", "recyclingfaehigkeitsquote_prozent": "Anteil recyclingfähiger Verpackungen (%)", "anzahl_verpackungstypen": "Anzahl Verpackungstypen gesamt", "anzahl_konform": "Davon konform", "anzahl_kritisch": "Davon kritisch", "anzahl_nicht_konform": "Davon nicht konform", "kpi_hinweise": "Hinweise / Anmerkungen"};
  const CURRENCY_KEYS = new Set<string>(["gesamtmenge_kg", "rezyklatanteil_gesamt_prozent", "anzahl_verpackungstypen"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"unternehmen_kpi_ref": {"firmenname": "Firmenname", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "Postleitzahl", "ort": "Ort", "laender": "Tätigkeitsländer", "ansprechpartner_vorname": "Vorname Ansprechpartner", "ansprechpartner_nachname": "Nachname Ansprechpartner", "ansprechpartner_email": "E-Mail Ansprechpartner", "ansprechpartner_telefon": "Telefon Ansprechpartner", "steuernummer": "Steuernummer / USt-IdNr.", "epr_registrierungsnummern": "EPR-Registrierungsnummern (je Land)", "verantwortlich_vorname": "Vorname verantwortliche Person", "verantwortlich_nachname": "Nachname verantwortliche Person", "verantwortlich_funktion": "Funktion / Position", "verantwortlich_email": "E-Mail verantwortliche Person"}};
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
                <AttachmentsSection appId={APP_IDS.KENNZAHLEN} recordId={recordId} />
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