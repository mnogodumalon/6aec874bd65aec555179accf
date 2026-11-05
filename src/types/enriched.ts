import type { Feedbacks, Interaktionen, Teilnehmerkontakte, Veranstaltungen } from './app';

export type EnrichedVeranstaltungen = Veranstaltungen & {
  aktive_interaktionName: string;
};

export type EnrichedInteraktionen = Interaktionen & {
  veranstaltungName: string;
};

export type EnrichedFeedbacks = Feedbacks & {
  interaktionName: string;
};

export type EnrichedTeilnehmerkontakte = Teilnehmerkontakte & {
  veranstaltungName: string;
};
