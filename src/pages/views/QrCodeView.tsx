/**
 * src/pages/views/QrCodeView.tsx — the view „QR-Code“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/qr-code — generated in App.tsx, OUTSIDE the dashboard chrome.
 * LIVE    static — loads once.
 * READS   veranstaltungen (titel, feedback_link, aktive_interaktion) — filter stays vSQL.
 * JOIN    the QR is BUILT: <PublicPageQr entity="veranstaltungen" recordId={…} />.
 * PURPOSE Den QR-Code der Veranstaltung bildschirmfüllend in einem eigenen Browsertab zeigen, damit Teilnehmende ihn scannen.
 *
 * CONTRACT
 *   - Zeigt den QR-Code der Veranstaltung, die der Moderator über die Übersicht gewählt hat, so groß wie der Bildschirm es zulässt.
 *   - Hat die Veranstaltung keinen Feedback-Link, erscheint der Hinweis „Kein Feedback-Link hinterlegt“.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx } from '@/i18n';
import { PublicPageQr } from '@/components/widgets/PublicPageQr';

export default function QrCodeView() {
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const veranstaltungen = useLiveRecords('veranstaltungen', { intervalMs: 0, query: pinned
    ? { filter: `r.id == "${pinned}"`, limit: 1 }
    : { filter: "r.v_feedback_link is not None", orderby: ['r.updatedat desc', 'r.id desc'], limit: 1 } });
  const v = veranstaltungen.records[0];
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-10 text-center text-foreground">
      {v && (
        <>
          <h1 className="font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{v.fields.titel}</h1>
          {v.fields.feedback_link ? (
            <PublicPageQr entity="veranstaltungen" recordId={v.record_id} size="60vh" linkClassName="text-center" />
          ) : (
            <p className="text-muted-foreground" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{tx('Kein Feedback-Link hinterlegt')}</p>
          )}
        </>
      )}
      {!v && !veranstaltungen.loading && !veranstaltungen.error && (
        <p className="text-muted-foreground" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{tx('Kein Feedback-Link hinterlegt')}</p>
      )}
      {veranstaltungen.error && veranstaltungen.records.length === 0 && (
        <p role="alert" data-live-error className="text-destructive" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>
          {veranstaltungen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
