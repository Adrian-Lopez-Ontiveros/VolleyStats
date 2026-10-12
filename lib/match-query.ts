import {
  MATCH_LIST_SELECT,
  MATCH_LIST_SELECT_BASE,
  MATCH_LIST_SELECT_NO_VENUE,
  MATCH_WITH_TEAMS_SELECT,
  MATCH_WITH_TEAMS_SELECT_NO_VENUE,
} from "@/lib/constants";

type QueryError = { message: string } | null;

const MISSING_MATCH_COLUMN = /court|referees|sets_to_win/i;

export async function selectWithMatchFallback<T>(
  variants: readonly string[],
  load: (columns: string) => PromiseLike<{ data: T; error: QueryError }>
) {
  let result = await load(variants[0]);
  for (let index = 1; index < variants.length && result.error; index += 1) {
    if (!MISSING_MATCH_COLUMN.test(result.error.message)) break;
    result = await load(variants[index]);
  }
  return result;
}

export const MATCH_LIST_VARIANTS = [
  MATCH_LIST_SELECT,
  MATCH_LIST_SELECT_NO_VENUE,
  MATCH_LIST_SELECT_BASE,
] as const;

export const MATCH_DETAIL_VARIANTS = [
  MATCH_WITH_TEAMS_SELECT,
  MATCH_WITH_TEAMS_SELECT_NO_VENUE,
] as const;
