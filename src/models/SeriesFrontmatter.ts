// src/models/SeriesFrontmatter.ts

/**
 * Frontmatter shape for a TV Series note.
 */
export interface SeriesFrontmatter {
  // Core identity
    title?: string;

  // Creators / showrunners
    creator?: string | string[];
    creators?: string | string[];

  // Cast
    cast?: string | string[];
    actors?: string | string[];

  // Production
    studio?: string;
    network?: string;
    streamingService?: string | string[];

  // Structure / progress
    seasons?: number | string;
    seasonCount?: number | string;

    episodes?: number | string;
    episodeCount?: number | string;
    totalEpisodes?: number | string;

    currentSeason?: number | string;
    currentEpisode?: number | string;
    lastEpisodeWatched?: string;

  // Genres / categories
    genres?: string[] | string;
    genre?: string | string[];
    category?: string | string[];

  // Status / completion
    status?: string;            // e.g. "currently watching", "finished watching"
    watched?: string | boolean; // legacy / alt field
    inProgress?: boolean;
    dropped?: boolean;

  // Covers / images
    cover?: string;
    coverUrl?: string;
    image?: string;
    localCover?: string;

  // Text content
    summary?: string;
    description?: string;
    plot?: string;
    synopsis?: string;
      review?: string;

  // Ratings
    personalRating?: number | string;

  // Dates & years
    releaseYear?: string | number;
    year?: string | number;
    releaseDate?: string;
    publishDate?: string;
    datePublished?: string;

    firstAired?: string;
    lastAired?: string;
    airDate?: string;

    created?: string;
    dateCreated?: string;
    createdAt?: string;

  // Viewing dates
    lastWatched?: string;
    dateFinished?: string;
    finishDate?: string;

    [key: string]: unknown;
}