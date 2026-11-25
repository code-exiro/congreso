import { useState, useEffect } from 'react';
import './registrarcongreso.css';

export default function registrarcongreso() {
  // 1. Campos de la tabla [Congreso]
  const [congreso, setCongreso] = useState({
    nombre_congreso: 'CONING',
    edicion_congreso: '',
    modalidad_congreso: 'Híbrida',
    ubicacion_sede: 'FES Cuautitlán, UNAM',
    issn: '',
    url_revista: '',
    contacto_correo: '',
    contacto_telefono: '',
    correo_congreso: '',
    contraseña_aplicacion: '',
  });

  // Archivos de la tabla [Congreso]
  const [archivosCongreso, setArchivosCongreso] = useState({
    convocatoria: null,
    aviso_privacidad: null,
    plantilla_extenso: null,
    plantilla_constancia: null,
    qr_congreso: null,
  });

  // 2. Campos de la tabla [Pagina] (Identidad visual de la Landing y Auth)
  const [colorBanner, setColorBanner] = useState('#002B49');
  const [archivosPagina, setArchivosPagina] = useState({
    banner: null,
    cartel: null,
    logo_congreso: null,
    logo_departamento: null,
    programa: null,
    imagen_login: null,
    imagen_contraseña: null,
    imagen_crearCuenta: null,
  });

  // Vista previa local para el banner y logo
  const [previewBanner, setPreviewBanner] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // 3. Catálogos desde el backend (con valores iniciales de respaldo)
  const [catFechas, setCatFechas] = useState([
    { id_fechas: 1, nombre_fecha: 'Recepción de resúmenes' },
    { id_fechas: 2, nombre_fecha: 'Entrega de extenso' },
    { id_fechas: 3, nombre_fecha: 'Realización del congreso' },
  ]);
  const [catActividades, setCatActividades] = useState([
    { id_actividad: 1, nombre_actividad: 'Ponencia oral' },
    { id_actividad: 2, nombre_actividad: 'Cartel científico' },
    { id_actividad: 3, nombre_actividad: 'Taller' },
    { id_actividad: 4, nombre_actividad: 'Conferencia magistral' },
  ]);
  const [catCuotas, setCatCuotas] = useState([
    { id_cuota: 1, concepto_cuota: 'Ponente académico / investigador' },
    { id_cuota: 2, concepto_cuota: 'Estudiante con credencial vigente' },
    { id_cuota: 3, concepto_cuota: 'Asistente general' },
  ]);
  const [catPatrocinadores, setCatPatrocinadores] = useState([
    { id_patrocinador: 1, nombre_patrocinador: 'FES Cuautitlán - UNAM' },
    { id_patrocinador: 2, nombre_patrocinador: 'Proyecto PAPIME' },
    { id_patrocinador: 3, nombre_patrocinador: 'Proyecto PIAMINE' },
  ]);

  // 4. Relaciones N:M ([CongresoFechas], [CongresoActividad], [CongresoCuota], [CongresoPatrocinador])
  const [fechasAsignadas, setFechasAsignadas] = useState([
    { id_fecha: 1, fecha_inicio: '', fecha_fin: '' },
  ]);
  const [actividadesActivas, setActividadesActivas] = useState([1, 4]);
  const [cuotasAsignadas, setCuotasAsignadas] = useState([
    { id_Cuota: 1, importe: '' },
  ]);
  const [patrocinadoresActivos, setPatrocinadoresActivos] = useState([1]);

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Cargar catálogos reales si el backend está activo
  useEffect(() => {
    fetch('http://localhost:8000/api/catalogos-congreso/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.fechas) setCatFechas(data.fechas);
        if (data.actividades) setCatActividades(data.actividades);
        if (data.cuotas) setCatCuotas(data.cuotas);
        if (data.patrocinadores) setCatPatrocinadores(data.patrocinadores);
      })
      .catch(() => {
        // Mantiene los catálogos locales de respaldo si aún no se levanta el endpoint
      });
  }, []);

  const handleCongresoChange = (e) => {
    const { name, value } = e.target;
    setCongreso((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileCongreso = (e) => {
    const { name, files } = e.target;
    setArchivosCongreso((prev) => ({ ...prev, [name]: files[0] || null }));
  };

  const handleFilePagina = (e) => {
    const { name, files } = e.target;
    const file = files[0] || null;
    setArchivosPagina((prev) => ({ ...prev, [name]: file }));

    if (name === 'banner' && file) {
      setPreviewBanner(URL.createObjectURL(file));
    }
    if (name === 'logo_congreso' && file) {
      setPreviewLogo(URL.createObjectURL(file));
    }
  };

  // Manejadores para [CongresoFechas]
  const agregarFecha = () => {
    setFechasAsignadas((prev) => [
      ...prev,
      { id_fecha: catFechas[0]?.id_fechas || 1, fecha_inicio: '', fecha_fin: '' },
    ]);
  };

  const actualizarFecha = (index, campo, valor) => {
    setFechasAsignadas((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  const eliminarFecha = (index) => {
    setFechasAsignadas((prev) => prev.filter((_, i) => i !== index));
  };

  // Manejadores para [CongresoCuota]
  const agregarCuota = () => {
    setCuotasAsignadas((prev) => [
      ...prev,
      { id_Cuota: catCuotas[0]?.id_cuota || 1, importe: '' },
    ]);
  };

  const actualizarCuota = (index, campo, valor) => {
    setCuotasAsignadas((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  const eliminarCuota = (index) => {
    setCuotasAsignadas((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggles para [CongresoActividad] y [CongresoPatrocinador]
  const toggleSeleccion = (id, lista, setLista) => {
    setLista((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const formData = new FormData();

      // Datos escalares de [Congreso]
      Object.entries(congreso).forEach(([key, val]) => {
        if (val !== '') formData.append(key, val);
      });

      // Archivos de [Congreso]
      Object.entries(archivosCongreso).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });

      // Datos y archivos de [Pagina]
      formData.append('color_banner', colorBanner);
      Object.entries(archivosPagina).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });

      // Relaciones N:M serializadas en JSON
      formData.append(
        'fechas',
        JSON.stringify(fechasAsignadas.filter((f) => f.fecha_inicio && f.fecha_fin))
      );
      formData.append(
        'actividades',
        JSON.stringify(
          catActividades.map((act) => ({
            id_actividad: act.id_actividad,
            activo: actividadesActivas.includes(act.id_actividad),
          }))
        )
      );
      formData.append(
        'cuotas',
        JSON.stringify(cuotasAsignadas.filter((c) => c.importe !== ''))
      );
      formData.append('patrocinadores', JSON.stringify(patrocinadoresActivos));

      const response = await fetch('http://localhost:8000/api/congresos/crear/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'No se pudo registrar la edición del congreso.');
      }

      setMensaje({
        tipo: 'exito',
        texto: `¡${congreso.nombre_congreso} (Edición ${congreso.edicion_congreso}) registrado y publicado correctamente!`,
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rc-wrapper">
      {/* Barra superior institucional */}
      <header className="rc-topbar">
        <div className="rc-topbar-inner">
          <div className="rc-brand">
            <span className="rc-brand-badge">UNAM · FESC</span>
            <strong>Panel de Administración</strong>
          </div>
          <a href="/" className="rc-back-link">
            ← Volver a la Landing Page
          </a>
        </div>
      </header>

      <main className="rc-container">
        {/* Encabezado de sección */}
        <div className="rc-header">
          <span className="rc-eyebrow">Configuración de Edición</span>
          <h1>Registrar Nuevo Congreso</h1>
          <p>
            Parametriza los datos institucionales, documentos oficiales y la identidad visual
            que alimentarán automáticamente la página principal.
          </p>
        </div>

        {/* Vista previa en vivo del encabezado de la Landing Page */}
        <section
          className="rc-live-preview"
          style={{
            backgroundColor: colorBanner,
            backgroundImage: previewBanner
              ? `linear-gradient(rgba(0, 29, 51, 0.72), rgba(0, 29, 51, 0.72)), url(${previewBanner})`
              : 'none',
          }}
        >
          <div className="rc-preview-content">
            <span className="rc-preview-tag">Vista previa de portada · {congreso.modalidad_congreso}</span>
            <div className="rc-preview-title-row">
              {previewLogo && (
                <img src={previewLogo} alt="Logo Congreso" className="rc-preview-logo" />
              )}
              <div>
                <h2>
                  {congreso.nombre_congreso || 'CONING'}{' '}
                  {congreso.edicion_congreso ? `· Edición ${congreso.edicion_congreso}` : ''}
                </h2>
                <p>📍 {congreso.ubicacion_sede || 'Sede por definir'}</p>
              </div>
            </div>
          </div>
        </section>

        {mensaje.texto && (
          <div className={`rc-alert ${mensaje.tipo === 'exito' ? 'rc-alert-ok' : 'rc-alert-err'}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rc-form">
          {/* SECCIÓN 1: DATOS GENERALES (Tabla Congreso) */}
          <section className="rc-card">
            <div className="rc-card-head">
              <span className="rc-step">01</span>
              <div>
                <h3>Información General y Contacto</h3>
                <p>Datos base de la edición y canales de atención pública.</p>
              </div>
            </div>

            <div className="rc-grid-3">
              <div className="rc-field">
                <label>Nombre del Congreso *</label>
                <input
                  type="text"
                  name="nombre_congreso"
                  value={congreso.nombre_congreso}
                  onChange={handleCongresoChange}
                  placeholder="Ej. CONING"
                  required
                />
              </div>

              <div className="rc-field">
                <label>Número de Edición *</label>
                <input
                  type="number"
                  name="edicion_congreso"
                  value={congreso.edicion_congreso}
                  onChange={handleCongresoChange}
                  placeholder="Ej. 23"
                  min="1"
                  required
                />
              </div>

              <div className="rc-field">
                <label>Modalidad *</label>
                <select
                  name="modalidad_congreso"
                  value={congreso.modalidad_congreso}
                  onChange={handleCongresoChange}
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Híbrida">Híbrida</option>
                </select>
              </div>
            </div>

            <div className="rc-grid-2">
              <div className="rc-field">
                <label>Ubicación / Sede *</label>
                <input
                  type="text"
                  name="ubicacion_sede"
                  value={congreso.ubicacion_sede}
                  onChange={handleCongresoChange}
                  placeholder="Ej. Auditorio Jaime Torres Keller, FES Cuautitlán"
                  required
                />
              </div>

              <div className="rc-field">
                <label>ISSN de Publicación</label>
                <input
                  type="text"
                  name="issn"
                  value={congreso.issn}
                  onChange={handleCongresoChange}
                  placeholder="Ej. 2448-XXXX"
                />
              </div>
            </div>

            <div className="rc-grid-3">
              <div className="rc-field">
                <label>Correo de Contacto Público *</label>
                <input
                  type="email"
                  name="contacto_correo"
                  value={congreso.contacto_correo}
                  onChange={handleCongresoChange}
                  placeholder="contacto@coning.unam.mx"
                  required
                />
              </div>

              <div className="rc-field">
                <label>Teléfono de Contacto *</label>
                <input
                  type="tel"
                  name="contacto_telefono"
                  value={congreso.contacto_telefono}
                  onChange={handleCongresoChange}
                  placeholder="55 5623 XXXX"
                  required
                />
              </div>

              <div className="rc-field">
                <label>URL de la Revista (Opcional)</label>
                <input
                  type="url"
                  name="url_revista"
                  value={congreso.url_revista}
                  onChange={handleCongresoChange}
                  placeholder="https://revista.unam.mx/..."
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: CORREO AUTOMATIZADO SMTP (Tabla Congreso) */}
          <section className="rc-card">
            <div className="rc-card-head">
              <span className="rc-step">02</span>
              <div>
                <h3>Servidor de Notificaciones (SMTP)</h3>
                <p>Credenciales para el envío automático de dictámenes, acuses y constancias.</p>
              </div>
            </div>

            <div className="rc-grid-2">
              <div className="rc-field">
                <label>Correo Oficial del Congreso *</label>
                <input
                  type="email"
                  name="correo_congreso"
                  value={congreso.correo_congreso}
                  onChange={handleCongresoChange}
                  placeholder="notificaciones.coning@gmail.com"
                  required
                />
              </div>

              <div className="rc-field">
                <label>Contraseña de Aplicación *</label>
                <div className="rc-pass-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="contraseña_aplicacion"
                    value={congreso.contraseña_aplicacion}
                    onChange={handleCongresoChange}
                    placeholder="••••••••••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="rc-btn-ghost"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: DOCUMENTOS Y PLANTILLAS OFICIALES (Tabla Congreso) */}
          <section className="rc-card">
            <div className="rc-card-head">
              <span className="rc-step">03</span>
              <div>
                <h3>Documentos Oficiales y Plantillas</h3>
                <p>Archivos descargables desde la landing page y plantillas base para autores.</p>
              </div>
            </div>

            <div className="rc-grid-3">
              <div className="rc-file-box">
                <label>Convocatoria Oficial (PDF/JPG) *</label>
                <input
                  type="file"
                  name="convocatoria"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileCongreso}
                  required
                />
              </div>

              <div className="rc-file-box">
                <label>Aviso de Privacidad (PDF) *</label>
                <input
                  type="file"
                  name="aviso_privacidad"
                  accept=".pdf"
                  onChange={handleFileCongreso}
                  required
                />
              </div>

              <div className="rc-file-box">
                <label>Plantilla de Extenso (.DOC / .DOCX) *</label>
                <input
                  type="file"
                  name="plantilla_extenso"
                  accept=".doc,.docx"
                  onChange={handleFileCongreso}
                  required
                />
              </div>

              <div className="rc-file-box">
                <label>Plantilla de Constancia *</label>
                <input
                  type="file"
                  name="plantilla_constancia"
                  accept=".pdf,.doc,.docx,.png"
                  onChange={handleFileCongreso}
                  required
                />
              </div>

              <div className="rc-file-box">
                <label>Código QR del Congreso (Opcional)</label>
                <input
                  type="file"
                  name="qr_congreso"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleFileCongreso}
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: IDENTIDAD VISUAL Y MARCA BLANCA (Tabla Pagina) */}
          <section className="rc-card">
            <div className="rc-card-head">
              <span className="rc-step">04</span>
              <div>
                <h3>Identidad Visual de la Landing Page</h3>
                <p>Parametrización gráfica de la edición (Tabla Página).</p>
              </div>
            </div>

            <div className="rc-color-row">
              <div className="rc-field">
                <label>Color Institucional del Banner (HEX / RGB)</label>
                <div className="rc-color-picker">
                  <input
                    type="color"
                    value={colorBanner}
                    onChange={(e) => setColorBanner(e.target.value)}
                  />
                  <input
                    type="text"
                    value={colorBanner}
                    onChange={(e) => setColorBanner(e.target.value)}
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <div className="rc-grid-4">
              <div className="rc-file-box">
                <label>Banner Principal (JPG/PNG)</label>
                <input type="file" name="banner" accept="image/*" onChange={handleFilePagina} />
              </div>

              <div className="rc-file-box">
                <label>Cartel Promocional (JPG/PNG)</label>
                <input type="file" name="cartel" accept="image/*" onChange={handleFilePagina} />
              </div>

              <div className="rc-file-box">
                <label>Logo del Congreso (JPG/PNG)</label>
                <input type="file" name="logo_congreso" accept="image/*" onChange={handleFilePagina} />
              </div>

              <div className="rc-file-box">
                <label>Logo del Departamento</label>
                <input
                  type="file"
                  name="logo_departamento"
                  accept="image/*"
                  onChange={handleFilePagina}
                />
              </div>

              <div className="rc-file-box">
                <label>Programa General (PDF/JPG)</label>
                <input
                  type="file"
                  name="programa"
                  accept=".pdf,image/*"
                  onChange={handleFilePagina}
                />
              </div>

              <div className="rc-file-box">
                <label>Imagen Inicio de Sesión</label>
                <input type="file" name="imagen_login" accept="image/*" onChange={handleFilePagina} />
              </div>

              <div className="rc-file-box">
                <label>Imagen Recuperar Contraseña</label>
                <input
                  type="file"
                  name="imagen_contraseña"
                  accept="image/*"
                  onChange={handleFilePagina}
                />
              </div>

              <div className="rc-file-box">
                <label>Imagen Crear Cuenta</label>
                <input
                  type="file"
                  name="imagen_crearCuenta"
                  accept="image/*"
                  onChange={handleFilePagina}
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN 5: FECHAS IMPORTANTES Y CUOTAS (CongresoFechas & CongresoCuota) */}
          <section className="rc-card">
            <div className="rc-card-head">
              <span className="rc-step">05</span>
              <div>
                <h3>Cronograma de Fechas Importantes y Cuotas</h3>
                <p>Define los periodos operativos de recepción y los aranceles de inscripción.</p>
              </div>
            </div>

            <div className="rc-subblock">
              <div className="rc-subblock-header">
                <h4>Fechas Importantes</h4>
                <button type="button" className="rc-btn-secondary" onClick={agregarFecha}>
                  + Agregar fecha
                </button>
              </div>

              {fechasAsignadas.map((item, idx) => (
                <div className="rc-dynamic-row" key={idx}>
                  <select
                    value={item.id_fecha}
                    onChange={(e) => actualizarFecha(idx, 'id_fecha', Number(e.target.value))}
                  >
                    {catFechas.map((cf) => (
                      <option key={cf.id_fechas} value={cf.id_fechas}>
                        {cf.nombre_fecha}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={item.fecha_inicio}
                    onChange={(e) => actualizarFecha(idx, 'fecha_inicio', e.target.value)}
                    title="Fecha de inicio"
                  />
                  <input
                    type="date"
                    value={item.fecha_fin}
                    onChange={(e) => actualizarFecha(idx, 'fecha_fin', e.target.value)}
                    title="Fecha de cierre"
                  />
                  {fechasAsignadas.length > 1 && (
                    <button
                      type="button"
                      className="rc-btn-danger"
                      onClick={() => eliminarFecha(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <hr className="rc-divider" />

            <div className="rc-subblock">
              <div className="rc-subblock-header">
                <h4>Cuotas de Inscripción (MXN)</h4>
                <button type="button" className="rc-btn-secondary" onClick={agregarCuota}>
                  + Agregar cuota
                </button>
              </div>

              {cuotasAsignadas.map((item, idx) => (
                <div className="rc-dynamic-row rc-cuota-row" key={idx}>
                  <select
                    value={item.id_Cuota}
                    onChange={(e) => actualizarCuota(idx, 'id_Cuota', Number(e.target.value))}
                  >
                    {catCuotas.map((cc) => (
                      <option key={cc.id_cuota} value={cc.id_cuota}>
                        {cc.concepto_cuota}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Importe ($ MXN)"
                    value={item.importe}
                    onChange={(e) => actualizarCuota(idx, 'importe', e.target.value)}
                  />
                  {cuotasAsignadas.length > 1 && (
                    <button
                      type="button"
                      className="rc-btn-danger"
                      onClick={() => eliminarCuota(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN 6: ACTIVIDADES Y PATROCINADORES (CongresoActividad & CongresoPatrocinador) */}
          <section className="rc-card">
            <div className="rc-card-head">
              <span className="rc-step">06</span>
              <div>
                <h3>Actividades Habilitadas y Patrocinadores</h3>
                <p>Selecciona las modalidades académicas y los patrocinios visibles en portada.</p>
              </div>
            </div>

            <div className="rc-grid-2">
              <div className="rc-check-group">
                <h4>Modalidades de Participación</h4>
                {catActividades.map((act) => (
                  <label key={act.id_actividad} className="rc-checkbox">
                    <input
                      type="checkbox"
                      checked={actividadesActivas.includes(act.id_actividad)}
                      onChange={() =>
                        toggleSeleccion(act.id_actividad, actividadesActivas, setActividadesActivas)
                      }
                    />
                    <span>{act.nombre_actividad}</span>
                  </label>
                ))}
              </div>

              <div className="rc-check-group">
                <h4>Patrocinadores Institucionales</h4>
                {catPatrocinadores.map((pat) => (
                  <label key={pat.id_patrocinador} className="rc-checkbox">
                    <input
                      type="checkbox"
                      checked={patrocinadoresActivos.includes(pat.id_patrocinador)}
                      onChange={() =>
                        toggleSeleccion(
                          pat.id_patrocinador,
                          patrocinadoresActivos,
                          setPatrocinadoresActivos
                        )
                      }
                    />
                    <span>{pat.nombre_patrocinador}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Botonera final */}
          <div className="rc-actions">
            <button type="button" className="rc-btn-secondary" onClick={() => window.history.back()}>
              Cancelar
            </button>
            <button type="submit" className="rc-btn-primary" disabled={enviando}>
              {enviando ? 'Guardando Congreso...' : 'Registrar y Publicar Congreso'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}