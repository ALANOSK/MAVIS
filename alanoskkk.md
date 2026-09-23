Enhance the existing MAVIS Diagnostic Breaker Panel by adding a new read-only export function:

EXPORT MAVIS REVIEW BUNDLE

Do not replace or remove the existing:

- GENERATE QA REPORT
- Code tab
- Workflow tab
- Bug Check tab
- Sync & Update tab
- Documentation tab
- RESET ENTIRE SYSTEM DATABASE

Do not modify any existing operational, manifest, APB, flight, historical, sales, revenue, role, permission, IndexedDB, routing, or dashboard logic.

The new feature must only READ, ANALYZE, DOCUMENT, SANITIZE, PACKAGE, and EXPORT existing system information.

==================================================
1. ONE-CLICK REVIEW BUNDLE EXPORT
==================================================

Add a new button inside the MAVIS Diagnostic Breaker Panel:

EXPORT MAVIS REVIEW BUNDLE

Keep it visually separate from:

RESET ENTIRE SYSTEM DATABASE

When clicked:

1. Read the latest static architecture baseline.
2. Run the latest available runtime diagnostics.
3. Refresh the QA result.
4. Generate all architecture, workflow, data-lineage, runtime, and UI metadata.
5. Sanitize sensitive information.
6. Compile the MAVIS Master Review.
7. Package everything into one ZIP.
8. Automatically download exactly one ZIP file.

Output:

MAVIS_REVIEW_BUNDLE_<timestamp>.zip

Use one shared timestamp for the entire bundle.

Do not trigger multiple browser downloads.

==================================================
2. REQUIRED ZIP STRUCTURE
==================================================

Generate:

MAVIS_REVIEW_BUNDLE_<timestamp>.zip
│
├── README_INDEX.txt
├── MAVIS_MASTER_REVIEW.txt
│
├── 01_QA/
│   ├── QA_README.txt
│   └── QA_DATA.json
│
├── 02_ARCHITECTURE/
│   ├── PROJECT_STRUCTURE.txt
│   ├── ROUTE_MAP.json
│   ├── ROLE_MATRIX.json
│   ├── WORKFLOW_MAP.json
│   └── DATA_LINEAGE.json
│
├── 03_SOURCE_MANIFEST/
│   ├── FILE_LIST.txt
│   ├── COMPONENT_MAP.json
│   └── DEPENDENCY_MAP.json
│
├── 04_RUNTIME/
│   ├── FLIGHT_SNAPSHOT.json
│   ├── MANIFEST_SNAPSHOT.json
│   ├── APB_SNAPSHOT.json
│   └── REVENUE_SNAPSHOT.json
│
└── 05_UI/
    ├── SCREEN_INDEX.json
    ├── UI_COMPONENT_MAP.json
    └── screenshots/

The screenshots folder may remain empty when automatic visual capture is not technically available.

Do not fabricate screenshots.

Mark screenshot capture status as:

AVAILABLE
NOT_AVAILABLE
NOT_TESTED

==================================================
3. README_INDEX.TXT
==================================================

Create a simple index explaining:

- What MAVIS Review Bundle is.
- Generation date/time.
- Application version.
- Build ID.
- Current environment.
- Current role.
- What each folder contains.
- What information is static.
- What information comes from runtime.
- What could not be inspected.
- Security/sanitization notice.

The purpose is to let another developer, reviewer, or AI understand how to read the bundle.

==================================================
4. MAVIS MASTER REVIEW
==================================================

Generate:

MAVIS_MASTER_REVIEW.txt

This must provide an overall system review in simple but technically useful language.

Include:

1. What MAVIS is and the purpose of the system
2. Frontend architecture
3. Data and storage architecture
4. All roles and responsibilities
5. End-to-end system workflow
6. Flight lifecycle
7. Manifest lifecycle
8. APB lifecycle
9. Sales & Revenue lifecycle
10. Historical data lifecycle

11. Cross-role data synchronization
12. Source-of-truth analysis
13. Redundant logic
14. Potentially conflicting logic
15. Data-integrity risks
16. Security and permission review

17. UI/UX review per role
18. Layout consistency
19. Information hierarchy
20. Dashboard readability
21. Navigation efficiency
22. Responsive behavior

23. Features that are working well
24. Features that may be unnecessary or inefficient
25. Missing functionality
26. Simplification opportunities
27. Suggested new functions

28. Priority improvements:

P0 CRITICAL
P1 IMPORTANT
P2 ENHANCEMENT
P3 NICE TO HAVE

