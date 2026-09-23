import React, { useState, useMemo } from 'react';
import { Flight, DigitalAPB, StationCode } from '../types';
import { generateHistoricalFlights, getPreviousThreeMonthsRange } from '../historicalData';
import { STATIONS } from '../data';
import {
  generateEnhancedManifest,
  downloadEnhancedManifestTxt,
  EnhancedManifestData,
} from '../lib/enhancedManifestGenerator';
import { EnhancedManifestModal } from './EnhancedManifestModal';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Percent,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertCircle,
  Info,
  Layers,
  BarChart3,
  MapPin,
  Plane,
  UserCheck,
  AlertOctagon,
  FileText,
} from 'lucide-react';

interface HQHistoricalDashboardProps {
  theme: 'light' | 'dark';
  dbFlights?: Flight[];
  apbs?: DigitalAPB[];
}

export default function HQHistoricalDashboard({ theme, dbFlights, apbs }: HQHistoricalDashboardProps) {
  const isLight = theme === 'light';

  // Dynamic rolling 3-month reporting period display calculation
  const { reportingPeriodLabel, todayStr, yesterdayStr, last7DaysStr, currentMonthStr, prevMonthStr } = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = startMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const endStr = endMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const today = new Date();
    const tStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    const last7 = new Date(today);
    last7.setDate(last7.getDate() - 7);
    const l7Str = last7.toISOString().split('T')[0];

    const cMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const prevMDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const pMonthStr = `${prevMDate.getFullYear()}-${String(prevMDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      reportingPeriodLabel: `${startStr} – ${endStr}`,
      todayStr: tStr,
      yesterdayStr: yStr,
      last7DaysStr: l7Str,
      currentMonthStr: cMonthStr,
      prevMonthStr: pMonthStr,
    };
  }, []);

  // 1. Core State with in-memory baseline + real completed flights from IndexedDB
  const allHistoricalFlights = useMemo(() => {
    const { start, end } = getPreviousThreeMonthsRange();
    const synthetic = generateHistoricalFlights().filter((f) => {
      const d = new Date(f.scheduledDeparture);
      return d >= start && d <= end;
    });
    const realCompleted = dbFlights
      ? dbFlights.filter((f) => {
          const d = new Date(f.scheduledDeparture);
          return f.movementStatus === 'COMPLETED' && d >= start && d <= end;
        })
      : [];

    // Merge datasets based on stable flight identity to prevent double counting
    const mergedMap = new Map<string, Flight>();
    synthetic.forEach((f) => {
      const key = `${f.flightNumber}_${f.flightDate}_${f.origin}_${f.destination}_${f.scheduledDeparture}`;
      mergedMap.set(key, f);
    });
    realCompleted.forEach((f) => {
      const key = `${f.flightNumber}_${f.flightDate}_${f.origin}_${f.destination}_${f.scheduledDeparture}`;
      mergedMap.set(key, f);
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.scheduledDeparture).getTime() - new Date(a.scheduledDeparture).getTime()
    );
  }, [dbFlights]);

  // Available routes list for dropdown
  const availableRoutes = useMemo(() => {
    const routesSet = new Set<string>();
    allHistoricalFlights.forEach((f) => {
      routesSet.add(`${f.origin}-${f.destination}`);
    });
    return Array.from(routesSet).sort();
  }, [allHistoricalFlights]);

  // Available aircraft types
  const availableAircraftTypes = useMemo(() => {
    const set = new Set<string>();
    allHistoricalFlights.forEach((f) => {
      if (f.aircraft?.type) set.add(f.aircraft.type);
    });
    return Array.from(set).sort();
  }, [allHistoricalFlights]);

  // PRIMARY FILTERS STATE
  const [periodFilter, setPeriodFilter] = useState<
    'ROLLING_3_MONTHS' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'CUSTOM_RANGE'
  >('ROLLING_3_MONTHS');
  const [stationFilter, setStationFilter] = useState<'ALL' | StationCode>('ALL');
  const [stationRoleFilter, setStationRoleFilter] = useState<'ALL' | 'ORIGIN' | 'DESTINATION'>('ALL');
  const [routeFilter, setRouteFilter] = useState<string>('');
  const [movementStatusFilter, setMovementStatusFilter] = useState<string>('');
  const [reconciliationFilter, setReconciliationFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [loadFactorFilter, setLoadFactorFilter] = useState<string>('');

  // ADVANCED FILTERS COLLAPSIBLE STATE
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [flightNumberSearch, setFlightNumberSearch] = useState<string>('');
  const [aircraftTypeFilter, setAircraftTypeFilter] = useState<string>('');
  const [aircraftRegSearch, setAircraftRegSearch] = useState<string>('');
  const [paxVarianceFilter, setPaxVarianceFilter] = useState<string>('');
  const [delayBandFilter, setDelayBandFilter] = useState<string>('');
  const [apbAuditStatusFilter, setApbAuditStatusFilter] = useState<string>('');
  const [originFilter, setOriginFilter] = useState<string>('');
  const [destinationFilter, setDestinationFilter] = useState<string>('');
  const [dataQualityFilter, setDataQualityFilter] = useState<string>('');
  const [specificDateFilter, setSpecificDateFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // SORTING STATE
  const [sortField, setSortField] = useState<'flightDate' | 'flightNumber' | 'loadFactor' | 'discrepancy' | 'severity'>('flightDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ENHANCED PASSENGER MANIFEST MODAL STATE
  const [selectedManifest, setSelectedManifest] = useState<EnhancedManifestData | null>(null);

  // RESET / CLEAR ALL FILTERS
  const handleResetFilters = () => {
    setPeriodFilter('ROLLING_3_MONTHS');
    setStationFilter('ALL');
    setStationRoleFilter('ALL');
    setRouteFilter('');
    setMovementStatusFilter('');
    setReconciliationFilter('');
    setSeverityFilter('');
    setLoadFactorFilter('');

    setFlightNumberSearch('');
    setAircraftTypeFilter('');
    setAircraftRegSearch('');
    setPaxVarianceFilter('');
    setDelayBandFilter('');
    setApbAuditStatusFilter('');
    setOriginFilter('');
    setDestinationFilter('');
    setDataQualityFilter('');
    setSpecificDateFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  // Count active advanced filters
  const activeAdvancedCount = useMemo(() => {
    let count = 0;
    if (flightNumberSearch) count++;
    if (aircraftTypeFilter) count++;
    if (aircraftRegSearch) count++;
    if (paxVarianceFilter) count++;
    if (delayBandFilter) count++;
    if (apbAuditStatusFilter) count++;
    if (originFilter) count++;
    if (destinationFilter) count++;
    if (dataQualityFilter) count++;
    if (specificDateFilter) count++;
    if (startDateFilter || endDateFilter) count++;
    return count;
  }, [
    flightNumberSearch,
    aircraftTypeFilter,
    aircraftRegSearch,
    paxVarianceFilter,
    delayBandFilter,
    apbAuditStatusFilter,
    originFilter,
    destinationFilter,
    dataQualityFilter,
    specificDateFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Map helper for quick APB status lookup
  const apbMap = useMemo(() => {
    const map = new Map<string, DigitalAPB>();
    if (apbs) {
      apbs.forEach((a) => {
        if (a.flightId) map.set(a.flightId, a);
        map.set(a.id, a);
      });
    }
    return map;
  }, [apbs]);

  // MULTIDIMENSIONAL FILTER COMBINED LOGIC
  const filteredFlights = useMemo(() => {
    return allHistoricalFlights.filter((f) => {
      const sales = f.passengerSources?.sales?.breakdown?.total || 0;
      const checkIn = f.passengerSources?.checkIn?.breakdown?.total || 0;
      const boarding = f.passengerSources?.boarding?.breakdown?.total || 0;
      const offload = f.passengerSources?.offload?.breakdown?.total || 0;
      const noShow = f.passengerSources?.noShow?.breakdown?.total || 0;
      const capacity = f.aircraft?.capacity || 180;
      const paxDiff = Math.abs(sales - boarding);
      const isCancelled = f.movementStatus === 'CANCELLED';
      const delayMins = f.delayMinutes || 0;
      const lf = capacity ? (boarding / capacity) * 100 : 0;

      // APB lookup
      const linkedApb = apbMap.get(f.id) || (f.apbId ? apbMap.get(f.apbId) : null);
      const apbStatus = linkedApb ? linkedApb.status : f.apbId ? 'STATION_CHECKED' : 'NOT_CREATED';

      // Computed Severity
      let computedSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL' = 'NORMAL';
      if (paxDiff >= 5 || boarding > capacity || isCancelled || delayMins > 60 || !f.apbId) {
        computedSeverity = 'CRITICAL';
      } else if (paxDiff >= 3 || (delayMins >= 31 && delayMins <= 60)) {
        computedSeverity = 'HIGH';
      } else if (paxDiff >= 1 || (delayMins >= 16 && delayMins <= 30)) {
        computedSeverity = 'MEDIUM';
      } else if (delayMins >= 1 && delayMins <= 15) {
        computedSeverity = 'LOW';
      }

      // 1. PERIOD FILTER
      if (periodFilter === 'TODAY' && f.flightDate !== todayStr) return false;
      if (periodFilter === 'YESTERDAY' && f.flightDate !== yesterdayStr) return false;
      if (periodFilter === 'LAST_7_DAYS' && f.flightDate < last7DaysStr) return false;
      if (periodFilter === 'CURRENT_MONTH' && !f.flightDate.startsWith(currentMonthStr)) return false;
      if (periodFilter === 'PREVIOUS_MONTH' && !f.flightDate.startsWith(prevMonthStr)) return false;
      if (periodFilter === 'CUSTOM_RANGE') {
        if (startDateFilter && f.flightDate < startDateFilter) return false;
        if (endDateFilter && f.flightDate > endDateFilter) return false;
      }

      // 2. STATION FILTER
      if (stationFilter !== 'ALL') {
        if (stationRoleFilter === 'ORIGIN' && f.origin !== stationFilter) return false;
        if (stationRoleFilter === 'DESTINATION' && f.destination !== stationFilter) return false;
        if (stationRoleFilter === 'ALL' && f.origin !== stationFilter && f.destination !== stationFilter) return false;
      }

      // 3. ROUTE FILTER
      if (routeFilter && `${f.origin}-${f.destination}` !== routeFilter) return false;

      // 4. MOVEMENT STATUS FILTER
      if (movementStatusFilter && f.movementStatus !== movementStatusFilter) return false;

      // 5. RECONCILIATION FILTER
      if (reconciliationFilter) {
        if (reconciliationFilter === 'RECONCILED') {
          if (sales !== checkIn || checkIn !== boarding || offload > 0 || noShow > 0) return false;
        } else if (reconciliationFilter === 'PENDING_RECON') {
          if (sales === boarding && checkIn === boarding) return false;
        } else if (reconciliationFilter === 'SALES_VS_CHECKIN') {
          if (sales === checkIn) return false;
        } else if (reconciliationFilter === 'GATE_NOSHOW_OFFLOAD') {
          if (offload === 0 && noShow === 0) return false;
        } else if (reconciliationFilter === 'BOARDED_VS_MANIFEST') {
          if (boarding === checkIn && boarding === sales) return false;
        } else if (reconciliationFilter === 'EXCESS_PAX') {
          if (boarding <= sales) return false;
        } else if (reconciliationFilter === 'MISSING_MANIFEST') {
          if (f.apbId) return false;
        } else if (reconciliationFilter === 'CRITICAL_DISCREPANCY') {
          if (paxDiff < 3 && boarding <= capacity) return false;
        }
      }

      // 6. SEVERITY FILTER
      if (severityFilter && computedSeverity !== severityFilter) return false;

      // 7. LOAD FACTOR FILTER
      if (loadFactorFilter) {
        if (loadFactorFilter === 'UNDER_50' && lf >= 50) return false;
        if (loadFactorFilter === 'LF_50_69' && (lf < 50 || lf >= 70)) return false;
        if (loadFactorFilter === 'LF_70_84' && (lf < 70 || lf >= 85)) return false;
        if (loadFactorFilter === 'LF_85_94' && (lf < 85 || lf >= 95)) return false;
        if (loadFactorFilter === 'LF_95_PLUS' && (lf < 95 || lf > 100)) return false;
        if (loadFactorFilter === 'OVER_CAPACITY' && lf <= 100 && boarding <= capacity) return false;
      }

      // ADVANCED FILTERS
      if (flightNumberSearch && !f.flightNumber.toLowerCase().includes(flightNumberSearch.toLowerCase())) {
        return false;
      }
      if (aircraftTypeFilter && f.aircraft?.type !== aircraftTypeFilter) return false;
      if (aircraftRegSearch && !f.aircraft?.registration.toLowerCase().includes(aircraftRegSearch.toLowerCase())) {
        return false;
      }
      if (paxVarianceFilter) {
        if (paxVarianceFilter === 'VAR_0' && paxDiff !== 0) return false;
        if (paxVarianceFilter === 'VAR_1_2' && (paxDiff < 1 || paxDiff > 2)) return false;
        if (paxVarianceFilter === 'VAR_3_5' && (paxDiff < 3 || paxDiff > 5)) return false;
        if (paxVarianceFilter === 'VAR_6_10' && (paxDiff < 6 || paxDiff > 10)) return false;
        if (paxVarianceFilter === 'VAR_GT_10' && paxDiff <= 10) return false;
      }
      if (delayBandFilter) {
        if (delayBandFilter === 'ON_TIME' && (delayMins > 0 || isCancelled)) return false;
        if (delayBandFilter === 'BAND_1_15' && (delayMins < 1 || delayMins > 15)) return false;
        if (delayBandFilter === 'BAND_16_30' && (delayMins < 16 || delayMins > 30)) return false;
        if (delayBandFilter === 'BAND_31_60' && (delayMins < 31 || delayMins > 60)) return false;
        if (delayBandFilter === 'BAND_GT_60' && delayMins <= 60) return false;
      }
      if (apbAuditStatusFilter) {
        if (apbAuditStatusFilter === 'NOT_CREATED' && apbStatus !== 'NOT_CREATED') return false;
        if (apbAuditStatusFilter === 'DRAFT' && apbStatus !== 'PREPARED' && apbStatus !== 'FLIGHT_ATTENDANT_IN_PROGRESS') return false;
        if (apbAuditStatusFilter === 'SUBMITTED' && apbStatus !== 'FA_SUBMITTED' && apbStatus !== 'SENT_TO_SERVER') return false;
        if (apbAuditStatusFilter === 'STATION_CHECKED' && apbStatus !== 'STATION_CHECKED') return false;
        if (apbAuditStatusFilter === 'PENDING_HQ' && apbStatus !== 'SENT_TO_SERVER' && apbStatus !== 'STATION_CHECKED') return false;
        if (apbAuditStatusFilter === 'APPROVED' && apbStatus !== 'COMPLETED' && apbStatus !== 'HQ_REVIEWED') return false;
        if (apbAuditStatusFilter === 'REJECTED' && !apbStatus.includes('RETURNED')) return false;
        if (apbAuditStatusFilter === 'SEALED' && apbStatus !== 'COMPLETED') return false;
      }
      if (originFilter && f.origin !== originFilter) return false;
      if (destinationFilter && f.destination !== destinationFilter) return false;
      if (dataQualityFilter) {
        if (dataQualityFilter === 'COMPLETE' && (!f.apbId || sales === 0 || boarding === 0 || boarding > capacity)) return false;
        if (dataQualityFilter === 'MISSING_DATA' && (f.apbId && sales > 0 && boarding > 0)) return false;
        if (dataQualityFilter === 'INVALID_PAX' && (sales >= 0 && boarding >= 0)) return false;
        if (dataQualityFilter === 'CAPACITY_VIOLATION' && boarding <= capacity) return false;
        if (dataQualityFilter === 'STALE_DATA' && delayMins <= 120) return false;
        if (dataQualityFilter === 'UNRECONCILED' && sales === boarding) return false;
      }
      if (specificDateFilter && f.flightDate !== specificDateFilter) return false;

      return true;
    });
  }, [
    allHistoricalFlights,
    apbMap,
    periodFilter,
    todayStr,
    yesterdayStr,
    last7DaysStr,
    currentMonthStr,
    prevMonthStr,
    stationFilter,
    stationRoleFilter,
    routeFilter,
    movementStatusFilter,
    reconciliationFilter,
    severityFilter,
    loadFactorFilter,
    flightNumberSearch,
    aircraftTypeFilter,
    aircraftRegSearch,
    paxVarianceFilter,
    delayBandFilter,
    apbAuditStatusFilter,
    originFilter,
    destinationFilter,
    dataQualityFilter,
    specificDateFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // SORTING LOGIC
  const sortedFlights = useMemo(() => {
    const list = [...filteredFlights];
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof Flight] || '';
      let valB: any = b[sortField as keyof Flight] || '';

      if (sortField === 'loadFactor') {
        const capA = a.aircraft?.capacity || 1;
        const actA = a.passengerSources?.boarding?.breakdown?.total || 0;
        valA = (actA / capA) * 100;

        const capB = b.aircraft?.capacity || 1;
        const actB = b.passengerSources?.boarding?.breakdown?.total || 0;
        valB = (actB / capB) * 100;
      } else if (sortField === 'discrepancy') {
        const salesA = a.passengerSources?.sales?.breakdown?.total || 0;
        const actA = a.passengerSources?.boarding?.breakdown?.total || 0;
        valA = a.movementStatus === 'CANCELLED' ? 0 : Math.abs(salesA - actA);

        const salesB = b.passengerSources?.sales?.breakdown?.total || 0;
        const actB = b.passengerSources?.boarding?.breakdown?.total || 0;
        valB = b.movementStatus === 'CANCELLED' ? 0 : Math.abs(salesB - actB);
      } else if (sortField === 'severity') {
        const getSevRank = (f: Flight) => {
          const s = f.passengerSources?.sales?.breakdown?.total || 0;
          const b = f.passengerSources?.boarding?.breakdown?.total || 0;
          const diff = Math.abs(s - b);
          if (diff >= 5 || f.movementStatus === 'CANCELLED' || f.delayMinutes > 60) return 5;
          if (diff >= 3 || f.delayMinutes >= 31) return 4;
          if (diff >= 1 || f.delayMinutes >= 16) return 3;
          if (f.delayMinutes >= 1) return 2;
          return 1;
        };
        valA = getSevRank(a);
        valB = getSevRank(b);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredFlights, sortField, sortOrder]);

  // MANAGEMENT KPI SUMMARY CALCULATIONS
  const stats = useMemo(() => {
    let totalFiltered = filteredFlights.length;
    let flightsAffected = 0;
    let discrepantFlightsCount = 0;
    let totalPaxVariance = 0;
    let totalBoarding = 0;
    let totalCapacity = 0;
    let delayedFlightsCount = 0;
    let totalDelayDuration = 0;
    let pendingHqReviewCount = 0;
    let loadFactors: number[] = [];

    const routeIssueCounts: Record<string, number> = {};
    const severityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      NORMAL: 0,
    };

    filteredFlights.forEach((f) => {
      const sales = f.passengerSources?.sales?.breakdown?.total || 0;
      const boarding = f.passengerSources?.boarding?.breakdown?.total || 0;
      const capacity = f.aircraft?.capacity || 180;
      const paxDiff = Math.abs(sales - boarding);
      const isCancelled = f.movementStatus === 'CANCELLED';
      const isDelayed = f.movementStatus === 'DELAYED' || (f.delayMinutes && f.delayMinutes > 0);
      const routeStr = `${f.origin}-${f.destination}`;

      const linkedApb = apbMap.get(f.id) || (f.apbId ? apbMap.get(f.apbId) : null);
      const apbStatus = linkedApb ? linkedApb.status : f.apbId ? 'STATION_CHECKED' : 'NOT_CREATED';

      // Computed severity
      let sev: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL' = 'NORMAL';
      if (paxDiff >= 5 || boarding > capacity || isCancelled || f.delayMinutes > 60 || !f.apbId) {
        sev = 'CRITICAL';
      } else if (paxDiff >= 3 || (f.delayMinutes >= 31 && f.delayMinutes <= 60)) {
        sev = 'HIGH';
      } else if (paxDiff >= 1 || (f.delayMinutes >= 16 && f.delayMinutes <= 30)) {
        sev = 'MEDIUM';
      } else if (f.delayMinutes >= 1 && f.delayMinutes <= 15) {
        sev = 'LOW';
      }
      severityCounts[sev]++;

      let isAffected = false;
      if (paxDiff > 0 || isDelayed || isCancelled || !f.apbId) {
        isAffected = true;
        flightsAffected++;
        routeIssueCounts[routeStr] = (routeIssueCounts[routeStr] || 0) + 1;
      }

      if (paxDiff > 0 && !isCancelled) {
        discrepantFlightsCount++;
        totalPaxVariance += paxDiff;
      }

      if (!isCancelled) {
        totalBoarding += boarding;
        totalCapacity += capacity;
        const lf = (boarding / capacity) * 100;
        loadFactors.push(lf);
      }

      if (isDelayed) {
        delayedFlightsCount++;
        totalDelayDuration += f.delayMinutes || 0;
      }

      if (apbStatus === 'SENT_TO_SERVER' || apbStatus === 'STATION_CHECKED') {
        pendingHqReviewCount++;
      }
    });

    const discrepancyRate = totalFiltered > 0 ? Math.round((discrepantFlightsCount / totalFiltered) * 1000) / 10 : 0;
    const avgLoadFactor = loadFactors.length ? Math.round((loadFactors.reduce((a, b) => a + b, 0) / loadFactors.length) * 10) / 10 : 0;

    // Determine Top Problematic Route
    let topProblematicRoute = 'N/A (No Issues)';
    let topRouteCode = 'None';
    let topRouteAffectedCount = 0;
    Object.entries(routeIssueCounts).forEach(([rt, count]) => {
      if (count > topRouteAffectedCount) {
        topRouteAffectedCount = count;
        topRouteCode = rt;
        topProblematicRoute = `${rt} (${count} issues)`;
      }
    });

    return {
      totalFiltered,
      flightsAffected,
      discrepantFlightsCount,
      discrepancyRate,
      totalPaxVariance,
      avgLoadFactor,
      delayedFlightsCount,
      totalDelayDuration,
      pendingHqReviewCount,
      topProblematicRoute,
      topRouteCode,
      topRouteAffectedCount,
      severityCounts,
    };
  }, [filteredFlights, apbMap]);

  // OVERALL MASTER DATASET IMPACT METRICS
  const masterStats = useMemo(() => {
    const totalMaster = allHistoricalFlights.length;
    let masterAffectedCount = 0;
    let masterDiscrepantCount = 0;
    let masterTotalPaxVariance = 0;
    let masterDelayedCount = 0;
    let masterPendingHqCount = 0;
    let masterLoadFactors: number[] = [];

    allHistoricalFlights.forEach((f) => {
      const sales = f.passengerSources?.sales?.breakdown?.total || 0;
      const boarding = f.passengerSources?.boarding?.breakdown?.total || 0;
      const capacity = f.aircraft?.capacity || 180;
      const paxDiff = Math.abs(sales - boarding);
      const isCancelled = f.movementStatus === 'CANCELLED';
      const isDelayed = f.movementStatus === 'DELAYED' || (f.delayMinutes && f.delayMinutes > 0);

      const linkedApb = apbMap.get(f.id) || (f.apbId ? apbMap.get(f.apbId) : null);
      const apbStatus = linkedApb ? linkedApb.status : f.apbId ? 'STATION_CHECKED' : 'NOT_CREATED';

      if (paxDiff > 0 || isDelayed || isCancelled || !f.apbId) {
        masterAffectedCount++;
      }
      if (paxDiff > 0 && !isCancelled) {
        masterDiscrepantCount++;
        masterTotalPaxVariance += paxDiff;
      }
      if (!isCancelled) {
        const lf = (boarding / capacity) * 100;
        masterLoadFactors.push(lf);
      }
      if (isDelayed) {
        masterDelayedCount++;
      }
      if (apbStatus === 'SENT_TO_SERVER' || apbStatus === 'STATION_CHECKED') {
        masterPendingHqCount++;
      }
    });

    const masterDiscrepancyRate = totalMaster > 0 ? Math.round((masterDiscrepantCount / totalMaster) * 1000) / 10 : 0;
    const masterAvgLoadFactor = masterLoadFactors.length
      ? Math.round((masterLoadFactors.reduce((a, b) => a + b, 0) / masterLoadFactors.length) * 10) / 10
      : 0;

    return {
      totalMaster,
      masterAffectedCount,
      masterDiscrepantCount,
      masterDiscrepancyRate,
      masterTotalPaxVariance,
      masterDelayedCount,
      masterPendingHqCount,
      masterAvgLoadFactor,
    };
  }, [allHistoricalFlights, apbMap]);

  // HQ ACTION PRIORITY SPECIFIC METRICS (CALCULATED FROM FILTERED DATASET)
  const hqActionPriorityStats = useMemo(() => {
    let criticalCount = 0;
    let pendingHqCount = 0;
    let unreconciledCount = 0;
    let oldestDate: Date | null = null;
    const uniqueActionableFlightIds = new Set<string>();

    filteredFlights.forEach((f) => {
      const sales = f.passengerSources?.sales?.breakdown?.total || 0;
      const checkIn = f.passengerSources?.checkIn?.breakdown?.total || 0;
      const boarding = f.passengerSources?.boarding?.breakdown?.total || 0;
      const offload = f.passengerSources?.offload?.breakdown?.total || 0;
      const noShow = f.passengerSources?.noShow?.breakdown?.total || 0;
      const capacity = f.aircraft?.capacity || 180;
      const paxDiff = Math.abs(sales - boarding);
      const isCancelled = f.movementStatus === 'CANCELLED';
      const delayMins = f.delayMinutes || 0;

      const linkedApb = apbMap.get(f.id) || (f.apbId ? apbMap.get(f.apbId) : null);
      const apbStatus = linkedApb ? linkedApb.status : f.apbId ? 'STATION_CHECKED' : 'NOT_CREATED';

      const isCritical = paxDiff >= 5 || boarding > capacity || isCancelled || delayMins > 60 || !f.apbId;
      if (isCritical) criticalCount++;

      const isPendingHQ = apbStatus === 'SENT_TO_SERVER' || apbStatus === 'STATION_CHECKED';
      if (isPendingHQ) pendingHqCount++;

      const isUnreconciled = !isCancelled && (sales !== boarding || checkIn !== boarding || offload > 0 || noShow > 0);
      if (isUnreconciled) unreconciledCount++;

      if (isCritical || isPendingHQ || isUnreconciled) {
        uniqueActionableFlightIds.add(f.id);

        const fDate = new Date(f.scheduledDeparture || f.flightDate);
        if (!isNaN(fDate.getTime())) {
          if (!oldestDate || fDate < oldestDate) {
            oldestDate = fDate;
          }
        }
      }
    });

    let oldestUnresolvedAgeStr = 'None';
    if (oldestDate) {
      const now = new Date();
      const diffMs = now.getTime() - oldestDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) oldestUnresolvedAgeStr = 'Today';
      else if (diffDays === 1) oldestUnresolvedAgeStr = '1 day ago';
      else oldestUnresolvedAgeStr = `${diffDays} days ago`;
    }

    const uniqueActionableCount = uniqueActionableFlightIds.size;
    const hasActionableRecords = uniqueActionableCount > 0;

    return {
      criticalCount,
      pendingHqCount,
      unreconciledCount,
      uniqueActionableCount,
      oldestUnresolvedAgeStr,
      topRoute: stats.topProblematicRoute,
      hasActionableRecords,
    };
  }, [filteredFlights, apbMap, stats.topProblematicRoute]);

  // ACTIVE FILTER CHIPS DERIVATION
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove?: () => void }[] = [];

    if (periodFilter !== 'ROLLING_3_MONTHS') {
      const periodLabels: Record<string, string> = {
        TODAY: 'Today',
        YESTERDAY: 'Yesterday',
        LAST_7_DAYS: 'Last 7 Days',
        CURRENT_MONTH: 'Current Month',
        PREVIOUS_MONTH: 'Previous Month',
        CUSTOM_RANGE: 'Custom Range',
      };
      chips.push({
        key: 'period',
        label: periodLabels[periodFilter] || periodFilter,
        onRemove: () => setPeriodFilter('ROLLING_3_MONTHS'),
      });
    }

    if (stationFilter !== 'ALL') {
      const roleStr = stationRoleFilter === 'ORIGIN' ? ' (Origin)' : stationRoleFilter === 'DESTINATION' ? ' (Dest)' : '';
      chips.push({
        key: 'station',
        label: `Station: ${stationFilter}${roleStr}`,
        onRemove: () => {
          setStationFilter('ALL');
          setStationRoleFilter('ALL');
        },
      });
    }

    if (routeFilter) {
      chips.push({
        key: 'route',
        label: `Route: ${routeFilter}`,
        onRemove: () => setRouteFilter(''),
      });
    }

    if (movementStatusFilter) {
      chips.push({
        key: 'movementStatus',
        label: `Status: ${movementStatusFilter}`,
        onRemove: () => setMovementStatusFilter(''),
      });
    }

    if (reconciliationFilter) {
      const reconLabels: Record<string, string> = {
        RECONCILED: 'Reconciled',
        PENDING_RECON: 'Pending Recon',
        SALES_VS_CHECKIN: 'Sales vs Check-in Mismatch',
        GATE_NOSHOW_OFFLOAD: 'Gate No-show/Offload',
        BOARDED_VS_MANIFEST: 'Boarded vs Manifest Mismatch',
        EXCESS_PAX: 'Excess Pax',
        MISSING_MANIFEST: 'Missing Manifest',
        CRITICAL_DISCREPANCY: 'Critical Discrepancy',
      };
      chips.push({
        key: 'recon',
        label: reconLabels[reconciliationFilter] || reconciliationFilter,
        onRemove: () => setReconciliationFilter(''),
      });
    }

    if (severityFilter) {
      chips.push({
        key: 'severity',
        label: `Severity: ${severityFilter}`,
        onRemove: () => setSeverityFilter(''),
      });
    }

    if (loadFactorFilter) {
      const lfLabels: Record<string, string> = {
        UNDER_50: 'LF <50%',
        LF_50_69: 'LF 50–69%',
        LF_70_84: 'LF 70–84%',
        LF_85_94: 'LF 85–94%',
        LF_95_PLUS: 'LF >=95%',
        OVER_CAPACITY: 'Over Capacity',
      };
      chips.push({
        key: 'lf',
        label: lfLabels[loadFactorFilter] || loadFactorFilter,
        onRemove: () => setLoadFactorFilter(''),
      });
    }

    if (flightNumberSearch) {
      chips.push({
        key: 'flightNumber',
        label: `Flt #: ${flightNumberSearch}`,
        onRemove: () => setFlightNumberSearch(''),
      });
    }

    if (aircraftTypeFilter) {
      chips.push({
        key: 'acType',
        label: `Aircraft: ${aircraftTypeFilter}`,
        onRemove: () => setAircraftTypeFilter(''),
      });
    }

    if (aircraftRegSearch) {
      chips.push({
        key: 'acReg',
        label: `Reg: ${aircraftRegSearch}`,
        onRemove: () => setAircraftRegSearch(''),
      });
    }

    if (paxVarianceFilter) {
      const paxVarLabels: Record<string, string> = {
        VAR_0: 'Variance 0 pax',
        VAR_1_2: 'Variance 1–2 pax',
        VAR_3_5: 'Variance 3–5 pax',
        VAR_6_10: 'Variance 6–10 pax',
        VAR_GT_10: 'Variance >10 pax',
      };
      chips.push({
        key: 'paxVar',
        label: paxVarLabels[paxVarianceFilter] || paxVarianceFilter,
        onRemove: () => setPaxVarianceFilter(''),
      });
    }

    if (delayBandFilter) {
      const delayLabels: Record<string, string> = {
        ON_TIME: 'On Time',
        BAND_1_15: 'Delay 1–15 min',
        BAND_16_30: 'Delay 16–30 min',
        BAND_31_60: 'Delay 31–60 min',
        BAND_GT_60: 'Delay >60 min',
      };
      chips.push({
        key: 'delayBand',
        label: delayLabels[delayBandFilter] || delayBandFilter,
        onRemove: () => setDelayBandFilter(''),
      });
    }

    if (apbAuditStatusFilter) {
      chips.push({
        key: 'apbStatus',
        label: `Audit: ${apbAuditStatusFilter.replace(/_/g, ' ')}`,
        onRemove: () => setApbAuditStatusFilter(''),
      });
    }

    if (originFilter) {
      chips.push({
        key: 'origin',
        label: `Origin: ${originFilter}`,
        onRemove: () => setOriginFilter(''),
      });
    }

    if (destinationFilter) {
      chips.push({
        key: 'dest',
        label: `Dest: ${destinationFilter}`,
        onRemove: () => setDestinationFilter(''),
      });
    }

    if (dataQualityFilter) {
      chips.push({
        key: 'dataQuality',
        label: `Quality: ${dataQualityFilter.replace(/_/g, ' ')}`,
        onRemove: () => setDataQualityFilter(''),
      });
    }

    if (specificDateFilter) {
      chips.push({
        key: 'specificDate',
        label: `Date: ${specificDateFilter}`,
        onRemove: () => setSpecificDateFilter(''),
      });
    }

    if (startDateFilter || endDateFilter) {
      chips.push({
        key: 'dateRange',
        label: `Range: ${startDateFilter || '...'} to ${endDateFilter || '...'}`,
        onRemove: () => {
          setStartDateFilter('');
          setEndDateFilter('');
        },
      });
    }

    return chips;
  }, [
    periodFilter,
    stationFilter,
    stationRoleFilter,
    routeFilter,
    movementStatusFilter,
    reconciliationFilter,
    severityFilter,
    loadFactorFilter,
    flightNumberSearch,
    aircraftTypeFilter,
    aircraftRegSearch,
    paxVarianceFilter,
    delayBandFilter,
    apbAuditStatusFilter,
    originFilter,
    destinationFilter,
    dataQualityFilter,
    specificDateFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // CHART DATA AGGREGATIONS
  const monthlySummaryData = useMemo(() => {
    const map: Record<string, { month: string; completed: number; delayed: number; cancelled: number }> = {};
    filteredFlights.forEach((f) => {
      const m = f.flightDate.substring(0, 7); // YYYY-MM
      if (!map[m]) {
        map[m] = { month: m, completed: 0, delayed: 0, cancelled: 0 };
      }
      if (f.movementStatus === 'COMPLETED') map[m].completed++;
      else if (f.movementStatus === 'DELAYED') map[m].delayed++;
      else if (f.movementStatus === 'CANCELLED') map[m].cancelled++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredFlights]);

  const dailyTrendData = useMemo(() => {
    const map: Record<string, { date: string; total: number; completed: number; delayed: number; cancelled: number }> = {};
    filteredFlights.forEach((f) => {
      const d = f.flightDate;
      if (!map[d]) {
        map[d] = { date: d, total: 0, completed: 0, delayed: 0, cancelled: 0 };
      }
      map[d].total++;
      if (f.movementStatus === 'COMPLETED') map[d].completed++;
      else if (f.movementStatus === 'DELAYED') map[d].delayed++;
      else if (f.movementStatus === 'CANCELLED') map[d].cancelled++;
    });
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [filteredFlights]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className={`space-y-5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      {/* Dynamic Reporting Period & Operational Control Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-sky-400 font-black uppercase tracking-widest font-mono">
              HQ Operational Decision-Support Control Desk
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Filter Sync
            </span>
          </div>
          <h3 className={`text-base font-black uppercase font-sans ${isLight ? 'text-slate-800' : 'text-white'}`}>
            📊 Dashboard All Operational ({reportingPeriodLabel})
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Master Dataset:</span>
          <span className="font-bold text-sky-400">{allHistoricalFlights.length} Records</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Filtered:</span>
          <span className="font-bold text-emerald-400">{filteredFlights.length} Active Legs</span>
        </div>
      </div>

      {/* MANDATORY KPI MANAGEMENT SUMMARY CARDS (7 KEY MANAGEMENT METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* KPI 1: Flights Affected */}
        <div
          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <span>Flights Affected</span>
              <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-rose-400">{stats.flightsAffected}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">
              {stats.totalFiltered > 0
                ? `${stats.flightsAffected} of ${stats.totalFiltered} filtered legs (${Math.round((stats.flightsAffected / stats.totalFiltered) * 100)}%)`
                : '0 filtered legs'}
            </div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-white/10 font-mono leading-tight">
            <span className="font-bold text-slate-300">Overall Impact:</span> {stats.flightsAffected} of {masterStats.totalMaster} records ({masterStats.totalMaster > 0 ? ((stats.flightsAffected / masterStats.totalMaster) * 100).toFixed(1) : 0}% of master dataset)
          </div>
        </div>

        {/* KPI 2: Discrepancy Rate % */}
        <div
          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <span>Discrepancy Rate</span>
              <Percent className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-amber-400">{stats.discrepancyRate}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">
              {stats.discrepantFlightsCount} of {stats.totalFiltered} filtered legs
            </div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-white/10 font-mono leading-tight">
            <span className="font-bold text-slate-300">Overall Impact:</span> {stats.discrepantFlightsCount} of {masterStats.totalMaster} records ({masterStats.totalMaster > 0 ? ((stats.discrepantFlightsCount / masterStats.totalMaster) * 100).toFixed(1) : 0}% of master dataset)
          </div>
        </div>

        {/* KPI 3: Total Pax Variance */}
        <div
          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <span>Total Pax Variance</span>
              <UserCheck className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-sky-400">±{stats.totalPaxVariance} pax</div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">Sales vs Boarded Mismatch</div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-white/10 font-mono leading-tight">
            <span className="font-bold text-slate-300">Overall Impact:</span> {masterStats.masterTotalPaxVariance > 0 ? `${Math.round((stats.totalPaxVariance / masterStats.masterTotalPaxVariance) * 100)}% of total master pax variance (±${masterStats.masterTotalPaxVariance})` : '0% of master variance'}
          </div>
        </div>

        {/* KPI 4: Average Load Factor */}
        <div
          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <span>Avg Load Factor</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-emerald-400">{stats.avgLoadFactor}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">Capacity Utilized ({stats.totalFiltered} legs)</div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-white/10 font-mono leading-tight">
            <span className="font-bold text-slate-300">Overall Impact:</span> Master Avg {masterStats.masterAvgLoadFactor}% across {masterStats.totalMaster} total records
          </div>
        </div>

        {/* KPI 5: Delayed Flights */}
        <div
          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <span>Delayed Flights</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-amber-500">{stats.delayedFlightsCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">{stats.totalDelayDuration} Total Mins</div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-white/10 font-mono leading-tight">
            <span className="font-bold text-slate-300">Overall Impact:</span> {stats.delayedFlightsCount} of {masterStats.totalMaster} records ({masterStats.totalMaster > 0 ? ((stats.delayedFlightsCount / masterStats.totalMaster) * 100).toFixed(1) : 0}% of master dataset)
          </div>
        </div>

        {/* KPI 6: Pending HQ Review */}
        <div
          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <span>Pending HQ Review</span>
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-indigo-400">{stats.pendingHqReviewCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">Requires Audit Action</div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-white/10 font-mono leading-tight">
            <span className="font-bold text-slate-300">Overall Impact:</span> {stats.pendingHqReviewCount} of {masterStats.masterPendingHqCount} total pending master audits
          </div>
        </div>

        {/* KPI 7: Top Problematic Route */}
        <div
          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center text-slate-500 uppercase font-bold text-[9px] tracking-wider">
              <span>Top Issue Route</span>
              <MapPin className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-sm font-black font-mono mt-1 text-purple-400 truncate" title={stats.topProblematicRoute}>
              {stats.topProblematicRoute}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">Highest Discrepancy Sector</div>
          </div>
          <div className="text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-white/10 font-mono leading-tight">
            <span className="font-bold text-slate-300">Overall Impact:</span> {stats.topRouteAffectedCount} of {masterStats.totalMaster} total flights ({masterStats.totalMaster > 0 ? ((stats.topRouteAffectedCount / masterStats.totalMaster) * 100).toFixed(1) : 0}% of master dataset)
          </div>
        </div>
      </div>

      {/* PRIMARY FILTER BAR & ADVANCED COLLAPSIBLE DRAWER */}
      <div
        className={`p-4 rounded-xl border space-y-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0F1117] border-white/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-sky-400" />
            <h3 className="text-xs font-black tracking-wider uppercase text-sky-400">
              🎛 Management Filter Control Desk
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Advanced Filters Toggle Button */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`rounded px-3 py-1.5 text-xs font-extrabold uppercase flex items-center gap-1.5 transition cursor-pointer ${
                showAdvanced
                  ? 'bg-sky-500 text-white shadow'
                  : isLight
                  ? 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Advanced Filters</span>
              {activeAdvancedCount > 0 && (
                <span className="bg-sky-400 text-slate-950 font-black rounded-full text-[9px] px-1.5 py-0.2">
                  {activeAdvancedCount}
                </span>
              )}
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {/* Clear Filters Button */}
            <button
              onClick={handleResetFilters}
              className={`rounded px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 transition cursor-pointer ${
                isLight
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* PRIMARY FILTERS ROW (7 PRIMARY CONTROLS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* 1. Period */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Calendar className="h-3 w-3 text-sky-400" /> Period
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className={`w-full rounded border py-1.5 px-2 text-xs font-bold outline-none cursor-pointer ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-sky-400'
              }`}
            >
              <option value="ROLLING_3_MONTHS">Rolling 3 Months</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="CURRENT_MONTH">Current Month</option>
              <option value="PREVIOUS_MONTH">Previous Month</option>
              <option value="CUSTOM_RANGE">Custom Range</option>
            </select>
          </div>

          {/* 2. Station */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Station</label>
              <select
                value={stationRoleFilter}
                onChange={(e) => setStationRoleFilter(e.target.value as any)}
                className={`text-[9px] font-bold uppercase outline-none bg-transparent ${
                  isLight ? 'text-sky-600' : 'text-sky-400'
                }`}
              >
                <option value="ALL">All Bounds</option>
                <option value="ORIGIN">Origin Only</option>
                <option value="DESTINATION">Dest Only</option>
              </select>
            </div>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value as any)}
              className={`w-full rounded border py-1.5 px-2 text-xs font-bold outline-none cursor-pointer ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
              }`}
            >
              <option value="ALL">All Stations</option>
              {Object.keys(STATIONS).map((code) => (
                <option key={code} value={code}>
                  {code} — {STATIONS[code].name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Route */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Route</label>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className={`w-full rounded border py-1.5 px-2 text-xs outline-none cursor-pointer ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
              }`}
            >
              <option value="">All Sector Routes</option>
              {availableRoutes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Movement Status */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Movement Status</label>
            <select
              value={movementStatusFilter}
              onChange={(e) => setMovementStatusFilter(e.target.value)}
              className={`w-full rounded border py-1.5 px-2 text-xs outline-none cursor-pointer ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
              }`}
            >
              <option value="">All Movement Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CHECK_IN">Check-in</option>
              <option value="BOARDING">Boarding</option>
              <option value="FINAL_CALL">Final Call</option>
              <option value="DEPARTED">Departed</option>
              <option value="IN_FLIGHT">In Flight</option>
              <option value="ARRIVED">Arrived</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DELAYED">Delayed</option>
            </select>
          </div>

          {/* 5. Reconciliation */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Reconciliation</label>
            <select
              value={reconciliationFilter}
              onChange={(e) => setReconciliationFilter(e.target.value)}
              className={`w-full rounded border py-1.5 px-2 text-xs outline-none cursor-pointer ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
              }`}
            >
              <option value="">All Reconciliation States</option>
              <option value="RECONCILED">Reconciled (Match)</option>
              <option value="PENDING_RECON">Pending Reconciliation</option>
              <option value="SALES_VS_CHECKIN">Sales vs Check-in Mismatch</option>
              <option value="GATE_NOSHOW_OFFLOAD">Gate No-show / Offload</option>
              <option value="BOARDED_VS_MANIFEST">Boarded vs Final Manifest Mismatch</option>
              <option value="EXCESS_PAX">Excess Passenger</option>
              <option value="MISSING_MANIFEST">Missing Manifest</option>
              <option value="CRITICAL_DISCREPANCY">Critical Discrepancy</option>
            </select>
          </div>

          {/* 6. Severity */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className={`w-full rounded border py-1.5 px-2 text-xs outline-none cursor-pointer ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
              }`}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>

          {/* 7. Load Factor */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Load Factor Band</label>
            <select
              value={loadFactorFilter}
              onChange={(e) => setLoadFactorFilter(e.target.value)}
              className={`w-full rounded border py-1.5 px-2 text-xs outline-none cursor-pointer ${
                isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
              }`}
            >
              <option value="">All Load Factors</option>
              <option value="UNDER_50">&lt;50%</option>
              <option value="LF_50_69">50–69%</option>
              <option value="LF_70_84">70–84%</option>
              <option value="LF_85_94">85–94%</option>
              <option value="LF_95_PLUS">&gt;=95%</option>
              <option value="OVER_CAPACITY">Over Capacity-Invalid</option>
            </select>
          </div>
        </div>

        {/* ADVANCED FILTERS COLLAPSIBLE PANEL */}
        {showAdvanced && (
          <div
            className={`pt-3 mt-3 border-t border-dashed space-y-3 ${
              isLight ? 'border-slate-300' : 'border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                ⚙ Advanced Operational Granular Filters
              </span>
              <span className="text-[10px] text-slate-400 italic">
                All 10 granular parameters filter dynamically together
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {/* Adv 1: Flight Number */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Flight Number</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. JT-102"
                    value={flightNumberSearch}
                    onChange={(e) => setFlightNumberSearch(e.target.value)}
                    className={`w-full rounded border py-1.5 pl-7 pr-2 text-xs outline-none ${
                      isLight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-sky-500'
                        : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
                    }`}
                  />
                </div>
              </div>

              {/* Adv 2: Aircraft Type */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Aircraft Type</label>
                <select
                  value={aircraftTypeFilter}
                  onChange={(e) => setAircraftTypeFilter(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                >
                  <option value="">All Aircraft Types</option>
                  {availableAircraftTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adv 3: Aircraft Registration */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Aircraft Registration</label>
                <input
                  type="text"
                  placeholder="e.g. PK-L102"
                  value={aircraftRegSearch}
                  onChange={(e) => setAircraftRegSearch(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                />
              </div>

              {/* Adv 4: Passenger Variance */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Passenger Variance</label>
                <select
                  value={paxVarianceFilter}
                  onChange={(e) => setPaxVarianceFilter(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                >
                  <option value="">All Variances</option>
                  <option value="VAR_0">0 pax (Exact Match)</option>
                  <option value="VAR_1_2">1–2 pax variance</option>
                  <option value="VAR_3_5">3–5 pax variance</option>
                  <option value="VAR_6_10">6–10 pax variance</option>
                  <option value="VAR_GT_10">&gt;10 pax variance</option>
                </select>
              </div>

              {/* Adv 5: Delay Band */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Delay Band</label>
                <select
                  value={delayBandFilter}
                  onChange={(e) => setDelayBandFilter(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                >
                  <option value="">All Delay Bands</option>
                  <option value="ON_TIME">On Time (0 min)</option>
                  <option value="BAND_1_15">1–15 min delay</option>
                  <option value="BAND_16_30">16–30 min delay</option>
                  <option value="BAND_31_60">31–60 min delay</option>
                  <option value="BAND_GT_60">&gt;60 min delay</option>
                </select>
              </div>

              {/* Adv 6: APB/Audit Status */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">APB / Audit Status</label>
                <select
                  value={apbAuditStatusFilter}
                  onChange={(e) => setApbAuditStatusFilter(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                >
                  <option value="">All Audit Statuses</option>
                  <option value="NOT_CREATED">Not Created</option>
                  <option value="DRAFT">Draft / In Progress</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="STATION_CHECKED">Station Checked</option>
                  <option value="PENDING_HQ">Pending HQ Review</option>
                  <option value="APPROVED">Approved / Completed</option>
                  <option value="REJECTED">Rejected-Returned</option>
                  <option value="SEALED">Sealed</option>
                </select>
              </div>

              {/* Adv 7: Origin */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Specific Origin</label>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                >
                  <option value="">All Origins</option>
                  {Object.keys(STATIONS).map((code) => (
                    <option key={code} value={code}>
                      {code} — {STATIONS[code].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adv 8: Destination */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Specific Destination</label>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                >
                  <option value="">All Destinations</option>
                  {Object.keys(STATIONS).map((code) => (
                    <option key={code} value={code}>
                      {code} — {STATIONS[code].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adv 9: Data Quality */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Data Quality</label>
                <select
                  value={dataQualityFilter}
                  onChange={(e) => setDataQualityFilter(e.target.value)}
                  className={`w-full rounded border py-1.5 px-2 text-xs outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                  }`}
                >
                  <option value="">All Data Quality</option>
                  <option value="COMPLETE">Complete & Valid</option>
                  <option value="MISSING_DATA">Missing Data / Unsent</option>
                  <option value="INVALID_PAX">Invalid Pax Count</option>
                  <option value="CAPACITY_VIOLATION">Capacity Violation</option>
                  <option value="STALE_DATA">Stale Data (&gt;2h delay)</option>
                  <option value="UNRECONCILED">Unreconciled Mismatch</option>
                </select>
              </div>

              {/* Adv 10: Date Picker / Range */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Date Picker / Range</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className={`w-1/2 rounded border py-1 px-1 text-[10px] outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                    }`}
                  />
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className={`w-1/2 rounded border py-1 px-1 text-[10px] outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-[#1A1D23] text-white'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACTIVE FILTERS SUMMARY CHIPS BAR */}
      {activeFilterChips.length > 0 && (
        <div
          className={`px-3.5 py-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs font-mono transition ${
            isLight ? 'bg-sky-50/80 border-sky-200 text-sky-950' : 'bg-sky-950/30 border-sky-500/30 text-sky-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-sky-500 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Active Filters:
            </span>
            {activeFilterChips.map((chip) => (
              <span
                key={chip.key}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  isLight
                    ? 'bg-white border-sky-300 text-sky-900 shadow-xs'
                    : 'bg-sky-900/40 border-sky-500/40 text-sky-100'
                }`}
              >
                {chip.label}
                {chip.onRemove && (
                  <button
                    onClick={chip.onRemove}
                    className="hover:text-rose-400 font-bold ml-0.5 cursor-pointer text-[12px] leading-none"
                    title="Remove filter"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-black text-emerald-400 text-[11px] uppercase">
              {filteredFlights.length} {filteredFlights.length === 1 ? 'flight matched' : 'flights matched'}
            </span>
            <button
              onClick={handleResetFilters}
              className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
            >
              CLEAR ALL
            </button>
          </div>
        </div>
      )}

      {/* DECISION PRIORITY SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Severity Distribution Card */}
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            1. Severity Matrix Breakdown
          </h4>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-2.5 py-1 rounded text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Critical: {stats.severityCounts.CRITICAL}
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
              High: {stats.severityCounts.HIGH}
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-black bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Medium: {stats.severityCounts.MEDIUM}
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-black bg-slate-500/10 text-slate-400 border border-slate-500/20">
              Low: {stats.severityCounts.LOW}
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Normal: {stats.severityCounts.NORMAL}
            </span>
          </div>
        </div>

        {/* Action Priority Management Summary */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-400" />
                2. HQ Action Priority
              </h4>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Filtered Action Items
              </span>
            </div>

            <div className="text-xs space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-slate-400">
                <span>Critical Discrepancies:</span>
                <span className="font-bold text-rose-400">{hqActionPriorityStats.criticalCount} Flights</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Pending HQ Review:</span>
                <span className="font-bold text-indigo-400">{hqActionPriorityStats.pendingHqCount} Flights</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Unreconciled Flights:</span>
                <span className="font-bold text-amber-400">{hqActionPriorityStats.unreconciledCount} Flights</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Oldest Unresolved Age:</span>
                <span className="font-bold text-sky-400">{hqActionPriorityStats.oldestUnresolvedAgeStr}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Most Affected Route:</span>
                <span className="font-bold text-purple-400 truncate max-w-[150px]" title={hqActionPriorityStats.topRoute}>
                  {hqActionPriorityStats.topRoute}
                </span>
              </div>
            </div>
          </div>

          {hqActionPriorityStats.hasActionableRecords && (
            <div className="mt-3 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  const el = document.getElementById('flight-ledger-table');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-1.5 px-3 rounded text-xs font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                VIEW AFFECTED FLIGHTS ({hqActionPriorityStats.uniqueActionableCount})
              </button>
            </div>
          )}
        </div>

        {/* Sector & Route Risk Summary */}
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-400" />
            3. Sector Risk Concentration
          </h4>
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between items-center text-slate-400">
              <span>Highest Risk Route Sector:</span>
              <span className="font-bold text-purple-400">{stats.topProblematicRoute}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Total Delay Accumulation:</span>
              <span className="font-bold text-amber-400">{stats.totalDelayDuration} Mins</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Delayed Flights in Selection:</span>
              <span className="font-bold text-amber-500">{stats.delayedFlightsCount} Flights</span>
            </div>
          </div>
        </div>
      </div>

      {/* ANALYTICS CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Trend Line Chart */}
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-400" />
            Operational Daily Movement Trends (Filtered Dataset)
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1F2937'} />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 9 }} stroke="#4B5563" />
                <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} stroke="#4B5563" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#FFFFFF' : '#0F1117',
                    borderColor: isLight ? '#CBD5E1' : '#374151',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Flight Legs"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed On-Time"
                  stroke="#10b981"
                  strokeWidth={1.5}
                />
                <Line type="monotone" dataKey="delayed" name="Legs Delayed" stroke="#f59e0b" strokeWidth={1.5} />
                <Line type="monotone" dataKey="cancelled" name="Legs Cancelled" stroke="#ef4444" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}
        >
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" />
            Monthly Volume &amp; Status Distribution
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySummaryData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1F2937'} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(val) => {
                    const d = new Date(val + '-02');
                    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  }}
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  stroke="#4B5563"
                />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} stroke="#4B5563" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#FFFFFF' : '#0F1117',
                    borderColor: isLight ? '#CBD5E1' : '#374151',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed" name="Delayed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FLIGHT LEDGER TABLE SECTION */}
      <div
        id="flight-ledger-table"
        className={`border rounded-xl overflow-hidden ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-white/10 gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Plane className="h-4 w-4 text-sky-400" />
              Operational Flight Manifest Ledger
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Displaying {sortedFlights.length} of {allHistoricalFlights.length} flights matching selected criteria •
              Click column headers to sort
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr
                className={`uppercase font-bold text-[10px] border-b border-white/10 tracking-wider select-none ${
                  isLight ? 'bg-slate-50 text-slate-500' : 'bg-[#1A1D23] text-slate-400'
                }`}
              >
                <th
                  onClick={() => toggleSort('flightNumber')}
                  className="px-3.5 py-3 cursor-pointer hover:text-sky-400 transition"
                >
                  <div className="flex items-center gap-1">
                    Flight Code <ArrowUpDown className="h-3 w-3 text-sky-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('flightDate')}
                  className="px-3.5 py-3 cursor-pointer hover:text-sky-400 transition"
                >
                  <div className="flex items-center gap-1">
                    Flight Date <ArrowUpDown className="h-3 w-3 text-sky-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3">Route Bounds</th>
                <th className="px-3.5 py-3">STD / ATD</th>
                <th className="px-3.5 py-3">Aircraft</th>
                <th className="px-3.5 py-3 text-center">Cap</th>
                <th className="px-3.5 py-3 text-center">Sales</th>
                <th className="px-3.5 py-3 text-center">Boarded</th>
                <th
                  onClick={() => toggleSort('discrepancy')}
                  className="px-3.5 py-3 text-center cursor-pointer hover:text-sky-400 transition"
                >
                  <div className="flex items-center justify-center gap-1">
                    Diff <ArrowUpDown className="h-3 w-3 text-sky-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('loadFactor')}
                  className="px-3.5 py-3 text-right cursor-pointer hover:text-sky-400 transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    Load Factor <ArrowUpDown className="h-3 w-3 text-sky-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('severity')}
                  className="px-3.5 py-3 text-center cursor-pointer hover:text-sky-400 transition"
                >
                  <div className="flex items-center justify-center gap-1">
                    Severity <ArrowUpDown className="h-3 w-3 text-sky-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 text-center">Audit Status</th>
                <th className="px-3.5 py-3 text-center">Enhanced Manifest</th>
                <th className="px-3.5 py-3">Remarks / Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {sortedFlights.map((f) => {
                const sales = f.passengerSources?.sales?.breakdown?.total || 0;
                const boarding = f.passengerSources?.boarding?.breakdown?.total || 0;
                const capacity = f.aircraft?.capacity || 180;
                const diff = boarding - sales;
                const paxDiff = Math.abs(diff);
                const isCancelled = f.movementStatus === 'CANCELLED';
                const hasDiscrepancy = diff !== 0 && !isCancelled;
                const loadFactor = capacity ? Math.round((boarding / capacity) * 1000) / 10 : 0;

                const linkedApb = apbMap.get(f.id) || (f.apbId ? apbMap.get(f.apbId) : null);
                const apbStatus = linkedApb ? linkedApb.status : f.apbId ? 'STATION_CHECKED' : 'NOT_CREATED';

                // Computed Severity
                let sev: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL' = 'NORMAL';
                if (paxDiff >= 5 || boarding > capacity || isCancelled || f.delayMinutes > 60 || !f.apbId) {
                  sev = 'CRITICAL';
                } else if (paxDiff >= 3 || (f.delayMinutes >= 31 && f.delayMinutes <= 60)) {
                  sev = 'HIGH';
                } else if (paxDiff >= 1 || (f.delayMinutes >= 16 && f.delayMinutes <= 30)) {
                  sev = 'MEDIUM';
                } else if (f.delayMinutes >= 1 && f.delayMinutes <= 15) {
                  sev = 'LOW';
                }

                return (
                  <tr
                    key={f.id}
                    className={`transition-colors duration-150 ${
                      isLight ? 'hover:bg-slate-50 text-slate-800' : 'hover:bg-[#1A1D23] text-slate-300'
                    }`}
                  >
                    {/* Flight Code */}
                    <td className="px-3.5 py-3 font-bold tracking-widest text-sky-400 uppercase">
                      {f.flightNumber}
                    </td>

                    {/* Flight Date */}
                    <td className="px-3.5 py-3 font-mono">
                      {new Date(f.flightDate).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Route Bounds */}
                    <td className="px-3.5 py-3 font-bold">
                      {f.origin} ➔ {f.destination}
                    </td>

                    {/* Times */}
                    <td className="px-3.5 py-3 font-mono text-slate-500 text-[11px]">
                      <div>
                        STD:{' '}
                        {new Date(f.scheduledDeparture).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </div>
                      {!isCancelled && (
                        <div className={f.delayMinutes > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          ACT:{' '}
                          {new Date(f.estimatedDeparture).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </div>
                      )}
                    </td>

                    {/* Aircraft */}
                    <td className="px-3.5 py-3 font-mono">
                      <span className={isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}>
                        {f.aircraft?.type}
                      </span>
                      <span className="text-[10px] text-slate-500 block">({f.aircraft?.registration})</span>
                    </td>

                    {/* Capacity */}
                    <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-400">{capacity}</td>

                    {/* Sales */}
                    <td className="px-3.5 py-3 text-center font-mono">{isCancelled ? '—' : sales}</td>

                    {/* Boarded */}
                    <td className="px-3.5 py-3 text-center font-mono font-bold">{isCancelled ? '—' : boarding}</td>

                    {/* Diff */}
                    <td className="px-3.5 py-3 text-center">
                      {isCancelled ? (
                        <span className="text-slate-500">—</span>
                      ) : hasDiscrepancy ? (
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono font-black text-[10px] rounded px-1.5 py-0.5 border ${
                            diff > 0
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded leading-none">
                          MATCH
                        </span>
                      )}
                    </td>

                    {/* Load Factor */}
                    <td className="px-3.5 py-3 text-right font-mono font-extrabold text-emerald-400">
                      {isCancelled ? '0.0%' : `${loadFactor}%`}
                    </td>

                    {/* Severity */}
                    <td className="px-3.5 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                          sev === 'CRITICAL'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-black'
                            : sev === 'HIGH'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : sev === 'MEDIUM'
                            ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                            : sev === 'LOW'
                            ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {sev}
                      </span>
                    </td>

                    {/* Audit Status */}
                    <td className="px-3.5 py-3 text-center font-mono text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          apbStatus === 'COMPLETED' || apbStatus === 'HQ_REVIEWED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : apbStatus === 'STATION_CHECKED' || apbStatus === 'SENT_TO_SERVER'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : apbStatus.includes('RETURNED')
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {apbStatus === 'STATION_CHECKED'
                          ? 'STN CHECKED'
                          : apbStatus === 'SENT_TO_SERVER'
                          ? 'PENDING HQ'
                          : apbStatus === 'COMPLETED'
                          ? 'APPROVED'
                          : apbStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Enhanced Manifest Actions */}
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => {
                            const manifestData = generateEnhancedManifest(f, linkedApb);
                            setSelectedManifest(manifestData);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-black tracking-wider uppercase transition cursor-pointer ${
                            isLight
                              ? 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20'
                          }`}
                          title={`View Enhanced Passenger Manifest for ${f.flightNumber}`}
                        >
                          VIEW
                        </button>
                        <button
                          onClick={() => {
                            const manifestData = generateEnhancedManifest(f, linkedApb);
                            downloadEnhancedManifestTxt(manifestData);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${
                            isLight
                              ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                              : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                          }`}
                          title={`Download Tab-Separated TXT Manifest for ${f.flightNumber}`}
                        >
                          TXT
                        </button>
                      </div>
                    </td>

                    {/* Remarks / Delay */}
                    <td className="px-3.5 py-3 text-slate-400 italic text-[11px] leading-snug">
                      {f.movementStatus === 'DELAYED' ? (
                        <div className="space-y-0.5 text-amber-400">
                          <strong className="block font-black text-[10px] uppercase">
                            Delay: {f.delayMinutes} Mins
                          </strong>
                          <span>Reason: {(f as any).delayReason || 'Operational'}</span>
                        </div>
                      ) : isCancelled ? (
                        <span className="text-rose-400 font-bold uppercase text-[10px]">Leg Cancelled</span>
                      ) : (
                        <span className="text-slate-500 font-normal">Normal Operation</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedFlights.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-500 font-bold">
                    No operational flight records matching the selected combined filter criteria were found.
                    <div className="mt-2">
                      <button
                        onClick={handleResetFilters}
                        className="px-3 py-1 rounded bg-sky-500 text-white text-xs font-bold uppercase cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Passenger Manifest Modal */}
      {selectedManifest && (
        <EnhancedManifestModal
          manifest={selectedManifest}
          isOpen={!!selectedManifest}
          onClose={() => setSelectedManifest(null)}
          isLight={isLight}
        />
      )}
    </div>
  );
}
