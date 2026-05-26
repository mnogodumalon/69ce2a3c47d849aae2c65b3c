import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '69ce2a186fb9551311abbd7f';
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

export default function PublicFormNachweise() {
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
          <h1 className="text-2xl font-bold text-foreground">Nachweise — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="dokumentart">Dokumentart</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.dokumentart) === 'zertifikat'}
                onClick={() => setFields(f => ({ ...f, dokumentart: (lookupKey(f.dokumentart) === 'zertifikat' ? undefined : 'zertifikat') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.dokumentart) === 'zertifikat'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Zertifikat
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.dokumentart) === 'laboranalyse'}
                onClick={() => setFields(f => ({ ...f, dokumentart: (lookupKey(f.dokumentart) === 'laboranalyse' ? undefined : 'laboranalyse') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.dokumentart) === 'laboranalyse'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Laboranalyse
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.dokumentart) === 'gutachten'}
                onClick={() => setFields(f => ({ ...f, dokumentart: (lookupKey(f.dokumentart) === 'gutachten' ? undefined : 'gutachten') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.dokumentart) === 'gutachten'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Gutachten
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.dokumentart) === 'sonstiges'}
                onClick={() => setFields(f => ({ ...f, dokumentart: (lookupKey(f.dokumentart) === 'sonstiges' ? undefined : 'sonstiges') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.dokumentart) === 'sonstiges'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstiges
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.dokumentart) === 'pruefbericht'}
                onClick={() => setFields(f => ({ ...f, dokumentart: (lookupKey(f.dokumentart) === 'pruefbericht' ? undefined : 'pruefbericht') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.dokumentart) === 'pruefbericht'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Prüfbericht
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aussteller">Aussteller</Label>
            <Input
              id="aussteller"
              placeholder=""
              value={fields.aussteller ?? ''}
              onChange={e => setFields(f => ({ ...f, aussteller: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ausstellungsdatum">Ausstellungsdatum</Label>
            <DatePicker
              id="ausstellungsdatum"
              placeholder=""
              mode="date"
              value={fields.ausstellungsdatum ?? null}
              onChange={v => setFields(f => ({ ...f, ausstellungsdatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gueltig_bis">Gültig bis</Label>
            <DatePicker
              id="gueltig_bis"
              placeholder=""
              mode="date"
              value={fields.gueltig_bis ?? null}
              onChange={v => setFields(f => ({ ...f, gueltig_bis: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dokument_url">Dokument-Link (URL)</Label>
            <Input
              id="dokument_url"
              value={fields.dokument_url ?? ''}
              onChange={e => setFields(f => ({ ...f, dokument_url: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachweis_hinweise">Hinweise / Anmerkungen</Label>
            <Textarea
              id="nachweis_hinweise"
              placeholder=""
              value={fields.nachweis_hinweise ?? ''}
              onChange={e => setFields(f => ({ ...f, nachweis_hinweise: e.target.value }))}
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
