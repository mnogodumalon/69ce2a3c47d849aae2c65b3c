import type { Regelstatus, Verpackungstypen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface RegelstatusDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Regelstatus;
  /** N:1-Ziel „Verpackungstypen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  verpackungstypenList: Verpackungstypen[];
  /** Klick auf die Verpackungstypen-Relation → overlay.push auf dessen Detail. */
  onOpenVerpackungstypen?: (record: Verpackungstypen) => void;
}

export function RegelstatusDetails({
  record,
  verpackungstypenList,
  onOpenVerpackungstypen,
}: RegelstatusDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const verpackungstyp_status_refTarget = verpackungstypenList.find(r => r.record_id === extractRecordId(record.fields.verpackungstyp_status_ref));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('regelstatus', 'konformitaetsstatus')} value={record.fields.konformitaetsstatus} format="pill" />
        <RecordField label={fieldLabel('regelstatus', 'datanluecke_flag')} value={record.fields.datanluecke_flag} format="bool" />
        <RecordField label={fieldLabel('regelstatus', 'problemfelder')} value={Array.isArray(record.fields.problemfelder) ? record.fields.problemfelder.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label={fieldLabel('regelstatus', 'status_kommentar')} value={record.fields.status_kommentar} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('regelstatus', 'bewertungsdatum')} value={record.fields.bewertungsdatum} format="date" />
        <RecordField label={fieldLabel('regelstatus', 'bewerter_vorname')} value={record.fields.bewerter_vorname} format="text" />
        <RecordField label={fieldLabel('regelstatus', 'bewerter_nachname')} value={record.fields.bewerter_nachname} format="text" />
        <RecordField label={fieldLabel('regelstatus', 'bewerter_abteilung')} value={record.fields.bewerter_abteilung} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('regelstatus', 'verpackungstyp_status_ref')}
          name={verpackungstyp_status_refTarget?.fields.verpackungs_id ?? '—'}
          meta={[verpackungstyp_status_refTarget?.fields.verpackungsname, verpackungstyp_status_refTarget?.fields.produktkategorie].filter(Boolean).join(' · ') || undefined}
          onClick={verpackungstyp_status_refTarget && onOpenVerpackungstypen ? () => onOpenVerpackungstypen!(verpackungstyp_status_refTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.REGELSTATUS} recordId={record.record_id} readOnly={!perms.canWrite('regelstatus')} />
    </>
  );
}
