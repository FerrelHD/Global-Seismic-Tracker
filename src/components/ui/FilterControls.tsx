import React from 'react';
import { SlidersHorizontal, Search, Layers, Activity } from 'lucide-react';

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  minMagnitude: number;
  onMinMagChange: (m: number) => void;
  depthFilter: 'all' | 'shallow' | 'mid' | 'deep';
  onDepthFilterChange: (d: 'all' | 'shallow' | 'mid' | 'deep') => void;
  filteredCount: number;
  totalCount: number;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  minMagnitude,
  onMinMagChange,
  depthFilter,
  onDepthFilterChange,
  filteredCount,
  totalCount,
}) => {
  return (
    <div className="w-full max-w-xl rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 p-5 shadow-xl font-mono text-xs text-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-700" />
          <span className="font-bold tracking-widest text-slate-900">INTERACTIVE TELEMETRY FILTERS</span>
        </div>
        <span className="text-[11px] text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-semibold">
          {filteredCount} / {totalCount} VISIBLE
        </span>
      </div>

      {/* Location Search Bar */}
      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by country, region or fault line..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-500 focus:bg-white focus:outline-none text-slate-900 placeholder:text-slate-400 text-xs transition-all"
        />
      </div>

      {/* Quick Region Presets */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <span className="text-[10px] text-slate-400 font-medium mr-1">QUICK:</span>
        <button
          onClick={() => onSearchChange('')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
            searchQuery === ''
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          GLOBAL
        </button>
        <button
          onClick={() => onSearchChange('indonesia')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all flex items-center gap-1 ${
            searchQuery.toLowerCase() === 'indonesia'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          🇮🇩 INDONESIA
        </button>
        <button
          onClick={() => onSearchChange('japan')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
            searchQuery.toLowerCase() === 'japan'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          🇯🇵 JAPAN
        </button>
        <button
          onClick={() => onSearchChange('alaska')}
          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
            searchQuery.toLowerCase() === 'alaska'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
        >
          🇺🇸 ALASKA
        </button>
      </div>

      {/* Magnitude Threshold Slider */}
      <div className="mt-4">
        <div className="flex justify-between items-center text-[11px] mb-1.5">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-rose-500" /> MIN MAGNITUDE
          </span>
          <span className="text-rose-600 font-bold">M{minMagnitude.toFixed(1)}+</span>
        </div>
        <input
          type="range"
          min="0"
          max="7"
          step="0.5"
          value={minMagnitude}
          onChange={(e) => onMinMagChange(Number(e.target.value))}
          className="w-full accent-rose-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
        />
      </div>

      {/* Depth Filter Chips */}
      <div className="mt-4">
        <span className="text-slate-600 text-[11px] flex items-center gap-1.5 mb-2 font-medium">
          <Layers className="w-3.5 h-3.5 text-amber-600" /> SUB-SURFACE DEPTH
        </span>
        <div className="grid grid-cols-4 gap-2">
          {(['all', 'shallow', 'mid', 'deep'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onDepthFilterChange(mode)}
              className={`py-1.5 px-2 rounded-lg text-center uppercase tracking-wider text-[10px] font-semibold transition-all border ${
                depthFilter === mode
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
