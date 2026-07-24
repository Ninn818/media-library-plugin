// src/models/SeriesFrontmatter.ts

/**
 * Frontmatter shape for a TV Series note.
 */
export interface SeriesFrontmatter {
  // Core identity
    title?: string;

  // Creators 
    creator?: string | string[];
    creators?: string | string[];


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
    year?: string | number; //years aired, e.g. 2019-2021
    releaseDate?: string;
    publishDate?: string;
    datePublished?: string;

    firstAired?: string;
    lastAired?: string;
    airDate?: string;

    created?: string; // date the note was created, not the series
    dateCreated?: string;
    createdAt?: string;

  // Viewing dates
    lastWatched?: string;
    dateFinished?: string;
    finishDate?: string;

    [key: string]: unknown;
}