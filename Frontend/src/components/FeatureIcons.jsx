export const RiskIntelligenceIcon = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <defs>
      <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#0284c7', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    <circle cx="32" cy="32" r="30" stroke="url(#riskGrad)" strokeWidth="1.5" opacity="0.3" />

    <circle cx="32" cy="18" r="4" fill="#06b6d4" />
    <circle cx="22" cy="30" r="4" fill="#06b6d4" />
    <circle cx="42" cy="30" r="4" fill="#06b6d4" />
    <circle cx="20" cy="45" r="4" fill="#06b6d4" />
    <circle cx="44" cy="45" r="4" fill="#06b6d4" />
    <circle cx="32" cy="56" r="4" fill="#06b6d4" />

    <line x1="32" y1="18" x2="22" y2="30" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <line x1="32" y1="18" x2="42" y2="30" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <line x1="22" y1="30" x2="20" y2="45" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <line x1="22" y1="30" x2="32" y2="56" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <line x1="42" y1="30" x2="44" y2="45" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <line x1="42" y1="30" x2="32" y2="56" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <line x1="20" y1="45" x2="44" y2="45" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />

    <circle cx="32" cy="32" r="6" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
    <circle cx="32" cy="32" r="2" fill="#06b6d4" />

    <circle cx="32" cy="32" r="18" fill="none" stroke="url(#riskGrad)" strokeWidth="0.5" opacity="0.4" strokeDasharray="3,2" />
  </svg>
);

export const LiveReroutingIcon = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <defs>
      <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#0284c7', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    <circle cx="10" cy="10" r="5" fill="#06b6d4" />
    <circle cx="54" cy="54" r="5" fill="#06b6d4" />

    <path d="M 15 10 Q 32 8 48 15" stroke="url(#routeGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M 10 20 Q 28 32 50 42" stroke="#06b6d4" strokeWidth="2" fill="none" opacity="0.4" strokeDasharray="4,3" />

    <path d="M 15 54 Q 32 50 48 45" stroke="url(#routeGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

    <g opacity="0.7">
      <rect x="28" y="28" width="8" height="8" fill="none" stroke="#06b6d4" strokeWidth="1.5" rx="1" />
      <line x1="28" y1="32" x2="36" y2="32" stroke="#06b6d4" strokeWidth="1" />
      <line x1="32" y1="28" x2="32" y2="36" stroke="#06b6d4" strokeWidth="1" />
    </g>

    <circle cx="32" cy="32" r="16" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />

    <path d="M 48 15 L 52 18 L 48 20 Z" fill="#06b6d4" />
    <path d="M 48 45 L 52 48 L 48 50 Z" fill="#06b6d4" />
  </svg>
);

export const MultiSignalFusionIcon = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <defs>
      <linearGradient id="fusionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#0284c7', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    <rect x="6" y="8" width="14" height="12" rx="2" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
    <circle cx="13" cy="14" r="2" fill="#06b6d4" />
    <path d="M 13 8 L 13 6" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
    <path d="M 13 20 L 13 22" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
    <text x="13" y="30" fontSize="10" textAnchor="middle" fill="#06b6d4" opacity="0.7">SIGNAL 1</text>

    <rect x="44" y="8" width="14" height="12" rx="2" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
    <circle cx="51" cy="14" r="2" fill="#06b6d4" />
    <path d="M 51 8 L 51 6" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
    <path d="M 51 20 L 51 22" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
    <text x="51" y="30" fontSize="10" textAnchor="middle" fill="#06b6d4" opacity="0.7">SIGNAL 2</text>

    <path d="M 20 14 L 44 14" stroke="url(#fusionGrad)" strokeWidth="2" opacity="0.6" strokeDasharray="4,2" />
    <circle cx="32" cy="14" r="3" fill="#06b6d4" opacity="0.5" />

    <path d="M 13 20 L 32 40" stroke="#06b6d4" strokeWidth="1.5" opacity="0.4" />
    <path d="M 51 20 L 32 40" stroke="#06b6d4" strokeWidth="1.5" opacity="0.4" />

    <circle cx="32" cy="48" r="10" fill="none" stroke="url(#fusionGrad)" strokeWidth="2" />
    <text x="32" y="52" fontSize="9" textAnchor="middle" fill="#06b6d4" fontWeight="bold">FUSED</text>

    <circle cx="32" cy="48" r="6" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.3" />

    <circle cx="22" cy="10" r="8" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.2" />
    <circle cx="42" cy="10" r="8" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.2" />
  </svg>
);

