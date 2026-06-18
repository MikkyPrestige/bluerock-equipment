'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        company_name: '',
        corporate_address: '',
        import_export_license: '',
        preferred_port_of_discharge: '',
    })

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            router.push('/auth/login')
            return
        }

        const { error: updateError } = await supabase
            .from('buyers')
            .update({
                company_name: form.company_name,
                corporate_address: form.corporate_address,
                import_export_license: form.import_export_license,
                preferred_port_of_discharge: form.preferred_port_of_discharge,
                tier: 'silver',
                kyc_verified: false, // admin approves this manually
            })
            .eq('id', user.id)

        if (updateError) {
            setError(updateError.message)
            setLoading(false)
            return
        }

        router.push('/dashboard')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-lg">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete your buyer profile</h1>
                    <p className="text-gray-500 text-sm mb-8">
                        This information is required to request delivery quotes. It is collected once and pre-filled on all future requests.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Company name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="company_name"
                                value={form.company_name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Acme Construction Ltd"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Corporate address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="corporate_address"
                                value={form.corporate_address}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="123 Business District, Lagos, Nigeria"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Import / Export license number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="import_export_license"
                                value={form.import_export_license}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="IMP-2024-XXXXX"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Preferred port of discharge <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="preferred_port_of_discharge"
                                value={form.preferred_port_of_discharge}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Port of Lagos, Nigeria"
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
                            {loading ? 'Saving...' : 'Complete profile and continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}