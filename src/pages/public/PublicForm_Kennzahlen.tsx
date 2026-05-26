import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69ce2a19555564c40eccb02c';
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

export default function PublicFormKennzahlen() {
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
          <h1 className="text-2xl font-bold text-foreground">Kennzahlen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="berichtsjahr">Berichtsjahr</Label>
            <Input
              id="berichtsjahr"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.berichtsjahr ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, berichtsjahr: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="standort">Standort / Werk</Label>
            <Input
              id="standort"
              placeholder=""
              value={fields.standort ?? ''}
              onChange={e => setFields(f => ({ ...f, standort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtmenge_kg">Gesamtmenge Verpackungen (kg/Jahr)</Label>
            <Input
              id="gesamtmenge_kg"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.gesamtmenge_kg ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, gesamtmenge_kg: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_kunststoff_kg">Menge Kunststoff (kg/Jahr)</Label>
            <Input
              id="menge_kunststoff_kg"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.menge_kunststoff_kg ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, menge_kunststoff_kg: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_papier_pappe_kg">Menge Papier/Pappe (kg/Jahr)</Label>
            <Input
              id="menge_papier_pappe_kg"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.menge_papier_pappe_kg ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, menge_papier_pappe_kg: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_glas_kg">Menge Glas (kg/Jahr)</Label>
            <Input
              id="menge_glas_kg"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.menge_glas_kg ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, menge_glas_kg: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_metall_kg">Menge Metall (kg/Jahr)</Label>
            <Input
              id="menge_metall_kg"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.menge_metall_kg ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, menge_metall_kg: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menge_verbund_kg">Menge Verbund (kg/Jahr)</Label>
            <Input
              id="menge_verbund_kg"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.menge_verbund_kg ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, menge_verbund_kg: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_gesamt_prozent">Rezyklatanteil gesamt (%)</Label>
            <Input
              id="rezyklatanteil_gesamt_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklatanteil_gesamt_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklatanteil_gesamt_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_kunststoff_prozent">Rezyklatanteil Kunststoff (%)</Label>
            <Input
              id="rezyklatanteil_kunststoff_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklatanteil_kunststoff_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklatanteil_kunststoff_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_papier_prozent">Rezyklatanteil Papier/Pappe (%)</Label>
            <Input
              id="rezyklatanteil_papier_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklatanteil_papier_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklatanteil_papier_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_glas_prozent">Rezyklatanteil Glas (%)</Label>
            <Input
              id="rezyklatanteil_glas_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklatanteil_glas_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklatanteil_glas_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rezyklatanteil_metall_prozent">Rezyklatanteil Metall (%)</Label>
            <Input
              id="rezyklatanteil_metall_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.rezyklatanteil_metall_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, rezyklatanteil_metall_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mehrwegquote_prozent">Mehrwegquote (%)</Label>
            <Input
              id="mehrwegquote_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.mehrwegquote_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, mehrwegquote_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recyclingfaehigkeitsquote_prozent">Anteil recyclingfähiger Verpackungen (%)</Label>
            <Input
              id="recyclingfaehigkeitsquote_prozent"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.recyclingfaehigkeitsquote_prozent ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, recyclingfaehigkeitsquote_prozent: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_verpackungstypen">Anzahl Verpackungstypen gesamt</Label>
            <Input
              id="anzahl_verpackungstypen"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.anzahl_verpackungstypen ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, anzahl_verpackungstypen: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_konform">Davon konform</Label>
            <Input
              id="anzahl_konform"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.anzahl_konform ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, anzahl_konform: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_kritisch">Davon kritisch</Label>
            <Input
              id="anzahl_kritisch"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.anzahl_kritisch ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, anzahl_kritisch: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_nicht_konform">Davon nicht konform</Label>
            <Input
              id="anzahl_nicht_konform"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.anzahl_nicht_konform ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, anzahl_nicht_konform: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kpi_hinweise">Hinweise / Anmerkungen</Label>
            <Textarea
              id="kpi_hinweise"
              placeholder=""
              value={fields.kpi_hinweise ?? ''}
              onChange={e => setFields(f => ({ ...f, kpi_hinweise: e.target.value }))}
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
