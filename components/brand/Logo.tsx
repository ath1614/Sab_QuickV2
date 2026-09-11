import * as React from "react";

export type LogoVariant = "full" | "compact" | "icon" | "thermal";
export type LogoTheme = "light" | "dark";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: number | string;
  className?: string;
}

export const BRAND_COLORS = {
  forestGreen: "#0B6E4F",
  forestGreenDark: "#074834",
  kineticGreen: "#00C853",
  kineticGreenGlow: "#69F0AE",
  carbonBlack: "#111827",
  carbonDark: "#0B0F19",
  pureWhite: "#FFFFFF",
  slateMuted: "#64748B",
  slateLight: "#94A3B8",
} as const;

export function Logo({
  variant = "full",
  theme = "light",
  size,
  className = "",
  style,
  ...props
}: LogoProps) {
  const isDark = theme === "dark";

  // --- 1. ICON VARIANT (1:1 Aspect Ratio: 100x100) ---
  if (variant === "icon") {
    const dimension = size || 40;
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={dimension}
        height={dimension}
        className={className}
        style={style}
        role="img"
        aria-label="SabQuick Monogram Icon"
        {...props}
      >
        <defs>
          <linearGradient id="sq-icon-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor={isDark ? "#1E293B" : "#0B6E4F"} />
            <stop offset="1" stopColor={isDark ? "#0F172A" : "#064E3B"} />
          </linearGradient>
          <linearGradient id="sq-kinetic-accent" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00E676" />
            <stop offset="1" stopColor="#00C853" />
          </linearGradient>
          <filter id="sq-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00C853" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Rounded Container */}
        <rect width="100" height="100" rx="24" fill="url(#sq-icon-bg)" />
        <rect
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          rx="22.5"
          stroke={isDark ? "#334155" : "rgba(255,255,255,0.2)"}
          strokeWidth="3"
        />

        {/* Dynamic Speed Streaks in background */}
        <path d="M-5 25 L35 25 L25 35 L-5 35 Z" fill={isDark ? "rgba(0,200,83,0.15)" : "rgba(255,255,255,0.12)"} />
        <path d="M-10 42 L48 42 L38 50 L-10 50 Z" fill={isDark ? "rgba(0,200,83,0.2)" : "rgba(255,255,255,0.15)"} />
        <path d="M-5 58 L28 58 L20 64 L-5 64 Z" fill={isDark ? "rgba(0,200,83,0.12)" : "rgba(255,255,255,0.08)"} />

        {/* Kinetic Lightning Speed Dash */}
        <path
          d="M68 12 L44 48 L62 48 L36 88 L78 40 L58 40 Z"
          fill="url(#sq-kinetic-accent)"
          opacity="0.9"
          filter="url(#sq-glow)"
        />

        {/* Bold "S" Character */}
        <path
          d="M24 38 C24 32 29 27 37 27 C45 27 50 32 50 38 L42 38 C42 35 39 33 37 33 C34 33 31 35 31 38 C31 41 33 43 38 44 C45 46 51 49 51 56 C51 63 45 68 37 68 C28 68 23 63 23 56 L31 56 C31 60 34 62 37 62 C41 62 43 60 43 56 C43 52 40 50 35 49 C28 47 24 44 24 38 Z"
          fill="#FFFFFF"
        />

        {/* Bold "Q" Character with Tail */}
        <path
          d="M52 47 C52 35 60 27 72 27 C84 27 92 35 92 47 C92 59 84 68 72 68 C68 68 64 66 61 64 L57 73 L51 70 L55 61 C53 57 52 52 52 47 Z M72 33 C64 33 60 39 60 47 C60 55 64 61 72 61 C80 61 84 55 84 47 C84 39 80 33 72 33 Z"
          fill="#FFFFFF"
        />
        {/* Kinetic Q Stinger */}
        <polygon points="73,59 87,75 79,77 69,65" fill="#00E676" />
      </svg>
    );
  }

  // --- 2. THERMAL VARIANT (High Contrast 100% Monochrome B&W for 58mm/80mm POS) ---
  if (variant === "thermal") {
    const width = size || 180;
    const height = typeof size === "number" ? Math.round(size * 0.42) : undefined;
    return (
      <svg
        viewBox="0 0 300 125"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        className={className}
        style={style}
        role="img"
        aria-label="SabQuick Thermal Receipt Stamp"
        {...props}
      >
        {/* Border Frame */}
        <rect x="2" y="2" width="296" height="121" rx="8" stroke="#000000" strokeWidth="4" />
        
        {/* Top Header Strip */}
        <rect x="2" y="2" width="296" height="26" fill="#000000" />
        <text
          x="150"
          y="19"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="11"
          letterSpacing="3"
          textAnchor="middle"
        >
          HYPER-LOCAL 10-15 MIN DISPATCH
        </text>

        {/* Speed Cut Left Angled Solid */}
        <polygon points="16,36 78,36 62,94 16,94" fill="#000000" />
        {/* Speed Lines inside Angle */}
        <line x1="22" y1="48" x2="42" y2="48" stroke="#FFFFFF" strokeWidth="3" />
        <line x1="20" y1="62" x2="52" y2="62" stroke="#FFFFFF" strokeWidth="3" />
        <line x1="22" y1="76" x2="38" y2="76" stroke="#FFFFFF" strokeWidth="3" />
        <text
          x="46"
          y="80"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="22"
          letterSpacing="1"
        >
          SQ
        </text>

        {/* Main Bold Text */}
        <text
          x="88"
          y="68"
          fill="#000000"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="34"
          letterSpacing="-1"
        >
          SabQuick
        </text>

        {/* Sub-tagline */}
        <text
          x="89"
          y="88"
          fill="#000000"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="10"
          letterSpacing="1.5"
        >
          PROVISION STORE &bull; DOORSTEP FULFILLMENT
        </text>

        {/* Bottom Dotted Tear Line Indicator */}
        <line x1="10" y1="106" x2="290" y2="106" stroke="#000000" strokeWidth="2" strokeDasharray="4 4" />
        <text
          x="150"
          y="118"
          fill="#000000"
          fontFamily="monospace"
          fontWeight="700"
          fontSize="8"
          letterSpacing="2"
          textAnchor="middle"
        >
          GEOFENCE VERIFIED SLA: 2.5 KM
        </text>
      </svg>
    );
  }

  // --- 3. COMPACT VARIANT (Horizontal Streamlined Lockup: Height ~36-44px) ---
  if (variant === "compact") {
    const height = size || 38;
    const width = typeof size === "number" ? Math.round(size * 4.2) : undefined;
    const textColor = isDark ? "#FFFFFF" : "#111827";

    return (
      <svg
        viewBox="0 0 210 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        height={height}
        width={width}
        className={className}
        style={style}
        role="img"
        aria-label="SabQuick Compact Logo"
        {...props}
      >
        <defs>
          <linearGradient id="sq-compact-grad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B6E4F" />
            <stop offset="1" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="sq-compact-accent" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#00E676" />
            <stop offset="1" stopColor="#00C853" />
          </linearGradient>
        </defs>

        {/* Monogram Badge */}
        <g transform="translate(2, 4)">
          {/* Badge Background */}
          <rect width="42" height="42" rx="12" fill="url(#sq-compact-grad)" />
          {/* Accent speed slice */}
          <polygon points="0,28 16,12 24,12 8,28" fill="#00E676" opacity="0.3" />
          <polygon points="12,42 28,26 34,26 18,42" fill="#00E676" opacity="0.4" />
          
          {/* Monogram Letters */}
          <text
            x="21"
            y="28"
            fill="#FFFFFF"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="18"
            letterSpacing="-0.5"
            textAnchor="middle"
          >
            SQ
          </text>

          {/* Lightning Flash Accent */}
          <polygon points="34,8 30,18 36,18 28,30 31,21 27,21" fill="url(#sq-compact-accent)" />
        </g>

        {/* "Sab" text */}
        <text
          x="54"
          y="34"
          fill={textColor}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="-0.8"
        >
          Sab
        </text>

        {/* "Quick" text */}
        <text
          x="97"
          y="34"
          fill="#0B6E4F"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="-0.8"
        >
          Quick
        </text>

        {/* Speed streak underline & 15m tag */}
        <rect x="54" y="39" width="102" height="3" rx="1.5" fill="url(#sq-compact-accent)" />
        
        {/* Speed Flash Badge */}
        <rect x="162" y="16" width="44" height="20" rx="6" fill="#00C853" fillOpacity={isDark ? "0.2" : "0.15"} />
        <text
          x="184"
          y="29.5"
          fill="#00A844"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="9"
          letterSpacing="0.5"
          textAnchor="middle"
        >
          10-15m
        </text>
      </svg>
    );
  }

  // --- 4. FULL VARIANT (Master Full Lockup with Tagline) ---
  const width = size || 360;
  const height = typeof size === "number" ? Math.round(size * 0.32) : undefined;
  const cardBg = isDark ? "#111827" : "#0B6E4F";
  const taglineTextColor = isDark ? "#E2E8F0" : "#FFFFFF";

  return (
    <svg
      viewBox="0 0 450 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={className}
      style={style}
      role="img"
      aria-label="SabQuick Master Brand Lockup"
      {...props}
    >
      <defs>
        <linearGradient id="sq-full-forest" x1="0" y1="0" x2="450" y2="145" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B6E4F" />
          <stop offset="0.6" stopColor="#08573E" />
          <stop offset="1" stopColor="#043827" />
        </linearGradient>

        <linearGradient id="sq-full-carbon" x1="0" y1="0" x2="160" y2="145" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>

        <linearGradient id="sq-full-accent" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E676" />
          <stop offset="1" stopColor="#00C853" />
        </linearGradient>

        <filter id="sq-drop-shadow" x="-5%" y="-5%" width="110%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main Base Card with soft shadow */}
      <rect
        x="6"
        y="6"
        width="438"
        height="132"
        rx="20"
        fill={cardBg}
        filter="url(#sq-drop-shadow)"
      />
      <rect
        x="7"
        y="7"
        width="436"
        height="130"
        rx="19"
        stroke={isDark ? "#334155" : "rgba(255,255,255,0.15)"}
        strokeWidth="2"
      />

      {/* Left Carbon Angled Speed Wedge */}
      <polygon
        points="6,6 160,6 115,138 6,138"
        fill="url(#sq-full-carbon)"
      />

      {/* Speed Cut Streaks on Carbon Block */}
      <polygon points="12,28 72,28 62,38 12,38" fill="#00E676" fillOpacity="0.8" />
      <polygon points="10,50 92,50 82,60 10,60" fill="#FFFFFF" fillOpacity="0.85" />
      <polygon points="14,72 64,72 54,80 14,80" fill="#00E676" fillOpacity="0.7" />
      <polygon points="18,92 48,92 38,98 18,98" fill="#FFFFFF" fillOpacity="0.4" />

      {/* Angled Divider Glow Line */}
      <line x1="160" y1="6" x2="115" y2="138" stroke="url(#sq-full-accent)" strokeWidth="4" />

      {/* Lightning Bolt Symbol on Left Wedge */}
      <g transform="translate(68, 46)">
        <polygon
          points="20,0 2,24 16,24 0,46 32,18 18,18"
          fill="url(#sq-full-accent)"
        />
      </g>

      {/* Top Text: "SAB" */}
      <text
        x="180"
        y="54"
        fill="#FFFFFF"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="44"
        letterSpacing="1"
      >
        SAB
      </text>

      {/* Slanted "QUICK" with green accent streak */}
      <g transform="skewX(-10) translate(28, 0)">
        <text
          x="285"
          y="54"
          fill="#00E676"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="44"
          letterSpacing="-1"
        >
          QUICK
        </text>
      </g>

      {/* Dynamic 10-15 Min Express Pill Badge */}
      <rect x="368" y="24" width="62" height="24" rx="8" fill="#000000" fillOpacity="0.35" />
      <text
        x="399"
        y="39"
        fill="#00E676"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="10"
        letterSpacing="0.8"
        textAnchor="middle"
      >
        15 MIN
      </text>

      {/* Separator Line */}
      <line x1="172" y1="74" x2="430" y2="74" stroke="url(#sq-full-accent)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Tagline: A COMPLETE PROVISION STORE | RIGHT TO YOUR DOOR */}
      <text
        x="302"
        y="98"
        fill={taglineTextColor}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="10.5"
        letterSpacing="2.2"
        textAnchor="middle"
      >
        A COMPLETE PROVISION STORE
      </text>

      <text
        x="302"
        y="116"
        fill="#69F0AE"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="9.5"
        letterSpacing="3"
        textAnchor="middle"
      >
        &bull; RIGHT TO YOUR DOOR &bull;
      </text>
    </svg>
  );
}

export default Logo;
