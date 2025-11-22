# Remediation Summary: speck-kit Attribution Integration

**Date**: 2025-11-22
**Context**: Clarifications session added 5 new functional requirements (FR-029 through FR-033) for speck-kit attribution. Analysis revealed CRITICAL coverage gap: zero tasks existed to implement these requirements.

---

## Changes Applied

### 1. tasks.md Updates

#### Phase Count Update
- **Changed**: Total phases from 8 → 9
- **Added**: Phase 3.5 "speck-kit Attribution Implementation (P1)"
- **Location**: Between Phase 3 (Value Proposition) and Phase 4 (Multi-Repo Discovery)

#### New Phase 3.5 Tasks (5 new tasks)

**T012a** [P] [US4] - Hero subtitle attribution
- Add "Built on GitHub's speck-kit" subtitle to hero section
- Hyperlink to https://github.com/github/speck-kit
- Implements FR-001 clarification (Q2 answer)

**T012b** [P] [US4] - Homepage Origins section
- Create 2-3 sentence Origins section on homepage
- Include: foundation acknowledgment, what Speck adds, compatibility statement
- Include conditional guidance for non-Claude-Code users
- Link to dedicated documentation page (T012c)
- Implements FR-029 (Q4, Q5 answers)

**T012c** [P] - Dedicated "About Speck & speck-kit" page
- Create `website/src/content/docs/about/speck-and-speck-kit.md`
- Comprehensive content: origin story, inherited features, extensions, compatibility, positioning
- Implements FR-033 (Q5 answer)

**T012d** [P] - Footer attribution
- Update `website/src/components/Footer.astro`
- Add "Built on GitHub's speck-kit" with link on all pages
- Implements FR-030 (Q1 answer)

**T012e** [VALIDATION] - Attribution verification
- Verify attribution in 3 required locations per SC-009
- Check tone consistency per FR-032
- Validates all attribution requirements

#### Updated Existing Tasks (6 tasks modified and unchecked for re-implementation)

**T008** - Note added
- Added reference: "speck-kit subtitle added in Phase 3.5"
- Clarifies hero section work split between T008 and T012a

**T013** - Inline attribution requirement added, **UNCHECKED** for re-implementation
- Multi-repo concepts page must include inline attribution for shared specs
- References FR-031 and attribution guide
- Status: `[X]` → `[ ]` (must be re-done with new attribution)

**T014** - Constitution attribution added, **UNCHECKED** for re-implementation
- Multi-repo support page must include: "Speck extends speck-kit's constitution concept..."
- Per FR-031 (Q3: core features only)
- Status: `[X]` → `[ ]` (must be re-done with new attribution)

**T015** - Constitution/template attribution added, **UNCHECKED** for re-implementation
- Monorepo page must include inline attribution when mentioning constitution or templates
- Per FR-031
- Status: `[X]` → `[ ]` (must be re-done with new attribution)

**T022** - Clarification note added, **UNCHECKED** for re-implementation
- Stacked PRs are Speck extension, NOT inherited
- NO inline attribution needed per FR-031
- Status: `[X]` → `[ ]` (must be re-done to ensure no accidental attribution)

**T023** - Clarification note added, **UNCHECKED** for re-implementation
- Stacked PRs page, NO inline attribution (Speck extension)
- Per FR-031 (Q3: core features only)
- Status: `[X]` → `[ ]` (must be re-done to ensure no accidental attribution)

**T031** - CRITICAL update, **UNCHECKED** for re-implementation
- Three-phase workflow page MUST include inline attribution
- "The three-phase workflow (specify, plan, implement), inherited from speck-kit..."
- Per FR-031 (Q3 clarification: core workflow features MUST receive attribution)
- Status: `[X]` → `[ ]` (must be re-done with CRITICAL attribution requirement)

---

### 2. plan.md Updates

#### Contracts Section Enhancement

**Added**: `speck-kit-attribution-guide.md` as Contract #1
- Where attribution appears: hero, Origins, footer, inline
- Tone requirements per FR-032
- Core features for inline attribution (Q3 answer)
- Example phrasings
- Non-Claude-Code conditional guidance
- speck-kit GitHub URL

**Renumbered**: Existing contracts 1-4 → 2-5

#### Phase 2 Expected Tasks Update

**Added**: Category #5
- "speck-kit attribution implementation (5-6 tasks: hero subtitle, Origins section, dedicated about page, footer, inline attribution in content, validation)"
- Renumbered existing categories 5-6 → 6-7

---

### 3. New Contract Created

**File**: `contracts/speck-kit-attribution-guide.md`

**Sections**:
1. **Attribution Locations** (4 channels)
   - Hero subtitle: specifications, example content
   - Homepage Origins section: requirements, example paragraph
   - Footer: specifications
   - Inline contextual attribution: scope, example phrasings, affected pages

2. **Tone Requirements** (FR-032)
   - Mandatory tone attributes: respectful, grateful, compatibility-focused
   - Canonical tone statement
   - Avoid/prefer lists with examples

3. **Dedicated Documentation Page** (FR-033)
   - Required content sections: origin story, inherited features, extensions, compatibility, positioning
   - Content structure for `about/speck-and-speck-kit.md`

4. **Validation Checklist** (SC-009)
   - 6-step verification process for Task T012e
   - Hero, Origins, footer, inline, tone, dedicated page checks

