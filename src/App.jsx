import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import timerIcon from './assets/timerIcon.png'
import ringtone from './assets/ringtone.mp3'
import './App.css'

const TimeField = ({ label, value, onChange, max }) => {
  const handleChange = (event) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, 2)
    const numeric = next === '' ? '' : Math.min(parseInt(next, 10), max)
    onChange(numeric === '' ? '' : numeric.toString().padStart(2, '0'))
  }

  return (
    <label className="time-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder="00"
      />
    </label>
  )
}

const CircularTimer = ({ duration, remaining, status }) => {
  const radius = 150
  const circumference = 2 * Math.PI * radius
  const safeDuration = duration || 1
  const progress = Math.max(remaining, 0) / safeDuration
  const offset = circumference * (1 - progress)

  return (
    <div className="timer-ring">
      <svg width="340" height="340">
        <circle
          className="track"
          cx="170"
          cy="170"
          r={radius}
          strokeWidth="10"
        />
        <circle
          className="progress"
          cx="170"
          cy="170"
          r={radius}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="timer-content">
        <p className="timer-sub">
          {duration ? `${duration} sec` : 'Waiting to start'}
        </p>
        <p className="timer-value">{formatTime(remaining)}</p>
        <p className="timer-status">
          {status === 'finished'
            ? 'Complete'
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
      </div>
    </div>
  )
}

const formatTime = (totalSeconds) => {
  const clamped = Math.max(totalSeconds, 0)
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const seconds = clamped % 60
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

const formatFullTime = (totalSeconds) => {
  const clamped = Math.max(totalSeconds, 0)
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const seconds = clamped % 60
  return [hours, minutes, seconds].map((unit) => unit.toString().padStart(2, '0')).join(':')
}

function App() {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [seconds, setSeconds] = useState('')
  const [status, setStatus] = useState('idle')
  const [remaining, setRemaining] = useState(0)
  const [duration, setDuration] = useState(0)
  const [stage, setStage] = useState('setup')
  const [initialLabel, setInitialLabel] = useState('00:00:00')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const audioRef = useRef(null)

  const totalSeconds = useMemo(() => {
    const h = parseInt(hours || '0', 10)
    const m = parseInt(minutes || '0', 10)
    const s = parseInt(seconds || '0', 10)
    return h * 3600 + m * 60 + s
  }, [hours, minutes, seconds])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  useEffect(() => {
    audioRef.current = new Audio(ringtone)
    audioRef.current.loop = true
    return () => {
      stopAudio()
    }
  }, [stopAudio])

  useEffect(() => {
    if (status !== 'running' || remaining <= 0) {
      if (status === 'running' && remaining <= 0) {
        setStatus('finished')
      }
      return
    }

    const id = setInterval(() => {
      setRemaining((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(id)
  }, [status, remaining])

  useEffect(() => {
    if (status === 'finished') {
      setIsModalOpen(true)
      audioRef.current?.play()
    } else {
      setIsModalOpen(false)
      stopAudio()
    }
  }, [status, stopAudio])

  const handleBegin = useCallback(() => {
    if (!totalSeconds) {
      return
    }
    setDuration(totalSeconds)
    setRemaining(totalSeconds)
    setStatus('running')
    setStage('active')
    setInitialLabel(formatFullTime(totalSeconds))
  }, [totalSeconds])

  const handleToggle = useCallback(() => {
    if (status === 'running') {
      setStatus('paused')
    } else if (status === 'paused') {
      setStatus('running')
    }
  }, [status])

  const handleReset = useCallback(() => {
    if (!duration) {
      return
    }
    setRemaining(duration)
    setStatus('running')
    setIsModalOpen(false)
    stopAudio()
  }, [duration, stopAudio])

  const handleBackToSetup = useCallback(() => {
    setStatus('idle')
    setRemaining(0)
    setDuration(0)
    setStage('setup')
    setIsModalOpen(false)
    stopAudio()
  }, [stopAudio])

  const handleDismiss = useCallback(() => {
    stopAudio()
    setStatus('acknowledged')
  }, [stopAudio])

  const canToggle = status === 'running' || status === 'paused'
  const playLabel = status === 'running' ? 'Pause timer' : 'Resume timer'
  const playGlyph = status === 'running' ? '❚❚' : '▶'

  return (
    <div className="page">
      <div className={`card ${stage === 'active' ? 'card--active' : ''}`}>
        <img src={timerIcon} className="title-image" alt="Warm up" />
        {stage === 'setup' ? (
          <>
            <p className="subtitle">Set your custom countdown</p>
            <div className="input-row">
              <TimeField label="Hours" value={hours} onChange={setHours} max={23} />
              <TimeField
                label="Minutes"
                value={minutes}
                onChange={setMinutes}
                max={59}
              />
              <TimeField
                label="Seconds"
                value={seconds}
                onChange={setSeconds}
                max={59}
              />
            </div>
            <button className="primary" onClick={handleBegin} disabled={!totalSeconds}>
              Start Timer
            </button>
          </>
        ) : (
          <>
            <button className="back-btn" onClick={handleBackToSetup} aria-label="Back to setup">
              Back
            </button>
            <CircularTimer duration={duration} remaining={remaining} status={status} />
            <div className="controls">
              <button
                className="control-btn play-btn"
                onClick={canToggle ? handleToggle : undefined}
                disabled={!canToggle}
                aria-label={playLabel}
              >
                {playGlyph}
              </button>
              <button className="control-btn reset-btn" onClick={handleReset} aria-label="Replay timer">
                ↺
              </button>
            </div>
          </>
        )}
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <p className="modal-title">Timer Done</p>
            <p className="modal-time">{initialLabel}</p>
            <button className="primary1" onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

