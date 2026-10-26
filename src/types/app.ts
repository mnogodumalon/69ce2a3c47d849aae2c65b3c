import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Verpackungstypen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen_ref?: RecordUrl; // applookup -> URL zu 'Unternehmen' Record
    verpackungs_id?: string;
    verpackungsname?: string;
    beschreibung?: string;
    produktkategorie?: string;
    verwendungszweck?: LookupValue;
    material_hauptkategorie?: LookupValue;
    materialzusammensetzung?: string;
    material_einzelmaterialien?: string;
    material_prozentsaetze?: string;
    material_gewichte_g?: string;
    laenge_mm?: number;
    breite_mm?: number;
    hoehe_mm?: number;
    wandstaerke_mm?: number;
    volumen_ml?: number;
    gesamtgewicht_g?: number;
    rezyklat_postconsumer_prozent?: number;
    rezyklat_postconsumer_kg_jahr?: number;
    rezyklat_postindustrial_prozent?: number;
    rezyklat_postindustrial_kg_jahr?: number;
    recyclingfaehigkeit_kategorie?: LookupValue;
    recyclingfaehigkeit_score?: number;
    recyclingfaehigkeit_referenz?: string;
    mehrwegfaehig?: boolean;
    erwartete_umlaeufe?: number;
    ruecknahmesystem?: string;
    ppwr_quoten_zuordnung?: LookupValue[];
    kennzeichnung_vollstaendig?: boolean;
    kennzeichnung_hinweise?: string;
  };
}

export interface Unternehmen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    laender?: string;
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    ansprechpartner_email?: string;
    ansprechpartner_telefon?: string;
    steuernummer?: string;
    epr_registrierungsnummern?: string;
    verantwortlich_vorname?: string;
    verantwortlich_nachname?: string;
    verantwortlich_funktion?: string;
    verantwortlich_email?: string;
  };
}

export interface Regelstatus {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    verpackungstyp_status_ref?: RecordUrl; // applookup -> URL zu 'Verpackungstypen' Record
    konformitaetsstatus?: LookupValue;
    datanluecke_flag?: boolean;
    problemfelder?: LookupValue[];
    status_kommentar?: string;
    bewertungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    bewerter_vorname?: string;
    bewerter_nachname?: string;
    bewerter_abteilung?: string;
  };
}

export interface Nachweise {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    verpackungstyp_ref?: RecordUrl; // applookup -> URL zu 'Verpackungstypen' Record
    dokumentart?: LookupValue;
    aussteller?: string;
    ausstellungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    gueltig_bis?: string; // Format: YYYY-MM-DD oder ISO String
    dokument_datei?: string;
    dokument_url?: string;
    nachweis_hinweise?: string;
  };
}

export interface Kennzahlen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen_kpi_ref?: RecordUrl; // applookup -> URL zu 'Unternehmen' Record
    berichtsjahr?: number;
    standort?: string;
    gesamtmenge_kg?: number;
    menge_kunststoff_kg?: number;
    menge_papier_pappe_kg?: number;
    menge_glas_kg?: number;
    menge_metall_kg?: number;
    menge_verbund_kg?: number;
    rezyklatanteil_gesamt_prozent?: number;
    rezyklatanteil_kunststoff_prozent?: number;
    rezyklatanteil_papier_prozent?: number;
    rezyklatanteil_glas_prozent?: number;
    rezyklatanteil_metall_prozent?: number;
    mehrwegquote_prozent?: number;
    recyclingfaehigkeitsquote_prozent?: number;
    anzahl_verpackungstypen?: number;
    anzahl_konform?: number;
    anzahl_kritisch?: number;
    anzahl_nicht_konform?: number;
    kpi_hinweise?: string;
  };
}

