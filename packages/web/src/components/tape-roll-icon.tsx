interface Props {
  size?: number;
  className?: string;
}

/**
 * Tape / Film Roll brand icon (tdesign:film-filled)
 */
export function TapeRollIcon({ size = 20, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 25 24"
      fill="currentColor"
      className={className}
    >
      <path d="M20.082 19.7q-.704.718-1.53 1.3h5.674v2h-12c-6.075 0-11-4.925-11-11s4.925-11 11-11s11 4.925 11 11c0 2.998-1.2 5.717-3.144 7.7M12.226 5a2 2 0 1 0 0 4a2 2 0 0 0 0-4m5 5a2 2 0 1 0 0 4a2 2 0 0 0 0-4m-12 2a2 2 0 1 0 4 0a2 2 0 0 0-4 0m7 3a2 2 0 1 0 0 4a2 2 0 0 0 0-4" />
    </svg>
  );
}
