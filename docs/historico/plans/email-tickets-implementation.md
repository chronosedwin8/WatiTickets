# Plan de Implementación: Sistema de Tickets vía Email con Amazon SES

## Versión 2.0 - Revisado y Mejorado

Este documento detalla la arquitectura completa y los pasos necesarios para implementar la creación y gestión de tickets a través de correo electrónico utilizando Amazon SES, integrado con la plataforma TicketWati.

---

## 1. Arquitectura de la Solución (Mejorada)

### 1.1. Flujo de Entrada: Email → Ticket

```
[Usuario] 
   ↓ (envía email a soporte.sistemas@colegioaleman.edu.co)
[Amazon SES]
   ↓ (Receipt Rule: Save to S3)
[S3 Bucket: ticketwati-emails/incoming/]
   ↓ (S3 Event → SNS Topic)
[Amazon SNS Topic: ticketwati-email-notifications]
   ↓ (HTTP/HTTPS Subscription)
[Supabase Edge Function: process-inbound-email]
   ↓ (valida, parsea, procesa)
[Base de Datos + S3 Storage]
   → Ticket creado con adjuntos
```

**Mejoras implementadas:**
- ✅ **SNS como intermediario**: Mayor confiabilidad y reintentos automáticos
- ✅ **Validación de firma SNS**: Seguridad contra accesos no autorizados
- ✅ **Organización de S3**: Carpetas `incoming/`, `processed/`, `failed/`
- ✅ **Manejo de errores**: Sistema de Dead Letter Queue (DLQ) en SNS

### 1.2. Flujo de Salida: Respuesta → Email

```
[Agente en TicketWati]
   ↓ (responde ticket con toggle "Enviar por email")
[Frontend]
   ↓ (POST a Edge Function)
[Edge Function: send-email-reply]
   ↓ (construye email con threading headers)
[Amazon SES V2 API]
   ↓ (envía email)
[Usuario + CC/BCC]
   → Email recibido en conversación agrupada
```

**Mejoras implementadas:**
- ✅ **Threading de conversaciones**: Headers `In-Reply-To`, `References`, `Message-ID`
- ✅ **Plantillas de email**: HTML profesional con branding
- ✅ **Bounce handling**: Webhook para procesar rebotes y actualizar estado
- ✅ **Rate limiting**: Control de envío para evitar exceder cuotas SES

---

## 2. Cambios en Base de Datos (Detallados)

### 2.1. Tabla `teams` - Mapeo de Emails por Departamento

```sql
-- Agregar columna para email de soporte del departamento
ALTER TABLE teams 
ADD COLUMN email_address text,
ADD CONSTRAINT unique_team_email UNIQUE (email_address),
ADD CONSTRAINT valid_email CHECK (email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Índice para búsquedas rápidas por email
CREATE INDEX idx_teams_email ON teams(email_address) WHERE email_address IS NOT NULL;

-- Ejemplo de datos
-- UPDATE teams SET email_address = 'soporte.sistemas@colegioaleman.edu.co' WHERE name = 'Sistemas';
-- UPDATE teams SET email_address = 'soporte.comunicaciones@colegioaleman.edu.co' WHERE name = 'Comunicaciones';
```

### 2.2. Tabla `tickets` - Metadatos de Email

