import type { Verpackungstypen, Unternehmen, Regelstatus, Nachweise } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface VerpackungstypenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Verpackungstypen;
  /** N:1-Ziel „Unternehmen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  unternehmenList: Unternehmen[];
  /** Klick auf die Unternehmen-Relation → overlay.push auf dessen Detail. */
  onOpenUnternehmen?: (record: Unternehmen) => void;
  /** 1:N „Regelstatus" (verpackungstyp_status_ref): VOLLE Liste — der Block filtert auf diesen Record. */
  regelstatusList: Regelstatus[];
  /** Zeilen-Klick → overlay.push auf das Regelstatus-Detail (nie der Edit-Dialog). */
  onOpenRegelstatus: (record: Regelstatus) => void;
  /** Kontextuelles „+": öffnet den Regelstatus-Dialog mit diesem Record vorgesetzt. */
  onAddRegelstatus?: () => void;
  /** 1:N „Nachweise" (verpackungstyp_ref): VOLLE Liste — der Block filtert auf diesen Record. */
  nachweiseList: Nachweise[];
  /** Zeilen-Klick → overlay.push auf das Nachweise-Detail (nie der Edit-Dialog). */
  onOpenNachweise: (record: Nachweise) => void;
  /** Kontextuelles „+": öffnet den Nachweise-Dialog mit diesem Record vorgesetzt. */
  onAddNachweise?: () => void;
}

export function VerpackungstypenDetails({
  record,
  unternehmenList,
  onOpenUnternehmen,
  regelstatusList,
  onOpenRegelstatus,
  onAddRegelstatus,
  nachweiseList,
  onOpenNachweise,
  onAddNachweise,
}: VerpackungstypenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const unternehmen_refTarget = unternehmenList.find(r => r.record_id === extractRecordId(record.fields.unternehmen_ref));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('verpackungstypen', 'verpackungs_id')} value={record.fields.verpackungs_id} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'verpackungsname')} value={record.fields.verpackungsname} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('verpackungstypen', 'produktkategorie')} value={record.fields.produktkategorie} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'verwendungszweck')} value={record.fields.verwendungszweck} format="pill" />
        <RecordField label={fieldLabel('verpackungstypen', 'material_hauptkategorie')} value={record.fields.material_hauptkategorie} format="pill" />
        <RecordField label={fieldLabel('verpackungstypen', 'materialzusammensetzung')} value={record.fields.materialzusammensetzung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('verpackungstypen', 'material_einzelmaterialien')} value={record.fields.material_einzelmaterialien} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'material_prozentsaetze')} value={record.fields.material_prozentsaetze} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'material_gewichte_g')} value={record.fields.material_gewichte_g} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'laenge_mm')} value={record.fields.laenge_mm} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'breite_mm')} value={record.fields.breite_mm} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'hoehe_mm')} value={record.fields.hoehe_mm} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'wandstaerke_mm')} value={record.fields.wandstaerke_mm} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'volumen_ml')} value={record.fields.volumen_ml} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'gesamtgewicht_g')} value={record.fields.gesamtgewicht_g} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'rezyklat_postconsumer_prozent')} value={record.fields.rezyklat_postconsumer_prozent} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'rezyklat_postconsumer_kg_jahr')} value={record.fields.rezyklat_postconsumer_kg_jahr} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'rezyklat_postindustrial_prozent')} value={record.fields.rezyklat_postindustrial_prozent} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'rezyklat_postindustrial_kg_jahr')} value={record.fields.rezyklat_postindustrial_kg_jahr} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'recyclingfaehigkeit_kategorie')} value={record.fields.recyclingfaehigkeit_kategorie} format="pill" />
        <RecordField label={fieldLabel('verpackungstypen', 'recyclingfaehigkeit_score')} value={record.fields.recyclingfaehigkeit_score} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'recyclingfaehigkeit_referenz')} value={record.fields.recyclingfaehigkeit_referenz} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'mehrwegfaehig')} value={record.fields.mehrwegfaehig} format="bool" />
        <RecordField label={fieldLabel('verpackungstypen', 'erwartete_umlaeufe')} value={record.fields.erwartete_umlaeufe} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'ruecknahmesystem')} value={record.fields.ruecknahmesystem} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('verpackungstypen', 'ppwr_quoten_zuordnung')} value={Array.isArray(record.fields.ppwr_quoten_zuordnung) ? record.fields.ppwr_quoten_zuordnung.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label={fieldLabel('verpackungstypen', 'kennzeichnung_vollstaendig')} value={record.fields.kennzeichnung_vollstaendig} format="bool" />
        <RecordField label={fieldLabel('verpackungstypen', 'kennzeichnung_hinweise')} value={record.fields.kennzeichnung_hinweise} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('verpackungstypen', 'unternehmen_ref')}
          name={unternehmen_refTarget?.fields.firmenname ?? '—'}
          meta={[unternehmen_refTarget?.fields.ansprechpartner_email, unternehmen_refTarget?.fields.ansprechpartner_telefon].filter(Boolean).join(' · ') || undefined}
          onClick={unternehmen_refTarget && onOpenUnternehmen ? () => onOpenUnternehmen!(unternehmen_refTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('regelstatus')}
        items={regelstatusList.filter(r => extractRecordId(r.fields.verpackungstyp_status_ref) === record.record_id)}
        map={r => ({ name: r.fields.bewerter_vorname ?? appLabel('regelstatus'), meta: r.fields.bewertungsdatum })}
        onOpen={onOpenRegelstatus}
        onAdd={onAddRegelstatus}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('nachweise')}
        items={nachweiseList.filter(r => extractRecordId(r.fields.verpackungstyp_ref) === record.record_id)}
        map={r => ({ name: r.fields.aussteller ?? appLabel('nachweise'), meta: r.fields.ausstellungsdatum })}
        onOpen={onOpenNachweise}
        onAdd={onAddNachweise}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.VERPACKUNGSTYPEN} recordId={record.record_id} readOnly={!perms.canWrite('verpackungstypen')} />
    </>
  );
}
