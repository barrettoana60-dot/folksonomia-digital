import React from 'react';
import { Amphora, Bird, Leaf, HandHeart, Landmark, Laptop } from 'lucide-react';

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
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background Pie Chart */}
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
        {createSlice(288, 360, '#d35400')} {/* Orange */}
        {createSlice(0, 72, '#c0392b')}    {/* Red */}
        {createSlice(72, 144, '#27ae60')}  {/* Green */}
        {createSlice(144, 216, '#f39c12')} {/* Yellow */}
        {createSlice(216, 288, '#2980b9')} {/* Blue */}
        
        {/* Center White Circle */}
        <circle cx="50" cy="50" r="23" fill="#ffffff" />
      </svg>

      {/* Icons overlay using absolute positioning percentages */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {/* Center */}
        <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <Landmark className="w-[12%] h-[12%] text-neutral-800 -mb-[2%]" strokeWidth={2} />
          <Laptop className="w-[20%] h-[20%] text-neutral-800" strokeWidth={2} />
        </div>

        {/* Orange Segment (Top Left ~ 234 deg) */}
        <Amphora className="absolute text-white w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2" style={{ left: '29%', top: '22%' }} strokeWidth={2} />

        {/* Red Segment (Top Right ~ 306 deg) */}
        <Bird className="absolute text-white w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2" style={{ left: '71%', top: '22%' }} strokeWidth={2} />

        {/* Green Segment (Bottom Right ~ 18 deg) */}
        <Leaf className="absolute text-white w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2" style={{ left: '83%', top: '61%' }} strokeWidth={2} />

        {/* Yellow Segment (Bottom Center ~ 90 deg) */}
        <HandHeart className="absolute text-white w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '85%' }} strokeWidth={2} />

        {/* Blue Segment (Bottom Left ~ 162 deg) */}
        <Landmark className="absolute text-white w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2" style={{ left: '17%', top: '61%' }} strokeWidth={2} />
      </div>
    </div>
  );
};

export default Logo;