```sql
-- Agregar columnas para gestión de emails
ALTER TABLE tickets 
ADD COLUMN external_sender_email text,           -- Email del remitente externo
ADD COLUMN external_sender_name text,            -- Nombre del remitente externo
ADD COLUMN email_message_id text UNIQUE,         -- Message-ID del email original
ADD COLUMN email_in_reply_to text,               -- In-Reply-To header (para threading)
ADD COLUMN email_references text[],              -- References headers (para threading)
ADD COLUMN email_cc_addresses text[],            -- Direcciones en CC
ADD COLUMN email_raw_headers jsonb,              -- Headers completos del email (para debugging)
ADD COLUMN created_via_email boolean DEFAULT false; -- Flag rápido para identificar tickets por email

-- Índices para mejorar performance
CREATE INDEX idx_tickets_email_message_id ON tickets(email_message_id) WHERE email_message_id IS NOT NULL;
CREATE INDEX idx_tickets_external_sender ON tickets(external_sender_email) WHERE external_sender_email IS NOT NULL;
CREATE INDEX idx_tickets_created_via_email ON tickets(created_via_email) WHERE created_via_email = true;

-- Constraint: Si es creado por email, debe tener message_id
ALTER TABLE tickets ADD CONSTRAINT check_email_fields 
CHECK (
  (created_via_email = false) OR 
  (created_via_email = true AND email_message_id IS NOT NULL)
);
```

### 2.3. Tabla `tenant_settings` - Configuración SES (Con Seguridad Mejorada)

```sql
-- Agregar columnas de configuración SES
ALTER TABLE tenant_settings
ADD COLUMN ses_enabled boolean DEFAULT false,
ADD COLUMN ses_region text DEFAULT 'us-east-1',
ADD COLUMN ses_access_key_id text,               -- Será encriptada por RLS
ADD COLUMN ses_secret_access_key text,           -- Será encriptada por RLS
ADD COLUMN ses_incoming_bucket text,             -- Nombre del bucket S3
ADD COLUMN ses_incoming_bucket_prefix text DEFAULT 'incoming/',
ADD COLUMN ses_verified_domain text,             -- Dominio verificado en SES
ADD COLUMN ses_default_from_email text,          -- Email remitente por defecto
ADD COLUMN ses_default_from_name text,           -- Nombre remitente por defecto
ADD COLUMN ses_configuration_set text,           -- Para tracking avanzado
ADD COLUMN email_signature text,                 -- Firma por defecto en respuestas
ADD COLUMN ses_webhook_secret text,              -- Para validar webhooks SNS
ADD COLUMN updated_at timestamptz DEFAULT now();

-- Constraint: Si SES está habilitado, campos requeridos deben estar presentes
ALTER TABLE tenant_settings ADD CONSTRAINT check_ses_config
CHECK (
  (ses_enabled = false) OR
  (ses_enabled = true AND 
   ses_access_key_id IS NOT NULL AND 
   ses_secret_access_key IS NOT NULL AND
   ses_incoming_bucket IS NOT NULL AND
   ses_verified_domain IS NOT NULL)
);

-- Actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_tenant_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_settings_timestamp
BEFORE UPDATE ON tenant_settings
FOR EACH ROW
EXECUTE FUNCTION update_tenant_settings_timestamp();
```

### 2.4. Nueva Tabla: `email_processing_log` - Auditoría y Debugging

```sql
-- Tabla para rastrear procesamiento de emails
CREATE TABLE email_processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  message_id text NOT NULL,                    -- Message-ID del email
  s3_key text NOT NULL,                        -- Ubicación en S3
  from_address text NOT NULL,
  to_addresses text[] NOT NULL,
  subject text,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed', 'duplicate')),
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,  -- Ticket creado (si aplica)
  error_message text,                          -- Detalles del error
  processing_duration_ms integer,              -- Tiempo de procesamiento
  metadata jsonb DEFAULT '{}',                 -- Datos adicionales
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Índices
CREATE INDEX idx_email_log_tenant ON email_processing_log(tenant_id);
CREATE INDEX idx_email_log_status ON email_processing_log(status);
CREATE INDEX idx_email_log_message_id ON email_processing_log(message_id);
CREATE INDEX idx_email_log_created ON email_processing_log(created_at DESC);

-- RLS: Solo admin puede ver logs
ALTER TABLE email_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all email logs" ON email_processing_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id = email_processing_log.tenant_id
      AND profiles.role = 'admin'
    )
  );
```

### 2.5. Nueva Tabla: `email_bounces` - Gestión de Rebotes

