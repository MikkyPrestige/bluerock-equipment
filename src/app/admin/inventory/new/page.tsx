'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['Excavator', 'Bulldozer', 'Wheel Loader', 'Motor Grader', 'Articulated Truck', 'Compactor']
const BRANDS = ['Caterpillar', 'Komatsu', 'Volvo', 'Sany', 'Hitachi', 'Liebherr']
const USE_CASES = ['Construction', 'Mining & Quarrying', 'Port Operations', 'Agriculture', 'Road Building']
const WEAR_COMPONENTS = ['undercarriage', 'track_links', 'hydraulic_pumps', 'structural_boom', 'engine']
const WEAR_OPTIONS = ['excellent', 'good', 'wear_detected', 'needs_repair']

const CATEGORY_EXTRA_FIELDS: Record<string, string[]> = {
    'Excavator': ['Bucket Capacity (m³)', 'Track Shoe Width (mm)', 'Swing Speed (rpm)'],
    'Bulldozer': ['Blade Width (mm)', 'Ripper Type'],
    'Wheel Loader': ['Bucket Capacity (m³)', 'Lift Capacity (kg)'],
    'Motor Grader': ['Blade Length (mm)', 'Engine Power (hp)'],
    'Articulated Truck': ['Payload Capacity (tonnes)', 'Body Volume (m³)'],
    'Compactor': ['Drum Width (mm)', 'Operating Weight (kg)'],
}

export default function NewMachinePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [form, setForm] = useState({
        name: '',
        brand: '',
        model: '',
        year: '',
        category: '',
        use_case: '',
        engine_hours: '',
        price_usd: '',
        yard_country: '',
        yard_city: '',
        serial_number: '',
        operating_weight_kg: '',
        video_url: '',
        status: 'available',
        description: '',
        engine_configuration: '',
        hours_since_service: '',
    })

    const [wearAnalysis, setWearAnalysis] = useState<Record<string, string>>(
        Object.fromEntries(WEAR_COMPONENTS.map(c => [c, 'good']))
    )

    const [categorySpecs, setCategorySpecs] = useState<Record<string, string>>({})

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    function handleWearChange(component: string, value: string) {
        setWearAnalysis(prev => ({ ...prev, [component]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const response = await fetch('/api/admin/machines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                wear_analysis: wearAnalysis,
                specs: categorySpecs,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            setError(data.error)
            setLoading(false)
            return
        }

        router.push('/admin/inventory')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-lg font-bold text-gray-900">Add New Machine</h1>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Core Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Core Details</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                                <select name="brand" value={form.brand} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select brand</option>
                                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                                <input type="text" name="model" value={form.model} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 320D" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                <select name="category" value={form.category} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select category</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Use Case *</label>
                                <select name="use_case" value={form.use_case} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Select use case</option>
                                    {USE_CASES.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                                <input type="number" name="year" value={form.year} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="2019" min="1990" max="2025" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Engine Hours *</label>
                                <input type="number" name="engine_hours" value={form.engine_hours} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="4500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price (USD) *</label>
                                <input type="number" name="price_usd" value={form.price_usd} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="85000" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                                <input type="text" name="serial_number" value={form.serial_number} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="CAT0320DXXXX" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Weight (kg)</label>
                                <input type="number" name="operating_weight_kg" value={form.operating_weight_kg} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="22000" />
                            </div>
                        </div>
                    </div>

                    {/* Category-Specific Fields */}
                    {form.category && CATEGORY_EXTRA_FIELDS[form.category] && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                {form.category} Specifications
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {CATEGORY_EXTRA_FIELDS[form.category].map(field => (
                                    <div key={field}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{field}</label>
                                        <input
                                            type="text"
                                            value={categorySpecs[field] || ''}
                                            onChange={e => setCategorySpecs(prev => ({ ...prev, [field]: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder={field}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Yard & Media */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Yard & Media</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Yard Country *</label>
                                <input type="text" name="yard_country" value={form.yard_country} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="UAE" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Yard City *</label>
                                <input type="text" name="yard_city" value={form.yard_city} onChange={handleChange} required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Dubai" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video URL</label>
                            <input type="url" name="video_url" value={form.video_url} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://youtube.com/watch?v=..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select name="status" value={form.status} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="available">Available</option>
                                <option value="pending_hold">Pending Hold</option>
                                <option value="reserved">Reserved</option>
                                <option value="sold">Sold</option>
                            </select>
                        </div>
                    </div>

                    {/* Machine Description */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Additional Details</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe the machine condition, history, and any notable features..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Engine Configuration</label>
                                <input
                                    type="text"
                                    name="engine_configuration"
                                    value={form.engine_configuration}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 6-cylinder turbocharged diesel"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Since Last Service</label>
                                <input
                                    type="number"
                                    name="hours_since_service"
                                    value={form.hours_since_service}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Component Wear Matrix */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">150-Point Wear Analysis</h2>
                        <div className="space-y-3">
                            {WEAR_COMPONENTS.map(component => (
                                <div key={component} className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700 capitalize">
                                        {component.replace(/_/g, ' ')}
                                    </label>
                                    <div className="flex gap-2">
                                        {WEAR_OPTIONS.map(option => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => handleWearChange(component, option)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${wearAnalysis[component] === option
                                                    ? option === 'excellent' ? 'bg-green-500 text-white border-green-500'
                                                        : option === 'good' ? 'bg-blue-500 text-white border-blue-500'
                                                            : option === 'wear_detected' ? 'bg-amber-500 text-white border-amber-500'
                                                                : 'bg-red-500 text-white border-red-500'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                                    }`}
                                            >
                                                {option.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-md">{error}</p>
                    )}

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Machine'}
                        </button>
                        <a href="/admin/inventory" className="px-6 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900">
                            Cancel
                        </a>
                    </div>
                </form>
            </main>
        </div>
    )
}