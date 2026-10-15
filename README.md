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

Diet assignments are independent from view navigation: Wife **Balanced** + Husband **Keto trial** is the default; all four assignments work. Diet assignment is available in Settings → Profile & targets; navigating between Day and Week does not convert menus. Assignments in `setting/diets` update actual meal totals, shopping, prep and weighing. Saved Balanced day recipes remain available separately. Low/Medium/High changes Balanced quantities only. Current strength-training adherence is unconfirmed; the planner adds no exercise calorie credit.

Keto portions live in revisioned `keto/<Monday-or-template>/day/<0–6>/<w-or-h>/<b-l-d>` records. **Edit meal** stages dish choices and food amounts together across Breakfast/Lunch/Dinner; Save validates the combined day before applying it. Cancel leaves the plan unchanged. Only active foods are shown; **Add food** reveals another ingredient. Ordinary brand selectors stay in advanced nutrition settings. Day options handles shared sabzi, Balanced dishes, evening nuts and skips. Small screens page active fields when needed, keeping the meal dialog itself free of scrolling.

Egg rows offer **− / count / +**, with preparation just beneath. Count changes use the existing ingredient ledger and update meal/day totals, shopping and cooking quantities. Clicking the count still skips/restores eggs. Extra whites remain separate; prepared portions stay frozen. Optional `eggPreparation` metadata persists without changing nutrients or inventing cooking oil; the oil amount is visible and adjustable. Defaults remain unchanged until the user edits them.

The three-scoop daily limit is enforced in the final backend transaction as well as the browser. Without a per-meal value, whey display falls back to the breakfast toggle (one 35 g scoop). The legacy `applyKetoInventoryPlan()` generator is retained for compatibility; the visible meal editor uses the food-first suggestions documented below. Chicken uses raw boneless skinless breast. Protein already present in the sabzi counts too. Eggs/chicken replace the separate paneer, with actual protein already inside a shared recipe counted too. Shopping shows 250/500 g chicken pack options and unused quantity. Meal tables label egg lines **Whole eggs** ("2 eggs") and **Extra whites** ("3 whites", extra eggs needed); shopping keeps one egg row (the shopping calculation combines both) with a note that eggs bought only for whites leave unused yolks. New high-protein paneer (240 g pack), Heritage Total Curd and Heritage butter have distinct packet profiles; Balanced curd defaults to Heritage Total through the shared `setting/curdType` selector in Packet labels. Earlier Milky Mist calorie/protein overrides remain available when that variant is selected; Amul settings and frozen batches remain intact.

One actual shared sabzi and one dal batch are allocated; dal and starch remain for each Balanced person. Higher-carb sabzis are counted honestly and can be explicitly changed to cabbage, cauliflower, spinach or bhindi via `keto/shared/<scope>/day/<i>`. The swap changes the shared cook recipe for both people, without overwriting their stored Balanced menu. Prepared portions are frozen and remain their actual old recipes. Cook a batch also supports high-protein paneer, chicken and eggs for matching keto dinners, with one measured finished weight across selected boxes.

**This is a reviewable trial draft, not a verified complete keto prescription.** Existing potato/arbi/legume days can exceed the carb budget; dairy-heavy days can exceed saturated-fat guidance. No silent substitution or calorie matching is performed. Per-day warnings show actual kcal/protein, counted available carbs, estimated total carbs, fibre and saturated fat. Unknown spice/macronutrient data and historical/manual overrides prevent a verified carb pass. Only documented USDA/IFCT total-carb fibre is subtracted once; packet carbs remain fully counted. Undeclared sugars use bounded ranges, and undeclared fibre/saturated fat are not treated as known zeros.

The husband's editable working target starts near 1800 kcal (1600–1800 planning range), 150–165 g protein and a conservative counted available-carb budget (`ketoOptions.carbBudget`, raised after the user's medical verification). The ISSN 2024 position stand treats 20–50 g carbs/day as a broad guideline; individual thresholds vary and ketosis is not guaranteed, so packet carbs stay fully counted with no blanket net-carb subtraction and estimated total carbs stay visible. Resting energy 1689.5 kcal is an equation estimate, not an intake or maintenance measurement. Wife's body data and targets are unconfirmed. WHO adult checks of ≥25 g fibre and ≤10% energy from saturated fat are planning references, not diagnoses or ketosis guarantees.

