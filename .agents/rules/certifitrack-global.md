# CERTIFITRACK — GLOBAL EXPERT ORCHESTRATION & ASSET SAFETY RULE

This is a GLOBAL project rule. The agent must automatically inspect the task, repository state, and available expert skills before acting. The user should NOT have to repeatedly name skills.

## 1. AUTOMATIC SKILL SELECTION
For EVERY CertifiTrack task:
1. Identify the task domains.
2. Inspect available expert skills.
3. Automatically activate ALL materially relevant skills.
4. Combine their expertise before making changes.
5. Do not artificially limit the number of relevant skills.

Examples:
VISUAL / BRAND task: visual-design-foundations, design-systems, design-dna, frontend-ui-engineering, typography / color / accessibility skills when available
BACKEND: backend architecture, TypeScript, security, testing, LLM engineering
SEO: SEO, content strategy, accessibility, performance
RELEASE: code review, security, repository hygiene, testing, documentation

## 2. PROJECT CONTEXT FIRST
Before changing anything:
- inspect the existing project
- inspect current architecture
- inspect relevant assets
- inspect existing design tokens
- inspect existing approved assets
- inspect previous decisions
- inspect current Git changes
Do NOT begin implementation immediately.

## 3. APPROVED ASSET PROTECTION
Any asset explicitly approved by the user becomes LOCKED.
Examples: selected logo, selected favicon, approved tracker visual, approved transformation visual, approved brand colors, approved typography, approved README assets
LOCKED assets MUST NOT be:
- redesigned
- replaced
- regenerated
- renamed
- deleted
unless the user explicitly requests a replacement.
If a better alternative is discovered: PROPOSE it first. Do not silently replace the approved asset.

## 4. EXISTING ASSET FIRST
Before generating a new asset:
1. Search the repository for an existing suitable asset.
2. Search Git history / exploration folders if necessary.
3. Reuse the best existing asset if appropriate.
4. Only generate a new asset when there is no suitable approved asset.
Do not recreate assets that already exist.

## 5. NEVER CONFUSE EXPLORATION WITH IMPLEMENTATION
When the user asks for "variations", "options", "concepts", "exploration", "show me alternatives":
ONLY generate isolated exploration assets.
DO NOT: edit global.css, replace production assets, modify homepage, modify navbar, alter favicon, alter logo, rewrite README, change backend.
The user must explicitly select the preferred option before implementation.

## 6. DESIGN EXPLORATION QUALITY
For visual exploration:
Do not generate many superficial recolors.
Variants must differ in meaningful design dimensions: typography, composition, hierarchy, materiality, spacing, color relationships, background treatment, artifact treatment, visual rhythm.
Each variant must be production-plausible. Reject mediocre variants internally instead of presenting filler.

## 7. VISUAL QA BEFORE CLAIMING SUCCESS
Source code inspection is NOT enough.
For visual work: render the asset, inspect it at intended size, inspect light/dark context, inspect favicon at 16/32/48px when relevant, inspect README at realistic GitHub width, inspect mobile where relevant.
Only then report PASS.

## 8. BRAND CONSISTENCY
Before any visual modification verify: logo, favicon, wordmark, typography, color palette, spacing, background system, component language.
All should belong to the same design system. Do not let one asset drift into another style.

## 9. REPOSITORY HYGIENE
Before release: remove framework-default assets that are no longer used, verify favicon, verify OG image, verify robots/sitemap, verify image references, remove unused Astro starter assets, verify no local machine paths, verify no secrets, verify no duplicate competing logos.
If favicon.ico contains an Astro starter icon and is no longer intended, explicitly flag and remove/replace it.

## 10. PRODUCT-LEVEL DECISION MAKING
The agent should optimize for the project's actual needs, not merely satisfy the literal instruction.
When several technically valid options exist choose the one that best fits: current product, target audience, existing design system, user-approved aesthetic, maintainability, accessibility, consistency, trust.
Explain significant tradeoffs only when necessary.

## 11. DO NOT OVER-PLAN
Do not generate a planning document for every small task.
If requirements are clear: inspect → execute → verify.
Only ask a question when a genuine decision is required from the user.

## 12. CHANGE SCOPE
Keep modifications scoped to the task.
Do not opportunistically redesign unrelated files.
Do not touch unrelated functionality.

## 13. FINAL RESPONSE
Report: what changed, what was preserved, tests/verification, any blockers.
Never claim a visual asset is "premium", "final", or "perfect" based only on source inspection.

## 14. CERTIFITRACK-SPECIFIC PRIORITY
Current project priorities:
1. Preserve Concept 8 brand identity.
2. Preserve approved product assets.
3. Maintain dark-first but sophisticated visual system.
4. Avoid generic AI/SaaS aesthetics.
5. Prefer restrained typography and deliberate color theory.
6. Keep repository presentation professional.
7. Keep local-first / BYO-API architecture intact.
8. Do not reintroduce SaaS/payment assumptions.
