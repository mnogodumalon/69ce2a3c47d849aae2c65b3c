import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69ce2a18409773a38eb18808';
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

export default function PublicFormRegelstatus() {
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
          <h1 className="text-2xl font-bold text-foreground">Regelstatus — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="konformitaetsstatus">PPWR-Konformitätsstatus</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.konformitaetsstatus) === 'konform'}
                onClick={() => setFields(f => ({ ...f, konformitaetsstatus: (lookupKey(f.konformitaetsstatus) === 'konform' ? undefined : 'konform') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.konformitaetsstatus) === 'konform'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Konform
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.konformitaetsstatus) === 'kritisch'}
                onClick={() => setFields(f => ({ ...f, konformitaetsstatus: (lookupKey(f.konformitaetsstatus) === 'kritisch' ? undefined : 'kritisch') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.konformitaetsstatus) === 'kritisch'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Kritisch
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.konformitaetsstatus) === 'nicht_konform'}
                onClick={() => setFields(f => ({ ...f, konformitaetsstatus: (lookupKey(f.konformitaetsstatus) === 'nicht_konform' ? undefined : 'nicht_konform') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.konformitaetsstatus) === 'nicht_konform'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Nicht konform
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="datanluecke_flag">Datenlücke vorhanden</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="datanluecke_flag"
                checked={!!fields.datanluecke_flag}
                onCheckedChange={(v) => setFields(f => ({ ...f, datanluecke_flag: !!v }))}
              />
              <Label htmlFor="datanluecke_flag" className="font-normal">Datenlücke vorhanden</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="problemfelder">Erkannte Problemfelder</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="problemfelder_rezyklatquote_zu_niedrig"
                  checked={lookupKeys(fields.problemfelder).includes('rezyklatquote_zu_niedrig')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.problemfelder);
                      const next = checked ? [...current, 'rezyklatquote_zu_niedrig'] : current.filter(k => k !== 'rezyklatquote_zu_niedrig');
                      return { ...f, problemfelder: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="problemfelder_rezyklatquote_zu_niedrig" className="font-normal">Rezyklatquote zu niedrig</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="problemfelder_nicht_recyclingfaehig"
                  checked={lookupKeys(fields.problemfelder).includes('nicht_recyclingfaehig')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.problemfelder);
                      const next = checked ? [...current, 'nicht_recyclingfaehig'] : current.filter(k => k !== 'nicht_recyclingfaehig');
                      return { ...f, problemfelder: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="problemfelder_nicht_recyclingfaehig" className="font-normal">Nicht recyclingfähig</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="problemfelder_kennzeichnung_unvollstaendig"
                  checked={lookupKeys(fields.problemfelder).includes('kennzeichnung_unvollstaendig')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.problemfelder);
                      const next = checked ? [...current, 'kennzeichnung_unvollstaendig'] : current.filter(k => k !== 'kennzeichnung_unvollstaendig');
                      return { ...f, problemfelder: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="problemfelder_kennzeichnung_unvollstaendig" className="font-normal">Kennzeichnung unvollständig</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="problemfelder_mehrwegpflicht_verletzt"
                  checked={lookupKeys(fields.problemfelder).includes('mehrwegpflicht_verletzt')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.problemfelder);
                      const next = checked ? [...current, 'mehrwegpflicht_verletzt'] : current.filter(k => k !== 'mehrwegpflicht_verletzt');
                      return { ...f, problemfelder: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="problemfelder_mehrwegpflicht_verletzt" className="font-normal">Mehrwegpflicht verletzt (Einwegverpackung)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="problemfelder_datanluecke"
                  checked={lookupKeys(fields.problemfelder).includes('datanluecke')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.problemfelder);
                      const next = checked ? [...current, 'datanluecke'] : current.filter(k => k !== 'datanluecke');
                      return { ...f, problemfelder: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="problemfelder_datanluecke" className="font-normal">Datenlücke</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="problemfelder_sonstiges"
                  checked={lookupKeys(fields.problemfelder).includes('sonstiges')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.problemfelder);
                      const next = checked ? [...current, 'sonstiges'] : current.filter(k => k !== 'sonstiges');
                      return { ...f, problemfelder: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="problemfelder_sonstiges" className="font-normal">Sonstiges</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status_kommentar">Kommentar / Maßnahmenempfehlung</Label>
            <Textarea
              id="status_kommentar"
              placeholder=""
              value={fields.status_kommentar ?? ''}
              onChange={e => setFields(f => ({ ...f, status_kommentar: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewertungsdatum">Datum der Bewertung</Label>
            <DatePicker
              id="bewertungsdatum"
              placeholder=""
              mode="date"
              value={fields.bewertungsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, bewertungsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewerter_vorname">Vorname bewertende Person</Label>
            <Input
              id="bewerter_vorname"
              placeholder=""
              value={fields.bewerter_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, bewerter_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewerter_nachname">Nachname bewertende Person</Label>
            <Input
              id="bewerter_nachname"
              placeholder=""
              value={fields.bewerter_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, bewerter_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewerter_abteilung">Abteilung</Label>
            <Input
              id="bewerter_abteilung"
              placeholder=""
              value={fields.bewerter_abteilung ?? ''}
              onChange={e => setFields(f => ({ ...f, bewerter_abteilung: e.target.value }))}
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
