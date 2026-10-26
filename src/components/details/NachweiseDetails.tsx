import type { Nachweise, Verpackungstypen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { usePermissions } from '@/lib/permissions';

export interface NachweiseDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Nachweise;
  /** N:1-Ziel „Verpackungstypen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  verpackungstypenList: Verpackungstypen[];
  /** Klick auf die Verpackungstypen-Relation → overlay.push auf dessen Detail. */
  onOpenVerpackungstypen?: (record: Verpackungstypen) => void;
}

export function NachweiseDetails({
  record,
  verpackungstypenList,
  onOpenVerpackungstypen,
}: NachweiseDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const verpackungstyp_refTarget = verpackungstypenList.find(r => r.record_id === extractRecordId(record.fields.verpackungstyp_ref));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('nachweise', 'dokumentart')} value={record.fields.dokumentart} format="pill" />
        <RecordField label={fieldLabel('nachweise', 'aussteller')} value={record.fields.aussteller} format="text" />
        <RecordField label={fieldLabel('nachweise', 'dokument_url')} value={record.fields.dokument_url} format="url" />
        <RecordField label={fieldLabel('nachweise', 'ausstellungsdatum')} value={record.fields.ausstellungsdatum} format="date" />
        <RecordField label={fieldLabel('nachweise', 'gueltig_bis')} value={record.fields.gueltig_bis} format="date" />
        <RecordField label={fieldLabel('nachweise', 'dokument_datei')} className="md:col-span-2">
          {record.fields.dokument_datei ? (
            <MediaThumbnail src={record.fields.dokument_datei as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('nachweise', 'nachweis_hinweise')} value={record.fields.nachweis_hinweise} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('nachweise', 'verpackungstyp_ref')}
          name={verpackungstyp_refTarget?.fields.verpackungs_id ?? '—'}
          meta={[verpackungstyp_refTarget?.fields.verpackungsname, verpackungstyp_refTarget?.fields.produktkategorie].filter(Boolean).join(' · ') || undefined}
          onClick={verpackungstyp_refTarget && onOpenVerpackungstypen ? () => onOpenVerpackungstypen!(verpackungstyp_refTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.NACHWEISE} recordId={record.record_id} readOnly={!perms.canWrite('nachweise')} />
    </>
  );
}
