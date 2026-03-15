import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchProverb, createProverb, updateProverb, uploadImage } from '../lib/api'

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'https://senor-shabi-api.kerolos-saaid.workers.dev/api'

export default function AddEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    spanish: '',
    arabic: '',
    english: '',
    category: 'Wisdom',
    note: '',
    image: '',
    curator: '',
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (isEdit && id) {
      loadProverb()
    }
  }, [id])

  const loadProverb = async () => {
    try {
      const data = await fetchProverb(id!)
      setFormData({
        spanish: data.spanish,
        arabic: data.arabic,
        english: data.english,
        category: data.category,
        note: data.note,
        image: data.image,
        curator: data.curator,
      })
    } catch (err) {
      setError('Failed to load proverb')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const username = localStorage.getItem('username') || 'Anonymous'
      const data = { ...formData, curator: username }
      
      if (isEdit && id) {
        await updateProverb(id, data)
      } else {
        await createProverb(data)
      }
      navigate('/home')
    } catch (err) {
      setError('Failed to save proverb')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        
        // Upload to API using uploadImage function with JWT auth
        const data = await uploadImage(base64, file.name)
        
        if (data.success) {
          setFormData(prev => ({ ...prev, image: data.url }))
        } else {
          setError('Failed to upload image')
        }
        setUploading(false)
      }
      reader.onerror = () => {
        setError('Failed to read image file')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Failed to upload image')
      setUploading(false)
    }
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: '' }))
  }

  const categories = ['Wisdom', 'Prudence', 'Time', 'Nature', 'Love', 'Work', 'Other']

  if (loading) {
    return (
      <div className="bg-background min-h-screen font-serif text-ink flex flex-col">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderTopColor: '#B02C33' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-ink font-serif min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-2xl mx-auto bg-background">
        {/* TopAppBar */}
        <header className="sticky top-0 z-10 flex items-center p-4 justify-between shadow-lg relative" style={{ background: 'linear-gradient(135deg, #B02C33 0%, #8A1F25 100%)' }}>
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0zm20 20h20v20H20z' fill='%23fff' fill-opacity='0.3'/%3E%3C/svg%3E\")" }} />
          <Link to="/home" className="relative text-white/80 flex items-center justify-center cursor-pointer hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <img src="/new_logo_name_only.png" alt="Señor Shaعbi" className="relative h-7 object-contain flex-1 mx-4 brightness-0 invert" />
          <div className="w-10"></div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #F79F3F 0%, #DF3D4C 50%, #B02C33 100%)' }} />
        </header>
        
        {/* Form Content */}
        <main className="flex flex-col p-6 gap-8 pb-32">
          <form onSubmit={handleSubmit} id="proverb-form">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm animate-shake">
                {error}
              </div>
            )}
            
            {/* Image Upload Area - Matching Original Design */}
            <div className="flex flex-col mb-8">
              <p className="label-ui mb-2">Imagen del Manuscrito</p>
              <input 
                type="file" 
                ref={fileInputRef}
                id="image-input" 
                accept="image/*" 
                className="hidden"
                onChange={handleFileSelect}
              />
              
              {/* Image Preview */}
              {formData.image ? (
                <div id="image-preview" className="mb-4 relative group">
                  <img 
                    id="preview-img" 
                    src={formData.image} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg border-2 border-primary shadow-md cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                  {/* Change image hint */}
                  <p className="text-center text-xs text-muted mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click image to change
                  </p>
                </div>
              ) : (
                /* Upload Area - Drag & Drop */
                <div 
                  id="upload-area"
                  className={`flex flex-col items-center gap-4 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-all duration-300 ${
                    isDragOver 
                      ? 'border-accent bg-accent/10 scale-[1.02]' 
                      : 'border-accent/50 bg-accent/5 hover:bg-accent/10 hover:border-accent'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="text-accent">
                      <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                    </div>
                  ) : (
                    <div className="text-accent">
                      <span className="material-symbols-outlined text-4xl">history_edu</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-primary font-display text-sm font-bold tracking-wider">
                      {uploading ? 'Subiendo imagen...' : 'Arrastra la imagen aquí'}
                    </p>
                    <p className="text-muted text-xs text-center">
                      {uploading ? 'Por favor espera' : 'Sube una imagen en tono sepia para el archivo'}
                    </p>
                  </div>
                  <button 
                    type="button" 
                    id="select-file-btn"
                    className="flex min-w-[120px] cursor-pointer items-center justify-center rounded-lg h-9 px-4 text-white text-xs font-ui font-bold tracking-widest uppercase shadow-md transition-all hover:shadow-lg btn-press"
                    style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                  >
                    {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                  </button>
                </div>
              )}
            </div>
            
            {/* Spanish Input */}
            <div className="flex flex-col gap-1 mb-8">
              <label className="label-ui" htmlFor="spanish-phrase">Spanish Phrase (Origen) *</label>
              <textarea
                required
                name="spanish"
                value={formData.spanish}
                onChange={handleChange}
                className="form-input w-full bg-card p-3 text-lg font-display text-primary placeholder:text-muted/50 min-h-[100px] resize-none"
                placeholder="E.g., Más vale pájaro en mano..."
              />
            </div>
            
            {/* Arabic Input */}
            <div className="flex flex-col gap-1 mb-8">
              <label className="label-ui" htmlFor="arabic-phrase">Arabic Equivalent (Naskh) *</label>
              <textarea
                required
                name="arabic"
                value={formData.arabic}
                onChange={handleChange}
                dir="rtl"
                className="form-input w-full bg-card p-3 text-2xl arabic-rtl text-ink placeholder:text-muted/50 min-h-[100px] resize-none"
                placeholder="...عصفور في اليد"
              />
            </div>
            
            {/* English Input */}
            <div className="flex flex-col gap-1 mb-8">
              <label className="label-ui" htmlFor="english-translation">English Translation *</label>
              <textarea
                required
                name="english"
                value={formData.english}
                onChange={handleChange}
                className="form-input w-full bg-card p-3 text-lg text-ink placeholder:text-muted/50 min-h-[100px] resize-none"
                placeholder="A bird in the hand is worth two in the bush..."
              />
            </div>
            
            {/* Category Select */}
            <div className="flex flex-col gap-1 mb-8">
              <label className="label-ui" htmlFor="category">Categoría</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-input w-full bg-card p-3 text-ink"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Note Input */}
            <div className="flex flex-col gap-1 mb-8">
              <label className="label-ui" htmlFor="note">Scholar's Note</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="form-input w-full bg-card p-3 text-base text-ink placeholder:text-muted/50 min-h-[80px] resize-none"
                placeholder="Historical usage notes or regional variations..."
              />
            </div>
          </form>
        </main>
        
        {/* Sticky Action Bar */}
        <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-md border-t border-primary/10 p-4 flex gap-4 items-center" style={{ background: 'rgba(255,250,248,0.95)' }}>
          <Link
            to="/home"
            className="flex-1 px-4 py-3 text-primary font-ui font-bold text-xs tracking-widest uppercase hover:text-primary-light transition-colors text-center border border-primary/20 rounded-lg"
          >
            Cancelar
          </Link>
          <button
            form="proverb-form"
            type="submit"
            disabled={saving || uploading}
            className="flex-[2] text-white py-3 px-6 shadow-lg font-display font-bold text-sm tracking-widest uppercase hover:shadow-xl transition-all rounded-lg btn-press disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #DF3D4C 0%, #F79F3F 100%)' }}
          >
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar Registro'}
          </button>
        </footer>
      </div>
      
      {/* Decorative Corner Accents - Desktop only */}
      <div className="fixed top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-accent/30 pointer-events-none m-4 hidden lg:block" />
      <div className="fixed bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-accent/30 pointer-events-none m-4 hidden lg:block" />
      
      <style>{`
        .border-bookplate {
          border: 1px solid rgba(176,44,51,0.1);
          border-radius: 0.75rem;
        }
        
        .form-input {
          border: 1px solid rgba(176,44,51,0.15);
          border-radius: 0.5rem;
          transition: all 0.2s ease;
        }
        
        .form-input:focus {
          border-color: #F79F3F;
          box-shadow: 0 0 0 3px rgba(247,159,63,0.15);
          outline: none;
        }
        
        .label-ui {
          font-family: 'Libre Franklin', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: #B02C33;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .arabic-rtl {
          direction: rtl;
          font-family: 'Amiri', serif;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
