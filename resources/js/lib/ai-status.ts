/** What to tell the person about a stash whose smart features did not finish, by `stash.ai_error`. */
const reasons: Record<string, string> = {
    fetch_failed: 'The page could not be reached.',
    fetch_gone: 'The page is gone.',
    fetch_blocked: 'This address is not allowed.',
    fetch_too_large: 'The page is too large.',
    unsupported_type: 'This kind of file is not supported.',
    extract_failed: 'The page could not be read.',
    llm_invalid: 'The summary and tags did not come out right.',
    llm_refused: 'The model declined to read this.',
    llm_failed: 'The summary and tags could not be made.',
    provider_unavailable:
        'The service that makes summaries and tags is unavailable.',
    rate_limited: 'The service that makes summaries and tags is busy.',
    halted: 'Summaries and tags are paused for a moment.',
    quota: 'The monthly limit for summaries and tags is used up. They continue next month.',
};

export function aiErrorMessage(code: string | null): string {
    return (
        (code !== null ? reasons[code] : undefined) ?? 'Something went wrong.'
    );
}
