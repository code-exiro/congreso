import { useState } from 'react'
import { Link } from 'react-router-dom'
import './landing.css'

const NAV = [
  ['convocatoria', 'Convocatoria'],
  ['programa', 'Programa'],
  ['actividades', 'Actividades'],
  ['organizacion', 'Organización'],
  ['videos', 'Videos'],
  ['historicos', 'Históricos'],
  ['contacto', 'Contacto'],
  ['patrocinadores', 'Patrocinadores'],
]

const TIMELINE = [
  ['31 ago 2026', 'Inauguración del congreso'],
  ['31 ago 2026', 'Recepción de resúmenes, carteles y/o talleres'],
  ['10 sep 2026', 'Evaluación de los resúmenes'],
  ['15 sep 2026', 'Cierre de recepción de solicitudes'],
  ['22 sep 2026', 'Resultados de evaluaciones'],
  ['1 sep 2026', 'Inicio de ponencias'],
  ['4 sep 2026', 'Cierre del congreso'],
]

const TOPICS = ['Energías renovables', 'Inteligencia artificial', 'Telecomunicaciones', 'Electrónica de potencia', 'Manufactura industrial', 'Redes eléctricas', 'Robótica', 'Sustentabilidad', 'Automatización', 'Sistemas embebidos']
const HUES = [150, 200, 260, 30, 170, 220, 340, 120, 190, 280]
const NAMES = ['Dr. Víctor Hugo Hernández Gómez', 'Dra. Laura Mendoza Ríos', 'M. en I. Carlos Pérez Luna', 'Dr. Alejandro Torres Vega', 'Dra. Marisol Ortega Cruz', 'M. en C. Jorge Salinas Ruiz', 'Dr. Ricardo Beltrán Soto', 'Dra. Patricia Núñez Arce', 'M. en I. Héctor Domínguez P.', 'Dr. Fernando Aguilar Mora']
const DAYS = ['31 ago', '1 sep', '2 sep', '3 sep', '4 sep']

const KEYNOTES = TOPICS.map((t, i) => ({
  t: `${t}: retos y perspectivas`, topic: t, hue: HUES[i],
  director: NAMES[i], speakers: [NAMES[(i + 3) % 10], NAMES[(i + 6) % 10]],
  date: `${DAYS[i % 5]} 2026`, time: `${10 + (i % 4)}:00 h`,
}))

const ORALS = TOPICS.slice(0, 8).map((t, i) => ({
  t: `Avances en ${t.toLowerCase()} aplicados a la ingeniería`, topic: t, hue: HUES[(i + 4) % 10],
  speakers: [NAMES[(i + 1) % 10]], parts: [NAMES[(i + 4) % 10], NAMES[(i + 8) % 10]],
  date: `${DAYS[(i + 1) % 5]} 2026`, time: `${9 + (i % 6)}:30 h`,
}))
const PLACE = 'Auditorio Jaime Torres Keller'

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

