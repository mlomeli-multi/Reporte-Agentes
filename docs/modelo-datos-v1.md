# Modelo de datos V1 - Mini TMS ejecutivo privado

Objetivo: convertir Outlook + Google Sheet + memoria local en una capa de datos estable para el dashboard ejecutivo y los reportes diarios. El dashboard no debe leer Outlook ni Google Sheet directamente. La automatizacion lee fuentes, normaliza, guarda memoria local y genera una foto privada para Cloudflare.

## Principios

- Fuente de verdad operativa: Outlook para el ultimo movimiento real de una operacion.
- Fuente de verdad comercial/cotizacion: Google Sheet `COTIZACIONES AGENTES 2026 MLTI`.
- Fuente de continuidad: memorias locales en `work/*.json`.
- Publicacion: solo `dashboard/data/current.json` a Cloudflare Pages protegido con Access.
- GitHub: solo codigo, documentacion y ejemplos anonimos. No subir datos reales.
- Auditoria: cada estado importante debe tener evidencia visible o marcarse como `incierto`.

## Archivos del modelo

| Archivo | Tipo | Se sube a GitHub | Uso |
| --- | --- | --- | --- |
| `work/outlook-pendientes-abiertos.json` | memoria local real | No | Pendientes operativos vivos detectados en Outlook |
| `work/outlook-messages-snapshot.json` | foto privada real | No | Ultima lectura compacta de Outlook antes de importarla a memoria |
| `work/cotizaciones-seguimiento-metricas.json` | memoria local real | No | Cotizaciones vivas, estados, tiempos de pricing y equipo MI |
| `work/memoria-historica-referencias.json` | memoria local real | No | Referencias Julio/Agosto y futuras que siguen vivas |
| `work/reporte-automation-state.json` | memoria local real | No | Ultimas corridas, ventanas y control anti duplicados |
| `work/dashboard-runs-history.json` | historial local real | No | Registro de cada corrida generada para ver comportamiento de la automatizacion |
| `work/catalogo-actores-v1.json` | catalogo privado real | No | Reglas editables para reconocer clientes, agentes, proveedores, CNEE, shipper, pricing y MULTI |
| `dashboard/data/current.json` | foto privada generada | No | Data lista para dashboard Cloudflare |
| `docs/data-contract-v1.example.json` | ejemplo anonimo | Si | Contrato publico para desarrollo |
| `docs/catalogo-actores-v1.example.json` | ejemplo anonimo | Si | Plantilla publica del catalogo de actores |

## Entidades principales

### 1. Operacion

Representa una cadena operativa viva o cerrada recientemente. Puede iniciar como INT, pero cuando ya existe numero de embarque la operacion se identifica por ese embarque. La alerta debe nacer de la cadena de correo especifica, no de la referencia agregada.

Campos V1:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | ID interno estable. En operacion preferir numero de embarque; si no existe, usar `INTxx-yyyy-nnn` provisional o asunto normalizado |
| `primary_operation_ref` | string | No | Referencia principal operativa. Si hay embarque, debe ser el embarque; si no, puede ser el INT provisional |
| `operation_identity` | enum | Si | `embarque`, `int_provisional` o `cadena_sin_ref` |
| `int_ref` | string | No | Referencia INT cuando exista |
| `int_origin_ref` | string | No | INT de origen comercial ligado al embarque |
| `no_embarque` | string | No | Numero de embarque capturado desde Sheet o detectado en correo |
| `shipment_refs` | array string | No | Referencias de embarque relacionadas: AA, IA, EA, IM, EM, AM, DT, ET, IT, WH, DPA, EPA, IPA, APM, EPM, IPM, DPT, EPT, IPT |
| `sam_refs` | array string | No | Alias legacy de `shipment_refs` para compatibilidad del dashboard |
| `shipment_prefix` | string | No | Prefijo operativo: `AM`, `EA`, `AA`, etc. |
| `shipment_modalidad` | enum | No | Modalidad inferida desde la nomenclatura: `aereo`, `maritimo`, `terrestre`, `warehouse`, `proyecto`, `incierto` |
| `shipment_tipo` | string | No | Tipo inferido: importacion, exportacion, arrastre, domestico, proyecto, almacenaje |
| `actor_tipo` | enum | No | Tipo de cadena: `cliente`, `cnee`, `shipper`, `proveedor`, `agente`, `pricing`, `multi`, `actor_externo` |
| `actor_principal` | string | No | Nombre visible del remitente, cliente, proveedor o grupo mas probable |
| `actor_detection_reason` | string | No | Criterio usado para clasificar el actor, por ejemplo keyword CNEE, dominio externo o remitente MULTI |
| `actor_confidence` | enum | No | Confianza de lectura del actor: `alta`, `media`, `baja` |
| `sender_domain` | string | No | Dominio del remitente cuando esta disponible; ayuda a separar cliente vs MULTI/agente |
| `cadena_correo` | string | No | Nombre legible de la cadena usada para separar conversaciones |
| `email_thread_id` | string | No | Identificador de conversacion de Outlook si existe |
| `cliente` | string | Si | Cliente, agente o actor principal |
| `servicio` | string | No | DAP, EXW, FOB, D2D, Free Hand, Warehouse u otro |
| `modalidad` | enum | No | `aereo`, `maritimo`, `terrestre`, `warehouse`, `proyecto`, `mixto`, `incierto` |
| `estado_operativo` | enum | Si | Ver catalogo de estados |
| `criticidad` | enum | Si | `critico`, `alto`, `medio`, `bajo`, `incierto` |
| `decision_ejecutiva` | enum | Si | Ver capa de decision ejecutiva |
| `cola_trabajo` | enum | Si | Bandeja accionable: MULTI, pricing, cliente/agente, Sheet, SAM, documental o monitoreo |
| `nivel_decision` | number | Si | Orden interno para mostrar primero lo mas accionable |
| `motivo_prioridad` | string | Si | Explicacion breve y privada de por que aparece en esa decision |
| `pelota` | string | Si | Actor responsable del siguiente movimiento |
| `responsable_multi` | string | No | Persona/equipo probable dentro de MULTI |
| `responsable_equipo` | enum | No | Equipo probable que debe mover o monitorear: `equipo_mi`, `pricing_aereo`, `pricing_maritimo`, `pricing_terrestre`, `pricing_warehouse`, `pricing_general`, `ops_aereo`, `ops_maritimo`, `ops_terrestre`, `ops_warehouse`, `documental_sam`, `externo`, `incierto` |
| `responsable_area` | enum | No | Area ejecutiva resumida: `pricing`, `operacion`, `comercial`, `multi`, `externo`, `incierto` |
| `responsable_equipo_reason` | string | No | Criterio legible usado para asignar el equipo responsable |
| `responsable_equipo_confidence` | enum | No | Confianza de asignacion: `alta`, `media`, `baja` |
| `accion_sugerida` | string | Si | Siguiente accion concreta |
| `lectura_confianza` | enum | Si | `accion_confiable`, `accion_probable`, `validar_antes`, `sin_evidencia_suficiente` o `monitoreo_controlado` |
| `lectura_confianza_reason` | string | No | Explicacion breve de por que la accion es segura, probable o requiere validacion |
| `lectura_confianza_rank` | number | No | Orden interno para separar acciones confiables de validaciones |
| `accion_lista` | boolean | No | True cuando la accion puede trabajarse; false cuando primero conviene validar |
| `ultimo_movimiento_at` | datetime | No | Fecha/hora del ultimo correo o evidencia |
| `ultimo_movimiento_resumen` | string | Si | Resumen breve basado en evidencia |
| `evidencia` | object | Si | Link/tipo/fuente del soporte |
| `seguir_en_reportes_diarios` | boolean | Si | Control para radar diario |
| `tags` | array string | No | Ej. `cliente_top`, `sheet_desfasado`, `urgente`, `historico_vivo` |
| `mes_origen` | string | Si | Mes operativo inferido por embarque, referencia INT, Sheet, fecha o memoria. Ej. `Septiembre`, `Agosto` |
| `mes_codigo` | string | No | Mes numerico `01` a `12` cuando se pueda inferir |
| `periodo_trabajo` | enum | Si | `mes_actual`, `historico_vivo` o `sin_mes_claro` |
| `es_mes_actual` | boolean | Si | True cuando pertenece al mes local activo |
| `es_historico_vivo` | boolean | Si | True cuando pertenece a un mes anterior pero sigue abierto |

