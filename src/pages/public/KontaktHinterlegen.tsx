import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  loadPublicPagesConfig, PageUnavailableError, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm, useJourneySubmit, useLiveList, useVisitorKey, fieldText,
  type JourneyPort,
} from '@/lib/journey';
import { tx } from '@/i18n';

const SLUG = 'kontakt-hinterlegen';

export default function KontaktHinterlegen() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    loadPublicPagesConfig(SLUG)
      .then(c => {
        setCfg(c);
        setPage(c?.pages[SLUG] ?? null);
        setLoading(false);
      })
      .catch(e => {
        if (e instanceof PageUnavailableError) setUnavailable(true);
        setLoading(false);
      });
  }, []);

  if (loading || unavailable || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return <KontaktInner cfg={cfg} page={page} />;
}

function KontaktInner({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [params] = useSearchParams();
  const veranstaltungId = params.get('veranstaltung');
  const port = useMemo<JourneyPort>(() => createPublicPort(cfg, page), [cfg, page]);
  const live = useLiveList(port, 'veranstaltungen', { intervalMs: 0, enabled: !!veranstaltungId });
  const kuerzel = useVisitorKey();
  const [declined, setDeclined] = useState(false);

  const f = useStepForm('teilnehmerkontakte', {
    fields: ['email', 'einwilligung'],
    required: { email: true, einwilligung: true },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{
      key: 'kontakt',
      entity: 'teilnehmerkontakte',
      form: f,
      primary: true,
      values: { veranstaltung: veranstaltungId ?? '', kuerzel: kuerzel },
    }],
    { draftKey: `kontakt-${veranstaltungId ?? 'ohne'}` },
  );

  const record = live.records.find(r => r.id === veranstaltungId) ?? null;

  if (!veranstaltungId) {
    return (
      <PublicShell title={page.title}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link ist unvollständig. Scanne bitte den QR-Code der Veranstaltung noch einmal.')}
        </p>
      </PublicShell>
    );
  }
  if (!live.loaded && live.error) {
    return <PublicShell title={page.title}><LoadProblem onRetry={live.reload} /></PublicShell>;
  }
  if (!live.loaded) {
    return <PublicShell loading />;
  }
  if (!record) {
    return (
      <PublicShell title={page.title}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
        </p>
      </PublicShell>
    );
  }

  const feedbackLink = (
    <Link
      to={`/public/feedback-geben?veranstaltung=${veranstaltungId}`}
      className="inline-block text-sm font-medium text-primary underline underline-offset-4"
    >
      {tx('Zum Feedback-Formular')}
    </Link>
  );

  if (submit.result) {
    return (
      <PublicShell title={page.title}>
        <SuccessStep
          result={submit.result}
          title={tx('Danke, deine E-Mail-Adresse ist gespeichert')}
          actions={{ copy: false, print: false }}
        >
          <div className="pt-2">{feedbackLink}</div>
        </SuccessStep>
      </PublicShell>
    );
  }

  if (declined) {
    return (
      <PublicShell title={page.title}>
        <div className="space-y-3">
          <p className="text-sm">{tx('Alles klar — wir speichern keine E-Mail-Adresse von dir.')}</p>
          {feedbackLink}
        </div>
      </PublicShell>
    );
  }

  const send = async () => {
    if (!f.validate()) return;
    await submit.run();
  };

  return (
    <PublicShell
      title={page.title}
      description={tx`Freiwillig: hinterlege deine E-Mail-Adresse zu "${fieldText(record, 'titel')}".`}
    >
      <form
        className="space-y-5"
        onFocus={() => prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.find(e => e.op === 'create')?.app_id ?? ''}/records`)}
        onSubmit={e => { e.preventDefault(); void send(); }}
      >
        <p className="text-sm text-muted-foreground">
          {tx`Dein Kürzel auf diesem Handy: ${kuerzel}`}
        </p>
        <Bound form={f} name="email" />
        <Bound form={f} name="einwilligung" />
        <FieldErrorSummary forms={[f]} />
        {submit.error && !submit.offline && (
          <p className="text-sm text-destructive">{tx('Das Senden hat nicht geklappt. Bitte versuche es noch einmal.')}</p>
        )}
        {submit.offline && (
          <p className="text-sm text-muted-foreground">{tx('Keine Verbindung — deine Eingaben sind gesichert.')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submit.submitting} className="w-full sm:w-auto">
            {tx('E-Mail hinterlegen')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDeclined(true)} className="w-full sm:w-auto">
            {tx('Nein, danke')}
          </Button>
        </div>
      </form>
    </PublicShell>
  );
}