```sql
-- Tabla para rastrear emails rebotados
CREATE TABLE email_bounces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  email_address text NOT NULL,
  bounce_type text NOT NULL CHECK (bounce_type IN ('permanent', 'temporary', 'complaint')),
  bounce_subtype text,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL,
  diagnostic_code text,
  bounced_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Índices
CREATE INDEX idx_bounces_email ON email_bounces(email_address);
CREATE INDEX idx_bounces_tenant ON email_bounces(tenant_id);
CREATE INDEX idx_bounces_ticket ON email_bounces(ticket_id) WHERE ticket_id IS NOT NULL;

-- RLS
ALTER TABLE email_bounces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view bounces" ON email_bounces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id = email_bounces.tenant_id
      AND profiles.role IN ('admin', 'manager')
    )
  );
```

---

## 3. Edge Functions (Implementación Detallada)

### 3.1. Edge Function: `process-inbound-email`

**Ubicación:** `supabase/functions/process-inbound-email/index.ts`

**Responsabilidades:**
1. ✅ Validar firma SNS (seguridad)
2. ✅ Descargar email de S3
3. ✅ Parsear contenido MIME
4. ✅ Extraer y subir adjuntos
5. ✅ Mapear departamento por email de destino
6. ✅ Identificar o crear perfil de usuario
7. ✅ Crear ticket con toda la metadata
8. ✅ Mover email procesado en S3
9. ✅ Registrar en log de auditoría

**Librerías requeridas:**
- `@aws-sdk/client-s3` - Interacción con S3
- `mailparser` (o alternativa Deno) - Parseo de emails
- `uuid` - Generación de IDs

**Pseudocódigo:**
```typescript
Deno.serve(async (req) => {
  // 1. Validar origen SNS
  const snsSignature = req.headers.get('x-amz-sns-signature');
  if (!await validateSNSSignature(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parsear payload SNS
  const snsMessage = await req.json();
  const s3Event = JSON.parse(snsMessage.Message);
  const { bucket, key } = s3Event.Records[0].s3.object;

  // 3. Descargar email de S3
  const emailRaw = await s3Client.getObject({ Bucket: bucket, Key: key });

  // 4. Parsear email
  const parsed = await parseEmail(emailRaw.Body);
  const { from, to, subject, text, html, attachments, messageId, references } = parsed;

  // 5. Identificar departamento
  const team = await supabase
    .from('teams')
    .select('id')
    .eq('email_address', to[0].address)
    .single();

  // 6. Identificar usuario
  let requester = await supabase
    .from('profiles')
    .select('id')
    .eq('email', from.address)
    .single();

  // 7. Subir adjuntos
  const attachmentUrls = [];
  for (const att of attachments) {
    const url = await uploadToStorage(att);
    attachmentUrls.push(url);
  }

  // 8. Crear ticket
  const ticket = await supabase.from('tickets').insert({
    tenant_id,
    team_id: team.id,
    requester_id: requester?.id || null,
    external_sender_email: !requester ? from.address : null,
    external_sender_name: !requester ? from.name : null,
    title: subject,
    description: html || text,
    type: 'service_request',
    priority: 'low',
    source: 'email',
    created_via_email: true,
    email_message_id: messageId,
    email_references: references,
    attachments: attachmentUrls
  });

  // 9. Mover a carpeta processed/
  await s3Client.copyObject(...);
  await s3Client.deleteObject(...);

  return new Response('OK', { status: 200 });
});
```

### 3.2. Edge Function: `send-email-reply`

**Ubicación:** `supabase/functions/send-email-reply/index.ts`

**Responsabilidades:**
1. ✅ Validar autenticación del usuario
2. ✅ Obtener configuración SES del tenant
3. ✅ Obtener datos del ticket original
4. ✅ Construir email con headers de threading
5. ✅ Enviar vía SES V2
6. ✅ Guardar comentario en el ticket
7. ✅ Registrar envío en log

