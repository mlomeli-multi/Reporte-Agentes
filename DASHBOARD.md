# Dashboard operativo V0

Objetivo: tener una vista ejecutiva de operaciones, cotizaciones y tiempos/calidad sin subir correos crudos ni datos sensibles a GitHub.

## Modelo recomendado

- GitHub guarda el codigo del dashboard, playbooks y scripts.
- Las memorias locales (`work/*.json`) no se suben al repo.
- La automatizacion genera `dashboard/data/current.json` desde memorias locales.
- El dashboard carga ese JSON y muestra una foto de control.

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

Luego abrir `dashboard/index.html` con un servidor local o publicar el folder `dashboard/` en GitHub Pages si la data ya fue sanitizada.

## GitHub Pages

La publicacion esta preparada con GitHub Actions. Cuando Pages quede habilitado, la URL esperada es:

```text
https://mlomeli-multi.github.io/Reporte-Agentes/
```

En el repo, ir a `Settings > Pages` y seleccionar `GitHub Actions` como fuente de publicacion. Despues de eso, cada push a `main` despliega el dashboard.

## Regla de privacidad

No subir `dashboard/data/current.json` ni `work/*.json` a un repositorio publico. Para GitHub Pages publico, crear una version sanitizada sin links de Outlook, nombres personales sensibles ni detalle comercial.