export const SeaRouteOptimizerIcon = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <defs>
      <linearGradient id="seaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#0284c7', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    <path d="M 8 24 Q 16 20 24 22 T 40 20 T 56 24" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M 8 32 Q 16 28 24 30 T 40 28 T 56 32" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M 8 40 Q 16 36 24 38 T 40 36 T 56 40" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.4" />

    <polygon points="16,8 22,14 10,14" fill="#06b6d4" opacity="0.7" />

    <path d="M 8 10 Q 16 14 24 12 Q 32 10 40 14 Q 48 18 56 14" stroke="url(#seaGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M 8 48 Q 16 52 24 50 Q 32 48 40 52 Q 48 56 56 50" stroke="url(#seaGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

    <circle cx="8" cy="10" r="4" fill="#06b6d4" />
    <circle cx="56" cy="48" r="4" fill="#06b6d4" />

    <circle cx="32" cy="32" r="8" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <circle cx="32" cy="32" r="4" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />

    <path d="M 24 32 L 40 32" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
    <path d="M 32 24 L 32 40" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />

    <path d="M 56 14 L 60 12 L 58 18 Z" fill="#06b6d4" opacity="0.8" />
    <path d="M 8 48 L 4 50 L 6 44 Z" fill="#06b6d4" opacity="0.8" />

    <text x="32" y="58" fontSize="10" textAnchor="middle" fill="#06b6d4" opacity="0.6" fontWeight="bold">OPTIMAL PATH</text>
  </svg>
);

export const InstantAlertsIcon = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <defs>
      <linearGradient id="alertGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#0284c7', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    <path d="M 32 4 L 44 28 L 28 28 L 36 44 L 16 28 L 30 28 Z" fill="url(#alertGrad)" opacity="0.8" />
    <path d="M 32 4 L 44 28 L 28 28 L 36 44 L 16 28 L 30 28 Z" fill="none" stroke="#06b6d4" strokeWidth="1.5" />

    <circle cx="48" cy="20" r="8" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <circle cx="48" cy="20" r="5" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />

    <circle cx="20" cy="50" r="6" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.7" />
    <circle cx="20" cy="50" r="3" fill="#06b6d4" opacity="0.5" />

    <circle cx="50" cy="48" r="6" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.7" />
    <circle cx="50" cy="48" r="3" fill="#06b6d4" opacity="0.5" />

    <path d="M 32 14 L 32 22" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <path d="M 24 10 L 28 14" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <path d="M 40 10 L 36 14" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />

    <g opacity="0.5">
      <circle cx="32" cy="14" r="10" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
      <circle cx="32" cy="14" r="14" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
      <circle cx="32" cy="14" r="18" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
    </g>

    <text x="32" y="62" fontSize="9" textAnchor="middle" fill="#06b6d4" opacity="0.7" fontWeight="bold">INSTANT</text>
  </svg>
);

export const AICopilotIcon = ({ size = 64, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
    <defs>
      <linearGradient id="copilotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#0284c7', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    <circle cx="32" cy="32" r="28" fill="none" stroke="url(#copilotGrad)" strokeWidth="1.5" opacity="0.3" />

    <circle cx="32" cy="20" r="6" fill="url(#copilotGrad)" />
    <circle cx="32" cy="20" r="6" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />

    <path d="M 32 26 L 32 38" stroke="#06b6d4" strokeWidth="2" opacity="0.7" />
    <path d="M 20 38 L 32 38 L 44 38" stroke="#06b6d4" strokeWidth="2" opacity="0.7" strokeLinecap="round" />

    <circle cx="18" cy="44" r="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
    <circle cx="46" cy="44" r="4" fill="none" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />

    <path d="M 22 44 L 28 44" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
    <path d="M 36 44 L 42 44" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />

    <circle cx="18" cy="44" r="2" fill="#06b6d4" opacity="0.8" />
    <circle cx="46" cy="44" r="2" fill="#06b6d4" opacity="0.8" />

    <path d="M 32 20 L 24 30" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
    <path d="M 32 20 L 40 30" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />

    <path d="M 24 30 L 28 40" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
    <path d="M 40 30 L 36 40" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />

    <circle cx="32" cy="52" r="3" fill="#06b6d4" opacity="0.6" />
    <circle cx="32" cy="52" r="6" fill="none" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
  </svg>
);
