/**
 * Interaktion aktivieren — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Eine Interaktion dieser Veranstaltung wählen → 3) Prüfen & als aktive Interaktion setzen.
 * Reads: veranstaltungen, interaktionen. Writes: veranstaltungen.aktive_interaktion (update, via useInteraktionAktivierenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldRef } from '@/lib/journey';
import { useInteraktionAktivierenFlow } from '@/lib/journey/flows/InteraktionAktivieren';
import { tx } from '@/i18n';

export default function InteraktionAktivierenPage() {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);

  const flow = useInteraktionAktivierenFlow({
    steps: { veranstaltungen: 1, aktive_interaktion: 2 },
    items: {
      veranstaltungen: r => ({ id: r.id, title: fieldText(r, 'titel') }),
      aktive_interaktion: r => {
        const nr = fieldNumber(r, 'reihenfolge');
        return {
          id: r.id,
          title: fieldText(r, 'titel'),
          subtitle: [nr !== null ? tx`Nr. ${nr}` : '', fieldText(r, 'frage')].filter(Boolean).join(' — '),
        };
      },
    },
    where: {
      aktive_interaktion: r => !eventId || fieldRef(r, 'veranstaltung') === eventId,
    },
  });

  const eventPick = flow.pick('veranstaltungen');

  return (
    <IntentWizardShell
      title={tx('Interaktion aktivieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Lege fest, welche Interaktion bei einer Veranstaltung gerade aktiv ist.'), needs: [tx('Die Veranstaltung'), tx('Die gewünschte Interaktion')] }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Bei welcher Veranstaltung soll die aktive Interaktion wechseln?')}>
        <EntitySelectStep
          {...flow.picks.veranstaltungen.select}
          {...eventPick}
          onSelect={id => { setEventId(id); eventPick.onSelect(id); }}
          searchPlaceholder={tx('Titel der Veranstaltung …')}
        />
      </WizardStep>
      <WizardStep label={tx('Interaktion')} description={tx('Welche Interaktion soll ab jetzt aktiv sein?')}>
        {eventId ? (
          <EntitySelectStep
            {...flow.picks.aktive_interaktion.select}
            {...flow.pick('aktive_interaktion')}
            avatar="none"
            create={false}
            emptyText={tx('Diese Veranstaltung hat noch keine Interaktion.')}
            searchPlaceholder={tx('Titel oder Frage …')}
          />
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            confirmLabel={tx('Als aktiv setzen')}
            whatHappensNext={tx('Die gewählte Interaktion ersetzt die bisherige aktive Interaktion — es ist immer genau eine aktiv.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Feedbacks zusammenführen'), href: '#/intents/feedbacks-zusammenfuehren' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
