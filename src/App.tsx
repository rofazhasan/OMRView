import { useState, useRef, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { Camera, Upload, Settings, FileSpreadsheet, Activity } from 'lucide-react'
import Papa from 'papaparse'
import { parseTemplate } from './core/templateParser'
import type { BubblePoint, Template } from './core/templateParser'
import { processOMR } from './core/omrEngine'
import './App.css'

function App() {
  const [status, setStatus] = useState('Initializing...')
  const [cvReady, setCvReady] = useState(false)
  const [template, setTemplate] = useState<Template | null>(null)
  const [bubbles, setBubbles] = useState<BubblePoint[]>([])
  const [results, setResults] = useState<Record<string, string[]>>({})
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const checkCv = setInterval(() => {
      if ((window as any).cv && typeof (window as any).cv.Mat === 'function') {
        setCvReady(true)
        setStatus('Ready to scan')
        clearInterval(checkCv)
      }
    }, 500)
    return () => clearInterval(checkCv)
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setStatus('Camera active')
      }
    } catch (err) {
      console.error(err)
      setStatus('Failed to access camera')
    }
  }

  const handleTemplateUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        const { bubbles, template } = parseTemplate(json)
        setTemplate(template)
        setBubbles(bubbles)
        setStatus('Template loaded: ' + Object.keys(template.fieldBlocks).length + ' fields')
      } catch (err: any) {
        console.error("Template parse error:", err)
        setStatus('Invalid template format: ' + (err.message || 'unknown error'))
      }
    }
    reader.readAsText(file)
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = async () => {
      if (!imageCanvasRef.current || !canvasRef.current || !template) {
        setStatus('Please load template first')
        return
      }
      const ctx = imageCanvasRef.current.getContext('2d')
      imageCanvasRef.current.width = img.width
      imageCanvasRef.current.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      setStatus('Processing image...')
      try {
        const res = await processOMR(imageCanvasRef.current, template, bubbles, canvasRef.current)
        setResults(res)
        setStatus('Processing complete!')
      } catch (err) {
        console.error(err)
        setStatus('Processing failed')
      }
    }
    img.src = URL.createObjectURL(file)
  }

  const exportResults = () => {
    if (Object.keys(results).length === 0) return
    const rows = Object.keys(results).map(key => ({
      Question: key,
      Marked: results[key].join(', ') || 'Unmarked'
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'omr_results.csv'
    a.click()
  }

  return (
    <div className="app-container">
      <header className="header animate-fade-in">
        <div className="logo-container">
          <Activity size={32} color="var(--primary)" />
          <h1>OMRCracker</h1>
        </div>
        <div className="status-badge">
          <span className={`indicator ${cvReady ? 'ready' : 'loading'}`}></span>
          {status}
        </div>
      </header>

      <main className="main-content">
        <section className="workspace animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="toolbar">
            <div className="glass-panel">
              <h3>Configuration</h3>
              <label className="btn btn-primary">
                <Settings size={20} />
                Load Template
                <input type="file" accept=".json" hidden onChange={handleTemplateUpload} />
              </label>
              <label className={`btn btn-outline ${!template ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={20} />
                Upload Scan
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} disabled={!template} />
              </label>
            </div>
            
            <div className="glass-panel">
              <h3>Capture</h3>
              <button className="btn btn-outline" onClick={startCamera}>
                <Camera size={20} />
                Start Camera
              </button>
            </div>

            {Object.keys(results).length > 0 && (
              <div className="glass-panel animate-fade-in">
                <h3>Results Data</h3>
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={exportResults}>
                  <FileSpreadsheet size={20} />
                  Export CSV
                </button>
                <div className="results-grid">
                  {Object.keys(results).slice(0, 8).map(key => (
                    <div key={key} className="result-item">
                      <span className="result-label">{key}</span>
                      <span className="result-value">{results[key].join(', ') || '-'}</span>
                    </div>
                  ))}
                  {Object.keys(results).length > 8 && (
                    <div className="result-item" style={{ opacity: 0.7 }}>
                      <span className="result-label">...</span>
                      <span className="result-value">+{Object.keys(results).length - 8} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div className="preview-area">
              <canvas ref={imageCanvasRef} style={{ display: 'none' }}></canvas>
              <canvas ref={canvasRef} className="overlay-canvas"></canvas>
              {!template && (
                <div className="placeholder-text">
                  <Settings className="placeholder-icon" />
                  <span>Start by loading a Template JSON</span>
                </div>
              )}
              {template && Object.keys(results).length === 0 && (
                <div className="placeholder-text">
                  <Upload className="placeholder-icon" />
                  <span>Upload a scan or use camera</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
