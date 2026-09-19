import * as React from "react";

export type LogoVariant = "full" | "compact" | "icon" | "thermal";
export type LogoTheme = "light" | "dark";

export interface LogoProps extends React.HTMLAttributes<HTMLElement> {
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: number | string;
  className?: string;
  [key: string]: any;
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

  // --- 1. ICON VARIANT (Official SabQuick App Icon) ---
  if (variant === "icon") {
    const dimension = size || 40;
    return (
      <img
        src="/brand/app-icon.png"
        alt="SabQuick"
        width={typeof dimension === "number" ? dimension : undefined}
        height={typeof dimension === "number" ? dimension : undefined}
        className={`rounded-xl object-contain shrink-0 ${className}`}
        style={{
          width: typeof dimension === "number" ? `${dimension}px` : dimension,
          height: typeof dimension === "number" ? `${dimension}px` : dimension,
          ...style,
        }}
        {...(props as any)}
      />
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
        {...(props as any)}
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

  // --- 3. COMPACT VARIANT (Horizontal Streamlined Navbar Lockup) ---
  if (variant === "compact") {
    const height = size || 38;
    return (
      <img
        src="/brand/navbar-logo.png"
        alt="SabQuick"
        className={`object-contain shrink-0 ${className}`}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          width: "auto",
          ...style,
        }}
        {...(props as any)}
      />
    );
  }

  // --- 4. FULL VARIANT (Master Official Brand Lockup) ---
  const height = size || 48;
  return (
    <img
      src="/brand/sabquick-official-logo.png"
      alt="SabQuick"
      className={`object-contain shrink-0 ${className}`}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: "auto",
        ...style,
      }}
      {...(props as any)}
    />
  );
}

export default Logo;
