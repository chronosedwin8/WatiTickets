> **Nota:** las credenciales de este documento fueron redactadas y deben considerarse
> comprometidas. Rótalas en la consola de AWS si siguen activas.

# Configuración de Amazon SES para TicketWati

> Guía para configurar el flujo completo de email-to-ticket usando Amazon SES, S3 y SNS.

---

## Estado actual verificado

- Credenciales SES válidas (usuario IAM: Watitickets)
- Cuota: 200 emails/24h, 1/segundo (modo Sandbox)
- Bucket configurado: `ticketwati-emails`
- Dominio configurado: `colegioaleman.edu.co`
- Región: `us-east-1`
- Email remitente: `eortiz@colegioaleman.edu.co`

---

## Parte 1: Salir del Sandbox de SES

> En sandbox solo puedes enviar a emails verificados. Para enviar a cualquier dirección, debes solicitar acceso a producción.

1. Ve a **AWS Console → SES → Account dashboard**
2. Clic en **"Request production access"**
3. Llena el formulario:
   - Mail type: **Transactional**
   - Website URL: tu dominio
   - Use case: Sistema de tickets de soporte interno
   - Expected volume: < 1000/día
4. AWS aprueba en 24-48h

> **Mientras esperas**: verifica manualmente `eortiz@colegioaleman.edu.co` en:
> SES → Verified Identities → Create identity (Email address)
> Recibirás un link de confirmación en ese correo.

---

## Parte 2: Verificar dominio colegioaleman.edu.co

1. **SES → Verified Identities → Create identity**
2. Seleccionar **Domain**
3. Escribir `colegioaleman.edu.co`
4. Activar **Easy DKIM** (RSA 2048)
5. AWS te dará registros DNS para agregar en tu proveedor de dominio:

| Tipo | Nombre | Valor |
|------|--------|-------|
| CNAME | `_domainkey1._domainkeys.colegioaleman.edu.co` | (valor que da AWS) |
| CNAME | `_domainkey2._domainkeys.colegioaleman.edu.co` | (valor que da AWS) |
| CNAME | `_domainkey3._domainkeys.colegioaleman.edu.co` | (valor que da AWS) |
| TXT | `_amazonses.colegioaleman.edu.co` | (valor que da AWS) |
| MX | `colegioaleman.edu.co` | `10 inbound-smtp.us-east-1.amazonaws.com` |

> El registro **MX** es fundamental para recibir emails entrantes en SES.

---

## Parte 3: Crear bucket S3 `ticketwati-emails`

### 3.1 Crear el bucket

1. **AWS Console → S3 → Create bucket**
   - Name: `ticketwati-emails`
   - Region: `us-east-1` (misma que SES)
   - Block all public access: **ON**

### 3.2 Crear carpetas dentro del bucket

- `incoming/`
- `processed/`
- `unmatched/`

### 3.3 Agregar Bucket Policy

S3 → bucket `ticketwati-emails` → Permissions → Bucket Policy:

```json
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
          "aws:Referer": "TU_ACCOUNT_ID_AWS"
        }
      }
    }
  ]
}
```

> Reemplaza `TU_ACCOUNT_ID_AWS` con tu Account ID de AWS (aparece arriba a la derecha en la consola, formato: `123456789012`).

---

## Parte 4: Crear SNS Topic

### 4.1 Crear el topic

1. **AWS Console → SNS → Create topic**
   - Type: **Standard**
   - Name: `ticketwati-inbound-email`
2. Copiar el **Topic ARN** generado (formato: `arn:aws:sns:us-east-1:ACCOUNT_ID:ticketwati-inbound-email`)

### 4.2 Crear suscripción al topic

SNS → topic `ticketwati-inbound-email` → Create subscription:

| Campo | Valor |
|-------|-------|
| Protocol | HTTPS |
| Endpoint | `https://giwwqsfnumzumotfgsev.supabase.co/functions/v1/process-inbound-email` |
| Enable raw message delivery | **OFF** (desactivado) |

> La suscripción quedará en **Pending confirmation**. Se confirma automáticamente porque la edge function ya maneja el mensaje `SubscriptionConfirmation` de SNS.

---

## Parte 5: Crear Receipt Rule en SES

### 5.1 Crear/activar Rule Set

1. **SES → Email receiving → Rule sets**
2. Si no hay un rule set activo:
   - Clic **Create rule set**
   - Nombre: `ticketwati-rules`
   - Clic **Set as active**