export const APP_IDS = {
  VERPACKUNGSTYPEN: '69ce2a16a11c5c94e64a8724',
  UNTERNEHMEN: '69ce2a10b74844016addd82e',
  REGELSTATUS: '69ce2a18409773a38eb18808',
  NACHWEISE: '69ce2a186fb9551311abbd7f',
  KENNZAHLEN: '69ce2a19555564c40eccb02c',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'verpackungstypen': {
    verwendungszweck: [{ key: "verkaufsverpackung", get label() { return lookupLabel('verpackungstypen', 'verwendungszweck', "verkaufsverpackung") ?? "Verkaufsverpackung"; } }, { key: "versandverpackung", get label() { return lookupLabel('verpackungstypen', 'verwendungszweck', "versandverpackung") ?? "Versandverpackung"; } }, { key: "transportverpackung", get label() { return lookupLabel('verpackungstypen', 'verwendungszweck', "transportverpackung") ?? "Transportverpackung"; } }, { key: "serviceverpackung", get label() { return lookupLabel('verpackungstypen', 'verwendungszweck', "serviceverpackung") ?? "Serviceverpackung"; } }],
    material_hauptkategorie: [{ key: "kunststoff", get label() { return lookupLabel('verpackungstypen', 'material_hauptkategorie', "kunststoff") ?? "Kunststoff"; } }, { key: "papier_pappe", get label() { return lookupLabel('verpackungstypen', 'material_hauptkategorie', "papier_pappe") ?? "Papier/Pappe"; } }, { key: "glas", get label() { return lookupLabel('verpackungstypen', 'material_hauptkategorie', "glas") ?? "Glas"; } }, { key: "metall", get label() { return lookupLabel('verpackungstypen', 'material_hauptkategorie', "metall") ?? "Metall"; } }, { key: "verbund", get label() { return lookupLabel('verpackungstypen', 'material_hauptkategorie', "verbund") ?? "Verbund"; } }, { key: "sonstiges", get label() { return lookupLabel('verpackungstypen', 'material_hauptkategorie', "sonstiges") ?? "Sonstiges"; } }],
    recyclingfaehigkeit_kategorie: [{ key: "gut_recyclingfaehig", get label() { return lookupLabel('verpackungstypen', 'recyclingfaehigkeit_kategorie', "gut_recyclingfaehig") ?? "Gut recyclingfähig"; } }, { key: "eingeschraenkt_recyclingfaehig", get label() { return lookupLabel('verpackungstypen', 'recyclingfaehigkeit_kategorie', "eingeschraenkt_recyclingfaehig") ?? "Eingeschränkt recyclingfähig"; } }, { key: "nicht_recyclingfaehig", get label() { return lookupLabel('verpackungstypen', 'recyclingfaehigkeit_kategorie', "nicht_recyclingfaehig") ?? "Nicht recyclingfähig"; } }, { key: "nicht_bewertet", get label() { return lookupLabel('verpackungstypen', 'recyclingfaehigkeit_kategorie', "nicht_bewertet") ?? "Nicht bewertet"; } }],
    ppwr_quoten_zuordnung: [{ key: "rezyklatquote", get label() { return lookupLabel('verpackungstypen', 'ppwr_quoten_zuordnung', "rezyklatquote") ?? "Rezyklatquote"; } }, { key: "mehrwegquote", get label() { return lookupLabel('verpackungstypen', 'ppwr_quoten_zuordnung', "mehrwegquote") ?? "Mehrwegquote"; } }, { key: "recyclingfaehigkeitsquote", get label() { return lookupLabel('verpackungstypen', 'ppwr_quoten_zuordnung', "recyclingfaehigkeitsquote") ?? "Recyclingfähigkeitsquote"; } }],
  },
  'regelstatus': {
    konformitaetsstatus: [{ key: "konform", get label() { return lookupLabel('regelstatus', 'konformitaetsstatus', "konform") ?? "Konform"; } }, { key: "kritisch", get label() { return lookupLabel('regelstatus', 'konformitaetsstatus', "kritisch") ?? "Kritisch"; } }, { key: "nicht_konform", get label() { return lookupLabel('regelstatus', 'konformitaetsstatus', "nicht_konform") ?? "Nicht konform"; } }],
    problemfelder: [{ key: "rezyklatquote_zu_niedrig", get label() { return lookupLabel('regelstatus', 'problemfelder', "rezyklatquote_zu_niedrig") ?? "Rezyklatquote zu niedrig"; } }, { key: "nicht_recyclingfaehig", get label() { return lookupLabel('regelstatus', 'problemfelder', "nicht_recyclingfaehig") ?? "Nicht recyclingfähig"; } }, { key: "kennzeichnung_unvollstaendig", get label() { return lookupLabel('regelstatus', 'problemfelder', "kennzeichnung_unvollstaendig") ?? "Kennzeichnung unvollständig"; } }, { key: "mehrwegpflicht_verletzt", get label() { return lookupLabel('regelstatus', 'problemfelder', "mehrwegpflicht_verletzt") ?? "Mehrwegpflicht verletzt (Einwegverpackung)"; } }, { key: "datanluecke", get label() { return lookupLabel('regelstatus', 'problemfelder', "datanluecke") ?? "Datenlücke"; } }, { key: "sonstiges", get label() { return lookupLabel('regelstatus', 'problemfelder', "sonstiges") ?? "Sonstiges"; } }],
  },
  'nachweise': {
    dokumentart: [{ key: "pruefbericht", get label() { return lookupLabel('nachweise', 'dokumentart', "pruefbericht") ?? "Prüfbericht"; } }, { key: "zertifikat", get label() { return lookupLabel('nachweise', 'dokumentart', "zertifikat") ?? "Zertifikat"; } }, { key: "laboranalyse", get label() { return lookupLabel('nachweise', 'dokumentart', "laboranalyse") ?? "Laboranalyse"; } }, { key: "gutachten", get label() { return lookupLabel('nachweise', 'dokumentart', "gutachten") ?? "Gutachten"; } }, { key: "sonstiges", get label() { return lookupLabel('nachweise', 'dokumentart', "sonstiges") ?? "Sonstiges"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'verpackungstypen': {
    'unternehmen_ref': 'applookup/select',
    'verpackungs_id': 'string/text',
    'verpackungsname': 'string/text',
    'beschreibung': 'string/textarea',
    'produktkategorie': 'string/text',
    'verwendungszweck': 'lookup/select',
    'material_hauptkategorie': 'lookup/select',
    'materialzusammensetzung': 'string/textarea',
    'material_einzelmaterialien': 'string/text',
    'material_prozentsaetze': 'string/text',
    'material_gewichte_g': 'string/text',
    'laenge_mm': 'number',
    'breite_mm': 'number',
    'hoehe_mm': 'number',
    'wandstaerke_mm': 'number',
    'volumen_ml': 'number',
    'gesamtgewicht_g': 'number',
    'rezyklat_postconsumer_prozent': 'number',
    'rezyklat_postconsumer_kg_jahr': 'number',
    'rezyklat_postindustrial_prozent': 'number',
    'rezyklat_postindustrial_kg_jahr': 'number',
    'recyclingfaehigkeit_kategorie': 'lookup/select',
    'recyclingfaehigkeit_score': 'number',
    'recyclingfaehigkeit_referenz': 'string/text',
    'mehrwegfaehig': 'bool',
    'erwartete_umlaeufe': 'number',
    'ruecknahmesystem': 'string/textarea',
    'ppwr_quoten_zuordnung': 'multiplelookup/checkbox',
    'kennzeichnung_vollstaendig': 'bool',
    'kennzeichnung_hinweise': 'string/textarea',
  },
  'unternehmen': {
    'firmenname': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'laender': 'string/text',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'ansprechpartner_email': 'string/email',
    'ansprechpartner_telefon': 'string/tel',
    'steuernummer': 'string/text',
    'epr_registrierungsnummern': 'string/textarea',
    'verantwortlich_vorname': 'string/text',
    'verantwortlich_nachname': 'string/text',
    'verantwortlich_funktion': 'string/text',
    'verantwortlich_email': 'string/email',
  },
  'regelstatus': {
    'verpackungstyp_status_ref': 'applookup/select',
    'konformitaetsstatus': 'lookup/radio',
    'datanluecke_flag': 'bool',
    'problemfelder': 'multiplelookup/checkbox',
    'status_kommentar': 'string/textarea',
    'bewertungsdatum': 'date/date',
    'bewerter_vorname': 'string/text',
    'bewerter_nachname': 'string/text',
    'bewerter_abteilung': 'string/text',
  },
  'nachweise': {
    'verpackungstyp_ref': 'applookup/select',
    'dokumentart': 'lookup/select',
    'aussteller': 'string/text',
    'ausstellungsdatum': 'date/date',
    'gueltig_bis': 'date/date',
    'dokument_datei': 'file',
    'dokument_url': 'string/url',
    'nachweis_hinweise': 'string/textarea',
  },
  'kennzahlen': {
    'unternehmen_kpi_ref': 'applookup/select',
    'berichtsjahr': 'number',
    'standort': 'string/text',
    'gesamtmenge_kg': 'number',
    'menge_kunststoff_kg': 'number',
    'menge_papier_pappe_kg': 'number',
    'menge_glas_kg': 'number',
    'menge_metall_kg': 'number',
    'menge_verbund_kg': 'number',
    'rezyklatanteil_gesamt_prozent': 'number',
    'rezyklatanteil_kunststoff_prozent': 'number',
    'rezyklatanteil_papier_prozent': 'number',
    'rezyklatanteil_glas_prozent': 'number',
    'rezyklatanteil_metall_prozent': 'number',
    'mehrwegquote_prozent': 'number',
    'recyclingfaehigkeitsquote_prozent': 'number',
    'anzahl_verpackungstypen': 'number',
    'anzahl_konform': 'number',
    'anzahl_kritisch': 'number',
    'anzahl_nicht_konform': 'number',
    'kpi_hinweise': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateVerpackungstypen = StripLookup<Verpackungstypen['fields']>;
export type CreateUnternehmen = StripLookup<Unternehmen['fields']>;
export type CreateRegelstatus = StripLookup<Regelstatus['fields']>;
export type CreateNachweise = StripLookup<Nachweise['fields']>;
export type CreateKennzahlen = StripLookup<Kennzahlen['fields']>;