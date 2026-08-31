# Dashboard ejecutivo V0

Objetivo: tener una vista ejecutiva de operaciones, cotizaciones y tiempos/calidad sin subir correos crudos ni datos sensibles a GitHub.

## Modelo recomendado

- GitHub guarda el codigo del dashboard, playbooks y scripts.
- Las memorias locales (`work/*.json`) no se suben al repo.
- La automatizacion genera `dashboard/data/current.json` desde memorias locales.
- Cloudflare Pages recibe el folder `dashboard/` por Direct Upload.
- Cloudflare Access protege el sitio antes de publicar datos reales.

## Datos que muestra

- Pendientes operativos abiertos por criticidad.
- Cotizaciones por semaforo y estatus.
- Referencias historicas que siguen vivas.
- Ultimas acciones sugeridas.
- Alertas por informacion incompleta o falta de evidencia.

## Como actualizar la data local

```powershell
node scripts/build-dashboard-data.js
```

Luego abrir el dashboard con el servidor local:

```powershell
npm run serve:dashboard
```

## Cloudflare Pages

El despliegue real debe hacerse con Cloudflare Pages por Direct Upload:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudflare.ps1 -AccessReady
```

El switch `-AccessReady` confirma que la politica de Cloudflare Access ya esta activa. Sin ese switch, el script se detiene.

## Regla de privacidad

No subir `dashboard/data/current.json` ni `work/*.json` a un repositorio publico. GitHub Pages no es el canal para el dashboard real.
