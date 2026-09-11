import L from "leaflet";

/**
 * Ensures keyframe animation for rider pulse is available in document
 */
function ensureRiderPulseKeyframe() {
  if (typeof document === "undefined") return;
  const styleId = "sq-rider-pulse-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes sqRadarPulse {
        0% { transform: scale(0.8); opacity: 0.8; }
        50% { transform: scale(1.5); opacity: 0.3; }
        100% { transform: scale(1.9); opacity: 0; }
      }
      .sq-rider-radar-ring {
        animation: sqRadarPulse 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * 1. Dark Store Hub Pin
 * 38x38px Forest Green circular badge with white kinetic "SQ" monogram, 2.5px white border, and drop shadow.
 */
export function createHubPin(): L.DivIcon {
  return L.divIcon({
    className: "sq-hub-pin-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        background: linear-gradient(135deg, #0B6E4F 0%, #064E3B 100%);
        border: 2.5px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 4px 14px rgba(11, 110, 79, 0.5);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Speed Streaks */}
          <path d="M-5 25 L35 25 L25 35 L-5 35 Z" fill="rgba(255,255,255,0.25)" />
          <path d="M-10 42 L48 42 L38 50 L-10 50 Z" fill="rgba(255,255,255,0.3)" />
          <path d="M-5 58 L28 58 L20 64 L-5 64 Z" fill="rgba(255,255,255,0.2)" />
          {/* Lightning Accent */}
          <path d="M68 12 L44 48 L62 48 L36 88 L78 40 L58 40 Z" fill="#00E676" opacity="0.9" />
          {/* Bold S */}
          <path d="M24 38 C24 32 29 27 37 27 C45 27 50 32 50 38 L42 38 C42 35 39 33 37 33 C34 33 31 35 31 38 C31 41 33 43 38 44 C45 46 51 49 51 56 C51 63 45 68 37 68 C28 68 23 63 23 56 L31 56 C31 60 34 62 37 62 C41 62 43 60 43 56 C43 52 40 50 35 49 C28 47 24 44 24 38 Z" fill="#FFFFFF" />
          {/* Bold Q */}
          <path d="M52 47 C52 35 60 27 72 27 C84 27 92 35 92 47 C92 59 84 68 72 68 C68 68 64 66 61 64 L57 73 L51 70 L55 61 C53 57 52 52 52 47 Z M72 33 C64 33 60 39 60 47 C60 55 64 61 72 61 C80 61 84 55 84 47 C84 39 80 33 72 33 Z" fill="#FFFFFF" />
          <polygon points="73,59 87,75 79,77 69,65" fill="#00E676" />
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

/**
 * 2. Customer Destination Drop Pin
 * 34x42px teardrop pin with inner target ring that turns Kinetic Green (#00C853) when <= 2.5km and Crimson Red (#EF4444) when out of range.
 */
export function createCustomerPin(isServiceable: boolean = true): L.DivIcon {
  const targetColor = isServiceable ? "#00C853" : "#EF4444";
  const glowColor = isServiceable ? "rgba(0, 200, 83, 0.4)" : "rgba(239, 68, 68, 0.4)";

  return L.divIcon({
    className: "sq-customer-pin-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: grab;
        filter: drop-shadow(0 4px 10px ${glowColor});
        transition: transform 0.15s ease;
      ">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Teardrop Base Shell */}
          <path
            d="M17 0C7.61116 0 0 7.61116 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.61116 26.3888 0 17 0Z"
            fill="#111827"
          />
          {/* Target Ring Outer */}
          <circle cx="17" cy="17" r="9" fill="${targetColor}" />
          {/* Target Center Dot */}
          <circle cx="17" cy="17" r="4.5" fill="#FFFFFF" />
          {/* Inner Needle Dot */}
          <circle cx="17" cy="17" r="2" fill="${targetColor}" />
        </svg>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });
}

/**
 * 3. Electric Delivery Rider Scooter Pin
 * 42x42px dark carbon disc featuring a Kinetic Speed Green delivery scooter silhouette with pulsing CSS radar rings.
 */
export function createRiderPin(): L.DivIcon {
  ensureRiderPulseKeyframe();

  return L.divIcon({
    className: "sq-rider-pin-marker",
    html: `
      <div style="
        position: relative;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        {/* Pulsing Radar Ring */}
        <div
          class="sq-rider-radar-ring"
          style="
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(0, 200, 83, 0.4);
            pointer-events: none;
          "
        ></div>

        {/* Outer Disc Container */}
        <div style="
          position: relative;
          z-index: 2;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #111827;
          border: 2.5px solid #00C853;
          box-shadow: 0 4px 14px rgba(0, 200, 83, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          {/* Kinetic Speed Green Scooter Silhouette */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Front Wheel */}
            <circle cx="18" cy="17" r="2.5" stroke="#00C853" stroke-width="2" />
            {/* Rear Wheel */}
            <circle cx="6" cy="17" r="2.5" stroke="#00C853" stroke-width="2" />
            {/* Scooter Frame & Delivery Box */}
            <path
              d="M6 17H11L14 11H17M14 11L13 7H16M14 11V15H18"
              stroke="#00C853"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            {/* Delivery Cargo Box on Rear Rack */}
            <rect
              x="5"
              y="7.5"
              width="5.5"
              height="5.5"
              rx="1"
              fill="#00E676"
              stroke="#0B6E4F"
              stroke-width="1"
            />
            {/* Speed Sparks */}
            <line x1="1" y1="10" x2="3" y2="10" stroke="#00E676" stroke-width="1.5" stroke-linecap="round" />
            <line x1="2" y1="13" x2="4" y2="13" stroke="#00E676" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}
