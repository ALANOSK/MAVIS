/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Flight, DigitalAPB } from '../types';
import { resetDatabase } from '../db';
import {
  generateAllTickets,
  getFlightRevenueDetails,
  FlightRevenueReport,
  Ticket,
  FareClass,
  RevenueStatus
} from '../lib/revenueData';
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowUpDown,
  Search,
  CheckCircle,
  XCircle,
  Percent,
  TrendingDown,
  Activity,
  ArrowLeft,
  Plane,
  MapPin,
  Calendar,
  Table,
  Eye,
  Filter,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Coins
} from 'lucide-react';

interface HQSalesRevenueDashboardProps {
  theme: 'light' | 'dark';
  flights: Flight[];
  apbs: DigitalAPB[];
}

export default function HQSalesRevenueDashboard({
  theme,
  flights,
  apbs,
}: HQSalesRevenueDashboardProps) {
  const isLight = theme === 'light';

  // State: View By Selection
  const [viewBy, setViewBy] = useState<'Aircraft' | 'Flight' | 'Route' | 'Fare Class' | 'Month'>('Aircraft');
  
  // State: Detailed Group Drill-downs
  const [drillDownType, setDrillDownType] = useState<'AIRCRAFT' | 'ROUTE' | 'MONTH' | null>(null);
  const [drillDownId, setDrillDownId] = useState<string | null>(null);

  // State: Interactive Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterAircraftReg, setFilterAircraftReg] = useState('');
  const [filterFlightNum, setFilterFlightNum] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterMovementStatus, setFilterMovementStatus] = useState('');
  const [filterReconciliationStatus, setFilterReconciliationStatus] = useState('');
  
  // State: Sorting
  const [summarySortField, setSummarySortField] = useState<string>('revenueVariance');
  const [summarySortAsc, setSummarySortAsc] = useState<boolean>(false);
  const [flightSortField, setFlightSortField] = useState<string>('flightDate');
  const [flightSortAsc, setFlightSortAsc] = useState<boolean>(true);

  // State: Selected Flight for the Sub-Filtered Detail Modal
  const [selectedFlightReport, setSelectedFlightReport] = useState<FlightRevenueReport | null>(null);
  
  // Sub-Filters for Modal
  const [modalSearch, setModalSearch] = useState('');
  const [modalTravelStatus, setModalTravelStatus] = useState<'ALL' | 'FLOWN' | 'NOT_FLOWN'>('ALL');
  const [modalRevenueStatus, setModalRevenueStatus] = useState<'ALL' | RevenueStatus>('ALL');
  const [modalFareClass, setModalFareClass] = useState<'ALL' | FareClass>('ALL');

  // Reseed state
  const [isReseeding, setIsReseeding] = useState(false);

  // 1. Generate core tickets and reports from source of truth data
  const allTickets = useMemo(() => generateAllTickets(flights, apbs), [flights, apbs]);
  const flightReports = useMemo(() => getFlightRevenueDetails(flights, apbs, allTickets), [flights, apbs, allTickets]);

  // 2. Compute dropdown option lists dynamically
  const filterOptions = useMemo(() => {
    const registrations = new Set<string>();
    const flightNumbers = new Set<string>();
    const routes = new Set<string>();
    const origins = new Set<string>();
    const destinations = new Set<string>();
    const movementStatuses = new Set<string>();
    const months = new Set<string>();

    flights.forEach((f) => {
      if (f.aircraft?.registration) registrations.add(f.aircraft.registration);
      if (f.flightNumber) flightNumbers.add(f.flightNumber);
      if (f.origin && f.destination) routes.add(`${f.origin}-${f.destination}`);
      if (f.origin) origins.add(f.origin);
      if (f.destination) destinations.add(f.destination);
      if (f.movementStatus) movementStatuses.add(f.movementStatus);
      if (f.flightDate) months.add(f.flightDate.substring(0, 7));
    });

    return {
      registrations: Array.from(registrations).sort(),
      flightNumbers: Array.from(flightNumbers).sort(),
      routes: Array.from(routes).sort(),
      origins: Array.from(origins).sort(),
      destinations: Array.from(destinations).sort(),
      movementStatuses: Array.from(movementStatuses).sort(),
      months: Array.from(months).sort(),
    };
  }, [flights]);

  // 3. Apply uniform filters to flight revenue reports
  const filteredReports = useMemo(() => {
    return flightReports.filter((r) => {
      if (filterStartDate && r.flightDate < filterStartDate) return false;
      if (filterEndDate && r.flightDate > filterEndDate) return false;
      if (filterMonth && r.flightDate.substring(0, 7) !== filterMonth) return false;
      if (filterAircraftReg && r.aircraftRegistration !== filterAircraftReg) return false;
      
      if (filterFlightNum && !r.flightNumber.toLowerCase().includes(filterFlightNum.toLowerCase())) return false;
      if (filterRoute && !r.route.toLowerCase().includes(filterRoute.toLowerCase())) return false;
      if (filterOrigin && r.origin.toLowerCase() !== filterOrigin.toLowerCase()) return false;
      if (filterDestination && r.destination.toLowerCase() !== filterDestination.toLowerCase()) return false;
      if (filterMovementStatus && r.movementStatus !== filterMovementStatus) return false;

      if (filterReconciliationStatus) {
        if (filterReconciliationStatus === 'Reconciled' && r.revenueStatus !== 'RECONCILED') return false;
        if (filterReconciliationStatus === 'Held Pending' && r.revenueStatus !== 'HELD_PENDING') return false;
        if (filterReconciliationStatus === 'Cancelled' && r.revenueStatus !== 'CANCELLED') return false;
        if (filterReconciliationStatus === 'Check-in In Progress' && r.revenueStatus !== 'CHECK_IN') return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.flightNumber.toLowerCase().includes(q) ||
          r.route.toLowerCase().includes(q) ||
          r.aircraftRegistration.toLowerCase().includes(q) ||
          r.aircraftType.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [
    flightReports,
    filterStartDate,
    filterEndDate,
    filterMonth,
    filterAircraftReg,
    filterFlightNum,
    filterRoute,
    filterOrigin,
    filterDestination,
    filterMovementStatus,
    filterReconciliationStatus,
    searchQuery,
  ]);

  // 4. Calculate high-level financial and passenger metrics deck
  const metrics = useMemo(() => {
    let salesPax = 0;
    let finalManifestPax = 0;
    let checkInPax = 0;
    let boardedPax = 0;
    let capacity = 0;

    let grossSales = 0;
    let flownRevenue = 0;
    let heldRevenue = 0;
    let refundedAmount = 0;
    let rebookedRevenue = 0;
    let noShowRevenue = 0;

    filteredReports.forEach((r) => {
      salesPax += r.salesPax;
      finalManifestPax += r.finalManifestPax;
      checkInPax += r.checkInPax;
      boardedPax += r.boardedPax;
      capacity += r.capacity;

      grossSales += r.grossSales;
      flownRevenue += r.flownRevenue;
      heldRevenue += r.heldRevenue;
      refundedAmount += r.refundedAmount;
      rebookedRevenue += r.rebookedRevenue;
      noShowRevenue += r.noShowRecognizedRevenue;
    });

    const netVariance = flownRevenue + noShowRevenue - grossSales;
    const loadFactor = capacity > 0 ? (finalManifestPax / capacity) * 100 : 0;

    // Filter tickets corresponding to the filtered flights for status distribution
    const filteredFlightIds = new Set(filteredReports.map((r) => r.flightId));
    const flightFilteredTickets = allTickets.filter((t) => filteredFlightIds.has(t.flightId));

    const totalHeldPax = flightFilteredTickets.filter((t) => t.revenueStatus === 'HELD_PENDING').length;
    const totalRefundedPax = flightFilteredTickets.filter((t) => t.revenueStatus === 'REFUNDED').length;
    const totalRebookedPax = flightFilteredTickets.filter((t) => t.revenueStatus === 'REBOOKED').length;
    const totalNoShowPax = flightFilteredTickets.filter((t) => t.revenueStatus === 'NO_SHOW_RECOGNIZED').length;

    return {
      salesPax,
      finalManifestPax,
      checkInPax,
      boardedPax,
      capacity,
      loadFactor,
      grossSales,
      flownRevenue,
      heldRevenue,
      refundedAmount,
      rebookedRevenue,
      noShowRevenue,
      netVariance,
      totalHeldPax,
      totalRefundedPax,
      totalRebookedPax,
      totalNoShowPax,
    };
  }, [filteredReports, allTickets]);

  // 5. Aggregate reports for summaries (Aircraft, Route, Month, Fare Class)
  const summaryItems = useMemo(() => {
    if (viewBy === 'Fare Class') {
      // Fare Class grouping is computed at ticket level for the active filtered flights
      const filteredFlightIds = new Set(filteredReports.map((r) => r.flightId));
      const activeTickets = allTickets.filter((t) => filteredFlightIds.has(t.flightId));

      const classes: FareClass[] = ['First Class', 'Business', 'Premium Economy', 'Economy'];

      return classes.map((fc) => {
        const classTickets = activeTickets.filter((t) => t.fareClass === fc);

        const soldPax = classTickets.length;
        const flownPax = classTickets.filter((t) => t.revenueStatus === 'FLOWN').length;
        const nonFlownPax = soldPax - flownPax;

        const grossSales = classTickets.reduce((sum, t) => sum + t.ticketValue, 0);
        const flownRevenue = classTickets.filter((t) => t.revenueStatus === 'FLOWN').reduce((sum, t) => sum + t.ticketValue, 0);
        const heldRevenue = classTickets.filter((t) => t.revenueStatus === 'HELD_PENDING').reduce((sum, t) => sum + t.ticketValue, 0);
        const refundAmount = classTickets.filter((t) => t.revenueStatus === 'REFUNDED').reduce((sum, t) => sum + t.refundAmount, 0);
        const rebookedRevenue = classTickets.filter((t) => t.revenueStatus === 'REBOOKED').reduce((sum, t) => sum + t.ticketValue, 0);
        const noShowRevenue = classTickets.filter((t) => t.revenueStatus === 'NO_SHOW_RECOGNIZED').reduce((sum, t) => sum + t.ticketValue, 0);

        return {
          id: fc,
          name: fc,
          sectorsCount: filteredReports.length,
          salesPax: soldPax,
          finalManifestPax: flownPax,
          nonFlownPax,
          grossSales,
          flownRevenue,
          heldRevenue,
          refundedAmount: refundAmount,
          rebookedRevenue,
          noShowRevenue,
          netVariance: flownRevenue + noShowRevenue - grossSales,
          revenuePerPassenger: flownPax > 0 ? flownRevenue / flownPax : 0,
        };
      });
    }

    const groups: Record<string, FlightRevenueReport[]> = {};

    filteredReports.forEach((r) => {
      let key = '';
      if (viewBy === 'Aircraft') {
        key = r.aircraftRegistration || 'UNKNOWN';
      } else if (viewBy === 'Route') {
        key = r.route;
      } else if (viewBy === 'Month') {
        key = r.flightDate.substring(0, 7);
      } else {
        key = r.flightId;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(r);
    });

    return Object.entries(groups).map(([key, items]) => {
      const sectorsCount = items.length;
      const capacity = items.reduce((sum, i) => sum + i.capacity, 0);
      
      const salesPax = items.reduce((sum, i) => sum + i.salesPax, 0);
      const checkInPax = items.reduce((sum, i) => sum + i.checkInPax, 0);
      const boardedPax = items.reduce((sum, i) => sum + i.boardedPax, 0);
      const finalManifestPax = items.reduce((sum, i) => sum + i.finalManifestPax, 0);
      const nonFlownPax = items.reduce((sum, i) => sum + i.nonFlownPax, 0);

      const grossSales = items.reduce((sum, i) => sum + i.grossSales, 0);
      const flownRevenue = items.reduce((sum, i) => sum + i.flownRevenue, 0);
      const heldRevenue = items.reduce((sum, i) => sum + i.heldRevenue, 0);
      const refundedAmount = items.reduce((sum, i) => sum + i.refundedAmount, 0);
      const rebookedRevenue = items.reduce((sum, i) => sum + i.rebookedRevenue, 0);
      const noShowRevenue = items.reduce((sum, i) => sum + i.noShowRecognizedRevenue, 0);

      const loadFactor = capacity > 0 ? (finalManifestPax / capacity) * 100 : 0;
      const netVariance = flownRevenue + noShowRevenue - grossSales;

      const revenuePerFlight = sectorsCount > 0 ? flownRevenue / sectorsCount : 0;
      const revenuePerPassenger = finalManifestPax > 0 ? flownRevenue / finalManifestPax : 0;

      const discrepancySectors = items.filter((i) => i.revenueStatus === 'HELD_PENDING' || i.revenueStatus === 'IN_FLIGHT_HELD').length;

      let name = key;
      let typeLabel = '';

      if (viewBy === 'Aircraft') {
        typeLabel = items[0]?.aircraftType || 'N/A';
      } else if (viewBy === 'Route') {
        name = `${items[0]?.origin} ➔ ${items[0]?.destination}`;
      }

      return {
        id: key,
        name,
        typeLabel,
        sectorsCount,
        capacity,
        salesPax,
        checkInPax,
        boardedPax,
        finalManifestPax,
        nonFlownPax,
        loadFactor,
        grossSales,
        flownRevenue,
        heldRevenue,
        refundedAmount,
        rebookedRevenue,
        noShowRevenue,
        netVariance,
        revenuePerFlight,
        revenuePerPassenger,
        discrepancySectors,
      };
    });
  }, [filteredReports, allTickets, viewBy]);

  // 6. Sort summary records
  const sortedSummaryItems = useMemo(() => {
    return [...summaryItems].sort((a, b) => {
      let valA: any = a[summarySortField as keyof typeof a];
      let valB: any = b[summarySortField as keyof typeof b];

      if (summarySortField === 'name') {
        valA = a.name;
        valB = b.name;
      } else if (summarySortField === 'sectors') {
        valA = a.sectorsCount;
        valB = b.sectorsCount;
      } else if (summarySortField === 'salesPax') {
        valA = a.salesPax;
        valB = b.salesPax;
      } else if (summarySortField === 'manifestPax') {
        valA = a.finalManifestPax;
        valB = b.finalManifestPax;
      } else if (summarySortField === 'loadFactor') {
        valA = a.loadFactor || 0;
        valB = b.loadFactor || 0;
      } else if (summarySortField === 'grossSales') {
        valA = a.grossSales;
        valB = b.grossSales;
      } else if (summarySortField === 'flownRevenue') {
        valA = a.flownRevenue;
        valB = b.flownRevenue;
      } else if (summarySortField === 'revenueVariance') {
        valA = a.netVariance;
        valB = b.netVariance;
      }

      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      if (typeof valA === 'string') {
        return summarySortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return summarySortAsc ? valA - valB : valB - valA;
    });
  }, [summaryItems, summarySortField, summarySortAsc]);

  // 7. Sort detailed flights lists (standard/drilldown list)
  const getSortedFlights = (list: FlightRevenueReport[]) => {
    return [...list].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (flightSortField === 'flightDate') {
        valA = a.flightDate;
        valB = b.flightDate;
      } else if (flightSortField === 'flightNumber') {
        valA = a.flightNumber;
        valB = b.flightNumber;
      } else if (flightSortField === 'route') {
        valA = a.route;
        valB = b.route;
      } else if (flightSortField === 'salesCount') {
        valA = a.salesPax;
        valB = b.salesPax;
      } else if (flightSortField === 'manifestCount') {
        valA = a.finalManifestPax;
        valB = b.finalManifestPax;
      } else if (flightSortField === 'grossSales') {
        valA = a.grossSales;
        valB = b.grossSales;
      } else if (flightSortField === 'flownRevenue') {
        valA = a.flownRevenue;
        valB = b.flownRevenue;
      } else {
        valA = a.flightDate;
        valB = b.flightDate;
      }

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return flightSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return flightSortAsc ? valA - valB : valB - valA;
    });
  };

  // 8. Drill down filtered flights list
  const drillDownFlights = useMemo(() => {
    if (!drillDownType || !drillDownId) return [];
    return filteredReports.filter((r) => {
      if (drillDownType === 'AIRCRAFT') return r.aircraftRegistration === drillDownId;
      if (drillDownType === 'ROUTE') return r.route === drillDownId;
      if (drillDownType === 'MONTH') return r.flightDate.substring(0, 7) === drillDownId;
      return false;
    });
  }, [filteredReports, drillDownType, drillDownId]);

  // Sorting handlers
  const handleSummaryHeaderSort = (field: string) => {
    if (summarySortField === field) {
      setSummarySortAsc(!summarySortAsc);
    } else {
      setSummarySortField(field);
      setSummarySortAsc(false); // Default to desc for financial reports
    }
  };

  const handleFlightHeaderSort = (field: string) => {
    if (flightSortField === field) {
      setFlightSortAsc(!flightSortAsc);
    } else {
      setFlightSortField(field);
      setFlightSortAsc(true);
    }
  };

  // Reset/reseed database helper
  const handleReseedDb = async () => {
    if (window.confirm('Reset database to synchronize flight manifests and mock ticket details? This refreshes all operations.')) {
      setIsReseeding(true);
      try {
        await resetDatabase();
        window.location.reload();
      } catch (err) {
        window.alert(`Database reset failure: ${err}`);
        setIsReseeding(false);
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMonth('');
    setFilterAircraftReg('');
    setFilterFlightNum('');
    setFilterRoute('');
    setFilterOrigin('');
    setFilterDestination('');
    setFilterMovementStatus('');
    setFilterReconciliationStatus('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECONCILED':
        return isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'CHECK_IN':
        return isLight ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      case 'HELD_PENDING':
        return isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'IN_FLIGHT_HELD':
        return isLight ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
      case 'CANCELLED':
        return isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      default:
        return isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  // Sub-filtered modal tickets
  const modalFilteredTickets = useMemo(() => {
    if (!selectedFlightReport) return [];

    // Combine original sold tickets and transferred in tickets
    const combined = [
      ...selectedFlightReport.tickets,
      ...selectedFlightReport.transferredInTickets.map(t => ({
        ...t,
        isTransferredIn: true
      }))
    ];

    return combined.filter((t) => {
      // Modal Travel Status
      if (modalTravelStatus !== 'ALL' && t.travelStatus !== modalTravelStatus) return false;
      
      // Modal Revenue Status
      if (modalRevenueStatus !== 'ALL' && t.revenueStatus !== modalRevenueStatus) return false;

      // Modal Fare Class
      if (modalFareClass !== 'ALL' && t.fareClass !== modalFareClass) return false;

      // Modal Search Query
      if (modalSearch) {
        const ms = modalSearch.toLowerCase();
        return (
          t.ticketId.toLowerCase().includes(ms) ||
          t.passengerId.toLowerCase().includes(ms) ||
          t.maskedPassengerName.toLowerCase().includes(ms) ||
          t.PNR.toLowerCase().includes(ms)
        );
      }

      return true;
    });
  }, [selectedFlightReport, modalSearch, modalTravelStatus, modalRevenueStatus, modalFareClass]);

  // Reset modal sub-filters when opening
  const handleOpenModal = (report: FlightRevenueReport) => {
    setSelectedFlightReport(report);
    setModalSearch('');
    setModalTravelStatus('ALL');
    setModalRevenueStatus('ALL');
    setModalFareClass('ALL');
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
      }`}>
        <div>
          <h3 className={`text-sm font-extrabold flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <DollarSign className={`h-4 w-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            Passenger Sales & Flown Revenue Ledger Control
          </h3>
          <p className={`text-[11px] mt-0.5 ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}>
            Audit-grade reconciliation tracing booked tickets to checked-in, boarded, and officially transmitted flight manifests.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleReseedDb}
            disabled={isReseeding}
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 rounded border transition cursor-pointer flex items-center gap-1.5 ${
              isLight
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <RotateCcw className={`h-3 w-3 ${isReseeding ? 'animate-spin' : ''}`} />
            {isReseeding ? 'Re-aligning...' : 'Sync Operations'}
          </button>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 rounded border flex items-center gap-1 ${
            isLight
              ? 'bg-sky-50 border-sky-200 text-sky-800'
              : 'bg-white/5 border-white/10 text-sky-400'
          }`}>
            <ShieldCheck className="h-3 w-3" /> Audit Role Demo
          </span>
        </div>
      </div>

      {/* 2. Bento Deck - Operational Passenger Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Sales Pax */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`uppercase font-black text-[9px] tracking-wider ${
              isLight ? 'text-slate-600' : 'text-slate-500'
            }`}>Booked Pax</span>
            <Users className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div>
            <div className={`text-xl font-black font-mono leading-none ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {metrics.salesPax.toLocaleString()}
            </div>
            <p className={`text-[9px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Booked & ticketed seats</p>
          </div>
        </div>

        {/* Flown (Final Manifest) Pax */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`uppercase font-black text-[9px] tracking-wider ${
              isLight ? 'text-slate-600' : 'text-slate-500'
            }`}>Flown (Manifest)</span>
            <CheckCircle className={`h-3.5 w-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black font-mono leading-none ${
              isLight ? 'text-emerald-700' : 'text-emerald-400'
            }`}>
              {metrics.finalManifestPax.toLocaleString()}
            </div>
            <p className={`text-[9px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
              Load Factor: <span className={`font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{metrics.loadFactor.toFixed(1)}%</span>
            </p>
          </div>
        </div>

        {/* Held Pending Pax */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`uppercase font-black text-[9px] tracking-wider ${
              isLight ? 'text-slate-600' : 'text-slate-500'
            }`}>Held Pending</span>
            <Activity className={`h-3.5 w-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black font-mono leading-none ${
              isLight ? 'text-amber-700' : 'text-amber-400'
            }`}>
              {metrics.totalHeldPax.toLocaleString()}
            </div>
            <p className={`text-[9px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Unresolved no-shows</p>
          </div>
        </div>

        {/* Refunded Pax */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`uppercase font-black text-[9px] tracking-wider ${
              isLight ? 'text-slate-600' : 'text-slate-500'
            }`}>Refunded Seats</span>
            <TrendingDown className={`h-3.5 w-3.5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black font-mono leading-none ${
              isLight ? 'text-rose-700' : 'text-rose-400'
            }`}>
              {metrics.totalRefundedPax.toLocaleString()}
            </div>
            <p className={`text-[9px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Approved customer refunds</p>
          </div>
        </div>

        {/* Rebooked Pax */}
        <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`uppercase font-black text-[9px] tracking-wider ${
              isLight ? 'text-slate-600' : 'text-slate-500'
            }`}>Rebooked / Transferred</span>
            <RotateCcw className={`h-3.5 w-3.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
          </div>
          <div>
            <div className={`text-xl font-black font-mono leading-none ${
              isLight ? 'text-indigo-700' : 'text-indigo-400'
            }`}>
              {metrics.totalRebookedPax.toLocaleString()}
            </div>
            <p className={`text-[9px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Transferred out sectors</p>
          </div>
        </div>
      </div>

      {/* 3. Bento Deck - Financial Reconciliation Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Gross Sales */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1A1D23] border-white/10'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider block ${
            isLight ? 'text-slate-700' : 'text-slate-400'
          }`}>Gross Sales</span>
          <div className={`text-lg font-black font-mono ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            ${metrics.grossSales.toLocaleString()}
          </div>
          <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Initial seat bookings</p>
        </div>

        {/* Flown Revenue */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          isLight ? 'bg-emerald-50/60 border-emerald-200 shadow-sm' : 'bg-[#1A1D23] border-emerald-500/20'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider block ${
            isLight ? 'text-emerald-800' : 'text-emerald-400'
          }`}>Flown Revenue</span>
          <div className={`text-lg font-black font-mono ${
            isLight ? 'text-emerald-700' : 'text-emerald-400'
          }`}>
            ${metrics.flownRevenue.toLocaleString()}
          </div>
          <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Earned from manifest</p>
        </div>

        {/* Held Revenue */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          isLight ? 'bg-amber-50/60 border-amber-200 shadow-sm' : 'bg-[#1A1D23] border-amber-500/20'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider block ${
            isLight ? 'text-amber-800' : 'text-amber-400'
          }`}>Held Revenue</span>
          <div className={`text-lg font-black font-mono ${
            isLight ? 'text-amber-700' : 'text-amber-400'
          }`}>
            ${metrics.heldRevenue.toLocaleString()}
          </div>
          <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Pending classification</p>
        </div>

        {/* Refunded Amount */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          isLight ? 'bg-rose-50/60 border-rose-200 shadow-sm' : 'bg-[#1A1D23] border-rose-500/20'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider block ${
            isLight ? 'text-rose-800' : 'text-rose-400'
          }`}>Refunded Amount</span>
          <div className={`text-lg font-black font-mono ${
            isLight ? 'text-rose-700' : 'text-rose-400'
          }`}>
            ${metrics.refundedAmount.toLocaleString()}
          </div>
          <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Reversed ticket value</p>
        </div>

        {/* Rebooked Revenue */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          isLight ? 'bg-indigo-50/60 border-indigo-200 shadow-sm' : 'bg-[#1A1D23] border-indigo-500/20'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider block ${
            isLight ? 'text-indigo-800' : 'text-indigo-400'
          }`}>Rebooked Rev</span>
          <div className={`text-lg font-black font-mono ${
            isLight ? 'text-indigo-700' : 'text-indigo-400'
          }`}>
            ${metrics.rebookedRevenue.toLocaleString()}
          </div>
          <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Transferred value</p>
        </div>

        {/* No-show Revenue */}
        <div className={`p-3.5 rounded-xl border space-y-1 ${
          isLight ? 'bg-purple-50/60 border-purple-200 shadow-sm' : 'bg-[#1A1D23] border-purple-500/20'
        }`}>
          <span className={`text-[9px] font-bold uppercase tracking-wider block ${
            isLight ? 'text-purple-800' : 'text-purple-400'
          }`}>No-Show Revenue</span>
          <div className={`text-lg font-black font-mono ${
            isLight ? 'text-purple-700' : 'text-purple-400'
          }`}>
            ${metrics.noShowRevenue.toLocaleString()}
          </div>
          <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Recognized forfeits</p>
        </div>
      </div>

      {/* 4. Interactive Ledger Filter Panel */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
      }`}>
        <div className={`flex items-center justify-between border-b pb-2 ${
          isLight ? 'border-slate-200' : 'border-white/5'
        }`}>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <Filter className={`h-3.5 w-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            Audit Ledger Filtering Parameters
          </div>
          {(filterStartDate || filterEndDate || filterMonth || filterAircraftReg || filterFlightNum || filterRoute || filterOrigin || filterDestination || filterMovementStatus || filterReconciliationStatus || searchQuery) && (
            <button
              onClick={clearFilters}
              className={`text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                isLight ? 'text-rose-600 hover:text-rose-700' : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Quick Search */}
          <div className="space-y-1">
            <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Quick Match</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Reg, Flight #, or City..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded border py-2 pl-7 pr-2 text-xs outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-sky-600'
                    : 'border-white/10 bg-[#1A1D23] text-white placeholder-slate-500 focus:border-sky-500/50'
                }`}
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none font-mono ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
              }`}
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none font-mono ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
              }`}
            />
          </div>

          {/* Month Ledger */}
          <div className="space-y-1">
            <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Month Ledger</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
              }`}
            >
              <option value="">All Months</option>
              {filterOptions.months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Aircraft Reg */}
          <div className="space-y-1">
            <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Aircraft Reg</label>
            <select
              value={filterAircraftReg}
              onChange={(e) => setFilterAircraftReg(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
              }`}
            >
              <option value="">All Registrations</option>
              {filterOptions.registrations.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Flight Number */}
          <div className="space-y-1 font-mono">
            <label className={`text-[9px] uppercase font-bold font-sans ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Flight ID</label>
            <input
              type="text"
              placeholder="e.g. JT-111"
              value={filterFlightNum}
              onChange={(e) => setFilterFlightNum(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white placeholder-slate-500 focus:border-sky-500/50'
              }`}
            />
          </div>

          {/* Route Group */}
          <div className="space-y-1">
            <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Route Group</label>
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none font-mono ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
              }`}
            >
              <option value="" className="font-sans">All Routes</option>
              {filterOptions.routes.map((rt) => (
                <option key={rt} value={rt}>{rt}</option>
              ))}
            </select>
          </div>

          {/* Origin Port */}
          <div className="space-y-1 font-mono">
            <label className={`text-[9px] uppercase font-bold font-sans ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Origin Port</label>
            <input
              type="text"
              placeholder="e.g. CGK"
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none uppercase ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white placeholder-slate-500 focus:border-sky-500/50'
              }`}
            />
          </div>

          {/* Arrival Port */}
          <div className="space-y-1 font-mono">
            <label className={`text-[9px] uppercase font-bold font-sans ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Arrival Port</label>
            <input
              type="text"
              placeholder="e.g. DPS"
              value={filterDestination}
              onChange={(e) => setFilterDestination(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none uppercase ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white placeholder-slate-500 focus:border-sky-500/50'
              }`}
            />
          </div>

          {/* Reconciliation Status */}
          <div className="space-y-1">
            <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Audit Status</label>
            <select
              value={filterReconciliationStatus}
              onChange={(e) => setFilterReconciliationStatus(e.target.value)}
              className={`w-full rounded border px-2 py-2 text-xs outline-none ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-600'
                  : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
              }`}
            >
              <option value="">All Audit Statuses</option>
              <option value="Reconciled">Reconciled</option>
              <option value="Held Pending">Held Pending</option>
              <option value="Check-in In Progress">Check-in In Progress</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. View Selection and Drill-Down Breadcrumbs */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border ${
        isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117]/60 border-white/5'
      }`}>
        <div className="flex items-center gap-2">
          {drillDownType ? (
            <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <button
                onClick={() => {
                  setDrillDownType(null);
                  setDrillDownId(null);
                }}
                className={`font-bold transition flex items-center gap-1 cursor-pointer ${
                  isLight ? 'text-sky-700 hover:text-sky-800' : 'text-sky-400 hover:text-sky-300'
                }`}
              >
                {viewBy} Summary
              </button>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span className={`font-mono px-2 py-0.5 rounded font-extrabold flex items-center gap-1 border ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/5 border-white/10 text-white'
              }`}>
                {drillDownType === 'AIRCRAFT' && <Plane className={`h-3 w-3 ${isLight ? 'text-sky-700' : 'text-sky-400'}`} />}
                {drillDownType === 'ROUTE' && <MapPin className={`h-3 w-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />}
                {drillDownType === 'MONTH' && <Calendar className={`h-3 w-3 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`} />}
                {drillDownId} Flight List
              </span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}>
              <span>View Financials By:</span>
            </div>
          )}
        </div>

        {/* View Selection Tab Group */}
        {!drillDownType && (
          <div className={`flex p-0.5 rounded-lg border self-start sm:self-auto select-none overflow-x-auto max-w-full ${
            isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#161920] border-white/5'
          }`}>
            {([
              { mode: 'Aircraft', icon: Plane },
              { mode: 'Flight', icon: Table },
              { mode: 'Route', icon: MapPin },
              { mode: 'Fare Class', icon: Coins },
              { mode: 'Month', icon: Calendar }
            ] as const).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => {
                  setViewBy(mode);
                  if (mode === 'Flight') {
                    setFlightSortField('flightDate');
                    setFlightSortAsc(true);
                  } else {
                    setSummarySortField(mode === 'Aircraft' ? 'revenueVariance' : 'flownRevenue');
                    setSummarySortAsc(false);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  viewBy === mode
                    ? isLight
                      ? 'bg-sky-700 text-white shadow font-black'
                      : 'bg-sky-500 text-white shadow font-black'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3" />
                {mode}
              </button>
            ))}
          </div>
        )}

        {drillDownType && (
          <button
            onClick={() => {
              setDrillDownType(null);
              setDrillDownId(null);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer self-start sm:self-auto ${
              isLight
                ? 'bg-white hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
            Back to {viewBy}
          </button>
        )}
      </div>

      {/* 6. Dynamic Main Grid Tables */}
      {drillDownType ? (
        /* DRILL-DOWN VIEW (FLIGHT LIST FOR THE SELECTED GROUP) */
        <div className={`overflow-x-auto rounded-xl border ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className={`uppercase font-black text-[9px] tracking-wider border-b select-none ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1D23] text-slate-400 border-white/10'
              }`}>
                <th onClick={() => handleFlightHeaderSort('flightDate')} className="px-4 py-3 cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Flight Date <ArrowUpDown className="inline-block h-2.5 w-2.5 ml-0.5" />
                </th>
                <th onClick={() => handleFlightHeaderSort('flightNumber')} className="px-4 py-3 cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Flight ID <ArrowUpDown className="inline-block h-2.5 w-2.5 ml-0.5" />
                </th>
                <th onClick={() => handleFlightHeaderSort('route')} className="px-4 py-3 cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Route <ArrowUpDown className="inline-block h-2.5 w-2.5 ml-0.5" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Capacity</th>
                <th onClick={() => handleFlightHeaderSort('salesCount')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Sales Pax <ArrowUpDown className="inline-block h-2.5 w-2.5 ml-0.5" />
                </th>
                <th onClick={() => handleFlightHeaderSort('manifestCount')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap font-bold">
                  Manifest Pax <ArrowUpDown className="inline-block h-2.5 w-2.5 ml-0.5" />
                </th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>L/F (%)</th>
                <th onClick={() => handleFlightHeaderSort('grossSales')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Gross Sales <ArrowUpDown className="inline-block h-2.5 w-2.5 ml-0.5" />
                </th>
                <th onClick={() => handleFlightHeaderSort('flownRevenue')} className={`px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  Flown Rev <ArrowUpDown className="inline-block h-2.5 w-2.5 ml-0.5" />
                </th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Held Rev</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Refunded</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Audit Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${
              isLight ? 'divide-slate-200' : 'divide-white/5'
            }`}>
              {drillDownFlights.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No matching flights found under this group.
                  </td>
                </tr>
              ) : (
                getSortedFlights(drillDownFlights).map((r) => {
                  const lf = r.capacity > 0 ? (r.finalManifestPax / r.capacity) * 100 : 0;
                  return (
                    <tr key={r.flightId} className={`transition duration-150 ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1A1D23]/40'
                    }`}>
                      <td className={`px-4 py-3 font-bold whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>{r.flightDate}</td>
                      <td className={`px-4 py-3 font-bold whitespace-nowrap ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>{r.flightNumber}</td>
                      <td className={`px-4 py-3 font-sans font-semibold whitespace-nowrap ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{r.route}</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{r.capacity}</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{r.salesPax}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{r.finalManifestPax}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{lf.toFixed(1)}%</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>${r.grossSales.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>${r.flownRevenue.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>${r.heldRevenue.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>${r.refundedAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-sans whitespace-nowrap">
                        <span className={`inline-block text-[9px] font-bold border rounded-full px-2 py-0.5 ${getStatusColor(r.revenueStatus)}`}>
                          {r.revenueStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-sans whitespace-nowrap">
                        <button
                          onClick={() => handleOpenModal(r)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded border transition cursor-pointer ${
                            isLight
                              ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                              : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/20'
                          }`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : viewBy === 'Flight' ? (
        /* STANDARD VIEW BY FLIGHT */
        <div className={`overflow-x-auto rounded-xl border ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className={`uppercase font-black text-[9px] tracking-wider border-b select-none ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1D23] text-slate-400 border-white/10'
              }`}>
                <th onClick={() => handleFlightHeaderSort('flightDate')} className="px-4 py-3 cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Date <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleFlightHeaderSort('flightNumber')} className="px-4 py-3 cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Flight ID <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleFlightHeaderSort('route')} className="px-4 py-3 cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Route <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Capacity</th>
                <th onClick={() => handleFlightHeaderSort('salesCount')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Sales Pax <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleFlightHeaderSort('manifestCount')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap font-bold">
                  Manifest Pax <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>L/F (%)</th>
                <th onClick={() => handleFlightHeaderSort('grossSales')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Gross Sales <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleFlightHeaderSort('flownRevenue')} className={`px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  Flown Rev <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Held Rev</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Refunded</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${
              isLight ? 'divide-slate-200' : 'divide-white/5'
            }`}>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No matching flight sales data found.
                  </td>
                </tr>
              ) : (
                getSortedFlights(filteredReports).map((r) => {
                  const lf = r.capacity > 0 ? (r.finalManifestPax / r.capacity) * 100 : 0;
                  return (
                    <tr key={r.flightId} className={`transition duration-150 ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1A1D23]/50'
                    }`}>
                      <td className={`px-4 py-3 font-bold whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>{r.flightDate}</td>
                      <td className={`px-4 py-3 font-bold whitespace-nowrap ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>{r.flightNumber}</td>
                      <td className={`px-4 py-3 font-sans font-medium whitespace-nowrap ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{r.route}</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{r.capacity}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{r.salesPax}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{r.finalManifestPax}</td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{lf.toFixed(1)}%</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>${r.grossSales.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>${r.flownRevenue.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>${r.heldRevenue.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>${r.refundedAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap font-sans">
                        <span className={`inline-block text-[10px] font-bold border rounded-full px-2 py-0.5 ${getStatusColor(r.revenueStatus)}`}>
                          {r.revenueStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap font-sans">
                        <button
                          onClick={() => handleOpenModal(r)}
                          className={`px-2 py-1 text-[10px] font-bold rounded border cursor-pointer ${
                            isLight
                              ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                              : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30'
                          }`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : viewBy === 'Fare Class' ? (
        /* FARE CLASS VIEW (TICKET GROUPING) */
        <div className={`overflow-x-auto rounded-xl border ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className={`uppercase font-black text-[9px] tracking-wider border-b select-none ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1D23] text-slate-400 border-white/10'
              }`}>
                <th className="px-4 py-3 text-left whitespace-nowrap">Fare Class</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Sectors Checked</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Sold Pax</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Flown Pax</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Non-Flown Pax</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Gross Sales</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Flown Revenue</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Held Revenue</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Refund Amount</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>Rebooked Revenue</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>No-Show Revenue</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>Rev / Pax</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${
              isLight ? 'divide-slate-200' : 'divide-white/5'
            }`}>
              {sortedSummaryItems.map((item) => (
                <tr key={item.id} className={`transition duration-150 ${
                  isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1A1D23]/50'
                }`}>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap flex items-center gap-2 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    <Coins className="h-3 w-3 text-slate-400" />
                    <span className={isLight ? 'text-sky-800' : 'text-sky-400'}>{item.name}</span>
                  </td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.sectorsCount}</td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{item.salesPax.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{item.finalManifestPax.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{item.nonFlownPax.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>${item.grossSales.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>${item.flownRevenue.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>${item.heldRevenue.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>${item.refundedAmount.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>${item.rebookedRevenue.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>${item.noShowRevenue.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>${item.revenuePerPassenger.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* AGGREGATED SUMMARY TABLE (AIRCRAFT, ROUTE, MONTH) */
        <div className={`overflow-x-auto rounded-xl border ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className={`uppercase font-black text-[9px] tracking-wider border-b select-none ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1D23] text-slate-400 border-white/10'
              }`}>
                <th onClick={() => handleSummaryHeaderSort('aircraftRegistration')} className="px-4 py-3 cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  {viewBy === 'Aircraft' ? 'Aircraft Reg' : viewBy === 'Route' ? 'Route Code' : 'Month Period'}{' '}
                  <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                {viewBy === 'Aircraft' && (
                  <th className="px-4 py-3 whitespace-nowrap text-left">Aircraft Type</th>
                )}
                <th onClick={() => handleSummaryHeaderSort('sectors')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Sectors <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Seats Offered</th>
                <th onClick={() => handleSummaryHeaderSort('salesPax')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Sales Pax <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleSummaryHeaderSort('manifestPax')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap font-bold">
                  Manifest Pax <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleSummaryHeaderSort('loadFactor')} className={`px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                  L/F (%) <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleSummaryHeaderSort('grossSales')} className="px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap">
                  Gross Sales <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th onClick={() => handleSummaryHeaderSort('flownRevenue')} className={`px-4 py-3 text-right cursor-pointer hover:text-sky-600 transition whitespace-nowrap font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  Flown Rev <ArrowUpDown className="inline-block h-3 w-3 ml-1" />
                </th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>Held Rev</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Refunded</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>Rebooked</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-medium ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>No-Show</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>Rev / Sect</th>
                <th className={`px-4 py-3 text-right whitespace-nowrap font-semibold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>Rev / Pax</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${
              isLight ? 'divide-slate-200' : 'divide-white/5'
            }`}>
              {sortedSummaryItems.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No matching aggregated financial summary found.
                  </td>
                </tr>
              ) : (
                sortedSummaryItems.map((item) => (
                  <tr key={item.id} className={`transition duration-150 ${
                    isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1A1D23]/50'
                  }`}>
                    <td className={`px-4 py-3 font-bold whitespace-nowrap flex items-center gap-2 ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {viewBy === 'Aircraft' && <Plane className="h-3 w-3 text-slate-400" />}
                      {viewBy === 'Route' && <MapPin className="h-3 w-3 text-slate-400" />}
                      {viewBy === 'Month' && <Calendar className="h-3 w-3 text-slate-400" />}
                      <span className={isLight ? 'text-sky-800' : 'text-sky-400'}>{item.name}</span>
                    </td>

                    {viewBy === 'Aircraft' && (
                      <td className={`px-4 py-3 font-sans font-semibold whitespace-nowrap ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {item.typeLabel}
                      </td>
                    )}

                    <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{item.sectorsCount}</td>
                    <td className={`px-4 py-3 text-right font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.capacity.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{item.salesPax.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.finalManifestPax.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{item.loadFactor.toFixed(1)}%</td>
                    <td className={`px-4 py-3 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>${item.grossSales.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>${item.flownRevenue.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>${item.heldRevenue.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>${item.refundedAmount.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>${item.rebookedRevenue.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>${item.noShowRevenue.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>${item.revenuePerFlight.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>${item.revenuePerPassenger.toFixed(1)}</td>
                    
                    <td className="px-4 py-3 text-center whitespace-nowrap font-sans">
                      <button
                        onClick={() => {
                          setDrillDownType(viewBy.toUpperCase() as any);
                          setDrillDownId(item.id);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded border transition cursor-pointer flex items-center gap-1 mx-auto ${
                          isLight
                            ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                            : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/20'
                        }`}
                      >
                        <Eye className="h-3 w-3" />
                        View Sectors
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. Passenger Tickets Ledger Detail Sub-Filtered Modal */}
      {selectedFlightReport && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className={`w-full max-w-5xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0F1117] border-white/10 text-white'
          }`}>
            {/* Modal Header */}
            <div className={`border-b px-5 py-4 flex items-center justify-between ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161920] border-white/10'
            }`}>
              <div className="space-y-0.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                  isLight ? 'text-sky-700' : 'text-sky-400'
                }`}>
                  Passenger Tickets Reconciliation Audit Report
                </span>
                <h4 className={`text-sm font-black font-mono flex items-center gap-2 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Flight {selectedFlightReport.flightNumber} ({selectedFlightReport.flightDate})
                  <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>|</span>
                  <span className={`font-sans text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {selectedFlightReport.route}
                  </span>
                  <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>|</span>
                  <span className={`font-mono text-xs font-bold uppercase ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                    ✈️ {selectedFlightReport.aircraftRegistration}
                  </span>
                </h4>
              </div>
              <button
                onClick={() => setSelectedFlightReport(null)}
                className={`p-1.5 rounded-lg border transition ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900 bg-slate-200/60 hover:bg-slate-200 border-slate-300'
                    : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Sub-Filters and Audit Overview */}
            <div className={`border-b p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#15181E] border-white/5'
            }`}>
              {/* Keyword Filter */}
              <div className="space-y-1">
                <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Filter PNR, ID or Name</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, PNR, ticket ID..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className={`w-full rounded border py-1.5 pl-8 pr-2 text-xs outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-600'
                        : 'bg-[#0F1117] border-white/10 text-white placeholder-slate-500 focus:border-sky-500/50'
                    }`}
                  />
                </div>
              </div>

              {/* Travel Status */}
              <div className="space-y-1">
                <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Travel Status</label>
                <select
                  value={modalTravelStatus}
                  onChange={(e) => setModalTravelStatus(e.target.value as any)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-600'
                      : 'bg-[#0F1117] border-white/10 text-white focus:border-sky-500/50'
                  }`}
                >
                  <option value="ALL">All Travel Statuses</option>
                  <option value="FLOWN">FLOWN</option>
                  <option value="NOT_FLOWN">NOT FLOWN</option>
                </select>
              </div>

              {/* Revenue Status */}
              <div className="space-y-1">
                <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Revenue Status</label>
                <select
                  value={modalRevenueStatus}
                  onChange={(e) => setModalRevenueStatus(e.target.value as any)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-600'
                      : 'bg-[#0F1117] border-white/10 text-white focus:border-sky-500/50'
                  }`}
                >
                  <option value="ALL">All Revenue Statuses</option>
                  <option value="FLOWN">FLOWN</option>
                  <option value="HELD_PENDING">HELD PENDING</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="REBOOKED">REBOOKED</option>
                  <option value="NO_SHOW_RECOGNIZED">NO SHOW RECOGNIZED</option>
                </select>
              </div>

              {/* Fare Class */}
              <div className="space-y-1">
                <label className={`text-[9px] uppercase font-bold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Fare Class</label>
                <select
                  value={modalFareClass}
                  onChange={(e) => setModalFareClass(e.target.value as any)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-600'
                      : 'bg-[#0F1117] border-white/10 text-white focus:border-sky-500/50'
                  }`}
                >
                  <option value="ALL">All Fare Classes</option>
                  <option value="First Class">First Class</option>
                  <option value="Business">Business</option>
                  <option value="Premium Economy">Premium Economy</option>
                  <option value="Economy">Economy</option>
                </select>
              </div>
            </div>

            {/* Formal Audit Comment Section */}
            <div className={`p-4 border-b space-y-2 ${
              isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-[#12141C] border-white/5'
            }`}>
              <h5 className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-emerald-800' : 'text-emerald-400'
              }`}>
                <ShieldCheck className="h-4 w-4" /> Official Reconciliation & Internal Controls Narrative
              </h5>
              <p className={`text-[11px] leading-relaxed font-sans ${
                isLight ? 'text-slate-700' : 'text-slate-400'
              }`}>
                Passenger ledger control verifies that out of <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedFlightReport.salesPax}</span> sold tickets, <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{selectedFlightReport.finalManifestPax}</span> passengers successfully boarded and were transmitted on the final aircraft manifest. Unused tickets have been automatically adjusted across regulatory held, refunded, and rebooked accounting codes according to airline standards, reconciling Gross Sales (<span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>${selectedFlightReport.grossSales.toLocaleString()}</span>) to Flown, Held, and Adjustments down to $0 unexplained variance.
              </p>
            </div>

            {/* Ticket List Body */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className={`overflow-hidden border rounded-xl ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161920]/20 border-white/5'
              }`}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`font-bold text-[9px] uppercase tracking-wider border-b ${
                      isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#161920] text-slate-400 border-white/10'
                    }`}>
                      <th className="px-4 py-3">Ticket ID</th>
                      <th className="px-4 py-3">Passenger ID</th>
                      <th className="px-4 py-3">Passenger Name</th>
                      <th className="px-4 py-3">PNR</th>
                      <th className="px-4 py-3">Fare Class</th>
                      <th className="px-4 py-3 text-right">Ticket Value</th>
                      <th className="px-4 py-3 text-center">Travel Status</th>
                      <th className="px-4 py-3 text-center">Revenue Status</th>
                      <th className="px-4 py-3 text-right">Refund Amount</th>
                      <th className="px-4 py-3 text-left">Destination Rebook</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono text-[11px] ${
                    isLight ? 'divide-slate-200' : 'divide-white/5'
                  }`}>
                    {modalFilteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={10} className={`px-4 py-8 text-center font-sans ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                          No passenger tickets matched the selected sub-filters.
                        </td>
                      </tr>
                    ) : (
                      modalFilteredTickets.map((t: any) => (
                        <tr key={t.ticketId} className={`transition ${
                          isLight
                            ? t.isTransferredIn ? 'bg-indigo-50 hover:bg-indigo-100/60' : 'hover:bg-slate-50'
                            : t.isTransferredIn ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/[2%]'
                        }`}>
                          <td className={`px-4 py-2.5 font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                            {t.ticketId}
                            {t.isTransferredIn && (
                              <span className={`text-[8px] px-1 py-0.5 rounded ml-1.5 uppercase font-bold tracking-wide border ${
                                isLight
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                              }`}>
                                Transferred In
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-2.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{t.passengerId}</td>
                          <td className={`px-4 py-2.5 font-sans font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.maskedPassengerName}</td>
                          <td className={`px-4 py-2.5 font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{t.PNR}</td>
                          <td className="px-4 py-2.5 font-sans">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                              isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-white/5 text-slate-300 border-white/5'
                            }`}>
                              {t.fareClass}
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>${t.ticketValue.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-center font-sans">
                            <span className={`inline-block text-[9px] font-bold border rounded px-1.5 py-0.5 ${
                              t.travelStatus === 'FLOWN'
                                ? isLight ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                            }`}>
                              {t.travelStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-sans">
                            <span className={`inline-block text-[9px] font-bold border rounded px-1.5 py-0.5 ${
                              t.revenueStatus === 'FLOWN' ? (isLight ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400') :
                              t.revenueStatus === 'HELD_PENDING' ? (isLight ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-400') :
                              t.revenueStatus === 'REFUNDED' ? (isLight ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-rose-500/10 border-rose-500/20 text-rose-400') :
                              t.revenueStatus === 'REBOOKED' ? (isLight ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400') :
                              t.revenueStatus === 'NO_SHOW_RECOGNIZED' ? (isLight ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-purple-500/10 border-purple-500/20 text-purple-400') :
                              (isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-500/10 border-slate-500/20 text-slate-400')
                            }`}>
                              {t.revenueStatus}
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 text-right ${isLight ? 'text-rose-700 font-bold' : 'text-rose-400'}`}>${t.refundAmount.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-left font-sans text-xs ${isLight ? 'text-indigo-800' : 'text-indigo-300'}`}>
                            {t.rebookedToFlightId ? (
                              <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] border ${
                                isLight ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                              }`}>
                                ✈️ {t.rebookedToFlightId}
                              </span>
                            ) : (
                              <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`border-t px-5 py-3.5 flex items-center justify-end ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161920] border-white/10'
            }`}>
              <button
                onClick={() => setSelectedFlightReport(null)}
                className={`px-4 py-2 text-xs font-bold border rounded-xl transition cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-sm'
                    : 'bg-[#1A1D23] hover:bg-[#232730] text-white border-white/10'
                }`}
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
