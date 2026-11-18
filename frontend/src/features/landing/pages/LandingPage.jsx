import { useState } from 'react'
import { Link } from 'react-router-dom'
import './landing.css'

const NAV = [
  ['convocatoria', 'Convocatoria'],
  ['programa', 'Fechas Importantes'],
  ['actividades', 'Programa'],
  ['organizacion', 'Organización'],
  ['videos', 'Videos'],
  ['historicos', 'Publicaciones'],
  ['contacto', 'Contacto'],
  ['patrocinadores', 'Patrocinadores'],
]

const INITIAL_TIMELINE = [
  ['2026-08-31', 'Inauguración del congreso'],
  ['2026-08-31', 'Recepción de resúmenes, carteles y/o talleres'],
  ['2026-09-10', 'Evaluación de los resúmenes'],
  ['2026-09-15', 'Cierre de recepción de solicitudes'],
  ['2026-09-22', 'Resultados de evaluaciones'],
  ['2026-09-01', 'Inicio de ponencias'],
  ['2026-09-04', 'Cierre del congreso'],
].map(([date, title], id) => ({ id, date, title }))

const TOPICS = ['Energías renovables', 'Inteligencia artificial', 'Telecomunicaciones', 'Electrónica de potencia', 'Manufactura industrial', 'Redes eléctricas', 'Robótica', 'Sustentabilidad', 'Automatización', 'Sistemas embebidos']
const HUES = [150, 200, 260, 30, 170, 220, 340, 120, 190, 280]
const NAMES = ['Dr. Víctor Hugo Hernández Gómez', 'Dra. Laura Mendoza Ríos', 'M. en I. Carlos Pérez Luna', 'Dr. Alejandro Torres Vega', 'Dra. Marisol Ortega Cruz', 'M. en C. Jorge Salinas Ruiz', 'Dr. Ricardo Beltrán Soto', 'Dra. Patricia Núñez Arce', 'M. en I. Héctor Domínguez P.', 'Dr. Fernando Aguilar Mora']
const DAYS = ['31 ago', '1 sep', '2 sep', '3 sep', '4 sep']
const PLACE = 'Auditorio Jaime Torres Keller'

const KEYNOTES = TOPICS.map((t, i) => ({
  t: `${t}: retos y perspectivas`, topic: t, hue: HUES[i],
  director: NAMES[i], speakers: [NAMES[(i + 3) % 10], NAMES[(i + 6) % 10]],
  date: `${DAYS[i % 5]} 2026`, time: `${10 + (i % 4)}:00 h`,
  desc: `Acompáñanos a esta sesión especializada donde analizaremos a profundidad el impacto, la innovación y el futuro de ${t.toLowerCase()} aplicada a la ingeniería.`
}))

const COMMITTEES = [
  ['Comité organizador', 'Coordinación académica y organización general del Congreso.'],
  ['Comité técnico', 'Soporte operativo, tecnológico y acompañamiento de procesos.'],
  ['Comité evaluador científico', 'Revisión académica con participación nacional e internacional.'],
  ['Comité de talleres', 'Coordinación y operación de actividades prácticas.'],
].map(([n, d], k) => ({
  n, d, people: Array.from({ length: 6 + k }, (_, j) => NAMES[(j + k * 2) % 10]),
}))

const ACTS = [
  ['Conferencias magistrales', 'Charlas de especialistas invitados.'],
  ['Ponencias orales', 'Presentación de trabajos de investigación.'],
  ['Talleres', 'Actividades prácticas guiadas.'],
  ['Carteles', 'Exposición de proyectos en formato póster.'],
  ['Prototipos de IA', 'Demostración de prototipos e inteligencia artificial.'],
  ['Ponencias', 'Sesiones temáticas por área.'],
]

const DOCS = ['Convocatoria oficial 21° Congreso', 'Guía de autores', 'Plantilla oficial de extensos', 'Plantilla de videoponencia', 'Requisitos de prototipos e IA', 'Cartelera del congreso']

