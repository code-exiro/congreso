import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import apiClient from '../../../shared/api/apiClient'
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
  { id: 1, startDate: '2026-08-31', endDate: '2026-08-31', title: 'Inauguración del congreso', color: '#e2c275' },
  { id: 2, startDate: '2026-08-31', endDate: '2026-09-15', title: 'Recepción de resúmenes, carteles y/o talleres', color: '#2563eb' },
  { id: 3, startDate: '2026-09-01', endDate: '2026-09-04', title: 'Desarrollo de ponencias', color: '#059669' },
  { id: 4, startDate: '2026-09-10', endDate: '2026-09-18', title: 'Evaluación de los resúmenes', color: '#d97706' },
  { id: 5, startDate: '2026-09-22', endDate: '2026-09-22', title: 'Resultados de evaluaciones', color: '#7c3aed' },
  { id: 6, startDate: '2026-09-04', endDate: '2026-09-04', title: 'Cierre del congreso', color: '#dc2626' },
]

const TOPICS = [
  'Energías renovables',
  'Inteligencia artificial',
  'Telecomunicaciones',
  'Electrónica de potencia',
  'Manufactura industrial',
  'Redes eléctricas',
  'Robótica',
  'Sustentabilidad',
  'Automatización',
  'Sistemas embebidos',
]
const HUES = [150, 200, 260, 30, 170, 220, 340, 120, 190, 280]
const NAMES = [
  'Dr. Víctor Hugo Hernández Gómez',
  'Dra. Laura Mendoza Ríos',
  'M. en I. Carlos Pérez Luna',
  'Dr. Alejandro Torres Vega',
  'Dra. Marisol Ortega Cruz',
  'M. en C. Jorge Salinas Ruiz',
  'Dr. Ricardo Beltrán Soto',
  'Dra. Patricia Núñez Arce',
  'M. en I. Héctor Domínguez P.',
  'Dr. Fernando Aguilar Mora',
]
const DAYS = ['31 ago', '1 sep', '2 sep', '3 sep', '4 sep']
const PLACE = 'Auditorio Jaime Torres Keller'

const KEYNOTES = TOPICS.map((t, i) => ({
  t: `${t}: retos y perspectivas`,
  topic: t,
  hue: HUES[i],
  director: NAMES[i],
  speakers: [NAMES[(i + 3) % 10], NAMES[(i + 6) % 10]],
  date: `${DAYS[i % 5]} 2026`,
  time: `${10 + (i % 4)}:00 h`,
  desc: `Acompáñanos a esta sesión especializada donde analizaremos a profundidad el impacto, la innovación y el futuro de ${t.toLowerCase()} aplicada a la ingeniería.`,
}))

const COMMITTEES = [
  ['Comité organizador', 'Coordinación académica y organización general del Congreso.'],
  ['Comité técnico', 'Soporte operativo, tecnológico y acompañamiento de procesos.'],
  ['Comité evaluador científico', 'Revisión académica con participación nacional e internacional.'],
  ['Comité de talleres', 'Coordinación y operación de actividades prácticas.'],
].map(([n, d], k) => ({
  n,
  d,
  people: Array.from({ length: 6 + k }, (_, j) => NAMES[(j + k * 2) % 10]),
}))

const ACTIVITY_TYPES = [
  {
    title: 'Conferencias magistrales',
    shortDesc: 'Charlas de especialistas invitados.',
    fullDesc: 'Sesiones plenarias impartidas por investigadores, académicos y líderes de la industria nacional e internacional sobre tendencias de vanguardia en ingeniería.',
    steps: [
      'Crea tu cuenta en el portal CONING e inicia sesión como asistente o ponente.',
      'Consulta el horario y auditorio asignado en el programa general.',
      'Registra tu asistencia mediante el código QR en la entrada del auditorio para obtener tu constancia.',
    ],
  },
  {
    title: 'Ponencias orales',
    shortDesc: 'Presentación de trabajos de investigación.',
    fullDesc: 'Exposición presencial de trabajos científicos y tecnológicos inéditos evaluados mediante doble arbitraje ciego por el comité científico.',
    steps: [
      'Regístrate en el sistema CONING y selecciona la opción "Registrar Ponencia".',
      'Sube tu resumen y artículo en extenso utilizando la plantilla oficial antes de la fecha límite.',
      'Atiende las observaciones de los evaluadores dentro del periodo establecido.',
      'Realiza el pago correspondiente, sube tu comprobante y envía tu presentación final.',
    ],
  },
  {
    title: 'Talleres',
    shortDesc: 'Actividades prácticas guiadas.',
    fullDesc: 'Sesiones prácticas intensivas enfocadas en el dominio de herramientas, software especializado, simulación y desarrollo tecnológico aplicado.',
    steps: [
      'Inicia sesión en tu cuenta de CONING y dirígete a la sección de Talleres.',
      'Selecciona el taller de tu interés verificando el cupo disponible y los requisitos técnicos.',
      'Confirma tu inscripción y asiste puntualmente al laboratorio asignado.',
    ],
  },
  {
    title: 'Carteles',
    shortDesc: 'Exposición de proyectos en formato póster.',
    fullDesc: 'Presentación gráfica de avances de investigación, tesis o proyectos académicos en un espacio interactivo de discusión directa con los asistentes.',
    steps: [
      'Registra tu propuesta en la modalidad de Cartel dentro del sistema.',
      'Adjunta el resumen técnico siguiendo la guía de autores.',
      'Una vez aceptado, imprime tu cartel con las dimensiones oficiales y colócalo en la mampara asignada.',
    ],
  },
  {
    title: 'Prototipos de IA',
    shortDesc: 'Demostración de prototipos e inteligencia artificial.',
    fullDesc: 'Exhibición funcional de sistemas inteligentes, modelos de aprendizaje automático, robótica y soluciones hardware/software desarrolladas por estudiantes e investigadores.',
    steps: [
      'Inscribe tu equipo y proyecto en la categoría de Prototipos de IA.',
      'Sube la ficha técnica y los requerimientos de instalación eléctrica o espacio.',
      'Presenta la demostración en vivo ante el comité evaluador durante la jornada asignada.',
    ],
  },
  {
    title: 'Ponencias',
    shortDesc: 'Sesiones temáticas por área.',
    fullDesc: 'Mesas de trabajo organizadas por eje temático donde autores comparten resultados experimentales, casos de estudio y desarrollos aplicados.',
    steps: [
      'Ingresa al portal CONING y elige el eje temático afín a tu trabajo.',
      'Carga tu documento conforme a la plantilla oficial de extensos.',
      'Tras recibir el dictamen aprobatorio, prepara tu exposición de 15 minutos más 5 de preguntas.',
    ],
  },
]

