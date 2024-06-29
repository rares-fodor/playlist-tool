const trackDataKey = Symbol('track');

export type TrackData = { [trackDataKey]: true, trackIndex: number };

export function isTrackData(data: Record<symbol | string, unknown>): data is TrackData {
  return data[trackDataKey] === true;
}

export function getTrackData(index: number): TrackData {
  return { [trackDataKey]: true, trackIndex: index };
}
