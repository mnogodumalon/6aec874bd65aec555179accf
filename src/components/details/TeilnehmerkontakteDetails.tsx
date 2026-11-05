import type { Teilnehmerkontakte, Veranstaltungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface TeilnehmerkontakteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Teilnehmerkontakte;
  /** N:1-Ziel „Veranstaltungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  veranstaltungenList: Veranstaltungen[];
  /** Klick auf die Veranstaltungen-Relation → overlay.push auf dessen Detail. */
  onOpenVeranstaltungen?: (record: Veranstaltungen) => void;
}

export function TeilnehmerkontakteDetails({
  record,
  veranstaltungenList,
  onOpenVeranstaltungen,
}: TeilnehmerkontakteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const veranstaltungTarget = veranstaltungenList.find(r => r.record_id === extractRecordId(record.fields.veranstaltung));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('teilnehmerkontakte', 'kuerzel')} value={record.fields.kuerzel} format="text" />
        <RecordField label={fieldLabel('teilnehmerkontakte', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('teilnehmerkontakte', 'einwilligung')} value={record.fields.einwilligung} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('teilnehmerkontakte', 'veranstaltung')}
          name={veranstaltungTarget?.fields.titel ?? '—'}
          meta={undefined}
          onClick={veranstaltungTarget && onOpenVeranstaltungen ? () => onOpenVeranstaltungen!(veranstaltungTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.TEILNEHMERKONTAKTE} recordId={record.record_id} readOnly={!perms.canWrite('teilnehmerkontakte')} />
    </>
  );
}
