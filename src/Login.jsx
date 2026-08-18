import { useState } from 'react'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { supabase } from './supabaseClient'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessageType('error')
        setMessage(error.message)
      } else {
        setMessageType('success')
        setMessage('Check your email to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessageType('error')
        setMessage(error.message)
      }
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo">L</div>
          <div className="name">Ledger <span>Salary, expenses & recurring bills</span></div>
        </div>

        <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
        <p className="login-sub">
          {isSignUp ? 'Set up your account to start tracking.' : 'Log in to see your balance and bills.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <div className="input-group">
            <Mail size={15} strokeWidth={2} />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Password</label>
          <div className="input-group">
            <Lock size={15} strokeWidth={2} />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Please wait…' : (isSignUp ? 'Sign up' : 'Log in')}
            {!loading && <ArrowRight size={15} strokeWidth={2} />}
          </button>
        </form>

        {message && <div className={`login-message ${messageType}`}>{message}</div>}

        <div className="login-switch">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}>
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  )
}