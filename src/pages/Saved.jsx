import { useEffect, useState } from 'react'
import { loadEvents } from '../lib/data.js'
import { getSavedIds } from '../lib/storage.js'
import EventCard from '../components/EventCard.jsx'
import Card from '../components/Card.jsx'

export default function Saved() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const all = await loadEvents()
      const savedSet = new Set(getSavedIds())
      setEvents(all.filter(e => savedSet.has(e.id)))
      setLoading(false)
    })()
  }, [])

  if (loading) return <Card>Loading your saved events…</Card>
  if (!events.length)
    return (
      <Card>
        You haven’t saved any events yet. Go to the{' '}
        <a className="link" href="/feed">
          Feed
        </a>{' '}
        and tap “Save”.
      </Card>
    )

  return (
    <div>
      <div className="h1">Saved events</div>
      <div
        className="grid"
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
        }}
      >
        {events.map((evt, idx) => (
          <EventCard
            key={evt.id}
            evt={evt}
            rank={idx + 1} // pass rank to EventCard
            onSaveToggle={() => {
              // Refresh saved list after unsave
              loadEvents().then(all => {
                const savedSet = new Set(getSavedIds())
                setEvents(all.filter(e => savedSet.has(e.id)))
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}
