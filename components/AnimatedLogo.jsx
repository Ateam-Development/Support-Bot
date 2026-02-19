
"use client";
import React from 'react';

const AnimatedLogo = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 300 300"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <style>
                    {`
            /* Rotating dashed border */
            @keyframes rotateBorder {
              0% {
                stroke-dashoffset: 0;
                transform: rotate(0deg);
              }
              100% {
                stroke-dashoffset: 1000;
                transform: rotate(360deg);
              }
            }
            
            /* Pulsing glow effect */
            @keyframes glowPulse {
              0%, 100% {
                filter: drop-shadow(0 0 5px #46B874);
              }
              50% {
                filter: drop-shadow(0 0 15px #46B874);
              }
            }
            
            /* Color shift animation */
            @keyframes colorShift {
              0%, 100% {
                stroke: #46B874;
              }
              33% {
                stroke: #073653;
              }
              66% {
                stroke: #46B874;
              }
            }
            
            .border-circle {
              fill: none;
              stroke: #46B874;
              stroke-width: 8;
              stroke-dasharray: 50 30;
              animation: rotateBorder 8s linear infinite, colorShift 6s ease-in-out infinite;
              transform-origin: center;
            }
            
            .glow-effect {
              animation: glowPulse 2s ease-in-out infinite;
            }
          `}
                </style>

                {/* Gradient for extra visual interest */}
                <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#46B874', stopOpacity: 1 }}>
                        <animate attributeName="stop-color" values="#46B874;#073653;#46B874" dur="4s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" style={{ stopColor: '#073653', stopOpacity: 1 }}>
                        <animate attributeName="stop-color" values="#073653;#46B874;#073653" dur="4s" repeatCount="indefinite" />
                    </stop>
                </linearGradient>
            </defs>

            {/* Outer animated border circle */}
            <circle cx="150" cy="150" r="145" className="border-circle" stroke="url(#borderGradient)" />

            {/* Inner circle with glow */}
            <circle cx="150" cy="150" r="140" fill="white" stroke="none" />

            <g className="glow-effect">
                <g transform="translate(0.000000,300.000000) scale(0.100000,-0.100000)"
                    fill="#000000" stroke="none">
                    <path d="M1435 2756 c-57 -26 -93 -80 -193 -291 -55 -115 -141 -295 -192 -400
        -51 -104 -109 -226 -130 -270 -65 -139 -566 -1166 -660 -1355 -49 -99 -90
        -182 -90 -185 0 -2 80 76 178 173 97 98 197 196 222 218 60 52 218 184 252
        209 19 14 93 158 264 515 130 272 279 583 331 690 51 107 96 196 101 197 4 2
        80 -142 169 -320 89 -177 168 -331 176 -341 13 -18 18 -18 170 20 93 23 157
        43 157 50 0 7 -116 243 -257 525 -295 588 -284 571 -401 576 -42 2 -78 -2 -97
        -11z"/>
                    <path d="M2153 1202 l-123 -55 0 -464 0 -463 130 0 130 0 0 520 c0 286 -3 520
        -7 519 -5 0 -63 -26 -130 -57z"/>
                    <path d="M1720 984 c-63 -36 -120 -70 -127 -76 -11 -8 -13 -80 -11 -347 l3
        -336 130 0 130 0 3 407 c2 223 -1 409 -6 412 -4 3 -60 -24 -122 -60z"/>
                    <path d="M1355 753 c-22 -15 -79 -58 -127 -96 l-88 -70 0 -179 0 -178 130 0
        130 0 0 275 c0 151 -1 275 -3 275 -1 0 -20 -12 -42 -27z"/>
                    <path d="M850 327 l-95 -92 94 -3 c51 -1 95 -1 98 1 2 3 2 45 1 95 l-3 91 -95
        -92z"/>
                </g>
            </g>
        </svg>
    );
};

export default AnimatedLogo;