**Pseudocódigo:**
```typescript
Deno.serve(async (req) => {
  const { ticket_id, content, cc, bcc, send_email } = await req.json();

  if (!send_email) {
    // Solo guardar comentario, no enviar email
    await saveComment(ticket_id, content);
    return new Response('Comment saved', { status: 200 });
  }

  // Obtener config SES
  const sesConfig = await getTenantSESConfig(tenant_id);

  // Obtener ticket con datos de email original
  const ticket = await getTicket(ticket_id);

  // Construir email con threading
  const emailParams = {
    From: `${sesConfig.default_from_name} <${sesConfig.default_from_email}>`,
    To: ticket.external_sender_email || ticket.requester.email,
    Cc: cc,
    Bcc: bcc,
    Subject: `Re: ${ticket.title}`,
    HtmlBody: buildEmailHTML(content, sesConfig.signature),
    Headers: {
      'In-Reply-To': ticket.email_message_id,
      'References': ticket.email_references?.join(' '),
      'Message-ID': `<${generateMessageId()}>`
    }
  };

  // Enviar con SES
  await sesClient.sendEmail(emailParams);

  // Guardar comentario
  await saveComment(ticket_id, content, { sent_via_email: true });

  return new Response('Email sent', { status: 200 });
});
```

### 3.3. Edge Function: `handle-ses-webhook` (Nuevo)

**Responsabilidad:** Procesar notificaciones de bounces, complaints, deliveries

```typescript
Deno.serve(async (req) => {
  // Validar webhook secret
  // Procesar bounce/complaint
  // Actualizar tabla email_bounces
  // Notificar al sistema si es necesario
});
```

---

## 4. Interfaz de Usuario (Frontend) - Especificación Detallada

### 4.1. Página: `/settings/email-integration`

**Componentes:**

#### A. **SES Configuration Card**
```tsx
- Enable SES Toggle
- AWS Region Select (us-east-1, us-west-2, eu-west-1)
- Access Key ID Input (password type, con botón show/hide)
- Secret Access Key Input (password type, con botón show/hide)
- S3 Bucket Name Input
- Verified Domain Input (readonly después de verificar)
- From Email Input
- From Name Input
- Test Connection Button (envía email de prueba)
- Save Button
```

#### B. **Department Email Mapping Table**
```tsx
| Departamento | Email Asignado | Estado | Acciones |
|--------------|----------------|--------|----------|
| Sistemas     | soporte.sistemas@... | ✅ Activo | Editar |
| Comunicaciones | soporte.comunicaciones@... | ✅ Activo | Editar |

- Botón "Asignar Email" para cada departamento
- Modal de edición con validación de formato
```

#### C. **Email Processing Log** (Solo Admin)
```tsx
- Tabla con últimos 50 emails procesados
- Columnas: Fecha, De, Para, Asunto, Estado, Ticket, Acciones
- Filtros por estado y fecha
- Botón "Ver Detalles" -> Modal con headers completos y error logs
```

### 4.2. Componente: Indicador de Origen en Ticket

**Ubicación:** `TicketCard`, `TicketDetail`

```tsx
{ticket.created_via_email && (
  <Badge variant="outline" className="gap-1">
    <Mail className="h-3 w-3" />
    Creado por Email
  </Badge>
)}

{ticket.external_sender_email && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <User className="h-4 w-4" />
    <span>
      Usuario Externo: <strong>{ticket.external_sender_name || ticket.external_sender_email}</strong>
    </span>
  </div>
)}
```

### 4.3. Componente: Reply with Email Toggle

**Ubicación:** `TicketCommentForm`

