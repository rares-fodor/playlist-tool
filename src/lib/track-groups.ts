import type { PlaylistedTrack } from "$lib/api_types";
import type { TrackGroup, TrackGroupMember } from "$lib/db";

/* Track groups, shared by the editor and its load function.
 * A group is a contiguous run of >=2 tracks that reorders as one block. Membership is a map from
 * synthetic track id to group id; the internal order is simply the members' order in the list,
 * which every reorder keeps because groups only ever move as whole blocks. */
export type GroupMap = Map<string, string>;

// Splits the list into blocks: one per group, one per ungrouped track
export function toBlocks(tracks: PlaylistedTrack[], groups: GroupMap): PlaylistedTrack[][] {
  const blocks: PlaylistedTrack[][] = [];
  let lastGroup: string | undefined;
  for (const track of tracks) {
    const group = groups.get(track.id);
    if (group !== undefined && group === lastGroup) {
      blocks[blocks.length - 1].push(track);
    } else {
      blocks.push([track]);
    }
    lastGroup = group;
  }
  return blocks;
}

// Inclusive index range of the block containing `index`
export function blockRange(tracks: PlaylistedTrack[], groups: GroupMap, index: number): [number, number] {
  const group = groups.get(tracks[index].id);
  if (group === undefined) {
    return [index, index];
  }
  let start = index;
  let end = index;
  while (start > 0 && groups.get(tracks[start - 1].id) === group) start--;
  while (end < tracks.length - 1 && groups.get(tracks[end + 1].id) === group) end++;
  return [start, end];
}

/* Moves each group's members next to its first member, keeping their relative order, or the
 * order given by `rank` (track id -> position in its group) */
export function pullTogether(
  tracks: PlaylistedTrack[],
  groups: GroupMap,
  rank?: Map<string, number>,
): PlaylistedTrack[] {
  const members = new Map<string, PlaylistedTrack[]>();
  for (const track of tracks) {
    const group = groups.get(track.id);
    if (group !== undefined) {
      if (!members.has(group)) members.set(group, []);
      members.get(group)!.push(track);
    }
  }
  if (rank) {
    for (const list of members.values()) {
      list.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    }
  }

  const result: PlaylistedTrack[] = [];
  for (const track of tracks) {
    const group = groups.get(track.id);
    if (group === undefined) {
      result.push(track);
    } else if (members.has(group)) {
      result.push(...members.get(group)!);
      members.delete(group);
    }
  }
  return result;
}

// Dissolves groups left with fewer than 2 members. Returns a new map.
export function pruneGroups(groups: GroupMap): GroupMap {
  const sizes = new Map<string, number>();
  for (const group of groups.values()) {
    sizes.set(group, (sizes.get(group) ?? 0) + 1);
  }
  return new Map([...groups].filter(([, group]) => sizes.get(group)! >= 2));
}

// Index of the track in the playlist as loaded from Spotify, encoded in its synthetic id
export const loadIndex = (track: PlaylistedTrack) => Number(track.id.slice(track.id.lastIndexOf(":") + 1));

// How each track is identified in the database: its URI plus which occurrence of that URI it is
export function memberKeys(spotifyOrder: PlaylistedTrack[]): Map<string, TrackGroupMember> {
  const seen = new Map<string, number>();
  const result = new Map<string, TrackGroupMember>();
  for (const track of spotifyOrder) {
    const uri = track.track.uri;
    const occurrence = seen.get(uri) ?? 0;
    seen.set(uri, occurrence + 1);
    result.set(track.id, { uri, occurrence });
  }
  return result;
}

// Groups in the shape they're saved in, members in list order
export function serializeGroups(
  tracks: PlaylistedTrack[],
  groups: GroupMap,
  spotifyOrder: PlaylistedTrack[],
): TrackGroup[] {
  const keys = memberKeys(spotifyOrder);
  return toBlocks(tracks, groups)
    .filter((block) => groups.has(block[0].id))
    .map((block) => ({
      id: groups.get(block[0].id)!,
      members: block.map((track) => keys.get(track.id)!),
    }));
}
