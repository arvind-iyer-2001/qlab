'use client'
import { useUser } from '@clerk/nextjs'

export default function ProfilePage() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading…</p>
      </div>
    )
  }

  const displayName = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || 'qLab User'

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      {user?.imageUrl && (
        <img src={user.imageUrl} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
      )}
      <h1 style={{ fontSize: '20px', fontWeight: 600 }}>{displayName}</h1>
      {user?.primaryEmailAddress && (
        <p style={{ color: '#888', fontSize: '14px' }}>{user.primaryEmailAddress.emailAddress}</p>
      )}
      <p style={{ color: '#aaa', fontSize: '13px', marginTop: '8px' }}>Signed in to qLab</p>
    </div>
  )
}
