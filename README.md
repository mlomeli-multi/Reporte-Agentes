# Reporte Agentes

Dashboard ejecutivo para seguimiento de prioridades Outlook, cotizaciones, referencias historicas y tiempos/calidad.

## Canal real

El dashboard con datos reales debe publicarse en Cloudflare Pages protegido con Cloudflare Access.

GitHub se usa solo para guardar codigo y documentacion. Este repositorio no debe contener datos reales de Outlook, Google Sheet, clientes, referencias, links internos ni memorias locales.

## Datos locales

El archivo real se genera localmente:

```powershell
npm run data:dashboard
```

Salida local:

```text
dashboard/data/current.json
```

Ese archivo esta ignorado por Git.

## Cloudflare

Ver instrucciones en `CLOUDFLARE.md`.