```tsx
<div className="border-t pt-4">
  <div className="flex items-center justify-between mb-3">
    <Label className="flex items-center gap-2">
      <Switch 
        checked={sendViaEmail} 
        onCheckedChange={setSendViaEmail}
      />
      Enviar respuesta por correo electrónico
    </Label>
  </div>

  {sendViaEmail && (
    <div className="space-y-2 pl-6">
      <div>
        <Label>Para:</Label>
        <Input 
          readOnly 
          value={ticket.external_sender_email || ticket.requester.email} 
        />
      </div>
      <div>
        <Label>CC (opcional):</Label>
        <Input 
          placeholder="correo@ejemplo.com, otro@ejemplo.com"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
        />
      </div>
      <div>
        <Label>BCC (opcional):</Label>
        <Input 
          placeholder="correo@ejemplo.com"
          value={bcc}
          onChange={(e) => setBcc(e.target.value)}
        />
      </div>
    </div>
  )}
</div>
```

---

## 5. Configuración AWS (Guía Paso a Paso)

### 5.1. Verificación de Dominio en SES

```bash
# 1. Ir a SES Console → Verified Identities → Verify a New Domain
# 2. Ingresar: colegioaleman.edu.co
# 3. Agregar los registros DNS proporcionados:
#    - TXT record para verificación
#    - CNAME records para DKIM
#    - MX record para recepción de emails
```

**Registros DNS necesarios (ejemplo):**
```
Tipo: MX
Host: @
Valor: 10 inbound-smtp.us-east-1.amazonaws.com
TTL: 3600

Tipo: TXT
Host: @
Valor: "amazonses:VERIFICATION_CODE"
TTL: 3600
```

### 5.2. Crear S3 Bucket

```bash
# Nombre: ticketwati-emails
# Región: us-east-1 (misma que SES)

# Política del bucket:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESPuts",
      "Effect": "Allow",
      "Principal": {
        "Service": "ses.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::ticketwati-emails/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceAccount": "YOUR_ACCOUNT_ID"
        }
      }
    }
  ]
}
```

### 5.3. Crear Usuario IAM

```bash
# Nombre: ticketwati-ses-user
# Permisos necesarios (política inline):

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::ticketwati-emails/*"
    }
  ]
}

# Generar Access Keys y guardar de forma segura
```

### 5.4. Configurar Receipt Rule en SES

```bash
# 1. Ir a SES → Email Receiving → Rule Sets
# 2. Crear nuevo Rule Set (si no existe): "ticketwati-rules"
# 3. Agregar regla:

Nombre: route-to-s3-and-sns
Recipients: 
  - soporte.sistemas@colegioaleman.edu.co
  - soporte.comunicaciones@colegioaleman.edu.co
  - (agregar todas las direcciones de departamentos)

Actions (en orden):
  1. S3 Action:
     - Bucket: ticketwati-emails
     - Prefix: incoming/
  
  2. SNS Action:
     - Topic: ticketwati-email-notifications (crear si no existe)
     - Encoding: UTF-8

# 4. Activar el Rule Set
```

### 5.5. Configurar SNS Topic

```bash
# Nombre: ticketwati-email-notifications

# Crear suscripción HTTP/HTTPS:
# Endpoint: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/process-inbound-email
# Confirmar suscripción (la Edge Function debe responder al SubscriptionConfirmation)
```

---

## 6. Seguridad y Buenas Prácticas

### 6.1. Seguridad de Credenciales

```sql
-- Política RLS estricta para tenant_settings
CREATE POLICY "Only admins can read SES credentials" ON tenant_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id = tenant_settings.tenant_id
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update SES settings" ON tenant_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id = tenant_settings.tenant_id
      AND profiles.role = 'admin'
    )
  );
```

**Recomendación adicional:** Usar Supabase Vault (pgcrypto) para encriptar las keys:

```sql
-- Función para encriptar
CREATE OR REPLACE FUNCTION encrypt_ses_key(key text) 
RETURNS text AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(key, current_setting('app.encryption_key')), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para desencriptar (solo en Edge Functions)
CREATE OR REPLACE FUNCTION decrypt_ses_key(encrypted_key text) 
RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_key, 'base64'), current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2. Validación de Firma SNS

```typescript
import { createVerify } from 'node:crypto';

