import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from './Badge.jsx'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import { getSavedIds, toggleSaveId } from '../lib/storage.js'
import { googleCalendarUrl, downloadICS } from '../lib/calendar.js'
import { useToast } from './Toaster.jsx'

export default function EventCard({ evt, onSaveToggle, rank }) {
  const [open, setOpen] = useState(false)
  const [savedState, setSavedState] = useState(getSavedIds().includes(evt.id))
  const toast = useToast()

  const isTrending = savedState // saved = trending for demo

  const start = evt.start ? new Date(evt.start) : null
  const end = evt.end ? new Date(evt.end) : null
  const when = start
    ? `${start.toLocaleString([], { dateStyle:'medium', timeStyle:'short' })}${
        end ? ' – ' + end.toLocaleTimeString([], { timeStyle:'short' }) : ''
      }`
    : 'TBA'
  const hasStart = !!evt.start
  const gcalHref = hasStart ? googleCalendarUrl(evt) : '#'

  async function shareEvent() {
    const link = `${window.location.origin}/e/${evt.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: evt.title, url: link })
      } else {
        await navigator.clipboard.writeText(link)
        toast.success('Link copied to clipboard.')
      }
    } catch {
      toast.info('Share cancelled.')
    }
  }

  return (
    <>
      {/* Card container */}
      <div className="card" style={{ position: 'relative', padding: '1rem' }}>
        {/* Rank + title */}
        <div style={{ position: 'relative', paddingLeft: '2rem', marginBottom: '0.5rem' }}>
          {rank && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                fontWeight: 'bold'
              }}
            >
              {rank}
            </div>
          )}
          <h3
            className="card-title"
            style={{ margin: 0, cursor: 'pointer' }}
            onClick={() => setOpen(true)}
            title="Quick view"
          >
            {evt.title}
          </h3>
        </div>

        {/* Top-right badges */}
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          {isTrending && <Badge style={{ flexShrink: 0 }}>🔥 Trending</Badge>}
          {evt.isCustom && <Badge style={{ flexShrink: 0 }}>🆕 New</Badge>}
        </div>

        {/* Badges row */}
        <div className="row space-top" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <Badge>{evt.faculty || 'All'}</Badge>
          <Badge>{evt.level}</Badge>
          {evt.tags?.slice(0, 3).map(t => (
            <Badge key={t}>#{t}</Badge>
          ))}
        </div>

        {/* Description */}
        <p className="space-top line-clamp-3" style={{ marginTop: '1rem' }}>
          {evt.description}
        </p>

        {/* Actions */}
        <div className="row-between space-top" style={{ marginTop: '1rem' }}>
          <div className="muted">
            {when} · {evt.location || 'TBA'}
          </div>
          <div className="row" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
            <Button kind="ghost" onClick={() => setOpen(true)}>
              Quick view
            </Button>
            <Link className="btn btn-ghost" to={`/e/${evt.id}`}>
              Open page
            </Link>
            <Button kind="ghost" onClick={shareEvent}>
              Share
            </Button>
            {evt.url && (
              <a className="btn btn-ghost" href={evt.url} target="_blank" rel="noreferrer">
                Details
              </a>
            )}
            <a
              className={`btn btn-ghost ${hasStart ? '' : 'disabled'}`}
              href={gcalHref}
              target="_blank"
              rel="noreferrer"
              onClick={e => {
                if (!hasStart) {
                  e.preventDefault()
                  toast.error('This event is missing a start time.')
                }
              }}
            >
              Add to Google
            </a>
            <Button
              kind="ghost"
              onClick={() => {
                if (!hasStart) {
                  toast.error('Missing start time.')
                  return
                }
                downloadICS(evt)
                toast.success('Calendar file downloaded.')
              }}
            >
              Download .ics
            </Button>
            <Button
              onClick={() => {
                const wasSaved = savedState
                toggleSaveId(evt.id)
                setSavedState(!wasSaved)
                onSaveToggle?.(evt.id)
                toast.info(wasSaved ? 'Removed from Saved' : 'Saved ✓')
              }}
            >
              {savedState ? 'Saved ✓' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Quick View */}
      <Modal open={open} onClose={() => setOpen(false)} title={evt.title} wide>
        <div className="row" style={{ marginBottom: 8, gap: '0.3rem', flexWrap: 'wrap' }}>
          <Badge>{evt.faculty || 'All'}</Badge>
          <Badge>{evt.level}</Badge>
          {evt.tags?.map(t => (
            <Badge key={t}>#{t}</Badge>
          ))}
          {evt.isCustom && <Badge>🆕 New</Badge>}
          {savedState && <Badge>🔥 Trending</Badge>}
        </div>

        <div className="muted" style={{ marginBottom: 12 }}>
          {when} · {evt.location || 'TBA'} {evt.organizer ? `· by ${evt.organizer}` : ''}
        </div>

        <p style={{ whiteSpace: 'pre-wrap' }}>{evt.description || 'No description provided.'}</p>

        <div
          className="modal-actions row space-top"
          style={{ justifyContent: 'flex-end', gap: '0.3rem', flexWrap: 'wrap' }}
        >
          <Link className="btn btn-ghost" to={`/e/${evt.id}`}>
            Open page
          </Link>
          <Button kind="ghost" onClick={shareEvent}>
            Share
          </Button>
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
            onClick={e => {
              if (!hasStart) {
                e.preventDefault()
                toast.error('Missing start time.')
              }
            }}
          >
            Add to Google
          </a>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!hasStart) {
                toast.error('Missing start time.')
                return
              }
              downloadICS(evt)
              toast.success('Calendar file downloaded.')
            }}
          >
            Download .ics
          </button>
          <button
            className={`btn ${savedState ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              const wasSaved = savedState
              toggleSaveId(evt.id)
              setSavedState(!wasSaved)
              onSaveToggle?.(evt.id)
              toast.info(wasSaved ? 'Removed from Saved' : 'Saved ✓')
            }}
          >
            {savedState ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </Modal>
    </>
  )
}