Estados operativos V1:

- `nuevo`: detectado por primera vez.
- `cotizacion`: sigue en etapa de tarifa/comercial.
- `prealerta`: ya hay pre-alert o documentos base.
- `documental`: falta o se revisa documento, BL, AWB, factura, pedimento, CCP, carta, D/O.
- `pickup_programado`: hay recoleccion o unidad programada.
- `en_transito`: carga en ruta o vuelo/buque/truck con movimiento.
- `en_aduana`: despacho, liberacion o validacion aduanal.
- `entrega_pendiente`: cerca de entrega o esperando ingreso a planta.
- `entregado_sin_pod`: se reporta entrega pero falta POD/evidencia final.
- `cerrado`: cierre con evidencia clara.
- `pausado_cliente`: falta confirmacion del cliente/agente.
- `incierto`: hay senales, pero no evidencia suficiente.

### 1.1 Email Thread

Representa una cadena de correo separada. Es la unidad minima para entender operacion, porque una misma `INT` o embarque puede tener varias conversaciones con actores distintos.

Campos V1:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | Llave estable de la cadena. Preferir `email_thread_id` de Outlook; si no existe, usar referencia + actor + asunto normalizado |
| `thread_key` | string | Si | Llave usada por el dashboard para evitar mezclar cadenas |
| `thread_identity` | string | Si | Identidad normalizada de la cadena: alcance de referencia + referencia principal + actor |
| `thread_identity_reason` | string | No | Por que se construyo asi la identidad: `conversation_id_outlook`, `embarque_sam_visible`, `int_origen_visible` o `asunto_actor_sin_ref` |
| `thread_display` | string | Si | Etiqueta ejecutiva legible: referencia principal, actor y asunto limpio |
| `email_thread_id` | string | No | ID de conversacion de Outlook cuando el conector lo entrega |
| `asunto` | string | Si | Asunto o nombre legible de la cadena |
| `cadena_correo` | string | Si | Descripcion visible de la cadena |
| `actor_tipo` | enum | Si | `cliente`, `cnee`, `shipper`, `proveedor`, `agente`, `pricing`, `multi`, `actor_externo` |
| `actor_principal` | string | No | Actor visible mas probable |
| `actor_detection_reason` | string | No | Razon tecnica-legible para auditar por que la cadena quedo con ese actor |
| `actor_confidence` | enum | No | `alta`, `media` o `baja` segun fuerza de la evidencia |
| `sender_domain` | string | No | Dominio del remitente cuando existe |
| `primary_operation_ref` | string | No | Embarque si existe; si no, INT provisional |
| `int_origin_ref` | string | No | INT comercial ligado a la cadena |
| `int_refs` | array string | No | INT detectados en la cadena |
| `shipment_refs` | array string | No | Embarques detectados en asunto, cuerpo breve, Sheet o memoria |
| `reference_scope` | enum | Si | `embarque_sam`, `int_origen` o `sin_referencia` |
| `reference_scope_reason` | string | No | Explicacion de por que el hilo se lee como embarque, INT provisional o sin referencia |
| `operation_identity` | enum | Si | `embarque`, `int_provisional` o `cadena_sin_ref` |
| `chain_refs_count` | number | No | Total de INT + embarques detectados en la cadena |
| `chain_has_multiple_refs` | boolean | No | True cuando una misma cadena mezcla varias referencias |
| `chain_needs_reference_review` | boolean | No | True cuando no conviene sugerir accion hasta separar la referencia correcta |
| `estado_operativo` | enum | No | Estado inferido para esa cadena, no para toda la referencia |
| `lane_cadena` | enum | Si | `cadena_en_alerta`, `cadena_por_validar`, `cadena_espera_externa`, `cadena_pricing`, `cadena_monitoreo` |
| `pelota` | string | No | Actor que parece tener el siguiente movimiento en esa cadena |
| `accion_sugerida` | string | No | Accion sugerida solo para esa cadena |
| `accion_tipo` | enum | No | Tipo normalizado de accion, por ejemplo `responder_duda_cliente`, `pedir_eta_pricing`, `validar_prealert_agente` |
| `accion_reason` | string | No | Criterio que disparo la accion sugerida |
| `accion_confidence` | enum | No | Confianza de la accion: `alta`, `media`, `baja` |
| `lectura_cadena` | string | Si | Explicacion breve de por que la cadena esta en ese carril |
| `ultimo_movimiento_at` | datetime | No | Ultimo correo/evidencia visible |
| `evidencia` | object | No | Link y resumen breve, sin cuerpo completo salvo necesidad puntual |

