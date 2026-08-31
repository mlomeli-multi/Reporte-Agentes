# Publicacion privada en Cloudflare

Este dashboard debe publicar datos reales solo en Cloudflare Pages protegido con Cloudflare Access.

## Modelo seguro

- GitHub guarda solo codigo y documentacion.
- `dashboard/data/current.json` contiene datos reales y esta ignorado por Git.
- Cloudflare Pages recibe el folder local `dashboard/` por carga directa.
- Cloudflare Access debe proteger el sitio antes de subir datos reales.

## Crear el proyecto en Cloudflare Pages

1. Entrar a Cloudflare.
2. Ir a `Workers & Pages`.
3. Crear una aplicacion de Pages.
4. Usar `Direct Upload`, no Git integration, para que los datos reales no pasen por GitHub.
5. Nombre sugerido del proyecto: `reporte-agentes-mlti`.

## Activar privacidad con Cloudflare Access

1. Ir a `Workers & Pages`.
2. Abrir el proyecto `reporte-agentes-mlti`.
3. Activar una politica de Access para proteger el sitio.
4. Permitir solo el correo o correos autorizados.
5. Verificar que al abrir el sitio pida autenticacion.

Si se usa dominio propio, crear tambien una aplicacion de Access para ese hostname.

## Desplegar datos reales

Cuando Access ya este activo:

```powershell
npm run data:dashboard
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudflare.ps1 -AccessReady
```

El script vuelve a generar `dashboard/data/current.json` y despliega el folder `dashboard/` a Cloudflare Pages.

## Regla de privacidad

No subir a GitHub:

- `dashboard/data/current.json`
- archivos en `work/`
- memorias locales
- correos, links internos, clientes o referencias reales

GitHub Pages debe quedar sin uso para el dashboard real.
