/**
 * src/pages/views/ZusammenfuehrungView.tsx — the view „Zusammengeführter Text“ the plan orders (dashboard.views).
 *
 * ROUTE   #/ansicht/zusammenfuehrung — generated in App.tsx, OUTSIDE the dashboard chrome
 *         (no header, drawer or assistant: a beamer / kiosk / print surface). Never wire a route for it yourself.
 * LIVE    static — loads once.
 * READS   interaktionen (titel, frage, zusammengefuehrter_text, veranstaltung) * SHOWS   the interaktionen record that veranstaltungen.aktive_interaktion points at — the control
 *         record the OVERVIEW set last (`veranstaltungenControl` below reads exactly that one; the id to show is the
 *         reference in its `aktive_interaktion`). Read THAT record — never `records[0]` of a list, never „the
 *         newest open one“; no reference set → the view says „Nichts ausgewählt“.
 * EDITS   interaktionen.zusammengefuehrter_text is edited ON this view, in front of the room: keep the
 *         <ViewTextEditor field="zusammengefuehrter_text" …> below (big field, saves by itself with
 *         „Gespeichert“ / „Speichert …“ / „Nicht gespeichert — erneut versuchen“, „Text kopieren“) on
 *         the record the view SHOWS — never a read-only text with an „Bearbeiten“ dialog
 *         (check-dashboard refuses a view without it).
 * ERRORS  a read that fails sets `error` (`unauthorized` when nobody is signed in: ask to sign in, never „connection lost“);
 *         a write the view makes by itself (autosave) shows „Nicht gespeichert — erneut versuchen“ on an error, never „Speichert …“ for good (the rows stay the last good state). With no rows AND an
 *         error the view says so on screen (keep the `data-live-error` block) — never the empty state.
 * JOIN    a QR or link to the public page is BUILT: <PublicPageQr entity="veranstaltungen" recordId={…} />
 *         (or usePublicPageLink) from '@/components/widgets/PublicPageQr' — never a record's link field.
 * PURPOSE Den zusammengeführten Text der aktiven Interaktion bildschirmfüllend zeigen, vor den Teilnehmenden durchgehen, ändern und mit einem Klick kopieren.
 *
 * CONTRACT — what the overview (or a flow) and this view agree on. The overview
 * agent reads the same sentences; build EXACTLY this, never negotiate:
 *   - Zeigt den zusammengeführten Text der Interaktion, die in der Veranstaltung als aktive Interaktion gesetzt ist.
 *   - Der Text ist ein großes bearbeitbares Feld, das beim Tippen von selbst speichert; ein Kopieren-Knopf legt den ganzen Text in die Zwischenablage.
 *   - Ist noch nichts zusammengeführt oder keine Interaktion aktiv, erscheint der Hinweis „Noch kein Text zusammengeführt“.
 *
 * This file is a PLACEHOLDER (KLAR_VIEW_PLACEHOLDER): replace its body with the real
 * view and drop that token. Rules: reads through useLiveRecords / useLiveRecord
 * (silent, stale on error, pauses hidden) — no own setInterval; `tx()` for every
 * visible string; big type, high contrast — this is read from across a room.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx } from '@/i18n';
import { LivingAppsService } from '@/services/livingAppsService';
import { ViewTextEditor } from '@/components/blocks/ViewTextEditor';

export default function ZusammenfuehrungView() {
  // opened for ONE record (`#/ansicht/zusammenfuehrung?record=<id>`, the overview's „Vollbild“/„QR“ link) → that one;
  // else the control record set LAST (several may each carry a mark — the latest choice wins)
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const veranstaltungenControl = useLiveRecords('veranstaltungen', { intervalMs: 0, query: pinned
    ? { filter: `r.id == "${pinned}"`, limit: 1 }
    : { filter: "r.v_aktive_interaktion is not None", orderby: ['r.updatedat desc', 'r.id desc'], limit: 1 } });
  const interaktionen = useLiveRecords('interaktionen', { intervalMs: 0 });
  // the record whose zusammengefuehrter_text this view edits — the one the control record points at
  const interaktionenEditId = String((veranstaltungenControl.records[0]?.fields as Record<string, unknown> | undefined)?.['aktive_interaktion'] ?? '').split('/').pop() ?? '';
  const interaktionenEdit = interaktionen.records.find(r => r.record_id === interaktionenEditId) ?? null;
  return (
    <main className="flex min-h-dvh flex-col bg-background p-10 text-foreground">
      <h1 className="font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{tx('Zusammengeführter Text')}</h1>
      {interaktionenEdit && (
        <p className="mt-2 mb-4 text-muted-foreground" style={{ fontSize: 'clamp(1.25rem, 2.4vh, 2.5rem)' }}>{interaktionenEdit.fields.titel}</p>
      )}
      {interaktionenEdit && !String(interaktionenEdit.fields.zusammengefuehrter_text ?? '').trim() && (
        <p className="mb-4 text-muted-foreground" style={{ fontSize: 'clamp(1.25rem, 2.2vh, 2.25rem)' }}>{tx('Noch kein Text zusammengeführt')}</p>
      )}
      {!veranstaltungenControl.loading && !veranstaltungenControl.error && !veranstaltungenControl.records.some(c => (c.fields as Record<string, unknown>)['aktive_interaktion']) && (
        <p className="mt-4" data-nothing-marked style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{tx('Nichts ausgewählt.')}</p>
      )}
      {interaktionenEdit && (
        <ViewTextEditor
          field="zusammengefuehrter_text"
          recordId={interaktionenEdit.record_id}
          value={String((interaktionenEdit.fields as Record<string, unknown>)['zusammengefuehrter_text'] ?? '')}
          save={async text => {
            await LivingAppsService.updateInteraktionenEntry(interaktionenEdit.record_id, { zusammengefuehrter_text: text });
interaktionen.apply(interaktionenEdit.record_id, { zusammengefuehrter_text: text });
          }}
        />
      )}
      {interaktionen.error && interaktionen.records.length === 0 && (
        <p role="alert" data-live-error className="mt-4 text-destructive" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>
          {interaktionen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