Reglas:

- No mezclar una cadena de cliente con una cadena de CNEE, shipper, pricing o proveedor aunque compartan `INT`.
- La llave usa primero `conversationId` de Outlook. Sin ese dato, usa embarque/INT + actor + asunto normalizado; elimina prefijos de respuesta comunes (`RE`, `RES`, `RV`, `FW`, `FWD`, `AW`) para mantener estable la conversacion.
- Dos mensajes con la misma llave se consolidan conservando el movimiento mas reciente y la union de referencias detectadas.
- Si la cadena trae embarque, el dashboard muestra el embarque arriba y el INT como origen.
- Si solo trae INT, queda como `int_provisional`.
- Si la cadena mezcla varios embarques o varios INT, queda como `referencias_multiples_en_cadena` en auditoria y la accion se degrada a validar cadena.
- Si una accion sale de memoria agregada y no de una cadena clara, debe marcarse como validacion, no como instruccion segura.

Regla de actores V1:

1. Primero manda el asunto/carpeta: si contiene CNEE, shipper/pickup, pricing/tarifa o proveedor/carrier/transportista, la cadena se clasifica por esa pista.
2. Despues manda el catalogo privado `work/catalogo-actores-v1.json`, con prioridad para agentes conocidos antes de proveedor generico.
3. Despues manda el remitente: dominios/personas MULTI se clasifican como `multi`; agentes genericos o carpetas de agentes como `agente`.
4. Si aparecen nombres operativos de proveedor conocidos por catalogo, se marca como `proveedor`.
5. Si aparece un cliente conocido por catalogo, Sheet o memoria y no hay pista mas fuerte, se clasifica como `cliente`.
6. Si hay dominio externo y no hay pista mas fuerte, se clasifica como `cliente`.
7. Si no hay evidencia suficiente, queda como `actor_externo` con confianza baja.

El catalogo real debe vivir solo en `work/`. Para agregar una regla, abrir `work/catalogo-actores-v1.json` y sumar el nombre en `terms` o el dominio en `domains` dentro del tipo correcto. No guardar nombres reales en archivos de ejemplo publicos.

### 1.2 Cadena accionable

Cada operacion puede tener varias cadenas relacionadas. Para evitar acciones genericas o mezcladas, el motor elige una `cadena_accionable` antes de preparar la accion principal.

Criterio V1:

1. Priorizar cadenas en alerta.
2. Despues, cadenas por validar.
3. Despues, cadenas de pricing.
4. Despues, cadenas esperando externo.
5. Al final, monitoreo.

Dentro de cada carril se ordena por criticidad, actor y fecha. La accion principal de operacion debe salir de esa cadena elegida. Si no hay cadena confiable, la accion debe pedir validar la cadena especifica antes de actuar.

Regla de accion V1:

1. La accion se calcula por cadena, no por referencia agregada.
2. Si el actor o carril no es confiable, la accion debe ser validar cadena antes de actuar.
3. Si el cliente pide duda/aclaracion/cambio, la accion es responder esa duda con evidencia del ultimo movimiento.
4. Si el cliente confirma proceed, la accion es convertir a operacion o validar embarque SAM.
5. Si pricing respondio, la accion es validar tarifa y enviar/confirmar envio al cliente.
6. Si pricing sigue pendiente, la accion es pedir ETA de tarifa.
7. Si falta POD, EIR o confirmacion de entrega, la accion es pedir evidencia final; no se debe marcar como cierre.
8. Si CNEE, shipper, proveedor o agente tienen un hito documental/operativo, la accion debe nombrar ese actor y ese hito, no una accion generica sobre el INT.

Campos nuevos en `operacion`:

| Campo | Tipo | Descripcion |
| --- | --- | --- |
| `cadena_accionable` | object | Cadena que explica la accion principal |
| `actor_tipo_accionable` | string | Actor de la cadena elegida |
| `cadena_accionable_lane` | string | Carril de la cadena elegida |
| `accion_tipo` | string | Tipo de accion heredado de la cadena accionable |
| `accion_reason` | string | Criterio de accion heredado de la cadena accionable |
| `accion_confidence` | string | Confianza de accion heredada de la cadena accionable |
| `cadenas_relacionadas_count` | number | Cuantas cadenas se ligaron al embarque/INT |
| `cadenas_relacionadas` | array object | Resumen compacto de cadenas ligadas |

### 2. Cotizacion

Representa una solicitud del Sheet o correo que requiere control comercial/pricing.

Campos V1:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | Usualmente `INTxx-yyyy-nnn` |
| `int_ref` | string | Si | Referencia INT |
| `sam_refs` | array string | No | Referencias SAM si ya se convirtio a embarque |
| `cliente` | string | Si | Cliente/agente |
| `network` | string | No | WCA, JC TRANS u otro |
| `servicio` | string | Si | Servicio del Sheet |
| `usuario_sheet` | string | Si | Usuario asignado en Sheet |
| `estatus_sheet` | string | Si | Estatus exacto de Google Sheet |
| `estado_sheet_canonico` | enum | No | Lectura normalizada del estatus del Sheet |
| `sheet_status_key` | string | No | Estatus del Sheet normalizado para auditoria |
| `pendiente_pricing_sheet` | boolean | No | True solo cuando el Sheet dice `Pendiente de Coti. Pricing` o variante equivalente aprobada |
| `cotizada_sheet` | boolean | No | True cuando el Sheet dice `Cotizado Agentes`, `Cotizado Pricing` o `Cotizado Pricing Fuera de tiempo` |
| `cerrada_sheet` | boolean | No | True cuando el Sheet dice cerrado |
| `status_rule` | string | No | Regla que clasifico el estatus del Sheet/correo |
| `estado_cotizacion` | enum | Si | Ver catalogo |
| `estado_cotizacion_ejecutivo` | enum | No | Estado final para dashboard; puede reclasificar un pendiente de Sheet si Outlook ya mostro respuesta, duda o envio |
| `etapa_comercial` | enum | No | `etapa_pricing`, `etapa_multi`, `etapa_cliente`, `etapa_sam`, `etapa_inconsistencia`, `etapa_monitoreo` |
| `semaforo` | enum | Si | `rojo`, `amarillo`, `verde`, `gris` |
| `decision_ejecutiva` | enum | Si | Ver capa de decision ejecutiva |
| `cola_trabajo` | enum | Si | Bandeja accionable: MULTI, pricing, cliente/agente, Sheet, SAM, documental o monitoreo |
| `nivel_decision` | number | Si | Orden interno para mostrar primero lo mas accionable |
| `motivo_prioridad` | string | Si | Explicacion breve y privada de por que aparece en esa decision |
| `pelota` | string | Si | Pricing, usuario, cliente, agente, ops o incierto |
| `responsable_equipo` | enum | No | Equipo probable que debe mover o monitorear: `equipo_mi`, `pricing_aereo`, `pricing_maritimo`, `pricing_terrestre`, `pricing_warehouse`, `pricing_general`, `documental_sam`, `externo`, `incierto` |
| `responsable_area` | enum | No | Area ejecutiva resumida: `pricing`, `comercial`, `operacion`, `multi`, `externo`, `incierto` |
| `responsable_equipo_reason` | string | No | Criterio legible usado para asignar el equipo responsable |
| `responsable_equipo_confidence` | enum | No | Confianza de asignacion: `alta`, `media`, `baja` |
| `accion_sugerida` | string | Si | Siguiente paso |
| `lectura_confianza` | enum | Si | `accion_confiable`, `accion_probable`, `validar_antes`, `sin_evidencia_suficiente` o `monitoreo_controlado` |
| `lectura_confianza_reason` | string | No | Explicacion breve de la confianza de lectura |
| `lectura_confianza_rank` | number | No | Orden interno para separar acciones confiables de validaciones |
| `accion_lista` | boolean | No | True cuando la accion comercial puede trabajarse; false cuando primero conviene validar |
| `solicitud_cliente_at` | datetime | No | Primer correo/solicitud visible |
| `pricing_solicitado_at` | datetime | No | Cuando MULTI pidio precio a pricing/proveedor |
| `pricing_responde_at` | datetime | No | Cuando pricing/proveedor respondio |
| `tarifa_enviada_cliente_at` | datetime | No | Cuando se envio al cliente/agente |
| `cliente_responde_at` | datetime | No | Duda, aceptacion, rechazo o cambio |
| `cerrado_at` | datetime | No | Cierre real |
| `antiguedad_dias` | number | No | Dias desde solicitud o ultima evidencia visible |
| `sheet_row` | number | No | Fila del Sheet si se conoce |
| `sheet_desfasado` | boolean | Si | True cuando Outlook y Sheet no coinciden |
| `evidencia` | object | Si | Fuente y link si existe |
| `mes_origen` | string | Si | Mes operativo inferido por referencia, Sheet, fecha o memoria |
| `mes_codigo` | string | No | Mes numerico `01` a `12` cuando se pueda inferir |
| `periodo_trabajo` | enum | Si | `mes_actual`, `historico_vivo` o `sin_mes_claro` |
| `es_mes_actual` | boolean | Si | True cuando pertenece al mes local activo |
| `es_historico_vivo` | boolean | Si | True cuando pertenece a un mes anterior pero sigue abierto |

Estados de cotizacion V1:

- `pendiente_pricing`: falta respuesta de pricing/proveedor.
- `pricing_respondio_falta_enviar`: ya hay tarifa/costo, falta enviar al cliente o confirmar envio.
- `enviada_cliente`: tarifa enviada, falta respuesta.
- `cliente_con_duda`: cliente pidio aclaracion, ajuste o detalle.
- `cliente_acepto`: aceptacion visible, falta convertir a operacion/SAM o confirmar cierre.
- `cerrada_con_sam`: cerrada y ya tiene referencia SAM.
- `cerrada_sin_sam`: cerrada o cancelada sin referencia SAM.
- `cancelada`: cancelada o no cotizada con evidencia.
- `incierta`: no hay evidencia suficiente.

Regla dura de estatus Sheet V1:

- `Pendiente de Coti. Pricing` es el unico estatus del Sheet que cuenta como pendiente de Pricing.
- `Cotizado Agentes`, `Cotizado Pricing` y `Cotizado Pricing Fuera de tiempo` ya cuentan como cotizadas.
- `No Cotizado por Pricing` cuenta como no cotizada, no como pendiente ni como cotizada.
- `Cerrado` cuenta como cerrada; si trae numero de embarque se considera cierre con SAM.
- Los totales deben separar `pendiente_pricing_sheet` de `pricing_pendiente_real`: el primero viene del Sheet, el segundo descuenta evidencia de Outlook como pricing respondido, duda del cliente, respuesta enviada o espera de agente/cliente.

Etapas comerciales V1:

- `etapa_pricing`: falta pricing/proveedor.
- `etapa_multi`: pricing ya respondio, hay duda del cliente o falta accion interna.
- `etapa_cliente`: tarifa enviada; se espera respuesta del cliente/agente.
- `etapa_sam`: cliente acepto o debe convertirse a operacion/SAM.
- `etapa_inconsistencia`: Sheet, Outlook o memoria no coinciden.
- `etapa_monitoreo`: viva, pero sin bloqueo comercial inmediato.

## Capa de decision ejecutiva V1

Esta capa convierte cada fila en una instruccion de trabajo para Miguel. No reemplaza la evidencia; solo ordena la atencion.

Decisiones:

- `atender_ahora`: requiere accion inmediata de MULTI, pricing o respuesta a duda/bloqueo.
- `revisar_inconsistencia`: hay conflicto entre Outlook, Sheet o memoria local.
- `seguimiento_hoy`: no arde, pero debe moverse o confirmarse durante el dia.
- `actualizar_sheet`: falta alinear trazabilidad, SAM o estado en Sheet.
- `esperar_respuesta`: la pelota parece estar con cliente, agente, shipper, CNEE o externo.
- `puede_esperar`: viva, sin bloqueo inmediato; mantener monitoreo.

Colas de trabajo:

- `pelota_multi`: requiere accion interna de MULTI.
- `pelota_pricing`: requiere respuesta o confirmacion de pricing/proveedor.
- `pelota_cliente_agente`: esperar o empujar a cliente/agente/externo.
- `sheet_desfasado`: validar diferencia entre Sheet y correo/memoria.
- `sin_sam`: falta ligar o confirmar referencia SAM.
- `riesgo_documental`: documento, BL, AWB, factura, pedimento, carta, D/O o bloqueo.
- `urgencias_viejas`: evidencia vieja en caso critico/alto.
- `monitoreo`: seguir visible sin accion inmediata.

Regla de orden inicial: primero `atender_ahora`, luego `revisar_inconsistencia`, `seguimiento_hoy`, `actualizar_sheet`, `esperar_respuesta` y al final `puede_esperar`.

### Capa de confianza de lectura V1

Esta capa no decide la prioridad; decide que tan seguro es actuar con la lectura actual.

- `accion_confiable`: hay referencia, evidencia reciente y accion calculada con confianza alta.
- `accion_probable`: hay evidencia suficiente para proponer accion, pero conviene leer detalle.
- `validar_antes`: la cadena, actor, sincronizacion o auditoria requieren revision antes de mover al equipo.
- `sin_evidencia_suficiente`: falta evidencia, fecha o hito para recomendar con seguridad.
- `monitoreo_controlado`: la lectura sirve para seguimiento, pero la pelota parece externa o sin bloqueo inmediato.

### 3. Tiempo de respuesta

No es un score formal. Es medicion para detectar retrasos y puntos de mejora.

Campos V1:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | ID del evento de medicion |
| `referencia_id` | string | Si | Relacion con operacion/cotizacion |
| `tipo` | enum | Si | `cliente_a_multi`, `multi_a_pricing`, `pricing_a_multi`, `multi_a_cliente`, `cliente_reabre`, `ops_update` |
| `inicio_at` | datetime | Si | Inicio del tramo |
| `fin_at` | datetime | No | Fin del tramo |
| `duracion_min` | number | No | Diferencia calculada |
| `objetivo_min` | number | No | Objetivo esperado para ese tramo |
| `brecha_min` | number | No | Diferencia contra objetivo. Positivo indica atraso; negativo indica margen |
| `estado_medicion` | enum | No | `cumplido`, `cerca_objetivo`, `fuera_objetivo`, `abierto_sin_fin`, `sin_medicion`, `sin_objetivo` |
| `semaforo` | enum | Si | `verde`, `amarillo`, `rojo`, `gris` |
| `actor_origen` | string | No | Quien genero el evento inicial |
| `actor_destino` | string | No | Quien debia responder |
| `responsable_equipo` | enum | No | `equipo_mi`, `pricing`, `externo` o `incierto` |
| `observacion` | string | No | Nota privada de mejora |
| `lectura_confianza` | enum | No | Confianza de la medicion: accionable, probable, por validar o sin evidencia suficiente |
| `lectura_confianza_reason` | string | No | Motivo de la confianza asignada |
| `evidencia` | object | Si | Fuente del hito |

