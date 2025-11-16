// src/pages/Feed.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Chip from '../components/Chip.jsx'
import EventCard from '../components/EventCard.jsx'
import { loadEvents } from '../lib/data.js'
import { getCustomEvents } from '../lib/custom.js'
import {
  getUserPrefs,
  getSavedIds,
  getSaveCounts,
  toggleSaveId
} from '../lib/storage.js'

const LEVELS = ['beginner', 'intermediate', 'advanced']
const TAG_CLOUD_LIMIT = 5

// ONLY these 5 tags will appear in the popular tags cloud (and be selectable)
const ALLOWED_TAGS = ['hackathon', 'web dev', 'product management', 'data science', 'ai']

export default function Feed() {
  const nav = useNavigate()
  // initialize prefs from storage and keep it reactive
  const [prefs, setPrefs] = useState(() => getUserPrefs())
  // default viewMode: personalized if prefs exist, otherwise 'all'
  const [viewMode, setViewMode] = useState(() => (getUserPrefs() ? 'personalized' : 'all'))

  const [events, setEvents] = useState([])
  const [level, setLevel] = useState('all')
  const [sort, setSort] = useState('trending')
  const [q, setQ] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0) // bump to re-run memos after save toggles

  // normalization helper
  const norm = s => String(s || '').toLowerCase().trim()

  useEffect(() => {
    setLoading(true)
    loadEvents()
      .then(fileEvents => {
        const custom = getCustomEvents() || []
        setEvents([...custom, ...fileEvents])
      })
      .catch(e => setError(e.message || 'Failed to load events'))
      .finally(() => setLoading(false))
  }, [])

  // Listen for prefs updates:
  useEffect(() => {
    function onPrefsUpdated(e) {
      // custom event provides detail, but guard fallback to storage read
      const newPrefs = (e?.detail) ? e.detail : getUserPrefs()
      setPrefs(newPrefs)
      // if user just added prefs and we were on 'all', optionally switch to personalized
      if (newPrefs && viewMode === 'all') {
        setViewMode('personalized')
      }
    }
    // storage event for other tabs/windows
    function onStorage(e) {
      if (!e) return
      // When storage changes, read prefs fresh
      setPrefs(getUserPrefs())
    }

    window.addEventListener('userprefs-updated', onPrefsUpdated)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('userprefs-updated', onPrefsUpdated)
      window.removeEventListener('storage', onStorage)
    }
  }, [viewMode])

  // Base pool: returns everything for 'all' else filter by faculty+interests when 'personalized'
  const basePool = useMemo(() => {
    if (!events.length) return []
    if (viewMode === 'personalized' && prefs) {
      return events.filter(e => {
        const facultyOk = !e.faculty || e.faculty === 'All' || e.faculty === prefs.faculty
        const interestOk = (e.tags || []).some(t => (prefs.interests || []).includes(t))
        return facultyOk && interestOk
      })
    }
    return events
  }, [events, prefs, viewMode])

  // tag cloud from basePool BUT limited to ALLOWED_TAGS and top TAG_CLOUD_LIMIT
  const tagCloud = useMemo(() => {
    const allowedNorm = new Set(ALLOWED_TAGS.map(norm))
    const counts = {}
    for (const e of basePool) {
      for (const t of (e.tags || [])) {
        const n = norm(t)
        if (!allowedNorm.has(n)) continue
        counts[n] = (counts[n] || 0) + 1
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TAG_CLOUD_LIMIT)
      .map(([normTag, count]) => {
        // find canonical display tag from ALLOWED_TAGS (preserve spacing/casing from array)
        const canonical = ALLOWED_TAGS.find(x => norm(x) === normTag) || normTag
        return { tag: canonical, count }
      })
  }, [basePool])

  // Trending computed within current basePool using save counts
  const trending = useMemo(() => {
    const counts = getSaveCounts() || {}
    if (!basePool.length) return []
    const idToEvent = new Map(basePool.map(e => [e.id, e]))
    return Object.entries(counts)
      .filter(([id, c]) => c > 0 && idToEvent.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ evt: idToEvent.get(id), count }))
  }, [basePool, version])

  function matchesQuery(e, query) {
    if (!query.trim()) return true
    const hay = [
      e.title, e.description, e.organizer, e.location,
      ...(e.tags || [])
    ].join(' ').toLowerCase()
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return words.every(w => hay.includes(w))
  }

  function dateOrInfinity(iso) {
    if (!iso) return Number.POSITIVE_INFINITY
    const t = new Date(iso).getTime()
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY
  }

  // Apply level, tags, search, then sort
  const filtered = useMemo(() => {
    const withLevel = basePool.filter(e => (level === 'all') || (e.level === level))

    // match selected tags by normalized compare (so event tags with different casing still match)
    const selectedNorm = new Set(selectedTags.map(norm))
    const withTags = selectedTags.length
      ? withLevel.filter(e => (e.tags || []).some(t => selectedNorm.has(norm(t))))
      : withLevel

    const withSearch = withTags.filter(e => matchesQuery(e, q))

    if (sort === 'date') {
      return [...withSearch].sort((a, b) => dateOrInfinity(a.start) - dateOrInfinity(b.start))
    }

    // trending: saved first (demo-friendly), then by date
    const savedSet = new Set(getSavedIds())
    return [...withSearch].sort((a, b) => {
      const savedDiff = (+savedSet.has(b.id)) - (+savedSet.has(a.id))
      if (savedDiff !== 0) return savedDiff
      return dateOrInfinity(a.start) - dateOrInfinity(b.start)
    })
  }, [basePool, level, sort, q, selectedTags, version])

  function toggleTag(tag) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function clearAllFilters() {
    setLevel('all')
    setSort('trending')
    setQ('')
    setSelectedTags([])
  }

  const heading = useMemo(() => {
    if (viewMode === 'personalized') {
      if (!prefs) return 'Personalized (set your profile in Onboarding)'
      return `Personalized for ${prefs.faculty} · ${prefs.interests.join(', ')}`
    }
    return 'All events'
  }, [viewMode, prefs])

  return (
    <div>
      <div className="h1">{heading}</div>

      <Card className="space-bottom">
        <div className="row-between">
          <div>
            <div className="h2" style={{ marginTop: 0 }}>View</div>
            <div className="chips">
              <Chip active={viewMode === 'all'} onClick={() => setViewMode('all')}>All</Chip>
              <Chip
                active={viewMode === 'personalized'}
                onClick={() => setViewMode('personalized')}
              >
                Personalized
              </Chip>
            </div>
            {viewMode === 'personalized' && !prefs && (
              <div className="muted" style={{ marginTop: 6 }}>
                No profile yet. <Link to="/onboarding">Set up Onboarding</Link> or <button className="btn btn-ghost" onClick={() => nav('/onboarding')}>Open Onboarding</button>.
              </div>
            )}
          </div>

          <div>
            <div className="h2" style={{ marginTop: 0 }}>Sort</div>
            <div className="chips">
              <Chip active={sort === 'trending'} onClick={() => setSort('trending')}>Trending</Chip>
              <Chip active={sort === 'date'} onClick={() => setSort('date')}>Date</Chip>
            </div>
          </div>
        </div>
      </Card>

      {trending.length > 0 && (
        <Card className="space-bottom">
          <div className="row-between">
            <div className="h2" style={{ marginTop: 0 }}>🔥 Trending {viewMode === 'personalized' ? 'for you' : 'overall'}</div>
            <div className="muted">based on saves</div>
          </div>
          <div className="trend-row">
            {trending.map(({ evt, count }, i) => {
              const saved = getSavedIds().includes(evt.id)
              return (
                <div key={evt.id} className="trend-card">
                  <div className="trend-rank">{i + 1}</div>
                  <div className="trend-title">{evt.title}</div>
                  <div className="trend-meta">{evt.level || '—'} · {evt.location || 'TBA'}</div>
                  <div className="trend-meta">★ {count} save{count === 1 ? '' : 's'}</div>
                  <div className="row space-top">
                    {evt.url && <a className="btn btn-ghost" href={evt.url} target="_blank" rel="noreferrer">Details</a>}
                    <button
                      className={`btn ${saved ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => { toggleSaveId(evt.id); setVersion(v => v + 1) }}
                    >
                      {saved ? 'Saved ✓' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="space-bottom">
        <div className="row-between">
          <div className="searchbar">
            <span className="search-icon" aria-hidden>🔍</span>
            <input
              className="input search-input"
              placeholder="Search title, description, tags, organizer, or location…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" onClick={clearAllFilters}>Clear filters</button>
        </div>

        {tagCloud.length > 0 && (
          <>
            <div className="h2">Popular tags {viewMode === 'personalized' ? '(in your view)' : '(overall)'}</div>
            <div className="chips">
              {tagCloud.map(({ tag, count }) => (
                <Chip key={tag} active={selectedTags.includes(tag)} onClick={() => toggleTag(tag)}>
                  #{tag} ({count})
                </Chip>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="space-bottom">
        <div className="h2" style={{ marginTop: 0 }}>Level</div>
        <div className="chips">
          <Chip active={level === 'all'} onClick={() => setLevel('all')}>All</Chip>
          {LEVELS.map(l => <Chip key={l} active={level === l} onClick={() => setLevel(l)}>{l}</Chip>)}
        </div>
      </Card>

      {loading && <Card>Loading events…</Card>}
      {error && <Card>Failed to load events: {error}</Card>}
      {!loading && !error && filtered.length === 0 && <Card>No matches. Try clearing filters or switching the view mode.</Card>}

      <div className="grid">
        {filtered.map(evt => (
          <EventCard key={evt.id} evt={evt} onSaveToggle={() => setVersion(v => v + 1)} />
        ))}
      </div>
    </div>
  )
}
