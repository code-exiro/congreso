# Guía de estilos — Congreso

Versión: 1.0 · Actualización: 28 de octubre de 2026.

## 1. Propósito y alcance

Esta guía permite ampliar la interfaz manteniendo consistencia. Registra los estilos que existen en el código y propone reglas para los siguientes desarrollos.

- **Actual:** comprobado en los archivos del ZIP.
- **Convención propuesta:** criterio para nuevos cambios; no implica una modificación del código ni una decisión previa del equipo.
- **Pendiente:** aún no existe o necesita unificación.

La documentación se actualiza junto con el código. Este archivo no agrega estilos a la aplicación ni se actualiza automáticamente.

## 2. Base visual actual

La interfaz utiliza React, Material UI y Emotion. `src/main.jsx` monta `CssBaseline`; no se encontró `ThemeProvider`, `createTheme` ni una fuente personalizada importada.

Actualmente hay dos tratamientos visuales:

| Zona | Tratamiento actual | Fuente dentro de `frontend/src/` |
| --- | --- | --- |
| Login | Fotografía de fondo, capa azul oscura, texto blanco y acentos dorados | `features/auth/pages/LoginPage.jsx` |
| Registro | Mismo lenguaje azul y dorado; tarjeta oscura translúcida | `features/auth/pages/RegisterPage.jsx` |
| Panel privado | Colores semánticos del tema predeterminado de MUI | `app/layouts/` |
| Documentos legales | Superficies claras, tabla, diálogos, alertas y botones MUI | `features/legalDocuments/pages/AdminLegalDocumentsPage.jsx` |

La paleta del acceso todavía no está aplicada como tema general al panel privado. No asumir que `primary.main` equivale al dorado.

## 3. Paleta observada

Los nombres de referencia de esta tabla son documentales: todavía no existen como variables compartidas.

| Referencia | Valor exacto | Uso actual |
| --- | --- | --- |
| Fondo del acceso | `#0d1c2d` | Respaldo del fondo de login y registro |
| Texto sobre campos y botón dorado | `#102138` | Texto oscuro |
| Acento dorado | `#e7c77d` | Botón principal del acceso, enlaces, enfoque y detalles |
| Dorado al pasar el cursor | `#f2d99c` | Hover del botón principal |
| Borde al pasar el cursor | `#c7a65b` | Hover de campos |
| Fondo de campos | `#f6f8fc` | Entradas de login y registro |
| Campo deshabilitado | `#dce2eb` | Fondo de entradas deshabilitadas |
| Texto auxiliar | `#d6deeb` | Descripciones sobre fondo oscuro |
| Texto descriptivo del login | `#e1e7ef` | Texto de presentación |
| Placeholder e icono de contraseña | `#526176` | Login; iconos también en registro |
| Ayuda de registro | `#c6d0df` | Texto bajo entradas |
| Error sobre fondo oscuro | `#ffb4ab` | Ayuda de error en registro |
| Borde de error | `#d32f2f` | Campo inválido en registro |
| Botón deshabilitado | `#8e866f` / `#152033` | Fondo / texto en acceso |
| Tarjeta del registro | `rgba(10, 24, 42, .78)` | Superficie translúcida |

En el panel se utilizan `background.default`, `text.secondary`, `primary.main`, `action.selected` y `action.hover`. Éstas son referencias al tema MUI, no colores propios definidos por el proyecto.

**Convención propuesta:** reutilizar estos valores para extender las pantallas de acceso. En el panel, mantener los colores semánticos existentes hasta definir un tema común. Registrar aquí cualquier cambio de paleta.

## 4. Tipografía

No hay una familia tipográfica institucional configurada en el código activo revisado. Se utiliza la tipografía del tema predeterminado de MUI.

| Elemento | Valor actual | Fuente |
| --- | --- | --- |
| Título promocional del login | `2.8rem` en xs, `3.8rem` desde sm y `5rem` desde lg; peso 800; interlineado 1.06 | `LoginPage.jsx` |
| Encabezado del formulario de login | `2rem`, peso 750 | `LoginPage.jsx` |
| Título del registro | `1.8rem` en xs y `2rem` desde sm; peso 750 | `RegisterPage.jsx` |
| Etiquetas de login | `.875rem`, peso 600 | `LoginPage.jsx` |
| Etiquetas de registro | `.82rem`, peso 600 | `RegisterPage.jsx` |
| Entradas | `.95rem` en login; `.9rem` en registro | Páginas de autenticación |
| Página administrativa | `Typography component="h1" variant="h4"`, peso 750 | `AdminLegalDocumentsPage.jsx` |
| Texto secundario administrativo | `variant="body2"`, `color="text.secondary"` | `AdminLegalDocumentsPage.jsx` |
| Topbar | `variant="h6"`, `noWrap` | `Topbar.jsx` |

**Convención propuesta:** usar `Typography` y variantes MUI para nuevas páginas del panel. Separar la jerarquía semántica (`component="h1"`) del tamaño visual (`variant="h4"`). Mantener un título principal por pantalla.

## 5. Espaciado, radios y superficies

