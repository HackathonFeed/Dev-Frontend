import React from 'react';

export const CircuitBoardIllustration = () => (
  <svg viewBox="0 0 500 400" className="w-full h-full text-[#1a1a1a]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#1a1a1a" fillOpacity="0.12" />
    </pattern>
    <rect width="100%" height="100%" fill="url(#grid-dots)" />
    
    {/* Outer container border dashed */}
    <rect x="10" y="10" width="480" height="380" rx="4" stroke="#1a1a1a" strokeWidth="4" strokeDasharray="8 6" />
    
    {/* Microchip main body */}
    <rect x="160" y="130" width="180" height="140" rx="4" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="4" />
    
    {/* Inside semiconductor labels */}
    <text x="250" y="195" fill="#ffcc00" fontSize="18" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
      GEMINI CORE
    </text>
    <text x="250" y="215" fill="#ffffff" fontSize="10" fontFamily="monospace" textAnchor="middle" opacity="0.8">
      NEURAL_ENGINE_v3.5
    </text>

    {/* Chip pins connections */}
    <line x1="120" y1="150" x2="160" y2="150" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="120" y1="180" x2="160" y2="180" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="120" y1="210" x2="160" y2="210" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="120" y1="240" x2="160" y2="240" stroke="#1a1a1a" strokeWidth="3" />

    <line x1="340" y1="150" x2="380" y2="150" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="340" y1="180" x2="380" y2="180" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="340" y1="210" x2="380" y2="210" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="340" y1="240" x2="380" y2="240" stroke="#1a1a1a" strokeWidth="3" />

    <line x1="200" y1="100" x2="200" y2="130" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="250" y1="100" x2="250" y2="130" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="300" y1="100" x2="300" y2="130" stroke="#1a1a1a" strokeWidth="3" />

    <line x1="200" y1="270" x2="200" y2="300" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="250" y1="270" x2="250" y2="300" stroke="#1a1a1a" strokeWidth="3" />
    <line x1="300" y1="270" x2="300" y2="300" stroke="#1a1a1a" strokeWidth="3" />

    {/* Pathways leading to connectors */}
    <g stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 120,150 L 70,150 L 40,110 L 40,50" />
      <path d="M 120,240 L 70,240 L 50,270 L 50,350" />
      <path d="M 380,150 L 430,150 L 460,110 L 460,50" />
      <path d="M 380,240 L 430,240 L 450,270 L 450,350" />
      
      <path d="M 250,100 L 250,50" />
      <path d="M 250,300 L 250,350" />
    </g>

    {/* Solder Points */}
    <g fill="#1a1a1a">
      <circle cx="40" cy="50" r="7" stroke="#ffcc00" strokeWidth="2.5" />
      <circle cx="460" cy="50" r="7" stroke="#e63b2e" strokeWidth="2.5" />
      <circle cx="50" cy="350" r="7" stroke="#0055ff" strokeWidth="2.5" />
      <circle cx="450" cy="350" r="7" stroke="#1a1a1a" strokeWidth="2.5" />
      <circle cx="250" cy="50" r="5" />
      <circle cx="250" cy="350" r="5" />
    </g>

    {/* Textures and coordinates representing engineering visual honesty */}
    <g fontFamily="monospace" fontSize="8" fill="#1a1a1a" fontWeight="bold">
      <text x="35" y="38" textAnchor="middle">BUS_01</text>
      <text x="465" y="38" textAnchor="middle">VOLT_IN</text>
      <text x="50" y="368" textAnchor="middle">TX_RX</text>
      <text x="450" y="368" textAnchor="middle">GND_B</text>
      <text x="250" y="38" textAnchor="middle">SYS_A</text>
      
      {/* Decorative technical specs */}
      <text x="80" y="100">X: 884.22</text>
      <text x="80" y="112">Y: 104.90</text>
      <text x="360" y="295">LATENCY: 12ms</text>
      <text x="360" y="307">NODE: ACTIVE</text>
    </g>
  </svg>
);
