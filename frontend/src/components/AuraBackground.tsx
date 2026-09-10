import React from 'react';

interface AuraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

export function AuraBackground({ children, className = '' }: AuraBackgroundProps) {
  return (
    <div className={`aura-bg ${className}`}>
      {/* Layer 1 - screen */}
      <div className="aura-layer-1" aria-hidden="true" />

      {/* Layer 2 - screen */}
      <div className="aura-layer-2" aria-hidden="true" />

      {/* Layer 3 - multiply */}
      <div className="aura-layer-3" aria-hidden="true" />

      {/* Film-grain overlay - SVG feTurbulence noise, overlay blend */}
      <div className="aura-grain" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="aura-grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.7"
              numOctaves={4}
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0.181 0.608 0.061 0 0.075
                      0.181 0.608 0.061 0 0.075
                      0.181 0.608 0.061 0 0.075
                      0     0     0     1 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#aura-grain-filter)" />
        </svg>
      </div>

      {/* Page content sits above the layers */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export default AuraBackground;