29. Recommended MAVIS architecture
30. Recommended development roadmap

Every conclusion must clearly indicate whether it is:

- VERIFIED
- OBSERVED
- INFERRED
- NOT_TESTED
- NOT_AVAILABLE

Do not present assumptions as verified facts.

==================================================
5. QA FOLDER
==================================================

Reuse the existing QA system.

Do not create a second independent QA calculation engine.

Generate:

01_QA/QA_DATA.json
01_QA/QA_README.txt

Both must come from the existing single-source-of-truth QA result.

Ensure:

QA_DATA.json
→ source of truth

QA_DATA.json
→ compiled into QA_README.txt

Do not compute statuses independently.

==================================================
6. ARCHITECTURE — PROJECT STRUCTURE
==================================================

Generate:

02_ARCHITECTURE/PROJECT_STRUCTURE.txt

Include the relevant application structure such as:

src/
components/
qa/
lib/
scripts/
public/

Show:

- Directory
- File/module name
- Purpose
- Main responsibility

Do not include node_modules.

Do not dump complete source-code contents.

==================================================
7. ROUTE MAP
==================================================

Generate:

02_ARCHITECTURE/ROUTE_MAP.json

For each route include:

{
  "route": "",
  "page": "",
  "component": "",
  "allowedRoles": [],
  "guardType": "",
  "parentNavigation": "",
  "dataSources": [],
  "status": ""
}

Include all technically detectable application routes.

==================================================
8. ROLE MATRIX
==================================================

Generate:

02_ARCHITECTURE/ROLE_MATRIX.json

For every role include:

- Role ID
- Role name
- Pages available
- Routes available
- Read permissions
- Write permissions
- Approval permissions
- Restricted functions
- Related workflows
- Source-of-truth data
- Known risks

Include at minimum existing roles such as:

- Guest
- Flight Operations
- Flight Attendant
- Manifest Station
- Manifest HQ

Include future Finance/Accounting only if it actually exists.

Otherwise mark:

PLANNED / NOT_IMPLEMENTED

==================================================
9. WORKFLOW MAP
==================================================

Generate:

02_ARCHITECTURE/WORKFLOW_MAP.json

Document workflows chronologically.

Include:

Application Initialization
→ Authentication / Role Selection
→ Flight Loading
→ Flight Operations
→ Passenger Processing
→ Check-in
→ Boarding
→ Flight Movement
→ Flight Attendant
→ Manifest Station
→ APB
→ Manifest HQ
→ Flight Completion
→ Historical Retention
→ Operational Dashboard
→ Sales & Revenue
→ Revenue Reconciliation
→ Reporting

For every workflow include:

- workflowId
- name
- trigger
- input
- sourceOfTruth
- steps
- decisionPoints
- modules
- storage
- formulas
- output
- nextWorkflow
- failurePoints
- QAStatus

==================================================
10. DATA LINEAGE
==================================================

Generate:

02_ARCHITECTURE/DATA_LINEAGE.json

Trace important data from creation to final output.

Include:

Flight ID
Flight Number
Flight Date
Flight Time
Origin
Destination
Aircraft Registration
Aircraft Capacity
Movement Status

Sales Pax
Checked-in Pax
Boarded Pax
Final Manifest Pax
Offload Pax
No-show Pax

APB ID
APB Status
Station Review
HQ Approval

Gross Sales
Flown Revenue
Held Revenue
Refunded Amount
Rebooked Revenue
No-show Recognized Revenue

For every field document:

- Origin
- Source module
- Storage
- Transformation
- Formula if applicable
- Components consuming it
- Dashboard consuming it
- Final output
- Validation
- Known risks

==================================================
11. SOURCE MANIFEST
==================================================

Generate:

03_SOURCE_MANIFEST/FILE_LIST.txt

List relevant source files with:

- Path
- Purpose
- Category
- Related workflows

Do not export complete source-code contents.

==================================================
12. COMPONENT MAP
==================================================

Generate:

03_SOURCE_MANIFEST/COMPONENT_MAP.json

For every relevant component include:

- Component name
- File
- Purpose
- Parent
- Child components
- Props
- State dependencies
- Data sources
- Related roles
- Related routes
- Related workflows

This should make the frontend architecture understandable without exposing full source code.

==================================================
13. DEPENDENCY MAP
==================================================

Generate:

03_SOURCE_MANIFEST/DEPENDENCY_MAP.json

Include:

- Internal module dependencies
- Component relationships
- Helper/service relationships
- Database dependencies
- QA dependencies
- Important third-party packages

Example:

