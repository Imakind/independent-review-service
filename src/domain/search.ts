import type { ReviewRepository } from "./repository.js";
import type { NormalizedIdentifier, SearchResult } from "./types.js";

export async function searchObject(query: NormalizedIdentifier, repository: ReviewRepository): Promise<SearchResult> {
  if (query.isAmbiguous && query.identifierType === "username") {
    const identifiers = await repository.findIdentifiersByValue(query.normalizedValue);
    const similarObjects = (
      await Promise.all(
        identifiers.map((identifier) =>
          repository.findObjectByIdentifier(identifier.platformKey, identifier.normalizedValue),
        ),
      )
    ).filter((object) => object !== null);

    return emptyResult("ambiguous_match", query, similarObjects);
  }

  const exact = await repository.findObjectByIdentifier(query.platformKey, query.normalizedValue);
  if (exact) {
    return {
      matchType: "exact_match",
      query,
      object: exact,
      parentObject: null,
      similarObjects: [],
      reviews: await repository.findReviewsByObjectId(exact.id),
    };
  }

  if (query.parentNormalizedValue) {
    const parent =
      (await repository.findObjectByIdentifier("website", query.parentNormalizedValue)) ??
      (await repository.findObjectByPlatformKey(query.parentNormalizedValue));

    if (parent) {
      return {
        matchType: query.platformKey === "website" ? "domain_match" : "platform_match",
        query,
        object: null,
        parentObject: parent,
        similarObjects: [],
        reviews: await repository.findReviewsByObjectId(parent.id),
      };
    }
  }

  const similarObjects = await repository.findObjectsByLooseValue(query.normalizedValue);
  if (similarObjects.length > 0) {
    return emptyResult("similar_match", query, similarObjects);
  }

  return emptyResult("no_match", query, []);
}

function emptyResult(
  matchType: SearchResult["matchType"],
  query: NormalizedIdentifier,
  similarObjects: SearchResult["similarObjects"],
): SearchResult {
  return {
    matchType,
    query,
    object: null,
    parentObject: null,
    similarObjects,
    reviews: [],
  };
}
