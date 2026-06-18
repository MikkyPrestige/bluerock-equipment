'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
    const supabase = createClient()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Step 1: Create the auth user
        const { data, error: signupError } = await supabase.auth.signUp({ email, password })

        if (signupError || !data.user) {
            setError(signupError?.message || 'Signup failed')
            setLoading(false)
            return
        }

        // Step 2: Insert the buyer profile row
        const { error: buyerError } = await supabase
            .from('buyers')
            .insert({
                id: data.user.id,
                email: email,
                tier: 'observer',
            })

        if (buyerError) {
            setError(buyerError.message)
            setLoading(false)
            return
        }

        // Step 3: Send to KYC onboarding
        router.push('/auth/onboarding')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
                    <p className="text-gray-500 text-sm mb-8">BlueRock Equipment — Buyer Registration</p>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="you@company.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Minimum 8 characters"
                            />
                        </div>

                        {error && (
                            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-md">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>
                    </form>

                    <p className="text-sm text-gray-500 mt-6 text-center">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-blue-700 font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}