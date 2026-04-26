import React from 'react';

const Logo = ({ className = "w-10 h-10" }) => {
  const createSlice = (startAngle: number, endAngle: number, color: string) => {
    const r = 48;
    const cx = 50;
    const cy = 50;
    const start = (startAngle - 90) * Math.PI / 180;
    const end = (endAngle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return (
      <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={color} />
    );
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        {/* Segments */}
        {createSlice(288, 360, '#C25925')} {/* Orange - Top Left */}
        {createSlice(0, 72, '#962B28')}    {/* Red - Top Right */}
        {createSlice(72, 144, '#489B59')}  {/* Green - Bottom Right */}
        {createSlice(144, 216, '#EEA623')} {/* Yellow - Bottom Center */}
        {createSlice(216, 288, '#1A537A')} {/* Blue - Bottom Left */}

        {/* Center White Circle */}
        <circle cx="50" cy="50" r="25" fill="#ffffff" />
        
        {/* Center Icon - Laptop + Museum Roof */}
        <g transform="translate(32, 38) scale(0.65)" fill="#333333">
          {/* Laptop Screen */}
          <path d="M6 18 h44 v24 h-44 z" fill="none" stroke="#333333" strokeWidth="2" />
          {/* Base */}
          <path d="M-2 44 h60 l5 6 h-70 z" />
          {/* Roof */}
          <path d="M28 2 l-24 14 h48 z" />
          <rect x="26" y="0" width="4" height="4" />
        </g>

        <g fill="#ffffff">
          {/* Orange Segment (Vase) */}
          <g transform="translate(20, 10) scale(0.55)">
            {/* Belly */}
            <path d="M10 15 c -15 10 -10 35 10 35 h10 c 20 0 25 -25 10 -35 z" />
            {/* Neck */}
            <rect x="15" y="8" width="10" height="8" />
            {/* Lip */}
            <path d="M13 5 h14 v3 h-14 z" />
            {/* Lid */}
            <path d="M17 1 h6 v4 h-6 z" />
          </g>

          {/* Red Segment (Folk Animal - Bumba Meu Boi) */}
          <g transform="translate(60, 12) scale(0.55)">
             {/* Horns */}
             <path d="M10 15 c -8 -8 -5 -15 0 -15 c 2 0 5 8 5 15 z" />
             <path d="M30 15 c 8 -8 5 -15 0 -15 c -2 0 -5 8 -5 15 z" />
             {/* Head */}
             <path d="M12 12 h16 v12 h-16 z" />
             {/* Skirt/Body */}
             <path d="M6 24 c -12 15 -5 30 14 30 h0 c 19 0 26 -15 14 -30 z" />
             {/* Legs */}
             <rect x="15" y="52" width="4" height="8" />
             <rect x="21" y="52" width="4" height="8" />
          </g>

          {/* Green Segment (Leaf) */}
          <g transform="translate(70, 48) scale(0.7)">
            <path d="M4 22 c 0 -15 15 -20 22 -20 c 0 15 -15 20 -22 20 z" />
            <path d="M6 20 l 15 -15" stroke="#489B59" strokeWidth="1" />
          </g>

          {/* Yellow Segment (Cupped Hands) */}
          <g transform="translate(38, 73) scale(0.5)">
            {/* Left Hand */}
            <path d="M10 15 c -5 15 5 25 15 25 h4 c 0 0 -5 -15 -10 -20 z" />
            {/* Right Hand */}
            <path d="M38 15 c 5 15 -5 25 -15 25 h-4 c 0 0 5 -15 10 -20 z" />
            {/* Base/Wrists */}
            <path d="M18 38 h12 v10 h-12 z" />
          </g>

          {/* Blue Segment (Building/Facade) */}
          <g transform="translate(15, 50) scale(0.5)">
            <path d="M6 8 h24 v28 h-24 z" />
            {/* Windows */}
            <rect x="10" y="14" width="6" height="8" fill="#1A537A" />
            <rect x="20" y="14" width="6" height="8" fill="#1A537A" />
            <rect x="10" y="26" width="6" height="10" fill="#1A537A" />
            <rect x="20" y="26" width="6" height="10" fill="#1A537A" />
            {/* Roof Top */}
            <path d="M2 4 h32 v4 h-32 z" />
            <path d="M4 0 h28 v4 h-28 z" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default Logo;
