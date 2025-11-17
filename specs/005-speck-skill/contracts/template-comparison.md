# Contract: Template Comparison

**Feature**: 005-speck-skill
**Date**: 2025-11-17
**Purpose**: Define the contract for comparing actual artifact files against template structure

---

## Overview

This contract specifies how the Speck Workflow Skill compares an actual spec/plan/tasks file against its corresponding template to identify structural differences.

---

## Input Schema

```typescript
interface TemplateComparisonRequest {
  actualFilePath: string;      // Path to actual artifact file
  templatePath: string;         // Path to template file
  fileType: 'spec' | 'plan' | 'tasks';
  comparisonMode: 'structure' | 'content' | 'full';
}
```

### Comparison Modes

- **structure**: Compare only section headers and hierarchy (ignores content)
- **content**: Compare content completeness (checks for placeholders, empty sections)
- **full**: Both structure and content comparison

### Example Input

```json
{
  "actualFilePath": "/Users/nathan/git/github.com/nprbst/speck-005-speck-skill/specs/005-speck-skill/spec.md",
  "templatePath": ".specify/templates/spec-template.md",
  "fileType": "spec",
  "comparisonMode": "full"
}
```

---

## Output Schema

```typescript
interface TemplateComparisonResult {
  overallStatus: 'matches' | 'partial' | 'mismatch';
  structureScore: number;      // 0-100 percentage match
  contentScore: number;        // 0-100 percentage completeness
  missingSections: SectionDiff[];
  extraSections: SectionDiff[];
  outOfOrderSections: SectionDiff[];
  incompleteSections: SectionDiff[];
  summary: string;
  recommendations: string[];
}

interface SectionDiff {
  sectionName: string;
  expectedLevel: number;       // H2, H3, etc.
  actualLevel?: number;        // If section exists but wrong level
  mandatory: boolean;
  location: 'missing' | 'wrong_level' | 'wrong_order' | 'empty';
  expectedPosition: number;    // Index in template
  actualPosition?: number;     // Index in actual file (if found)
  message: string;
}
```

---

## Comparison Logic

### Phase 1: Load and Parse Both Files

```typescript
function loadFiles(actualPath: string, templatePath: string): ParsedFiles {
  const actualContent = fs.readFileSync(actualPath, 'utf8');
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  const actualSections = extractSections(actualContent);
  const templateSections = extractSections(templateContent);

  // Mark mandatory sections from template
  const mandatorySections = templateSections.filter(s => s.mandatory);

  return { actualSections, templateSections, mandatorySections };
}
```

---

### Phase 2: Structural Comparison

```typescript
function compareStructure(
  actual: Section[],
  template: Section[]
): StructuralDiff {
  const missingSections: SectionDiff[] = [];
  const extraSections: SectionDiff[] = [];
  const outOfOrderSections: SectionDiff[] = [];
  const wrongLevelSections: SectionDiff[] = [];

  // Check for missing mandatory sections
  for (let i = 0; i < template.length; i++) {
    const expectedSection = template[i];
    const actualSection = findMatchingSection(actual, expectedSection.title);

    if (!actualSection) {
      missingSections.push({
        sectionName: expectedSection.title,
        expectedLevel: expectedSection.level,
        mandatory: expectedSection.mandatory,
        location: 'missing',
        expectedPosition: i,
        message: `Missing: ${expectedSection.title}`
      });
    } else {
      // Check if level matches
      if (actualSection.level !== expectedSection.level) {
        wrongLevelSections.push({
          sectionName: expectedSection.title,
          expectedLevel: expectedSection.level,
          actualLevel: actualSection.level,
          mandatory: expectedSection.mandatory,
          location: 'wrong_level',
          expectedPosition: i,
          actualPosition: actualSection.index,
          message: `Expected H${expectedSection.level}, found H${actualSection.level}`
        });
      }

      // Check if order matches
      if (actualSection.index !== i) {
        outOfOrderSections.push({
          sectionName: expectedSection.title,
          expectedLevel: expectedSection.level,
          actualLevel: actualSection.level,
          mandatory: expectedSection.mandatory,
          location: 'wrong_order',
          expectedPosition: i,
          actualPosition: actualSection.index,
          message: `Expected at position ${i}, found at position ${actualSection.index}`
        });
      }
    }
  }

  // Check for extra sections not in template
  for (const actualSection of actual) {
    if (!findMatchingSection(template, actualSection.title)) {
      extraSections.push({
        sectionName: actualSection.title,
        expectedLevel: actualSection.level,
        actualLevel: actualSection.level,
        mandatory: false,
        location: 'extra',
        actualPosition: actualSection.index,
        message: `Extra section not in template: ${actualSection.title}`
      });
    }
  }

  return { missingSections, extraSections, outOfOrderSections, wrongLevelSections };
}
```

