import React from 'react';

export const LiquidGlassFilter: React.FC = () => null;

interface LiquidCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
}

export const LiquidCard: React.FC<LiquidCardProps> = ({
  children,
  className = '',
  style = {},
  onClick,
  interactive = true,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        boxShadow:
          '0 12px 32px -8px rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04), inset 0 1px 1px 0 rgba(255, 255, 255, 0.95)',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
      className={`relative overflow-hidden text-slate-900 transition-all duration-300 group will-change-transform ${
        interactive
          ? 'hover:scale-[1.02] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12),inset_0_1px_1px_0_rgba(255,255,255,1)] cursor-pointer'
          : ''
      } ${className}`}
    >
      {/* 1. Hardware-accelerated Acrylic Glass Refraction Layer */}
      <div
        className="absolute inset-0 z-0 pointer-events-none rounded-inherit"
        style={{
          backdropFilter: 'blur(20px) saturate(190%) contrast(105%)',
          WebkitBackdropFilter: 'blur(20px) saturate(190%) contrast(105%)',
        }}
      />

      {/* 2. Frosted crystalline acrylic tint */}
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-inherit transition-colors duration-300"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.65) 100%)',
        }}
      />

      {/* 3. Razor-sharp specular rim light */}
      <div
        className="absolute inset-0 z-20 pointer-events-none rounded-inherit border border-white/60 transition-colors duration-300 group-hover:border-white"
        style={{
          boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95)',
        }}
      />

      {/* 4. Foreground content with height constraint for scrollable children */}
      <div className="relative z-30 h-full w-full min-h-0 flex flex-col">{children}</div>
    </div>
  );
};