Fullness planning uses protein each meal, substantial vegetables, measured curd, and explicitly counted almonds/walnuts/cashews (not the unspecified mixed nuts) — Husband now has at most 20 g total nuts in the evening, with no nuts at breakfast, lunch or dinner in the updated plan. Ground flaxseed remains an optional historical field. No butter/oil/paneer is automatically added to fill calorie gaps. Weekly trial records (`keto/trial/<Monday>`) track hunger/cravings, weight, waist, strength, energy and bowel comfort; high hunger prompts review before further restriction. Baseline/start date and a 4–6 week review are editable in `setting/ketoOptions`. First-week water loss is not measured fat loss; zero cravings cannot be promised.

**Save changes** persists edits to Convex and live queries update other devices. Different-record changes merge; same-record conflicts require review. Wire format 5 prevents older clients deleting new household/keto records and keto batch variants. Compact nutrition explanations and primary sources live under Settings → Nutrition information. Original physician transcripts, matched packet photos and retained research evidence is under `outputs/keto-research` and `outputs/keto-household-handoff` on the artifact drive.

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

Nutrition format 10 uses distinct Milky Mist regular paneer (500 g public panel: 283 kcal, 16.1 g protein, 5.1 g carbohydrate, 22 g fat and 12 g saturated fat per 100 g), Amul butter, and plain raw cashew estimates. Keto nut grams are counted per meal (almonds/walnuts/cashews); Balanced nut portions use cashews. Old food IDs, manual overrides and frozen batches retain their identities. Packet photos verify the pictured formulation; a current physical packet takes precedence.

`setting/foodChoices`, `setting/produceOptions` and `setting/nutritionVersion` are revisioned household records. Purchase yields are independent from fixed raw edible recipe quantities; changing a trimming estimate cannot change food calories. Mushrooms use the selected 180/200 g net packet size consistently. Bought checkboxes record the required/bought quantity at marking time; an increased requirement needs review. Source K3 plain spinach resolves to K5 spinach corn only for templates and weeks from the stable 2026-10-12 cutoff. Older planned records and cooked K3 snapshots stay readable.

New cooked batches snapshot complete macro totals, ranges, flags and profile metadata (`n.version: 2`). Legacy batches retain their frozen kcal/protein/fibre; missing historical macros stay unknown rather than using live brand defaults. Fresh protein subtraction cannot strip unrelated frozen ingredients. Default P/Y batch oil matches the same fresh protein allocation, including chilla boosts. Global and per-meal food identity changes stale applicable weighing records without deleting them.

The 14 October replacement template is a **Keto trial draft**: approximately 1,910–2,070 kcal, 137–160 g protein and 41–49 g conservatively counted available carbohydrate per husband day with the reviewed saved portions. The 50 g budget remains editable and does not guarantee ketosis. It uses more substantial food portions and at most 20 g evening nuts. Earlier dated days and Wife's plan are preserved. Fibre, saturated fat and incomplete ingredient data remain review items; passing software tests does not verify dietary adequacy or ketosis. The optional example button retains chosen breakfasts and sabzis and only changes dates from 14 October forward; edited examples can differ from these totals.

Run `npm test` plus `MEAL_TEST_URL=https://stoic-weasel-242.convex.cloud node tests/convex-integration.mjs` and `node tests/convex-nutrition-integration.mjs`, plus `node tests/convex-rebalance-integration.mjs`, all with the same development-only environment variable. The latter configures development format10 defaults, preserves existing data, restores changed fixture values, and tests old-client protection, complete snapshots and transactional rollback. Production accepts reads from old clients but requires writer format10 once its nutrition-version setting is installed.
Round 3 polish (October 12). New cooked batches no longer offer retired K3.
Sabzi pickers select the recipe the math counts (`plannedRecipe(raw, scope)`),
so a stored current/future K3 shows its K5 replacement while saved historical
weeks keep K3 readable. Product, yield and mushroom-packet changes autosave like
Settings. Shopping checkboxes use `shoppingChecked(row)` and save
`shoppingPurchaseRecord(id, checked)`; a stored tick whose quantities no longer
cover the row renders unchecked with a muted "quantity changed — re-check" hint.
The milk carb evidence derives from the 100 g panel × the density in Settings.
Nut portions remain explicit and editable; older walnut grams are never renamed silently.


