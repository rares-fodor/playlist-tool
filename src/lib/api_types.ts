// Source: https://github.com/spotify/spotify-web-api-ts-sdk/blob/main/src/types.ts
// NOTE: Declared only what is useful (eg. no )

export interface APIError {
  error: {
    status: number
    message: string
  }
}

export interface Page<TItemType> {
  href: string
  items: TItemType[]
  limit: number
  next: string | null
  offset: number
  previous: string | null
  total: number
}

export interface SimplifiedArtist {
  external_urls: ExternalUrls
  href: string
  id: string
  name: string
  type: string
  uri: string
}

export interface Artist extends SimplifiedArtist {
  followers: Followers
  genres: string[]
  images: Image[]
  popularity: number
}

export interface Artists {
  artists: Artist[]
}

interface AlbumBase {
  album_type: string
  available_markets: string[]
  copyrights: Copyright[]
  external_ids: ExternalIds
  external_urls: ExternalUrls
  genres: string[]
  href: string
  id: string
  images: Image[]
  label: string
  name: string
  release_date: string
  release_date_precision: string
  restrictions?: Restrictions
  total_tracks: number
  type: string
  uri: string
}

export interface SimplifiedAlbum extends AlbumBase {
  album_group: string
  artists: SimplifiedArtist[]
}

export interface Album extends AlbumBase {
  artists: Artist[]
  tracks: Page<SimplifiedTrack>
}

interface PlaylistBase {
  collaborative: boolean
  description: string
  external_urls: ExternalUrls
  followers: Followers
  href: string
  id: string
  images: Image[]
  name: string
  owner: User
  primary_color: string
  public: boolean
  snapshot_id: string
  type: string
  uri: string
}

export interface Playlist<Item extends TrackItem = TrackItem> extends PlaylistBase {
  tracks: Page<PlaylistedTrack<Item>>
  isVisible: boolean // Whether the playlist shows up in the app
  targetId?: string   // ID of target playlist
}

export interface PlaylistedTrack<Item extends TrackItem = TrackItem> {
  added_at: string
  added_by: AddedBy
  is_local: boolean
  primary_color: string
  track: Item
  id: string
}

export type TrackItem = Track;

export interface SimplifiedTrack {
  artists: SimplifiedArtist[]
  available_markets: string[]
  disc_number: number
  duration_ms: number
  episode: boolean
  explicit: boolean
  external_urls: ExternalUrls
  href: string
  id: string
  is_local: boolean
  name: string
  preview_url: string | null
  track: boolean
  track_number: number
  type: string
  uri: string
  is_playable?: boolean
  linked_from?: LinkedFrom
  restrictions?: Restrictions
}

export interface Track extends SimplifiedTrack {
  album: SimplifiedAlbum
  external_ids: ExternalIds
  popularity: number
}

export interface ExternalIds {
}

export interface ExternalUrls {
  spotify: string
}

export interface Followers {
  href: string
  total: number
}

export interface Image {
  url: string
  height: number
  width: number
}

export interface User {
  external_urls: ExternalUrls
  href: string
  id: string
  type: string
  uri: string
  display_name: string
}

export interface AddedBy {
  external_urls: ExternalUrls
  href: string
  id: string
  type: string
  uri: string
}

interface Restrictions {
  reason: string
}

export interface Copyright {
  text: string
  type: string
}

export interface LinkedFrom {
  external_urls: ExternalUrls
  href: string
  id: string
  type: string
  uri: string
}
