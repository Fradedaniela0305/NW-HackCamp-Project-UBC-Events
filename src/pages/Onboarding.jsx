import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Chip from '../components/Chip.jsx'
import Button from '../components/Button.jsx'
import { getUserPrefs, saveUserPrefs } from '../lib/storage.js'

const FACULTIES = [
  'Sauder (Business)',
  'Applied Science / Engineering',
  'Science',
  'Arts',
  'Land & Food Systems',
  'Forestry',
  'Computer Science',
  'Medicine & Health Sciences',
  'Education',
  'Law'
]

const INTEREST_CATEGORIES = {
  Tech: ['ai', 'machine learning', 'data science', 'web dev', 'mobile dev', 'robotics', 'cybersecurity'],
  Business: ['entrepreneurship', 'finance', 'consulting', 'product management', 'startups'],
  Design: ['ux/ui', 'graphic design', 'industrial design', '3D modeling'],
  Events: ['hackathons', 'workshops', 'competitions', 'networking', 'social'],
  Careers: ['internships', 'career fairs', 'research opportunities', 'volunteering'],
  Sustainability: ['climate', 'sustainability', 'clean tech', 'social impact']
}

const MIN_INTERESTS = 2
const MAX_INTERESTS = 5

export default function Onboarding() {
  const nav = useNavigate()

  // form state
  const [name, setName] = useState('')
  const [faculty, setFaculty] = useState('')
  const [interests, setInterests] = useState([])

  // ui state
  const [touched, setTouched] = useState({ name: false, faculty: false, interests: false })
  const [error, setError] = useState('')

  useEffect(() => {
    const existing = getUserPrefs()
    if (existing) {
      setName(existing.name || '')
      setFaculty(existing.faculty || '')
      setInterests(existing.interests || [])
    }
  }, [])

  const ALL_INTERESTS = useMemo(() => Object.values(INTEREST_CATEGORIES).flat(), [])

  const toggleInterest = useCallback((tag) => {
    setError('')
    setInterests(prev => {
      if (prev.includes(tag)) return prev.filter(t => t !== tag)
      if (prev.length >= MAX_INTERESTS) {
        setError(`You can select up to ${MAX_INTERESTS} interests.`)
        return prev
      }
      return [...prev, tag]
    })
  }, [])

  const valid = useMemo(() => name.trim().length > 0 && !!faculty && interests.length >= MIN_INTERESTS, [name, faculty, interests])

  // Save and dispatch an event so Feed updates immediately in this tab
  const saveAndNotify = useCallback((payload) => {
    saveUserPrefs(payload)
    try {
      window.dispatchEvent(new CustomEvent('userprefs-updated', { detail: payload }))
    } catch (e) {
      // ignore if CustomEvent isn't supported (very old browsers)
    }
  }, [])

  const handleSaveAndContinue = useCallback(() => {
    setTouched({ name: true, faculty: true, interests: true })
    if (!valid) return
    const payload = { name: name.trim(), faculty, interests }
    saveAndNotify(payload)
    nav('/feed')
  }, [name, faculty, interests, nav, valid, saveAndNotify])

  const handleSave = useCallback(() => {
    setTouched({ name: true, faculty: true, interests: true })
    if (!valid) return
    const payload = { name: name.trim(), faculty, interests }
    saveAndNotify(payload)
  }, [name, faculty, interests, valid, saveAndNotify])

  const handleResetLocal = useCallback(() => {
    setName('')
    setFaculty('')
    setInterests([])
    setTouched({ name: false, faculty: false, interests: false })
    setError('')
  }, [])

  return (
    <div>
      <h1 className="h1">Personalize your feed 🎯</h1>

      <Card className="space-bottom">
        <div className="h2">Your name</div>
        <input
          className="input"
          placeholder="e.g., Alex"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, name: true }))}
          aria-label="Your name"
        />
        {touched.name && !name.trim() && <div style={{ color: 'var(--danger)', marginTop: 6 }}>Name is required.</div>}

        <div className="h2 space-top">Your faculty</div>
        <div className="chips" role="list">
          {FACULTIES.map(f => (
            <Chip
              key={f}
              active={faculty === f}
              onClick={() => { setFaculty(f); setTouched(t => ({ ...t, faculty: true })) }}
              role="button"
              tabIndex={0}
              aria-pressed={faculty === f}
            >
              {f}
            </Chip>
          ))}
        </div>
        {touched.faculty && !faculty && <div style={{ color: 'var(--danger)', marginTop: 6 }}>Pick a faculty.</div>}

        {faculty && (
          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              Recommended for {faculty.split(' (')[0]}:
            </div>
            {/* Light recommendation: pre-check common tags from categories */}
            <div className="chips" style={{ marginTop: 8 }}>
              {ALL_INTERESTS.slice(0, 6).map(r => (
                <Chip
                  key={r}
                  active={interests.includes(r)}
                  onClick={() => toggleInterest(r)}
                >
                  {r}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="h2 space-top">Pick {MIN_INTERESTS}–{MAX_INTERESTS} interests</div>
        <div style={{ marginBottom: 8, color: 'var(--muted)' }}>
          Choose topics you want to see in your feed. You can pick up to {MAX_INTERESTS}.
          <span style={{ marginLeft: 12, fontWeight: 700 }}>{interests.length}</span> selected
        </div>

        {Object.entries(INTEREST_CATEGORIES).map(([cat, tags]) => (
          <div key={cat} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{cat}</div>
            <div className="chips">
              {tags.map(tag => (
                <Chip
                  key={tag}
                  active={interests.includes(tag)}
                  onClick={() => toggleInterest(tag)}
                >
                  {tag}
                </Chip>
              ))}
            </div>
          </div>
        ))}

        {touched.interests && interests.length < MIN_INTERESTS && (
          <div style={{ color: 'var(--danger)', marginTop: 6 }}>
            Pick at least {MIN_INTERESTS} interests.
          </div>
        )}
        {error && <div style={{ color: 'var(--danger)', marginTop: 6 }}>{error}</div>}

        <div className="row space-top">
          <Button kind="accent" disabled={!valid} onClick={handleSaveAndContinue}>Save & Continue</Button>
          <Button kind="ghost" onClick={handleSave}>Save</Button>
          <Button kind="ghost" onClick={handleResetLocal}>Reset</Button>
          <Button kind="ghost" onClick={() => nav('/feed')}>Skip for now</Button>
        </div>
      </Card>

      <Card>
        <div className="h2" style={{ marginTop: 0 }}>What you'll get</div>
        <p className="muted">
          A personalized event feed for <strong>{faculty || 'your faculty'}</strong> based on interests like{' '}
          <strong>{interests.length ? interests.join(', ') : 'your picks'}</strong>. You can update these anytime from the Onboarding/Settings page.
        </p>
      </Card>
    </div>
  )
}
