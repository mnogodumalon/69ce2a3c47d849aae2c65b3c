// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Unternehmen {
  record_id: string;
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

export interface Verpackungstypen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen_ref?: string; // applookup -> URL zu 'Unternehmen' Record
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

export interface Nachweise {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    verpackungstyp_ref?: string; // applookup -> URL zu 'Verpackungstypen' Record
    dokumentart?: LookupValue;
    aussteller?: string;
    ausstellungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    gueltig_bis?: string; // Format: YYYY-MM-DD oder ISO String
    dokument_datei?: string;
    dokument_url?: string;
    nachweis_hinweise?: string;
  };
}

export interface Regelstatus {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    verpackungstyp_status_ref?: string; // applookup -> URL zu 'Verpackungstypen' Record
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

export interface Kennzahlen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen_kpi_ref?: string; // applookup -> URL zu 'Unternehmen' Record
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
  UNTERNEHMEN: '69ce2a10b74844016addd82e',
  VERPACKUNGSTYPEN: '69ce2a16a11c5c94e64a8724',
  NACHWEISE: '69ce2a186fb9551311abbd7f',
  REGELSTATUS: '69ce2a18409773a38eb18808',
  KENNZAHLEN: '69ce2a19555564c40eccb02c',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'verpackungstypen': {
    verwendungszweck: [{ key: "verkaufsverpackung", label: "Verkaufsverpackung" }, { key: "versandverpackung", label: "Versandverpackung" }, { key: "transportverpackung", label: "Transportverpackung" }, { key: "serviceverpackung", label: "Serviceverpackung" }],
    material_hauptkategorie: [{ key: "kunststoff", label: "Kunststoff" }, { key: "papier_pappe", label: "Papier/Pappe" }, { key: "glas", label: "Glas" }, { key: "metall", label: "Metall" }, { key: "verbund", label: "Verbund" }, { key: "sonstiges", label: "Sonstiges" }],
    recyclingfaehigkeit_kategorie: [{ key: "gut_recyclingfaehig", label: "Gut recyclingfähig" }, { key: "eingeschraenkt_recyclingfaehig", label: "Eingeschränkt recyclingfähig" }, { key: "nicht_recyclingfaehig", label: "Nicht recyclingfähig" }, { key: "nicht_bewertet", label: "Nicht bewertet" }],
    ppwr_quoten_zuordnung: [{ key: "rezyklatquote", label: "Rezyklatquote" }, { key: "mehrwegquote", label: "Mehrwegquote" }, { key: "recyclingfaehigkeitsquote", label: "Recyclingfähigkeitsquote" }],
  },
  'nachweise': {
    dokumentart: [{ key: "zertifikat", label: "Zertifikat" }, { key: "laboranalyse", label: "Laboranalyse" }, { key: "gutachten", label: "Gutachten" }, { key: "sonstiges", label: "Sonstiges" }, { key: "pruefbericht", label: "Prüfbericht" }],
  },
  'regelstatus': {
    konformitaetsstatus: [{ key: "konform", label: "Konform" }, { key: "kritisch", label: "Kritisch" }, { key: "nicht_konform", label: "Nicht konform" }],
    problemfelder: [{ key: "rezyklatquote_zu_niedrig", label: "Rezyklatquote zu niedrig" }, { key: "nicht_recyclingfaehig", label: "Nicht recyclingfähig" }, { key: "kennzeichnung_unvollstaendig", label: "Kennzeichnung unvollständig" }, { key: "mehrwegpflicht_verletzt", label: "Mehrwegpflicht verletzt (Einwegverpackung)" }, { key: "datanluecke", label: "Datenlücke" }, { key: "sonstiges", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
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

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateUnternehmen = StripLookup<Unternehmen['fields']>;
export type CreateVerpackungstypen = StripLookup<Verpackungstypen['fields']>;
export type CreateNachweise = StripLookup<Nachweise['fields']>;
export type CreateRegelstatus = StripLookup<Regelstatus['fields']>;
export type CreateKennzahlen = StripLookup<Kennzahlen['fields']>;