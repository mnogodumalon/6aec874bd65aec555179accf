import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicShell } from '@/components/PublicShell';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import {
  loadPublicPagesConfig, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import {
  useStepForm, useJourneySubmit, useLiveList, useVisitorKey, fieldText, fieldRef,
} from '@/lib/journey';
import { createPublicPort } from '@/lib/journey/publicPort';
import { tx } from '@/i18n';

const SLUG = 'feedback-geben';

function newKennung(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function FeedbackGeben() {
  const [params] = useSearchParams();
  const veranstaltungId = params.get('veranstaltung');
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [kennung, setKennung] = useState(newKennung);
  const kuerzel = useVisitorKey({ length: 5 });

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  const port = useMemo(() => (cfg && page ? createPublicPort(cfg, page) : null), [cfg, page]);
  const events = useLiveList(port, 'veranstaltungen', { intervalMs: 15000 });
  const interaktionen = useLiveList(port, 'interaktionen', { intervalMs: 15000 });

  const veranstaltung = events.records.find(r => r.id === veranstaltungId) ?? null;
  const activeId = veranstaltung ? fieldRef(veranstaltung, 'aktive_interaktion') : null;
  const aktiv = activeId ? interaktionen.records.find(r => r.id === activeId) ?? null : null;

  const form = useStepForm('feedbacks', {
    fields: ['feedback_text'],
    required: { feedback_text: true },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port ?? ({} as NonNullable<typeof port>),
    [{
      key: 'feedback',
      entity: 'feedbacks',
      form,
      primary: true,
      values: { interaktion: activeId ?? '', kuerzel: kuerzel, absende_kennung: kennung },
    }],
    { draftKey: `feedback-${veranstaltungId ?? 'none'}` },
  );

  if (loading || !cfg || !page || !port) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }

  if (!veranstaltungId) {
    return (
      <PublicShell title={tx('Feedback geben')}>
        <p className="text-sm text-muted-foreground">
          {tx('Scanne bitte den QR-Code deiner Veranstaltung, um Feedback zu geben.')}
        </p>
      </PublicShell>
    );
  }

  if (!events.loaded && events.error) {
    return (
      <PublicShell title={tx('Feedback geben')}>
        <LoadProblem onRetry={events.reload} />
      </PublicShell>
    );
  }

  if (!events.loaded || !interaktionen.loaded) {
    return <PublicShell loading />;
  }

  if (!veranstaltung) {
    return (
      <PublicShell title={tx('Feedback geben')}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
        </p>
      </PublicShell>
    );
  }

  const restart = () => {
    submit.reset();
    form.reset();
    setKennung(newKennung());
  };

  const send = async () => {
    prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.find(e => e.op === 'create')?.app_id ?? ''}/records`);
    if (!form.validate()) return;
    await submit.run();
  };

  return (
    <PublicShell title={fieldText(veranstaltung, 'titel')} description={tx('Gib hier dein Feedback ab.')}>
      {submit.result ? (
        <div className="space-y-5 text-center">
          <h2 className="text-xl font-semibold">{tx('Danke für dein Feedback!')}</h2>
          <div className="rounded-xl bg-muted px-4 py-5">
            <p className="text-sm text-muted-foreground">{tx('Dein Kürzel für heute Abend')}</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-widest">{kuerzel}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button onClick={restart}>{tx('Weiteres Feedback abgeben')}</Button>
            <Link
              className="text-sm underline underline-offset-4"
              to={`/public/kontakt-hinterlegen?veranstaltung=${veranstaltungId}`}
            >
              {tx('Freiwillig: E-Mail-Adresse zu deinem Kürzel hinterlegen')}
            </Link>
          </div>
        </div>
      ) : !aktiv ? (
        <p className="text-sm text-muted-foreground">
          {tx('Gerade ist keine Frage geöffnet. Schau gleich noch einmal vorbei.')}
        </p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={e => { e.preventDefault(); void send(); }}
        >
          <div className="rounded-xl bg-muted px-4 py-4">
            <p className="text-sm font-medium">{fieldText(aktiv, 'titel')}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{fieldText(aktiv, 'frage')}</p>
          </div>
          <Bound form={form} name="feedback_text" rows={5} />
          <FieldErrorSummary forms={[form]} />
          {submit.error && (
            <p className="text-sm text-destructive">
              {submit.offline
                ? tx('Keine Verbindung — deine Eingaben sind gesichert.')
                : tx('Das hat leider nicht geklappt. Bitte versuche es noch einmal.')}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submit.submitting}>
            {tx('Absenden')}
          </Button>
        </form>
      )}
    </PublicShell>
  );
}