Los valores numéricos de espaciado de `sx` se resuelven mediante el tema MUI. Con la escala predeterminada, `p: 2` representa 16 px y `gap: 3` representa 24 px. `borderRadius: 2` usa la escala de radios del tema; `borderRadius: "8px"` es un valor literal.

| Patrón | Valor actual |
| --- | --- |
| Contenido privado | `p: { xs: 2, md: 3 }` |
| Separación del formulario de registro | `Stack spacing={2.5}` |
| Separación del formulario de login | `Stack spacing={3}` |
| Cuadrícula de registro | `gap: 2` |
| Entradas y botón dorado | Radio literal de `8px` |
| Tarjeta de registro | Radio literal de `20px`; borde `1px solid rgba(255,255,255,.16)` |
| Sombra de la tarjeta | `0 24px 70px rgba(0,0,0,.22)` |
| Tabla de documentos | `Paper variant="outlined"`, `borderRadius: 2`, `overflow: "hidden"` |
| Navegación | `borderRadius: 1.5` |

**Convención propuesta:** preferir la escala de `sx` para espaciados nuevos. Usar valores literales cuando se busque reproducir un detalle visual existente.

## 6. Composición y adaptación a pantallas

No hay breakpoints personalizados. Las claves `xs`, `sm`, `md` y `lg` se resuelven con el tema MUI vigente.

| Pantalla o componente | Comportamiento actual |
| --- | --- |
| Login | Una columna en tamaños pequeños; dos columnas desde md; ancho general máximo de 1320 px |
| Formulario de login | Ancho máximo de 410 px; centrado en pequeño y alineado al final desde md |
| Registro | Tarjeta centrada, ancho máximo de 660 px; `zoom: { xs: 1, md: 0.9 }` |
| Campos de registro | Una columna en xs; dos desde sm; nombre y correo ocupan la fila completa |
| Aceptaciones legales | Una columna en xs; dos desde sm; texto “Acepto” y enlace al documento |
| Sidebar | Ancho de 240 px definido en `AppLayout`; permanente desde md y temporal por debajo |
| Topbar | Fija; botón para abrir el menú visible por debajo de md |
| Documentos legales | Contenedor máximo de 1240 px; encabezado vertical en xs y horizontal desde sm |
| Tabla administrativa | `minWidth: 800` dentro de `TableContainer`; desplazamiento horizontal cuando falta espacio |

El `zoom` del registro es una decisión local existente. **Convención propuesta:** no extenderlo a todas las páginas; resolver nuevas necesidades mediante tamaños, espaciado y distribución responsive.

La Topbar usa `theme.zIndex.drawer + 1` en escritorio. El contenido y la Sidebar incluyen `Toolbar` como compensación de altura. Conservar esa relación al ampliar el layout.

## 7. Catálogo de patrones existentes

### 7.1 Botones

- Acceso: dorado, texto oscuro, peso 800, radio de 8 px, sin sombra y `textTransform: "none"`.
- Panel: acción principal con `variant="contained"`; acciones secundarias con presentación MUI del contexto.
- Cerrar sesión: `variant="outlined"`, `color="inherit"`, icono a la izquierda y texto sin mayúsculas automáticas.
- Durante solicitudes: texto como “Ingresando...”, “Creando cuenta…” o “Guardando…”; controles relacionados deshabilitados.

**Convención propuesta:** una acción principal clara por formulario. Usar texto e icono cuando ayuden a reconocer una operación. Usar `color="warning"` para desactivar documentos, como en la pantalla existente.

### 7.2 Formularios

- Emplear `TextField`, `Select`, `Checkbox` y controles MUI.
- Conservar etiqueta visible; el placeholder complementa la etiqueta.
- Mostrar errores de campo mediante `error` y `helperText` cuando aplique.
- Marcar campos obligatorios y señalar expresamente los opcionales.
- En contraseñas, usar ojos abierto/cerrado y un `IconButton type="button"` con `aria-label` y `aria-pressed`.
- En el registro, cada contraseña controla su propia visibilidad.
- Usar `autoComplete="email"`, `current-password` o `new-password` según el campo.
- No eliminar espacios ni modificar caracteres de las contraseñas.

Los estilos de campos de autenticación están duplicados en constantes locales (`fieldSx` y `registerFieldSx`), con pequeñas diferencias. No existe todavía un componente compartido de formulario.

### 7.3 Tablas y estados

La pantalla de documentos usa `Table size="small"`, encabezado con `action.hover`, filas con `hover`, identificador `doc.id` y acciones alineadas a la derecha.

| Estado mostrado | Condición actual | Apariencia |
| --- | --- | --- |
| Vigente | `is_active` | `Chip` pequeño, `success`, outlined |
| Histórico | Inactivo y con aceptaciones | `Chip` pequeño, `default`, outlined |
| No vigente | Inactivo y sin aceptaciones | `Chip` pequeño, `warning`, outlined |

“No vigente” puede representar un borrador o un documento desactivado. No existe un estado de base de datos independiente llamado “borrador”.

