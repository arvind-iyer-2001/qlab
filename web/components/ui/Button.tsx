import Link from 'next/link'

type Variant = 'primary' | 'secondary'

interface CommonProps {
  variant?: Variant
  className?: string
  children: React.ReactNode
}

interface ButtonAsButton extends CommonProps {
  as?: 'button'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}

interface ButtonAsLink extends CommonProps {
  as: 'link'
  href: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

const BASE = 'inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-medium transition'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
  secondary: 'border border-zinc-700 text-zinc-200 hover:border-zinc-500',
}

export function Button(props: ButtonProps) {
  const variant = props.variant ?? 'primary'
  const cls = `${BASE} ${VARIANT[variant]} ${props.className ?? ''}`

  if (props.as === 'link') {
    return <Link href={props.href} className={cls}>{props.children}</Link>
  }

  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`${cls} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {props.children}
    </button>
  )
}
