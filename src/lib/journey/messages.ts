/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - veranstaltungen: titel (Titel der Veranstaltung)
 *   - interaktionen: titel (Titel der Interaktion), frage (Frage an die Teilnehmenden), veranstaltung (Veranstaltung)
 *   - feedbacks: interaktion (Interaktion), kuerzel (Dein Kürzel), feedback_text (Dein Feedback), absende_kennung (Eindeutige Absende-Kennung)
 *   - teilnehmerkontakte: veranstaltung (Veranstaltung), kuerzel (Dein Kürzel), email (E-Mail-Adresse), einwilligung (Ich willige ein, dass meine E-Mail-Adresse gespeichert und zu meinem Kürzel zugeordnet wird.)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "veranstaltungen": "aktive_interaktion" | "titel" | "datum" | "beschreibung" | "feedback_link";
  "interaktionen": "titel" | "reihenfolge" | "frage" | "vorprompt" | "endprompt" | "zusammengefuehrter_text" | "ki_antwort" | "veranstaltung";
  "feedbacks": "interaktion" | "kuerzel" | "feedback_text" | "absende_kennung";
  "teilnehmerkontakte": "veranstaltung" | "kuerzel" | "email" | "einwilligung";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  veranstaltungen: { titel: "Bitte den Titel der Veranstaltung eingeben." },
  interaktionen: { titel: "Bitte einen Titel eingeben.", frage: "Bitte die Frage an die Teilnehmenden eingeben.", veranstaltung: "Bitte eine Veranstaltung auswählen." },
  feedbacks: { interaktion: "Bitte eine Interaktion auswählen.", kuerzel: "Bitte dein Kürzel eingeben.", feedback_text: "Bitte dein Feedback eingeben.", absende_kennung: "Bitte eine Absende-Kennung eingeben." },
  teilnehmerkontakte: { veranstaltung: "Bitte eine Veranstaltung auswählen.", kuerzel: "Bitte dein Kürzel eingeben.", email: "Bitte deine E-Mail-Adresse eingeben.", einwilligung: "Bitte der Speicherung zustimmen." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
