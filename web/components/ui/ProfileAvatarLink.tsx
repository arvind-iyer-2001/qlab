'use client'

interface Props {
  imageUrl?: string | null
  name?: string | null
}

export function ProfileAvatarLink({ imageUrl, name }: Props) {
  const initial = (name?.trim()?.[0] || '?').toUpperCase()
  return (
    <a
      href="/profile"
      aria-label="Profile"
      title="Profile"
      className="group relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-zinc-800 hover:border-emerald-500 transition overflow-hidden"
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name ?? 'Profile'} className="w-full h-full object-cover" />
      ) : (
        <span className="text-zinc-300 text-xs font-semibold bg-gradient-to-br from-zinc-700 to-zinc-900 w-full h-full flex items-center justify-center">
          {initial}
        </span>
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 mt-2 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
      >
        Profile
      </span>
    </a>
  )
}
