import { useState, useEffect } from 'react'
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
  const [imgSrc, setImgSrc] = useState(null)
  const toast = useToast()

  // Simple inline SVG placeholder (data URL) — neutral grey camera box
  const PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="100%" height="100%" fill="#efefef"/><g transform="translate(240 110)" fill="#cfcfcf"><rect width="320" height="230" rx="8" ry="8"/><circle cx="160" cy="115" r="52" fill="#e6e6e6"/></g><text x="50%" y="92%" font-size="14" text-anchor="middle" fill="#bdbdbd" font-family="Arial,Helvetica,sans-serif">No image available</text></svg>`
    )

  // Resolve potential image URLs from the event object
  function resolveImageFromEvent(e) {
    if (!e) return null

    // Common places events might store images
    const candidates = [
      e.image,
      e.imageUrl,
      e.image_url,
      e.img,
      e.photo,
      e.media?.image,
      e.media?.imageUrl,
      Array.isArray(e.images) && e.images[0],
      Array.isArray(e.photos) && e.photos[0],
      Array.isArray(e.attachments) && e.attachments[0]?.url,
      e.cover,
    ]

    for (let c of candidates) {
      if (!c) continue
      // if c is object with url field (like { url: '...' })
      if (typeof c === 'object') {
        if (typeof c.url === 'string' && c.url.trim()) return normalizeUrl(c.url)
        // sometimes it's an object with src or original
        if (typeof c.src === 'string' && c.src.trim()) return normalizeUrl(c.src)
        continue
      }
      if (typeof c === 'string' && c.trim()) return normalizeUrl(c)
    }
    return null
  }

  // Turn relative urls into absolute ones; leave absolute as-is.
  function normalizeUrl(url) {
    try {
      // trim spaces
      const trimmed = url.trim()
      // already absolute?
      if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) return trimmed
      // handle protocol-relative //example.com/...
      if (/^\/\//.test(trimmed)) return window.location.protocol + trimmed
      // handle path starting with /
      if (/^\//.test(trimmed)) return window.location.origin + trimmed
      // otherwise, try to construct a URL relative to origin
      return new URL(trimmed, window.location.origin).toString()
    } catch {
      return url
    }
  }

  // Update imgSrc when event changes
  useEffect(() => {
    const resolved = resolveImageFromEvent(evt)
    setImgSrc(resolved || PLACEHOLDER)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evt?.id]) // update when the event identity changes

  // Date formatting
  const start = evt.start ? new Date(evt.start) : null
  const end = evt.end ? new Date(evt.end) : null
  const when = start
    ? `${start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}${
        end ? ' – ' + end.toLocaleTimeString([], { timeStyle: 'short' }) : ''
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

  // onError fallback — sets to placeholder (only once)
  function handleImgError() {
    if (imgSrc !== PLACEHOLDER) setImgSrc(PLACEHOLDER)
  }

  return (
    <>
      {/* Card container */}
      <div className="card" style={{ position: 'relative', padding: '1rem' }}>
        {/* Image (top) */}
        <div
          className="card-image"
          style={{
            width: '100%',
            height: 160,
            marginBottom: 12,
            overflow: 'hidden',
            borderRadius: 8,
            background: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={imgSrc || PLACEHOLDER}
            alt={evt.title || 'Event image'}
            loading="lazy"
            onError={handleImgError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
            }}
            draggable={false}
          />
        </div>

        {/* Rank + title */}
        <div style={{ position: 'relative', paddingLeft: '2rem', marginBottom: '0.5rem' }}>
          {rank && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                fontWeight: 'bold',
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
          {savedState && <Badge style={{ flexShrink: 0 }}>🔥 Trending</Badge>}
          {evt.isCustom && <Badge style={{ flexShrink: 0 }}>🆕 New</Badge>}
        </div>

        {/* Badges row */}
        <div
          className="row space-top"
          style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}
        >
          <Badge>{evt.faculty || 'All'}</Badge>
          <Badge>{evt.level}</Badge>
          {evt.tags?.slice(0, 3).map((t) => (
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
              onClick={(e) => {
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
        <div style={{ marginBottom: 12 }}>
          {/* larger image in the modal */}
          <div
            style={{
              width: '100%',
              maxHeight: 420,
              overflow: 'hidden',
              borderRadius: 8,
              marginBottom: 12,
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={imgSrc || PLACEHOLDER}
              alt={evt.title || 'Event image'}
              onError={handleImgError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                userSelect: 'none',
              }}
              draggable={false}
            />
          </div>

          <div className="row" style={{ marginBottom: 8, gap: '0.3rem', flexWrap: 'wrap' }}>
            <Badge>{evt.faculty || 'All'}</Badge>
            <Badge>{evt.level}</Badge>
            {evt.tags?.map((t) => (
              <Badge key={t}>#{t}</Badge>
            ))}
            {evt.isCustom && <Badge>🆕 New</Badge>}
            {savedState && <Badge>🔥 Trending</Badge>}
          </div>

          <div className="muted" style={{ marginBottom: 12 }}>
            {when} · {evt.location || 'TBA'} {evt.organizer ? `· by ${evt.organizer}` : ''}
          </div>

          <p style={{ whiteSpace: 'pre-wrap' }}>{evt.description || 'No description provided.'}</p>
        </div>

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
            onClick={(e) => {
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
