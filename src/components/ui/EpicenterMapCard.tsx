import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface EpicenterMapCardProps {
  location?: string;
  coordinates?: string;
  magnitude?: number | string;
  depth?: number | string;
  time?: string;
  shortTime?: string;
  potensi?: string;
  onFocusEpicenter?: () => void;
  onOpenShakemap?: () => void;
  onOpenSeismogram?: () => void;
  onOpenInfographic?: () => void;
  className?: string;
}

export const EpicenterMapCard: React.FC<EpicenterMapCardProps> = ({
  location = 'Ruteng, Manggarai',
  coordinates = '8.32° S, 120.45° E',
  magnitude = '4.0',
  depth = '8 km',
  time = '04 Sep 2026 · 02:15 WIB',
  shortTime = '04 Sep, 02:15 WIB',
  potensi = 'No Tsunami Threat',
  onFocusEpicenter,
  onOpenShakemap,
  onOpenSeismogram,
  onOpenInfographic,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-60, 60], [7, -7]);
  const rotateY = useTransform(mouseX, [-60, 60], [-7, 7]);

  const springRotateX = useSpring(rotateX, { stiffness: 280, damping: 28 });
  const springRotateY = useSpring(rotateY, { stiffness: 280, damping: 28 });

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only apply 3D tilt on desktop with fine pointer, not touchscreens
    if (isMobile || (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If clicking a button inside expanded view, don't collapse immediately
    if ((e.target as HTMLElement).closest('button')) return;
    setIsExpanded((prev) => !prev);
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative cursor-pointer select-none max-w-[calc(100vw-2rem)] ${className}`}
      style={{
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <motion.div
        className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl max-w-[calc(100vw-2rem)]"
        style={{
          rotateX: isMobile ? 0 : springRotateX,
          rotateY: isMobile ? 0 : springRotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          width: isExpanded
            ? isMobile
              ? 'calc(100vw - 2rem)'
              : 365
            : isMobile
            ? 'calc(100vw - 2rem)'
            : 270,
          height: isExpanded ? 355 : isMobile ? 42 : 130,
          borderRadius: isMobile && !isExpanded ? 9999 : 16,
        }}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 32,
        }}
      >
        {/* Subtle Frosted Inner Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-slate-100/60 pointer-events-none" />

        {/* EXPANDED VIEW: High-Detail Seismic Bathymetry & Epicenter Radar Blueprint */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              {/* Bathymetry / Trench background tint */}
              <div className="absolute inset-0 bg-slate-50/90" />

              {/* Technical Seismic Grid Lines & Depth Contours */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                {/* Lat/Lon Graticule lines */}
                <motion.line
                  x1="0%"
                  y1="38%"
                  x2="100%"
                  y2="38%"
                  stroke="#cbd5e1"
                  strokeWidth="0.75"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                />
                <motion.line
                  x1="0%"
                  y1="68%"
                  x2="100%"
                  y2="68%"
                  stroke="#cbd5e1"
                  strokeWidth="0.75"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
                <motion.line
                  x1="32%"
                  y1="0%"
                  x2="32%"
                  y2="100%"
                  stroke="#cbd5e1"
                  strokeWidth="0.75"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                />
                <motion.line
                  x1="68%"
                  y1="0%"
                  x2="68%"
                  y2="100%"
                  stroke="#cbd5e1"
                  strokeWidth="0.75"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                />

                {/* Subduction Trench Curve Lines */}
                <motion.path
                  d="M -10 180 Q 120 140 240 165 T 370 145"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
                <motion.path
                  d="M -10 205 Q 110 165 230 190 T 370 170"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.35 }}
                />

                {/* P-Wave & S-Wave Seismic Expansion Rings centered at (50%, 30%) */}
                <motion.circle
                  cx="50%"
                  cy="30%"
                  r="24"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1"
                  strokeOpacity="0.35"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.35 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                />
                <motion.circle
                  cx="50%"
                  cy="30%"
                  r="48"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1"
                  strokeOpacity="0.2"
                  strokeDasharray="3 3"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.2 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                />
                <motion.circle
                  cx="50%"
                  cy="30%"
                  r="74"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="0.75"
                  strokeOpacity="0.12"
                  strokeDasharray="2 4"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.12 }}
                  transition={{ duration: 0.7, delay: 0.4 }}
                />
              </svg>

              {/* Continental / Island Shelf Shading Blocks */}
              <motion.div
                className="absolute top-[12%] left-[10%] w-[26%] h-[20%] rounded-md bg-slate-200/50 border border-slate-300/40"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              />
              <motion.div
                className="absolute top-[28%] right-[10%] w-[22%] h-[18%] rounded-md bg-slate-200/45 border border-slate-300/35"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              />

              {/* Pulsing Seismic Epicenter Pin Beacon */}
              <motion.div
                className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                initial={{ scale: 0, y: -15 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.3 }}
              >
                <span className="absolute w-8 h-8 rounded-full bg-rose-500/25 animate-ping" />
                <span className="absolute w-4 h-4 rounded-full bg-rose-500/40 animate-pulse" />
                <div className="relative w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-md flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-white" />
                </div>
              </motion.div>

              {/* Soft bottom vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Technical Graticule Grid Lines */}
        <motion.div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          animate={{ opacity: isExpanded ? 0 : 0.05 }}
          transition={{ duration: 0.3 }}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="crustal-grid" width="18" height="18" patternUnits="userSpaceOnUse">
                <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#0f172a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#crustal-grid)" />
          </svg>
        </motion.div>

        {/* Card Foreground Content */}
        {isMobile && !isExpanded ? (
          /* Mobile Collapsed State: Sleek Slim Capsule (Dynamic Island Style) */
          <div className="relative z-10 h-full flex items-center justify-between px-3.5 py-1.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <div className="flex items-center gap-1 font-mono text-[10px] shrink-0">
                <span className="font-bold text-slate-400">BMKG</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-100 font-black text-slate-900 border border-slate-200/80">
                  M{magnitude}
                </span>
              </div>
              <span className="text-slate-300 font-light shrink-0">·</span>
              <span className="text-[11px] font-bold text-slate-900 truncate uppercase font-sans">
                {location}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950 text-white font-mono text-[9px] font-bold tracking-wider shadow-2xs">
                <span>SURVEY</span>
                <span className="text-[10px] leading-none">▾</span>
              </span>
            </div>
          </div>
        ) : (
          /* Desktop Collapsed & Full Expanded View */
          <div className="relative z-10 h-full flex flex-col justify-between p-3.5 sm:p-4">
            {/* Top Row: Category + Live Pulsing Beacon + Magnitude Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <div>
                  <span className="text-[9.5px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                    BMKG GROUND ZERO
                  </span>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[9px] font-mono text-slate-500 uppercase tracking-wide"
                      >
                        EPICENTER SURVEY
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Magnitude Pill Badge */}
              <motion.div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/90 shadow-2xs font-mono"
                animate={{
                  scale: isHovered ? 1.05 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-[9px] font-bold text-slate-400">M</span>
                <span className="text-xs font-black text-slate-900">{magnitude}</span>
              </motion.div>
            </div>

            {/* Bottom Row: Location Narrative & Expanded Metadata */}
            <div className={`space-y-1 transition-all duration-200 ${isExpanded ? 'bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200/90 shadow-xs' : ''}`}>
              <motion.h3
                className="text-slate-950 font-bold text-xs sm:text-[13px] tracking-tight truncate uppercase"
                animate={{
                  x: isHovered ? 3 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {location}
              </motion.h3>

              {/* Collapsed Brief Coordinates & Time */}
              {!isExpanded && (
                <p className="text-[10px] font-mono text-slate-500 truncate">
                  {coordinates} · {depth} {shortTime ? `· ${shortTime}` : ''}
                </p>
              )}

              {/* Expanded Comprehensive Crustal Telemetry */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="pt-1.5 space-y-1 font-mono text-[10px] text-slate-600 border-t border-slate-200/80"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="text-slate-400 uppercase shrink-0">EVENT TIMESTAMP</span>
                      <span className="text-slate-900 font-bold">{time}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="text-slate-400 uppercase">COORDINATES</span>
                      <span className="text-slate-800 font-semibold">{coordinates}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="text-slate-400 uppercase">HYPOCENTER DEPTH</span>
                      <span className="text-slate-800 font-semibold">{depth}</span>
                    </div>
                    <div className="flex items-start justify-between text-[9.5px] gap-2">
                      <span className="text-slate-400 uppercase shrink-0">TSUNAMI STATUS</span>
                      <span className="text-emerald-600 font-semibold text-right leading-tight">
                        {potensi}
                      </span>
                    </div>

                    {/* Interactive Action Buttons */}
                    <div className="pt-2.5 flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {onOpenShakemap && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenShakemap();
                            }}
                            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-900 text-slate-800 hover:text-white border border-slate-300/90 font-mono text-[9.5px] tracking-wider transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 uppercase font-bold"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>SHAKEMAP</span>
                          </button>
                        )}

                        {onOpenSeismogram && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSeismogram();
                            }}
                            className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-300/80 font-mono text-[9.5px] tracking-wider transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 uppercase font-semibold"
                            title="Monitor Seismograf Real-Time"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                            <span>WAVEFORM</span>
                          </button>
                        )}

                        {onOpenInfographic && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenInfographic();
                            }}
                            className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-300/80 font-mono text-[9.5px] tracking-wider transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 uppercase font-semibold"
                            title="Generate Kartu Infografis Bencana"
                          >
                            <span>SHARE</span>
                          </button>
                        )}
                      </div>

                      {onFocusEpicenter && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusEpicenter();
                          }}
                          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-mono text-[10px] tracking-wider transition-all duration-150 cursor-pointer shadow-xs active:scale-95 uppercase font-bold ml-auto"
                        >
                          <span>⌖ FOCUS</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hairline Emerald/Slate Animated Underline Indicator */}
              <motion.div
                className="h-px bg-gradient-to-r from-rose-500/70 via-slate-400/40 to-transparent"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{
                  scaleX: isHovered || isExpanded ? 1 : 0.4,
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Floating Micro Click Hint Below Card */}
      {!isMobile && (
        <motion.p
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9.5px] font-mono text-slate-400 tracking-wider uppercase whitespace-nowrap pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isHovered && !isExpanded ? 1 : 0,
            y: isHovered ? 0 : 3,
          }}
          transition={{ duration: 0.2 }}
        >
          Click to inspect epicenter
        </motion.p>
      )}
    </motion.div>
  );
};