---

### Phase 3: Content Completeness Check

```typescript
function checkContentCompleteness(
  actual: Section[],
  template: Section[]
): ContentDiff {
  const incompleteSections: SectionDiff[] = [];

  for (const actualSection of actual) {
    // Check if section is empty
    if (!actualSection.content || actualSection.content.trim() === '') {
      incompleteSections.push({
        sectionName: actualSection.title,
        expectedLevel: actualSection.level,
        actualLevel: actualSection.level,
        mandatory: isMandatory(template, actualSection.title),
        location: 'empty',
        actualPosition: actualSection.index,
        message: `Section exists but has no content`
      });
      continue;
    }

    // Check for placeholder markers
    if (hasPlaceholders(actualSection.content)) {
      incompleteSections.push({
        sectionName: actualSection.title,
        expectedLevel: actualSection.level,
        actualLevel: actualSection.level,
        mandatory: isMandatory(template, actualSection.title),
        location: 'incomplete',
        actualPosition: actualSection.index,
        message: `Section contains placeholders: ${extractPlaceholders(actualSection.content).join(', ')}`
      });
    }
  }

  return { incompleteSections };
}

function hasPlaceholders(content: string): boolean {
  return /\[FEATURE\]|\[DATE\]|\[###-feature-name\]|TODO|FIXME|\[NEEDS CLARIFICATION\]/.test(content);
}
```

---

### Phase 4: Calculate Scores

```typescript
function calculateScores(
  template: Section[],
  diff: StructuralDiff,
  contentDiff: ContentDiff
): Scores {
  const totalSections = template.length;
  const missingCount = diff.missingSections.length;
  const wrongLevelCount = diff.wrongLevelSections.length;
  const outOfOrderCount = diff.outOfOrderSections.length;

  // Structure score: penalize missing sections heavily, order less so
  const structureScore = Math.max(0,
    100 - (missingCount * 20) - (wrongLevelCount * 10) - (outOfOrderCount * 5)
  );

  // Content score: percentage of non-empty, non-placeholder sections
  const totalExpectedSections = template.length;
  const incompleteCount = contentDiff.incompleteSections.length;
  const contentScore = Math.max(0,
    ((totalExpectedSections - incompleteCount) / totalExpectedSections) * 100
  );

  return { structureScore, contentScore };
}
```

---

### Phase 5: Generate Summary and Recommendations

```typescript
function generateSummary(result: TemplateComparisonResult): void {
  if (result.structureScore === 100 && result.contentScore === 100) {
    result.overallStatus = 'matches';
    result.summary = 'File structure and content fully match the template';
    result.recommendations = ['Spec is complete and ready for review'];
    return;
  }

  if (result.structureScore >= 80) {
    result.overallStatus = 'partial';
    result.summary = 'File mostly matches template with minor issues';
  } else {
    result.overallStatus = 'mismatch';
    result.summary = 'File has significant structural differences from template';
  }

  // Generate specific recommendations
  const recommendations: string[] = [];

  if (result.missingSections.length > 0) {
    const mandatoryMissing = result.missingSections.filter(s => s.mandatory);
    if (mandatoryMissing.length > 0) {
      recommendations.push(
        `Add missing mandatory sections: ${mandatoryMissing.map(s => s.sectionName).join(', ')}`
      );
    }
  }

  if (result.outOfOrderSections.length > 0) {
    recommendations.push(
      `Reorder sections to match template: ${result.outOfOrderSections.map(s => s.sectionName).join(', ')}`
    );
  }

  if (result.wrongLevelSections.length > 0) {
    recommendations.push(
      `Fix heading levels: ${result.wrongLevelSections.map(s =>
        `${s.sectionName} should be H${s.expectedLevel} not H${s.actualLevel}`
      ).join('; ')}`
    );
  }

  if (result.incompleteSections.length > 0) {
    recommendations.push(
      `Fill in content for: ${result.incompleteSections.map(s => s.sectionName).join(', ')}`
    );
  }

  result.recommendations = recommendations;
}
```

---

## Example Outputs

### Example 1: Complete Match

**Scenario**: spec.md perfectly follows spec-template.md

**Output**:
```json
{
  "overallStatus": "matches",
  "structureScore": 100,
  "contentScore": 100,
  "missingSections": [],
  "extraSections": [],
  "outOfOrderSections": [],
  "incompleteSections": [],
  "summary": "File structure and content fully match the template",
  "recommendations": ["Spec is complete and ready for review"]
}
```

