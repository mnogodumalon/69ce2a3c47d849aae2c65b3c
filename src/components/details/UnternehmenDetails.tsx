import type { Unternehmen, Verpackungstypen, Kennzahlen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface UnternehmenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Unternehmen;
  /** 1:N „Verpackungstypen" (unternehmen_ref): VOLLE Liste — der Block filtert auf diesen Record. */
  verpackungstypenList: Verpackungstypen[];
  /** Zeilen-Klick → overlay.push auf das Verpackungstypen-Detail (nie der Edit-Dialog). */
  onOpenVerpackungstypen: (record: Verpackungstypen) => void;
  /** Kontextuelles „+": öffnet den Verpackungstypen-Dialog mit diesem Record vorgesetzt. */
  onAddVerpackungstypen?: () => void;
  /** 1:N „Kennzahlen" (unternehmen_kpi_ref): VOLLE Liste — der Block filtert auf diesen Record. */
  kennzahlenList: Kennzahlen[];
  /** Zeilen-Klick → overlay.push auf das Kennzahlen-Detail (nie der Edit-Dialog). */
  onOpenKennzahlen: (record: Kennzahlen) => void;
  /** Kontextuelles „+": öffnet den Kennzahlen-Dialog mit diesem Record vorgesetzt. */
  onAddKennzahlen?: () => void;
}

export function UnternehmenDetails({
  record,
  verpackungstypenList,
  onOpenVerpackungstypen,
  onAddVerpackungstypen,
  kennzahlenList,
  onOpenKennzahlen,
  onAddKennzahlen,
}: UnternehmenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('unternehmen', 'firmenname')} value={record.fields.firmenname} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'laender')} value={record.fields.laender} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'ansprechpartner_vorname')} value={record.fields.ansprechpartner_vorname} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'ansprechpartner_nachname')} value={record.fields.ansprechpartner_nachname} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'ansprechpartner_email')} value={record.fields.ansprechpartner_email} format="email" />
        <RecordField label={fieldLabel('unternehmen', 'ansprechpartner_telefon')} value={record.fields.ansprechpartner_telefon} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'steuernummer')} value={record.fields.steuernummer} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'epr_registrierungsnummern')} value={record.fields.epr_registrierungsnummern} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('unternehmen', 'verantwortlich_vorname')} value={record.fields.verantwortlich_vorname} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'verantwortlich_nachname')} value={record.fields.verantwortlich_nachname} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'verantwortlich_funktion')} value={record.fields.verantwortlich_funktion} format="text" />
        <RecordField label={fieldLabel('unternehmen', 'verantwortlich_email')} value={record.fields.verantwortlich_email} format="email" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('verpackungstypen')}
        items={verpackungstypenList.filter(r => extractRecordId(r.fields.unternehmen_ref) === record.record_id)}
        map={r => ({ name: r.fields.verpackungs_id ?? appLabel('verpackungstypen'), meta: undefined })}
        onOpen={onOpenVerpackungstypen}
        onAdd={onAddVerpackungstypen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('kennzahlen')}
        items={kennzahlenList.filter(r => extractRecordId(r.fields.unternehmen_kpi_ref) === record.record_id)}
        map={r => ({ name: r.fields.standort ?? appLabel('kennzahlen'), meta: undefined })}
        onOpen={onOpenKennzahlen}
        onAdd={onAddKennzahlen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.UNTERNEHMEN} recordId={record.record_id} readOnly={!perms.canWrite('unternehmen')} />
    </>
  );
}