La pantalla incluye carga centrada, mensaje vacío, error y acciones según privilegios. No tiene filtros ni paginación en esta versión.

**Convención propuesta:** repetir esos estados al crear tablas nuevas; documentar filtros y paginación cuando se implementen. No inventar totales ni mensajes de éxito antes de la respuesta del servidor.

### 7.4 Diálogos y mensajes

- Crear/editar documento: `Dialog fullWidth maxWidth="sm"`, formulario y acciones Cancelar/Guardar.
- Confirmar publicación/desactivación: `Dialog fullWidth maxWidth="xs"`, explicación y Confirmar.
- Durante una operación, impedir el cierre accidental según el patrón `busy`/`working` existente.
- Informaciones y errores persistentes: `Alert` con severidad correspondiente.
- Éxito administrativo: `Snackbar` inferior centrado, duración de 4500 ms.
- Fechas administrativas: `Intl.DateTimeFormat("es-MX")`; captura mediante `datetime-local` en la zona del equipo.

### 7.5 Navegación

`Sidebar.jsx` usa `NavLink`: la ruta activa cambia fondo a `action.selected` y texto e icono a `primary.main`. Las rutas `/configuraciones/` se agrupan en un `Collapse` con sangría de submenú (`pl: 4`).

Los menús dinámicos reciben nombre, ruta e icono desde el backend. El frontend mantiene un mapa de iconos conocidos. Inicio es una entrada fija; Mis trabajos y Perfil aparecen deshabilitados.

## 8. Imágenes y accesibilidad

Las fotografías están en `frontend/public/images/login-background1.jpg` y `login-background2.jpg`. Cada montaje de login o registro elige una aleatoriamente. Se referencian con `import.meta.env.BASE_URL`.

El desenfoque `blur(2px)` se aplica a la fotografía. Las capas oscuras dejan legibles los controles. En registro, el fondo decorativo tiene `aria-hidden="true"`.

Mantener los patrones existentes: etiquetas asociadas a controles, nombre accesible de iconos, `aria-expanded` para navegación, foco visible dorado en acceso y texto que acompañe los estados de color. La revisión del código no constituye una auditoría de contraste ni una validación visual en navegadores.

## 9. Organización de estilos y evolución

### Situación actual

- `sx` y constantes locales definen la mayor parte de los estilos.
- `GlobalStyles` en login y registro ajusta `body` y `#root`.
- Existe `frontend/src/index.css`, con variables y reglas de la plantilla, pero no se encontró una importación desde el código revisado. No tratar su paleta morada ni su ancho de 1126 px como sistema visual activo.
- No existe tema oscuro propio del proyecto.

### Convención propuesta para próximos cambios

1. Buscar primero un patrón en esta guía y en la pantalla existente.
2. Mantener estilos específicos dentro de la funcionalidad que los usa.
3. Extraer estilos o componentes compartidos cuando haya reutilización real.
4. Centralizar el tema en `frontend/src/app/theme/` cuando se implemente esa tarea; registrar el punto de integración con `ThemeProvider` en `main.jsx`.
5. Al centralizar, conservar la diferencia entre acceso y panel mediante variantes o componentes; revisar los valores de ambos antes de sustituirlos.
6. Evitar cambios globales a `body`, `#root`, etiquetas HTML o clases MUI que afecten otras pantallas sin revisión.

La carpeta `app/theme/` es una propuesta; no se crea ni se integra mediante este documento.

## 10. Cómo agregar estilos a esta guía

Actualizar este archivo en el mismo cambio que introduce o modifica un patrón compartido. Corregir primero la sección correspondiente y después agregar una entrada al historial. Los cambios exclusivamente internos de una pantalla no necesitan convertirse en reglas globales.

Plantilla para un patrón nuevo:

```md
### Nombre del patrón

- Estado: Actual / Convención propuesta / Pendiente.
- Uso: dónde y para qué se emplea.
- Fuente: ruta relativa del componente o tema.
- Valores: colores, espacios, tipografía y dimensiones.
- Estados: normal, hover, foco, deshabilitado, carga y error.
- Responsive: qué cambia según el ancho.
- Accesibilidad: etiquetas, teclado y foco.
- Ejemplo: referencia a un uso real.
```

Antes de dar por terminado un cambio visual, revisar tamaños pequeños y grandes, navegación con teclado, textos largos y estados de solicitud. Anotar aquí cualquier límite relevante que siga pendiente.

## 11. Pendientes identificados

- Centralizar paleta y tipografía mediante un tema MUI.
- Unificar los estilos de entradas y botones de autenticación.
- Definir si el panel adoptará la paleta azul y dorada.
- Revisar y retirar o integrar deliberadamente el CSS de plantilla sin uso.
- Establecer patrones de filtros, paginación y tablas adicionales cuando existan.
- Verificar contraste, zoom del navegador y comportamiento visual en dispositivos reales.

## 12. Historial

| Fecha | Versión | Cambio |
| --- | --- | --- |
| 2026-10-28 | 1.0 | Primera guía a partir del ZIP actualizado: acceso, layout, navegación, documentos legales y reglas para ampliación. |

