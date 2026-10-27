import clsx from 'clsx'
import Image from 'next/image'

type BrandLogoProps = {
  variant?: 'header' | 'stacked' | 'mark'
  className?: string
  priority?: boolean
}

const CONFIG = {
  header: {
    src: '/brand/qhsse-logo-header.svg',
    width: 280,
    height: 70,
  },
  stacked: {
    src: '/brand/qhsse-logo-stacked.svg',
    width: 200,
    height: 200,
  },
  mark: {
    src: '/brand/qhsse-logo-mark.svg',
    width: 100,
    height: 100,
  },
} as const

export default function BrandLogo({
  variant = 'header',
  className,
  priority = false,
}: BrandLogoProps) {
  const logo = CONFIG[variant]

  return (
    <div className={clsx('relative', className)}>
      <Image
        src={logo.src}
        alt="QHSSE Consultant logo"
        width={logo.width}
        height={logo.height}
        priority={priority}
        unoptimized
        className="h-full w-full object-contain"
      />
    </div>
  )
}
