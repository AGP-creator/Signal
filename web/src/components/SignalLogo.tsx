/** Signal brand mark — pulse arcs (header lockup). */
export function SignalLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Core beacon */}
      <circle cx="16" cy="16" r="2.75" fill="currentColor" />
      {/* Near arc */}
      <path
        d="M11.2 11.2a6.8 6.8 0 0 1 9.6 0"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M11.2 20.8a6.8 6.8 0 0 0 9.6 0"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* Far arc */}
      <path
        d="M7.6 7.6a11.9 11.9 0 0 1 16.8 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M7.6 24.4a11.9 11.9 0 0 0 16.8 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
