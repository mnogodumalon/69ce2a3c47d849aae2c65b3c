/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - verpackungstypen: unternehmen_ref (Unternehmen), verpackungs_id (Verpackungs-ID), verpackungsname (Name der Verpackung), verwendungszweck (Verwendungszweck), material_hauptkategorie (Material-Hauptkategorie)
 *   - unternehmen: firmenname (Firmenname), strasse (Straße), hausnummer (Hausnummer), plz (Postleitzahl), ort (Ort), ansprechpartner_vorname (Vorname Ansprechpartner), ansprechpartner_nachname (Nachname Ansprechpartner)
 *   - regelstatus: verpackungstyp_status_ref (Verpackungstyp), konformitaetsstatus (PPWR-Konformitätsstatus), bewertungsdatum (Datum der Bewertung)
 *   - nachweise: verpackungstyp_ref (Verpackungstyp), dokumentart (Dokumentart), aussteller (Aussteller), ausstellungsdatum (Ausstellungsdatum)
 *   - kennzahlen: unternehmen_kpi_ref (Unternehmen), berichtsjahr (Berichtsjahr)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "verpackungstypen": "unternehmen_ref" | "verpackungs_id" | "verpackungsname" | "beschreibung" | "produktkategorie" | "verwendungszweck" | "material_hauptkategorie" | "materialzusammensetzung" | "material_einzelmaterialien" | "material_prozentsaetze" | "material_gewichte_g" | "laenge_mm" | "breite_mm" | "hoehe_mm" | "wandstaerke_mm" | "volumen_ml" | "gesamtgewicht_g" | "rezyklat_postconsumer_prozent" | "rezyklat_postconsumer_kg_jahr" | "rezyklat_postindustrial_prozent" | "rezyklat_postindustrial_kg_jahr" | "recyclingfaehigkeit_kategorie" | "recyclingfaehigkeit_score" | "recyclingfaehigkeit_referenz" | "mehrwegfaehig" | "erwartete_umlaeufe" | "ruecknahmesystem" | "ppwr_quoten_zuordnung" | "kennzeichnung_vollstaendig" | "kennzeichnung_hinweise";
  "unternehmen": "firmenname" | "strasse" | "hausnummer" | "plz" | "ort" | "laender" | "ansprechpartner_vorname" | "ansprechpartner_nachname" | "ansprechpartner_email" | "ansprechpartner_telefon" | "steuernummer" | "epr_registrierungsnummern" | "verantwortlich_vorname" | "verantwortlich_nachname" | "verantwortlich_funktion" | "verantwortlich_email";
  "regelstatus": "verpackungstyp_status_ref" | "konformitaetsstatus" | "datanluecke_flag" | "problemfelder" | "status_kommentar" | "bewertungsdatum" | "bewerter_vorname" | "bewerter_nachname" | "bewerter_abteilung";
  "nachweise": "verpackungstyp_ref" | "dokumentart" | "aussteller" | "dokument_url" | "ausstellungsdatum" | "gueltig_bis" | "nachweis_hinweise";
  "kennzahlen": "unternehmen_kpi_ref" | "berichtsjahr" | "standort" | "gesamtmenge_kg" | "menge_kunststoff_kg" | "menge_papier_pappe_kg" | "menge_glas_kg" | "menge_metall_kg" | "menge_verbund_kg" | "rezyklatanteil_gesamt_prozent" | "rezyklatanteil_kunststoff_prozent" | "rezyklatanteil_papier_prozent" | "rezyklatanteil_glas_prozent" | "rezyklatanteil_metall_prozent" | "mehrwegquote_prozent" | "recyclingfaehigkeitsquote_prozent" | "anzahl_verpackungstypen" | "anzahl_konform" | "anzahl_kritisch" | "anzahl_nicht_konform" | "kpi_hinweise";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
