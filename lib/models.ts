/**
 * The models, in a file with no dependencies.
 *
 * They were declared in `lib/analyze.ts` beside the code that calls them, which
 * is where they belong right up until the interface wants to display them —
 * that module pulls in the provider SDK, so importing it from a client
 * component drags the whole thing into the browser bundle to read two strings.
 *
 * Separated rather than duplicated: the reference page and the studio rail both
 * claim to name the model that produced the map, and a second copy of a string
 * is a promise to eventually be wrong.
 */

/** Segmentation, translation, speaker names, axis names, speaker summaries. */
export const MODEL = 'gpt-5.4-mini'

/** Statement positions. Every distance on the map comes from these vectors. */
export const EMBEDDING_MODEL = 'text-embedding-3-small'

/** Dimensions the embedding returns, stated where it is displayed. */
export const EMBEDDING_DIMENSIONS = 1536
