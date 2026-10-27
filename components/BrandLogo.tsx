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
    width: 1024,
    height: 1024,
  },
  stacked: {
    src: '/brand/qhsse-logo-stacked.svg',
    width: 1024,
    height: 1024,
  },
  mark: {
    src: '/brand/qhsse-logo-mark.svg',
    width: 1024,
    height: 1024,
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
