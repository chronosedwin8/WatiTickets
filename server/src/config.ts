/**
 * Configuración central del servidor.
 *
 * Regla del proyecto: NADA hardcodeado. Todo valor operativo se lee de
 * variables de entorno. Los secretos no tienen valor por defecto: si faltan
 * en producción el arranque se detiene con un mensaje claro.
 */
import 'dotenv/config'
import { z } from 'zod'
import crypto from 'node:crypto'
import path from 'node:path'

const bool = (def: boolean) =>
    z
        .string()
        .optional()
        .transform((v) => (v === undefined || v === '' ? def : /^(1|true|yes|on)$/i.test(v)))

const int = (def: number) =>
    z
        .string()
        .optional()
        .transform((v) => (v === undefined || v === '' ? def : Number(v)))
        .pipe(z.number().int())

const csv = (def: string[]) =>
    z
        .string()
        .optional()
        .transform((v) =>
            v === undefined || v.trim() === ''
                ? def
                : v.split(',').map((s) => s.trim()).filter(Boolean)
        )

const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: int(4000),
    HOST: z.string().default('0.0.0.0'),

    // ── Base de datos ──────────────────────────────────────────────
    // Se acepta una URL completa o las piezas sueltas.
    DATABASE_URL: z.string().optional(),
    PGHOST: z.string().default('localhost'),
    PGPORT: int(5432),
    PGDATABASE: z.string().default('ticketwati'),
    PGUSER: z.string().default('postgres'),
    PGPASSWORD: z.string().optional(),
    PGSSL: bool(false),
    PG_POOL_MAX: int(10),

    // ── Autenticación ──────────────────────────────────────────────
    JWT_SECRET: z.string().optional(),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL_DAYS: int(30),
    BCRYPT_ROUNDS: int(10),
    // Permite (o no) que cualquiera se registre y cree organización.
    ALLOW_PUBLIC_SIGNUP: bool(false),

    // ── CORS / red ─────────────────────────────────────────────────
    CORS_ORIGINS: csv(['http://localhost:3000', 'http://localhost:5173']),
    TRUST_PROXY: bool(false),
    RATE_LIMIT_WINDOW_MS: int(60_000),
    RATE_LIMIT_MAX: int(300),
    AUTH_RATE_LIMIT_MAX: int(10),

    // ── Almacenamiento de adjuntos ─────────────────────────────────
    // 'local' = disco del servidor. 's3' = bucket compatible S3.
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('./storage'),
    STORAGE_MAX_FILE_MB: int(25),
    STORAGE_ALLOWED_MIME: csv([
        'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed',
    ]),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),

    // ── Correo saliente (SMTP) ─────────────────────────────────────
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: int(587),
    SMTP_SECURE: bool(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().optional(),
    MAIL_FROM_NAME: z.string().default('TicketWati'),

    // ── Integración con el agente de inventario (Python) ───────────
    // Clave compartida que el agente envía en la cabecera X-Agent-Key.
    HARDWARE_AGENT_KEY: z.string().optional(),

    // ── Frontend ───────────────────────────────────────────────────
    // Base pública usada en los enlaces de los correos.
    APP_PUBLIC_URL: z.string().default('http://localhost:3000'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
    const detalle = parsed.error.issues
        .map((i) => `  · ${i.path.join('.')}: ${i.message}`)
        .join('\n')
    console.error(`No se pudo leer la configuración del entorno:\n${detalle}`)
    process.exit(1)
}

const env = parsed.data
const isProd = env.NODE_ENV === 'production'

/** Falla el arranque en producción si falta un secreto obligatorio. */
function requiredInProd(value: string | undefined, name: string, comoGenerar: string): string {
    if (value && value.trim() !== '') return value
    if (isProd) {
        console.error(
            `Falta la variable de entorno ${name}, obligatoria en producción.\n` +
            `Genérala así: ${comoGenerar}`
        )
        process.exit(1)
    }
    // En desarrollo se genera una efímera para no bloquear el arranque.
    const efimero = crypto.randomBytes(48).toString('base64url')
    console.warn(
        `[config] ${name} no definida: se usa un valor temporal solo para desarrollo. ` +
        `Las sesiones se invalidarán al reiniciar.`
    )
    return efimero
}

export const config = {
    env: env.NODE_ENV,
    isProd,
    isDev: env.NODE_ENV === 'development',
    port: env.PORT,
    host: env.HOST,
    trustProxy: env.TRUST_PROXY,

    db: {
        connectionString: env.DATABASE_URL,
        host: env.PGHOST,
        port: env.PGPORT,
        database: env.PGDATABASE,
        user: env.PGUSER,
        password: env.PGPASSWORD,
        ssl: env.PGSSL,
        max: env.PG_POOL_MAX,
    },

    auth: {
        jwtSecret: requiredInProd(
            env.JWT_SECRET,
            'JWT_SECRET',
            `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
        ),
        accessTtl: env.JWT_ACCESS_TTL,
        refreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
        bcryptRounds: env.BCRYPT_ROUNDS,
        allowPublicSignup: env.ALLOW_PUBLIC_SIGNUP,
    },

    cors: { origins: env.CORS_ORIGINS },

    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        authMax: env.AUTH_RATE_LIMIT_MAX,
    },

    storage: {
        driver: env.STORAGE_DRIVER,
        localDir: path.resolve(process.cwd(), env.STORAGE_LOCAL_DIR),
        maxFileBytes: env.STORAGE_MAX_FILE_MB * 1024 * 1024,
        allowedMime: env.STORAGE_ALLOWED_MIME,
        s3: {
            endpoint: env.S3_ENDPOINT,
            region: env.S3_REGION,
            bucket: env.S3_BUCKET,
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
    },

    mail: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.MAIL_FROM,
        fromName: env.MAIL_FROM_NAME,
        get enabled() {
            return Boolean(env.SMTP_HOST && env.MAIL_FROM)
        },
    },

    hardwareAgent: {
        key: env.HARDWARE_AGENT_KEY,
        get enabled() {
            return Boolean(env.HARDWARE_AGENT_KEY)
        },
    },

    appPublicUrl: env.APP_PUBLIC_URL,
} as const

export type AppConfig = typeof config
