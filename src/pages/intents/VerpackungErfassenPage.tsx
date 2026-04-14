import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { UnternehmenDialog } from '@/components/dialogs/UnternehmenDialog';
import { VerpackungstypenDialog } from '@/components/dialogs/VerpackungstypenDialog';
import { RegelstatusDialog } from '@/components/dialogs/RegelstatusDialog';
import { NachweiseDialog } from '@/components/dialogs/NachweiseDialog';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Unternehmen, Verpackungstypen, Nachweise, Regelstatus } from '@/types/app';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconBuilding,
  IconBox,
  IconShieldCheck,
  IconFileText,
  IconCheck,
  IconAlertTriangle,
  IconPlus,
  IconArrowRight,
  IconRefresh,
  IconPackage,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Unternehmen' },
  { label: 'Verpackungstyp' },
  { label: 'Bewertung' },
  { label: 'Nachweise' },
  { label: 'Zusammenfassung' },
];

function getKonformitaetsColor(key: string | undefined): string {
  if (key === 'konform') return 'bg-green-100 text-green-700 border-green-200';
  if (key === 'kritisch') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (key === 'nicht_konform') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function getKonformitaetsIcon(key: string | undefined) {
  if (key === 'konform') return <IconShieldCheck size={20} className="text-green-600" />;
  if (key === 'kritisch') return <IconAlertTriangle size={20} className="text-amber-600" />;
  if (key === 'nicht_konform') return <IconAlertTriangle size={20} className="text-red-600" />;
  return <IconShieldCheck size={20} className="text-gray-400" />;
}

function isExpiringWithin30Days(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    return d <= in30 && d >= now;
  } catch {
    return false;
  }
}

function isExpired(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) < new Date();
  } catch {
    return false;
  }
}

