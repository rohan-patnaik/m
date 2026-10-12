# Household meal planner

Live app: https://meal-deploy.vercel.app/

Meals and settings are authoritative in Convex. The frontend uses live WebSocket queries and explicit transactional saves; it has no persistent meal cache or offline save queue. UI preferences and unsaved drafts are memory-only. Browsers warn before leaving unsaved drafts.

## Data and concurrency

- `records`: each template/day and dated week/day is separate; utensils, nutrition labels, oil estimates and wife/husband portion presets are household settings.
- Every record has a revision. Commits compare expected revisions atomically. Different-item edits merge; same-item edits require reloading the conflicting item. Deletions keep tombstones to avoid stale recreation.
- Day mode automatically selects the saved calendar week. Day Save changes that day, without swapping another day's sabzi. Week Save stores all seven days.
- **Calendar weeks**: pick any day (or This week / Next week); the dialog shows the resulting Monday–Sunday range and whether it is saved. **Save week** copies the seven days currently shown (template or another saved week) into those dates; an existing saved week is only replaced after an inline **Replace saved week** confirmation, and Delete also asks inline first. Day and Week pages name the saved week (or template) and its full range. The light/dark switch sits in the header beside Settings.
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

## Household keto trial

Diet assignments are independent from view navigation: Wife **Balanced** + Husband **Strict keto** is the default; all four assignments work. Switching the top Balanced/Keto view does not convert menus. Assignments in `setting/diets` update actual meal totals, shopping, prep and weighing. Saved Balanced day recipes remain available separately. Low/Medium/High changes Balanced quantities only. The husband's daily strength training is not a calorie credit or protein toggle.

Keto portions live in revisioned `keto/<Monday-or-template>/day/<0–6>/<w-or-h>/<b-l-d>` records. Dairy variants, raw protein quantity, dry chunks, curd, milk, optional butter, cucumber, walnuts, flax and self-cooking oil are explicit. Enabled ATOM whey stays one 35 g scoop. Husband defaults to eggs for five dinners and 250 g raw boneless skinless breast for two dinners. Eggs/chicken replace the separate paneer, with actual protein already inside a shared recipe counted too. Shopping shows 250/500 g chicken pack options and unused quantity. New high-protein paneer (240 g pack), Heritage Total Curd and Heritage butter have distinct packet profiles; Balanced curd defaults to Heritage Total through the shared `setting/curdType` selector in Packet labels. Earlier Milky Mist calorie/protein overrides remain available when that variant is selected; Amul settings and frozen batches remain intact.

One actual shared sabzi and one dal batch are allocated; dal and starch remain for each Balanced person. Higher-carb sabzis are counted honestly and can be explicitly changed to cabbage, cauliflower, spinach or bhindi via `keto/shared/<scope>/day/<i>`. The swap changes the shared cook recipe for both people, without overwriting their stored Balanced menu. Prepared portions are frozen and remain their actual old recipes. Cook a batch also supports high-protein paneer, chicken and eggs for matching keto dinners, with one measured finished weight across selected boxes.

**This is a reviewable trial draft, not a verified complete strict-keto prescription.** Existing potato/arbi/legume days can exceed the carb budget; dairy-heavy days can exceed saturated-fat guidance. No silent substitution or calorie matching is performed. Per-day warnings show actual kcal/protein, counted available carbs, estimated total carbs, fibre and saturated fat. Unknown spice/macronutrient data and historical/manual overrides prevent a verified carb pass. Only documented USDA/IFCT total-carb fibre is subtracted once; packet carbs remain fully counted. Undeclared sugars use bounded ranges, and undeclared fibre/saturated fat are not treated as known zeros.

The husband's editable working target starts at 2000 kcal (1900–2100 range), 120–150 g protein and a conservative counted available-carb budget of 30 g. Resting energy 1689.5 kcal is an equation estimate, not an intake or maintenance measurement. Wife's body data and targets are unconfirmed. WHO adult checks of ≥25 g fibre and ≤10% energy from saturated fat are planning references, not diagnoses or ketosis guarantees.

Fullness planning uses protein each meal, substantial vegetables, measured curd, and explicitly counted walnuts/ground flax (new foods, not the unspecified mixed nuts). Nuts/curd can be reserved from planned meals as a snack, not added on top. No butter/oil/paneer is automatically added to fill calorie gaps. Weekly trial records (`keto/trial/<Monday>`) track hunger/cravings, weight, waist, strength, energy and bowel comfort; high hunger prompts review before further restriction. Baseline/start date and a 4–6 week review are editable in `setting/ketoOptions`. First-week water loss is not measured fat loss; zero cravings cannot be promised.

**Save changes** persists edits to Convex and live queries update other devices. Different-record changes merge; same-record conflicts require review. Wire format 5 prevents older clients deleting new household/keto records and keto batch variants. Five physician video transcripts, matched packet photos and authoritative references are linked in the Keto tab; retained research evidence is under `outputs/keto-research` and `outputs/keto-household-handoff` on the artifact drive.

## Weekly shopping list

