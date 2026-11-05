/**
 * Feedbacks zusammenführen — 2-Schritt-Wizard.
 * Steps: 1) Interaktion wählen → 2) Zusammengeführten Text prüfen & speichern.
 * Reads: interaktionen, feedbacks. Writes: interaktionen.zusammengefuehrter_text (update).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useRef, useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, refFilter, useLiveList } from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { useFeedbacksZusammenfuehrenFlow } from '@/lib/journey/flows/FeedbacksZusammenfuehren';
import { tx } from '@/i18n';

function mergeText(interaktion: JourneyRecord | undefined, feedbacks: JourneyRecord[]): string {
  const parts = [
    interaktion ? fieldText(interaktion, 'vorprompt') : '',
    ...feedbacks.map(f => `${fieldText(f, 'kuerzel')}: ${fieldText(f, 'feedback_text')}`),
    interaktion ? fieldText(interaktion, 'endprompt') : '',
  ];
  return parts.map(p => p.trim()).filter(Boolean).join('\n\n');
}

export default function FeedbacksZusammenfuehrenPage() {
  const [step, setStep] = useState(1);
  // The compute rule runs at submit time; it reads the latest records through refs
  // because the picked id only exists once the hook has been created.
  const recordRef = useRef<JourneyRecord | undefined>(undefined);
  const feedbacksRef = useRef<JourneyRecord[]>([]);

  const flow = useFeedbacksZusammenfuehrenFlow({
    steps: { interaktionen: 1 },
    items: {
      interaktionen: r => ({ id: r.id, title: fieldText(r, 'titel'), subtitle: fieldText(r, 'frage') }),
    },
    compute: {
      zusammengefuehrter_text: () => mergeText(recordRef.current, feedbacksRef.current),
    },
  });

  const pickedId = (flow.pick('interaktionen').selectedId as string | null | undefined) ?? null;
  const live = useLiveList(flow.port, 'feedbacks', {
    intervalMs: 0,
    enabled: Boolean(pickedId),
    list: pickedId ? { filter: refFilter('interaktion', pickedId), orderby: ['r.createdat asc'] } : undefined,
  });
  const record = pickedId ? flow.picks.interaktionen.recordOf(pickedId) : undefined;
  recordRef.current = record;
  feedbacksRef.current = pickedId ? live.records : [];

  const merged = mergeText(record, feedbacksRef.current);
  const count = feedbacksRef.current.length;

  return (
    <IntentWizardShell
      title={tx('Feedbacks zusammenführen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Alle Feedbacks einer Interaktion in einem Text für die KI bündeln.'), needs: [tx('Eine Interaktion mit Feedbacks')] }}
    >
      <WizardStep label={tx('Interaktion')} description={tx('Welche Interaktion soll zusammengeführt werden?')}>
        <EntitySelectStep {...flow.picks.interaktionen.select} {...flow.pick('interaktionen')} searchPlaceholder={tx('Titel suchen …')} />
      </WizardStep>
      <WizardStep label={tx('Prüfen')} needs={['interaktionen']}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'anzahl', label: tx('Feedbacks'), value: live.loading ? '…' : String(count) },
              { key: 'text', label: tx('Zusammengeführter Text'), value: merged || tx('Noch kein Text — es gibt keine Feedbacks.') },
            ]}
            whatHappensNext={tx('Der Text wird in der Interaktion gespeichert und ersetzt den bisherigen Stand.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          next={[
            { label: tx('Interaktion aktivieren'), href: '#/intents/interaktion-aktivieren' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
