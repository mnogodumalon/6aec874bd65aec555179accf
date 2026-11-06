/**
 * useFeedbackGebenFlow — the plumbing of the flow « Feedback geben », generated from the plan.
 *
 * Writes `feedbacks`: asks `kuerzel`, `feedback_text`, `absende_kennung`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 2)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *   compute   REQUIRED — the plan says these values are computed in the flow
 *             but leaves the rule to you: `interaktion` (derived:from_pick:veranstaltungen.aktive_interaktion) *
 *   const flow = useFeedbackGebenFlow({
 *     steps: { kuerzel: 1, feedback_text: 1, absende_kennung: 1 },
 *     compute: { interaktion: forms => null },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <Bound form={flow.forms.feedbacks} name="kuerzel" />
 *     <Bound form={flow.forms.feedbacks} name="feedback_text" />
 *     <Bound form={flow.forms.feedbacks} name="absende_kennung" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useEffect, useRef, useState } from 'react';
import { readJourneyExtra, writeJourneyExtra } from '@/lib/journey/draft';
import { nounOne } from '@/config/plan';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { entityLabel } from '@/lib/journey/rules';

export type FeedbackGebenFieldKey = 'absende_kennung' | 'feedback_text' | 'kuerzel';

export interface FeedbackGebenForms {
  feedbacks: StepForm<'feedbacks'>;
}

// Alias so the option generics stay readable.
type Key = FeedbackGebenFieldKey;

export interface FeedbackGebenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** The plan computes these in the flow but leaves the rule to the page. */
  compute: {
    interaktion: (forms: FeedbackGebenForms) => unknown;   // derived:from_pick:veranstaltungen.aktive_interaktion
  };
}

const DEFAULT_STEPS: Record<string, number> = {"absende_kennung": 1, "feedback_text": 1, "kuerzel": 1};
export const FEEDBACKGEBEN_REVIEW_STEP = 2;

// local calendar day — the ISO-string of a Date is UTC and flips the date in the evening (J-7)
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useFeedbackGebenFlow(options: FeedbackGebenFlowOptions) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const feedbacks = useStepForm('feedbacks', {
    fields: ["kuerzel", "feedback_text", "absende_kennung"],
    steps: only(steps, ["kuerzel", "feedback_text", "absende_kennung"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["kuerzel", "feedback_text", "absende_kennung"]),
    messages: only(options.messages as Record<string, string> | undefined, ["kuerzel", "feedback_text", "absende_kennung"]),
  });
  const forms: FeedbackGebenForms = { feedbacks };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [feedbacks];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  const picks = {
  };

  const plan: PlanStep[] = [
    {
      key: 'feedbacks', entity: 'feedbacks', form: feedbacks, label: nounOne('feedbacks', entityLabel('feedbacks')), primary: true,
      values: (): FormValues => ({
        interaktion: options.compute.interaktion(forms),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'feedback-geben' });

  // A typed field the plan prefills from the picked record (`user:from_pick`),
  // still the person's to change: filled once, only while empty (PV-12)
  const prefillFrom = (pickKey: string, rec: JourneyRecord) => {
    void pickKey; void rec;
  };

  // Opened with `?<field>=<value>` for a field this flow asks — a dashboard
  // link that pre-picks the event, a form that hands the question on (J-2):
  // a typed field takes the value while it is empty (a draft wins), a pick
  // loads the record, takes it into the pick and selects it WITH its name.
  // `initial` with a bare record id gets its name the same way.
  const [linkedParams] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? ''));
  useEffect(() => {
    let on = true;
    const coerce = (form: StepForm, key: string, raw: string): unknown => {
      const kind = form.rules[key]?.kind;
      if (kind === 'number') { const n = Number(raw); return Number.isFinite(n) ? n : raw; }
      if (kind === 'bool') return raw === 'true' || raw === '1' || raw === 'ja';
      return raw;
    };
    { const v = linkedParams.get('kuerzel'); if (v !== null && isEmptyValue(feedbacks.get('kuerzel'))) (feedbacks.set as (k: string, v: unknown) => void)('kuerzel', coerce(feedbacks, 'kuerzel', v)); }
    { const v = linkedParams.get('feedback_text'); if (v !== null && isEmptyValue(feedbacks.get('feedback_text'))) (feedbacks.set as (k: string, v: unknown) => void)('feedback_text', coerce(feedbacks, 'feedback_text', v)); }
    { const v = linkedParams.get('absende_kennung'); if (v !== null && isEmptyValue(feedbacks.get('absende_kennung'))) (feedbacks.set as (k: string, v: unknown) => void)('absende_kennung', coerce(feedbacks, 'absende_kennung', v)); }
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, []);

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: FeedbackGebenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined; recordOf?(id: string): JourneyRecord | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => {
        (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id));
        const rec = search?.recordOf?.(id);
        if (rec) prefillFrom(field, rec);
      },
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: FeedbackGebenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'feedback-geben' as const,
    draftKey: 'feedback-geben' as const,    entity: 'feedbacks' as const,
    form: feedbacks,
    forms, formList, picks, submit, steps,    reviewStep: FEEDBACKGEBEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type FeedbackGebenFlow = ReturnType<typeof useFeedbackGebenFlow>;
