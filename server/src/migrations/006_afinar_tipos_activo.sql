-- ============================================================================
-- 006 · Afinar el tipo concreto de cada activo
-- ============================================================================
-- La migración anterior acertó la plantilla de ficha técnica, pero al elegir
-- el tipo concreto tomaba el primero en orden alfabético de la categoría. Eso
-- producía resultados desconcertantes: una impresora quedaba como «Escáner» y
-- un teléfono como «Tableta».
--
-- Aquí se asigna el tipo exacto según el texto del activo, y sólo se corrige
-- cuando hay una coincidencia clara.
-- ============================================================================

DO $$
DECLARE
  a RECORD;
  texto text;
  nombre_tipo text;
  tipo_destino uuid;
BEGIN
  FOR a IN
    SELECT id, tenant_id, name, manufacturer, model, hardware_info
      FROM public.assets
  LOOP
    texto := lower(concat_ws(' ', a.name, a.manufacturer, a.model));

    nombre_tipo :=
      CASE
        -- ── Movilidad ─────────────────────────────────────────────
        WHEN texto ~ 'tel[eé]fono|celular|smartphone|iphone|galaxy|motorola|redmi|poco'
          THEN 'Teléfono móvil'
        WHEN texto ~ 'tablet|tableta|ipad'
          THEN 'Tableta'

        -- ── Impresión ─────────────────────────────────────────────
        WHEN texto ~ 'multifuncional|all.?in.?one printer|mfp'
          THEN 'Multifuncional'
        WHEN texto ~ 'esc[aá]ner|scanner|scanjet'
          THEN 'Escáner'
        WHEN texto ~ 'impresora|printer|laserjet|deskjet|officejet|plotter|copiadora'
          THEN 'Impresora'

        -- ── Red ───────────────────────────────────────────────────
        WHEN texto ~ 'firewall|fortigate|palo alto|sophos'
          THEN 'Firewall'
        WHEN texto ~ 'switch|catalyst|nexus'
          THEN 'Switch'
        WHEN texto ~ 'access point|punto de acceso|\maccess\M|unifi|\map\M'
          THEN 'Punto de acceso'
        WHEN texto ~ 'router|m[oó]dem|mikrotik'
          THEN 'Router'

        -- ── Servidores y almacenamiento ───────────────────────────
        WHEN texto ~ '\mnas\M|almacenamiento|storage|synology|qnap'
          THEN 'Almacenamiento (NAS)'
        WHEN texto ~ 'servidor|server|poweredge|proliant|thinksystem'
          THEN 'Servidor'

        -- ── Pantallas ─────────────────────────────────────────────
        WHEN texto ~ 'pantalla interactiva|smart board|pizarra'
          THEN 'Pantalla interactiva'
        WHEN texto ~ 'televisor|smart tv|\mtv\M'
          THEN 'Televisor'
        WHEN texto ~ 'monitor|display'
          THEN 'Monitor'

        -- ── Energía ───────────────────────────────────────────────
        WHEN texto ~ '\mups\M|no break|nobreak'
          THEN 'UPS'
        WHEN texto ~ 'regulador|estabilizador'
          THEN 'Regulador de voltaje'

        -- ── Audiovisual ───────────────────────────────────────────
        WHEN texto ~ 'proyector|videobeam|video beam'
          THEN 'Proyector'
        WHEN texto ~ 'c[aá]mara|webcam'
          THEN 'Cámara'
        WHEN texto ~ 'parlante|sonido|amplificador|micr[oó]fono'
          THEN 'Equipo de sonido'

        -- ── Periféricos ───────────────────────────────────────────
        WHEN texto ~ 'teclado|keyboard'
          THEN 'Teclado'
        WHEN texto ~ 'rat[oó]n|mouse'
          THEN 'Ratón'
        WHEN texto ~ 'diadema|aud[ií]fono|headset'
          THEN 'Diadema'

        -- ── Cómputo ───────────────────────────────────────────────
        WHEN texto ~ 'port[aá]til|laptop|macbook|thinkpad|notebook|latitude|elitebook|ideapad|vivobook'
          THEN 'Computador portátil'
        WHEN texto ~ 'todo en uno|all.?in.?one|imac|aio'
          THEN 'Todo en uno'
        WHEN texto ~ 'computador|desktop|\mpc\M|optiplex|prodesk|thinkcentre'
          THEN 'Computador de escritorio'

        ELSE NULL
      END;

    -- Los equipos que reportan por el agente son de cómputo. Si el nombre no
    -- dice de qué clase, se asume escritorio: el portátil suele indicarse.
    IF nombre_tipo IS NULL AND a.hardware_info ? 'device_info' THEN
      nombre_tipo := 'Computador de escritorio';
    END IF;

    CONTINUE WHEN nombre_tipo IS NULL;

    SELECT id INTO tipo_destino
      FROM public.asset_types
     WHERE tenant_id = a.tenant_id AND name = nombre_tipo
     LIMIT 1;

    IF tipo_destino IS NOT NULL THEN
      UPDATE public.assets SET asset_type_id = tipo_destino WHERE id = a.id;
    END IF;
  END LOOP;
END $$;

ANALYZE public.assets;
