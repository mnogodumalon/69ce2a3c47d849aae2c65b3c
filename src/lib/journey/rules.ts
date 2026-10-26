/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'verpackungstypen' | 'unternehmen' | 'regelstatus' | 'nachweise' | 'kennzahlen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "verpackungstypen": "verpackungs_id" | "verpackungsname" | "beschreibung" | "produktkategorie" | "materialzusammensetzung" | "material_einzelmaterialien" | "material_prozentsaetze" | "material_gewichte_g" | "recyclingfaehigkeit_referenz" | "ruecknahmesystem" | "kennzeichnung_hinweise";
  "unternehmen": "firmenname" | "strasse" | "hausnummer" | "plz" | "ort" | "laender" | "ansprechpartner_vorname" | "ansprechpartner_nachname" | "ansprechpartner_email" | "ansprechpartner_telefon" | "steuernummer" | "epr_registrierungsnummern" | "verantwortlich_vorname" | "verantwortlich_nachname" | "verantwortlich_funktion" | "verantwortlich_email";
  "regelstatus": "status_kommentar" | "bewerter_vorname" | "bewerter_nachname" | "bewerter_abteilung";
  "nachweise": "aussteller" | "dokument_url" | "nachweis_hinweise";
  "kennzahlen": "standort" | "kpi_hinweise";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "verpackungstypen": "unternehmen_ref";
  "unternehmen": never;
  "regelstatus": "verpackungstyp_status_ref";
  "nachweise": "verpackungstyp_ref";
  "kennzahlen": "unternehmen_kpi_ref";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "verpackungstypen": {
    "key": "verpackungstypen",
    "appId": "69ce2a16a11c5c94e64a8724",
    "label": "Verpackungstypen",
    "pascal": "Verpackungstypen",
    "single": "VerpackungstypenEntry"
  },
  "unternehmen": {
    "key": "unternehmen",
    "appId": "69ce2a10b74844016addd82e",
    "label": "Unternehmen",
    "pascal": "Unternehmen",
    "single": "UnternehmenEntry"
  },
  "regelstatus": {
    "key": "regelstatus",
    "appId": "69ce2a18409773a38eb18808",
    "label": "Regelstatus",
    "pascal": "Regelstatus",
    "single": "Regelstatu"
  },
  "nachweise": {
    "key": "nachweise",
    "appId": "69ce2a186fb9551311abbd7f",
    "label": "Nachweise",
    "pascal": "Nachweise",
    "single": "NachweiseEntry"
  },
  "kennzahlen": {
    "key": "kennzahlen",
    "appId": "69ce2a19555564c40eccb02c",
    "label": "Kennzahlen",
    "pascal": "Kennzahlen",
    "single": "KennzahlenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "verpackungstypen": {
    "unternehmen_ref": {
      "key": "unternehmen_ref",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Unternehmen",
      "writable": true,
      "targetAppId": "69ce2a10b74844016addd82e",
      "targetEntity": "unternehmen"
    },
    "verpackungs_id": {
      "key": "verpackungs_id",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Verpackungs-ID",
      "writable": true,
      "maxLength": 4000
    },
    "verpackungsname": {
      "key": "verpackungsname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name der Verpackung",
      "writable": true,
      "maxLength": 4000
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "produktkategorie": {
      "key": "produktkategorie",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Produktkategorie",
      "writable": true,
      "maxLength": 4000
    },
    "verwendungszweck": {
      "key": "verwendungszweck",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Verwendungszweck",
      "writable": true,
      "options": [
        "verkaufsverpackung",
        "versandverpackung",
        "transportverpackung",
        "serviceverpackung"
      ]
    },
    "material_hauptkategorie": {
      "key": "material_hauptkategorie",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Material-Hauptkategorie",
      "writable": true,
      "options": [
        "kunststoff",
        "papier_pappe",
        "glas",
        "metall",
        "verbund",
        "sonstiges"
      ]
    },
    "materialzusammensetzung": {
      "key": "materialzusammensetzung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Detaillierte Materialzusammensetzung",
      "writable": true
    },
    "material_einzelmaterialien": {
      "key": "material_einzelmaterialien",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Einzelmaterialien (Bezeichnung)",
      "writable": true,
      "maxLength": 4000
    },
    "material_prozentsaetze": {
      "key": "material_prozentsaetze",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Materialanteile in %",
      "writable": true,
      "maxLength": 4000
    },
    "material_gewichte_g": {
      "key": "material_gewichte_g",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Materialgewichte in Gramm",
      "writable": true,
      "maxLength": 4000
    },
    "laenge_mm": {
      "key": "laenge_mm",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Länge (mm)",
      "writable": true
    },
    "breite_mm": {
      "key": "breite_mm",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Breite (mm)",
      "writable": true
    },
    "hoehe_mm": {
      "key": "hoehe_mm",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Höhe (mm)",
      "writable": true
    },
    "wandstaerke_mm": {
      "key": "wandstaerke_mm",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Wandstärke (mm)",
      "writable": true
    },
    "volumen_ml": {
      "key": "volumen_ml",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Volumen (ml)",
      "writable": true
    },
    "gesamtgewicht_g": {
      "key": "gesamtgewicht_g",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gesamtgewicht (g)",
      "writable": true,
      "format": "currency"
    },
    "rezyklat_postconsumer_prozent": {
      "key": "rezyklat_postconsumer_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Post-Consumer-Rezyklatanteil (%)",
      "writable": true
    },
    "rezyklat_postconsumer_kg_jahr": {
      "key": "rezyklat_postconsumer_kg_jahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Post-Consumer-Rezyklat (kg/Jahr)",
      "writable": true
    },
    "rezyklat_postindustrial_prozent": {
      "key": "rezyklat_postindustrial_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Post-Industrial-Rezyklatanteil (%)",
      "writable": true
    },
    "rezyklat_postindustrial_kg_jahr": {
      "key": "rezyklat_postindustrial_kg_jahr",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Post-Industrial-Rezyklat (kg/Jahr)",
      "writable": true
    },
    "recyclingfaehigkeit_kategorie": {
      "key": "recyclingfaehigkeit_kategorie",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Recyclingfähigkeit – Kategorie",
      "writable": true,
      "options": [
        "gut_recyclingfaehig",
        "eingeschraenkt_recyclingfaehig",
        "nicht_recyclingfaehig",
        "nicht_bewertet"
      ]
    },
    "recyclingfaehigkeit_score": {
      "key": "recyclingfaehigkeit_score",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Recyclingfähigkeit – Score (0–100)",
      "writable": true
    },
    "recyclingfaehigkeit_referenz": {
      "key": "recyclingfaehigkeit_referenz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Referenz Prüfstandard / Gutachten",
      "writable": true,
      "maxLength": 4000
    },
    "mehrwegfaehig": {
      "key": "mehrwegfaehig",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Mehrwegfähig",
      "writable": true
    },
    "erwartete_umlaeufe": {
      "key": "erwartete_umlaeufe",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Erwartete Umläufe",
      "writable": true
    },
    "ruecknahmesystem": {
      "key": "ruecknahmesystem",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung Rücknahmesystem",
      "writable": true
    },
    "ppwr_quoten_zuordnung": {
      "key": "ppwr_quoten_zuordnung",
      "fulltype": "multiplelookup/checkbox",
      "kind": "multilookup",
      "required": false,
      "label": "Zuordnung zu PPWR-Quoten",
      "writable": true,
      "options": [
        "rezyklatquote",
        "mehrwegquote",
        "recyclingfaehigkeitsquote"
      ]
    },
    "kennzeichnung_vollstaendig": {
      "key": "kennzeichnung_vollstaendig",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Kennzeichnung vollständig",
      "writable": true
    },
    "kennzeichnung_hinweise": {
      "key": "kennzeichnung_hinweise",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Hinweise zur Kennzeichnung",
      "writable": true
    }
  },
  "unternehmen": {
    "firmenname": {
      "key": "firmenname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Firmenname",
      "writable": true,
      "maxLength": 4000
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "laender": {
      "key": "laender",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Tätigkeitsländer",
      "writable": true,
      "maxLength": 4000
    },
    "ansprechpartner_vorname": {
      "key": "ansprechpartner_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname Ansprechpartner",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "ansprechpartner_nachname": {
      "key": "ansprechpartner_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname Ansprechpartner",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "ansprechpartner_email": {
      "key": "ansprechpartner_email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail Ansprechpartner",
      "writable": true,
      "autoComplete": "email"
    },
    "ansprechpartner_telefon": {
      "key": "ansprechpartner_telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon Ansprechpartner",
      "writable": true,
      "autoComplete": "tel"
    },
    "steuernummer": {
      "key": "steuernummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Steuernummer / USt-IdNr.",
      "writable": true,
      "maxLength": 4000
    },
    "epr_registrierungsnummern": {
      "key": "epr_registrierungsnummern",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "EPR-Registrierungsnummern (je Land)",
      "writable": true
    },
    "verantwortlich_vorname": {
      "key": "verantwortlich_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Vorname verantwortliche Person",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "verantwortlich_nachname": {
      "key": "verantwortlich_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Nachname verantwortliche Person",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "verantwortlich_funktion": {
      "key": "verantwortlich_funktion",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Funktion / Position",
      "writable": true,
      "maxLength": 4000
    },
    "verantwortlich_email": {
      "key": "verantwortlich_email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail verantwortliche Person",
      "writable": true,
      "autoComplete": "email"
    }
  },
  "regelstatus": {
    "verpackungstyp_status_ref": {
      "key": "verpackungstyp_status_ref",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Verpackungstyp",
      "writable": true,
      "targetAppId": "69ce2a16a11c5c94e64a8724",
      "targetEntity": "verpackungstypen"
    },
    "konformitaetsstatus": {
      "key": "konformitaetsstatus",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "PPWR-Konformitätsstatus",
      "writable": true,
      "options": [
        "konform",
        "kritisch",
        "nicht_konform"
      ]
    },
    "datanluecke_flag": {
      "key": "datanluecke_flag",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Datenlücke vorhanden",
      "writable": true
    },
    "problemfelder": {
      "key": "problemfelder",
      "fulltype": "multiplelookup/checkbox",
      "kind": "multilookup",
      "required": false,
      "label": "Erkannte Problemfelder",
      "writable": true,
      "options": [
        "rezyklatquote_zu_niedrig",
        "nicht_recyclingfaehig",
        "kennzeichnung_unvollstaendig",
        "mehrwegpflicht_verletzt",
        "datanluecke",
        "sonstiges"
      ]
    },
    "status_kommentar": {
      "key": "status_kommentar",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kommentar / Maßnahmenempfehlung",
      "writable": true
    },
    "bewertungsdatum": {
      "key": "bewertungsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Datum der Bewertung",
      "writable": true
    },
    "bewerter_vorname": {
      "key": "bewerter_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Vorname bewertende Person",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "bewerter_nachname": {
      "key": "bewerter_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Nachname bewertende Person",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "bewerter_abteilung": {
      "key": "bewerter_abteilung",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Abteilung",
      "writable": true,
      "maxLength": 4000
    }
  },
  "nachweise": {
    "verpackungstyp_ref": {
      "key": "verpackungstyp_ref",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Verpackungstyp",
      "writable": true,
      "targetAppId": "69ce2a16a11c5c94e64a8724",
      "targetEntity": "verpackungstypen"
    },
    "dokumentart": {
      "key": "dokumentart",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Dokumentart",
      "writable": true,
      "options": [
        "pruefbericht",
        "zertifikat",
        "laboranalyse",
        "gutachten",
        "sonstiges"
      ]
    },
    "aussteller": {
      "key": "aussteller",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Aussteller",
      "writable": true,
      "maxLength": 4000
    },
    "ausstellungsdatum": {
      "key": "ausstellungsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Ausstellungsdatum",
      "writable": true
    },
    "gueltig_bis": {
      "key": "gueltig_bis",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Gültig bis",
      "writable": true
    },
    "dokument_datei": {
      "key": "dokument_datei",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Dokument (Datei-Upload)",
      "writable": false
    },
    "dokument_url": {
      "key": "dokument_url",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Dokument-Link (URL)",
      "writable": true,
      "autoComplete": "url"
    },
    "nachweis_hinweise": {
      "key": "nachweis_hinweise",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Hinweise / Anmerkungen",
      "writable": true
    }
  },
  "kennzahlen": {
    "unternehmen_kpi_ref": {
      "key": "unternehmen_kpi_ref",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Unternehmen",
      "writable": true,
      "targetAppId": "69ce2a10b74844016addd82e",
      "targetEntity": "unternehmen"
    },
    "berichtsjahr": {
      "key": "berichtsjahr",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Berichtsjahr",
      "writable": true
    },
    "standort": {
      "key": "standort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Standort / Werk",
      "writable": true,
      "maxLength": 4000
    },
    "gesamtmenge_kg": {
      "key": "gesamtmenge_kg",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gesamtmenge Verpackungen (kg/Jahr)",
      "writable": true
    },
    "menge_kunststoff_kg": {
      "key": "menge_kunststoff_kg",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Menge Kunststoff (kg/Jahr)",
      "writable": true
    },
    "menge_papier_pappe_kg": {
      "key": "menge_papier_pappe_kg",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Menge Papier/Pappe (kg/Jahr)",
      "writable": true
    },
    "menge_glas_kg": {
      "key": "menge_glas_kg",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Menge Glas (kg/Jahr)",
      "writable": true
    },
    "menge_metall_kg": {
      "key": "menge_metall_kg",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Menge Metall (kg/Jahr)",
      "writable": true
    },
    "menge_verbund_kg": {
      "key": "menge_verbund_kg",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Menge Verbund (kg/Jahr)",
      "writable": true
    },
    "rezyklatanteil_gesamt_prozent": {
      "key": "rezyklatanteil_gesamt_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Rezyklatanteil gesamt (%)",
      "writable": true
    },
    "rezyklatanteil_kunststoff_prozent": {
      "key": "rezyklatanteil_kunststoff_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Rezyklatanteil Kunststoff (%)",
      "writable": true
    },
    "rezyklatanteil_papier_prozent": {
      "key": "rezyklatanteil_papier_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Rezyklatanteil Papier/Pappe (%)",
      "writable": true
    },
    "rezyklatanteil_glas_prozent": {
      "key": "rezyklatanteil_glas_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Rezyklatanteil Glas (%)",
      "writable": true
    },
    "rezyklatanteil_metall_prozent": {
      "key": "rezyklatanteil_metall_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Rezyklatanteil Metall (%)",
      "writable": true
    },
    "mehrwegquote_prozent": {
      "key": "mehrwegquote_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Mehrwegquote (%)",
      "writable": true
    },
    "recyclingfaehigkeitsquote_prozent": {
      "key": "recyclingfaehigkeitsquote_prozent",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Anteil recyclingfähiger Verpackungen (%)",
      "writable": true
    },
    "anzahl_verpackungstypen": {
      "key": "anzahl_verpackungstypen",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Anzahl Verpackungstypen gesamt",
      "writable": true
    },
    "anzahl_konform": {
      "key": "anzahl_konform",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Davon konform",
      "writable": true
    },
    "anzahl_kritisch": {
      "key": "anzahl_kritisch",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Davon kritisch",
      "writable": true
    },
    "anzahl_nicht_konform": {
      "key": "anzahl_nicht_konform",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Davon nicht konform",
      "writable": true
    },
    "kpi_hinweise": {
      "key": "kpi_hinweise",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Hinweise / Anmerkungen",
      "writable": true
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "verpackungstypen": [
    {
      "kind": "choice",
      "field": "verwendungszweck",
      "count": 4
    },
    {
      "kind": "choice",
      "field": "material_hauptkategorie",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "recyclingfaehigkeit_kategorie",
      "count": 4
    },
    {
      "kind": "record",
      "field": "unternehmen_ref",
      "targetEntity": "unternehmen"
    }
  ],
  "unternehmen": [],
  "regelstatus": [
    {
      "kind": "choice",
      "field": "konformitaetsstatus",
      "count": 3
    },
    {
      "kind": "record",
      "field": "verpackungstyp_status_ref",
      "targetEntity": "verpackungstypen"
    }
  ],
  "nachweise": [
    {
      "kind": "choice",
      "field": "dokumentart",
      "count": 5
    },
    {
      "kind": "record",
      "field": "verpackungstyp_ref",
      "targetEntity": "verpackungstypen"
    }
  ],
  "kennzahlen": [
    {
      "kind": "record",
      "field": "unternehmen_kpi_ref",
      "targetEntity": "unternehmen"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "verpackungstypen": [
    "verpackungs_id"
  ],
  "unternehmen": [
    "firmenname"
  ],
  "regelstatus": [
    "status_kommentar"
  ],
  "nachweise": [
    "aussteller"
  ],
  "kennzahlen": [
    "standort"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
