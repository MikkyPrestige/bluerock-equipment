'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assests/img/logo.jpg'

/* ── Constants ── */
const CATEGORIES     = ['Excavator', 'Bulldozer', 'Wheel Loader', 'Motor Grader', 'Articulated Truck', 'Compactor']
const BRANDS         = ['Caterpillar', 'Komatsu', 'Volvo', 'Sany', 'Hitachi', 'Liebherr']
const USE_CASES      = ['Construction', 'Mining & Quarrying', 'Port Operations', 'Agriculture', 'Road Building']
const WEAR_COMPONENTS= ['undercarriage', 'track_links', 'hydraulic_pumps', 'structural_boom', 'engine']
const WEAR_OPTIONS   = ['excellent', 'good', 'wear_detected', 'needs_repair']

const CATEGORY_EXTRA_FIELDS: Record<string, string[]> = {
  'Excavator':        ['Bucket Capacity (m³)', 'Track Shoe Width (mm)', 'Swing Speed (rpm)'],
  'Bulldozer':        ['Blade Width (mm)', 'Ripper Type'],
  'Wheel Loader':     ['Bucket Capacity (m³)', 'Lift Capacity (kg)'],
  'Motor Grader':     ['Blade Length (mm)', 'Engine Power (hp)'],
  'Articulated Truck':['Payload Capacity (tonnes)', 'Body Volume (m³)'],
  'Compactor':        ['Drum Width (mm)', 'Operating Weight (kg)'],
}

/* ── Shared style tokens ── */
const INP = [
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-navy-900',
  'placeholder:text-slate-400 focus:outline-none focus:border-gold-400/60',
  'focus:ring-2 focus:ring-gold-400/12 transition-all duration-150',
].join(' ')

const LBL = 'block text-[11px] font-bold text-white/45 uppercase tracking-widest mb-2'

const REQ = <span className="text-gold-400 ml-0.5">*</span>

/* ── Wear button classes ── */
function wearBtnClass(component: string, option: string, selected: string) {
  const isActive = selected === option
  if (isActive) return 'bg-gold-400 border-gold-400 text-navy-950 font-bold rounded-full px-3 py-1 text-[11px] transition-all duration-150 border'
  return 'border border-white/20 text-white/40 hover:border-white/45 hover:text-white/65 rounded-full px-3 py-1 text-[11px] transition-all duration-150 cursor-pointer'
}

/* ── Section wrapper ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-900 border border-white/8 rounded-2xl p-6 space-y-5">
      <h2 className="font-display text-base font-bold text-gold-400 pb-4 border-b border-white/8">
        {title}
      </h2>
      {children}
    </div>
  )
}

/* ── Field wrapper ── */
function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={LBL}>{label}{required && REQ}</label>
      {children}
      {hint && <p className="text-[11px] text-white/25 mt-1.5">{hint}</p>}
    </div>
  )
}

