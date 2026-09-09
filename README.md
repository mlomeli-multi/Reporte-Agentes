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

## Reporte y actualizacion automatizada

Para refrescar datos locales y generar el reporte privado:

```powershell
npm run report:manual
```

La salida queda en `work/reports/generated/` y tambien se actualiza `dashboard/data/current.json`.

Para usar la ventana del dia sin duplicar manana, mediodia o cierre:

```powershell
npm run report:auto
```

Para usar la ventana del dia y publicar el dashboard privado en Cloudflare cuando si hubo reporte:

```powershell
npm run report:auto:deploy
```

Para que la automatizacion revise si debe correr antes de leer fuentes:

```powershell
npm run report:check
```

Si el chequeo responde `DONT_NOTIFY`, no se leen Outlook/Sheet ni se actualizan archivos.

Para publicar en Cloudflare protegido con Access:

```powershell
npm run report:deploy
```

No modifica Outlook ni Google Sheet. Solo lee la foto local, actualiza memorias privadas, genera archivos locales y, si usas un comando con `deploy`, publica a Cloudflare protegido con Access.

La automatizacion real usa dos fotos privadas antes de generar el reporte:

- `work/sheet-cotizaciones-snapshot.json`: lectura del Google Sheet.
- `work/outlook-messages-snapshot.json`: lectura compacta de Outlook.

Ambas estan ignoradas por Git. El heartbeat puede actualizarlas con conectores en modo solo lectura y despues ejecutar `npm run report:auto:deploy` cuando Access este activo.

## Cloudflare

Ver instrucciones en `CLOUDFLARE.md`.

## Mini TMS V1

El contrato de datos para convertir el dashboard en mini TMS ejecutivo esta documentado en `docs/modelo-datos-v1.md`.

El ejemplo publico sin datos reales esta en `docs/data-contract-v1.example.json`.
