'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function AuthCallback() {
  const { getToken, isLoaded } = useAuth()
  const [message, setMessage] = useState('Signing you in to qLab...')

  useEffect(() => {
    if (!isLoaded) return

    getToken()
      .then(token => {
        if (!token) {
          setMessage('Could not get token. Please try signing in again.')
          return
        }
        setMessage('Returning to VS Code...')
        window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(token)}`
      })
      .catch(() => {
        setMessage('Something went wrong. Please close this tab and try again.')
      })
  }, [isLoaded, getToken])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '18px' }}>{message}</p>
      <p style={{ color: '#888', fontSize: '14px' }}>You can close this tab once VS Code opens.</p>
    </div>
  )
}