const REQS = [
  ['Resumen', 'Enviar resumen en la plantilla oficial dentro del plazo.'],
  ['Registro', 'Completar el registro individual del participante.'],
  ['Evaluación', 'Los trabajos son evaluados por el comité científico.'],
  ['Entrega final', 'Subir extenso o material final tras la aceptación.'],
  ['Constancias', 'Se liberan según participación y requisitos cumplidos.'],
  ['Pago', 'Cuotas vigentes por modalidad y pago individual.'],
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

const PATROCINADORES = [0, 1, 2, 3, 0, 1, 2, 3]; 

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

function Calendar() {
  const first = 1 
  const marks = { 1: 'Inicio de ponencias', 4: 'Cierre', 10: 'Evaluación', 15: 'Cierre solicitudes', 22: 'Resultados' }
  const cells = [...Array(first).fill(0), ...Array.from({ length: 30 }, (_, i) => i + 1)]
  return (
    <div className="cal">
      <h4>Septiembre 2026</h4>
      <div className="calgrid">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <b key={i}>{d}</b>)}
        {cells.map((d, i) => <span key={i} title={marks[d]} className={marks[d] ? 'mark' : d >= 1 && d <= 4 ? 'range' : ''}>{d || ''}</span>)}
      </div>
      <p>Del 31 de agosto al 4 de septiembre: semana del congreso.</p>
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [com, setCom] = useState(0)
  const nav = (id) => { setOpen(false); go(id) }

  return (
    <>
      <header className="hdr">
        
        <button className="logo" onClick={() => nav('convocatoria')}>
          <img src="/images/logo_congreso.jpeg" alt="Logo CONING" className="crest-img" />
          <span><b>CONING</b><small>Sistema del Congreso de Ingenierías</small></span>
        </button>
        <button className="burger" aria-label="Menú" onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? 'open' : ''}>
          {NAV.map(([id, l]) => <button key={id} onClick={() => nav(id)}>{l}</button>)}
          <Link to="/login" className="cta">Registrarse / Iniciar sesión</Link>
        </nav>
      </header>

      <section id="convocatoria" className="hero">
        <div className="wrap">
          <img className="banner" src="/images/banner.png" alt="Banner del Congreso" />
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
                <button className="gold" onClick={() => nav('programa')}>Ver programa →</button>
                <button className="ghost" onClick={() => nav('organizacion')}>Más información ↓</button>
              </div>
            </div>
            <figure className="poster">
              <img src="/images/poster.jpeg" alt="Poster convocatoria" />
              <a className="gold dl" href="/images/poster.jpeg" download>Descargar póster (JPG)</a>
            </figure>
          </div>
        </div>
      </section>

      <section id="programa" className="sec">
        <div className="wrap">
          <span className="eyebrow">Programa</span>
          <h2>Fechas y plazos importantes</h2>
          <div className="two">
            <ol className="timeline">
              {TIMELINE.map(([d, t], i) => <li key={i}><time>{d}</time><span>{t}</span></li>)}
            </ol>
            <Calendar />
          </div>
        </div>
      </section>

      <section id="actividades" className="sec alt">
        <div className="wrap">
          <span className="eyebrow">Actividades</span>
          <h2>Conferencias magistrales</h2>
          <div className="cards">
            {KEYNOTES.map((k) => (
              <article className="card" key={k.t}>
                <Cover topic={k.topic} hue={k.hue} />
                <div className="body">
                  <h3>{k.t}</h3>
                  <p><b>Director:</b> {k.director}</p>
                  <p><b>Ponentes:</b> {k.speakers.join(', ')}</p>
                  <p className="meta">{PLACE} · {k.date} · {k.time}</p>
                </div>
              </article>
            ))}
          </div>
          <h2 className="sub">Ponencias orales</h2>
          <div className="cards">
            {ORALS.map((k) => (
              <article className="card" key={k.t}>
                <Cover topic={k.topic} hue={k.hue} />
                <div className="body">
                  <h3>{k.t}</h3>
                  <p><b>Ponentes:</b> {k.speakers.join(', ')}</p>
                  <p><b>Participantes:</b> {k.parts.join(', ')}</p>
                  <p className="meta">{PLACE} · {k.date} · {k.time}</p>
                </div>
              </article>
            ))}
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
        <div className="docs">
          <div className="wrap">
            <span className="eyebrow gold">Guías y accesos oficiales</span>
            <h2>Documentos del congreso</h2>
            <div className="dgrid">
              {DOCS.map((d) => <a key={d} href="#organizacion" onClick={(e) => e.preventDefault()}><span>📄</span>{d}<b>→</b></a>)}
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
          <h2>Memorias del Congreso</h2>
          <div className="history-grid">
            {HISTORICOS.map((h, i) => (
              <a key={i} href={h.link} target="_blank" rel="noreferrer" className="history-card">
                {/* Etiqueta HTML img para cargar las portadas de revista1.jpg hasta revista9.jpg */}
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
            {PATROCINADORES.map((val, i) => (
              <img key={i} src="/images/patrocinadores.png" alt="Logos de patrocinadores" aria-hidden={i > 3} />
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap fgrid">
          <div><small>Desarrollado por:</small><p>Laboratorio de Energías Renovables</p></div>
          <div><small>Mantenimiento realizado por:</small><p>Gecko Systems</p></div>
          <p className="legal">Esta página puede ser reproducida con fines no lucrativos... © 2026 Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  )
}