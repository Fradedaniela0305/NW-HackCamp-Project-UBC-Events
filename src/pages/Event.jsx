// src/pages/Event.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import { getEventById } from '../lib/data.js'
import { getSavedIds, toggleSaveId } from '../lib/storage.js'
import { googleCalendarUrl, downloadICS } from '../lib/calendar.js'
import { useToast } from '../components/Toaster.jsx'

export default function Event() {
  const { id } = useParams()
  const toast = useToast()
  const [evt, setEvt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0) // bump to refresh saved state

  useEffect(() => {
    setLoading(true)
    getEventById(id)
      .then(e => setEvt(e))
      .catch(() => setEvt(null))
      .finally(() => setLoading(false))
  }, [id])

  const saved = useMemo(() => {
    return evt ? getSavedIds().includes(evt.id) : false
  }, [evt, version])

  if (loading) return <Card>Loading event…</Card>
  if (!evt) {
    return (
      <div>
        <div className="h1">Event not found</div>
        <Card>
          <p className="muted">We couldn’t find an event with id <code>{id}</code>.</p>
          <div className="row space-top">
            <Link className="btn btn-primary" to="/feed">Back to Feed</Link>
            <Link className="btn btn-ghost" to="/onboarding">Onboarding</Link>
            <Link className="btn btn-ghost" to="/">Home</Link>
          </div>
        </Card>
      </div>
    )
  }

  const start = evt.start ? new Date(evt.start) : null
  const end = evt.end ? new Date(evt.end) : null
  const when = start
    ? `${start.toLocaleString([], { dateStyle:'medium', timeStyle:'short' })}${end ? ' – ' + end.toLocaleTimeString([], { timeStyle:'short' }) : ''}`
    : 'TBA'
  const hasStart = !!evt.start
  const gcalHref = hasStart ? googleCalendarUrl(evt) : '#'

  async function shareLink() {
    const link = `${window.location.origin}/e/${evt.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: evt.title, url: link })
        // native sheet shown; no toast needed
      } else {
        await navigator.clipboard.writeText(link)
        toast.success('Link copied to clipboard.')
      }
    } catch {
      // user cancelled or clipboard failed—stay quiet or show info
      toast.info('Share cancelled.')
    }
  }

  return (
    <div>
      <div className="event-title-slideshow" style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', padding: '24px' }}>
  <div className="event-title-overlay">{evt.title}</div>
</div>
      <div className="muted" style={{marginTop: 4, marginBottom: 12}}>
        {when} · {evt.location || 'TBA'} {evt.organizer ? `· by ${evt.organizer}` : ''}
      </div>

      <div className="row space-bottom">
        <Badge>{evt.faculty || 'All'}</Badge>
        <Badge>{evt.level}</Badge>
        {evt.tags?.map(t => <Badge key={t}>#{t}</Badge>)}
        {evt.isCustom && <Badge>🆕 New</Badge>}
        {saved && <Badge>🔥 Trending</Badge>}
      </div>

      <Card className="space-bottom">
        <p style={{whiteSpace:'pre-wrap', marginTop: 0}}>
          {evt.description || 'No description provided.'}
        </p>

        <div className="row space-top" style={{justifyContent: 'flex-end'}}>
          <Button kind="ghost" onClick={shareLink}>Share</Button>

          {evt.url && (
            <a className="btn btn-ghost" href={evt.url} target="_blank" rel="noreferrer">
              Open details page
            </a>
          )}

          <a
            className={`btn btn-ghost ${hasStart ? '' : 'disabled'}`}
            href={gcalHref}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!hasStart) { e.preventDefault(); toast.error('This event is missing a start time.'); }
            }}
          >
            Add to Google
          </a>

          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!hasStart) { toast.error('This event is missing a start time.'); return; }
              downloadICS(evt)
              toast.success('Calendar file downloaded.')
            }}
          >
            Download .ics
          </button>

          <button
            className={`btn ${saved ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              const wasSaved = saved
              toggleSaveId(evt.id)
              setVersion(v => v + 1)
              toast.info(wasSaved ? 'Removed from Saved' : 'Saved ✓')
            }}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </Card>

      <div className="row">
        <Link className="btn btn-primary" to="/feed">Back to Feed</Link>
        <Link className="btn btn-ghost" to="/">Home</Link>
      </div>
    </div>
  )
}
