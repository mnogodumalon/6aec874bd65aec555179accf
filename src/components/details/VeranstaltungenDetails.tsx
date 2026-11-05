import type { Veranstaltungen, Interaktionen, Teilnehmerkontakte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface VeranstaltungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Veranstaltungen;
  /** N:1-Ziel „Interaktionen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  interaktionenList: Interaktionen[];
  /** Klick auf die Interaktionen-Relation → overlay.push auf dessen Detail. */
  onOpenInteraktionen?: (record: Interaktionen) => void;
  /** 1:N „Interaktionen" (veranstaltung): VOLLE Liste — der Block filtert auf diesen Record. */
  interaktionenVeranstaltungList: Interaktionen[];
  /** Zeilen-Klick → overlay.push auf das Interaktionen-Detail (nie der Edit-Dialog). */
  onOpenInteraktionenVeranstaltung: (record: Interaktionen) => void;
  /** Kontextuelles „+": öffnet den Interaktionen-Dialog mit diesem Record vorgesetzt. */
  onAddInteraktionenVeranstaltung?: () => void;
  /** 1:N „Teilnehmerkontakte" (veranstaltung): VOLLE Liste — der Block filtert auf diesen Record. */
  teilnehmerkontakteList: Teilnehmerkontakte[];
  /** Zeilen-Klick → overlay.push auf das Teilnehmerkontakte-Detail (nie der Edit-Dialog). */
  onOpenTeilnehmerkontakte: (record: Teilnehmerkontakte) => void;
  /** Kontextuelles „+": öffnet den Teilnehmerkontakte-Dialog mit diesem Record vorgesetzt. */
  onAddTeilnehmerkontakte?: () => void;
}

export function VeranstaltungenDetails({
  record,
  interaktionenList,
  onOpenInteraktionen,
  interaktionenVeranstaltungList,
  onOpenInteraktionenVeranstaltung,
  onAddInteraktionenVeranstaltung,
  teilnehmerkontakteList,
  onOpenTeilnehmerkontakte,
  onAddTeilnehmerkontakte,
}: VeranstaltungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const aktive_interaktionTarget = interaktionenList.find(r => r.record_id === extractRecordId(record.fields.aktive_interaktion));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('veranstaltungen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('veranstaltungen', 'datum')} value={record.fields.datum} format="datetime" />
        <RecordField label={fieldLabel('veranstaltungen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('veranstaltungen', 'feedback_link')} value={record.fields.feedback_link} format="url" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('veranstaltungen', 'aktive_interaktion')}
          name={aktive_interaktionTarget?.fields.titel ?? '—'}
          meta={undefined}
          onClick={aktive_interaktionTarget && onOpenInteraktionen ? () => onOpenInteraktionen!(aktive_interaktionTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('interaktionen')} · ${fieldLabel('interaktionen', 'veranstaltung')}`}
        items={interaktionenVeranstaltungList.filter(r => extractRecordId(r.fields.veranstaltung) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('interaktionen'), meta: undefined })}
        onOpen={onOpenInteraktionenVeranstaltung}
        onAdd={onAddInteraktionenVeranstaltung}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('teilnehmerkontakte')}
        items={teilnehmerkontakteList.filter(r => extractRecordId(r.fields.veranstaltung) === record.record_id)}
        map={r => ({ name: r.fields.kuerzel ?? appLabel('teilnehmerkontakte'), meta: undefined })}
        onOpen={onOpenTeilnehmerkontakte}
        onAdd={onAddTeilnehmerkontakte}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.VERANSTALTUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('veranstaltungen')} />
    </>
  );
}