const VIDEOS = [
  { title: 'Conferencia Magistral 2025: La IA en la Industria Moderna', img: '/images/poster.png', link: '#' },
  { title: 'Panel de Expertos: Retos en Energías Renovables', img: '/images/banner.png', link: '#' },
  { title: 'Avances en Robótica y Sistemas Embebidos', img: '/images/poster.png', link: '#' },
  { title: 'Clausura y Premiación del 20° Congreso (2025)', img: '/images/banner.png', link: '#' },
  { title: 'Taller Práctico de Manufactura Industrial', img: '/images/poster.png', link: '#' },
]

const HISTORICOS = [
  { title: 'Memorias del Congreso - Edición 1', tag: 'Año 1, No. 1', img: '/images/revista1.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio1_No1/Inicio.pdf' },
  { title: 'Memorias del Congreso - Edición 2', tag: 'Año 2, No. 2', img: '/images/revista2.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio2_No2/Inicio.pdf' },
  { title: 'Memorias del Congreso - Edición 3', tag: 'Año 3, No. 3', img: '/images/revista3.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio3_No3/Inicio.pdf' },
  { title: 'Memorias del Congreso - Edición 4', tag: 'Año 4, No. 4', img: '/images/revista4.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Inicio.pdf' },
  { title: 'Memorias del Congreso - Edición 5', tag: 'Año 5, No. 5', img: '/images/revista5.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio5_No5/Inicio.pdf' },
  { title: 'Memorias del Congreso - Edición 6', tag: 'Año 6, No. 6', img: '/images/revista6.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio6_No6/Inicio.pdf' },
  { title: 'Memorias del Congreso - Edición 7', tag: 'Año 7, No. 7', img: '/images/revista7.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio7_No7/Inicio.pdf' },
  { title: 'Memorias del Congreso - Edición 8', tag: 'Año 8, No. 8', img: '/images/revista8.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio8_No8/Revista_N8.pdf' },
  { title: 'Memorias del Congreso - Edición 9', tag: 'Año 9, No. 9', img: '/images/revista9.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio9_No9/Revista_N9.pdf' }
]

const INITIAL_SPONSORS = [
  { name: 'ECC_2', src: '/images/ECC_2.png' },
  { name: 'GECKO', src: '/images/GECKO.png' },
  { name: 'PAPIME_2', src: '/images/PAPIME_2.png' },
  { name: 'DGTIC', src: '/images/DGTIC.png' },
  { name: 'PAPIME', src: '/images/PAPIME.png' },
  { name: 'FES', src: '/images/FES.png' },
  { name: 'ECC', src: '/images/ECC.png' },
]

const MAP = 'https://www.google.com/maps?q=FES+Cuautitl%C3%A1n+Campo+4+UNAM&output=embed'
const MAPLINK = 'https://www.google.com/maps/search/?api=1&query=FES+Cuautitl%C3%A1n+Campo+4'

function go(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function Cover({ topic, hue }) {
  return (
    <div className="cover" style={{ background: `linear-gradient(135deg,hsl(${hue} 70% 35%),hsl(${hue + 40} 80% 55%))` }}>
      <svg viewBox="0 0 100 60" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={15 + i * 17} cy={30 + Math.sin(i * 1.5) * 14} r={4 + i} fill="none" stroke="#fff" strokeOpacity=".6" />)}
        <polyline fill="none" stroke="#fff" strokeOpacity=".5" points={[0, 1, 2, 3, 4].map((i) => `${15 + i * 17},${30 + Math.sin(i * 1.5) * 14}`).join(' ')} />
      </svg>
      <span>{topic}</span>
    </div>
  )
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

function ImagePicker({ src, alt, label, enabled, className = '', imageClassName = '', onChange }) {
  const [error, setError] = useState('')

  const selectImage = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('No se pudo leer la imagen seleccionada.')
        return
      }
      setError('')
      onChange(reader.result)
    }
    reader.onerror = () => setError('No se pudo leer la imagen seleccionada.')
    reader.readAsDataURL(file)
  }

  return (
    <div className={`image-picker ${className} ${enabled ? 'editing' : ''}`}>
      {src && <img className={imageClassName} src={src} alt={alt} />}
      {enabled && (
        <>
          <label className="image-picker-button">
            {label}
            <input type="file" accept="image/*" onChange={selectImage} />
          </label>
          {error && <span className="image-picker-error" role="alert">{error}</span>}
        </>
      )}
    </div>
  )
}