5. **Quick Reference**
   - speck-kit URL
   - Core features list (attribution required)
   - Extension features list (NO attribution)
   - Tone keywords (do/don't)

---

## Coverage Improvement

### Before Remediation
- **Requirements**: 33 functional requirements (FR-001 through FR-033)
- **Requirements with tasks**: 28 (FR-029 through FR-033 had ZERO coverage)
- **Coverage percentage**: 84.8%
- **Critical issues**: 2 (missing tasks for FR-029, FR-033)
- **High issues**: 3 (missing footer, incomplete inline attribution, incomplete hero)

### After Remediation
- **Requirements**: 33 functional requirements
- **Requirements with tasks**: 33 (100% coverage)
- **Coverage percentage**: 100%
- **Critical issues**: 0
- **High issues**: 0
- **New tasks created**: 5 (T012a through T012e)
- **Existing tasks updated**: 6 (T008, T013, T014, T015, T022, T023, T031)
- **New contracts created**: 1 (speck-kit-attribution-guide.md)

---

## Implementation Order

Follow this sequence when executing Phase 3.5:

1. **T012a** - Hero subtitle (quick win, highly visible)
2. **T012d** - Footer component (infrastructure, affects all pages)
3. **T012c** - Dedicated about page (comprehensive content, linked from T012b)
4. **T012b** - Homepage Origins section (depends on T012c link)
5. **T012e** - Validation (after all attribution in place)

**Parallel opportunity**: T012a and T012d can be done in parallel (different files)

---

## Clarification Questions Implemented

All 5 clarification questions from session 2025-11-22 fully implemented:

✅ **Q1**: Attribution locations → Multi-channel strategy (hero, Origins, footer, inline)
✅ **Q2**: Hero wording → "Built on GitHub's speck-kit" with hyperlink
✅ **Q3**: Inline attribution scope → Core workflow features only (three-phase, constitution, templates)
✅ **Q4**: Origins section CTA → Conditional guidance for non-Claude-Code users, NO CTA for Speck users
✅ **Q5**: Origins section detail → Brief homepage paragraph + dedicated comprehensive page

---

## Success Criteria Validation

**SC-009** (newly added):
> "speck-kit attribution appears in at least 3 locations: (1) homepage hero/tagline area, (2) dedicated About/Origins section, (3) footer on all pages, with consistent respectful tone emphasizing compatibility and extension"

**Validation Tasks**:
- T012a validates location #1 (hero)
- T012b validates location #2 (Origins section)
- T012d validates location #3 (footer)
- T012e validates all 3 locations + tone consistency

**Result**: SC-009 fully covered with dedicated validation task

---

## Constitution Compliance

### Principle I: Upstream Fidelity
**Status**: ✅ REINFORCED

Attribution requirements directly support this principle's mandate to "maintain compatibility with GitHub's spec-kit methodology while adding Claude Code-specific enhancements."

### Principle III: Specification-First Development
**Status**: ⚠️ OBSERVATION

Clarifications added substantive new requirements (FR-029 through FR-033) rather than just resolving ambiguities. Suggests initial spec underspecified attribution strategy.

**Recommendation**: For future specs involving upstream/derivative relationships, explicitly include "Attribution Strategy" section in initial specification.

---

## Files Modified

1. ✅ `specs/011-website-feature-update/tasks.md`
   - Phase count: 8 → 9
   - New Phase 3.5 with 5 tasks
   - 6 existing tasks updated with attribution requirements and **unchecked** for re-implementation

2. ✅ `specs/011-website-feature-update/plan.md`
   - Contracts section: added speck-kit-attribution-guide.md
   - Renumbered existing contracts
   - Phase 2 expected tasks: added attribution category

3. ✅ `specs/011-website-feature-update/contracts/speck-kit-attribution-guide.md` (NEW)
   - Comprehensive attribution guide
   - 4 location specifications
   - Tone requirements with examples
   - Validation checklist

4. ✅ `specs/011-website-feature-update/REMEDIATION-SUMMARY.md` (NEW, this file)
   - Complete change documentation

5. ✅ `.claude/commands/speck.analyze.md`
   - Added critical reminder in step 8 to uncheck modified tasks when applying remediation
   - Prevents future oversight of this requirement

---

## Next Steps

### Immediate (Before /speck.implement)
1. ✅ Review this remediation summary
2. ✅ Confirm all changes align with clarification intent
3. ⏭️ Begin implementation with Phase 3.5 tasks

### During Implementation
1. Reference `contracts/speck-kit-attribution-guide.md` for tone and content
2. Follow implementation order (T012a → T012d → T012c → T012b → T012e)
3. Verify tone consistency across all attribution touchpoints

### Validation
1. Run T012e validation task after all attribution tasks complete
2. Preview in dev server: http://localhost:4321
3. Check multiple pages for footer visibility
4. Test all hyperlinks to https://github.com/github/speck-kit

---

## Summary

**Problem**: Clarifications added 5 new attribution requirements (FR-029 through FR-033) with zero task coverage

**Solution**: Added Phase 3.5 with 5 new tasks, updated 6 existing tasks, created comprehensive attribution guide

**Impact**:
- Coverage: 84.8% → 100%
- Critical issues: 2 → 0
- Attribution strategy: Undefined → Fully specified
- Constitution alignment: Reinforced Principle I (Upstream Fidelity)

**Status**: ✅ COMPLETE - Ready for implementation