async function validateSNSSignature(req: Request): Promise<boolean> {
  const body = await req.text();
  const message = JSON.parse(body);
  
  // Obtener certificado de AWS
  const certUrl = message.SigningCertURL;
  if (!certUrl.startsWith('https://sns.') || !certUrl.includes('.amazonaws.com/')) {
    return false;
  }
  
  const certResponse = await fetch(certUrl);
  const certificate = await certResponse.text();
  
  // Construir string para verificar
  const stringToSign = buildSignatureString(message);
  
  // Verificar firma
  const verifier = createVerify('RSA-SHA1');
  verifier.update(stringToSign, 'utf8');
  
  return verifier.verify(certificate, message.Signature, 'base64');
}
```

### 6.3. Rate Limiting y Cuotas

```typescript
// Implementar rate limiting por tenant
const RATE_LIMITS = {
  emails_per_hour: 100,
  emails_per_day: 1000
};

// Usar Redis o tabla en DB para rastrear
CREATE TABLE email_rate_limits (
  tenant_id uuid PRIMARY KEY,
  count_hour integer DEFAULT 0,
  count_day integer DEFAULT 0,
  hour_reset_at timestamptz,
  day_reset_at timestamptz
);
```

### 6.4. Prevención de Spam y Loops

```typescript
// En process-inbound-email
const MAX_EMAIL_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_ATTACHMENT_TYPES = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx'];

// Detectar loops (mismo Message-ID)
const existingTicket = await supabase
  .from('tickets')
  .select('id')
  .eq('email_message_id', messageId)
  .single();

if (existingTicket) {
  // Email duplicado, ignorar o agregar como comentario
  return new Response('Duplicate', { status: 200 });
}

// Bloquear dominios sospechosos
const BLOCKED_DOMAINS = ['spam.com', 'malicious.net'];
if (BLOCKED_DOMAINS.includes(fromDomain)) {
  return new Response('Blocked', { status: 403 });
}
```

---

## 7. Testing y Validación

### 7.1. Plan de Pruebas

#### Pruebas Unitarias (Edge Functions)
- ✅ Validación de firma SNS
- ✅ Parseo de emails complejos (multipart, HTML, attachments)
- ✅ Mapeo correcto de departamentos
- ✅ Creación de usuarios externos
- ✅ Manejo de adjuntos grandes

#### Pruebas de Integración
- ✅ Flujo completo: Email → S3 → SNS → Edge Function → DB
- ✅ Threading de conversaciones (respuestas agrupadas)
- ✅ Envío de emails con CC/BCC
- ✅ Procesamiento de bounces

#### Pruebas de Carga
- ✅ 100 emails simultáneos
- ✅ Emails con múltiples adjuntos (10MB total)
- ✅ Diferentes formatos de email (plain text, HTML, mixed)

### 7.2. Casos de Prueba Específicos

```bash
# Test 1: Email simple de usuario externo
De: usuario@gmail.com
Para: soporte.sistemas@colegioaleman.edu.co
Asunto: No puedo acceder al sistema
Cuerpo: Necesito ayuda con mi contraseña

Esperado:
- Ticket creado en departamento Sistemas
- requester_id = NULL
- external_sender_email = 'usuario@gmail.com'
- type = 'service_request'
- priority = 'low'

# Test 2: Email con adjuntos
De: profesor@colegioaleman.edu.co
Para: soporte.sistemas@colegioaleman.edu.co
Asunto: Problema con proyector
Adjuntos: foto_error.jpg (2MB)

Esperado:
- Ticket creado
- requester_id = [ID del profesor]
- attachments = [{url: 's3://...', name: 'foto_error.jpg'}]

# Test 3: Respuesta a ticket existente
De: agente@colegioaleman.edu.co
Para: usuario@gmail.com
Asunto: Re: No puedo acceder al sistema
Headers: In-Reply-To: <original-message-id>

