'use client'
import { useClerk } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function SignOut() {
  const { signOut } = useClerk()
  const [message, setMessage] = useState('Signing out…')

  useEffect(() => {
    signOut()
      .then(() => setMessage('Signed out of qLab. You can close this tab.'))
      .catch(() => setMessage('Sign-out failed. Please try again.'))
  }, [signOut])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '18px' }}>{message}</p>
    </div>
  )
}
