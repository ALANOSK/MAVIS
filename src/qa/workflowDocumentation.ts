/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorkflowDoc {
  id: number;
  name: string;
  purpose: string;
  trigger: string;
  sourceOfTruth: string;
  mainSteps: string[];
  decisionPoints: string[];
  relatedModules: string[];
  storageInteraction: string;
  calculations: string;
  output: string;
  failurePoints: string[];
  qaStatus: 'PASS' | 'WARNING' | 'NOT_TESTED' | 'NOT_AVAILABLE';
}

export const workflowsList: WorkflowDoc[] = [
  {
    id: 1,
    name: 'Application Initialization',
    purpose: 'Bootstraps client cache, synchronizes session configurations, and seeds local repositories.',
    trigger: 'Initial browser tab or window document load event.',
    sourceOfTruth: 'package.json config, local DB schemas, and initial static JSON datasets.',
    mainSteps: [
      'Load system stylesheets and Vite build configurations.',
      'Initialize IndexedDB connections for "flights" and "apbs" stores.',
      'Check local storage for active theme settings and current active station.'
    ],
    decisionPoints: [
      'If IndexedDB stores are empty, trigger primary data seeding sequence.',
      'If active session role exists, restore view state; otherwise, route to Radar guest page.'
    ],
    relatedModules: ['App.tsx', 'main.tsx', 'db.ts', 'data.ts'],
    storageInteraction: 'Read localStorage config, connect and query IndexedDB.',
    calculations: 'None',
    output: 'Rendered Radar Page with loaded flight data, active theme, and ready state.',
    failurePoints: [
      'IndexedDB permission blockages in incognito browsers.',
      'Vite bundle corruption during asset parsing.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 2,
    name: 'Login or Role Selection',
    purpose: 'Grants role-based access tokens to corresponding station and audit operators.',
    trigger: 'User selects a role on the Quick Access Panel or App Header login portal.',
    sourceOfTruth: 'LocalStorage state and SYNTHETIC_EMPLOYEES collection from data.ts.',
    mainSteps: [
      'Render the role login panel containing employee selector dropdown.',
      'Retrieve employee PIN hashes and match against user numeric entry.',
      'On successful validation, save active role to LocalStorage.'
    ],
    decisionPoints: [
      'Check if credentials match corresponding synthetic records.',
      'Evaluate if the role possesses authorization flags for the requested operations.'
    ],
    relatedModules: ['App.tsx', 'QuickAccessPanel.tsx', 'data.ts'],
    storageInteraction: 'Write active role to LocalStorage.',
    calculations: 'PIN verification checks.',
    output: 'Updated application role state, granting screen navigation privileges.',
    failurePoints: [
      'Incorrect PIN hashes stored in browser cache.',
      'Local state desynchronization.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 3,
    name: 'Route and Permission Validation',
    purpose: 'Secures application routes by blocking unauthorized guest or staff transitions.',
    trigger: 'Current route state changes or screen re-render.',
    sourceOfTruth: 'Active role state in App.tsx memory.',
    mainSteps: [
      'Inspect the path prefix of the destination route.',
      'Match path constraints against current role rights.',
      'Redirect unauthorized paths back to the guest Flight Radar page.'
    ],
    decisionPoints: [
      'Is user carrying FLIGHT_OPERATIONS role for /flight-operations path?',
      'Is user carrying MANIFEST_HQ role for /hq-sales-revenue path?'
    ],
    relatedModules: ['App.tsx', 'AppHeader.tsx'],
    storageInteraction: 'Read active role from local state.',
    calculations: 'Route-role matrix matches.',
    output: 'Approved layout rendering or instant redirect fallback.',
    failurePoints: [
      'Route bypass via direct memory state edits.',
      'Broken redirect loops.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 4,
    name: 'Flight Loading or Creation',
    purpose: 'Queries the persistent store for scheduled sectors or triggers scheduling overrides.',
    trigger: 'Initializing application state or dispatching a new leg.',
    sourceOfTruth: 'IndexedDB "flights" store.',
    mainSteps: [
      'Query the indexed database for all stored flights.',
      'Sort records chronologically by scheduled departure date and time.',
      'Expose query outputs to the main reactive state array.'
    ],
    decisionPoints: [
      'If query returns empty array, trigger automatic database seed fallback.',
      'If active filters are configured, slice matching sub-records.'
    ],
    relatedModules: ['App.tsx', 'db.ts'],
    storageInteraction: 'Query and read all records from IndexedDB "flights" store.',
    calculations: 'Date sorting and filter groupings.',
    output: 'Populated flights state in App.tsx memory.',
    failurePoints: [
      'Database lockups or transaction timeouts.',
      'Corrupt schema structures.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 5,
    name: 'Flight Operational Desk',
    purpose: 'Provides dispatch control, scheduling modifications, and active tracking tools.',
    trigger: 'Role FLIGHT_OPERATIONS navigates to /flight-operations.',
    sourceOfTruth: 'IndexedDB "flights" store and active React states.',
    mainSteps: [
      'Load active operational flight cards with search capabilities.',
      'Render ETA adjustments, departure times, and delay status selectors.',
      'Process manual dispatch confirmations, sealing flight schedule targets.'
    ],
    decisionPoints: [
      'Does flight belong to the logged operator station?',
      'Should delayed status triggers alert downstream APB preparation?'
    ],
    relatedModules: ['FlightOperationsPage.tsx', 'App.tsx'],
    storageInteraction: 'Read and update individual flight documents in IndexedDB.',
    calculations: 'Delay delta times.',
    output: 'Updated flight times, delay statuses, and terminal gate records.',
    failurePoints: [
      'Conflict overrides if multiple operators save simultaneously.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 6,
    name: 'Manifest Station',
    purpose: 'Compares real-time check-in and boarding manifest sheets with cabin-crew actual counts.',
    trigger: 'Role MANIFEST_STATION accesses station dashboard.',
    sourceOfTruth: 'IndexedDB "flights" and "apbs" stores.',
    mainSteps: [
      'Render passenger matching comparison grids.',
      'Trace discrepancies between booking systems, check-in gates, and final cabin reports.',
      'Record local station agent remarks and post discrepancy event timeline markers.'
    ],
    decisionPoints: [
      'Are physical counts fully balanced within tolerances?',
      'Should discrepancy flags block flight dispatch handovers?'
    ],
    relatedModules: ['ManifestStationPage.tsx', 'APBAuditTimeline.tsx'],
    storageInteraction: 'Read flights and APBs, write Station remarks.',
    calculations: 'Sales–Check-in, Gate No-show, and Manifest variances.',
    output: 'Logged timeline discrepancy incidents and approved station status flags.',
    failurePoints: [
      'Mismatched APB references causing orphan reports.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 7,
    name: 'Manifest HQ',
    purpose: 'Empowers HQ financial auditors to verify documents, seal reports, and lock data.',
    trigger: 'Role MANIFEST_HQ accesses the master auditing station.',
    sourceOfTruth: 'IndexedDB "flights" and "apbs" stores.',
    mainSteps: [
      'Display high-level operational ledgers with financial metrics.',
      'Review complete history of crew actions, station remarks, and audit timelines.',
      'Authorize "FINAL APPROVED" seals, locking flight documents from further edits.'
    ],
    decisionPoints: [
      'Do the discrepancies have adequate written operational justification?',
      'Is the flight in a valid status (STATION_CHECKED) to receive HQ approval?'
    ],
    relatedModules: ['ManifestHQPage.tsx', 'APBAuditTimeline.tsx'],
    storageInteraction: 'Write permanent "APPROVED" status seals into IndexedDB.',
    calculations: 'Load factors, discrepancy sums.',
    output: 'Locked flight record containing immutable audit marks.',
    failurePoints: [
      'Attempting to edit approved or sealed files.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 8,
    name: 'Passenger Processing',
    purpose: 'Manages individual booking, check-in, and boarding transitions.',
    trigger: 'Operational shift triggers or manual staff updates.',
    sourceOfTruth: 'Passenger breakdown fields inside the Flight model.',
    mainSteps: [
      'Process ticket holders clearing airport security gates.',
      'Update checked-in and boarded passenger class breakdowns.',
      'Verify infant, child, and adult distribution bounds.'
    ],
    decisionPoints: [
      'Does passenger group exceed physical seating capacity?',
      'Are infant quantities within safety configuration regulations?'
    ],
    relatedModules: ['PassengerCounter.tsx', 'App.tsx'],
    storageInteraction: 'Update passenger breakdown numbers in database document.',
    calculations: 'Aggregating class and age category sums.',
    output: 'Updated passenger statistics stored in flight document.',
    failurePoints: [
      'Negative counts entered through boundary bypass.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 9,
    name: 'Boarding and Movement Updates',
    purpose: 'Simulates boarding cards scans and tracks pushback movement progress.',
    trigger: 'Simulate 5-Min Shift click or schedule ticks.',
    sourceOfTruth: 'Flight operational movement status in database.',
    mainSteps: [
      'Advance flights from ARRIVED, BOARDING, DEPARTED, to IN_FLIGHT.',
      'Progress check-in numbers into boarded numbers.',
      'Inject operational timeline remarks into the APB report.'
    ],
    decisionPoints: [
      'If boarding is complete, trigger flight pushback sequences.',
      'Check if departure checklist passes all compliance gates.'
    ],
    relatedModules: ['App.tsx', 'FlightRadar.tsx'],
    storageInteraction: 'Save updated flight progress records.',
    calculations: 'Incremental passenger count escalations.',
    output: 'Real-time flights changing positions on map radar and schedules.',
    failurePoints: [
      'Halt state if background scheduler crashes.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 10,
    name: 'Flight Completion',
    purpose: 'Handles arrival gate check-offs and secures finalized manifest counts.',
    trigger: 'Flight reaches target destination coordinates.',
    sourceOfTruth: 'IndexedDB "flights" and "apbs" stores.',
    mainSteps: [
      'Update flight status to ARRIVED or COMPLETED.',
      'Seize manifest counts, locking active passenger modification buttons.',
      'Trigger downstream sales ledger and financial reporting compilation.'
    ],
    decisionPoints: [
      'Are final manifests identical to boarded gate counts?',
      'If not, flag discrepancy for HQ review.'
    ],
    relatedModules: ['App.tsx', 'ManifestStationPage.tsx'],
    storageInteraction: 'Save finalized flight status and counts.',
    calculations: 'None',
    output: 'Completed flight document awaiting audit approval.',
    failurePoints: [
      'Premature status locking before gate counts verify.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 11,
    name: 'Historical Retention',
    purpose: 'Archives approved logs into deep trend data caches.',
    trigger: 'Auditor approves deep archive operations.',
    sourceOfTruth: 'Historical collection array from historicalData.ts.',
    mainSteps: [
      'Read completed, approved flights from local state.',
      'Serialize records into the historical database repository.',
      'Expose metrics to long-term trend analysis graphs.'
    ],
    decisionPoints: [
      'Check if flight is fully approved and contains no pending audits.'
    ],
    relatedModules: ['HQHistoricalDashboard.tsx', 'historicalData.ts'],
    storageInteraction: 'Deep query in historical tables.',
    calculations: 'Historical averages, year-on-year changes.',
    output: 'Trend charts detailing route and seating efficiencies.',
    failurePoints: [
      'Cache overflow with large records.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 12,
    name: 'Dashboard All Operational',
    purpose: 'Provides an all-in-one overview of current airport operations, arrivals, and delays.',
    trigger: 'Accessing the main guest Radar route or flight lists.',
    sourceOfTruth: 'IndexedDB flights collection.',
    mainSteps: [
      'Load current operational status for all routes.',
      'Render delay charts and terminal occupancy figures.'
    ],
    decisionPoints: [
      'Filter display by selected current airport station.'
    ],
    relatedModules: ['FlightRadar.tsx', 'App.tsx'],
    storageInteraction: 'Read active flights.',
    calculations: 'Operational percentage counters.',
    output: 'Visual map and table tracking flight progress.',
    failurePoints: [
      'Missing map coordinates or broken icon sets.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 13,
    name: 'Dashboard Sales & Revenue',
    purpose: 'Traces initial seat sales values and matches them to physical manifest actuals.',
    trigger: 'Auditor accesses /hq-sales-revenue route.',
    sourceOfTruth: 'Interactive tickets data from revenueData.ts.',
    mainSteps: [
      'Generate passenger ticket indexes matching actual flights.',
      'Classify revenue states into Flown, Held, Refunded, and Rebooked categories.',
      'Expose financial aggregates in structured tables.'
    ],
    decisionPoints: [
      'Is user filtered by date, carrier, flight number, or status?'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx', 'revenueData.ts'],
    storageInteraction: 'Read flights and compile ticketing breakdowns.',
    calculations: 'Formulas for gross sales, net variances, load factors.',
    output: 'Reconciliation ledgers and detailed cash-flow metrics.',
    failurePoints: [
      'Out-of-balance allocations if passenger counts desynchronize.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 14,
    name: 'Passenger Reconciliation',
    purpose: 'Validates that every ticket holder is mapped to physical boarding statuses.',
    trigger: 'Opening flight audit details modal.',
    sourceOfTruth: 'Master ticket index generated for the active flight.',
    mainSteps: [
      'Match passenger seat numbers on tickets with boarding card scans.',
      'Flag missing, unmatched, or double-scanned bookings.',
      'Compile reconciliation results into status lists.'
    ],
    decisionPoints: [
      'Is passenger travel status marked as FLOWN or NOT_FLOWN?'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx', 'revenueData.ts'],
    storageInteraction: 'Compile ticket registries on current state.',
    calculations: 'Total checked-in vs boarded discrepancies.',
    output: 'Detailed tabular matching lists highlighting exceptions.',
    failurePoints: [
      'Duplicate ticket IDs.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 15,
    name: 'Revenue Reconciliation',
    purpose: 'Guarantees all sales revenue is allocated to certified categories.',
    trigger: 'Ledger control dashboard views or report exports.',
    sourceOfTruth: 'Financial records in revenueData.ts.',
    mainSteps: [
      'Verify that every dollar booked is accounted for.',
      'Match final manifests with realized actual flown revenue values.'
    ],
    decisionPoints: [
      'Should un-flown passenger funds be classified as held, rebooked, or forfeited no-show revenue?'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx', 'revenueData.ts'],
    storageInteraction: 'Query and compile database counts.',
    calculations: 'Revenue allocation formulas.',
    output: 'Audit-ready financial breakdown records.',
    failurePoints: [
      'Floating point math rounding leaks.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 16,
    name: 'Refund and Rebooking Handling',
    purpose: 'Audits transaction cancellations, rebooked routes, and customer refunds.',
    trigger: 'Processing passenger cancellations or transfers.',
    sourceOfTruth: 'Ticket records in revenueData.ts.',
    mainSteps: [
      'Identify passenger cancellations and issue corresponding refunds.',
      'Track rebooked passenger voucher codes.',
      'Subtract refund totals from gross sales to yield accurate net figures.'
    ],
    decisionPoints: [
      'Does passenger qualify for a refund under operational policies?'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx', 'revenueData.ts'],
    storageInteraction: 'Write ticket state changes.',
    calculations: 'Refund total sums and net variance deltas.',
    output: 'Updated cash-flow records.',
    failurePoints: [
      'Double-counting refund deductions.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 17,
    name: 'Aircraft Aggregation',
    purpose: 'Aggregates statistics by individual aircraft hulls to track asset usage.',
    trigger: 'Selecting "Aircraft" grouping on Sales Dashboard.',
    sourceOfTruth: 'Active flights database.',
    mainSteps: [
      'Group flights by physical registration code.',
      'Sum seat capacities, passengers, and flown cash-flows.',
      'Expose hull-level metrics for performance reviews.'
    ],
    decisionPoints: [
      'Filter output by calendar month or route bounds.'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx'],
    storageInteraction: 'Read active flights.',
    calculations: 'Group sums for capacity, load factor, gross sales, and flown revenue.',
    output: 'Aircraft usage summaries.',
    failurePoints: [
      'Mismatched aircraft hulls.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 18,
    name: 'Route Aggregation',
    purpose: 'Groups operations by airport-to-airport routes to evaluate route profitability.',
    trigger: 'Selecting "Route" grouping on Sales Dashboard.',
    sourceOfTruth: 'Active flights database.',
    mainSteps: [
      'Group all sectors by origin-destination pairs.',
      'Aggregate sales and counts per sector.',
      'Output route-level profit margins and loads.'
    ],
    decisionPoints: [
      'Compare inbound vs outbound route performance.'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx'],
    storageInteraction: 'Read active flights.',
    calculations: 'Route profitability percentages, passenger averages.',
    output: 'Route performance report.',
    failurePoints: [
      'Missing route mappings.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 19,
    name: 'Fare-class Aggregation',
    purpose: 'Segments revenue structures by First, Business, Premium Economy, and Economy seats.',
    trigger: 'Selecting "Fare Class" grouping on Sales Dashboard.',
    sourceOfTruth: 'Ticket registers.',
    mainSteps: [
      'Filter all active tickets by cabin class.',
      'Calculate passenger loads and pricing yields per class segment.'
    ],
    decisionPoints: [
      'Compare cabin load factors to adjust allocation ratios.'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx'],
    storageInteraction: 'Read ticket files.',
    calculations: 'Average fare values and sector load segments.',
    output: 'Cabin segment profitability analysis.',
    failurePoints: [
      'Mismatched ticket class flags.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 20,
    name: 'Monthly Reporting',
    purpose: 'Compiles financial reporting logs aggregated by calendar months.',
    trigger: 'Selecting "Month" grouping on Sales Dashboard.',
    sourceOfTruth: 'Active flights database.',
    mainSteps: [
      'Group flights by YYYY-MM flight date prefixes.',
      'Calculate cumulative sales, revenue, and load statistics.'
    ],
    decisionPoints: [
      'Determine seasonality trends to adjust flight schedules.'
    ],
    relatedModules: ['HQSalesRevenueDashboard.tsx'],
    storageInteraction: 'Read active flights.',
    calculations: 'Month-on-month growth metrics.',
    output: 'Seasonal ledger summary document.',
    failurePoints: [
      'Invalid date strings.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 21,
    name: 'IndexedDB Persistence and Reload',
    purpose: 'Maintains critical states across page refreshes or connection interruptions.',
    trigger: 'User triggers database reload or saves records.',
    sourceOfTruth: 'Local browser IndexedDB storage engine.',
    mainSteps: [
      'Establish robust connections to DB stores.',
      'Write dirty cache records into permanent browser stores.',
      'Restore active cache records upon application boot.'
    ],
    decisionPoints: [
      'If write fails, fall back to temporary LocalStorage states.'
    ],
    relatedModules: ['db.ts', 'App.tsx'],
    storageInteraction: 'Persistent writes/reads in IndexedDB transactions.',
    calculations: 'Database size tracking.',
    output: 'Offline-ready persistent data state.',
    failurePoints: [
      'Storage quota exceeded warnings.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 22,
    name: 'Offline Cache Contingency & Synchronization Flow',
    purpose: 'Guarantees flight dispatch and APB submission continuity during server communication blackouts when cached source data exists.',
    trigger: 'Server connection drops while local flight schedule cache is available in IndexedDB / localStorage.',
    sourceOfTruth: 'Local cached Flight document & APB local state.',
    mainSteps: [
      'Detect offline state with cached source flight data present.',
      'Allow Flight Attendant / Station to input passenger counts and sign APB locally.',
      'Queue digital APB with PENDING_SYNC status flag in local store.',
      'Monitor connectivity restoration event.',
      'Automatically transmit queued APB payloads to authoritative server upon reconnection, transitioning to SYNCHRONIZED.'
    ],
    decisionPoints: [
      'Is cached flight schedule available locally?',
      'Has server restored connection to process pending queue?'
    ],
    relatedModules: ['FlightOperationsPage.tsx', 'FlightAttendantPortal.tsx', 'ManifestStationPage.tsx', 'App.tsx'],
    storageInteraction: 'Read cached flight, write local APB with PENDING_SYNC, update to SYNCHRONIZED on server restore.',
    calculations: 'Cabin count totals and sync queue deltas.',
    output: 'Uninterrupted APB seal saved locally and transparently synchronized to central server.',
    failurePoints: [
      'IndexedDB transaction interruptions during offline write.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 23,
    name: 'Emergency APB Workflow & Reconciliation Flow',
    purpose: 'Enables manual APB creation and downstream discrepancy auditing when server outage occurs without prior cached flight data.',
    trigger: 'Server outage occurs and user attempts to process an uncached flight leg.',
    sourceOfTruth: 'Manual Emergency APB entry reconciled against official SABRE/AIMS records upon server recovery.',
    mainSteps: [
      'Detect offline outage without cached flight record.',
      'Allow operator to create manual Emergency APB with flight identifier and estimated counts.',
      'Store emergency APB locally with EMERGENCY_OFFLINE indicator.',
      'Upon server recovery, fetch official SABRE booking and DCS gate counts.',
      'Execute automatic variance comparison between emergency counts and official figures.',
      'Present reconciliation review dialog for auditor sign-off before locking synchronized state.'
    ],
    decisionPoints: [
      'Does uncached flight require emergency manual creation?',
      'Does reconciled variance exceed operational threshold requiring supervisory justification?'
    ],
    relatedModules: ['FlightOperationsPage.tsx', 'FlightAttendantPortal.tsx', 'ManifestStationPage.tsx', 'ManifestHQPage.tsx'],
    storageInteraction: 'Create emergency APB locally, fetch official server record upon recovery, persist reconciled result.',
    calculations: 'Emergency vs Official count variance = Emergency Pax - Official Pax.',
    output: 'Audited, reconciled APB seal with complete variance provenance.',
    failurePoints: [
      'Operator mistyping flight number during manual emergency creation.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 24,
    name: 'Two-Way APB Rework & Correction Lifecycle Flow',
    purpose: 'Enables station agents and HQ auditors to return discrepant APBs to Flight Operations / Flight Attendants for correction with full audit logging.',
    trigger: 'Station agent or HQ auditor identifies count mismatch or invalid note and initiates "Return for Correction".',
    sourceOfTruth: 'DigitalAPB document reworkStatus, reworkReason, and reworkHistory array.',
    mainSteps: [
      'Station / HQ auditor inputs operational rework reason and clicks "Return for Correction".',
      'APB status transitions to RETURNED with reason and timestamp recorded in reworkHistory.',
      'Flight Operations / Flight Attendant portal receives returned notification and enters CORRECTING mode.',
      'Flight Attendant adjusts passenger breakdown counts and re-seals with PIN.',
      'APB status transitions to RESUBMITTED with updated cycle count.',
      'Station and HQ re-review corrected counts and proceed to final approval.'
    ],
    decisionPoints: [
      'Is reason for return provided by auditor?',
      'Has crew corrected counts before resubmission?'
    ],
    relatedModules: ['FlightOperationsPage.tsx', 'ManifestStationPage.tsx', 'ManifestHQPage.tsx', 'APBAuditTimeline.tsx'],
    storageInteraction: 'Update APB reworkStatus, append entry to reworkHistory, increment reworkCycleCount.',
    calculations: 'Rework cycle counter increment.',
    output: 'Fully corrected APB with bi-directional audit trail.',
    failurePoints: [
      'Attempting to edit sealed APB without formal return authorization.'
    ],
    qaStatus: 'PASS'
  },
  {
    id: 25,
    name: 'Audit Timeline Event Provenance & AIMS Verification Flow',
    purpose: 'Maintains an immutable, append-only chronological ledger tracking all operational events with strict data provenance.',
    trigger: 'Any lifecycle event: AIMS flight creation, aircraft assignment, crew verification, SABRE sales update, FA count, station check, rework cycle, or HQ approval.',
    sourceOfTruth: 'Authoritative timestamps (aimsCreatedUtc, aimsAircraftAssignedUtc, aimsCrewRosterVerifiedUtc) and APB auditEvents.',
    mainSteps: [
      'Capture authoritative UTC timestamp at event genesis.',
      'Record originating subsystem (AIMS, SABRE, DCS_GATE, CREW_PORTAL, STATION_DESK, HQ_AUDIT).',
      'Format event with actor name, role, employee ID, and description.',
      'Render timeline chronologically in APBAuditTimeline component across all portals.'
    ],
    decisionPoints: [
      'Ensure synthetic milestones reflect authoritative AIMS timestamps rather than mixed subsystem clocks.'
    ],
    relatedModules: ['APBAuditTimeline.tsx', 'FlightOperationsPage.tsx', 'ManifestStationPage.tsx', 'ManifestHQPage.tsx'],
    storageInteraction: 'Read flight and APB timestamps, render immutable timeline.',
    calculations: 'Time delta between scheduled departure and actual milestones.',
    output: 'Visual event provenance ledger with 100% audit traceability.',
    failurePoints: [
      'Clock desynchronization across client devices.'
    ],
    qaStatus: 'PASS'
  }
];
