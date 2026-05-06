import Link from 'next/link'

interface BrandProps {
  as?: 'span' | 'link'
  size?: 'sm' | 'md' | 'lg'
}

const SIZE: Record<NonNullable<BrandProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
}

export function Brand({ as = 'span', size = 'md' }: BrandProps) {
  const className = `font-mono font-bold text-emerald-400 ${SIZE[size]}`
  if (as === 'link') {
    return (
      <Link href="/" className={`${className} hover:text-emerald-300 transition`}>
        qLab
      </Link>
    )
  }
  return <span className={className}>qLab</span>
}