Esperado:
- Email agrupado en conversación
- Comentario agregado al ticket original

# Test 4: Email a departamento no configurado
Para: info@colegioaleman.edu.co

Esperado:
- Email guardado en S3 processed/unmatched/
- Log con error "No department mapping"
- Notificación a admins
```

---

## 8. Monitoreo y Métricas

### 8.1. Dashboard de Métricas (Admin)

```typescript
// Métricas a rastrear:
- Total emails recibidos (por día/semana/mes)
- Total tickets creados por email
- Tasa de éxito del procesamiento
- Emails fallidos (con razones)
- Tiempo promedio de procesamiento
- Bounces y complaints
- Emails de usuarios externos vs registrados
```

### 8.2. Alertas

```typescript
// Configurar alertas para:
- Tasa de error > 5%
- Bucket S3 con > 1000 emails sin procesar
- Bounce rate > 10%
- Credential errors (SES authentication failed)
```

---

## 9. Migración y Rollout

### Fase 1: Preparación (Semana 1)
- ✅ Ejecutar migraciones de BD
- ✅ Configurar AWS (dominio, S3, SNS, SES)
- ✅ Crear Edge Functions básicas
- ✅ Testing en ambiente de desarrollo con emails de prueba

### Fase 2: Implementación UI (Semana 2)
- ✅ Página de configuración
- ✅ Indicadores en tickets
- ✅ Componente de respuesta con email
- ✅ Testing E2E

### Fase 3: Piloto (Semana 3)
- ✅ Habilitar para 1 departamento (Sistemas)
- ✅ Monitorear logs y métricas
- ✅ Recopilar feedback de usuarios
- ✅ Ajustar según necesidades

### Fase 4: Rollout Completo (Semana 4)
- ✅ Habilitar para todos los departamentos
- ✅ Capacitación a usuarios
- ✅ Documentación de usuario final

---

## 10. Costos Estimados (AWS)

```
Amazon SES:
- Primeros 62,000 emails/mes: GRATIS (si se envía desde EC2)
- Emails adicionales: $0.10 por 1,000 emails
- Recepción: $0.10 por 1,000 emails

Amazon S3:
- Primeros 5 GB: GRATIS
- Almacenamiento adicional: $0.023 por GB/mes
- Transferencia: Gratis dentro de la misma región

Amazon SNS:
- Primeras 1,000 notificaciones: GRATIS
- Notificaciones adicionales: $0.50 por 1 millón

ESTIMADO MENSUAL (1,000 tickets/mes por email):
- SES: ~$0.20
- S3: ~$0.50 (asumiendo 10GB con adjuntos)
- SNS: ~$0.00 (dentro de tier gratuito)
TOTAL: ~$1 USD/mes
```

---

## 11. Próximos Pasos (¡LISTO PARA EJECUTAR!)

### Orden de Ejecución:

1. **Confirmar acceso a AWS** ✋ (esperar confirmación del usuario)
2. **Ejecutar migraciones de base de datos** ✅ (listo para ejecutar)
3. **Crear estructura de Edge Functions** ✅ (listo para ejecutar)
4. **Implementar UI de configuración** ✅ (listo para ejecutar)
5. **Testing y validación** 🔄 (después de implementación)

---

## Conclusión

Este plan mejorado incluye:

✅ **Arquitectura más robusta** con SNS como intermediario  
✅ **Seguridad mejorada** con encriptación y RLS  
✅ **Manejo completo de errores** con logs y auditoría  
✅ **Threading de emails** para conversaciones agrupadas  
✅ **Gestión de bounces** y complaints  
✅ **Rate limiting** y prevención de spam  
✅ **Monitoreo y métricas** para administradores  
✅ **Plan de testing** exhaustivo  
✅ **Estimación de costos** transparente  

**¿Estás listo para que ejecute los cambios en la base de datos e implemente el código?**