## Reversible quantities (wire format 14)

Meal quantity buttons retain their planned amount and toggle a scoped exclusion in
`exclude/<template-or-Monday>/day/<0-6>/<w-or-h>/<b-l-d-e>`. Each group records a
signature of its diet, recipe and ingredient quantities; a changed recipe or
quantity does not inherit an obsolete exclusion. Day mode materializes an unsaved
calendar week before toggling, preserving the recurring template. `copyDietScope`
clones exclusions with its meals. Exclusions follow the normal cloud draft,
conflict, save and reload flow; version 14 prevents older clients dropping them.

`plannedMeal` is the immutable calculation input; `mealQuantityGroups` supplies
both clickable rows and their removable ingredient groups. `meal` removes active
excluded groups before all nutrition totals and carb breakdowns. `freshMeal` feeds
shopping quantities, while already cooked batches retain their original ingredient
purchases and frozen nutrition snapshots. Shared dish exclusions remove only the
selected serving, including its allocated oil, and never enlarge another person's
portion. Individual ingredient exclusions leave separately planned cooking oil
counted. Original measured pots remain stored for undo. Excluding a fresh pot share makes its old weight stale; reweigh the smaller batch to allocate only the included portions. Other people's ingredient grams never increase.

Verify with `node --test tests/*.test.mjs`. The quantity-exclusions tests cover
nutrition deltas, shopping, undo/reload, all four diets, dated scope, stale signatures,
frozen batches, previews and record validation.

## Filling Keto mains and evening nuts (14 October 2026)

Husband has eleven selectable lunch/dinner dishes in **Edit meals**, including egg curry, spinach scramble, mushroom omelette, boiled eggs, chicken/avocado, chicken/mushroom/spinach, chicken/dahi, egg/avocado, paneer/mushrooms, high-protein paneer/spinach and egg/soya. Each selection replaces the separate protein and its listed sides, retains the selected sabzi and whey, and shows the actual meal/day totals. All weights are raw edible/packet weights; chicken is boneless skinless breast. Egg counts distinguish whole eggs and extra whites. Cooking oil is explicitly counted. Choosing a main alongside paneer bhurji counts both foods; older plans retain their original no-top-up behavior. Adjust portions preserves hand-tuned quantities when an unchanged dish is saved. The old two-chicken-meal restriction was removed at the user's request.

`mealRecipe` stores named mains. Husband's `keto/<scope>/day/<i>/h/e` record contains almonds, walnuts and cashews only, with a combined maximum of 20 g. Its presence marks the evening-only nut rule for that day, enforced against all three main meals in the final backend transaction. Zero grams is valid. Historical days without this record remain readable, with their original nut amounts. The update is written explicitly to the template and dates from 14 October forward; there is no migration on read. Wife's meals, past days, prepared batches and excluded quantities are not rewritten. Wire format 15 blocks older clients after the upgrade; old live queries receive a reload message rather than adopting unsupported portions.

The evening row participates in nutrition, prep, shopping, scope copying and skip/undo. Main-dish batch ingredients include their raw vegetables, extra whites and dry soya. Different ingredient ratios cannot share a proportional batch; cook them separately. Prepared meals cannot be replaced from Edit meals until their batch is removed. Calorie/protein and conservative carb warnings remain visible; no choice guarantees ketosis or complete nutrition.

## Daily interface simplification (2026-10-14)

Daily calories, protein and carbs are rounded estimates; detailed breakdowns retain their precision and uncertainty. Pot shares use compact `7/23` notation (with ≈ when rounded), and weighed serving controls stay available. This remains a plan with skip/restore, not a separate actual-food log. No saved meal plan or cooked batch is migrated by this UI update.

The household oil is Tata Simply Better cold-pressed mustard oil, internally matched to the manufacturer label: per 100 g, 897 kcal and 99.7 g fat; 1 L = 910 g. The UI calls it Cooking oil. Reverified against the manufacturer's back-label image on 2026-10-14; numeric values were already correct. Label evidence and UI/test artifacts are retained under `/run/media/rohan/Stuff/Artifacts/meal-convex/outputs/egg-controls-20261014/`.

## Food-first suggestions and adaptive whey (2026-10-15)

