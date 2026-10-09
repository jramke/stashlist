#!/usr/bin/env bash
# PostToolUse hook for Write|Edit: format every changed or untracked file inside ddev, in one round trip.
# PHP goes through `composer format` (mago), everything else through `npm run format` (prettier,
# which skips whatever .prettierignore lists). Blade templates are left out on purpose: mago would
# treat them as plain PHP.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

php=()
other=()
while IFS= read -r f; do
    [ -f "$f" ] || continue
    # npm forwards its arguments unquoted and ddev re-parses them, so skip names with spaces or glob characters.
    case "$f" in *[!A-Za-z0-9_./@+-]*) continue ;; esac
    case "$f" in
        *.blade.php) ;;
        *.php) php+=("$f") ;;
        *) other+=("$f") ;;
    esac
done < <({ git diff --name-only HEAD --diff-filter=d; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)

# One `ddev exec` for both tools: a second container round trip costs about 0.5 s.
cmd=""
[ ${#php[@]} -gt 0 ] && cmd+="composer format -- ${php[*]}; "
[ ${#other[@]} -gt 0 ] && cmd+="npm run format -- ${other[*]}; "

if [ -n "$cmd" ]; then
    ddev exec "$cmd" >/dev/null 2>&1
    # Mutagen syncs container -> host asynchronously: wait, so the formatted files are on disk when we return.
    ddev mutagen sync >/dev/null 2>&1
fi

exit 0
