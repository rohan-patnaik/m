# Household meal planner

Live app: https://meal-deploy.vercel.app/

Meals and settings are authoritative in Convex. The frontend uses live WebSocket queries and explicit transactional saves; it has no persistent meal cache or offline save queue. UI preferences and unsaved drafts are memory-only. Browsers warn before leaving unsaved drafts.

## Data and concurrency

- `records`: each template/day and dated week/day is separate; utensils, nutrition labels, oil estimates and wife/husband portion presets are household settings.
- Every record has a revision. Commits compare expected revisions atomically. Different-item edits merge; same-item edits require reloading the conflicting item. Deletions keep tombstones to avoid stale recreation.
- Day mode automatically selects the saved calendar week. Day Save changes that day, without swapping another day's sabzi. Week Save stores all seven days.
- Legacy Firebase browser copies are archived once in `legacyArchives`, then only those unchanged legacy keys are removed. They never override the current shared plan. Archive failure retains the old copy for a retry on the next visit.
- The app intentionally has no end-user login: anyone with its link can read and edit this household. Convex admin credentials are never shipped to the browser.

## Daily weighing and serving

**Weigh food** accepts the whole cooked sabzi and dal once for the day. Vessel weight is shown beside its name and subtracted by default when known. Use the secondary controls for food-only readings, another vessel, or a batch cooked for only lunch or dinner. **Save weights** stores dated `weigh/<date>/<dish>` records in Convex; both meal cards and other devices reuse them. Separate dinner protein is an optional section.

Whole grams are allocated across every included meal/person and add up exactly to the net food weight. The remaining-food column and optional scale targets assume lunch is served before dinner, husband then wife; these are expected readings, not a food-consumption log. Ratios follow the recipe and individual diet settings. Weighing does not change calorie or shopping calculations. Changing the recipe, serving scope, presets or batch coverage marks an old allocation as stale until reviewed and saved again. Previously recorded tare is preserved when global vessel settings change.

Vessel weights are global; editing them saves on field change. Wire format version 3 preserves weighing records and prevents older clients from deleting them. The October 8 restoration recovered the earlier positive utensil weights from the preserved `meal-before-household-sync-v1` archive, replacing only still-zero shared weights and retaining an audit on the artifact drive.

## Cooked batches

Use **Cook a batch** on a day card, choose a recipe and the covered date/meal/person boxes, then cook the combined raw quantities. The picker covers the cooking date and the next six days, including across calendar weeks. Paneer/soya recipes can replace either sabzi or a separate dinner protein serving. A protein-containing sabzi replaces the separate top-up too.

Enter one finished weight (food-only, or with the saved global vessel tare) and the total batch oil. Oil begins as an editable recipe estimate. Saved boxes sum exactly to the net cooked weight. Distribute paneer/soya pieces in the same proportions as gravy; the table also shows the raw paneer or dry soya equivalent for each box. Calories come from raw ingredients and oil, not absorbed cooking water.

`batch/<id>` records store frozen ingredients/nutrients and dated portions. Changing household portions, brands or vessel weights later does not rescale packed boxes. Correcting cooked weight changes only gram allocation. Remove a batch to return its servings to the original meal plan and recreate it with different assignments. Skipping a linked meal removes it from that day's nutrition; its prepared box remains recorded.

Shopping counts the full recipe once on its cooking date. Future cook lists show stored portions as **Already prepared**; other meal components remain fresh. Cooking and serving weeks are saved together. Overlapping batch assignments are rejected atomically, and older clients must reload before changing batch records.

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
