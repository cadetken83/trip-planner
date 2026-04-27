export default function WanderlistIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 28" fill="none" aria-hidden="true">
      <path
        d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 19 9 19s9-12.25 9-19c0-4.97-4.03-9-9-9z"
        fill="currentColor"
      />
      <circle cx="12" cy="9" r="3.2" fill="white" opacity="0.35" />
    </svg>
  );
}
