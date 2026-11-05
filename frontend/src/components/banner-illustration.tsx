'use client';

import React from 'react';

export function BannerIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-end select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 280 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 sm:h-20 md:h-24 w-auto max-w-full drop-shadow-xs"
      >
        {/* Soft background aura circles */}
        <circle cx="210" cy="90" r="75" fill="#E0F2FE" fillOpacity="0.6" />
        <circle cx="230" cy="70" r="50" fill="#BAE6FD" fillOpacity="0.4" />

        {/* Desk Surface */}
        <path
          d="M30 160 H270"
          stroke="#94A3B8"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Potted Plant */}
        <g id="plant">
          {/* Pot */}
          <path
            d="M242 160 L245 138 H263 L266 160 Z"
            fill="#CBD5E1"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          {/* Plant Leaves */}
          <path
            d="M254 138 C250 120 240 115 238 122 C236 128 248 134 254 138 Z"
            fill="#10B981"
          />
          <path
            d="M254 138 C258 112 268 110 270 118 C272 126 260 134 254 138 Z"
            fill="#059669"
          />
          <path
            d="M254 138 C252 110 255 100 258 100 C261 100 258 125 254 138 Z"
            fill="#34D399"
          />
        </g>

        {/* Laptop */}
        <g id="laptop">
          {/* Base */}
          <rect x="75" y="154" width="70" height="4" rx="2" fill="#64748B" />
          {/* Screen */}
          <polygon points="85,115 135,115 142,154 78,154" fill="#1E293B" />
          <polygon points="88,118 132,118 138,151 82,151" fill="#38BDF8" fillOpacity="0.3" />
          {/* Logo on screen */}
          <circle cx="110" cy="134" r="3" fill="#FFFFFF" fillOpacity="0.8" />
        </g>

        {/* Woman Character */}
        <g id="character">
          {/* Hair behind */}
          <path
            d="M172 65 C160 65 148 78 148 105 C148 120 152 135 156 142 C162 138 168 130 170 120 Z"
            fill="#1E293B"
          />

          {/* Body / White Blouse */}
          <path
            d="M152 160 C150 140 156 120 172 115 C180 112 188 112 196 115 C212 120 218 140 216 160 Z"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />

          {/* Neck */}
          <rect x="180" y="100" width="8" height="15" rx="3" fill="#FBCFE8" />

          {/* Head & Face */}
          <circle cx="184" cy="85" r="16" fill="#FDE2D8" />

          {/* Eye & Smile */}
          <circle cx="178" cy="84" r="1.5" fill="#1E293B" />
          <path
            d="M176 90 Q180 94 184 90"
            stroke="#1E293B"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Hair Front / Style */}
          <path
            d="M170 80 C170 70 176 65 186 65 C196 65 202 74 202 85 C198 80 192 78 184 80 C176 82 173 88 170 80 Z"
            fill="#1E293B"
          />
          <path
            d="M198 82 C204 90 206 102 204 116 C200 116 196 110 196 102 Z"
            fill="#1E293B"
          />

          {/* Arms reaching to laptop keyboard */}
          <path
            d="M165 125 C150 135 130 148 122 153"
            stroke="#FDE2D8"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M178 125 C165 135 145 148 136 153"
            stroke="#FDE2D8"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Sleeve */}
          <path
            d="M168 120 C160 128 155 135 152 140"
            stroke="#F8FAFC"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
