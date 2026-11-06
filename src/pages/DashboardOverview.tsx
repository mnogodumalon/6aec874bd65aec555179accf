import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconQrcode, IconFileText, IconPlus, IconCheck, IconMessage, IconCalendarEvent, IconGitMerge, IconAlertTriangle, IconPlayerPlay } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor, countOf } from '@/config/plan';
import type { EnrichedVeranstaltungen, EnrichedInteraktionen } from '@/types/enriched';
import { extractRecordId } from '@/services/livingAppsService';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { Button } from '@/components/ui/button';

// Composition: hub-and-spoke — Veranstaltung is the hub; each card carries its Interaktionen and the
// feedback count of the active one. CalendarWidget rejected: the events are few and each needs inline
// controls (activate, QR, merge) that a calendar cell cannot carry; the overview is a cockpit, not a schedule.
// Hero: an event with interactions but none active. Grid: split + slim StatStrip; aside = merge work list +
// latest feedbacks. Mobile: cards stack, aside comes first.
export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { feedbacks } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'interaktionen') return undefined;
      const rec = top.record as EnrichedInteraktionen;
      const vId = extractRecordId(rec.fields.veranstaltung);
      const v = vId ? data.veranstaltungen.find(x => x.record_id === vId) : undefined;
      if (!v || extractRecordId(v.fields.aktive_interaktion) === rec.record_id) return undefined;
      const go = flowActionFor('veranstaltungen', 'aktive_interaktion', v.record_id, rec.record_id);
      return go ? { label: tx('Als aktive Interaktion setzen'), onClick: go } : undefined;
    },
  });
  const veranstaltungen = crud.enriched.veranstaltungen;
  const interaktionen = crud.enriched.interaktionen;
  const clock = useClock();
  const [filter, setFilter] = useState<'all' | 'inactive' | 'merge'>('all');

  const feedbackCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of feedbacks) {
      const id = extractRecordId(f.fields.interaktion);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [feedbacks]);

  const interaktionenOf = (vId: string): EnrichedInteraktionen[] =>
    interaktionen
      .filter(i => extractRecordId(i.fields.veranstaltung) === vId)
      .sort((a, b) => (a.fields.reihenfolge ?? 0) - (b.fields.reihenfolge ?? 0));
  const activeOf = (v: EnrichedVeranstaltungen) => {
    const id = extractRecordId(v.fields.aktive_interaktion);
    return id ? interaktionen.find(i => i.record_id === id) : undefined;
  };
  const needsMerge = (i: EnrichedInteraktionen | undefined) =>
    !!i && (feedbackCount.get(i.record_id) ?? 0) > 0 && !(i.fields.zusammengefuehrter_text ?? '').trim();

  const withoutActive = veranstaltungen.filter(v => !activeOf(v) && interaktionenOf(v.record_id).length > 0);
  const mergeOpen = veranstaltungen.filter(v => needsMerge(activeOf(v)));
  const activeFeedbackTotal = veranstaltungen.reduce((s, v) => s + (feedbackCount.get(activeOf(v)?.record_id ?? '') ?? 0), 0);

  const shown = [...veranstaltungen]
    .sort((a, b) => (b.fields.datum ?? '').localeCompare(a.fields.datum ?? ''))
    .filter(v => filter === 'all' ? true : filter === 'inactive' ? withoutActive.includes(v) : mergeOpen.includes(v));

  const activate = (v: EnrichedVeranstaltungen, i: EnrichedInteraktionen) =>
    flowActionFor('veranstaltungen', 'aktive_interaktion', v.record_id, i.record_id);
  const merge = (i: EnrichedInteraktionen) => flowActionFor('interaktionen', 'zusammengefuehrter_text', i.record_id);
  const openView = (slug: string, id: string) => window.open(tx`#/ansicht/${slug}?record=${id}`, '_blank');

  const heroV = withoutActive[0];
  const heroGo = heroV ? activate(heroV, interaktionenOf(heroV.record_id)[0]) : null;

  const contextLine = (() => {
    if (veranstaltungen.length === 0) return tx('Lege deine erste Veranstaltung an und bereite die Interaktionen vor.');
    const live = veranstaltungen.map(v => activeOf(v)).filter((i): i is EnrichedInteraktionen => !!i);
    if (mergeOpen.length > 0) {
      return tx`Bei ${namen(mergeOpen.map(v => v.fields.titel ?? ''))} warten Feedbacks aufs Zusammenführen.`;
    }
    if (live.length > 0) return tx`Gerade aktiv: ${namen(live.map(i => i.fields.titel ?? ''))}.`;
    return tx`Noch keine Interaktion aktiv — ${namen(veranstaltungen.map(v => v.fields.titel ?? ''))} wartet auf dich.`;
  })();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{gruss(clock)}</h1>
          <p className="text-muted-foreground">{contextLine}</p>
        </div>
        {crud.veranstaltungen.canWrite && (
          <Button onClick={() => crud.veranstaltungen.openCreate({})}>
            <IconPlus size={16} className="shrink-0" /> {tx('Neue Veranstaltung')}
          </Button>
        )}
      </div>

      {veranstaltungen.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center space-y-3 overflow-hidden">
          <IconCalendarEvent size={48} className="mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{tx('Noch keine Veranstaltung — starte mit deiner ersten.')}</p>
          {crud.veranstaltungen.canWrite && (
            <Button onClick={() => crud.veranstaltungen.openCreate({})}>{tx('Erste Veranstaltung anlegen')}</Button>
          )}
        </div>
      ) : (
        <DashboardGrid
          hero={heroV && heroGo ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              tone="warning"
              action={{ label: tx('Erste Interaktion aktivieren'), onClick: heroGo }}
            >
              <b>{heroV.fields.titel}</b> {tx('hat noch keine aktive Interaktion — Teilnehmende sehen kein Formular.')}
            </HeroBanner>
          ) : undefined}
          kpis={
            <StatStrip>
              <StatStripItem
                title={tx('Feedbacks der aktiven Interaktionen')}
                value={activeFeedbackTotal}
                icon={<IconMessage size={18} className="text-muted-foreground" />}
              />
              <StatStripItem
                title={tx('Zusammenführen offen')}
                value={mergeOpen.length}
                tone={mergeOpen.length > 0 ? 'primary' : 'default'}
                onClick={() => setFilter(f => f === 'merge' ? 'all' : 'merge')}
                active={filter === 'merge'}
              />
            </StatStrip>
          }
          aside={
            <>
              <WorkList
                title={tx('Feedbacks zusammenführen')}
                icon={<IconGitMerge size={16} />}
                items={mergeOpen.flatMap(v => {
                  const i = activeOf(v)!;
                  const go = merge(i);
                  return [{
                    id: i.record_id,
                    title: i.fields.titel ?? '',
                    secondLine: <span className="text-muted-foreground">{v.fields.titel} · {countOf('feedbacks', feedbackCount.get(i.record_id) ?? 0, appLabel('feedbacks'))}</span>,
                    action: go ? { label: tx('Zusammenführen'), onClick: go } : undefined,
                  }];
                })}
                onItemClick={id => { const r = interaktionen.find(i => i.record_id === id); if (r) crud.interaktionen.openDetail(r); }}
                empty={{ text: tx('Nichts offen — alle Feedbacks sind zusammengeführt.') }}
              />
              <WorkList
                title={tx('Neueste Feedbacks')}
                icon={<IconMessage size={16} />}
                items={[...crud.enriched.feedbacks].sort((a, b) => {
                  const ta = Date.parse(a.createdat ?? a.created_at ?? '') || 0;
                  const tb = Date.parse(b.createdat ?? b.created_at ?? '') || 0;
                  if (tb !== ta) return tb - ta;
                  return a.record_id < b.record_id ? 1 : a.record_id > b.record_id ? -1 : 0;
                }).slice(0, 5).map(f => ({
                  id: f.record_id,
                  title: f.fields.kuerzel ?? '',
                  secondLine: <span className="text-muted-foreground">{f.interaktionName} · {(f.fields.feedback_text ?? '').slice(0, 60)}</span>,
                }))}
                onItemClick={id => { const r = crud.enriched.feedbacks.find(f => f.record_id === id); if (r) crud.feedbacks.openDetail(r); }}
                empty={{ text: tx('Noch kein Feedback eingegangen.') }}
              />
            </>
          }
          primary={
            <div className="space-y-4">
              {filter !== 'all' && (
                <button type="button" className="text-sm underline text-muted-foreground" onClick={() => setFilter('all')}>
                  {tx('Filter zurücksetzen')}
                </button>
              )}
              {shown.map(v => {
                const list = interaktionenOf(v.record_id);
                const act = activeOf(v);
                const mergeGo = act ? merge(act) : null;
                return (
                  <section key={v.record_id} className="rounded-2xl border bg-card overflow-hidden">
                    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <button type="button" className="min-w-0 text-left" onClick={() => crud.veranstaltungen.openDetail(v)}>
                        <h2 className="truncate text-lg font-semibold">{v.fields.titel}</h2>
                        <p className="text-sm text-muted-foreground">
                          {v.fields.datum ? format(new Date(v.fields.datum), 'PPp', { locale: dateFnsLocale() }) : tx('Ohne Datum')}
                          {' · '}
                          {act ? tx`Aktiv: ${act.fields.titel ?? ''}` : tx('Keine aktive Interaktion')}
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openView('qr-code', v.record_id)}>
                          <IconQrcode size={16} className="shrink-0" /> {tx('QR-Code')}
                        </Button>
                        <Button size="sm" variant="outline" disabled={!act} onClick={() => openView('zusammenfuehrung', v.record_id)}>
                          <IconFileText size={16} className="shrink-0" /> {tx('Text')}
                        </Button>
                        {act && mergeGo && (
                          <Button size="sm" onClick={mergeGo}>
                            <IconGitMerge size={16} className="shrink-0" /> {tx('Feedbacks zusammenführen')}
                          </Button>
                        )}
                      </div>
                    </div>
                    <ul className="divide-y border-t">
                      {list.map(i => {
                        const isActive = act?.record_id === i.record_id;
                        const go = isActive ? null : activate(v, i);
                        return (
                          <li key={i.record_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => crud.interaktionen.openDetail(i)}>
                              <span className="block truncate text-sm font-medium">{i.fields.titel}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {countOf('feedbacks', feedbackCount.get(i.record_id) ?? 0, appLabel('feedbacks'))}
                                {i.fields.ki_antwort ? ` · ${tx('KI-Antwort vorhanden')}` : ''}
                              </span>
                            </button>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                                <IconCheck size={16} /> {tx('Aktiv')}
                              </span>
                            ) : go ? (
                              <Button size="sm" variant="outline" onClick={go}>
                                <IconPlayerPlay size={14} className="shrink-0" /> {tx('Aktiv setzen')}
                              </Button>
                            ) : null}
                          </li>
                        );
                      })}
                      {list.length === 0 && (
                        <li className="px-4 py-3 text-sm text-muted-foreground">{tx('Noch keine Interaktion vorbereitet.')}</li>
                      )}
                    </ul>
                    {crud.interaktionen.canWrite && (
                      <div className="border-t p-2">
                        <Button size="sm" variant="ghost" onClick={() => crud.interaktionen.openCreate({ veranstaltung: v.record_id, reihenfolge: list.length + 1 })}>
                          <IconPlus size={14} className="shrink-0" /> {tx('Interaktion hinzufügen')}
                        </Button>
                      </div>
                    )}
                  </section>
                );
              })}
              {shown.length === 0 && (
                <p className="text-sm text-muted-foreground">{tx('Keine Veranstaltung passt zum Filter.')}</p>
              )}
            </div>
          }
        />
      )}
      {crud.surfaces}
    </div>
  );
}