Reglas iniciales de semaforo:

- Cliente esperando primera respuesta: verde hasta 2h habiles, amarillo 2-4h, rojo mas de 4h o urgencia sin respuesta.
- Pricing pendiente: verde hasta 4h habiles, amarillo mismo dia, rojo si cruza al siguiente dia habil sin ETA.
- Operacion critica: rojo si el cliente pide update y no hay siguiente hito claro.
- `gris` cuando falta evidencia o el correo no permite medir.

### 4. Evento de historial

Cada cambio importante se guarda como evento para ver comportamiento en el tiempo.

Campos V1:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | ID unico del evento |
| `referencia_id` | string | Si | Operacion/cotizacion relacionada |
| `at` | datetime | Si | Fecha/hora del evento |
| `fuente` | enum | Si | `outlook`, `google_sheet`, `memoria_local`, `manual` |
| `tipo_cambio` | enum | Si | `nuevo`, `mejoro`, `empeoro`, `sigue_igual`, `parece_cerrado`, `cerrado`, `cambio_pelota`, `sheet_desfasado`, `nota_calidad` |
| `historial_lane` | enum | No | Carril ejecutivo calculado: `riesgo_abierto`, `por_validar`, `cambio_pelota`, `movimiento_nuevo`, `arrastre_historico`, `mejora_cierre` o `sin_cambio` |
| `riesgo_memoria` | enum | No | Lectura de riesgo para memoria: `riesgo_abierto`, `vigilar`, `arrastre_historico`, `saludable` o `sin_cambio` |
| `lectura_memoria` | string | No | Explicacion breve de por que el evento queda vivo en historial |
| `historial_dedupe_key` | string | No | Llave de limpieza. En operacion usa embarque primero; en cotizacion usa INT primero |
| `historial_priority` | number | No | Prioridad calculada para ordenar lo accionable antes que lo reciente |
| `historial_has_system_ref` | boolean | No | True cuando el evento trae INT o embarque de Multi |
| `historial_needs_reference` | boolean | No | True cuando el evento se conserva por riesgo, pero falta INT/embarque claro |
| `historial_clean_reason` | string | No | Motivo por el que quedo como evento representativo |
| `resumen` | string | Si | Cambio visible |
| `antes` | object | No | Estado anterior resumido |
| `despues` | object | No | Estado nuevo resumido |
| `evidencia` | object | Si | Link o descripcion de soporte |

Regla de historial limpio V1:

- El historial ejecutivo muestra eventos representativos, no todos los renglones vivos.
- Se filtran eventos rutinarios `sin_cambio` + `sigue_igual` + `sin_cambio` cuando no son `historico_vivo`.
- Se deduplica por tipo + referencia: en operacion manda el embarque SAM; en cotizacion manda el INT.
- Si hay duplicados, se conserva el de mayor prioridad: riesgo abierto, validacion, cambio de pelota, movimiento nuevo, arrastre historico, mejora/cierre y al final sin cambio.
- Si un evento no trae INT ni embarque, puede conservarse por riesgo, pero queda marcado con `historial_needs_reference=true` para validarlo antes de tratarlo como referencia confiable.
- El conteo de limpieza queda en `history_summary` y `history_raw_summary` para auditar cuantos eventos crudos, filtrados y duplicados produjo la corrida.

### 5. Reporte diario

Foto generada por corrida.

Campos V1:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | Ej. `2026-08-31-manana` |
| `tipo` | enum | Si | `manana`, `mediodia`, `cierre`, `manual` |
| `generado_at` | datetime | Si | Hora real de corrida |
| `ventana` | string | Si | Manana, mediodia o cierre |
| `cobertura` | object | Si | Fuentes leidas y limitaciones |
| `resumen_ejecutivo` | array string | Si | 3-7 puntos maximos |
| `prioridades` | array string | Si | IDs de operaciones/cotizaciones principales |
| `riesgos` | array string | No | Riesgos detectados |
| `acciones_miguel` | array string | No | Acciones sugeridas para Miguel |

### 6. Paquete ejecutivo

Bloque calculado para que el dashboard y el reporte diario usen la misma lectura de mando.

Campos V1:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `headline` | string | Si | Lectura corta del dia |
| `alertas` | array object | Si | Alertas accionables con nivel, detalle y destino de filtro |
| `prioridades` | array object | Si | Referencias principales ordenadas por urgencia |
| `reporte` | object | Si | Borrador estructurado para copiar o enviar despues |

Campos de `alertas`:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | ID estable de alerta |
| `nivel` | enum | Si | `rojo`, `amarillo`, `verde` |
| `titulo` | string | Si | Nombre ejecutivo de la alerta |
| `detalle` | string | Si | Resumen cuantificado |
| `accion` | string | Si | Texto de siguiente movimiento |
| `target` | object | No | Tabla, busqueda y filtros que debe abrir el dashboard |
| `count` | number | Si | Volumen de la alerta |