ManifestHQPage
→ HQHistoricalDashboard
→ HQSalesRevenueDashboard
→ APBAuditTimeline
→ IndexedDB flight data

Do not include irrelevant node_modules internals.

==================================================
14. FLIGHT RUNTIME SNAPSHOT
==================================================

Generate:

04_RUNTIME/FLIGHT_SNAPSHOT.json

Use current runtime data.

Include sanitized:

- Flight ID
- Flight Number
- Flight Date
- Origin
- Destination
- Aircraft
- Capacity
- Movement Status
- Delay
- Sales Pax
- Check-in Pax
- Boarded Pax
- Final Manifest Pax
- APB reference
- Relevant QA flags

Do not include:

- PIN hashes
- Secrets
- unnecessary employee credentials

==================================================
15. MANIFEST SNAPSHOT
==================================================

Generate:

04_RUNTIME/MANIFEST_SNAPSHOT.json

Include:

- Flight
- Sales total
- Check-in total
- Boarding total
- Final manifest
- No-show
- Offload
- Passenger variance
- Manifest variance
- APB status
- Station review
- HQ status
- Reconciliation status

Use the actual current manifest logic.

Do not create independent fake totals.

==================================================
16. APB SNAPSHOT
==================================================

Generate:

04_RUNTIME/APB_SNAPSHOT.json

Include existing APB data such as:

- APB ID
- Flight ID
- Status
- Submission status
- Station verification
- HQ verification
- Seal status
- Notes count
- Timeline count

If no APB currently exists:

Return:

{
  "status": "NOT_AVAILABLE",
  "reason": "No APB records exist in the current runtime dataset."
}

Do not fabricate APBs.

==================================================
17. REVENUE SNAPSHOT
==================================================

Generate:

04_RUNTIME/REVENUE_SNAPSHOT.json

Use the existing Sales & Revenue logic.

Include where technically available:

- Flight
- Aircraft Registration
- Route
- Fare Class
- Sales Pax
- Final Manifest Pax
- Gross Sales
- Flown Revenue
- Held Revenue
- Refunded Amount
- Rebooked Revenue
- No-show Recognized Revenue
- Revenue Variance
- Load Factor
- Reconciliation Status

All revenue figures must remain linked to their existing flight/manifest source.

Do not modify revenue calculations.

==================================================
18. UI SCREEN INDEX
==================================================

Generate:

05_UI/SCREEN_INDEX.json

Document every detectable screen.

Include:

- screenId
- route
- role
- title
- primaryComponent
- navigationSource
- majorCards
- tables
- charts
- filters
- modals
- responsiveNotes
- knownLayoutIssues
- screenshotFile

Example:

{
  "screenId": "MANIFEST_HQ_OPERATIONAL",
  "route": "/manifest-hq",
  "role": "MANIFEST_HQ",
  "primaryComponent": "ManifestHQPage",
  "screenshotFile": null,
  "screenshotStatus": "NOT_AVAILABLE"
}

==================================================
19. UI COMPONENT MAP
==================================================

Generate:

05_UI/UI_COMPONENT_MAP.json

Describe visual hierarchy:

Page
→ Header
→ Navigation
→ Cards
→ Filters
→ Charts
→ Tables
→ Modals
→ Footer

Include relevant CSS/Tailwind layout characteristics where detectable:

- flex/grid
- overflow
- responsive breakpoint usage
- fixed/sticky positioning
- z-index relationships
- scroll containment

This is documentation only.

Do not redesign the UI during export.

==================================================
20. OPTIONAL SCREENSHOTS
==================================================

If the current development environment already supports safe automatic screenshot capture, screenshots may be added to:

05_UI/screenshots/

Prefer screenshots for major pages:

- Radar
- Flight Operational Desk
- Flight Attendant Portal
- Manifest Station
- Manifest HQ
- Dashboard All Operational
- Dashboard Sales & Revenue
- MAVIS Breaker Panel

Do NOT add a heavy screenshot dependency solely for this export unless necessary.

If screenshot capture is unavailable, keep SCREEN_INDEX.json and mark screenshots:

NOT_AVAILABLE

The rest of the bundle must still generate successfully.

==================================================
21. STATIC + RUNTIME ARCHITECTURE
==================================================

Use two layers.

BUILD-TIME STATIC ANALYZER:

Generate architecture information that cannot safely be discovered by the production browser.

Examples:

- project structure
- source-file list
- dependency map
- component map
- route definitions
- workflow documentation

Store a sanitized architecture baseline, for example:

public/mavis-review-baseline.json

