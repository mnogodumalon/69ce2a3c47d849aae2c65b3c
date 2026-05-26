import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69ce2a16a11c5c94e64a8724';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormVerpackungstypen() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Verpackungstypen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="verpackungs_id">Verpackungs-ID</Label>
            <Input
              id="verpackungs_id"
              placeholder=""
              value={fields.verpackungs_id ?? ''}
              onChange={e => setFields(f => ({ ...f, verpackungs_id: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verpackungsname">Name der Verpackung</Label>
            <Input
              id="verpackungsname"
              placeholder=""
              value={fields.verpackungsname ?? ''}
              onChange={e => setFields(f => ({ ...f, verpackungsname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea
              id="beschreibung"
              placeholder=""
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="produktkategorie">Produktkategorie</Label>
            <Input
              id="produktkategorie"
              placeholder=""
              value={fields.produktkategorie ?? ''}
              onChange={e => setFields(f => ({ ...f, produktkategorie: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="materialzusammensetzung">Detaillierte Materialzusammensetzung</Label>
            <Textarea
              id="materialzusammensetzung"
              placeholder=""
              value={fields.materialzusammensetzung ?? ''}
              onChange={e => setFields(f => ({ ...f, materialzusammensetzung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material_einzelmaterialien">Einzelmaterialien (Bezeichnung)</Label>
            <Input
              id="material_einzelmaterialien"
              placeholder=""
              value={fields.material_einzelmaterialien ?? ''}
              onChange={e => setFields(f => ({ ...f, material_einzelmaterialien: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material_prozentsaetze">Materialanteile in %</Label>
            <Input
              id="material_prozentsaetze"
              placeholder=""
              value={fields.material_prozentsaetze ?? ''}
              onChange={e => setFields(f => ({ ...f, material_prozentsaetze: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="material_gewichte_g">Materialgewichte in Gramm</Label>
            <Input
              id="material_gewichte_g"
              placeholder=""
              value={fields.material_gewichte_g ?? ''}
              onChange={e => setFields(f => ({ ...f, material_gewichte_g: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="laenge_mm">Länge (mm)</Label>
            <Input
              id="laenge_mm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.laenge_mm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, laenge_mm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="breite_mm">Breite (mm)</Label>
            <Input
              id="breite_mm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.breite_mm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, breite_mm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hoehe_mm">Höhe (mm)</Label>
            <Input
              id="hoehe_mm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.hoehe_mm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, hoehe_mm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wandstaerke_mm">Wandstärke (mm)</Label>
            <Input
              id="wandstaerke_mm"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.wandstaerke_mm ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, wandstaerke_mm: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="volumen_ml">Volumen (ml)</Label>
            <Input
              id="volumen_ml"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.volumen_ml ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, volumen_ml: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtgewicht_g">Gesamtgewicht (g)</Label>
            <Input
              id="gesamtgewicht_g"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gesamtgewicht_g ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gesamtgewicht_g: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postconsumer_prozent">Post-Consumer-Rezyklatanteil (%)</Label>
            <Input
              id="rezyklat_postconsumer_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklat_postconsumer_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklat_postconsumer_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postconsumer_kg_jahr">Post-Consumer-Rezyklat (kg/Jahr)</Label>
            <Input
              id="rezyklat_postconsumer_kg_jahr"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklat_postconsumer_kg_jahr ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklat_postconsumer_kg_jahr: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postindustrial_prozent">Post-Industrial-Rezyklatanteil (%)</Label>
            <Input
              id="rezyklat_postindustrial_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklat_postindustrial_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklat_postindustrial_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklat_postindustrial_kg_jahr">Post-Industrial-Rezyklat (kg/Jahr)</Label>
            <Input
              id="rezyklat_postindustrial_kg_jahr"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklat_postindustrial_kg_jahr ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklat_postindustrial_kg_jahr: n })); }}
            />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="recyclingfaehigkeit_score">Recyclingfähigkeit – Score (0–100)</Label>
            <Input
              id="recyclingfaehigkeit_score"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.recyclingfaehigkeit_score ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, recyclingfaehigkeit_score: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recyclingfaehigkeit_referenz">Referenz Prüfstandard / Gutachten</Label>
            <Input
              id="recyclingfaehigkeit_referenz"
              placeholder=""
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
              step="any"
              min={0}
              placeholder=""
              value={fields.erwartete_umlaeufe ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, erwartete_umlaeufe: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ruecknahmesystem">Beschreibung Rücknahmesystem</Label>
            <Textarea
              id="ruecknahmesystem"
              placeholder=""
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
              placeholder=""
              value={fields.kennzeichnung_hinweise ?? ''}
              onChange={e => setFields(f => ({ ...f, kennzeichnung_hinweise: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
