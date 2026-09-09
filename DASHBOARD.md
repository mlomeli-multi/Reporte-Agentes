# Dashboard ejecutivo

Objetivo: tener una vista ejecutiva de operaciones, cotizaciones y tiempos/calidad sin subir correos crudos ni datos sensibles a GitHub.

## Estado

- V0: dashboard funcional con foto local `dashboard/data/current.json`.
- V1: modelo de datos para mini TMS ejecutivo privado documentado en `docs/modelo-datos-v1.md`.
- 6.5.1: capa de decision ejecutiva por referencia.
- 6.5.2: tablas ejecutivas compactas con detalle expandible por fila, selector de densidad y prioridad visual por decision.
- 6.5.3: vistas dinamicas tipo Airtable con filtros persistentes, ordenamiento por columnas y memoria local de vista.
- 6.5.4: historial accionable con indicadores filtrados, mezcla de cambios, referencias con mas movimiento y timeline reciente.
- 6.5.5: tablero de tiempos/calidad con promedios filtrados, carga por responsable, cola roja/gris y estado de medicion.
- 6.5.6: tablero de cotizaciones con pipeline comercial, carga por usuario, cola de cierres y etapa comercial filtrable.
- 6.5.7: mando ejecutivo con alertas accionables, prioridades destacadas y borrador de reporte reutilizable.
- Paso 5: reporte ejecutivo estructurado por bloques, riesgos, acciones para Miguel y cobertura, reutilizable en dashboard y reporte local.
  - Cerrado: `executive_digest.reporte` ya incluye `acciones_miguel_detalle`, `riesgos_detalle`, `bloques`, `cobertura_detalle` y `limitaciones`.
- Nuevo paso 1: separacion Operacion vs Cotizacion aplicada en el generador.
  - Cerrado: `scripts/build-dashboard-data.js` clasifica candidatas como `operacion`, `cotizacion` o `incierto`; Operacion solo acepta embarque SAM o senal operativa clara.
- Nuevo paso 2: ruteo de Outlook hacia memorias correctas.
  - Cerrado: `scripts/import-outlook-snapshot.js` manda cadenas operativas a `work/outlook-pendientes-abiertos.json` y senales comerciales a `work/cotizaciones-seguimiento-metricas.json`.
- Nuevo paso 3: auditoria de cadenas por referencia.
  - Cerrado: cada operacion incluye `auditoria_cadenas`, `auditoria_cadenas_status`, severidad, actores mezclados y bandera `necesita_validar_cadena`.
  - La mezcla normal de cliente/CNEE/shipper/proveedor se muestra como contexto; fuerza validacion cuando hay baja confianza, cadena por validar, varios actores en alerta o varias referencias dentro del mismo hilo.
  - Cerrado extra: el motor ahora guarda `thread_identity`, `thread_display`, `reference_scope`, `chain_refs_count` y `chain_has_multiple_refs` para separar INT origen vs embarque SAM real.
- Nuevo paso 4: separacion de equipo responsable.
  - Cerrado: operaciones, cotizaciones y tiempos ya clasifican `responsable_equipo`, `responsable_area`, `responsable_equipo_reason` y `responsable_equipo_confidence`.
  - Pricing se separa por modalidad cuando hay evidencia: `pricing_aereo`, `pricing_maritimo`, `pricing_terrestre`, `pricing_warehouse` o `pricing_general`.
  - Operacion se separa por carril: `ops_aereo`, `ops_maritimo`, `ops_terrestre`, `ops_warehouse`, `documental_sam`, `equipo_mi`, `externo` o `incierto`.
- Nuevo paso 5: confianza de lectura antes de accionar.
  - Cerrado: cada operacion, cotizacion y medicion de tiempos incluye `lectura_confianza`, `lectura_confianza_reason`, `lectura_confianza_rank` y `accion_lista`.
  - El dashboard separa `accion_confiable`, `accion_probable`, `validar_antes`, `sin_evidencia_suficiente` y `monitoreo_controlado`.
  - El mando ejecutivo muestra una tira de confianza, filtros por lectura y una vista rapida para validar cadenas antes de actuar.
- Nuevo paso 6: bandeja ejecutiva de validacion de cadenas.
  - Cerrado: la pestaña Operacion ahora muestra una auditoria de cadenas con conteo de acciones por validar, actores en alerta, multiples alertas y cadenas activas.
  - La cola de revision muestra la cadena accionable, actor, motivo y accion antes de tratar una referencia como instruccion segura.
  - Los botones de la bandeja abren la fila filtrada para revisar evidencia y cadenas relacionadas.