The single **Shopping list** navigation link opens `#shopping` from Balanced, Keto or Day mode. It shows the selected calendar week (or template), both assigned diets, farmers’ market produce and supermarket/DMart/Walmart items together. Comparison filters and view switches do not change the list. Quantities follow actual assigned meals, skips, portion/brand edits and the existing batch ledger; batches cooked in the selected week are purchased once, including reserved future servings.

Weekly need is raw edible/dry weight, milk/oil volume, whole eggs or 35 g whey scoops. Produce buying weights use the existing estimated trimming yields and practical rounding; supermarket packs round upward and keep regular/high-protein paneer and curd variants separate. Chicken offers 250/500 g packs with excess raw grams shown. This is a one-week list assuming no existing stock, not a store inventory/availability lookup. Unspecified salt, fresh herbs, ginger and garlic are not invented as measured recipe ingredients.

The full sabzi list is available in Planner and Keto day cards. `keto/shared/<week>/day/<i>` supports a shared `recipe` and optional `w`/`h` exceptions; shared edits preserve those exceptions. Paneer bhurji (`S12`) uses regular Heritage paneer, onion, tomato and allocated cooking oil. It includes the meal's protein and replaces the Balanced dinner top-up (and the Keto lunch/dinner top-up) rather than stacking them. Saved Balanced menus and prepared batch snapshots remain intact.

When the two recipes differ, prep lists separate the cooking quantities and **Weigh food** uses independent `sabzi-w`/`sabzi-h` cards and records. Never weigh two different dishes as a single shared batch. Batch prefilling selects only people whose planned recipe matches. Wire format 6 prevents older clients removing individual recipe assignments, individual cooked weights or bhurji batches.

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


## Household interface (October 2026)

The two primary destinations are Meals and Shopping (`#shopping`). Meals contains
Day (`#today`, the default) and Week (`#week`) views with open meal cards. Old
`#planner`, `#labels`, `#utensils` and `#keto` links remain usable; labels, utensils
and the detailed diet review open in Settings. Laptop layouts show three meal
cards together; phones stack the cards while keeping Wife and Husband quantities
side by side. Week keeps shared sabzis and person-specific exceptions together
under Sabzis & vessels. Diet assignments remain independent from navigation.

Weigh & serve walks through one dish at a time, using saved global vessel weights
and the existing allocation math. A whole lunch-plus-dinner reading reserves both
meals automatically. Serving progress, meal completion and shopping checkboxes are
shared Convex records (`serve/`, `done/`, `buy/`), never device storage. Mark served
is a serving guide, not a nutritional intake log; it does not subtract food from
shopping or change calorie totals. Progress is invalidated when the saved weight
or allocation changes. Meal completion is invalidated when its ingredients change.
Prepared batch snapshots remain frozen and appear as already prepared portions.

Wire format 7 protects the new checklist records against old clients. Serving
writes verify the referenced cooked weight in the same transaction and use stable
field ordering. Existing wire formats remain accepted for their original records.
Recipe and settings edits autosave; modal editors still have explicit save actions.
The sync status bar appears only for pending edits, disconnection or errors.

The compact layout (October 12) keeps Meals and Shopping as the two primary pages
with Day and Week inside Meals. Each open meal card is one Wife | Husband table: a
shared dish appears once with both amounts beside it, prepared or weighed portions
keep their cooked grams, un-weighed batch shares stay muted until weighed, and kcal
and protein close the table. Day totals sit in a single strip beside the actions,
weight/oil notes appear once per page, and keto portion adjustments stay behind a
per-person disclosure inside the card. No quantities, records or math changed.

Shopping distinguishes raw edible need from purchase weight. Cauliflower still
uses a clearly identified 60% trimming estimate, now rounded in 100 g increments
(575 g edible need suggests about 1 kg whole). Mushroom packets are conservatively
counted at 180 g each, with 180–200 g sizes shown. Pantry packet estimates and the
absence of home-stock subtraction are disclosed. No planned food portions were
changed by the interface redesign.

Round 2 controls (October 12). The light/dark switch is fixed at the top right
(safe-area aware, above content and the sticky sync bar, below modal dialogs);
the header and sync bar reserve its width so nothing sits under it on laptop or
a 320 px phone. Settings → Food labels has Paneer (Milky Mist 500 g default,
Heritage regular / NOURISH+ alternatives) and Butter (Amul salted default,
Heritage alternative) selectors wired to `updateFoodChoice`. Shopping has a
closed-by-default **Buying assumptions** panel with per-produce edible-yield %
(`updateProduceYield`) and a 180/200 g mushroom packet setting
(`updateMushroomPacketSize`); each produce row shows its buying form and the
yield used. Yield affects purchase quantities only, never recipe grams or
nutrition. Mushroom rows display the computed `packs × size` and total buy.
Keto portions offer a cashews control (walnuts remain only in historical
records), K5 is named "Spinach corn sabzi", plain-spinach K3 is hidden from new
dropdowns, added sugar shows as unknown or a range (never an assumed 0 g), and
saturated fat stays a lower bound with an incomplete-data note.
