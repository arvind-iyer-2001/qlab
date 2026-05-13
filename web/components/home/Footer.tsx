import Link from 'next/link'
import { Brand } from '@/components/ui/Brand'

const LINKS = {
  product: [
    { label: 'Problems', href: '/problems' },
    { label: 'Capstones', href: '/#capstones' },
    { label: 'Profile', href: '/profile' },
  ],
  resources: [
    { label: 'KX Academy', href: 'https://kx.com/academy/', external: true },
    { label: 'q reference', href: 'https://code.kx.com/q/', external: true },
    { label: 'GitHub', href: 'https://github.com/arvind-iyer-2001/qlab', external: true },
  ],
  account: [
    { label: 'Sign in', href: '/sign-in' },
    { label: 'Sign up', href: '/sign-up' },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Brand as="link" size="lg" />
            <p className="text-zinc-500 font-mono text-xs mt-3 leading-relaxed">
              The training ground for kdb+/q developers.
              <br />
              <span className="text-zinc-600">{`/ \\t:1000  -2+count string func`}</span>
            </p>
          </div>

          <FooterColumn label="product" items={LINKS.product} />
          <FooterColumn label="resources" items={LINKS.resources} />
          <FooterColumn label="account" items={LINKS.account} />
        </div>

        <div className="border-t border-zinc-900 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
          <p className="text-zinc-600">
            © {year} qLab · not affiliated with KX Systems
          </p>
          <p className="text-zinc-700">
            built with Next.js · FastAPI · MongoDB ·{' '}
            <span className="text-emerald-700">q 4.0</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

interface ColumnProps {
  label: string
  items: { label: string; href: string; external?: boolean }[]
}

function FooterColumn({ label, items }: ColumnProps) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-3">
        {label}
      </p>
      <ul className="space-y-2 font-mono text-sm">
        {items.map((item) => (
          <li key={item.href}>
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-emerald-400 transition"
              >
                {item.label} ↗
              </a>
            ) : (
              <Link
                href={item.href}
                className="text-zinc-300 hover:text-emerald-400 transition"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