- Nuevo paso 7: explicabilidad y calidad del dato.
  - Cerrado: el dashboard muestra una capa ejecutiva de por que aparece cada alerta, separando registros confiables, probables, validaciones, evidencia sin link directo y Sheet desfasado.
  - Cada detalle expandible incluye fuente, regla aplicada, numero de evidencias, faltantes de revision y resumen de soporte.
  - La cola de calidad del dato prioriza registros que pueden contaminar el reporte si se tratan como accion segura sin validar.
- Nuevo paso 8: reporte automatico con confianza separada.
  - Cerrado: el paquete ejecutivo genera `acciones_listas_detalle`, `acciones_probables_detalle`, `validaciones_detalle` y `calidad_dato`.
  - El reporte local ya imprime secciones separadas para acciones listas, acciones probables y validaciones antes de actuar.
  - La cobertura del reporte incluye conteos de calidad de lectura para evitar que un pendiente dudoso se convierta en instruccion segura.
- Punto 4: historial limpio.
  - Cerrado: `scripts/lib/history-engine.js` filtra eventos rutinarios, deduplica por tipo + referencia y conserva el evento mas accionable.
  - En operacion el historial se agrupa por embarque SAM primero; en cotizacion se agrupa por INT primero.
  - `history_summary` y `history_raw_summary` permiten auditar eventos crudos, candidatos, filtrados y duplicados.
- Punto 5: dashboard ejecutivo final.
  - Cerrado: la primera lectura ahora abre con una mesa de mando ejecutiva: acciones listas, validaciones, cotizaciones bloqueadas y tiempos/calidad.
  - Las tarjetas de mando son clicables y abren la tabla correcta con la subcola mas relevante.
  - La salud de memoria muestra eventos visibles, crudos, duplicados filtrados, ruido sin cambio y referencias sin INT/embarque.
  - El historial incluye filtro de referencias sin sistema para separar asuntos importantes que requieren validar INT o embarque antes de accionar.
  - Pulido final: la mesa de mando prioriza el frente actual y evita que el backlog historico domine la primera lectura.
  - Pulido final: los chips de filtros ahora son removibles individualmente, acercando el trabajo de tablas a una experiencia tipo Airtable.
  - Pulido final: la fila de vistas rapidas ocupa menos alto y permite navegar subcolas horizontalmente sin empujar las tablas.
  - Pulido final: la celda de referencia muestra mejor la jerarquia embarque/INT y evita etiquetas duplicadas.
  - Pulido final: las operaciones se consolidan por embarque/INT ejecutivo para evitar filas repetidas; las cadenas quedan auditables en el detalle.
- Punto 6: automatizacion diaria estable.
  - Cerrado: `scripts/lib/report-window-engine.js` decide manana, mediodia y cierre con ventanas amplias, tardios utiles y control anti duplicado.
  - Cerrado: `npm run report:check` permite al heartbeat saber si debe correr o responder `DONT_NOTIFY` antes de leer Outlook/Sheet.
  - Cerrado: `npm run report:auto` usa la misma regla, registra estado de ventana y evita generar reportes manuales accidentales fuera de horario.
  - Cerrado: la automatizacion guardada en Codex apunta primero al chequeo previo y no publica a Cloudflare salvo instruccion expresa.
- Punto 7: publicacion privada automatizable.
  - Cerrado: `npm run report:auto:deploy` genera solo cuando toca ventana valida y publica en Cloudflare Pages protegido con Access.
  - Cerrado: el reporte registra si la publicacion a Cloudflare fue exitosa o fallo, sin subir datos reales a GitHub.
- 6.5.x: regla tecnica de cambio de mes: mes activo como frente principal y meses anteriores solo como historicos vivos.

## Modelo recomendado

- GitHub guarda el codigo del dashboard, playbooks y scripts.
- Las memorias locales (`work/*.json`) no se suben al repo.
- La automatizacion genera `dashboard/data/current.json` desde memorias locales.
- Cloudflare Pages recibe el folder `dashboard/` por Direct Upload.
- Cloudflare Access protege el sitio antes de publicar datos reales.

## Datos que muestra

- Pendientes operativos abiertos por criticidad.
- Separacion entre mes actual e historicos vivos.
- Decision ejecutiva y cola de trabajo para cada referencia.
- Cotizaciones por semaforo y estatus.
- Referencias historicas que siguen vivas.
- Ultimas acciones sugeridas.
- Alertas por informacion incompleta o falta de evidencia.

## Lectura de tablas

