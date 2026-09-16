-- ============================================================================
-- 005 · Catálogo de tipos de activo y plantilla de ficha técnica
-- ============================================================================
-- La tabla asset_types estaba vacía: ningún activo tenía tipo asignado, y por
-- eso la ficha técnica no podía adaptarse a lo que cada equipo realmente es.
--
-- Nota sobre `category`: esa columna ya tenía un significado propio
-- (hardware / software / service / document) con una restricción CHECK. No se
-- reutiliza. Se añade `ficha_tecnica`, que indica qué plantilla de campos
-- técnicos corresponde al tipo: computo, movil, impresion, red, servidor,
-- pantalla, energia, audiovisual, periferico u otro.
-- ============================================================================

ALTER TABLE public.asset_types
  ADD COLUMN IF NOT EXISTS ficha_tecnica text;

COMMENT ON COLUMN public.asset_types.ficha_tecnica IS
  'Plantilla de campos técnicos que aplica a este tipo de activo.';

ALTER TABLE public.asset_types DROP CONSTRAINT IF EXISTS asset_types_ficha_check;
ALTER TABLE public.asset_types ADD CONSTRAINT asset_types_ficha_check
  CHECK (ficha_tecnica IS NULL OR ficha_tecnica = ANY (ARRAY[
    'computo','movil','impresion','red','servidor',
    'pantalla','energia','audiovisual','periferico','otro'
  ]));

-- Un mismo tipo no debe repetirse dentro de una organización.
CREATE UNIQUE INDEX IF NOT EXISTS asset_types_tenant_nombre_idx
  ON public.asset_types (tenant_id, lower(name));

-- ─────────────────────────────────────────────────────────────────────
-- 1. Sembrar el catálogo en cada organización
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.asset_types (tenant_id, name, category, ficha_tecnica, icon)
SELECT t.id, v.name, 'hardware', v.ficha, v.icon
  FROM public.tenants t
 CROSS JOIN (VALUES
    ('Computador de escritorio', 'computo',     'desktop'),
    ('Computador portátil',      'computo',     'laptop'),
    ('Todo en uno',              'computo',     'monitor'),
    ('Teléfono móvil',           'movil',       'smartphone'),
    ('Tableta',                  'movil',       'tablet'),
    ('Impresora',                'impresion',   'printer'),
    ('Multifuncional',           'impresion',   'printer'),
    ('Escáner',                  'impresion',   'scan'),
    ('Switch',                   'red',         'network'),
    ('Router',                   'red',         'router'),
    ('Punto de acceso',          'red',         'wifi'),
    ('Firewall',                 'red',         'shield'),
    ('Servidor',                 'servidor',    'server'),
    ('Almacenamiento (NAS)',     'servidor',    'database'),
    ('Monitor',                  'pantalla',    'monitor'),
    ('Televisor',                'pantalla',    'tv'),
    ('Pantalla interactiva',     'pantalla',    'monitor'),
    ('UPS',                      'energia',     'battery'),
    ('Regulador de voltaje',     'energia',     'plug'),
    ('Proyector',                'audiovisual', 'projector'),
    ('Cámara',                   'audiovisual', 'camera'),
    ('Equipo de sonido',         'audiovisual', 'speaker'),
    ('Teclado',                  'periferico',  'keyboard'),
    ('Ratón',                    'periferico',  'mouse'),
    ('Diadema',                  'periferico',  'headphones'),
    ('Otro',                     'otro',        'box')
 ) AS v(name, ficha, icon)
 ON CONFLICT DO NOTHING;

-- Si ya existían tipos sin plantilla, se les asigna una genérica.
UPDATE public.asset_types SET ficha_tecnica = 'otro' WHERE ficha_tecnica IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Asignar tipo a los activos que no lo tienen
-- ─────────────────────────────────────────────────────────────────────
-- Se deduce del texto del activo, con las mismas reglas que usa la interfaz
-- en `deducirCategoria`, para que ambas coincidan.
DO $$
DECLARE
  a RECORD;
  texto text;
  ficha_destino text;
  tipo_destino uuid;
BEGIN
  FOR a IN
    SELECT id, tenant_id, name, manufacturer, model
      FROM public.assets
     WHERE asset_type_id IS NULL
  LOOP
    texto := lower(concat_ws(' ', a.name, a.manufacturer, a.model));

    ficha_destino :=
      CASE
        WHEN texto ~ 'tel[eé]fono|celular|smartphone|iphone|xiaomi|galaxy|motorola|tablet|tableta|ipad'
          THEN 'movil'
        WHEN texto ~ 'impresora|printer|laserjet|deskjet|multifuncional|esc[aá]ner|scanner|plotter|copiadora'
          THEN 'impresion'
        WHEN texto ~ 'switch|router|firewall|access point|punto de acceso|cisco|mikrotik|ubiquiti|m[oó]dem|catalyst'
          THEN 'red'
        WHEN texto ~ 'servidor|server|poweredge|proliant|nas|storage'
          THEN 'servidor'
        WHEN texto ~ 'monitor|pantalla|televisor|smart tv|display'
          THEN 'pantalla'
        WHEN texto ~ 'ups|regulador|planta el[eé]ctrica|no break'
          THEN 'energia'
        WHEN texto ~ 'proyector|videobeam|c[aá]mara|micr[oó]fono|parlante|sonido|videoconferencia'
          THEN 'audiovisual'
        WHEN texto ~ 'teclado|rat[oó]n|mouse|lector|diadema|aud[ií]fono|webcam|docking'
          THEN 'periferico'
        WHEN texto ~ 'computador|laptop|port[aá]til|macbook|thinkpad|desktop|all.?in.?one|reg-'
          THEN 'computo'
        ELSE NULL
      END;

    -- Un equipo que reportó por el agente es, con certeza, de cómputo.
    IF ficha_destino IS NULL
       AND EXISTS (SELECT 1 FROM assets x
                    WHERE x.id = a.id AND x.hardware_info ? 'device_info') THEN
      ficha_destino := 'computo';
    END IF;

    CONTINUE WHEN ficha_destino IS NULL;

    SELECT id INTO tipo_destino
      FROM public.asset_types
     WHERE tenant_id = a.tenant_id AND ficha_tecnica = ficha_destino
     ORDER BY name
     LIMIT 1;

    IF tipo_destino IS NOT NULL THEN
      UPDATE public.assets SET asset_type_id = tipo_destino WHERE id = a.id;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Limpiar los informes vacíos del agente
-- ─────────────────────────────────────────────────────────────────────
-- Varios activos tenían hardware_info = '{}', lo que hacía creer a la
-- interfaz que existía un informe automático y mostraba una ficha en blanco.
UPDATE public.assets
   SET hardware_info = NULL
 WHERE hardware_info IS NOT NULL
   AND NOT (hardware_info ? 'device_info')
   AND NOT (hardware_info ? 'hardware')
   AND NOT (hardware_info ? 'software');

CREATE INDEX IF NOT EXISTS assets_tipo_idx ON public.assets (tenant_id, asset_type_id);

ANALYZE public.assets;