export default function VerpackungErfassenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { unternehmen, verpackungstypen, nachweise, regelstatus, loading, error, fetchAll } = useDashboardData();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedUnternehmenId, setSelectedUnternehmenId] = useState<string | null>(null);
  const [selectedVerpackungId, setSelectedVerpackungId] = useState<string | null>(null);
  const [bewertungDone, setBewertungDone] = useState(false);

  // Dialog states
  const [unternehmenDialogOpen, setUnternehmenDialogOpen] = useState(false);
  const [verpackungDialogOpen, setVerpackungDialogOpen] = useState(false);
  const [regelstatusDialogOpen, setRegelstatusDialogOpen] = useState(false);
  const [nachweiseDialogOpen, setNachweiseDialogOpen] = useState(false);

  // Deep-linking: parse URL params on mount
  useEffect(() => {
    const urlUnternehmenId = searchParams.get('unternehmenId');
    const urlVerpackungId = searchParams.get('verpackungId');
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);

    if (urlVerpackungId) {
      setSelectedVerpackungId(urlVerpackungId);
      // Try to resolve the unternehmen from verpackung
    }
    if (urlUnternehmenId) {
      setSelectedUnternehmenId(urlUnternehmenId);
    }

    if (urlStep >= 1 && urlStep <= 5) {
      setCurrentStep(urlStep);
    } else if (urlVerpackungId) {
      setCurrentStep(3);
    } else if (urlUnternehmenId) {
      setCurrentStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync step and selections to URL
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
    if (selectedVerpackungId) {
      params.set('verpackungId', selectedVerpackungId);
    } else {
      params.delete('verpackungId');
    }
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedUnternehmenId, selectedVerpackungId]);

  // Derived data
  const selectedUnternehmen: Unternehmen | undefined = useMemo(
    () => unternehmen.find(u => u.record_id === selectedUnternehmenId),
    [unternehmen, selectedUnternehmenId]
  );

  const selectedVerpackung: Verpackungstypen | undefined = useMemo(
    () => verpackungstypen.find(v => v.record_id === selectedVerpackungId),
    [verpackungstypen, selectedVerpackungId]
  );

  const filteredVerpackungstypen: Verpackungstypen[] = useMemo(() => {
    if (!selectedUnternehmenId) return [];
    return verpackungstypen.filter(v => {
      if (!v.fields.unternehmen_ref) return false;
      const refId = extractRecordId(v.fields.unternehmen_ref);
      return refId === selectedUnternehmenId;
    });
  }, [verpackungstypen, selectedUnternehmenId]);

  const filteredNachweise: Nachweise[] = useMemo(() => {
    if (!selectedVerpackungId) return [];
    return nachweise.filter(n => {
      if (!n.fields.verpackungstyp_ref) return false;
      const refId = extractRecordId(n.fields.verpackungstyp_ref);
      return refId === selectedVerpackungId;
    });
  }, [nachweise, selectedVerpackungId]);

  const currentRegelstatus: Regelstatus | undefined = useMemo(() => {
    if (!selectedVerpackungId) return undefined;
    return regelstatus.find(r => {
      if (!r.fields.verpackungstyp_status_ref) return false;
      const refId = extractRecordId(r.fields.verpackungstyp_status_ref);
      return refId === selectedVerpackungId;
    });
  }, [regelstatus, selectedVerpackungId]);

  // Count verpackungstypen per unternehmen
  const verpackungCountByUnternehmen = useMemo(() => {
    const m: Record<string, number> = {};
    verpackungstypen.forEach(v => {
      if (!v.fields.unternehmen_ref) return;
      const refId = extractRecordId(v.fields.unternehmen_ref);
      if (refId) m[refId] = (m[refId] ?? 0) + 1;
    });
    return m;
  }, [verpackungstypen]);

  // Handlers
  function handleStepChange(step: number) {
    setCurrentStep(step);
  }

  function handleSelectUnternehmen(id: string) {
    setSelectedUnternehmenId(id);
    setSelectedVerpackungId(null);
    setBewertungDone(false);
    setCurrentStep(2);
  }

  function handleSelectVerpackung(id: string) {
    setSelectedVerpackungId(id);
    setCurrentStep(3);
  }

  async function handleCreateUnternehmen(fields: Record<string, unknown>) {
    const result = await LivingAppsService.createUnternehmenEntry(fields);
    await fetchAll();
    // Auto-select newly created unternehmen
    if (result && typeof result === 'object') {
      const entries = Object.entries(result as Record<string, unknown>);
      if (entries.length > 0) {
        const newId = entries[0][0];
        setSelectedUnternehmenId(newId);
        setCurrentStep(2);
      }
    }
    setUnternehmenDialogOpen(false);
  }

  async function handleCreateVerpackung(fields: Record<string, unknown>) {
    const result = await LivingAppsService.createVerpackungstypenEntry(fields);
    await fetchAll();
    // Auto-select newly created verpackung
    if (result && typeof result === 'object') {
      const entries = Object.entries(result as Record<string, unknown>);
      if (entries.length > 0) {
        const newId = entries[0][0];
        setSelectedVerpackungId(newId);
        setCurrentStep(3);
      }
    }
    setVerpackungDialogOpen(false);
  }

  async function handleCreateRegelstatus(fields: Record<string, unknown>) {
    if (currentRegelstatus) {
      await LivingAppsService.updateRegelstatu(currentRegelstatus.record_id, fields);
    } else {
      await LivingAppsService.createRegelstatu(fields);
    }
    await fetchAll();
    setBewertungDone(true);
    setRegelstatusDialogOpen(false);
  }

  async function handleCreateNachweis(fields: Record<string, unknown>) {
    await LivingAppsService.createNachweiseEntry(fields);
    await fetchAll();
    setNachweiseDialogOpen(false);
  }

  function handleReset() {
    setSelectedUnternehmenId(null);
    setSelectedVerpackungId(null);
    setBewertungDone(false);
    setCurrentStep(1);
  }

  return (
    <IntentWizardShell
      title="Verpackung erfassen & bewerten"
      subtitle="Verpackungstyp registrieren und PPWR-Konformität prüfen"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Unternehmen wählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconBuilding size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Unternehmen auswählen</h2>
              <p className="text-xs text-muted-foreground">Wähle das Unternehmen, für das du eine Verpackung erfassen möchtest.</p>
            </div>
          </div>
          <EntitySelectStep
            items={unternehmen.map(u => ({
              id: u.record_id,
              title: u.fields.firmenname ?? '—',
              subtitle: [u.fields.strasse, u.fields.hausnummer, u.fields.plz, u.fields.ort].filter(Boolean).join(' ') || (u.fields.ort ?? ''),
              stats: [
                { label: 'Verpackungstypen', value: verpackungCountByUnternehmen[u.record_id] ?? 0 },
              ],
              icon: <IconBuilding size={18} className="text-primary" />,
            }))}
            onSelect={handleSelectUnternehmen}
            searchPlaceholder="Unternehmen suchen..."
            emptyText="Noch kein Unternehmen vorhanden."
            createLabel="Neues Unternehmen anlegen"
            onCreateNew={() => setUnternehmenDialogOpen(true)}
            createDialog={
              <UnternehmenDialog
                open={unternehmenDialogOpen}
                onClose={() => setUnternehmenDialogOpen(false)}
                onSubmit={handleCreateUnternehmen}
                enablePhotoScan={AI_PHOTO_SCAN['Unternehmen']}
              />
            }
          />
        </div>
      )}

      {/* Step 2: Verpackungstyp wählen oder anlegen */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {selectedUnternehmen && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary border">
              <IconBuilding size={16} className="text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block">{selectedUnternehmen.fields.firmenname}</span>
                {selectedUnternehmen.fields.ort && (
                  <span className="text-xs text-muted-foreground">{selectedUnternehmen.fields.ort}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 text-xs"
                onClick={() => setCurrentStep(1)}
              >
                Ändern
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconBox size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Verpackungstyp auswählen</h2>
              <p className="text-xs text-muted-foreground">
                {filteredVerpackungstypen.length > 0
                  ? `${filteredVerpackungstypen.length} Verpackungstypen für dieses Unternehmen`
                  : 'Noch keine Verpackungstypen — leg eine neue an.'}
              </p>
            </div>
          </div>

          <EntitySelectStep
            items={filteredVerpackungstypen.map(v => {
              const rs = regelstatus.find(r => {
                if (!r.fields.verpackungstyp_status_ref) return false;
                return extractRecordId(r.fields.verpackungstyp_status_ref) === v.record_id;
              });
              return {
                id: v.record_id,
                title: v.fields.verpackungsname ?? '—',
                subtitle: v.fields.verpackungs_id ?? '',
                status: rs?.fields.konformitaetsstatus
                  ? { key: rs.fields.konformitaetsstatus.key, label: rs.fields.konformitaetsstatus.label }
                  : undefined,
                stats: [
                  ...(v.fields.material_hauptkategorie ? [{ label: 'Material', value: v.fields.material_hauptkategorie.label }] : []),
                  ...(v.fields.verwendungszweck ? [{ label: 'Zweck', value: v.fields.verwendungszweck.label }] : []),
                ],
                icon: <IconPackage size={18} className="text-primary" />,
              };
            })}
            onSelect={handleSelectVerpackung}
            searchPlaceholder="Verpackung suchen..."
            emptyText="Keine Verpackungstypen für dieses Unternehmen gefunden."
            createLabel="Neue Verpackung anlegen"
            onCreateNew={() => setVerpackungDialogOpen(true)}
            createDialog={
              <VerpackungstypenDialog
                open={verpackungDialogOpen}
                onClose={() => setVerpackungDialogOpen(false)}
                onSubmit={handleCreateVerpackung}
                defaultValues={
                  selectedUnternehmenId
                    ? { unternehmen_ref: createRecordUrl(APP_IDS.UNTERNEHMEN, selectedUnternehmenId) }
                    : undefined
                }
                unternehmenList={unternehmen}
                enablePhotoScan={AI_PHOTO_SCAN['Verpackungstypen']}
              />
            }
          />

          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
              Zurück zu Schritt 1
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Compliance-Bewertung */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Summary card for selected packaging */}
          {selectedVerpackung && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IconPackage size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{selectedVerpackung.fields.verpackungsname ?? '—'}</h3>
                    {selectedVerpackung.fields.verpackungs_id && (
                      <p className="text-xs text-muted-foreground">ID: {selectedVerpackung.fields.verpackungs_id}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedVerpackung.fields.material_hauptkategorie && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {selectedVerpackung.fields.material_hauptkategorie.label}
                        </span>
                      )}
                      {selectedVerpackung.fields.verwendungszweck && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {selectedVerpackung.fields.verwendungszweck.label}
                        </span>
                      )}
                      {selectedVerpackung.fields.laenge_mm && selectedVerpackung.fields.breite_mm && selectedVerpackung.fields.hoehe_mm && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {selectedVerpackung.fields.laenge_mm} × {selectedVerpackung.fields.breite_mm} × {selectedVerpackung.fields.hoehe_mm} mm
                        </span>
                      )}
                      {selectedVerpackung.fields.gesamtgewicht_g && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {selectedVerpackung.fields.gesamtgewicht_g} g
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => setCurrentStep(2)}>
                    Ändern
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Regelstatus */}
          {currentRegelstatus ? (
            <Card className="overflow-hidden border-2" style={{ borderColor: currentRegelstatus.fields.konformitaetsstatus?.key === 'konform' ? '#16a34a40' : currentRegelstatus.fields.konformitaetsstatus?.key === 'kritisch' ? '#d9770640' : '#dc262640' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {getKonformitaetsIcon(currentRegelstatus.fields.konformitaetsstatus?.key)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold">Aktuelle Bewertung</h4>
                    {currentRegelstatus.fields.bewertungsdatum && (
                      <p className="text-xs text-muted-foreground">
                        Bewertet am {formatDate(currentRegelstatus.fields.bewertungsdatum)}
                      </p>
                    )}
                  </div>
                  {currentRegelstatus.fields.konformitaetsstatus && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getKonformitaetsColor(currentRegelstatus.fields.konformitaetsstatus.key)}`}>
                      {currentRegelstatus.fields.konformitaetsstatus.label}
                    </span>
                  )}
                </div>
                {currentRegelstatus.fields.problemfelder && Array.isArray(currentRegelstatus.fields.problemfelder) && currentRegelstatus.fields.problemfelder.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Problemfelder:</p>
                    <div className="flex flex-wrap gap-1">
                      {(currentRegelstatus.fields.problemfelder as Array<{ key: string; label: string }>).map((p, i) => (
                        <span key={i} className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {currentRegelstatus.fields.status_kommentar && (
                  <p className="text-xs text-muted-foreground italic">{currentRegelstatus.fields.status_kommentar}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => setRegelstatusDialogOpen(true)}
                >
                  <IconRefresh size={14} />
                  Bewertung aktualisieren
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-dashed">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <IconShieldCheck size={22} className="text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold mb-1">Noch keine Bewertung vorhanden</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Bewerte jetzt die PPWR-Konformität dieser Verpackung.
                </p>
                <Button
                  onClick={() => setRegelstatusDialogOpen(true)}
                  className="gap-1.5"
                >
                  <IconShieldCheck size={16} />
                  Konformität bewerten
                </Button>
              </CardContent>
            </Card>
          )}

          {/* After fresh assessment */}
          {bewertungDone && currentRegelstatus && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <IconCheck size={16} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-medium">Bewertung erfolgreich gespeichert.</p>
            </div>
          )}

          <RegelstatusDialog
            open={regelstatusDialogOpen}
            onClose={() => setRegelstatusDialogOpen(false)}
            onSubmit={handleCreateRegelstatus}
            defaultValues={
              selectedVerpackungId
                ? {
                    verpackungstyp_status_ref: createRecordUrl(APP_IDS.VERPACKUNGSTYPEN, selectedVerpackungId),
                    ...(currentRegelstatus?.fields ?? {}),
                  }
                : undefined
            }
            verpackungstypenList={verpackungstypen}
            enablePhotoScan={AI_PHOTO_SCAN['Regelstatus']}
          />

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(4)}
              disabled={!currentRegelstatus && !bewertungDone}
              className="gap-1.5"
            >
              Weiter zu Nachweisen
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Nachweise hinzufügen */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <IconFileText size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Nachweise hinzufügen</h2>
                <p className="text-xs text-muted-foreground">
                  {filteredNachweise.length} {filteredNachweise.length === 1 ? 'Nachweis' : 'Nachweise'} erfasst (optional)
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setNachweiseDialogOpen(true)}
            >
              <IconPlus size={14} />
              Nachweis hinzufügen
            </Button>
          </div>

          {/* Nachweise list */}
          {filteredNachweise.length === 0 ? (
            <Card className="overflow-hidden border-dashed">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <IconFileText size={22} className="text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold mb-1">Noch keine Nachweise erfasst</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Nachweise sind optional, aber empfehlenswert für die Compliance-Dokumentation.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNachweiseDialogOpen(true)}>
                  <IconPlus size={14} />
                  Ersten Nachweis hinzufügen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNachweise.map(n => {
                const expired = isExpired(n.fields.gueltig_bis);
                const expiringSoon = !expired && isExpiringWithin30Days(n.fields.gueltig_bis);
                return (
                  <div
                    key={n.record_id}
                    className={`flex items-start gap-3 p-4 rounded-xl border bg-card overflow-hidden ${
                      expired ? 'border-red-200 bg-red-50/30' : expiringSoon ? 'border-amber-200 bg-amber-50/30' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <IconFileText size={15} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {n.fields.dokumentart?.label ?? 'Dokument'}
                        </span>
                        {expired && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0">Abgelaufen</span>
                        )}
                        {expiringSoon && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                            <IconAlertTriangle size={10} className="inline mr-0.5" />
                            Läuft bald ab
                          </span>
                        )}
                      </div>
                      {n.fields.aussteller && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">Aussteller: {n.fields.aussteller}</p>
                      )}
                      {n.fields.gueltig_bis && (
                        <p className={`text-xs mt-0.5 ${expired ? 'text-red-600' : expiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          Gültig bis: {formatDate(n.fields.gueltig_bis)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <NachweiseDialog
            open={nachweiseDialogOpen}
            onClose={() => setNachweiseDialogOpen(false)}
            onSubmit={handleCreateNachweis}
            defaultValues={
              selectedVerpackungId
                ? { verpackungstyp_ref: createRecordUrl(APP_IDS.VERPACKUNGSTYPEN, selectedVerpackungId) }
                : undefined
            }
            verpackungstypenList={verpackungstypen}
            enablePhotoScan={AI_PHOTO_SCAN['Nachweise']}
          />

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              Zurück
            </Button>
            <Button variant="outline" onClick={() => setCurrentStep(5)} className="gap-1.5">
              Weiter ohne Nachweise
              <IconArrowRight size={16} />
            </Button>
            <Button onClick={() => setCurrentStep(5)} className="gap-1.5">
              Weiter
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Zusammenfassung */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <IconCheck size={20} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Erfassung abgeschlossen</h2>
              <p className="text-xs text-muted-foreground">Hier ist eine Zusammenfassung der erfassten Verpackung.</p>
            </div>
          </div>

          {/* Company card */}
          {selectedUnternehmen && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconBuilding size={15} className="text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unternehmen</span>
                </div>
                <p className="font-semibold text-sm">{selectedUnternehmen.fields.firmenname ?? '—'}</p>
                {(selectedUnternehmen.fields.strasse || selectedUnternehmen.fields.ort) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[
                      selectedUnternehmen.fields.strasse,
                      selectedUnternehmen.fields.hausnummer,
                    ].filter(Boolean).join(' ')}
                    {(selectedUnternehmen.fields.strasse || selectedUnternehmen.fields.hausnummer) && ', '}
                    {[selectedUnternehmen.fields.plz, selectedUnternehmen.fields.ort].filter(Boolean).join(' ')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verpackung card */}
          {selectedVerpackung && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconPackage size={15} className="text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verpackungstyp</span>
                </div>
                <p className="font-semibold text-sm">{selectedVerpackung.fields.verpackungsname ?? '—'}</p>
                {selectedVerpackung.fields.verpackungs_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">ID: {selectedVerpackung.fields.verpackungs_id}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedVerpackung.fields.material_hauptkategorie && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                      {selectedVerpackung.fields.material_hauptkategorie.label}
                    </span>
                  )}
                  {selectedVerpackung.fields.verwendungszweck && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                      {selectedVerpackung.fields.verwendungszweck.label}
                    </span>
                  )}
                  {selectedVerpackung.fields.laenge_mm && selectedVerpackung.fields.breite_mm && selectedVerpackung.fields.hoehe_mm && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                      {selectedVerpackung.fields.laenge_mm} × {selectedVerpackung.fields.breite_mm} × {selectedVerpackung.fields.hoehe_mm} mm
                    </span>
                  )}
                  {selectedVerpackung.fields.gesamtgewicht_g && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                      {selectedVerpackung.fields.gesamtgewicht_g} g
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance result */}
          {currentRegelstatus && (
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconShieldCheck size={15} className="text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compliance-Ergebnis</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  {getKonformitaetsIcon(currentRegelstatus.fields.konformitaetsstatus?.key)}
                  {currentRegelstatus.fields.konformitaetsstatus && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getKonformitaetsColor(currentRegelstatus.fields.konformitaetsstatus.key)}`}>
                      {currentRegelstatus.fields.konformitaetsstatus.label}
                    </span>
                  )}
                </div>
                {currentRegelstatus.fields.problemfelder && Array.isArray(currentRegelstatus.fields.problemfelder) && currentRegelstatus.fields.problemfelder.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Problemfelder:</p>
                    <ul className="space-y-1">
                      {(currentRegelstatus.fields.problemfelder as Array<{ key: string; label: string }>).map((p, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-destructive">
                          <IconAlertTriangle size={12} />
                          {p.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentRegelstatus.fields.status_kommentar && (
                  <div className="p-2 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground italic">{currentRegelstatus.fields.status_kommentar}</p>
                  </div>
                )}
                {currentRegelstatus.fields.bewertungsdatum && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Bewertet am {formatDate(currentRegelstatus.fields.bewertungsdatum)}
                    {currentRegelstatus.fields.bewerter_vorname && (
                      <> von {currentRegelstatus.fields.bewerter_vorname} {currentRegelstatus.fields.bewerter_nachname ?? ''}</>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Nachweise summary */}
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <IconFileText size={15} className="text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nachweise</span>
                <span className="ml-auto text-xs font-semibold text-foreground">
                  {filteredNachweise.length} {filteredNachweise.length === 1 ? 'Nachweis' : 'Nachweise'}
                </span>
              </div>
              {filteredNachweise.length === 0 ? (
                <p className="text-xs text-muted-foreground">Keine Nachweise erfasst.</p>
              ) : (
                <ul className="space-y-1">
                  {filteredNachweise.map(n => (
                    <li key={n.record_id} className="flex items-center gap-2 text-xs">
                      <IconCheck size={12} className="text-green-600 shrink-0" />
                      <span className="truncate">
                        {n.fields.dokumentart?.label ?? 'Dokument'}
                        {n.fields.aussteller && ` – ${n.fields.aussteller}`}
                        {n.fields.gueltig_bis && ` (bis ${formatDate(n.fields.gueltig_bis)})`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleReset} variant="outline" className="gap-1.5">
              <IconPlus size={16} />
              Neue Verpackung bewerten
            </Button>
            <a href="#/" className="inline-flex">
              <Button variant="outline" className="w-full gap-1.5">
                Zurück zur Übersicht
              </Button>
            </a>
            <a href="#/verpackungstypen" className="inline-flex">
              <Button className="w-full gap-1.5">
                <IconPackage size={16} />
                Zur Verpackungsliste
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