---

### Example 2: Missing Mandatory Section

**Scenario**: spec.md missing "Success Criteria" section

**Output**:
```json
{
  "overallStatus": "mismatch",
  "structureScore": 60,
  "contentScore": 80,
  "missingSections": [{
    "sectionName": "Success Criteria",
    "expectedLevel": 2,
    "mandatory": true,
    "location": "missing",
    "expectedPosition": 3,
    "message": "Missing: Success Criteria"
  }],
  "extraSections": [],
  "outOfOrderSections": [],
  "incompleteSections": [],
  "summary": "File has significant structural differences from template",
  "recommendations": [
    "Add missing mandatory sections: Success Criteria"
  ]
}
```

---

### Example 3: Wrong Section Order

**Scenario**: spec.md has "Requirements" before "User Scenarios & Testing"

**Output**:
```json
{
  "overallStatus": "partial",
  "structureScore": 85,
  "contentScore": 100,
  "missingSections": [],
  "extraSections": [],
  "outOfOrderSections": [
    {
      "sectionName": "Requirements",
      "expectedLevel": 2,
      "actualLevel": 2,
      "mandatory": true,
      "location": "wrong_order",
      "expectedPosition": 2,
      "actualPosition": 1,
      "message": "Expected at position 2, found at position 1"
    },
    {
      "sectionName": "User Scenarios & Testing",
      "expectedLevel": 2,
      "actualLevel": 2,
      "mandatory": true,
      "location": "wrong_order",
      "expectedPosition": 1,
      "actualPosition": 2,
      "message": "Expected at position 1, found at position 2"
    }
  ],
  "incompleteSections": [],
  "summary": "File mostly matches template with minor issues",
  "recommendations": [
    "Reorder sections to match template: Requirements, User Scenarios & Testing"
  ]
}
```

---

### Example 4: Incomplete Content (Placeholders)

**Scenario**: spec.md has all sections but some contain [FEATURE] placeholders

**Output**:
```json
{
  "overallStatus": "partial",
  "structureScore": 100,
  "contentScore": 75,
  "missingSections": [],
  "extraSections": [],
  "outOfOrderSections": [],
  "incompleteSections": [
    {
      "sectionName": "User Scenarios & Testing",
      "expectedLevel": 2,
      "actualLevel": 2,
      "mandatory": true,
      "location": "incomplete",
      "actualPosition": 1,
      "message": "Section contains placeholders: [FEATURE], TODO"
    }
  ],
  "summary": "File mostly matches template with minor issues",
  "recommendations": [
    "Fill in content for: User Scenarios & Testing"
  ]
}
```

---

### Example 5: Extra Non-Template Section

**Scenario**: spec.md includes a "Security Considerations" section not in template

**Output**:
```json
{
  "overallStatus": "matches",
  "structureScore": 100,
  "contentScore": 100,
  "missingSections": [],
  "extraSections": [{
    "sectionName": "Security Considerations",
    "expectedLevel": 2,
    "actualLevel": 2,
    "mandatory": false,
    "location": "extra",
    "actualPosition": 5,
    "message": "Extra section not in template: Security Considerations"
  }],
  "outOfOrderSections": [],
  "incompleteSections": [],
  "summary": "File structure and content fully match the template (with extra sections)",
  "recommendations": [
    "Extra section 'Security Considerations' is allowed but not part of standard template"
  ]
}
```

---

## Acceptance Criteria

1. ✅ Skill identifies missing mandatory sections with 100% accuracy
2. ✅ Skill detects extra sections not in template
3. ✅ Skill identifies out-of-order sections and their expected positions
4. ✅ Skill detects wrong heading levels (e.g., H3 when H2 expected)
5. ✅ Skill identifies empty sections (header present but no content)
6. ✅ Skill detects placeholder markers ([FEATURE], TODO, [NEEDS CLARIFICATION])
7. ✅ Skill calculates accurate structure and content scores
8. ✅ Skill generates actionable recommendations for each type of mismatch
9. ✅ Skill distinguishes between mandatory and optional section mismatches
10. ✅ Skill provides clear summary of overall match status

---

## Notes

- **Fuzzy matching**: Section titles are matched with tolerance for minor variations (extra spaces, punctuation, capitalization)
- **Extra sections allowed**: Having extra sections beyond the template is not penalized in structure score (may be feature-specific additions)
- **Placeholder detection**: Common placeholder patterns are detected to identify incomplete content
- **Order matters**: Template defines canonical section order; deviation is reported but less severely penalized than missing sections
- **Non-destructive**: Comparison is read-only; skill never modifies files to "fix" structure
