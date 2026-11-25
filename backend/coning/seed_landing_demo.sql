-- Datos iniciales de muestra de LandingPage.jsx para ejecutar desde pgAdmin.
-- Repetir el script actualiza estos datos en lugar de duplicarlos.
-- La contrasena es un marcador ficticio y no debe usarse para autenticacion.

BEGIN;

DO $seed$
DECLARE
    v_congreso_id integer;
    v_pagina_id integer;
    v_fecha_id integer;
    v_tipo_id integer;
    v_patrocinador_id integer;
    v_event record;
    v_sponsor record;
BEGIN
    SELECT id_congreso
    INTO v_congreso_id
    FROM congreso
    WHERE contrasena_aplicacion = 'CONING_DEMO_SEED_DO_NOT_USE'
       OR nombre_congreso = 'Congreso de Prueba CONING'
    ORDER BY
        CASE WHEN contrasena_aplicacion = 'CONING_DEMO_SEED_DO_NOT_USE' THEN 0 ELSE 1 END,
        id_congreso DESC
    LIMIT 1;

    IF v_congreso_id IS NULL THEN
        INSERT INTO congreso (
            edicion_congreso, modalidad_congreso, nombre_congreso,
            correo_congreso, contrasena_aplicacion, descripcion_congreso,
            fecha_cierre_registro, convocatoria, plantilla_extenso,
            plantilla_fondo_videoponencia, ubicacion_sede, direccion_sede,
            google_maps_query, contacto_correo
        )
        VALUES (
            21,
            'PRESENCIAL',
            'Congreso Científico y Tecnológico de las Carreras de Ingeniería',
            '21congresoingenierias@fes.cuautitlan.unam.mx',
            'CONING_DEMO_SEED_DO_NOT_USE',
            'Ingeniería Mecánica Eléctrica, Industrial y Telecomunicaciones, Sistemas y Electrónica. Un encuentro para compartir investigación, proyectos y tecnología.',
            'Hasta el 15 de agosto de 2026',
            '#',
            '#',
            '#',
            'FES Cuautitlán, Campo Cuatro — Unidad de Seminarios',
            'Carretera Cuautitlán–Teoloyucan Km. 2.5',
            'FES Cuautitlán Campo 4 UNAM',
            '21congresoingenierias@fes.cuautitlan.unam.mx'
        )
        RETURNING id_congreso INTO v_congreso_id;
    ELSE
        UPDATE congreso
        SET edicion_congreso = 21,
            modalidad_congreso = 'PRESENCIAL',
            nombre_congreso = 'Congreso Científico y Tecnológico de las Carreras de Ingeniería',
            correo_congreso = '21congresoingenierias@fes.cuautitlan.unam.mx',
            contrasena_aplicacion = 'CONING_DEMO_SEED_DO_NOT_USE',
            descripcion_congreso = 'Ingeniería Mecánica Eléctrica, Industrial y Telecomunicaciones, Sistemas y Electrónica. Un encuentro para compartir investigación, proyectos y tecnología.',
            fecha_cierre_registro = 'Hasta el 15 de agosto de 2026',
            convocatoria = '#',
            plantilla_extenso = '#',
            plantilla_fondo_videoponencia = '#',
            ubicacion_sede = 'FES Cuautitlán, Campo Cuatro — Unidad de Seminarios',
            direccion_sede = 'Carretera Cuautitlán–Teoloyucan Km. 2.5',
            google_maps_query = 'FES Cuautitlán Campo 4 UNAM',
            contacto_correo = '21congresoingenierias@fes.cuautitlan.unam.mx'
        WHERE id_congreso = v_congreso_id;
    END IF;

    SELECT id_pagina
    INTO v_pagina_id
    FROM pagina
    WHERE id_congreso = v_congreso_id
    ORDER BY id_pagina
    LIMIT 1;

    IF v_pagina_id IS NULL THEN
        INSERT INTO pagina (
            id_congreso, color_banner, cartel, banner, enlace_programa,
            logo_congreso, programa
        )
        VALUES (
            v_congreso_id,
            '#e2c275',
            '/images/poster.jpeg',
            '/images/banner.png',
            'https://drive.google.com/file/d/102ty8mj66WZt_9K38OAIrLCboKtBrAdU/view?usp=drive_link',
            '/images/logo_congreso.jpeg',
            '/images/programaGeneral.png'
        );
    ELSE
        UPDATE pagina
        SET color_banner = '#e2c275',
            cartel = '/images/poster.jpeg',
            banner = '/images/banner.png',
            enlace_programa = 'https://drive.google.com/file/d/102ty8mj66WZt_9K38OAIrLCboKtBrAdU/view?usp=drive_link',
            logo_congreso = '/images/logo_congreso.jpeg',
            programa = '/images/programaGeneral.png'
        WHERE id_pagina = v_pagina_id;
    END IF;

    DELETE FROM congresofecha AS cf
    USING fechaimportante AS fi
    WHERE cf.id_congreso = v_congreso_id
      AND cf.id_fecha = fi.id_fecha
      AND fi.nombre_fecha IN (
          'Inicio de recepción de trabajos',
          'Día del congreso'
      );

    DELETE FROM congresopatrocinador AS cp
    USING patrocinador AS p
    WHERE cp.id_congreso = v_congreso_id
      AND cp.id_patrocinador = p.id_patrocinador
      AND p.nombre_patrocinador = 'Patrocinador de Prueba';

    FOR v_event IN
        SELECT *
        FROM (
            VALUES
                ('Inauguración del congreso', DATE '2026-08-31', DATE '2026-08-31'),
                ('Recepción de resúmenes, carteles y/o talleres', DATE '2026-08-31', DATE '2026-09-15'),
                ('Desarrollo de ponencias', DATE '2026-09-01', DATE '2026-09-04'),
                ('Evaluación de los resúmenes', DATE '2026-09-10', DATE '2026-09-18'),
                ('Resultados de evaluaciones', DATE '2026-09-22', DATE '2026-09-22'),
                ('Cierre del congreso', DATE '2026-09-04', DATE '2026-09-04')
        ) AS events(nombre_fecha, fecha_inicio, fecha_fin)
    LOOP
        SELECT id_fecha
        INTO v_fecha_id
        FROM fechaimportante
        WHERE nombre_fecha = v_event.nombre_fecha
        ORDER BY id_fecha
        LIMIT 1;

        IF v_fecha_id IS NULL THEN
            INSERT INTO fechaimportante (nombre_fecha)
            VALUES (v_event.nombre_fecha)
            RETURNING id_fecha INTO v_fecha_id;
        END IF;

        INSERT INTO congresofecha (id_congreso, id_fecha, fecha_inicio, fecha_fin)
        VALUES (v_congreso_id, v_fecha_id, v_event.fecha_inicio, v_event.fecha_fin)
        ON CONFLICT (id_congreso, id_fecha)
        DO UPDATE SET
            fecha_inicio = EXCLUDED.fecha_inicio,
            fecha_fin = EXCLUDED.fecha_fin;
    END LOOP;

    SELECT id_tipopa
    INTO v_tipo_id
    FROM tipopatrocinador
    WHERE nombre_tipopa = 'Institucional'
    ORDER BY id_tipopa
    LIMIT 1;

    IF v_tipo_id IS NULL THEN
        INSERT INTO tipopatrocinador (nombre_tipopa)
        VALUES ('Institucional')
        RETURNING id_tipopa INTO v_tipo_id;
    END IF;

    FOR v_sponsor IN
        SELECT *
        FROM (
            VALUES
                ('ECC_2', '/images/ECC_2.png'),
                ('GECKO', '/images/GECKO.png'),
                ('PAPIME_2', '/images/PAPIME_2.png'),
                ('DGTIC', '/images/DGTIC.png'),
                ('PAPIME', '/images/PAPIME.png'),
                ('FES', '/images/FES.png'),
                ('ECC', '/images/ECC.png')
        ) AS sponsors(nombre_patrocinador, logo_patrocinador)
    LOOP
        SELECT id_patrocinador
        INTO v_patrocinador_id
        FROM patrocinador
        WHERE nombre_patrocinador = v_sponsor.nombre_patrocinador
        ORDER BY id_patrocinador
        LIMIT 1;

        IF v_patrocinador_id IS NULL THEN
            INSERT INTO patrocinador (
                id_tipopa, nombre_patrocinador, logo_patrocinador, activo
            )
            VALUES (
                v_tipo_id,
                v_sponsor.nombre_patrocinador,
                v_sponsor.logo_patrocinador,
                TRUE
            )
            RETURNING id_patrocinador INTO v_patrocinador_id;
        ELSE
            UPDATE patrocinador
            SET id_tipopa = v_tipo_id,
                logo_patrocinador = v_sponsor.logo_patrocinador,
                activo = TRUE
            WHERE id_patrocinador = v_patrocinador_id;
        END IF;

        INSERT INTO congresopatrocinador (id_congreso, id_patrocinador)
        VALUES (v_congreso_id, v_patrocinador_id)
        ON CONFLICT (id_congreso, id_patrocinador) DO NOTHING;
    END LOOP;
END
$seed$;

COMMIT;
