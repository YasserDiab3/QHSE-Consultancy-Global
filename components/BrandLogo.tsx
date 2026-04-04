import clsx from 'clsx'

type BrandLogoProps = {
  compact?: boolean
  className?: string
  textClassName?: string
  subtitleClassName?: string
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="leafGradient" x1="18" y1="10" x2="110" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9BD700" />
          <stop offset="1" stopColor="#3E9B00" />
        </linearGradient>
        <linearGradient id="trunkGradient" x1="64" y1="44" x2="64" y2="118" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9C5B00" />
          <stop offset="1" stopColor="#6C3B00" />
        </linearGradient>
      </defs>

      <path
        d="M62 50C52 66 51 82 55 92C58 100 55 109 44 117C55 115 63 110 67 105C72 110 80 115 92 117C81 109 78 100 81 92C85 82 84 66 74 50C70 55 65 58 62 58C59 58 55 55 62 50Z"
        fill="url(#trunkGradient)"
      />
      <circle cx="64" cy="48" r="8" fill="#8A4D00" />

      {[
        [22, 37, -28, 16],
        [31, 22, -10, 18],
        [48, 13, 8, 16],
        [65, 10, 22, 18],
        [84, 18, 34, 18],
        [96, 33, 44, 16],
        [100, 55, 58, 18],
        [91, 74, 34, 18],
        [76, 86, 18, 16],
        [52, 90, -8, 15],
        [33, 82, -26, 14],
      ].map(([cx, cy, rotate, scale], index) => (
        <g key={index} transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${scale / 18})`}>
          <path
            d="M0 -10C8 -10 13 -5 13 2C13 9 6 14 0 14C-8 14 -13 9 -13 2C-13 -5 -7 -10 0 -10Z"
            fill="url(#leafGradient)"
          />
          <path d="M-1 11C3 1 7 -4 9 -8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ))}

      {[
        [18, 58, -42],
        [42, 27, -18],
        [78, 26, 12],
        [110, 49, 36],
        [83, 59, 20],
        [29, 62, -20],
      ].map(([cx, cy, rotate], index) => (
        <g key={`small-${index}`} transform={`translate(${cx} ${cy}) rotate(${rotate})`}>
          <ellipse cx="0" cy="0" rx="6" ry="8" fill="#4AA500" />
        </g>
      ))}
    </svg>
  )
}

export default function BrandLogo({
  compact = false,
  className,
  textClassName,
  subtitleClassName,
}: BrandLogoProps) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
        <BrandMark className="h-10 w-10" />
      </div>

      {!compact && (
        <div className="min-w-0">
          <div className={clsx('truncate text-lg font-bold tracking-[0.2em] uppercase', textClassName)}>
            QHSSE Consultant
          </div>
          <div className={clsx('truncate text-[11px] font-semibold tracking-[0.45em] uppercase', subtitleClassName)}>
            Since 2022
          </div>
        </div>
      )}
    </div>
  )
}