- La vista principal debe servir para escanear: referencia, cliente, decision, estado, pelota y accion.
- En operacion, la primera columna usa la jerarquia `embarque > INT`: si ya existe `AM/EA/AA/...`, ese embarque manda como operacion real y el `INT` queda como origen comercial.
- Una cadena con solo `INT` y senales de pricing/cotizacion no entra a Operacion; vive en Cotizaciones hasta que aparezca embarque o una senal operativa clara.
- El dashboard reporta `operaciones_candidatas`, `operaciones_excluidas_cotizacion` y `operaciones_inciertas_descartadas` para auditar esta separacion.
- El importador de Outlook aplica la misma regla antes de actualizar memorias: si el correo es comercial, agrega `estado_correo`, evidencia y `source_outlook_snapshot` a la memoria de cotizaciones sin cambiar el `estatus_sheet`.
- Una misma `INT` puede aparecer en varias cadenas separadas si hay actores distintos como cliente, CNEE, shipper, agente, proveedor o pricing.
- Cada cadena guarda `actor_detection_reason`, `actor_confidence` y `sender_domain` para auditar por que el motor la clasifico como cliente, CNEE, shipper, proveedor, agente, pricing o MULTI.
- El catalogo privado `work/catalogo-actores-v1.json` permite ajustar nombres/dominios de clientes, agentes y proveedores sin tocar codigo; el repo publico solo conserva `docs/catalogo-actores-v1.example.json`.
- La accion principal de una operacion sale de `cadena_accionable`: el motor elige la cadena mas relevante por alerta, actor, criticidad y fecha antes de recomendar accion.
- Cada accion trae tipo, criterio y confianza; si la cadena o actor no son confiables, la accion se degrada a validar cadena antes de actuar.
- El detalle de cada operacion muestra cadenas relacionadas para auditar por que se eligio esa accion.
- El detalle tambien muestra auditoria de cadenas: `ok`, `actores_mixtos`, `multiples_alertas`, `actores_mixtos_en_alerta`, `requiere_validacion` o `sin_cadenas`.
- Si una cadena mezcla varios embarques o varios INT, la auditoria queda como `referencias_multiples_en_cadena`; primero hay que separar el hilo correcto y despues accionar.
- `actores_mixtos` no significa error por si solo; solo advierte que la referencia tiene varias conversaciones y la accion debe leerse desde la cadena elegida.
- La lectura de confianza evita que una recomendacion dudosa se presente como instruccion segura: si hay cadena/actor/sync por revisar, cae en `validar_antes`.
- La bandeja de auditoria de cadenas convierte esas dudas en trabajo visible: primero se valida la conversacion correcta, despues se decide si es operacion, cotizacion o solo monitoreo.
- La capa de explicabilidad muestra el criterio de entrada al reporte: fuente, regla aplicada, confianza, evidencias y que falta revisar.
- Si un registro no tiene link directo, no se oculta; se marca como evidencia resumida/memoria para no confundirlo con accion totalmente comprobada.
- El reporte automatico reutiliza esa confianza: primero muestra acciones listas, despues acciones probables y al final validaciones previas.
- Los textos largos viven en `Detalle`, junto con motivo, ultimo movimiento, responsable, fuente y evidencia.
- La primera columna se mantiene fija para no perder la referencia al navegar horizontalmente.
- El selector `Comoda / Compacta` permite alternar entre lectura amplia y mesa de trabajo densa.
- Las filas usan una marca lateral de color para distinguir atencion inmediata, inconsistencias, seguimiento y espera.
- Los filtros de `Periodo` y `Mes` separan el frente actual de referencias antiguas que siguen vivas.
- Los encabezados de tabla permiten ordenar por referencia, cliente, estado, pelota, tiempos o accion.
- Las vistas de filtros y orden se recuerdan en el navegador local para continuar el analisis sin reconstruirlo cada vez.
- El historial muestra comportamiento: cambios por referencia, cambios que empeoraron o quedaron desfasados, cambio de pelota y timeline reciente.
- El historial limpio no intenta mostrar todo: elimina sin-cambios rutinarios, conserva historicos vivos y mantiene un evento representativo por referencia/tipo.
- Las referencias con mas movimiento se pueden usar como acceso rapido para filtrar el historial.
- La pestaña de tiempos/calidad resume la vista filtrada: primera respuesta, pricing, rojos abiertos, mediciones sin evidencia, responsables con carga y cola de calidad.
- La pestaña de cotizaciones separa etapa comercial, usuario, atoros y cierres inmediatos para convertir pricing respondido en accion visible.
- La pestaña de cotizaciones separa `pendiente_pricing_sheet` de `pricing_pendiente_real`: `Pendiente de Coti. Pricing` viene del Sheet, pero si Outlook ya mostro respuesta, duda o envio, deja de contarse como pendiente real.
- `Cotizado Agentes`, `Cotizado Pricing` y `Cotizado Pricing Fuera de tiempo` se tratan como cotizadas; nunca deben inflar pendientes de Pricing.
- El filtro de equipo responsable ya distingue Pricing por modalidad, Operacion por carril y Documental/SAM para evitar que todo caiga en un solo saco llamado MULTI.
- El mando ejecutivo superior usa `executive_digest` para mostrar alertas clicables y preparar el reporte por bloques sin tocar Outlook ni Google Sheet.
- La mesa de mando resume la accion ejecutiva antes de entrar a tablas: mover, validar, destrabar cotizaciones o revisar respuesta/calidad.
- La tarjeta de memoria limpia ayuda a auditar si el dashboard esta leyendo comportamiento real o si hay ruido por duplicados, sin-cambios o referencias sin sistema.

