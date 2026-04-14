import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { UnternehmenDialog } from '@/components/dialogs/UnternehmenDialog';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { CreateKennzahlen } from '@/types/app';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  IconBuilding,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconAlertTriangle,
  IconCircleCheck,
  IconLoader2,
  IconChartBar,
  IconFileReport,
} from '@tabler/icons-react';

const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = [CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

interface ComplianceCounts {
  total: number;
  konform: number;
  kritisch: number;
  nichtKonform: number;
}

export default function JahresberichtErfassenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { unternehmen, verpackungstypen, regelstatus, kennzahlen, loading, error, fetchAll } = useDashboardData();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedUnternehmenId, setSelectedUnternehmenId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form data collected across steps
  const [formData, setFormData] = useState<Partial<CreateKennzahlen>>({
    berichtsjahr: CURRENT_YEAR,
  });

  // Step 5 compliance counts (auto-calculated then user-editable)
  const [counts, setCounts] = useState<ComplianceCounts>({
    total: 0,
    konform: 0,
    kritisch: 0,
    nichtKonform: 0,
  });

  // Deep-linking: read URL params on mount
  useEffect(() => {
    const urlUnternehmenId = searchParams.get('unternehmenId');
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);

    if (urlUnternehmenId) {
      setSelectedUnternehmenId(urlUnternehmenId);
      if (urlStep >= 2 && urlStep <= 5) {
        setCurrentStep(urlStep);
      } else {
        setCurrentStep(2);
      }
    } else if (urlStep >= 1 && urlStep <= 5) {
      setCurrentStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL params when step or unternehmen changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedUnternehmenId) {
      params.set('unternehmenId', selectedUnternehmenId);
    } else {
      params.delete('unternehmenId');
    }
    setSearchParams(params, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedUnternehmenId]);

  // Auto-calculate compliance counts when step 5 is reached
  const calculatedCounts = useMemo(() => {
    if (!selectedUnternehmenId) return { total: 0, konform: 0, kritisch: 0, nichtKonform: 0 };

    // Filter Verpackungstypen for this Unternehmen
    const myVerpackungstypen = verpackungstypen.filter(v => {
      const refId = extractRecordId(v.fields.unternehmen_ref);
      return refId === selectedUnternehmenId;
    });

    const total = myVerpackungstypen.length;

    // For each Verpackungstyp, find the latest Regelstatus
    const latestStatusByVt = new Map<string, string>();
    regelstatus.forEach(rs => {
      const vtId = extractRecordId(rs.fields.verpackungstyp_status_ref);
      if (!vtId) return;
      // Use createdat to find latest
      const existing = latestStatusByVt.get(vtId);
      if (!existing) {
        latestStatusByVt.set(vtId, rs.record_id);
      } else {
        // Compare dates
        const existingRs = regelstatus.find(r => r.record_id === existing);
        if (existingRs && rs.createdat > existingRs.createdat) {
          latestStatusByVt.set(vtId, rs.record_id);
        }
      }
    });

    let konform = 0;
    let kritisch = 0;
    let nichtKonform = 0;

    myVerpackungstypen.forEach(vt => {
      const latestRsId = latestStatusByVt.get(vt.record_id);
      if (!latestRsId) return;
      const rs = regelstatus.find(r => r.record_id === latestRsId);
      if (!rs) return;
      const statusKey = rs.fields.konformitaetsstatus?.key;
      if (statusKey === 'konform') konform++;
      else if (statusKey === 'kritisch') kritisch++;
      else if (statusKey === 'nicht_konform') nichtKonform++;
    });

    return { total, konform, kritisch, nichtKonform };
  }, [selectedUnternehmenId, verpackungstypen, regelstatus]);

  // When entering step 5, initialize counts from calculated values
  useEffect(() => {
    if (currentStep === 5) {
      setCounts(calculatedCounts);
    }
  }, [currentStep, calculatedCounts]);

  // Check for existing Kennzahlen record for this Unternehmen + year
  const existingKennzahlen = useMemo(() => {
    if (!selectedUnternehmenId || !formData.berichtsjahr) return null;
    return kennzahlen.find(k => {
      const refId = extractRecordId(k.fields.unternehmen_kpi_ref);
      return refId === selectedUnternehmenId && k.fields.berichtsjahr === formData.berichtsjahr;
    }) ?? null;
  }, [selectedUnternehmenId, formData.berichtsjahr, kennzahlen]);

  // Selected Unternehmen record
  const selectedUnternehmen = useMemo(() => {
    if (!selectedUnternehmenId) return null;
    return unternehmen.find(u => u.record_id === selectedUnternehmenId) ?? null;
  }, [selectedUnternehmenId, unternehmen]);

  // Material sum for live validation
  const materialSum = useMemo(() => {
    return (
      (formData.menge_kunststoff_kg ?? 0) +
      (formData.menge_papier_pappe_kg ?? 0) +
      (formData.menge_glas_kg ?? 0) +
      (formData.menge_metall_kg ?? 0) +
      (formData.menge_verbund_kg ?? 0)
    );
  }, [formData]);

  const gesamtmenge = formData.gesamtmenge_kg ?? 0;

  function handleSelectUnternehmen(id: string) {
    setSelectedUnternehmenId(id);
    setCurrentStep(2);
  }

  function handleStep2Next() {
    setCurrentStep(3);
  }

  function handleStep3Next() {
    setCurrentStep(4);
  }

  function handleStep4Next() {
    setCurrentStep(5);
  }

  async function handleSave() {
    if (!selectedUnternehmenId) return;
    setSaving(true);
    try {
      await LivingAppsService.createKennzahlenEntry({
        unternehmen_kpi_ref: createRecordUrl(APP_IDS.UNTERNEHMEN, selectedUnternehmenId),
        ...formData,
        anzahl_verpackungstypen: counts.total,
        anzahl_konform: counts.konform,
        anzahl_kritisch: counts.kritisch,
        anzahl_nicht_konform: counts.nichtKonform,
      });
      await fetchAll();
      setSavedSuccess(true);
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      alert(err instanceof Error ? err.message : 'Fehler beim Speichern des Berichts');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSelectedUnternehmenId(null);
    setFormData({ berichtsjahr: CURRENT_YEAR });
    setCounts({ total: 0, konform: 0, kritisch: 0, nichtKonform: 0 });
    setSavedSuccess(false);
    setCurrentStep(1);
  }

  function numInput(
    value: number | undefined,
    onChange: (v: number | undefined) => void
  ) {
    return (
      <Input
        type="number"
        min={0}
        value={value ?? ''}
        onChange={e => {
          const v = e.target.value === '' ? undefined : Number(e.target.value);
          onChange(v);
        }}
        className="w-full"
      />
    );
  }

  // PPWR target checks
  function ppwrIndicator(value: number | undefined, target: number) {
    if (value === undefined || value === null) return null;
    const met = value >= target;
    return met ? (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
        <IconCheck size={12} stroke={2.5} /> Ziel erreicht
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
        <IconAlertTriangle size={12} /> Unter Ziel
      </span>
    );
  }

  return (
    <IntentWizardShell
      title="Jahresbericht erfassen"
      subtitle="Jährliche Verpackungs-Kennzahlen für ein Unternehmen erfassen"
      steps={[
        { label: 'Unternehmen' },
        { label: 'Berichtsjahr' },
        { label: 'Mengen' },
        { label: 'Quoten' },
        { label: 'Abschluss' },
      ]}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Unternehmen wählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 overflow-hidden">
            <h2 className="font-semibold text-base mb-1">Unternehmen wählen</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Wähle das Unternehmen, für das du den Jahresbericht erfassen möchtest.
            </p>
            <EntitySelectStep
              items={unternehmen.map(u => ({
                id: u.record_id,
                title: u.fields.firmenname ?? '—',
                subtitle: [u.fields.ort, u.fields.laender].filter(Boolean).join(' · '),
                stats: [
                  {
                    label: 'EPR',
                    value: u.fields.epr_registrierungsnummern ? 'Registriert' : 'Nicht registriert',
                  },
                ],
                icon: <IconBuilding size={20} className="text-primary" />,
              }))}
              onSelect={handleSelectUnternehmen}
              searchPlaceholder="Unternehmen suchen..."
              emptyText="Kein Unternehmen gefunden."
              createLabel="Neues Unternehmen anlegen"
              onCreateNew={() => setDialogOpen(true)}
              createDialog={
                <UnternehmenDialog
                  open={dialogOpen}
                  onClose={() => setDialogOpen(false)}
                  onSubmit={async (fields) => {
                    await LivingAppsService.createUnternehmenEntry(fields);
                    await fetchAll();
                    setDialogOpen(false);
                  }}
                  enablePhotoScan={AI_PHOTO_SCAN['Unternehmen']}
                />
              }
            />
          </div>
        </div>
      )}

      {/* Step 2: Berichtsjahr & Standort */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 overflow-hidden space-y-5">
            <div>
              <h2 className="font-semibold text-base mb-1">Berichtsjahr & Standort</h2>
              {selectedUnternehmen && (
                <p className="text-sm text-muted-foreground">
                  Unternehmen: <span className="font-medium text-foreground">{selectedUnternehmen.fields.firmenname}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="berichtsjahr">Berichtsjahr *</Label>
              <select
                id="berichtsjahr"
                value={formData.berichtsjahr ?? CURRENT_YEAR}
                onChange={e => setFormData(prev => ({ ...prev, berichtsjahr: Number(e.target.value) }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {YEAR_OPTIONS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="standort">Standort / Niederlassung (optional)</Label>
              <Input
                id="standort"
                placeholder="z. B. Werk Berlin, Hauptsitz München..."
                value={formData.standort ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, standort: e.target.value || undefined }))}
              />
              <p className="text-xs text-muted-foreground">
                Leer lassen, wenn der Bericht das gesamte Unternehmen abdeckt.
              </p>
            </div>

            {existingKennzahlen && (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-4 flex gap-3">
                <IconAlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Bericht für {formData.berichtsjahr} existiert bereits
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                    Für dieses Jahr existiert bereits ein Bericht. Möchtest du einen neuen anlegen?
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              <IconArrowLeft size={16} className="mr-2" /> Zurück
            </Button>
            <Button
              onClick={handleStep2Next}
              disabled={!formData.berichtsjahr}
            >
              Weiter <IconArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Mengen erfassen */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 overflow-hidden space-y-5">
            <div>
              <h2 className="font-semibold text-base mb-1">Verpackungsmengen (kg)</h2>
              <p className="text-sm text-muted-foreground">
                Gib die in {formData.berichtsjahr} in Verkehr gebrachten Verpackungsmengen ein.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gesamtmenge_kg">Gesamtmenge (kg) *</Label>
              {numInput(formData.gesamtmenge_kg, v =>
                setFormData(prev => ({ ...prev, gesamtmenge_kg: v }))
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="menge_kunststoff_kg">Kunststoff (kg)</Label>
                {numInput(formData.menge_kunststoff_kg, v =>
                  setFormData(prev => ({ ...prev, menge_kunststoff_kg: v }))
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="menge_papier_pappe_kg">Papier/Pappe (kg)</Label>
                {numInput(formData.menge_papier_pappe_kg, v =>
                  setFormData(prev => ({ ...prev, menge_papier_pappe_kg: v }))
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="menge_glas_kg">Glas (kg)</Label>
                {numInput(formData.menge_glas_kg, v =>
                  setFormData(prev => ({ ...prev, menge_glas_kg: v }))
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="menge_metall_kg">Metall (kg)</Label>
                {numInput(formData.menge_metall_kg, v =>
                  setFormData(prev => ({ ...prev, menge_metall_kg: v }))
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="menge_verbund_kg">Verbund/Sonstiges (kg)</Label>
                {numInput(formData.menge_verbund_kg, v =>
                  setFormData(prev => ({ ...prev, menge_verbund_kg: v }))
                )}
              </div>
            </div>

            {/* Live validation */}
            {materialSum > 0 && gesamtmenge > 0 && materialSum > gesamtmenge && (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-3 flex gap-2">
                <IconAlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Summe der Materialkategorien ({materialSum.toLocaleString('de-DE')} kg) übersteigt die Gesamtmenge ({gesamtmenge.toLocaleString('de-DE')} kg).
                </p>
              </div>
            )}

            {/* Material breakdown visualization */}
            {gesamtmenge > 0 && materialSum > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Materialaufteilung</p>
                {[
                  { label: 'Kunststoff', value: formData.menge_kunststoff_kg ?? 0, color: 'bg-blue-400' },
                  { label: 'Papier/Pappe', value: formData.menge_papier_pappe_kg ?? 0, color: 'bg-amber-400' },
                  { label: 'Glas', value: formData.menge_glas_kg ?? 0, color: 'bg-cyan-400' },
                  { label: 'Metall', value: formData.menge_metall_kg ?? 0, color: 'bg-slate-400' },
                  { label: 'Verbund/Sonstiges', value: formData.menge_verbund_kg ?? 0, color: 'bg-purple-400' },
                ].filter(m => m.value > 0).map(m => (
                  <div key={m.label} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{m.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.color}`}
                        style={{ width: `${Math.min(100, (m.value / Math.max(gesamtmenge, materialSum)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                      {m.value.toLocaleString('de-DE')} kg
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <IconArrowLeft size={16} className="mr-2" /> Zurück
            </Button>
            <Button
              onClick={handleStep3Next}
              disabled={!formData.gesamtmenge_kg || formData.gesamtmenge_kg <= 0}
            >
              Weiter <IconArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Recyclingquoten */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 overflow-hidden space-y-5">
            <div>
              <h2 className="font-semibold text-base mb-1">Recycling- & Mehrwegquoten</h2>
              <p className="text-sm text-muted-foreground">
                Gib die Recycling- und Mehrwegquoten für {formData.berichtsjahr} ein. Alle Felder sind optional.
              </p>
            </div>

            {/* Rezyklatanteile */}
            <div className="space-y-4">
              <p className="text-sm font-medium">Rezyklatanteile</p>

              <div className="space-y-2">
                <Label htmlFor="rezyklatanteil_gesamt_prozent">Rezyklatanteil gesamt (%)</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    {numInput(formData.rezyklatanteil_gesamt_prozent, v =>
                      setFormData(prev => ({ ...prev, rezyklatanteil_gesamt_prozent: v }))
                    )}
                  </div>
                  {ppwrIndicator(formData.rezyklatanteil_gesamt_prozent, 30)}
                </div>
                <p className="text-xs text-muted-foreground">PPWR-Ziel: ≥ 30 %</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rezyklatanteil_kunststoff_prozent">Rezyklatanteil Kunststoff (%)</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      {numInput(formData.rezyklatanteil_kunststoff_prozent, v =>
                        setFormData(prev => ({ ...prev, rezyklatanteil_kunststoff_prozent: v }))
                      )}
                    </div>
                    {ppwrIndicator(formData.rezyklatanteil_kunststoff_prozent, 30)}
                  </div>
                  <p className="text-xs text-muted-foreground">PPWR-Ziel Kunststoff: ≥ 30 %</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rezyklatanteil_papier_prozent">Rezyklatanteil Papier/Pappe (%)</Label>
                  {numInput(formData.rezyklatanteil_papier_prozent, v =>
                    setFormData(prev => ({ ...prev, rezyklatanteil_papier_prozent: v }))
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rezyklatanteil_glas_prozent">Rezyklatanteil Glas (%)</Label>
                  {numInput(formData.rezyklatanteil_glas_prozent, v =>
                    setFormData(prev => ({ ...prev, rezyklatanteil_glas_prozent: v }))
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rezyklatanteil_metall_prozent">Rezyklatanteil Metall (%)</Label>
                  {numInput(formData.rezyklatanteil_metall_prozent, v =>
                    setFormData(prev => ({ ...prev, rezyklatanteil_metall_prozent: v }))
                  )}
                </div>
              </div>
            </div>

            {/* Mehrweg & Recyclingfähigkeit */}
            <div className="space-y-4">
              <p className="text-sm font-medium">Mehrweg & Recyclingfähigkeit</p>

              <div className="space-y-2">
                <Label htmlFor="mehrwegquote_prozent">Mehrwegquote (%)</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    {numInput(formData.mehrwegquote_prozent, v =>
                      setFormData(prev => ({ ...prev, mehrwegquote_prozent: v }))
                    )}
                  </div>
                  {ppwrIndicator(formData.mehrwegquote_prozent, 10)}
                </div>
                <p className="text-xs text-muted-foreground">PPWR-Ziel: ≥ 10 %</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recyclingfaehigkeitsquote_prozent">Recyclingfähigkeitsquote (%)</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    {numInput(formData.recyclingfaehigkeitsquote_prozent, v =>
                      setFormData(prev => ({ ...prev, recyclingfaehigkeitsquote_prozent: v }))
                    )}
                  </div>
                  {ppwrIndicator(formData.recyclingfaehigkeitsquote_prozent, 70)}
                </div>
                <p className="text-xs text-muted-foreground">PPWR-Ziel: ≥ 70 %</p>
              </div>
            </div>

            {/* Hinweise */}
            <div className="space-y-2">
              <Label htmlFor="kpi_hinweise">Hinweise / Anmerkungen (optional)</Label>
              <Textarea
                id="kpi_hinweise"
                placeholder="Methodische Hinweise, Datenquellen, Besonderheiten..."
                value={formData.kpi_hinweise ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, kpi_hinweise: e.target.value || undefined }))}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              <IconArrowLeft size={16} className="mr-2" /> Zurück
            </Button>
            <Button onClick={handleStep4Next}>
              Weiter <IconArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Compliance-Übersicht & Speichern */}
      {currentStep === 5 && !savedSuccess && (
        <div className="space-y-4">
          {/* Compliance summary */}
          <div className="rounded-2xl border bg-card p-6 overflow-hidden space-y-4">
            <div className="flex items-center gap-2">
              <IconChartBar size={18} className="text-primary" />
              <h2 className="font-semibold text-base">Compliance-Übersicht</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatisch aus dem aktuellen Regelstatus der Verpackungstypen berechnet. Du kannst die Werte anpassen.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total */}
              <div className="rounded-xl border bg-secondary/40 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{counts.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Verpackungstypen</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, total: Math.max(0, c.total - 1) }))}
                  >−</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, total: c.total + 1 }))}
                  >+</Button>
                </div>
              </div>

              {/* Konform */}
              <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-4 text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{counts.konform}</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">Konform</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, konform: Math.max(0, c.konform - 1) }))}
                  >−</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, konform: c.konform + 1 }))}
                  >+</Button>
                </div>
              </div>

              {/* Kritisch */}
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{counts.kritisch}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Kritisch</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, kritisch: Math.max(0, c.kritisch - 1) }))}
                  >−</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, kritisch: c.kritisch + 1 }))}
                  >+</Button>
                </div>
              </div>

              {/* Nicht konform */}
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{counts.nichtKonform}</p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">Nicht konform</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, nichtKonform: Math.max(0, c.nichtKonform - 1) }))}
                  >−</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setCounts(c => ({ ...c, nichtKonform: c.nichtKonform + 1 }))}
                  >+</Button>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Summary */}
          <div className="rounded-2xl border bg-card p-6 overflow-hidden space-y-3">
            <div className="flex items-center gap-2">
              <IconFileReport size={18} className="text-primary" />
              <h2 className="font-semibold text-base">Zusammenfassung des Berichts</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Unternehmen</span>
                <span className="font-medium truncate ml-4">{selectedUnternehmen?.fields.firmenname ?? '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Berichtsjahr</span>
                <span className="font-medium">{formData.berichtsjahr}</span>
              </div>
              {formData.standort && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Standort</span>
                  <span className="font-medium truncate ml-4">{formData.standort}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Gesamtmenge</span>
                <span className="font-medium">{(formData.gesamtmenge_kg ?? 0).toLocaleString('de-DE')} kg</span>
              </div>
              {formData.rezyklatanteil_gesamt_prozent !== undefined && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Rezyklatanteil</span>
                  <span className="font-medium">{formData.rezyklatanteil_gesamt_prozent} %</span>
                </div>
              )}
              {formData.mehrwegquote_prozent !== undefined && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Mehrwegquote</span>
                  <span className="font-medium">{formData.mehrwegquote_prozent} %</span>
                </div>
              )}
              {formData.recyclingfaehigkeitsquote_prozent !== undefined && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Recyclingfähigkeitsquote</span>
                  <span className="font-medium">{formData.recyclingfaehigkeitsquote_prozent} %</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>
              <IconArrowLeft size={16} className="mr-2" /> Zurück
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-40">
              {saving ? (
                <>
                  <IconLoader2 size={16} className="mr-2 animate-spin" /> Wird gespeichert...
                </>
              ) : (
                <>
                  <IconCheck size={16} className="mr-2" /> Bericht speichern
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Success State */}
      {currentStep === 5 && savedSuccess && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-8 overflow-hidden text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto">
              <IconCircleCheck size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Bericht gespeichert!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Der Jahresbericht {formData.berichtsjahr} für{' '}
                <span className="font-medium text-foreground">{selectedUnternehmen?.fields.firmenname}</span>{' '}
                wurde erfolgreich gespeichert.
              </p>
            </div>

            {/* Quick summary */}
            <div className="rounded-xl bg-muted/40 p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gesamtmenge</span>
                <span className="font-medium">{(formData.gesamtmenge_kg ?? 0).toLocaleString('de-DE')} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verpackungstypen gesamt</span>
                <span className="font-medium">{counts.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Konform / Kritisch / Nicht konform</span>
                <span className="font-medium">
                  <span className="text-green-600">{counts.konform}</span>
                  {' / '}
                  <span className="text-yellow-600">{counts.kritisch}</span>
                  {' / '}
                  <span className="text-red-600">{counts.nichtKonform}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                Neuen Bericht anlegen
              </Button>
              <a href="#/" className="inline-flex">
                <Button variant="outline" className="w-full sm:w-auto">
                  Zur Übersicht
                </Button>
              </a>
              <a href="#/kennzahlen" className="inline-flex">
                <Button className="w-full sm:w-auto">
                  Kennzahlen anzeigen
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
