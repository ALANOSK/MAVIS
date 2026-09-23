/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Flight, StationCode } from '../types';
import { STATIONS, CARRIERS } from '../data';
import { Info } from 'lucide-react';
import FlightBoard from './FlightBoard';

interface FlightRadarProps {
  flights: Flight[];
  currentStation: StationCode;
  theme?: 'light' | 'dark';
}

interface RadarAircraft {
  flight: Flight;
  progress: number; // 0 to 1
  speed: number;
  x: number;
  y: number;
  heading: number;
  fadingDots: { x: number; y: number; alpha: number }[];
}

export default function FlightRadar({ flights, currentStation, theme = 'dark' }: FlightRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [aircraftList, setAircraftList] = useState<RadarAircraft[]>([]);

  // Scale variables for canvas
  const STATIONS_POS: Record<StationCode, { rx: number; ry: number }> = {
    KUL: { rx: 0.22, ry: 0.32 },
    CGK: { rx: 0.35, ry: 0.62 },
    DPS: { rx: 0.72, ry: 0.78 },
    SUB: { rx: 0.52, ry: 0.70 },
    KNO: { rx: 0.10, ry: 0.15 },
    UPG: { rx: 0.82, ry: 0.45 },
  };

  const isLight = theme === 'light';

  const stationFlights = flights.filter(
    (f) => f.origin === currentStation || f.destination === currentStation
  );

  // Seed simulated positions based on flights list
  useEffect(() => {
    const list: RadarAircraft[] = stationFlights.slice(0, 16).map((flight, idx) => {
      // Create smooth progress based on flight state
      let initialProgress = Math.random();
      if (flight.movementStatus === 'IN_FLIGHT') {
        initialProgress = 0.3 + Math.random() * 0.4;
      } else if (flight.movementStatus === 'DEPARTED') {
        initialProgress = 0.05 + Math.random() * 0.1;
      } else if (flight.movementStatus === 'ARRIVED') {
        initialProgress = 0.95;
      } else if (['SCHEDULED', 'BOARDING', 'CHECK_IN', 'FINAL_CALL'].includes(flight.movementStatus)) {
        initialProgress = 0.0; // on ground
      }

      const speed = 0.00015 + (idx % 4) * 0.0001;

      // Calculate initial heading angle
      const from = STATIONS_POS[flight.origin] || STATIONS_POS.CGK;
      const to = STATIONS_POS[flight.destination] || STATIONS_POS.DPS;
      const dx = to.rx - from.rx;
      const dy = to.ry - from.ry;
      const heading = Math.atan2(dy, dx);

      return {
        flight,
        progress: initialProgress,
        speed,
        x: 0,
        y: 0,
        heading,
        fadingDots: [],
      };
    });

    setAircraftList(list);
    // Select first flight by default for nice presentation
    if (stationFlights.length > 0) {
      setSelectedFlight(stationFlights[0]);
    } else {
      setSelectedFlight(null);
    }
  }, [flights, currentStation]);

  // Canvas drawing & animation loop using ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let resizeRafId: number;
    let sweepAngle = 0;

    const handleResize = () => {
      const stage = stageRef.current;
      if (!stage) return;
      
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        handleResize();
      });
    });

    if (stageRef.current) {
      resizeObserver.observe(stageRef.current);
    }

    // Initial resize call
    handleResize();

    const draw = () => {
      const stage = stageRef.current;
      if (!stage) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const isLightMode = theme === 'light';

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Radar Background & Concentric Rings (Centered & Un-distorted)
      const mapSize = Math.min(w, h) * 0.8; // Fit within 80% of screen size safely
      const mapLeft = (w - mapSize) / 2;
      const mapTop = (h - mapSize) / 2;

      const cx = w / 2;
      const cy = h / 2;
      const radarRadius = mapSize / 2;

      ctx.strokeStyle = isLightMode ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      // Draw concentric rings
      const ringIntervals = [0.25, 0.5, 0.75, 1.0];
      ringIntervals.forEach((pct) => {
        const r = radarRadius * pct;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Label distance ring
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(`${Math.round(pct * 100)} NM`, cx + r + 4, cy + 3);
      });

      // Draw Grid Lines (Crosshairs) within radar boundary
      ctx.beginPath();
      ctx.moveTo(cx - radarRadius, cy);
      ctx.lineTo(cx + radarRadius, cy);
      ctx.moveTo(cx, cy - radarRadius);
      ctx.lineTo(cx, cy + radarRadius);
      ctx.stroke();

      // Outer solid radar scope boundary
      ctx.beginPath();
      ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isLightMode ? 'rgba(2, 132, 199, 0.25)' : 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. Draw Station Routes
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = isLightMode ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.2;

      const keys = Object.keys(STATIONS_POS) as StationCode[];
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const s1 = STATIONS_POS[keys[i]];
          const s2 = STATIONS_POS[keys[j]];
          ctx.beginPath();
          ctx.moveTo(mapLeft + s1.rx * mapSize, mapTop + s1.ry * mapSize);
          ctx.lineTo(mapLeft + s2.rx * mapSize, mapTop + s2.ry * mapSize);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);

      // 3. Collect occupied text zones starting with stations to avoid overlaps
      interface BBox {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      }
      const occupiedBoxes: BBox[] = [];

      // Ground station label bounding boxes
      Object.entries(STATIONS_POS).forEach(([code, pos]) => {
        const sx = mapLeft + pos.rx * mapSize;
        const sy = mapTop + pos.ry * mapSize;
        occupiedBoxes.push({
          x1: sx - 10,
          y1: sy - 15,
          x2: sx + 90,
          y2: sy + 25
        });
      });

      // 4. Update & Draw Aircraft Sims with label collision detection
      aircraftList.forEach((ac) => {
        const from = STATIONS_POS[ac.flight.origin as StationCode] || STATIONS_POS.CGK;
        const to = STATIONS_POS[ac.flight.destination as StationCode] || STATIONS_POS.DPS;

        // Animate progress for active flights
        if (['IN_FLIGHT', 'DEPARTED'].includes(ac.flight.movementStatus)) {
          ac.progress += ac.speed;
          if (ac.progress > 0.98) ac.progress = 0.05; // cycle back
        } else if (['ARRIVED'].includes(ac.flight.movementStatus)) {
          ac.progress = 0.98; // landed
        } else {
          ac.progress = 0.0; // on the ground
        }

        // Smooth organic micro-vibration (turbulence) to make them feel alive but neat
        const timeScale = Date.now() * 0.001;
        const microOffsetX = Math.sin(timeScale + ac.flight.flightNumber.charCodeAt(0)) * 0.45;
        const microOffsetY = Math.cos(timeScale * 0.8 + ac.flight.flightNumber.charCodeAt(1)) * 0.45;

        // Exact coordinates mapped to the centered proportional square
        const fx = mapLeft + from.rx * mapSize;
        const fy = mapTop + from.ry * mapSize;
        const tx = mapLeft + to.rx * mapSize;
        const ty = mapTop + to.ry * mapSize;
        const ax = fx + (tx - fx) * ac.progress + microOffsetX;
        const ay = fy + (ty - fy) * ac.progress + microOffsetY;

        ac.x = ax;
        ac.y = ay;

        // Calculate angular distance of aircraft relative to center (cx, cy)
        const acAngle = Math.atan2(ay - cy, ax - cx);
        const normSweep = (sweepAngle + Math.PI * 2) % (Math.PI * 2);
        const normAcAngle = (acAngle + Math.PI * 2) % (Math.PI * 2);
        let angleDiff = normSweep - normAcAngle;
        if (angleDiff < 0) angleDiff += Math.PI * 2;

        // Beautiful phosphor decay (brightest immediately after sweep line passes)
        const phosphorBrightness = Math.max(0.15, Math.pow(Math.max(0, 1 - angleDiff / (Math.PI * 2)), 3.5));

        // Trail dots
        if (Math.random() < 0.12 && ['IN_FLIGHT', 'DEPARTED'].includes(ac.flight.movementStatus)) {
          ac.fadingDots.push({ x: ax, y: ay, alpha: 1.0 });
        }
        ac.fadingDots.forEach((dot) => {
          dot.alpha -= 0.006;
        });
        ac.fadingDots = ac.fadingDots.filter((dot) => dot.alpha > 0);

        // Draw Trails with smooth decay opacity
        ac.fadingDots.forEach((dot) => {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = isLightMode 
            ? `rgba(2, 132, 199, ${dot.alpha * 0.35 * phosphorBrightness})` 
            : `rgba(56, 189, 248, ${dot.alpha * 0.5 * phosphorBrightness})`;
          ctx.fill();
        });

        // Determine if selected
        const isSelected = selectedFlight?.id === ac.flight.id;

        // Draw selection pulse ring
        if (isSelected) {
          const pulseRing = (Date.now() % 1600) / 1600; // 0 to 1 loop
          ctx.beginPath();
          ctx.arc(ax, ay, 6 + pulseRing * 15, 0, Math.PI * 2);
          ctx.strokeStyle = isLightMode 
            ? `rgba(2, 132, 199, ${0.5 * (1 - pulseRing)})` 
            : `rgba(56, 189, 248, ${0.6 * (1 - pulseRing)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Draw aircraft vector heading line
        if (['IN_FLIGHT', 'DEPARTED'].includes(ac.flight.movementStatus)) {
          const dx = tx - fx;
          const dy = ty - fy;
          const routeHeading = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + Math.cos(routeHeading) * 16, ay + Math.sin(routeHeading) * 16);
          ctx.strokeStyle = isSelected 
            ? (isLightMode ? '#0284c7' : '#38bdf8') 
            : (isLightMode ? `rgba(2, 132, 199, ${0.1 + phosphorBrightness * 0.2})` : `rgba(56, 189, 248, ${0.15 + phosphorBrightness * 0.25})`);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Draw Stylized Aircraft Delta Symbol (Rotated)
        ctx.save();
        ctx.translate(ax, ay);
        const dx = tx - fx;
        const dy = ty - fy;
        const routeHeading = ['IN_FLIGHT', 'DEPARTED'].includes(ac.flight.movementStatus) 
          ? Math.atan2(dy, dx) 
          : Math.atan2(ty - fy, tx - fx);
        ctx.rotate(routeHeading);

        ctx.beginPath();
        // Modern arrow shape: nose at (6,0), wings at (-4, -5.5) and (-4, 5.5)
        ctx.moveTo(6, 0); 
        ctx.lineTo(-4, -5.5);
        ctx.lineTo(-2, -1.8);
        ctx.lineTo(-5, -1.8);
        ctx.lineTo(-5, 1.8);
        ctx.lineTo(-2, 1.8);
        ctx.lineTo(-4, 5.5);
        ctx.closePath();

        const baseAlpha = isSelected ? 1.0 : (0.4 + phosphorBrightness * 0.6);
        ctx.fillStyle = isSelected 
          ? (isLightMode ? '#0284c7' : '#38bdf8') 
          : (isLightMode ? `rgba(3, 105, 161, ${baseAlpha})` : `rgba(56, 189, 248, ${baseAlpha})`);

        ctx.strokeStyle = isLightMode ? '#ffffff' : '#0a0b0e';
        ctx.lineWidth = 1;
        ctx.shadowColor = isLightMode ? '#0284c7' : '#38bdf8';
        ctx.shadowBlur = isSelected ? 12 : (5 * phosphorBrightness);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;

        // Label collision detection
        const fNumText = ac.flight.flightNumber;
        const routeText = `${ac.flight.origin}➔${ac.flight.destination}`;
        
        ctx.font = isSelected ? 'bold 11px monospace' : '11px monospace';
        const fNumWidth = ctx.measureText(fNumText).width;
        ctx.font = '11px monospace';
        const routeWidth = ctx.measureText(routeText).width;
        
        const labelWidth = Math.max(fNumWidth, routeWidth) + 8;
        const labelHeight = 28;

        // Candidate positions relative to (ax, ay)
        const candidates = [
          { dx: 12, dy: -14 },  // Top Right
          { dx: -labelWidth - 12, dy: -14 }, // Top Left
          { dx: 12, dy: 6 },   // Bottom Right
          { dx: -labelWidth - 12, dy: 6 },  // Bottom Left
          { dx: 0, dy: -34 },  // Above
          { dx: 0, dy: 16 }    // Below
        ];

        let selectedDx = 12;
        let selectedDy = -14;
        let finalBox = { x1: ax + 12, y1: ay - 14, x2: ax + 12 + labelWidth, y2: ay - 14 + labelHeight };
        let foundSafe = false;

        for (let k = 0; k < candidates.length; k++) {
          const cand = candidates[k];
          const testBox = {
            x1: ax + cand.dx,
            y1: ay + cand.dy,
            x2: ax + cand.dx + labelWidth,
            y2: ay + cand.dy + labelHeight
          };

          // Check if testBox goes out of bounds
          if (testBox.x1 < 4 || testBox.x2 > w - 4 || testBox.y1 < 4 || testBox.y2 > h - 4) {
            continue; // Out of bounds, try next candidate
          }

          // Check overlap with any existing occupied boxes
          const hasOverlap = occupiedBoxes.some(
            (box) => !(testBox.x2 < box.x1 || testBox.x1 > box.x2 || testBox.y2 < box.y1 || testBox.y1 > box.y2)
          );

          if (!hasOverlap) {
            selectedDx = cand.dx;
            selectedDy = cand.dy;
            finalBox = testBox;
            foundSafe = true;
            break;
          }
        }

        // If no safe spot, slightly nudge but strictly constrain to canvas boundaries
        if (!foundSafe) {
          const offsetSeed = ac.flight.flightNumber.charCodeAt(ac.flight.flightNumber.length - 1) || 0;
          const shift = (offsetSeed % 4) * 8;
          let candidateX = ax + 14 + shift;
          let candidateY = ay - 14 - shift;

          // Constrain within borders
          if (candidateX < 4) {
            candidateX = 4;
          } else if (candidateX + labelWidth > w - 4) {
            candidateX = w - labelWidth - 4;
          }

          if (candidateY < 4) {
            candidateY = 4;
          } else if (candidateY + labelHeight > h - 4) {
            candidateY = h - labelHeight - 4;
          }

          selectedDx = candidateX - ax;
          selectedDy = candidateY - ay;
          finalBox = {
            x1: candidateX,
            y1: candidateY,
            x2: candidateX + labelWidth,
            y2: candidateY + labelHeight
          };
        }

        occupiedBoxes.push(finalBox);

        // Draw line linking blip to selected label for readability
        if (isSelected) {
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          const px = ax + selectedDx + (selectedDx < 0 ? labelWidth : 0);
          const py = ay + selectedDy + labelHeight / 2;
          ctx.lineTo(px, py);
          ctx.strokeStyle = isLightMode ? 'rgba(2, 132, 199, 0.45)' : 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw Flight Number tag (high contrast)
        ctx.fillStyle = isSelected 
          ? (isLightMode ? '#0284c7' : '#38bdf8') 
          : (isLightMode ? '#0f172a' : '#cbd5e1');
        ctx.font = isSelected ? 'bold 11px monospace' : '11px monospace';
        ctx.fillText(fNumText, ax + selectedDx, ay + selectedDy + 10);

        // Draw movement indicator subtext (high contrast)
        ctx.fillStyle = isLightMode ? '#334155' : '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(routeText, ax + selectedDx, ay + selectedDy + 21);
      });

      // 5. Draw Ground Station Positions
      Object.entries(STATIONS_POS).forEach(([code, pos]) => {
        const sx = mapLeft + pos.rx * mapSize;
        const sy = mapTop + pos.ry * mapSize;
        const isSelectedStation = code === currentStation;

        // Outermost glow
        ctx.beginPath();
        ctx.arc(sx, sy, isSelectedStation ? 14 : 9, 0, Math.PI * 2);
        ctx.fillStyle = isSelectedStation ? (isLightMode ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)') : (isLightMode ? 'rgba(15, 23, 42, 0.02)' : 'rgba(255, 255, 255, 0.03)');
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(sx, sy, isSelectedStation ? 8 : 6, 0, Math.PI * 2);
        ctx.strokeStyle = isSelectedStation ? (isLightMode ? '#0284c7' : '#38bdf8') : (isLightMode ? '#94a3b8' : '#475569');
        ctx.lineWidth = isSelectedStation ? 2.5 : 1.5;
        ctx.stroke();

        // Inner solid core
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = isSelectedStation ? (isLightMode ? '#0284c7' : '#38bdf8') : (isLightMode ? '#1e293b' : '#ffffff');
        ctx.fill();

        // Labels (constrain within radar canvas borders)
        let labelX = sx + 12;
        let labelY = sy + 3;
        const sName = STATIONS[code as StationCode].name.split(' ')[0];
        const maxLabelW = Math.max(ctx.measureText(code).width, ctx.measureText(sName).width);

        if (labelX + maxLabelW > w - 4) {
          labelX = sx - maxLabelW - 12; // Draw on the left side of the marker
        }

        ctx.fillStyle = isLightMode ? '#0f172a' : '#ffffff';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(code, labelX, labelY);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px system-ui';
        ctx.fillText(sName, labelX, labelY + 12);
      });

      // 6. Draw Radar Sweep Line trailing glow (60 degrees of smooth trailing glow)
      const sweepSegments = 45;
      const trailingAngle = Math.PI / 4; // 45 degrees of phosphor trace
      for (let s = 0; s < sweepSegments; s++) {
        const anglePct = s / sweepSegments;
        const startAngle = sweepAngle - trailingAngle * (1 - anglePct);
        const endAngle = sweepAngle - trailingAngle * (1 - (s + 1) / sweepSegments);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radarRadius, startAngle, endAngle);
        ctx.closePath();

        const opacity = anglePct * (isLightMode ? 0.08 : 0.12);
        ctx.fillStyle = isLightMode 
          ? `rgba(2, 132, 199, ${opacity})` 
          : `rgba(56, 189, 248, ${opacity})`;
        ctx.fill();
      }

      // Sweep line edge highlight
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * radarRadius, cy + Math.sin(sweepAngle) * radarRadius);
      ctx.strokeStyle = isLightMode ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      sweepAngle += 0.0035; // slightly slower sweep for premium cinematic feel
      if (sweepAngle > Math.PI * 2) {
        sweepAngle = 0;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      cancelAnimationFrame(resizeRafId);
      resizeObserver.disconnect();
    };
  }, [aircraftList, selectedFlight, currentStation, theme]);

  // Handle canvas click to select flight
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Search nearest aircraft
    let nearest: RadarAircraft | null = null;
    let minDist = 35; // px click tolerance

    aircraftList.forEach((ac) => {
      const dist = Math.sqrt((ac.x - clickX) ** 2 + (ac.y - clickY) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = ac;
      }
    });

    if (nearest) {
      setSelectedFlight((nearest as RadarAircraft).flight);
    }
  };

  return (
    <div ref={containerRef} className="main-radar-workspace relative w-full lg:h-full lg:overflow-hidden overflow-visible h-auto min-w-0 min-h-0 flex-1 transition-colors duration-300">
      
      {/* Lion Group Corporate Branding placement on Main Radar Page */}
      <div 
        className={isLight 
          ? "absolute top-[16px] left-[18px] z-20 flex items-center justify-start p-1.5 rounded-lg border backdrop-blur-sm bg-white/40 border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.03)] pointer-events-none select-none transition-all duration-300"
          : "absolute top-[16px] left-[18px] z-20 flex items-center justify-start p-1 bg-transparent border-transparent shadow-none pointer-events-none select-none transition-all duration-300"
        }
        style={{ width: 'clamp(115px, 10vw, 160px)' }}
        title="Lion Group Supporting Corporate Branding"
      >
        <img
          src="/lion-group.png"
          alt="Lion Group Logo"
          className="h-auto w-full object-contain block"
          style={{ 
            width: '100%', 
            height: 'auto', 
            objectFit: 'contain'
          }}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* radar-stage container for absolute drawing canvas */}
      <div ref={stageRef} className="radar-container radar-stage w-full min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="block h-full w-full cursor-crosshair"
        />
      </div>

      {/* Flight Departure & Arrival Information Board */}
      <FlightBoard flights={stationFlights} currentStation={currentStation} theme={theme} />
    </div>
  );
}
