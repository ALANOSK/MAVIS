/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function exportScreenIndex(): any[] {
  return [
    {
      screenId: 'SCR-001',
      path: '/',
      name: 'Flight Radar Main Workspace',
      viewport: 'Desktop & Responsive Mobile',
      accessibilityScore: 'Pass',
      lightModeContrastRatio: 'High (Pass WCAG AA)',
      primaryActions: ['Theme Toggle', 'Station Switcher', 'Role Authentication Launch']
    },
    {
      screenId: 'SCR-002',
      path: '/flight-operations',
      name: 'Flight Operations Dispatch Console',
      viewport: 'Desktop & Responsive Mobile',
      accessibilityScore: 'Pass',
      lightModeContrastRatio: 'High (Pass WCAG AA)',
      primaryActions: ['Dispatch Leg', 'Verify Pre-flight Checklist', 'Simulate 5-Min Operational Shift', 'Return APB to FA']
    },
    {
      screenId: 'SCR-003',
      path: '/flight-attendant',
      name: 'Flight Attendant Cabin Count Terminal',
      viewport: 'Tablet & Mobile Focus',
      accessibilityScore: 'Pass',
      lightModeContrastRatio: 'High (Pass WCAG AA)',
      primaryActions: ['Input Passenger Breakdown', 'Validate Replacement Crew', 'Verify 6-Digit PIN', 'Seal APB v1']
    },
    {
      screenId: 'SCR-004',
      path: '/manifest-station',
      name: 'Manifest Station Discrepancy Reconciliation',
      viewport: 'Desktop & Station Workstation',
      accessibilityScore: 'Pass',
      lightModeContrastRatio: 'High (Pass WCAG AA)',
      primaryActions: ['Compare Boarding Scans vs FA Counts', 'Post Station Remark Notes', 'Seal APB v2']
    },
    {
      screenId: 'SCR-005',
      path: '/manifest-hq',
      name: 'Manifest HQ Master Sign-Off & Approvals',
      viewport: 'Desktop Executive Dashboard',
      accessibilityScore: 'Pass',
      lightModeContrastRatio: 'High (Pass WCAG AA)',
      primaryActions: ['Authoritative HQ Approval', 'Lock Digital Seal v3', 'Inspect Manifest Audit Ledger']
    },
    {
      screenId: 'SCR-006',
      path: '/hq-sales-revenue',
      name: 'HQ Sales & Revenue Analytics Ledger',
      viewport: 'Desktop Analytics View',
      accessibilityScore: 'Pass',
      lightModeContrastRatio: 'High (Pass WCAG AA)',
      primaryActions: ['View Gross Sales Allocation', 'Audit Ticket Statuses', 'Filter Route & Fare Yields']
    }
  ];
}

export function exportUiComponentMap(): any[] {
  return [
    { component: 'QuickAccessPanel', lightModeClass: 'bg-white border-slate-300 text-slate-900', contrastStatus: 'PASS' },
    { component: 'FlightOperationsPage', lightModeClass: 'bg-slate-50 border-slate-300 text-slate-900', contrastStatus: 'PASS' },
    { component: 'ManifestStationPage', lightModeClass: 'bg-slate-50 border-slate-300 text-slate-900', contrastStatus: 'PASS' },
    { component: 'ManifestHQPage', lightModeClass: 'bg-slate-50 border-slate-300 text-slate-900', contrastStatus: 'PASS' },
    { component: 'HQSalesRevenueDashboard', lightModeClass: 'bg-slate-50 border-slate-300 text-slate-900', contrastStatus: 'PASS' },
    { component: 'APBAuditTimeline', lightModeClass: 'bg-white border-slate-300 text-slate-900', contrastStatus: 'PASS' },
    { component: 'DiagnosticBreakerDrawer', lightModeClass: 'bg-slate-900 border-sky-500 text-white', contrastStatus: 'PASS (Cockpit Dark Console)' }
  ];
}
