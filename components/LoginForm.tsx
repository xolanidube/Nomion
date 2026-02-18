'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api'

interface LoginFormProps {
  onLogin: (username: string) => void
  trialPlan?: string | null
}

export default function LoginForm({ onLogin, trialPlan }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(!!trialPlan)

  const planLabel = trialPlan === 'business' ? 'Business' : trialPlan === 'team' ? 'Team' : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Username is required')
      return
    }

    if (!password.trim()) {
      setError('Password is required')
      return
    }

    if (isRegisterMode && !email.trim()) {
      setError('Email is required')
      return
    }

    if (isRegisterMode && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      let authResponse

      if (isRegisterMode) {
        authResponse = await apiClient.register({
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
          plan: trialPlan || undefined,
          trial: !!trialPlan,
        })
      } else {
        authResponse = await apiClient.login({
          username: username.trim(),
          password: password.trim(),
        })
      }

      // Store tokens in sessionStorage (matches dashboard + component reads)
      sessionStorage.setItem('token', authResponse.accessToken)
      sessionStorage.setItem('refreshToken', authResponse.refreshToken)
      sessionStorage.setItem('username', authResponse.user.username)
      sessionStorage.setItem('userId', authResponse.user.userId)
      sessionStorage.setItem('user', JSON.stringify(authResponse.user))

      // Call parent callback with username
      onLogin(authResponse.user.username)
    } catch (err: any) {
      setError(err.message || (isRegisterMode ? 'Registration failed' : 'Invalid username or password'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setError('')
    setIsGuestLoading(true)

    try {
      const authResponse = await apiClient.guestLogin()

      sessionStorage.setItem('token', authResponse.accessToken)
      sessionStorage.setItem('refreshToken', authResponse.refreshToken)
      sessionStorage.setItem('username', authResponse.user.username)
      sessionStorage.setItem('userId', authResponse.user.userId)
      sessionStorage.setItem('user', JSON.stringify(authResponse.user))

      onLogin(authResponse.user.username)
    } catch (err: any) {
      setError(err.message || 'Guest login failed')
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blueprism-lightblue to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blueprism-blue rounded-2xl mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-blueprism-darkblue mb-2">Nomion</h1>
          <p className="text-gray-600">
            Validate your automation releases against cross-platform best practices
          </p>
        </div>

        {/* Trial Banner */}
        {planLabel && isRegisterMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm font-semibold text-blue-800">
              {planLabel} Plan &mdash; 14-Day Free Trial
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Unlimited validations across all platforms. No credit card required.
            </p>
          </div>
        )}

        {/* Login/Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isRegisterMode ? 'Create Account' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent outline-none transition-colors text-gray-900"
                placeholder="Choose a username"
                disabled={isLoading}
              />
            </div>

            {/* Email (register mode only) */}
            {isRegisterMode && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent outline-none transition-colors text-gray-900"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blueprism-blue focus:border-transparent outline-none transition-colors text-gray-900"
                placeholder={isRegisterMode ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blueprism-blue text-white font-bold py-3 px-6 rounded-lg hover:bg-blueprism-darkblue transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{isRegisterMode ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>
                  {isRegisterMode
                    ? planLabel
                      ? `Start ${planLabel} Free Trial`
                      : 'Create Account'
                    : 'Sign In'}
                </span>
              )}
            </button>
          </form>

          {/* SSO Login */}
          {!isRegisterMode && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5205'
                  window.location.href = `${apiUrl}/api/sso/saml/login?returnUrl=${encodeURIComponent(window.location.origin + '/dashboard')}`
                }}
                className="w-full flex items-center justify-center space-x-2 py-3 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Sign in with SSO</span>
              </button>
            </div>
          )}

          {/* Guest Login */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading || isGuestLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-6 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-gray-700 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {isGuestLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Entering as guest...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Continue as Guest</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              No account needed. Free tier limits apply.
            </p>
          </div>

          {/* Toggle Sign In / Register */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              {isRegisterMode ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(false)}
                    className="text-blueprism-blue hover:text-blueprism-darkblue font-medium"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(true)}
                    className="text-blueprism-blue hover:text-blueprism-darkblue font-medium"
                  >
                    Create Account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">Nomion v1.0.0</p>
      </div>
    </div>
  )
}