export default function NewMachinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    name: '', brand: '', model: '', year: '', category: '', use_case: '',
    engine_hours: '', price_usd: '', yard_country: '', yard_city: '',
    serial_number: '', operating_weight_kg: '', video_url: '',
    status: 'available', description: '', engine_configuration: '', hours_since_service: '',
  })

  const [wearAnalysis, setWearAnalysis] = useState<Record<string, string>>(
    Object.fromEntries(WEAR_COMPONENTS.map(c => [c, 'good']))
  )

  const [categorySpecs, setCategorySpecs] = useState<Record<string, string>>({})

  function set(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, wear_analysis: wearAnalysis, specs: categorySpecs }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push('/admin/inventory')
  }

  const extraFields = form.category ? CATEGORY_EXTRA_FIELDS[form.category] : null

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-navy-950/96 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/">
            <Image src={logo} alt="BlueRock Equipment" className="h-9 w-auto object-contain invert opacity-90" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm text-white/30">
            <Link href="/admin"           className="hover:text-white transition-colors duration-150">Admin</Link>
            <span>/</span>
            <Link href="/admin/inventory" className="hover:text-white transition-colors duration-150">Inventory</Link>
            <span>/</span>
            <span className="text-white/55">Add Machine</span>
          </div>
        </div>
        <Link href="/admin/inventory" className="text-sm text-white/35 hover:text-white transition-colors duration-150">
          ← Cancel
        </Link>
      </header>

      {/* ── TITLE BAR ── */}
      <div className="bg-navy-900 border-b border-white/8 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-gold-400 font-semibold uppercase tracking-widest mb-1.5">Admin · Inventory</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Add New Machine</h1>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── CORE DETAILS ── */}
          <Section title="Core Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Brand" required>
                <select name="brand" value={form.brand} onChange={set} required className={INP}>
                  <option value="">Select brand</option>
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Model" required>
                <input type="text" name="model" value={form.model} onChange={set} required
                  className={INP} placeholder="e.g. 320D" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category" required>
                <select name="category" value={form.category} onChange={set} required className={INP}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Use Case" required>
                <select name="use_case" value={form.use_case} onChange={set} required className={INP}>
                  <option value="">Select use case</option>
                  {USE_CASES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Year" required>
                <input type="number" name="year" value={form.year} onChange={set} required
                  className={INP} placeholder="2019" min="1990" max="2030" />
              </Field>
              <Field label="Engine Hours" required>
                <input type="number" name="engine_hours" value={form.engine_hours} onChange={set} required
                  className={INP} placeholder="4500" />
              </Field>
              <Field label="Price (USD)" required>
                <input type="number" name="price_usd" value={form.price_usd} onChange={set} required
                  className={INP} placeholder="85000" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Serial Number">
                <input type="text" name="serial_number" value={form.serial_number} onChange={set}
                  className={INP} placeholder="CAT0320DXXXX" />
              </Field>
              <Field label="Operating Weight (kg)">
                <input type="number" name="operating_weight_kg" value={form.operating_weight_kg} onChange={set}
                  className={INP} placeholder="22000" />
              </Field>
            </div>
          </Section>

          {/* ── CATEGORY-SPECIFIC SPECS (dynamic) ── */}
          {extraFields && extraFields.length > 0 && (
            <Section title={`${form.category} Specifications`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraFields.map(field => (
                  <Field key={field} label={field}>
                    <input
                      type="text"
                      value={categorySpecs[field] || ''}
                      onChange={e => setCategorySpecs(prev => ({ ...prev, [field]: e.target.value }))}
                      className={INP}
                      placeholder={field}
                    />
                  </Field>
                ))}
              </div>
            </Section>
          )}

          {/* ── YARD & MEDIA ── */}
          <Section title="Yard & Media">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Yard Country" required>
                <input type="text" name="yard_country" value={form.yard_country} onChange={set} required
                  className={INP} placeholder="UAE" />
              </Field>
              <Field label="Yard City" required>
                <input type="text" name="yard_city" value={form.yard_city} onChange={set} required
                  className={INP} placeholder="Dubai" />
              </Field>
            </div>

            <Field label="YouTube Video URL" hint="Paste a full YouTube URL — displayed as a walkthrough link on the listing page">
              <input type="url" name="video_url" value={form.video_url} onChange={set}
                className={INP} placeholder="https://youtube.com/watch?v=..." />
            </Field>

            <Field label="Listing Status">
              <select name="status" value={form.status} onChange={set} className={INP}>
                <option value="available">Available</option>
                <option value="pending_hold">Pending Hold</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </Field>
          </Section>

          {/* ── ADDITIONAL DETAILS ── */}
          <Section title="Additional Details">
            <Field label="Machine Description" hint="Condition history, notable features, or any buyer-facing notes">
              <textarea
                name="description"
                value={form.description}
                onChange={set}
                rows={4}
                className={`${INP} resize-y min-h-[100px]`}
                placeholder="Describe the machine condition, history, and any notable features…"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Engine Configuration">
                <input type="text" name="engine_configuration" value={form.engine_configuration} onChange={set}
                  className={INP} placeholder="e.g. 6-cylinder turbocharged diesel" />
              </Field>
              <Field label="Hours Since Last Service">
                <input type="number" name="hours_since_service" value={form.hours_since_service} onChange={set}
                  className={INP} placeholder="500" />
              </Field>
            </div>
          </Section>

          {/* ── 150-POINT WEAR ANALYSIS ── */}
          <Section title="150-Point Wear Analysis">
            <div className="space-y-4">
              {WEAR_COMPONENTS.map(component => (
                <div
                  key={component}
                  className="flex items-center justify-between gap-4 py-3 border-b border-white/6 last:border-0"
                >
                  <span className="text-white/80 text-sm font-medium capitalize min-w-[130px]">
                    {component.replace(/_/g, ' ')}
                  </span>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {WEAR_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setWearAnalysis(prev => ({ ...prev, [component]: option }))}
                        className={wearBtnClass(component, option, wearAnalysis[component])}
                      >
                        {option.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── ERROR ── */}
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          {/* ── SUBMIT ── */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-gold-400 hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-bold px-8 py-3 rounded-xl text-sm transition-colors duration-150 shadow-lg shadow-black/20"
            >
              {loading ? 'Saving…' : 'Save Machine'}
            </button>
            <Link
              href="/admin/inventory"
              className="text-sm text-white/40 hover:text-white/70 transition-colors duration-150"
            >
              Cancel
            </Link>
          </div>

        </form>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 py-6 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-white/20">BlueRock Equipment — Admin Operations</p>
          <Link href="/admin" className="text-xs text-white/25 hover:text-white/50 transition-colors">
            ← Admin Dashboard
          </Link>
        </div>
      </footer>
    </div>
  )
}
