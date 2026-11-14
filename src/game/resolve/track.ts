/**
 * What a round remembers while its turns are resolved one after the other: the strategy cards each player holds and has
 * played, whose secondary is free, who has passed and which components were played (a waiver may last to the round's end).
 * A resolution takes a track and returns the one that follows it; nothing is mutated in place.
 */
import type { PlayerId } from '../types';

export interface RoundTrack {
  /** The cards a player holds this round, by initiative; only the viewer's are planned. */
  held: Record<PlayerId, number[]>;
  primaries: Record<PlayerId, number[]>;
  secondaries: Record<PlayerId, number[]>;
  /** The players whose secondary of a card spends no token, by card (Trade, 92.4). */
  freeSecondary: Record<number, PlayerId[]>;
  passed: PlayerId[];
  /** The components each player played in the round so far. */
  plays: Record<PlayerId, string[]>;
}

export const newTrack = (held: Record<PlayerId, number[]> = {}): RoundTrack =>
  ({ held, primaries: {}, secondaries: {}, freeSecondary: {}, passed: [], plays: {} });

const copy = <T>(record: Record<string, T[]>): Record<string, T[]> => Object.fromEntries(Object.entries(record).map(([k, v]) => [k, [...v]]));

export const cloneTrack = (t: RoundTrack): RoundTrack => ({
  held: copy(t.held), primaries: copy(t.primaries), secondaries: copy(t.secondaries),
  freeSecondary: Object.fromEntries(Object.entries(t.freeSecondary).map(([k, v]) => [k, [...v]])), passed: [...t.passed], plays: copy(t.plays),
});