Campos de `reporte`:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `tipo` | enum | Si | `manana`, `mediodia`, `cierre`, `manual` |
| `asunto_sugerido` | string | Si | Titulo para reporte |
| `resumen_corto` | string | Si | Parrafo breve de situacion |
| `bullets` | array string | Si | 3-7 puntos ejecutivos |
| `riesgos` | array string | No | Riesgos resumidos para lectura rapida |
| `riesgos_detalle` | array object | No | Riesgos con nivel, detalle, accion y target de filtro |
| `secciones` | array object | No | Bloques ejecutivos legacy compatibles |
| `bloques` | array object | Si | Bloques reutilizables por dashboard y reporte local |
| `acciones_miguel` | array string | No | Lista corta de acciones recomendadas |
| `acciones_miguel_detalle` | array object | No | Acciones con tipo, ref, cliente/actor, ultimo movimiento, pelota, accion y evidencia |
| `acciones_listas_detalle` | array object | No | Acciones con confianza suficiente para trabajar sin validacion previa |
| `acciones_probables_detalle` | array object | No | Acciones utiles pero que conviene revisar en detalle antes de mover al equipo |
| `validaciones_detalle` | array object | No | Registros que no deben tratarse como accion segura hasta validar cadena, actor, sync o evidencia |
| `calidad_dato` | object | No | Conteos y regla aplicada para separar accion segura, accion probable y validacion previa |
| `cobertura` | array string | Si | Fuentes y volumen revisado |
| `cobertura_detalle` | object | No | Lectura auditada de Sheet, Outlook/memoria, dashboard y privacidad |
| `limitaciones` | array string | No | Advertencias sobre evidencia incompleta, privacidad o alcance |

Campos de cada item en `bloques[].items` y `acciones_miguel_detalle`:

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `id` | string | Si | Referencia INT, embarque o ID de medicion |
| `tipo` | string | Si | Operacion, Cotizacion, Tiempo/calidad o Cambio |
| `cliente` | string | No | Cliente, agente o actor visible |
| `criticidad` | string | No | Criticidad o semaforo |
| `estado` | string | No | Estado ejecutivo visible |
| `ultimo_movimiento_at` | datetime | No | Fecha/hora de ultimo movimiento o evidencia |
| `ultimo_movimiento` | string | Si | Resumen de evidencia visible |
| `por_que_importa` | string | No | Motivo ejecutivo de prioridad o riesgo |
| `pelota` | string | Si | Actor responsable del siguiente movimiento |
| `accion` | string | Si | Accion sugerida concreta |
| `evidencia` | object | No | Fuente, tipo, link y resumen cuando exista |
| `target` | object | No | Tabla/filtro/busqueda para abrir esa vista en dashboard |

## Foto para dashboard `current.json`

El dashboard debe consumir un objeto unico:

```json
{
  "version": "mini-tms-v1",
  "generated_at": "2026-08-31T07:01:52-06:00",
  "timezone": "America/Mexico_City",
  "summary": {},
  "executive_digest": {},
  "tabs": {
    "operacion": {},
    "tiempos_calidad": {},
    "cotizaciones": {}
  },
  "history": [],
  "source_state": {},
  "warnings": []
}
```

### Tab Operacion

Debe contestar:

- Que referencias estan vivas.
- En que proceso van.
- Que falta.
- Quien tiene la pelota.
- Que referencia SAM corresponde a cada INT.

Metricas base:

- vivas totales.
- criticas.
- altas.
- por decision ejecutiva.
- por cola de trabajo.
- entregas hoy/proximas.
- referencias con SAM pendiente.
- referencias con evidencia incierta.

### Tab Tiempos y calidad

Debe contestar:

- Cuanto tarda MULTI en responder al cliente.
- Cuanto tarda pricing en responder.
- Donde se reabren dudas por respuestas incompletas.
- Que cadenas requieren mejor update operativo.

Metricas base:

- tiempo promedio cliente a primera respuesta.
- tiempo promedio pricing.
- respuestas rojas abiertas.
- dudas reabiertas.
- operaciones con cliente pidiendo update.

### Tab Cotizaciones

Debe contestar:

- Cuales cotizaciones estan vivas.
- Cuales estan activas/enviadas/por cerrar.
- Cuales faltan de pricing.
- Cuales faltan de usuario MULTI.
- Cuales tienen duda del cliente.
- Cuales ya tienen SAM y deben moverse a operacion.

Metricas base:

- pendientes pricing.
- pricing respondio falta enviar.
- enviadas esperando cliente.
- cliente con duda.
- cerradas con SAM.
- Sheet desfasado.
- Por etapa comercial.
- Cotizaciones atoradas.
- Antiguedad promedio.
- por decision ejecutiva.
- por cola de trabajo.

## Flujo de actualizacion

1. Leer memorias locales y estado de ultima corrida.
2. Leer Google Sheet del mes activo y, si aplica, mes anterior para historicos vivos.
3. Guardar una foto privada del Sheet en `work/sheet-cotizaciones-snapshot.json` e importarla con `scripts/import-sheet-cotizaciones-snapshot.js`.
4. Leer Outlook con busqueda compacta por:
   - referencias vivas de memoria;
   - nuevas referencias del Sheet;
   - clientes prioritarios;
   - palabras operativas y urgentes.
5. Guardar una foto privada de Outlook en `work/outlook-messages-snapshot.json` e importarla con `scripts/import-outlook-snapshot.js`.
6. Normalizar referencias con jerarquia: embarque operativo > cadena de correo > INT > cliente/proveedor.
7. Comparar contra memoria anterior.
8. Generar eventos de historial.
9. Actualizar memorias locales.
10. Generar `dashboard/data/current.json`.
11. Generar reporte diario.
12. Publicar a Cloudflare solo si Access esta activo y Miguel lo pide o la automatizacion lo tiene habilitado.

## Corrida local V1

El script `scripts/run-report-automation.js` concentra la corrida operativa local. Sirve como puente entre el reporte diario y el dashboard:

- `npm run report:check`: revisa la ventana actual y el estado local antes de tocar fuentes. Devuelve `RUN` o `DONT_NOTIFY` con periodo, motivo y hora local.
- `npm run report:manual`: genera reporte y dashboard sin reglas anti duplicado.
- `npm run report:auto`: decide si toca manana, mediodia o cierre, y evita duplicar el periodo del dia.
- `npm run report:deploy`: genera la corrida manual y publica a Cloudflare Pages con Access activo.

La corrida local no entra a Outlook ni edita Google Sheet. Trabaja con las memorias privadas y con `work/sheet-cotizaciones-snapshot.json`. La lectura viva de Outlook y Google Sheet sigue siendo responsabilidad del proceso de analisis/heartbeat que actualiza esas memorias antes de ejecutar el generador. El heartbeat debe correr `report:check` primero; si devuelve `DONT_NOTIFY`, debe terminar sin leer fuentes ni actualizar archivos.

## Regla INT vs embarque V1

- `INT` es el inicio comercial de la cotizacion.
- Cuando aparece un numero de embarque (`AM-202609-9902`, `EA-202609-9901`, etc.), ese embarque manda como operacion real.
- El `INT` queda como origen comercial y puente contra la columna `Referencia` del Google Sheet.
- La columna `No de embarque` del Sheet se guarda como `no_embarque` y `shipment_refs`.
- Si una cadena solo tiene `INT` y senales de pricing, tarifa, cotizacion, RFQ o pendiente comercial, no debe entrar a `tabs.operacion`; debe quedarse en `tabs.cotizaciones`.
- Una cadena sin embarque puede entrar a Operacion solo si tiene senales operativas claras: CNEE/shipper/documentos/prealerta/pickup/aduana/transito/entrega/POD.
- Una misma `INT` puede tener varias cadenas de correo y actores. Operacion debe revisar cada cadena por separado.
- Cotizaciones siguen agrupadas principalmente por `INT`; cuando aparece embarque, pasan a tener `operation_identity=embarque_ligado`.
- El generador debe exponer auditoria de clasificacion: candidatas, aceptadas como operacion, excluidas por cotizacion e inciertas descartadas.
- El importador de Outlook debe usar la misma clasificacion:
  - `operacion`: actualiza `work/outlook-pendientes-abiertos.json`.
  - `cotizacion`: actualiza solo evidencia comercial en `work/cotizaciones-seguimiento-metricas.json`.
  - `incierto`: no genera accion operativa; se cuenta en auditoria.
- Outlook puede llenar `estado_correo`, `estado_ejecutivo_correo`, `ultima_evidencia`, `ultima_evidencia_at`, `link_correo` y `source_outlook_snapshot`; no debe sobrescribir `estatus_sheet`.
- El catalogo de claves esta en `docs/catalogo-nomenclaturas-v1.md`.
- La automatizacion puede sugerir capturar o corregir embarque/status en Sheet cuando haya alta confianza, pero no debe editar el Sheet sin permiso explicito.

## Regla de cambio de mes V1

- El mes local actual manda la lectura comercial principal. Ejemplo: el 1 de septiembre, la pestana activa es `Septiembre`.
- La pestana del mes anterior deja de ser fuente principal y entra a supervision historica.
- Julio, Agosto y meses anteriores solo deben aparecer en el dashboard diario si cumplen al menos una condicion:
  - siguen abiertos en Outlook o memoria viva;
  - tienen `seguir_en_reportes_diarios=true`;
  - el Sheet dice cerrado pero Outlook sigue mostrando actividad;
  - estan pendientes de pricing, envio, duda de cliente, SAM o cierre documentado;
  - tienen riesgo critico/alto o evidencia insuficiente.
- Cada fila generada debe llevar:
  - `mes_origen`: mes detectado;
  - `periodo_trabajo`: `mes_actual`, `historico_vivo` o `sin_mes_claro`;
  - `es_mes_actual` y `es_historico_vivo` para filtros ejecutivos.
- El dashboard debe permitir filtrar por periodo y mes para separar el trabajo nuevo del backlog vivo.

## Catalogo SAM V1

Codigos activos de la empresa:

- `IA`: Importacion Aerea.
- `EA`: Exportacion Aerea.
- `IH`: Importacion Handcarry.
- `EH`: Exportacion Handcarry.
- `DH`: Domestico Handcarry.
- `DA`: Domestico Aereo.
- `IC`: Importacion Charter.
- `EC`: Exportacion Charter.
- `DC`: Domestico Charter.
- `AA`: Arrastre Aereo.
- `EM`: Exportacion Maritima.
- `IM`: Importacion Maritima.
- `AM`: Arrastre Maritimo.
- `DT`: Domestico Terrestre.
- `ET`: Exportacion Terrestre.
- `IT`: Importacion Terrestre.
- `WH`: Warehouse.
- `DPA`, `EPA`, `IPA`: Proyecto Aereo.
- `APM`, `EPM`, `IPM`: Proyecto Maritimo.
- `DPT`, `EPT`, `IPT`: Proyecto Terrestre.

Codigos inactivos o no recomendados:

- `DM`, `DP`, `EP`, `IP`.

## Privacidad

Datos que nunca deben ir a GitHub:

- nombres completos de clientes si vienen de operaciones reales;
- referencias reales INT/SAM;
- links de Outlook;
- contenido de correos;
- `dashboard/data/current.json`;
- cualquier archivo `work/*.json`.

Para desarrollo publico usar solo ejemplos anonimos como `docs/data-contract-v1.example.json`.

## Pendientes V1.1

- Definir umbrales exactos por horario habil y zona horaria.
- Agregar tabla de aliases por cliente para evitar duplicados.
- Agregar `confidence` por clasificacion: `alta`, `media`, `baja`.
- Preparar migracion futura a D1/KV si Cloudflare queda como backend privado.
