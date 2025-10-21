# TEST CHECKLIST (C1–C3)

## C1 – Weekly Meal Calendar (US-001..US-024)
- [ ] US-001 Week header shows date range; arrows navigate weeks
- [ ] US-002 Tap + next to day adds a meal to that day
- [ ] US-003 Adding more meals on same day does NOT use extra quota (visual only for MVP)
- [ ] US-004 Free user hitting a 3rd day → upgrade prompt (placeholder ok)
- [ ] US-005 Edit existing meals without quota cost
- [ ] US-006 Premium shows “Unlimited day planning”
- [ ] US-007 (MVP note) Week resets Monday (visual check)
- [ ] US-008 Copy Last Week opens selection (placeholder ok in MVP)
- [ ] US-009 Day layout shows meal cards + empty states
- [ ] US-017 Browse Recipes button present (navigates/placeholder)
- [ ] US-018 Copy Last Week button present
- [ ] US-019 Trial hides quota (visual flag/prop)
- [ ] US-020 Trial-end modal exists (placeholder)
- [ ] US-021 Quota indicator “X of 2 days used”
- [ ] US-022 Blocking modal at limit (placeholder)
- [ ] US-023 Remove individual foods (X on chip or menu)
- [ ] US-024 Delete entire meal (⋮ → confirm)

## C1 – Today View (US-010..US-016)
- [ ] US-010 Status badges + action buttons match state
- [ ] US-011 (Weekly only) spinner overlays during save
- [ ] US-012 Cards for Breakfast/Lunch/Dinner/Snack
- [ ] US-013 “Log Meal” opens C3 with planned foods
- [ ] US-014 “Didn’t Make” skips meal
- [ ] US-015 Progress “X of Y meals logged”
- [ ] US-016 “Add Unplanned Food/Meal” flow works

## C2 – Food Selection (US-025..US-031)
- [ ] US-025 Search + categories return results
- [ ] US-026 Select multiple foods; Save updates Today
- [ ] US-027 Age-appropriate categories (basic for MVP)
- [ ] US-028 Allergen warning shown (first time)
- [ ] US-029 Save respects idempotency (no doubles)
- [ ] US-030 (if present) show loading/empty/error states
- [ ] US-031 Track “planned” achievements (console log ok)

## C3 – Food Logging (US-032..US-048)
- [ ] US-032 Chips show X/remove (as per action sheet)
- [ ] US-033 Reaction, Amount, Allergy fields per food
- [ ] US-034 Notes save
- [ ] US-035 “Didn’t Make” skips
- [ ] US-036 Allergy detection → modal; adds to profile
- [ ] US-037 Correct footer: Start / Save Progress / Complete / Update
- [ ] US-038 After save, Today shows Partial/Complete
- [ ] US-039 Post-log summary shows reaction/amount badges on card
- [ ] US-040 Reopen complete meal → “Update Log”
- [ ] US-041 Food History opens (from chip action sheet)
- [ ] US-042 Stats show: first introduced, total servings, etc.
- [ ] US-043 Action sheet on chip: View History / Remove / Cancel
- [ ] US-044 If today’s entry exists, history shows “Edit today’s log”
- [ ] US-045 Navigating back from history returns to logging
- [ ] US-046–US-048 (if present in your doc): keep placeholders as needed