function Calendar({ events, month, onMonthChange }) {
  const [year, monthIndex] = month.split('-').map(Number)
  const firstDay = (new Date(year, monthIndex - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex, 0).getDate()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const marks = events.reduce((result, event) => {
    const [eventYear, eventMonth, day] = event.date.split('-')
    if (Number(eventYear) === year && Number(eventMonth) === monthIndex) {
      result[Number(day)] = [...(result[Number(day)] || []), event.title]
    }
    return result
  }, {})
  const title = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthIndex - 1, 1)))

  const shiftMonth = (amount) => {
    const next = new Date(year, monthIndex - 1 + amount, 1)
    onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="cal">
      <div className="calendar-heading">
        <button type="button" aria-label="Mes anterior" onClick={() => shiftMonth(-1)}>‹</button>
        <h4>{title}</h4>
        <button type="button" aria-label="Mes siguiente" onClick={() => shiftMonth(1)}>›</button>
      </div>
      <div className="calgrid">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => <b key={i}>{day}</b>)}
        {cells.map((day, i) => {
          const eventTitles = marks[day] || []
          return (
            <span key={i} title={eventTitles.join(', ')} className={eventTitles.length ? 'mark' : ''}>
              {day || ''}
            </span>
          )
        })}
      </div>
      <p>Las fechas agregadas para este mes se resaltan en el calendario.</p>
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [com, setCom] = useState(0)
  const [popup, setPopup] = useState(null) // Estado para el pop-up de magistrales
  const [adminEnabled, setAdminEnabled] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#151b29')
  const [secondaryColor, setSecondaryColor] = useState('#e2c275')
  const [bannerImage, setBannerImage] = useState('/images/banner.png')
  const [posterImage, setPosterImage] = useState('/images/poster.jpeg')
  const [programImage, setProgramImage] = useState('/images/programaGeneral.png')
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE)
  const [calendarMonth, setCalendarMonth] = useState('2026-09')
  const [eventForm, setEventForm] = useState({ date: '', title: '' })
  const [editingEventId, setEditingEventId] = useState(null)
  const [sponsors, setSponsors] = useState(INITIAL_SPONSORS)
  const [newSponsor, setNewSponsor] = useState({ name: '', src: '' })

  const nav = (id) => { setOpen(false); go(id) }
  const updateEventForm = (field, value) => setEventForm((current) => ({ ...current, [field]: value }))
  const saveEvent = (event) => {
    event.preventDefault()
    const savedEvent = { ...eventForm, id: editingEventId ?? Date.now() }
    setTimeline((current) => editingEventId
      ? current.map((item) => item.id === editingEventId ? savedEvent : item)
      : [...current, savedEvent])
    setCalendarMonth(eventForm.date.slice(0, 7))
    setEventForm({ date: '', title: '' })
    setEditingEventId(null)
  }

  const editEvent = (event) => {
    setEventForm({ date: event.date, title: event.title })
    setEditingEventId(event.id)
    setCalendarMonth(event.date.slice(0, 7))
  }

  const updateSponsor = (index, updates) => {
    setSponsors((current) => current.map((sponsor, i) => i === index ? { ...sponsor, ...updates } : sponsor))
  }

  const addSponsor = (event) => {
    event.preventDefault()
    if (!newSponsor.name.trim() || !newSponsor.src) return
    setSponsors((current) => [...current, { name: newSponsor.name.trim(), src: newSponsor.src }])
    setNewSponsor({ name: '', src: '' })
  }

  return (
    <div
      className="landing-page"
      style={{
        '--navy': primaryColor,
        '--navy2': `color-mix(in srgb, ${primaryColor}, white 18%)`,
        '--gold': secondaryColor,
      }}
    >
      <header className="hdr">
        <button className="logo" onClick={() => nav('convocatoria')}>
          <img src="/images/logo_congreso.jpeg" alt="Logo CONING" className="crest-img" />
          <span><b>CONING</b><small>Sistema del Congreso de Ingenierías</small></span>
        </button>
        <button className="burger" aria-label="Menú" onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? 'open' : ''}>
          {NAV.map(([id, l]) => <button key={id} onClick={() => nav(id)}>{l}</button>)}
          
          {/* Menú Desplegable de Documentos */}
          <div className="nav-dropdown">
            <button onClick={() => nav('documentos')}>Documentos ▾</button>
            <div className="dropdown-content">
              {DOCS.map((d, idx) => (
                <a key={idx} href="#documentos" onClick={(e) => { e.preventDefault(); nav('documentos'); }}>{d}</a>
              ))}
            </div>
          </div>

          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={adminEnabled}
              onChange={(event) => setAdminEnabled(event.target.checked)}
            />
            <span className="admin-switch" aria-hidden="true" />
            <span>Modo administrador</span>
          </label>
          {adminEnabled && (
            <div className="admin-colors">
              <label>Color principal <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
              <label>Color secundario <input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} /></label>
            </div>
          )}
          <Link to="/login" className="cta">Registrarse / Iniciar sesión</Link>
        </nav>
      </header>

      <section id="convocatoria" className="hero">
        <div className="wrap">
          <ImagePicker
            src={bannerImage}
            alt="Banner del Congreso"
            label="Cambiar banner"
            enabled={adminEnabled}
            imageClassName="banner"
            onChange={setBannerImage}
          />
          <div className="herogrid">
            <div>
              <span className="tag">21° Congreso · Edición en curso</span>
              <h1>21° Congreso Científico y Tecnológico de las Carreras de Ingeniería</h1>
              <p className="lead">Ingeniería Mecánica Eléctrica, Industrial y Telecomunicaciones, Sistemas y Electrónica. Un encuentro para compartir investigación, proyectos y tecnología.</p>
              <p className="period">Periodo de la edición: del 31 de agosto al 4 de septiembre de 2026.</p>
              <ul className="facts">
                <li><small>Registro</small>Hasta el 15 de agosto de 2026</li>
                <li><small>Sede</small>FES Cuautitlán, Campo Cuatro — Unidad de Seminarios</li>
                <li><small>Modalidad</small>Presencial</li>
              </ul>
              <div className="btns">
                <button className="gold" onClick={() => window.open('https://drive.google.com/file/d/102ty8mj66WZt_9K38OAIrLCboKtBrAdU/view?usp=drive_link', '_blank', 'noopener,noreferrer')}>Ver programa →</button>
                <button className="ghost" onClick={() => nav('organizacion')}>Más información ↓</button>
              </div>
            </div>
            <figure className="poster">
              <ImagePicker
                src={posterImage}
                alt="Poster convocatoria"
                label="Cambiar póster"
                enabled={adminEnabled}
                className="poster-image"
                onChange={setPosterImage}
              />
              <a className="gold dl" href={posterImage} download="poster-convocatoria">Descargar póster</a>
            </figure>
          </div>
        </div>
      </section>

      <section id="programa" className="sec">
        <div className="wrap">
          <span className="eyebrow">Fechas Importantes</span>
          <h2>Fechas y plazos importantes</h2>
          <div className="two">
            <ol className="timeline">
              {[...timeline].sort((a, b) => a.date.localeCompare(b.date)).map((item) => (
                <li key={item.id}>
                  <div className="timeline-content">
                    <time>{formatDate(item.date)}</time>
                    <span>{item.title}</span>
                  </div>
                  {adminEnabled && (
                    <div className="timeline-actions">
                      <button type="button" onClick={() => editEvent(item)}>Editar</button>
                      <button type="button" onClick={() => setTimeline((current) => current.filter((entry) => entry.id !== item.id))}>Eliminar</button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <Calendar events={timeline} month={calendarMonth} onMonthChange={setCalendarMonth} />
          </div>
          {adminEnabled && (
            <form className="admin-form event-form" onSubmit={saveEvent}>
              <h3>{editingEventId === null ? 'Agregar fecha importante' : 'Editar fecha importante'}</h3>
              <label>
                Fecha
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(event) => updateEventForm('date', event.target.value)}
                  required
                />
              </label>
              <label>
                Nombre del evento
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(event) => updateEventForm('title', event.target.value)}
                  placeholder="Nombre del evento"
                  required
                />
              </label>
              <button className="admin-submit" type="submit">{editingEventId === null ? 'Agregar fecha' : 'Guardar cambios'}</button>
              {editingEventId !== null && (
                <button className="admin-cancel" type="button" onClick={() => {
                  setEditingEventId(null)
                  setEventForm({ date: '', title: '' })
                }}>Cancelar</button>
              )}
            </form>
          )}
        </div>
      </section>

      <section id="actividades" className="sec alt">
        <div className="wrap">
          <span className="eyebrow">Programa</span>
          <h2>Conferencias magistrales</h2>
          <div className="cards">
            {KEYNOTES.map((k, i) => (
              <article className="card clickable" key={k.t} onClick={() => setPopup(k)}>
                <Cover topic={k.topic} hue={k.hue} />
                <div className="body">
                  {i === 0 && <span className="tag badge-proximo">Más próximo</span>}
                  <h3>{k.t}</h3>
                  <p className="meta date-highlight">{k.date} · {k.time}</p>
                </div>
              </article>
            ))}
          </div>

          <h2 className="sub">Programa general</h2>
          <div className="image-frame">
            <ImagePicker
              src={programImage}
              alt="Programa general"
              label="Cambiar programa general"
              enabled={adminEnabled}
              imageClassName="banner"
              onChange={setProgramImage}
            />
          </div>
        </div>
      </section>

      <section id="organizacion" className="sec">
        <div className="wrap">
          <span className="eyebrow">Organización académica</span>
          <h2>Organización y comités del Congreso</h2>
          <div className="panel">
            <div className="cgrid">
              {COMMITTEES.map((c, i) => (
                <button key={c.n} className={'ccard' + (i === com ? ' on' : '')} onClick={() => setCom(i)}>
                  <h3>{c.n}</h3><p>{c.d}</p><em>Explorar ↗</em>
                </button>
              ))}
            </div>
            <div className="people">
              <h4>{COMMITTEES[com].n}</h4>
              <ul>{COMMITTEES[com].people.map((p) => <li key={p}><i>{p.split(' ')[1][0]}</i>{p}</li>)}</ul>
            </div>
          </div>
          <h2 className="sub">Tipos de actividades y áreas temáticas</h2>
          <div className="mini">{ACTS.map(([t, d]) => <div key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
          <div className="chips">{TOPICS.map((t) => <span key={t}>{t}</span>)}</div>
        </div>
        
        {/* Identificador modificado a "documentos" */}
        <div id="documentos" className="docs">
          <div className="wrap">
            <span className="eyebrow gold">Guías y accesos oficiales</span>
            <h2>Documentos del congreso</h2>
            <div className="dgrid">
              {DOCS.map((d) => <a key={d} href="#documentos" onClick={(e) => e.preventDefault()}><span>📄</span>{d}<b>→</b></a>)}
            </div>
          </div>
        </div>
      </section>

      <section id="videos" className="sec alt">
        <div className="wrap">
          <span className="eyebrow">Multimedia</span>
          <h2>Últimas Conferencias</h2>
          <div className="video-carousel">
            {VIDEOS.map((v, i) => (
              <a key={i} href={v.link} target="_blank" rel="noreferrer" className="video-card">
                <div className="video-thumb">
                  <img src={v.img} alt={v.title} loading="lazy" />
                  <div className="play-btn">▶</div>
                </div>
                <h3>{v.title}</h3>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="historicos" className="sec">
        <div className="wrap">
          <span className="eyebrow">Repositorio Histórico</span>
          <h2>Publicaciones</h2>
          <div className="history-grid">
            {HISTORICOS.map((h, i) => (
              <a key={i} href={h.link} target="_blank" rel="noreferrer" className="history-card">
                <img src={h.img} alt={h.title} className="history-cover" loading="lazy" />
                <span className="tag">{h.tag}</span>
                <h3>{h.title}</h3>
                <span className="action">Leer revista ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="sec contact alt">
        <div className="wrap two">
          <div>
            <span className="eyebrow">Contacto</span>
            <h2>Ubicación de la sede</h2>
            <div className="box">Facultad de Estudios Superiores Cuautitlán, Campo 4<br />Carretera Cuautitlán–Teoloyucan Km. 2.5</div>
            <a className="box mail" href="mailto:21congresoingenierias@fes.cuautitlan.unam.mx">✉ 21congresoingenierias@fes.cuautitlan.unam.mx</a>
            <a className="gold btn" href={MAPLINK} target="_blank" rel="noreferrer">Abrir en Maps</a>
          </div>
          <iframe title="Mapa FES Cuautitlán" src={MAP} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      </section>

      <section id="patrocinadores" className="sec">
        <div className="wrap">
          <span className="eyebrow">Patrocinadores</span>
          <h2>Quienes hacen posible el congreso</h2>
        </div>
        <div className="marquee">
          <div className="track">
            {[...sponsors, ...sponsors].map((sponsor, index) => (
              <div className="sponsor-slide" key={`${sponsor.name}-${index}`} aria-hidden={index >= sponsors.length}>
                <img src={sponsor.src} alt={index >= sponsors.length ? '' : sponsor.name} />
              </div>
            ))}
          </div>
        </div>
        {adminEnabled && (
          <div className="wrap sponsor-admin">
            <h3>Administrar patrocinadores</h3>
            <p>Agrega, cambia o elimina cada imagen de forma independiente.</p>
            <div className="sponsor-list">
              {sponsors.map((sponsor, index) => (
                <article className="sponsor-admin-card" key={`${sponsor.name}-${index}`}>
                  <ImagePicker
                    src={sponsor.src}
                    alt={`Logotipo de ${sponsor.name}`}
                    label="Cambiar imagen"
                    enabled
                    className="sponsor-image"
                    onChange={(src) => updateSponsor(index, { src })}
                  />
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={sponsor.name}
                      onChange={(event) => updateSponsor(index, { name: event.target.value })}
                    />
                  </label>
                  <button className="admin-delete" type="button" onClick={() => setSponsors((current) => current.filter((_, i) => i !== index))}>
                    Eliminar patrocinador
                  </button>
                </article>
              ))}
            </div>
            <form className="admin-form sponsor-form" onSubmit={addSponsor}>
              <h4>Agregar patrocinador</h4>
              <label>
                Nombre
                <input
                  type="text"
                  value={newSponsor.name}
                  onChange={(event) => setNewSponsor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nombre del patrocinador"
                  required
                />
              </label>
              <ImagePicker
                src={newSponsor.src}
                alt="Vista previa del nuevo patrocinador"
                label={newSponsor.src ? 'Cambiar imagen seleccionada' : 'Seleccionar imagen'}
                enabled
                className="new-sponsor-picker"
                onChange={(src) => setNewSponsor((current) => ({ ...current, src }))}
              />
              <button className="admin-submit" type="submit" disabled={!newSponsor.src}>Agregar patrocinador</button>
            </form>
          </div>
        )}
      </section>

      <footer>
        <div className="wrap fgrid">
          <div><small>Desarrollado por:</small><p>Laboratorio de Energías Renovables</p></div>
          <div><small>Mantenimiento realizado por:</small><p>Gecko Systems</p></div>
          <p className="legal">Esta página puede ser reproducida con fines no lucrativos... © 2026 Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Pop-up (Modal) de las Conferencias Magistrales */}
      {popup && (
        <div className="modal-overlay" onClick={() => setPopup(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setPopup(null)}>✕</button>
            <Cover topic={popup.topic} hue={popup.hue} />
            <div className="modal-body">
              <h2>{popup.t}</h2>
              <div className="modal-date">{popup.date} · {popup.time}</div>
              <p className="modal-place">📍 {PLACE}</p>
              <div className="modal-people">
                <p><b>Director:</b> {popup.director}</p>
                <p><b>Ponentes:</b> {popup.speakers.join(', ')}</p>
              </div>
              <p className="modal-desc">{popup.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}