const THEMATIC_AREAS = TOPICS.map((topic, i) => ({
  title: topic,
  hue: HUES[i],
  shortDesc: `Investigación y desarrollo tecnológico en ${topic.toLowerCase()}.`,
  fullDesc: `Este eje temático reúne trabajos de investigación, desarrollo tecnológico, modelado, simulación y aplicaciones industriales vinculadas con ${topic.toLowerCase()}, promoviendo soluciones innovadoras y sustentables para los retos actuales de la ingeniería.`,
}))

const INITIAL_DOCS = [
  { id: 1, category: 'oficial', title: 'Convocatoria oficial 21° Congreso', url: '#' },
  { id: 2, category: 'oficial', title: 'Guía de autores', url: '#' },
  { id: 3, category: 'oficial', title: 'Requisitos de prototipos e IA', url: '#' },
  { id: 4, category: 'oficial', title: 'Cartelera del congreso', url: '#' },
  { id: 5, category: 'plantilla', title: 'Plantilla oficial de extensos', url: '#' },
  { id: 6, category: 'plantilla', title: 'Plantilla de videoponencia', url: '#' },
]

const INITIAL_VIDEOS = [
  { id: 1, title: 'Conferencia Magistral 2025: La IA en la Industria Moderna', img: '/images/poster.png', link: '#' },
  { id: 2, title: 'Panel de Expertos: Retos en Energías Renovables', img: '/images/banner.png', link: '#' },
  { id: 3, title: 'Avances en Robótica y Sistemas Embebidos', img: '/images/poster.png', link: '#' },
  { id: 4, title: 'Clausura y Premiación del 20° Congreso (2025)', img: '/images/banner.png', link: '#' },
  { id: 5, title: 'Taller Práctico de Manufactura Industrial', img: '/images/poster.png', link: '#' },
]

const INITIAL_HISTORICOS = [
  { id: 1, title: 'Memorias del Congreso - Edición 1', tag: 'Año 1, No. 1', img: '/images/revista1.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio1_No1/Inicio.pdf' },
  { id: 2, title: 'Memorias del Congreso - Edición 2', tag: 'Año 2, No. 2', img: '/images/revista2.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio2_No2/Inicio.pdf' },
  { id: 3, title: 'Memorias del Congreso - Edición 3', tag: 'Año 3, No. 3', img: '/images/revista3.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio3_No3/Inicio.pdf' },
  { id: 4, title: 'Memorias del Congreso - Edición 4', tag: 'Año 4, No. 4', img: '/images/revista4.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Inicio.pdf' },
  { id: 5, title: 'Memorias del Congreso - Edición 5', tag: 'Año 5, No. 5', img: '/images/revista5.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio5_No5/Inicio.pdf' },
  { id: 6, title: 'Memorias del Congreso - Edición 6', tag: 'Año 6, No. 6', img: '/images/revista6.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio6_No6/Inicio.pdf' },
  { id: 7, title: 'Memorias del Congreso - Edición 7', tag: 'Año 7, No. 7', img: '/images/revista7.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio7_No7/Inicio.pdf' },
  { id: 8, title: 'Memorias del Congreso - Edición 8', tag: 'Año 8, No. 8', img: '/images/revista8.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio8_No8/Revista_N8.pdf' },
  { id: 9, title: 'Memorias del Congreso - Edición 9', tag: 'Año 9, No. 9', img: '/images/revista9.png', link: 'https://virtual.cuautitlan.unam.mx/CongresoCiTec/Memorias_Congreso/Anio9_No9/Revista_N9.pdf' },
]

const INITIAL_SPONSORS = [
  { id: 1, name: 'ECC_2', src: '/images/ECC_2.png' },
  { id: 2, name: 'GECKO', src: '/images/GECKO.png' },
  { id: 3, name: 'PAPIME_2', src: '/images/PAPIME_2.png' },
  { id: 4, name: 'DGTIC', src: '/images/DGTIC.png' },
  { id: 5, name: 'PAPIME', src: '/images/PAPIME.png' },
  { id: 6, name: 'FES', src: '/images/FES.png' },
  { id: 7, name: 'ECC', src: '/images/ECC.png' },
]

function go(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function Cover({ topic, hue }) {
  return (
    <div className="cover" style={{ background: `linear-gradient(135deg,hsl(${hue} 70% 35%),hsl(${hue + 40} 80% 55%))` }}>
      <svg viewBox="0 0 100 60" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={15 + i * 17} cy={30 + Math.sin(i * 1.5) * 14} r={4 + i} fill="none" stroke="#fff" strokeOpacity=".6" />
        ))}
        <polyline
          fill="none"
          stroke="#fff"
          strokeOpacity=".5"
          points={[0, 1, 2, 3, 4].map((i) => `${15 + i * 17},${30 + Math.sin(i * 1.5) * 14}`).join(' ')}
        />
      </svg>
      <span>{topic}</span>
    </div>
  )
}