RUNTIME EXPORTER:

Use current application state for:

- flights
- manifest
- APB
- revenue
- current role
- QA status
- runtime warnings

Combine static baseline + runtime state when generating the bundle.

Do not allow the production browser to arbitrarily read source files from disk.

==================================================
22. SANITIZATION
==================================================

Before packaging the bundle, remove:

- passwords
- PINs
- PIN hashes
- syntheticPinHash
- authentication tokens
- API keys
- environment secrets
- database credentials
- authentication headers
- full real passenger names
- full PNR values
- unnecessary raw source code

Mask sensitive examples.

==================================================
23. EXPORT SAFETY
==================================================

EXPORT MAVIS REVIEW BUNDLE must be strictly read-only.

It must NEVER:

- reset IndexedDB
- delete records
- mutate flights
- mutate passenger totals
- change movement status
- create APBs
- approve APBs
- change manifest state
- modify revenue
- change roles
- navigate the user automatically
- trigger the operational simulator

Keep the handler completely separate from:

RESET ENTIRE SYSTEM DATABASE

==================================================
24. BUTTON STATES
==================================================

Use:

EXPORT MAVIS REVIEW BUNDLE
→ READING ARCHITECTURE...
→ RUNNING QA...
→ CAPTURING RUNTIME...
→ BUILDING DOCUMENTATION...
→ SANITIZING...
→ PACKAGING BUNDLE...
→ DOWNLOADED

On failure:

REVIEW EXPORT FAILED

Do not generate a misleading partial bundle unless explicitly marked:

PARTIAL_EXPORT

==================================================
25. IMPLEMENTATION SEPARATION
==================================================

Reuse the existing QA infrastructure where possible.

Recommended modules:

scripts/generateMavisReviewBaseline.ts

src/review/
  mavisReviewBuilder.ts
  architectureExporter.ts
  workflowExporter.ts
  dataLineageExporter.ts
  sourceManifestExporter.ts
  runtimeSnapshotExporter.ts
  uiManifestExporter.ts
  masterReviewCompiler.ts
  reviewBundleSanitizer.ts
  mavisReviewZipExporter.ts

Do not place the complete export logic inside App.tsx or the Breaker Panel component.

==================================================
26. VALIDATION
==================================================

Test:

- One click produces exactly one ZIP
- ZIP structure is complete
- README_INDEX exists
- MAVIS_MASTER_REVIEW exists
- QA JSON/TXT exist
- Architecture files exist
- Runtime snapshots exist
- UI manifest exists
- JSON files parse successfully
- Static and runtime timestamps are documented
- Current build ID is included
- No source-code dump exists
- No PIN hashes exist
- No secrets exist
- No unmasked PNR exists
- Missing APB handled correctly
- Missing revenue handled correctly
- Missing screenshot capability handled correctly
- Existing QA export still works
- Existing Breaker tabs still work
- Reset database remains independent
- Production build passes
- Type-check passes
- Lint passes

==================================================
27. FINAL IMPLEMENTATION REPORT
==================================================

After implementation return only a concise report containing:

- Files created
- Files modified
- Static baseline method
- Runtime snapshot method
- Bundle structure
- Master Review method
- Security sanitization
- Screenshot capability status
- Tests completed
- Build result
- Type-check result
- Lint result
- Remaining limitations

Do not modify unrelated application logic.
Do not redesign MAVIS.
Do not automatically apply recommendations found by the review system.



MAVIS_REVIEW_BUNDLE_<timestamp>.zip
│
├── README_INDEX.txt
├── MAVIS_MASTER_REVIEW.txt
│
├── 01_QA/
│   ├── QA_README.txt
│   └── QA_DATA.json
│
├── 02_ARCHITECTURE/
│   ├── PROJECT_STRUCTURE.txt
│   ├── ROUTE_MAP.json
│   ├── ROLE_MATRIX.json
│   ├── WORKFLOW_MAP.json
│   └── DATA_LINEAGE.json
│
├── 03_SOURCE_MANIFEST/
│   ├── FILE_LIST.txt
│   ├── COMPONENT_MAP.json
│   └── DEPENDENCY_MAP.json
│
├── 04_RUNTIME/
│   ├── FLIGHT_SNAPSHOT.json
│   ├── MANIFEST_SNAPSHOT.json
│   ├── APB_SNAPSHOT.json
│   └── REVENUE_SNAPSHOT.json
│
└── 05_UI/
    ├── SCREEN_INDEX.json
    ├── UI_COMPONENT_MAP.json
    └── screenshots/   (only when technically available)