import { adminSupabase } from '@/lib/supabase/admin'
import Link from 'next/link'
import AddWalkthroughForm from '@/components/admin/AddWalkthroughForm'
import WalkthroughEditor from '@/components/admin/WalkthroughEditor'

const statusConfig: Record<string, { label: string; classes: string }> = {
  scheduled:  { label: 'Scheduled',  classes: 'bg-blue-100 text-blue-800' },
  completed:  { label: 'Completed',  classes: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelled',  classes: 'bg-gray-100 text-gray-600' },
  no_show:    { label: 'No Show',    classes: 'bg-red-100 text-red-800' },
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default async function AdminWalkthroughsPage() {
  const [
    { data: walkthroughs },
    { data: buyers },
    { data: machines },
  ] = await Promise.all([
    adminSupabase
      .from('walkthroughs')
      .select('*, buyers(id, email, company_name), machines(id, name, brand, model)')
      .order('scheduled_at', { ascending: true }),
    adminSupabase.from('buyers').select('id, email, company_name').order('company_name'),
    adminSupabase.from('machines').select('id, name, brand, model').neq('status', 'sold').order('name'),
  ])

  const now = new Date()
  const upcoming = (walkthroughs ?? []).filter(w => new Date(w.scheduled_at) >= now && w.status === 'scheduled')
  const past     = (walkthroughs ?? []).filter(w => new Date(w.scheduled_at) < now || w.status !== 'scheduled')

  const buyerList = (buyers ?? []).map(b => ({ id: b.id, email: b.email, company_name: b.company_name }))
  const machineList = (machines ?? []).map(m => ({
    id: m.id,
    name: (m as unknown as { name?: string; brand: string; model: string }).name
      || `${(m as unknown as { brand: string }).brand} ${(m as unknown as { model: string }).model}`,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Admin</Link>
            <h1 className="text-lg font-bold text-gray-900">Walkthrough Schedule</h1>
          </div>
          <AddWalkthroughForm buyers={buyerList} machines={machineList} />
        </div>
      </header>

      <div className="bg-amber-50 border-b border-amber-100 px-6 py-2">
        <p className="text-xs text-amber-800 max-w-3xl">
          <strong>Calendly Free Tier:</strong> Bookings are not synced automatically — no API access on the free plan.
          Log each walkthrough manually after receiving the Calendly booking email. Paste the event URL for reference.
        </p>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Upcoming ({upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-sm text-gray-400">No upcoming walkthroughs scheduled.</p>
              <p className="text-xs text-gray-400 mt-1">
                Use &quot;+ Log Walkthrough&quot; after a buyer books via the machine detail page.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map(w => {
                const { date, time } = fmtDate(w.scheduled_at)
                const buyer = w.buyers as unknown as { id: string; email: string; company_name: string | null } | null
                const machine = w.machines as unknown as { id: string; name?: string; brand: string; model: string } | null
                const machineName = machine?.name ?? (machine ? `${machine.brand} ${machine.model}` : null)
                const st = statusConfig[w.status] ?? { label: w.status, classes: 'bg-gray-100 text-gray-600' }

                return (
                  <div key={w.id} className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4">

                      {/* Date column */}
                      <div className="flex-shrink-0 bg-blue-700 text-white rounded-lg px-4 py-3 text-center min-w-[80px]">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-75">{date.split(',')[0]}</p>
                        <p className="text-sm font-bold leading-tight">{date.split(',')[1]?.trim()}</p>
                        <p className="text-xs mt-1 font-semibold">{time}</p>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-900">
                            {buyer?.company_name || buyer?.email || 'Unknown buyer'}
                          </p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.classes}`}>
                            {st.label}
                          </span>
                        </div>
                        {machineName && machine && (
                          <p className="text-sm text-gray-500">
                            Machine:{' '}
                            <Link href={`/machines/${machine.id}`} className="text-blue-700 hover:underline">
                              {machineName}
                            </Link>
                          </p>
                        )}
                        {w.technician && (
                          <p className="text-xs text-gray-400 mt-0.5">Technician: {w.technician}</p>
                        )}
                        {w.calendly_event_url && (
                          <a
                            href={w.calendly_event_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-0.5 block"
                          >
                            Calendly Event →
                          </a>
                        )}
                      </div>

                      {/* Buyer link */}
                      {buyer && (
                        <Link
                          href={`/admin/buyers/${buyer.id}`}
                          className="text-xs text-gray-400 hover:text-blue-700 flex-shrink-0"
                        >
                          Buyer Profile →
                        </Link>
                      )}
                    </div>

                    <WalkthroughEditor
                      id={w.id}
                      initialTechnician={w.technician}
                      initialStatus={w.status}
                      initialNotes={w.admin_notes}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Past & Other ({past.length})
            </h2>
            <div className="space-y-3">
              {past.map(w => {
                const { date, time } = fmtDate(w.scheduled_at)
                const buyer = w.buyers as unknown as { id: string; email: string; company_name: string | null } | null
                const machine = w.machines as unknown as { id: string; name?: string; brand: string; model: string } | null
                const machineName = machine?.name ?? (machine ? `${machine.brand} ${machine.model}` : null)
                const st = statusConfig[w.status] ?? { label: w.status, classes: 'bg-gray-100 text-gray-600' }

                return (
                  <div key={w.id} className="bg-white border border-gray-100 rounded-lg p-4 opacity-80">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-500 font-medium min-w-[100px]">
                          {date} {time}
                        </div>
                        <p className="text-sm font-medium text-gray-800">
                          {buyer?.company_name || buyer?.email || '—'}
                        </p>
                        {machineName && (
                          <p className="text-xs text-gray-400 hidden sm:block">{machineName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {w.technician && (
                          <span className="text-xs text-gray-400">{w.technician}</span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.classes}`}>
                          {st.label}
                        </span>
                        {w.admin_notes && (
                          <span className="text-xs text-gray-400 italic max-w-[200px] truncate hidden md:block">
                            {w.admin_notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <WalkthroughEditor
                      id={w.id}
                      initialTechnician={w.technician}
                      initialStatus={w.status}
                      initialNotes={w.admin_notes}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
