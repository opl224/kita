import * as React from "react";

export function VoiceLinkLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 14.5A8.5 8.5 0 0 1 12 6a8.5 8.5 0 0 1 8 8.5" />
      <path d="M12 18v-4" />
      <path d="M4 14.5a.5.5 0 0 0-1 0v0a.5.5 0 0 0 1 0Z" />
      <path d="M20 14.5a.5.5 0 0 0-1 0v0a.5.5 0 0 0 1 0Z" />
    </svg>
  );
}
