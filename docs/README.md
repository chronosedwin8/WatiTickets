# Documentación

| Documento | Contenido |
|---|---|
| [`../README.md`](../README.md) | Instalación, arquitectura, comandos y referencia de la API |
| **Guía de uso** | Manual completo por roles, dentro de la propia aplicación en `/ayuda` |
| [`historico/`](historico/) | Documentos anteriores a la migración. Se conservan como referencia, pero describen la arquitectura basada en Supabase que ya no está en uso |

## Sobre el histórico

Los documentos de `historico/` corresponden a la etapa en la que el proyecto
funcionaba sobre Supabase. Se mantienen porque explican decisiones de producto
y hallazgos que siguen siendo válidos, pero **sus indicaciones técnicas están
obsoletas**: ya no existen Edge Functions, ni políticas RLS, ni claves de
proveedor en la base de datos.