**Suggest day** in Husband’s meal editor previews varied lunch/dinner protein pans with the existing breakfast, sabzi shares and evening nuts retained. Candidate whole-food portions are bounded (175–300 g raw chicken, 3–5 eggs, or 100–150 g paneer). A substantial shared paneer-bhurji serving can replace an unnecessary separate protein top-up. The suggested plan prefers the calorie ceiling near 1800, checks 150–165 g protein and the saved carb budget, and uses at most 1.5 whey scoops for generated days. Incompatible days are flagged rather than applied. Individual edits remain under Save/Cancel.

**Balance whey** counts actual included food and whey across all meals, including frozen snapshots, using the active label. It tries half-scoops up to the existing 3-scoop daily cap, chooses only enough to reach protein, and checks calories and counted carbs. It removes editable unnecessary whey when food supplies enough protein. Fixed/skipped whey remains untouched. Lower calorie totals are flagged for whole-food review; extra whey is never added merely to fill calories. While Auto whey is on in that open editor, further food edits recalculate whey. Manually editing whey switches that mode off. Opening a saved day never recalculates or overwrites its portions.

Suggested full-day changes are unavailable for historical, skipped, prepared or weighed days. Whey-only previews still count frozen/omitted food correctly and avoid locked protein portions. Saved exact whey exclusions also reduce the backend cap; stale exclusion signatures do not. Suggestion saves carry an optional household revision guard, so concurrent changes to any nutrition/plan dependency reject the stale transaction before writing.

The authorized release updates only unchanged generated template/future menu records identified against the retained previous generated snapshot. User-modified days and historical dates remain byte-for-byte unchanged; Wife, breakfast foods (apart from whey), shared recipes, skips, batches and measured allocations are retained. The migration uses revision checks plus a whole-household snapshot guard and keeps before/proposal/after evidence on the artifact drive.

The 1600 kcal lower bound is a requested planning range, not established as safe for muscle preservation. Start near 1800; maintenance near 2200 and training adherence remain unconfirmed. No zero-muscle-loss promise is made.

## Shared vegetarian rotation (2026-10-15, wire format 16)

The approved rotation is Monday bhindi; Tuesday gobi, carrot and paneer; Wednesday soya chunks with vegetables; Thursday cabbage–paneer bhurji; Friday palak paneer; Saturday cabbage with rajma; Sunday mushroom–capsicum–paneer skillet. Dal accompanies the other six days. Saturday's pulse replaces dal; rajma, chhole and kala chana are selectable in Day options. The shared food contains no eggs, chicken or tofu. Husband's separately prepared protein remains separate in cooking, portions and frozen batches, even when the sabzi contains paneer.

New recipe IDs S13–S17 preserve the old recipes and their historical nutrition. Bean pulse portions count dry beans, onion, tomato and measured oil together in meals, exclusions, prep, shopping and cooked-weight allocation. Existing dal weight signatures remain unchanged. Green capsicum uses the USDA raw-green-pepper profile; its shopping yield is an adjustable estimate.

For these shared dishes, **Suggest day** evaluates shared food, existing breakfast and evening nuts before choosing separate chicken/egg portions and half-scoop whey top-ups. It caches meal nutrition before searching, limits generated whey to 1.5 scoops, and checks the actual final ledger against the saved targets. The deployed household target is 1600–1800 kcal, 150–165 g protein and at most 30 g counted available carbs; the legacy fallback stays unchanged. The generated plan prefers calories near 1800 and one separate protein preparation per day. It can use substantial raw chicken and avocado portions; all are visible and editable. Incompatible combinations are flagged rather than silently applied.

The one-time guarded migration updates the unchanged weekly template and untouched future days only. Individual edits, history, skips, prepared batches and weighed days are protected. Wife's breakfast, evening food and starch quantities remain as saved; her shared sabzi and dal/bean choices follow the authorized rotation. Before/proposal/after snapshots and exact preservation checks are retained under `/run/media/rohan/Stuff/Artifacts/meal-convex/outputs/shared-menu-20261015/`. Format 16 prevents older clients from reading or overwriting the new menu after migration.

Verify with `npm test` and `MEAL_TEST_URL=https://stoic-weasel-242.convex.cloud node tests/convex-shared-menu-integration.mjs`. The integration test restores its development-only fixture.