## Cambio de mes

- El dashboard toma el mes activo desde `work/reporte-automation-state.json`, campo `last_sheet_scan.tab`.
- Si hoy el Sheet activo es `Septiembre`, las referencias `INT09` son `mes_actual`.
- Referencias `INT08`, `INT07` o anteriores siguen visibles solo si la memoria local las mantiene vivas o con inconsistencia.
- Cada fila trae `mes_origen`, `mes_codigo`, `periodo_trabajo`, `es_mes_actual` y `es_historico_vivo`.
- `scripts/import-sheet-cotizaciones-snapshot.js` convierte solo filas reales del Sheet; ignora referencias apartadas sin cliente, servicio, usuario, estatus, embarque ni feedback.

## Pestañas objetivo V1

- Operacion: referencias vivas, proceso actual, siguiente accion, pelota, responsable y referencia SAM.
- Tiempos y calidad: tiempos de respuesta cliente/MULTI/pricing y observaciones privadas de calidad.
- Cotizaciones: pendientes pricing, pricing respondio falta enviar, enviadas esperando cliente, dudas y cierres con SAM.

## Como actualizar la data local

Primero, despues de leer el Google Sheet en modo solo lectura, guardar la foto privada en `work/sheet-cotizaciones-snapshot.json` e importarla a memoria:

```powershell
npm run data:sheet-snapshot
```

Luego regenerar la foto privada del dashboard:

```powershell
node scripts/build-dashboard-data.js
```

Luego abrir el dashboard con el servidor local:

```powershell
npm run serve:dashboard
```

## Automatizacion real local

El flujo operativo ya puede correr con un solo comando local. La corrida hace esto:

- toma la foto privada del Google Sheet si existe en `work/sheet-cotizaciones-snapshot.json`;
- importa cambios del Sheet a la memoria local de cotizaciones cuando la foto es mas nueva;
- toma la foto privada de Outlook si existe en `work/outlook-messages-snapshot.json`;
- importa hallazgos operativos del correo a la memoria local cuando la foto es mas nueva;
- regenera `dashboard/data/current.json` con el modelo V1;
- genera un reporte privado en `work/reports/generated/`;
- actualiza `work/reporte-automation-state.json`;
- guarda historial de corridas en `work/dashboard-runs-history.json`;
- si se corre con `--deploy`, publica la foto final a Cloudflare y registra el resultado.

Corrida manual para trabajar o validar:

```powershell
npm run report:manual
```

Chequeo previo sin actualizar datos ni tocar fuentes:

```powershell
npm run report:check
```

Corrida automatica por ventana del dia:

```powershell
npm run report:auto
```

La corrida automatica usa la misma regla que `report:check`: detecta si toca manana, mediodia o cierre, marca reportes adelantados/tardios y responde `DONT_NOTIFY` si el periodo ya fue generado o ya no esta en ventana util.

Corrida automatica por ventana del dia con publicacion privada en Cloudflare:

```powershell
npm run report:auto:deploy
```

Este comando solo publica cuando realmente genera reporte. Si `report:check` o la regla interna determinan duplicado/fuera de ventana, termina sin leer fuentes ni desplegar.

Publicar a Cloudflare solo cuando Access ya esta activo y se quiera mandar la foto real al sitio privado:

```powershell
npm run report:deploy
```

Por seguridad, la publicacion no corre por defecto.

## Cloudflare Pages

El despliegue real debe hacerse con Cloudflare Pages por Direct Upload:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudflare.ps1 -AccessReady
```

El switch `-AccessReady` confirma que la politica de Cloudflare Access ya esta activa. Sin ese switch, el script se detiene.

Cuando ya vienes de `report:auto:deploy`, el flujo usa `-SkipDataBuild` para publicar exactamente la foto final del reporte.

## Regla de privacidad

No subir `dashboard/data/current.json` ni `work/*.json` a un repositorio publico. GitHub Pages no es el canal para el dashboard real.
