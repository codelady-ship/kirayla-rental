import type { SVGProps } from "react";

const P: Record<string, string> = {
  camera: "M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  drill: "M3 7h11v5H3z M14 8.5h4 M18 9.5h3 M7 12l-1.5 8h4L11 12 M14 9.5V11",
  tent: "M12 4 3 20h18L12 4Z M12 4l-3 16 M12 4l3 16 M2 20h20",
  bike: "M5.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M18.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M5.5 14.5 9 8h6l3.5 6.5 M9 8l3 6.5h-6.5 M12 14.5 15 8 M8 6h3",
  gamepad: "M7 9h10a4 4 0 0 1 4 4v1.5a2.5 2.5 0 0 1-4.6 1.4L15 14H9l-1.4 1.9A2.5 2.5 0 0 1 3 14.5V13a4 4 0 0 1 4-4Z M8 11v3 M6.5 12.5h3 M15.5 12h.01 M17.5 13.5h.01",
  speaker: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M12 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M12 7.5h.01",
  shirt: "M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0Z",
  music: "M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  wave: "M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2 M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2 M7 7l4-3 4 3",
  baby: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M9 12h.01 M15 12h.01 M10 15.5a3 3 0 0 0 4 0 M12 5c0-1.5 1-2 2-2",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-4-4",
  heart: "M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z",
  star: "m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6L12 16.8 6.6 19.7l1.1-6L3.2 9.4l6.1-.8L12 3Z",
  arrowRight: "M5 12h14 M13 6l6 6-6 6",
  arrowUp: "M12 19V5 M6 11l6-6 6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  menu: "M4 7h16 M4 12h16 M4 17h16",
  x: "M6 6l12 12 M18 6 6 18",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3 12h18 M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  calendar: "M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6Z M4 10h16 M8 3v4 M16 3v4",
  message: "M4 5h16v11H9l-5 4V5Z",
  home: "M3 11 12 4l9 7 M5 10v10h14V10",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  inbox: "M3 13h5l1.5 3h5L16 13h5 M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2-8Z",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7.5 M18 14a7 7 0 0 1 4 7",
  shield: "M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z",
  flag: "M5 21V4 M5 4h11l-2 4 2 4H5",
  tag: "M3 12V4h8l9 9-8 8-9-9Z M7.5 8.5h.01",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4 M10 16l4-4-4-4 M14 12H4",
  plus: "M12 5v14 M5 12h14",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4",
  check: "M5 12.5 10 17 19 7",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4 M6.3 6.3A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.7-1.8",
  sliders: "M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M20 18h0 M16 4v4 M10 10v4 M18 16v4",
  shareIcon: "M12 15V3 M7 8l5-5 5 5 M5 12v8h14v-8",
  sparkle: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M6 18l2.5-2.5 M15.5 8.5 18 6",
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, strokeWidth = 1.6, ...rest }: { name: IconName | string; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  const d = P[name] ?? P.tag;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

/** Tinted circle used on the discovery category pills (the one place a second hue appears is a 16px dot). */
export const CATEGORY_TINT: Record<string, string> = {
  camera: "#efeafe",
  drill: "#f3eee9",
  tent: "#e9f1ea",
  bike: "#e8eef6",
  gamepad: "#f1ebf5",
  speaker: "#f6ece8",
  shirt: "#f5eaf0",
  music: "#eef0e6",
  wave: "#e6f0f3",
  baby: "#f6f1e4",
};
