/**
 * What a round remembers while its turns are resolved one after the other: the strategy cards each player holds and has
 * played, whose secondary is free, who has passed and which components were played (a waiver may last to the round's end).
 * A resolution takes a track and returns the one that follows it; nothing is mutated in place.
 */
import type { CardRound } from '../../domain/replay/cards/index';
import type { GameState } from '../../domain/types';
import { playerOfKey } from '../legacyViews';
import type { PlayerId, Table } from '../types';
import { legacyKey } from '../legacyViews';

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

/** The round as the old card code reads it: players by their old id, `states` as given. */
export function cardRoundOf(table: Table, track: RoundTrack, states: Record<string, GameState>): CardRound {
  const key = (p: PlayerId): string => legacyKey(table, p);
  const by = (record: Record<PlayerId, number[]>): Record<string, number[]> => Object.fromEntries(Object.entries(record).map(([p, v]) => [key(p), [...v]]));
  return {
    held: by(track.held), primaries: by(track.primaries), secondaries: by(track.secondaries),
    freeSecondary: Object.fromEntries(Object.entries(track.freeSecondary).map(([c, ps]) => [c, ps.map(key)])), states,
  };
}

/** Takes back into the track what the old card code changed in a round it was given. */
export function keepRound(table: Table, track: RoundTrack, round: CardRound): void {
  const player = (k: string): PlayerId => playerOfKey(table, k) ?? k;
  const back = (record: Record<string, number[]>): Record<PlayerId, number[]> => Object.fromEntries(Object.entries(record).map(([k, v]) => [player(k), [...v]]));
  track.primaries = back(round.primaries);
  track.secondaries = back(round.secondaries);
  track.freeSecondary = Object.fromEntries(Object.entries(round.freeSecondary).map(([c, ps]) => [Number(c), ps.map(player)]));
}
