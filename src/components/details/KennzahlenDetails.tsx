import type { Kennzahlen, Unternehmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface KennzahlenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kennzahlen;
  /** N:1-Ziel „Unternehmen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  unternehmenList: Unternehmen[];
  /** Klick auf die Unternehmen-Relation → overlay.push auf dessen Detail. */
  onOpenUnternehmen?: (record: Unternehmen) => void;
}

export function KennzahlenDetails({
  record,
  unternehmenList,
  onOpenUnternehmen,
}: KennzahlenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const unternehmen_kpi_refTarget = unternehmenList.find(r => r.record_id === extractRecordId(record.fields.unternehmen_kpi_ref));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kennzahlen', 'berichtsjahr')} value={record.fields.berichtsjahr} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'standort')} value={record.fields.standort} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'gesamtmenge_kg')} value={record.fields.gesamtmenge_kg} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'menge_kunststoff_kg')} value={record.fields.menge_kunststoff_kg} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'menge_papier_pappe_kg')} value={record.fields.menge_papier_pappe_kg} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'menge_glas_kg')} value={record.fields.menge_glas_kg} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'menge_metall_kg')} value={record.fields.menge_metall_kg} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'menge_verbund_kg')} value={record.fields.menge_verbund_kg} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'rezyklatanteil_gesamt_prozent')} value={record.fields.rezyklatanteil_gesamt_prozent} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'rezyklatanteil_kunststoff_prozent')} value={record.fields.rezyklatanteil_kunststoff_prozent} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'rezyklatanteil_papier_prozent')} value={record.fields.rezyklatanteil_papier_prozent} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'rezyklatanteil_glas_prozent')} value={record.fields.rezyklatanteil_glas_prozent} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'rezyklatanteil_metall_prozent')} value={record.fields.rezyklatanteil_metall_prozent} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'mehrwegquote_prozent')} value={record.fields.mehrwegquote_prozent} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'recyclingfaehigkeitsquote_prozent')} value={record.fields.recyclingfaehigkeitsquote_prozent} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'anzahl_verpackungstypen')} value={record.fields.anzahl_verpackungstypen} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'anzahl_konform')} value={record.fields.anzahl_konform} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'anzahl_kritisch')} value={record.fields.anzahl_kritisch} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'anzahl_nicht_konform')} value={record.fields.anzahl_nicht_konform} format="text" />
        <RecordField label={fieldLabel('kennzahlen', 'kpi_hinweise')} value={record.fields.kpi_hinweise} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('kennzahlen', 'unternehmen_kpi_ref')}
          name={unternehmen_kpi_refTarget?.fields.firmenname ?? '—'}
          meta={[unternehmen_kpi_refTarget?.fields.ansprechpartner_email, unternehmen_kpi_refTarget?.fields.ansprechpartner_telefon].filter(Boolean).join(' · ') || undefined}
          onClick={unternehmen_kpi_refTarget && onOpenUnternehmen ? () => onOpenUnternehmen!(unternehmen_kpi_refTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.KENNZAHLEN} recordId={record.record_id} readOnly={!perms.canWrite('kennzahlen')} />
    </>
  );
}