### 5.2 Crear la regla

Dentro del rule set activo, clic **Create rule**:

**Step 1 — Recipients** (emails que activan la regla):

Agregar los emails de los departamentos configurados en TicketWati, por ejemplo:
- `soporte.sistemas@colegioaleman.edu.co`
- `soporte.calidad@colegioaleman.edu.co`
- `comunicaciones@colegioaleman.edu.co`

O agregar el dominio completo `colegioaleman.edu.co` para capturar todos los emails del dominio.

**Step 2 — Actions** (en orden):

| # | Action | Configuración |
|---|--------|--------------|
| 1 | **S3** | Bucket: `ticketwati-emails`, Prefix: `incoming/`, SNS Topic: ARN del paso 4 |

**Step 3 — Details**:
- Rule name: `ticketwati-receive-emails`
- Status: **Enabled**

---

## Flujo completo una vez configurado

```
Email enviado a soporte.sistemas@colegioaleman.edu.co
        ↓
    SES recibe el email (gracias al registro MX)
        ↓
    SES guarda el email en S3: ticketwati-emails/incoming/[message-id]
        ↓
    S3 notifica via SNS al topic ticketwati-inbound-email
        ↓
    SNS hace POST HTTPS a la Edge Function:
    https://giwwqsfnumzumotfgsev.supabase.co/functions/v1/process-inbound-email
        ↓
    Edge Function:
    → Descarga el email de S3
    → Identifica el departamento (por email de destino)
    → Crea el ticket en TicketWati
    → Mueve email a processed/
        ↓
    ¡Ticket creado automáticamente!
```

---

## Permisos IAM requeridos

El usuario **Watitickets** (`AKIA****************[REDACTADO]`) necesita las siguientes políticas en IAM:

| Política AWS | Para qué sirve |
|-------------|----------------|
| `AmazonSESFullAccess` | Enviar emails y leer configuración SES |
| `AmazonS3FullAccess` (o policy granular al bucket) | Leer/mover emails en `ticketwati-emails` |

> **Nota sobre credenciales S3**: El usuario S3 (`webcolegios3`, key: `AKIA****************[REDACTADO]`) es diferente al usuario SES (Watitickets). La edge function usa las credenciales SES para acceder a S3. Para simplificar, **asigna permisos S3 al usuario Watitickets** también, o crea una política inline en IAM para acceso granular solo al bucket `ticketwati-emails`.

### Policy granular S3 para Watitickets (recomendada)

En IAM → Users → Watitickets → Add permissions → Create inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:CopyObject"
      ],
      "Resource": "arn:aws:s3:::ticketwati-emails/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::ticketwati-emails"
    }
  ]
}
```

---

## Edge Functions desplegadas en Supabase

| Función | URL | Propósito |
|---------|-----|-----------|
| `process-inbound-email` | `.../functions/v1/process-inbound-email` | Recibe notificación SNS, descarga email de S3, crea ticket |
| `send-email-reply` | `.../functions/v1/send-email-reply` | Envía respuestas de tickets por SES |
| `test-ses-connection` | `.../functions/v1/test-ses-connection` | Verifica credenciales y cuota SES |

> URL base: `https://giwwqsfnumzumotfgsev.supabase.co`

---

## Checklist de configuración

- [ ] Salir del Sandbox de SES (solicitar producción)
- [ ] Verificar email `eortiz@colegioaleman.edu.co` en SES
- [ ] Verificar dominio `colegioaleman.edu.co` en SES
- [ ] Agregar registros DNS (CNAME x3, TXT, MX)
- [ ] Crear bucket S3 `ticketwati-emails`
- [ ] Crear carpetas: `incoming/`, `processed/`, `unmatched/`
- [ ] Agregar Bucket Policy para SES
- [ ] Agregar permisos S3 al usuario IAM Watitickets
- [ ] Crear SNS Topic `ticketwati-inbound-email`
- [ ] Crear suscripción HTTPS al SNS apuntando a la edge function
- [ ] Crear Receipt Rule en SES con acción S3
- [ ] Configurar emails de departamentos en TicketWati (Integración Email → Mapeo)
- [ ] Probar enviando un email a un departamento configurado
- [ ] Verificar que el ticket se crea en TicketWati

---

*Documento generado: 2026-03-21 | Proyecto: TicketWati | Región AWS: us-east-1*
