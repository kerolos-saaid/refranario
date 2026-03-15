import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchProverb, createProverb, updateProverb } from '../lib/api'

export default function AddEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  
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
  const [error, setError] = useState('')

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
          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #F79F3F 0%, #DF3D4C 50%, #B02C33 100%)' }} />
        </header>
        
        {/* Form Content */}
        <main className="flex flex-col p-6 gap-8 pb-32">
          <form onSubmit={handleSubmit} id="proverb-form">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {/* Image Upload Area */}
            <div className="flex flex-col mb-8">
              <p className="label-ui mb-2">Imagen del Manuscrito</p>
              {formData.image ? (
                <div id="image-preview" className="mb-4">
                  <img id="preview-img" src={formData.image} alt="Preview" className="w-full h-48 object-cover rounded border-2 border-primary" />
                </div>
              ) : (
                <div id="upload-area" className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-accent/50 bg-accent/5 px-6 py-10">
                  <div className="text-accent">
                    <span className="material-symbols-outlined text-4xl">history_edu</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-primary font-display text-sm font-bold tracking-wider">URL de la imagen</p>
                    <p className="text-muted text-xs text-center">Ingresa una URL de imagen a continuación</p>
                  </div>
                </div>
              )}
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://..."
                className="form-input w-full bg-card p-3 text-lg"
              />
            </div>
            
            {/* Spanish Input */}
            <div className="flex flex-col gap-1 mb-8">
              <label className="label-ui" htmlFor="spanish-phrase">Spanish Phrase (Origen) *</label>
              <textarea
                required
                name="spanish"
                value={formData.spanish}
                onChange={handleChange}
                className="form-input w-full bg-card p-3 text-lg font-display text-primary placeholder:text-muted/50 min-h-[100px]"
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
                className="form-input w-full bg-card p-3 text-2xl arabic-rtl text-ink placeholder:text-muted/50 min-h-[100px]"
                placeholder="...عصفور في اليد"
              />
            </div>
            
            {/* English Input */}
            <div className="flex flex-col gap-1 mb-8">
              <label className="label-ui" htmlFor="english-phrase">English Translation *</label>
              <textarea
                required
                name="english"
                value={formData.english}
                onChange={handleChange}
                className="form-input w-full bg-card p-3 text-lg font-display text-ink placeholder:text-muted/50 min-h-[80px]"
                placeholder="E.g., A bird in the hand is worth two in the bush..."
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
              <label className="label-ui" htmlFor="note">Definición / Nota</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="form-input w-full bg-card p-3 text-ink placeholder:text-muted/50 min-h-[100px]"
                placeholder="Explica el significado o contexto de este refrán..."
              />
            </div>
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-lg font-ui text-sm font-bold tracking-widest uppercase text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #F79F3F 0%, #DF3D4C 100%)' }}
            >
              {saving ? 'GUARDANDO...' : isEdit ? 'ACTUALIZAR REFRÁN' : 'AGREGAR AL ARCHIVO'}
            </button>
          </form>
        </main>
      </div>
      
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
        
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #DF3D4C; border-radius: 4px; }
      `}</style>
    </div>
  )
}