function formatDate(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

function formatDateRange(startDate, endDate) {
  if (!endDate || startDate === endDate) return formatDate(startDate)
  return `Del ${formatDate(startDate)} al ${formatDate(endDate)}`
}

// Sube el archivo al servidor (solo administrador) y devuelve su URL pública,
// así el contenido se conserva y se reutiliza entre congresos.
function readFileAsDataUrl(file, onSuccess, onError) {
  const body = new FormData()
  body.append('archivo', file)
  apiClient
    .post('/landing/archivos/', body, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
    .then(({ data }) => onSuccess(data.url))
    .catch((e) => onError?.(e?.response?.data?.detail || 'No se pudo subir el archivo.'))
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
    readFileAsDataUrl(
      file,
      (result) => {
        setError('')
        onChange(result)
      },
      (msg) => setError(msg)
    )
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

  const marks = {}
  for (let d = 1; d <= daysInMonth; d++) {
    const isoDay = `${year}-${String(monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEvents = events.filter((ev) => {
      const start = ev.startDate
      const end = ev.endDate || ev.startDate
      return start <= isoDay && isoDay <= end
    })
    if (dayEvents.length) {
      marks[d] = dayEvents
    }
  }

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
          const dayEvents = day ? marks[day] || [] : []
          const primaryEvent = dayEvents[0]
          return (
            <span
              key={i}
              title={dayEvents.map((e) => e.title).join(' · ')}
              className={dayEvents.length ? 'mark' : ''}
              style={primaryEvent ? { backgroundColor: primaryEvent.color, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.65)' } : undefined}
            >
              {day || ''}
              {dayEvents.length > 1 && <i className="cal-multi-dot" />}
            </span>
          )
        })}
      </div>
      <p>Cada evento resalta su rango de fechas con su color asignado.</p>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const puedeEditar = isAuthenticated && (user?.privileges ?? []).includes('diseño_pagina')
  const [open, setOpen] = useState(false)

  const handleGoToProfile = () => {
    setOpen(false)
    if (isAuthenticated) {
      navigate('/perfil')
    } else {
      navigate('/login', { state: { from: { pathname: '/perfil' } } })
    }
  }
  const [com, setCom] = useState(0)
  const [popup, setPopup] = useState(null) // Modal de conferencias magistrales
  const [infoModal, setInfoModal] = useState(null) // Modal de tipos de actividad / áreas temáticas
  const [adminOn, setAdminOn] = useState(false)
  const adminEnabled = puedeEditar && adminOn
  const [guardado, setGuardado] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#151b29')
  const [secondaryColor, setSecondaryColor] = useState('#e2c275')

  // Estado editable de Convocatoria
  const [convocatoria, setConvocatoria] = useState({
    edition: '21°',
    title: 'Congreso Científico y Tecnológico de las Carreras de Ingeniería',
    description: 'Ingeniería Mecánica Eléctrica, Industrial y Telecomunicaciones, Sistemas y Electrónica. Un encuentro para compartir investigación, proyectos y tecnología.',
    period: 'del 31 de agosto al 4 de septiembre de 2026.',
    registrationDate: 'Hasta el 15 de agosto de 2026',
    venue: 'FES Cuautitlán, Campo Cuatro — Unidad de Seminarios',
    modality: 'Presencial',
  })

  const [bannerImage, setBannerImage] = useState('/images/banner.png')
  const [posterImage, setPosterImage] = useState('/images/poster.jpeg')
  const [programImage, setProgramImage] = useState('/images/programaGeneral.png')

  // Estado de Fechas y Plazos Importantes (inicio, fin, color)
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE)
  // Fechas importantes del proceso (se crean con el congreso): vienen del servidor, no se editan aquí.
  const [fechasProceso, setFechasProceso] = useState([])
  // Archivos que se subieron al crear el congreso (convocatoria, aviso de privacidad, plantillas…): vienen del servidor.
  const [docsCongreso, setDocsCongreso] = useState([])
  const [calendarMonth, setCalendarMonth] = useState('2026-09')
  const [eventForm, setEventForm] = useState({ startDate: '', endDate: '', title: '', color: '#2563eb' })
  const [editingEventId, setEditingEventId] = useState(null)

  // Estado de Documentos Oficiales y Plantillas (PDFs)
  const [docs, setDocs] = useState(INITIAL_DOCS)
  const [docForm, setDocForm] = useState({ title: '', category: 'oficial', url: '', fileName: '' })
  const [editingDocId, setEditingDocId] = useState(null)

  // Estado de Últimas Conferencias (Videos)
  const [videos, setVideos] = useState(INITIAL_VIDEOS)
  const [videoForm, setVideoForm] = useState({ title: '', link: '', img: '/images/poster.png' })
  const [editingVideoId, setEditingVideoId] = useState(null)

  // Estado de Publicaciones (Revistas PDF)
  const [historicos, setHistoricos] = useState(INITIAL_HISTORICOS)
  const [pubForm, setPubForm] = useState({ title: '', tag: '', img: '/images/revista1.png', link: '', fileName: '' })
  const [editingPubId, setEditingPubId] = useState(null)

  // Estado de Contacto
  const [contactInfo, setContactInfo] = useState({
    institution: 'Facultad de Estudios Superiores Cuautitlán, Campo 4',
    address: 'Carretera Cuautitlán–Teoloyucan Km. 2.5',
    email: '21congresoingenierias@fes.cuautitlan.unam.mx',
    mapQuery: 'FES Cuautitlán Campo 4 UNAM',
  })

  // Estado de Patrocinadores
  const [sponsors, setSponsors] = useState(INITIAL_SPONSORS)
  const [newSponsor, setNewSponsor] = useState({ name: '', src: '' })

  // Carga el contenido guardado de la landing (si existe).
  useEffect(() => {
    apiClient.get('/landing/').then(({ data }) => {
      const c = data?.contenido || {}
      if (c.primaryColor) setPrimaryColor(c.primaryColor)
      if (c.secondaryColor) setSecondaryColor(c.secondaryColor)
      if (c.convocatoria) setConvocatoria((previo) => ({ ...previo, ...c.convocatoria }))
      if (c.bannerImage) setBannerImage(c.bannerImage)
      if (c.posterImage) setPosterImage(c.posterImage)
      if (c.programImage) setProgramImage(c.programImage)
      if (c.timeline) setTimeline(c.timeline)
      if (Array.isArray(data?.documentos_congreso)) setDocsCongreso(data.documentos_congreso)
      if (Array.isArray(data?.fechas_proceso)) {
        setFechasProceso(data.fechas_proceso)
        if (data.fechas_proceso[0]) setCalendarMonth(data.fechas_proceso[0].startDate.slice(0, 7))
      }
      if (c.docs) setDocs(c.docs)
      if (c.videos) setVideos(c.videos)
      if (c.historicos) setHistoricos(c.historicos)
      if (c.contactInfo) setContactInfo(c.contactInfo)
      if (c.sponsors) setSponsors(c.sponsors)
    }).catch(() => {})
  }, [])

  const guardarPagina = async () => {
    setGuardado('Guardando…')
    try {
      await apiClient.put('/landing/', {
        contenido: {
          primaryColor, secondaryColor, convocatoria, bannerImage, posterImage, programImage,
          timeline, docs, videos, historicos, contactInfo, sponsors,
        },
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } })
      setGuardado('Cambios guardados')
    } catch (e) {
      setGuardado(e?.response?.data?.detail || 'No se pudo guardar')
    }
  }

  const nav = (id) => {
    setOpen(false)
    go(id)
  }

  // --- Handlers de Fechas Importantes ---
  const updateEventForm = (field, value) => setEventForm((current) => ({ ...current, [field]: value }))
  const saveEvent = (event) => {
    event.preventDefault()
    const normalizedEnd = eventForm.endDate && eventForm.endDate >= eventForm.startDate
      ? eventForm.endDate
      : eventForm.startDate
    const savedEvent = {
      ...eventForm,
      endDate: normalizedEnd,
      id: editingEventId ?? Date.now(),
    }
    setTimeline((current) =>
      editingEventId
        ? current.map((item) => (item.id === editingEventId ? savedEvent : item))
        : [...current, savedEvent]
    )
    setCalendarMonth(eventForm.startDate.slice(0, 7))
    setEventForm({ startDate: '', endDate: '', title: '', color: '#2563eb' })
    setEditingEventId(null)
  }

  const editEvent = (item) => {
    setEventForm({
      startDate: item.startDate,
      endDate: item.endDate || item.startDate,
      title: item.title,
      color: item.color || '#2563eb',
    })
    setEditingEventId(item.id)
    setCalendarMonth(item.startDate.slice(0, 7))
  }

  // --- Handlers de Documentos y Plantillas (PDF) ---
  const handleDocPdfUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    readFileAsDataUrl(file, (dataUrl) => {
      setDocForm((prev) => ({ ...prev, url: dataUrl, fileName: file.name }))
    })
  }

  const saveDoc = (e) => {
    e.preventDefault()
    if (!docForm.title.trim()) return
    const payload = {
      id: editingDocId ?? Date.now(),
      title: docForm.title.trim(),
      category: docForm.category,
      url: docForm.url || '#',
    }
    setDocs((prev) =>
      editingDocId ? prev.map((d) => (d.id === editingDocId ? payload : d)) : [...prev, payload]
    )
    setDocForm({ title: '', category: 'oficial', url: '', fileName: '' })
    setEditingDocId(null)
  }

  const startEditDoc = (doc) => {
    setEditingDocId(doc.id)
    setDocForm({ title: doc.title, category: doc.category, url: doc.url, fileName: '' })
  }

  // --- Handlers de Últimas Conferencias (Videos) ---
  const handleVideoFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    readFileAsDataUrl(file, (url) => setVideoForm((prev) => ({ ...prev, link: url })))
  }

  const saveVideo = (e) => {
    e.preventDefault()
    if (!videoForm.title.trim()) return
    const payload = {
      id: editingVideoId ?? Date.now(),
      title: videoForm.title.trim(),
      link: videoForm.link.trim() || '#',
      img: videoForm.img || '/images/poster.png',
    }
    setVideos((prev) =>
      editingVideoId ? prev.map((v) => (v.id === editingVideoId ? payload : v)) : [...prev, payload]
    )
    setVideoForm({ title: '', link: '', img: '/images/poster.png' })
    setEditingVideoId(null)
  }

  const startEditVideo = (video) => {
    setEditingVideoId(video.id)
    setVideoForm({ title: video.title, link: video.link, img: video.img })
  }

  // --- Handlers de Publicaciones (Revistas PDF) ---
  const handlePubPdfUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    readFileAsDataUrl(file, (dataUrl) => {
      setPubForm((prev) => ({ ...prev, link: dataUrl, fileName: file.name }))
    })
  }

  const savePub = (e) => {
    e.preventDefault()
    if (!pubForm.title.trim()) return
    const payload = {
      id: editingPubId ?? Date.now(),
      title: pubForm.title.trim(),
      tag: pubForm.tag.trim() || 'Nueva Edición',
      img: pubForm.img || '/images/revista1.png',
      link: pubForm.link || '#',
    }
    setHistoricos((prev) =>
      editingPubId ? prev.map((h) => (h.id === editingPubId ? payload : h)) : [...prev, payload]
    )
    setPubForm({ title: '', tag: '', img: '/images/revista1.png', link: '', fileName: '' })
    setEditingPubId(null)
  }

  const startEditPub = (pub) => {
    setEditingPubId(pub.id)
    setPubForm({ title: pub.title, tag: pub.tag, img: pub.img, link: pub.link, fileName: '' })
  }

  // --- Handlers de Patrocinadores ---
  const updateSponsor = (id, updates) => {
    setSponsors((current) => current.map((sponsor) => (sponsor.id === id ? { ...sponsor, ...updates } : sponsor)))
  }

  const addSponsor = (event) => {
    event.preventDefault()
    if (!newSponsor.name.trim() || !newSponsor.src) return
    setSponsors((current) => [...current, { id: Date.now(), name: newSponsor.name.trim(), src: newSponsor.src }])
    setNewSponsor({ name: '', src: '' })
  }

  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    contactInfo.mapQuery || `${contactInfo.institution} ${contactInfo.address}`
  )}&output=embed`
  const mapExternalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    contactInfo.mapQuery || `${contactInfo.institution} ${contactInfo.address}`
  )}`

  // Los documentos reales del congreso van primero; los de ejemplo sin archivo ('#') solo los ve el administrador.
  const manuales = docs.filter((d) => adminEnabled || !docsCongreso.length || (d.url && d.url !== '#'))
  const todosDocs = [...docsCongreso, ...manuales]
  const oficialDocs = todosDocs.filter((d) => d.category === 'oficial')
  const plantillaDocs = todosDocs.filter((d) => d.category === 'plantilla')

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
              {todosDocs.map((d) => (
                <a
                  key={d.id}
                  href="#documentos"
                  onClick={(e) => {
                    e.preventDefault()
                    nav('documentos')
                  }}
                >
                  {d.title}
                </a>
              ))}
            </div>
          </div>

          {puedeEditar && (
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={adminOn}
                onChange={(event) => setAdminOn(event.target.checked)}
              />
              <span className="admin-switch" aria-hidden="true" />
              <span>Modo administrador</span>
            </label>
          )}
          {adminEnabled && (
            <div className="admin-colors">
              <label>Color principal <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
              <label>Color secundario <input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} /></label>
              <button type="button" onClick={guardarPagina}>Guardar cambios</button>
              {guardado && <span>{guardado}</span>}
            </div>
          )}
          {isAuthenticated && (
          <button
            type="button"
            onClick={handleGoToProfile}
            style={{
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              fontWeight: 600,
              marginLeft: '6px',
            }}
          >
            Mi Perfil
          </button>
          )}
          {isAuthenticated ? (
            <Link to="/" className="cta">Ir al panel</Link>
          ) : (
            <Link to="/login" className="cta">Registrarse / Iniciar sesión</Link>
          )}
        </nav>
      </header>

      {/* ========================================================
          1. CONVOCATORIA
      ======================================================== */}
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
              <span className="tag">{convocatoria.edition} Congreso · Edición en curso</span>
              <h1>{convocatoria.edition} {convocatoria.title}</h1>
              <p className="lead">{convocatoria.description}</p>
              <p className="period">Periodo de la edición: {convocatoria.period}</p>
              <ul className="facts">
                <li><small>Registro</small>{convocatoria.registrationDate}</li>
                <li><small>Sede</small>{convocatoria.venue}</li>
                <li><small>Modalidad</small>{convocatoria.modality}</li>
              </ul>
              <div className="btns">
                <button className="gold" onClick={() => window.open('https://drive.google.com/file/d/102ty8mj66WZt_9K38OAIrLCboKtBrAdU/view?usp=drive_link', '_blank', 'noopener,noreferrer')}>Ver programa →</button>
                <button className="ghost" onClick={() => nav('organizacion')}>Más información ↓</button>
              </div>

              {adminEnabled && (
                <form className="admin-form hero-admin-form" onSubmit={(e) => e.preventDefault()}>
                  <h3>Editar información de la convocatoria</h3>
                  <label>
                    Número de edición
                    <input
                      type="text"
                      value={convocatoria.edition}
                      onChange={(e) => setConvocatoria({ ...convocatoria, edition: e.target.value })}
                    />
                  </label>
                  <label className="full-width">
                    Título del congreso
                    <input
                      type="text"
                      value={convocatoria.title}
                      onChange={(e) => setConvocatoria({ ...convocatoria, title: e.target.value })}
                    />
                  </label>
                  <label className="full-width">
                    Descripción del congreso
                    <textarea
                      rows={3}
                      value={convocatoria.description}
                      onChange={(e) => setConvocatoria({ ...convocatoria, description: e.target.value })}
                    />
                  </label>
                  <label>
                    Periodo de la edición
                    <input
                      type="text"
                      value={convocatoria.period}
                      onChange={(e) => setConvocatoria({ ...convocatoria, period: e.target.value })}
                    />
                  </label>
                  <label>
                    Fecha de registro
                    <input
                      type="text"
                      value={convocatoria.registrationDate}
                      onChange={(e) => setConvocatoria({ ...convocatoria, registrationDate: e.target.value })}
                    />
                  </label>
                  <label>
                    Sede
                    <input
                      type="text"
                      value={convocatoria.venue}
                      onChange={(e) => setConvocatoria({ ...convocatoria, venue: e.target.value })}
                    />
                  </label>
                  <label>
                    Modalidad
                    <input
                      type="text"
                      value={convocatoria.modality}
                      onChange={(e) => setConvocatoria({ ...convocatoria, modality: e.target.value })}
                    />
                  </label>
                </form>
              )}
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

      {/* ========================================================
          2. FECHAS Y PLAZOS IMPORTANTES
      ======================================================== */}
      <section id="programa" className="sec">
        <div className="wrap">
          <span className="eyebrow">Fechas Importantes</span>
          <h2>Fechas y plazos importantes</h2>
          <div className="two">
            <ol className="timeline">
              {[...timeline, ...fechasProceso].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((item) => (
                <li key={item.id} style={{ '--event-color': item.color }}>
                  <div className="timeline-content">
                    <div className="timeline-date-row">
                      <span className="event-color-dot" style={{ backgroundColor: item.color }} />
                      <time>{formatDateRange(item.startDate, item.endDate)}</time>
                    </div>
                    <span>{item.title}</span>
                  </div>
                  {adminEnabled && !item.proceso && (
                    <div className="timeline-actions">
                      <button type="button" onClick={() => editEvent(item)}>Editar</button>
                      <button type="button" onClick={() => setTimeline((current) => current.filter((entry) => entry.id !== item.id))}>Eliminar</button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            <Calendar events={[...timeline, ...fechasProceso]} month={calendarMonth} onMonthChange={setCalendarMonth} />
          </div>
          {adminEnabled && (
            <form className="admin-form event-form" onSubmit={saveEvent}>
              <h3>{editingEventId === null ? 'Agregar fecha o plazo importante' : 'Editar fecha o plazo importante'}</h3>
              <label>
                Fecha inicio
                <input
                  type="date"
                  value={eventForm.startDate}
                  onChange={(event) => updateEventForm('startDate', event.target.value)}
                  required
                />
              </label>
              <label>
                Fecha fin
                <input
                  type="date"
                  min={eventForm.startDate || undefined}
                  value={eventForm.endDate}
                  onChange={(event) => updateEventForm('endDate', event.target.value)}
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
              <label>
                Color del evento
                <input
                  type="color"
                  value={eventForm.color}
                  onChange={(event) => updateEventForm('color', event.target.value)}
                />
              </label>
              <button className="admin-submit" type="submit">{editingEventId === null ? 'Agregar fecha' : 'Guardar cambios'}</button>
              {editingEventId !== null && (
                <button
                  className="admin-cancel"
                  type="button"
                  onClick={() => {
                    setEditingEventId(null)
                    setEventForm({ startDate: '', endDate: '', title: '', color: '#2563eb' })
                  }}
                >
                  Cancelar
                </button>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ========================================================
          3. PROGRAMA Y CONFERENCIAS MAGISTRALES
      ======================================================== */}
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

      {/* ========================================================
          4. ORGANIZACIÓN, TIPOS DE ACTIVIDADES, ÁREAS Y DOCUMENTOS
      ======================================================== */}
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

          {/* Apartado 1: Tipos de actividades en tarjetas clickeables */}
          <h2 className="sub">Tipos de actividades</h2>
          <div className="mini">
            {ACTIVITY_TYPES.map((act) => (
              <button
                type="button"
                key={act.title}
                className="info-card-btn"
                onClick={() => setInfoModal({ type: 'activity', item: act })}
              >
                <h3>{act.title}</h3>
                <p>{act.shortDesc}</p>
                <em>Ver descripción y registro ↗</em>
              </button>
            ))}
          </div>

          {/* Apartado 2: Áreas temáticas en tarjetas clickeables */}
          <h2 className="sub">Áreas temáticas</h2>
          <div className="areas-grid">
            {THEMATIC_AREAS.map((area) => (
              <button
                type="button"
                key={area.title}
                className="area-card-btn"
                onClick={() => setInfoModal({ type: 'area', item: area })}
              >
                <span className="area-dot" style={{ background: `hsl(${area.hue} 70% 45%)` }} />
                <div>
                  <h3>{area.title}</h3>
                  <p>{area.shortDesc}</p>
                </div>
                <em>Ver descripción ↗</em>
              </button>
            ))}
          </div>
        </div>

        {/* Guías y documentos oficiales separados + CRUD PDF en Modo Admin */}
        <div id="documentos" className="docs">
          <div className="wrap">
            <span className="eyebrow gold">Guías y accesos oficiales</span>
            <h2>Documentos y plantillas del congreso</h2>

            <h3 className="docs-subtitle">Documentos oficiales</h3>
            <div className="dgrid">
              {oficialDocs.map((d) => (
                <div key={d.id} className="doc-item-wrapper">
                  <a
                    href={d.url}
                    target={d.url !== '#' ? '_blank' : undefined}
                    rel="noreferrer"
                    download={d.url.startsWith('data:') ? `${d.title}.pdf` : undefined}
                    onClick={(e) => {
                      if (d.url === '#') e.preventDefault()
                    }}
                  >
                    <span>📄</span>{d.title}<b>→</b>
                  </a>
                  {adminEnabled && !d.proceso && (
                    <div className="doc-admin-actions">
                      <button type="button" onClick={() => startEditDoc(d)}>Editar</button>
                      <button type="button" onClick={() => setDocs((prev) => prev.filter((item) => item.id !== d.id))}>Borrar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h3 className="docs-subtitle" style={{ marginTop: '36px' }}>Plantillas</h3>
            <div className="dgrid">
              {plantillaDocs.map((d) => (
                <div key={d.id} className="doc-item-wrapper">
                  <a
                    href={d.url}
                    target={d.url !== '#' ? '_blank' : undefined}
                    rel="noreferrer"
                    download={d.url.startsWith('data:') ? `${d.title}.pdf` : undefined}
                    onClick={(e) => {
                      if (d.url === '#') e.preventDefault()
                    }}
                  >
                    <span>📑</span>{d.title}<b>→</b>
                  </a>
                  {adminEnabled && !d.proceso && (
                    <div className="doc-admin-actions">
                      <button type="button" onClick={() => startEditDoc(d)}>Editar</button>
                      <button type="button" onClick={() => setDocs((prev) => prev.filter((item) => item.id !== d.id))}>Borrar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {adminEnabled && (
              <form className="admin-form docs-admin-form" onSubmit={saveDoc}>
                <h3>{editingDocId === null ? 'Subir documento o plantilla (PDF)' : 'Editar documento o plantilla'}</h3>
                <label>
                  Título del documento
                  <input
                    type="text"
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    placeholder="Ej. Convocatoria oficial"
                    required
                  />
                </label>
                <label>
                  Apartado
                  <select
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  >
                    <option value="oficial">Documentos oficiales</option>
                    <option value="plantilla">Plantillas</option>
                  </select>
                </label>
                <label>
                  Archivo PDF {docForm.fileName ? `(${docForm.fileName})` : ''}
                  <input type="file" accept="application/pdf" onChange={handleDocPdfUpload} />
                </label>
                <button className="admin-submit" type="submit">
                  {editingDocId === null ? 'Subir documento' : 'Guardar cambios'}
                </button>
                {editingDocId !== null && (
                  <button
                    className="admin-cancel"
                    type="button"
                    onClick={() => {
                      setEditingDocId(null)
                      setDocForm({ title: '', category: 'oficial', url: '', fileName: '' })
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          5. ÚLTIMAS CONFERENCIAS (VIDEOS) + CRUD MODO ADMIN
      ======================================================== */}
      <section id="videos" className="sec alt">
        <div className="wrap">
          <span className="eyebrow">Multimedia</span>
          <h2>Últimas Conferencias</h2>
          <div className="video-carousel">
            {videos.map((v) => (
              <div key={v.id} className="video-card-wrapper">
                <a
                  href={v.link}
                  target={v.link !== '#' ? '_blank' : undefined}
                  rel="noreferrer"
                  className="video-card"
                  onClick={(e) => {
                    if (v.link === '#') e.preventDefault()
                  }}
                >
                  <div className="video-thumb">
                    <img src={v.img} alt={v.title} loading="lazy" />
                    <div className="play-btn">▶</div>
                  </div>
                  <h3>{v.title}</h3>
                </a>
                {adminEnabled && (
                  <div className="card-admin-actions">
                    <button type="button" onClick={() => startEditVideo(v)}>Editar</button>
                    <button type="button" onClick={() => setVideos((prev) => prev.filter((item) => item.id !== v.id))}>Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {adminEnabled && (
            <form className="admin-form" style={{ marginTop: '24px' }} onSubmit={saveVideo}>
              <h3>{editingVideoId === null ? 'Subir video de conferencia' : 'Editar video de conferencia'}</h3>
              <label>
                Título del video
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  placeholder="Título de la conferencia"
                  required
                />
              </label>
              <label>
                Enlace del video (URL)
                <input
                  type="text"
                  value={videoForm.link}
                  onChange={(e) => setVideoForm({ ...videoForm, link: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </label>
              <label>
                O subir archivo de video
                <input type="file" accept="video/*" onChange={handleVideoFileUpload} />
              </label>
              <div>
                <span className="field-label-small">Miniatura</span>
                <ImagePicker
                  src={videoForm.img}
                  alt="Vista previa video"
                  label="Cambiar miniatura"
                  enabled
                  className="mini-picker"
                  onChange={(img) => setVideoForm({ ...videoForm, img })}
                />
              </div>
              <button className="admin-submit" type="submit">
                {editingVideoId === null ? 'Agregar video' : 'Guardar cambios'}
              </button>
              {editingVideoId !== null && (
                <button
                  className="admin-cancel"
                  type="button"
                  onClick={() => {
                    setEditingVideoId(null)
                    setVideoForm({ title: '', link: '', img: '/images/poster.png' })
                  }}
                >
                  Cancelar
                </button>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ========================================================
          6. PUBLICACIONES (REVISTAS PDF) + CRUD MODO ADMIN
      ======================================================== */}
      <section id="historicos" className="sec">
        <div className="wrap">
          <span className="eyebrow">Repositorio Histórico</span>
          <h2>Publicaciones</h2>
          <div className="history-grid">
            {historicos.map((h) => (
              <div key={h.id} className="history-card-wrapper">
                <a
                  href={h.link}
                  target={h.link !== '#' ? '_blank' : undefined}
                  rel="noreferrer"
                  download={h.link.startsWith('data:') ? `${h.title}.pdf` : undefined}
                  className="history-card"
                  onClick={(e) => {
                    if (h.link === '#') e.preventDefault()
                  }}
                >
                  <img src={h.img} alt={h.title} className="history-cover" loading="lazy" />
                  <span className="tag">{h.tag}</span>
                  <h3>{h.title}</h3>
                  <span className="action">Leer revista ↗</span>
                </a>
                {adminEnabled && (
                  <div className="card-admin-actions">
                    <button type="button" onClick={() => startEditPub(h)}>Editar</button>
                    <button type="button" onClick={() => setHistoricos((prev) => prev.filter((item) => item.id !== h.id))}>Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {adminEnabled && (
            <form className="admin-form" style={{ marginTop: '28px' }} onSubmit={savePub}>
              <h3>{editingPubId === null ? 'Subir revista / publicación (PDF)' : 'Editar revista / publicación'}</h3>
              <label>
                Título de la publicación
                <input
                  type="text"
                  value={pubForm.title}
                  onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })}
                  placeholder="Memorias del Congreso - Edición 10"
                  required
                />
              </label>
              <label>
                Etiqueta / Edición
                <input
                  type="text"
                  value={pubForm.tag}
                  onChange={(e) => setPubForm({ ...pubForm, tag: e.target.value })}
                  placeholder="Año 10, No. 10"
                  required
                />
              </label>
              <label>
                Archivo PDF de la revista {pubForm.fileName ? `(${pubForm.fileName})` : ''}
                <input type="file" accept="application/pdf" onChange={handlePubPdfUpload} />
              </label>
              <div>
                <span className="field-label-small">Portada</span>
                <ImagePicker
                  src={pubForm.img}
                  alt="Vista previa portada"
                  label="Cambiar portada"
                  enabled
                  className="mini-picker"
                  onChange={(img) => setPubForm({ ...pubForm, img })}
                />
              </div>
              <button className="admin-submit" type="submit">
                {editingPubId === null ? 'Subir publicación' : 'Guardar cambios'}
              </button>
              {editingPubId !== null && (
                <button
                  className="admin-cancel"
                  type="button"
                  onClick={() => {
                    setEditingPubId(null)
                    setPubForm({ title: '', tag: '', img: '/images/revista1.png', link: '', fileName: '' })
                  }}
                >
                  Cancelar
                </button>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ========================================================
          7. CONTACTO EDITABLE
      ======================================================== */}
      <section id="contacto" className="sec contact alt">
        <div className="wrap two">
          <div>
            <span className="eyebrow">Contacto</span>
            <h2>Ubicación de la sede</h2>
            <div className="box">
              {contactInfo.institution}
              <br />
              {contactInfo.address}
            </div>
            <a className="box mail" href={`mailto:${contactInfo.email}`}>
              ✉ {contactInfo.email}
            </a>
            <a className="gold btn" href={mapExternalUrl} target="_blank" rel="noreferrer">
              Abrir en Maps
            </a>

            {adminEnabled && (
              <form className="admin-form" style={{ marginTop: '24px' }} onSubmit={(e) => e.preventDefault()}>
                <h3>Editar información de contacto</h3>
                <label className="full-width">
                  Sede / Institución
                  <input
                    type="text"
                    value={contactInfo.institution}
                    onChange={(e) => setContactInfo({ ...contactInfo, institution: e.target.value })}
                  />
                </label>
                <label className="full-width">
                  Dirección
                  <input
                    type="text"
                    value={contactInfo.address}
                    onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                  />
                </label>
                <label className="full-width">
                  Correo electrónico del congreso
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  />
                </label>
                <label className="full-width">
                  Búsqueda para el mapa (Google Maps)
                  <input
                    type="text"
                    value={contactInfo.mapQuery}
                    onChange={(e) => setContactInfo({ ...contactInfo, mapQuery: e.target.value })}
                    placeholder="Ej. FES Cuautitlán Campo 4 UNAM"
                  />
                </label>
              </form>
            )}
          </div>
          <iframe title="Mapa Sede Congreso" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      </section>

      {/* ========================================================
          8. PATROCINADORES
      ======================================================== */}
      <section id="patrocinadores" className="sec">
        <div className="wrap">
          <span className="eyebrow">Patrocinadores</span>
          <h2>Quienes hacen posible el congreso</h2>
        </div>
        <div className="marquee">
          <div className="track">
            {[...sponsors, ...sponsors].map((sponsor, index) => (
              <div className="sponsor-slide" key={`${sponsor.id}-${index}`} aria-hidden={index >= sponsors.length}>
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
              {sponsors.map((sponsor) => (
                <article className="sponsor-admin-card" key={sponsor.id}>
                  <ImagePicker
                    src={sponsor.src}
                    alt={`Logotipo de ${sponsor.name}`}
                    label="Cambiar imagen"
                    enabled
                    className="sponsor-image"
                    onChange={(src) => updateSponsor(sponsor.id, { src })}
                  />
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={sponsor.name}
                      onChange={(event) => updateSponsor(sponsor.id, { name: event.target.value })}
                    />
                  </label>
                  <button
                    className="admin-delete"
                    type="button"
                    onClick={() => setSponsors((current) => current.filter((item) => item.id !== sponsor.id))}
                  >
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

      {/* Modal 1: Conferencias Magistrales */}
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

      {/* Modal 2: Tipos de Actividades (con pasos de registro) y Áreas Temáticas (solo descripción) */}
      {infoModal && (
        <div className="modal-overlay" onClick={() => setInfoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setInfoModal(null)}>✕</button>
            {infoModal.type === 'area' && <Cover topic={infoModal.item.title} hue={infoModal.item.hue} />}
            <div className="modal-body">
              <span className="eyebrow">
                {infoModal.type === 'activity' ? 'Tipo de actividad' : 'Área temática'}
              </span>
              <h2 style={{ marginTop: '6px' }}>{infoModal.item.title}</h2>
              <p className="modal-desc">{infoModal.item.fullDesc}</p>

              {infoModal.type === 'activity' && infoModal.item.steps && (
                <div className="modal-steps">
                  <h4>Pasos para registrarse</h4>
                  <ol>
                    {infoModal.item.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}