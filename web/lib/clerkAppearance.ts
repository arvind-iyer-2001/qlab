import type { Appearance } from '@clerk/types'

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#10b981',
    colorBackground: '#09090b',
    colorInputBackground: '#18181b',
    colorInputText: '#fafafa',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorNeutral: '#27272a',
    borderRadius: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  elements: {
    card: 'bg-zinc-900 border border-zinc-800 shadow-none',
    headerTitle: 'text-zinc-50',
    headerSubtitle: 'text-zinc-400',
    formButtonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950',
    footerActionLink: 'text-emerald-400 hover:text-emerald-300',
  },
}
