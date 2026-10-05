# Household meal planner

Live app: https://meal-deploy.vercel.app/

Meals and settings are authoritative in Convex. The frontend uses live WebSocket queries and explicit transactional saves; it has no persistent meal cache or offline save queue. UI preferences and unsaved drafts are memory-only. Browsers warn before leaving unsaved drafts.

## Data and concurrency

- `records`: each template/day and dated week/day is separate; utensils, nutrition labels, oil estimates and wife/husband portion presets are household settings.
- Every record has a revision. Commits compare expected revisions atomically. Different-item edits merge; same-item edits require reloading the conflicting item. Deletions keep tombstones to avoid stale recreation.
- Day mode automatically selects the saved calendar week. Day Save changes that day, without swapping another day's sabzi. Week Save stores all seven days.
- Legacy Firebase browser copies are archived once in `legacyArchives`, then only those unchanged legacy keys are removed. They never override the current shared plan. Archive failure retains the old copy for a retry on the next visit.
- The app intentionally has no end-user login: anyone with its link can read and edit this household. Convex admin credentials are never shipped to the browser.

## Deployments

Convex team/project: `rohan-patnaik/meal-planner` (Free).
Production: `https://accomplished-toucan-659.convex.cloud`.
Development: `https://stoic-weasel-242.convex.cloud`.
`cloud-config.js` contains only the public production address.

The Vercel project is linked to `main` on GitHub. `npm run build` bundles the Convex browser client; `vercel.json` serves `dist`. For local work on this machine, dependencies, caches and builds must use `/run/media/rohan/Stuff/Artifacts/meal-convex/` (set `MEAL_BUILD_DIR`, `TMPDIR`, and `npm_config_cache`; keep node_modules symlinked to the artifact dependency directory).

Validation: `npm test`; `MEAL_TEST_URL=https://stoic-weasel-242.convex.cloud node tests/convex-integration.mjs`. Integration tests refuse any other deployment and restore changed test values.
Backend: `npx convex dev --once` for development, `npx convex deploy` for production. Authenticate using your own CLI account; never commit `.env.local` or credentials.

## Migration and recovery

`node scripts/migrate.mjs <firebase-backup.json> [--prod]` performs a validated admin-only seed and refuses to overwrite existing Convex data. The original Firebase data is retained for recovery. This deployed frontend never contacts Firebase.

The machine's migration backups/evidence are retained under `/run/media/rohan/Stuff/Artifacts/meal-convex/recovery` and `outputs`. To roll back the frontend, revert the migration commit; first export any newer Convex changes and reconcile them with Firebase so rollback does not lose post-migration edits. Never blindly replace either database with an older backup.
