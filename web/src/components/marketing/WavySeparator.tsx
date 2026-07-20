export function WavySeparator({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 120"
      className={`block w-full ${className || ''}`}
      fill="currentColor"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z" />
    </svg>
  );
}
