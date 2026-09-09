# Catalogo Operativo de Nomenclaturas V1

Este documento define como el mini TMS identifica si una referencia ya paso de cotizacion a embarque operativo.

## Regla principal

La referencia `INT` es el inicio comercial de una cotizacion. Cuando la cotizacion se cierra y existe numero de embarque, la operacion real debe vivir por la nomenclatura de embarque.

Jerarquia de identificacion:

1. Numero de embarque: manda para operacion y seguimiento.
2. Cadena de correo: manda para saber que pasa, quien escribe y quien tiene la pelota.
3. INT: queda como origen comercial y liga contra el Google Sheet.
4. Cliente, proveedor, CNEE o shipper: ayuda a separar cadenas cuando una misma referencia tiene varios actores.

## Nomenclaturas activas

| Clave | Descripcion | Registro SAM | Regla |
| --- | --- | --- | --- |
| `IA` | Importacion aerea | Aereo | En el check es IMPO |
| `EA` | Exportacion aerea | Aereo | En el check es EXPO |
| `IH` | Importacion handcarry | Aereo | En el check es IMPO |
| `EH` | Exportacion handcarry | Aereo | En el check es EXPO |
| `DH` | Domestico handcarry | Aereo | No es impo ni expo |
| `DA` | Domestico aereo | Aereo | No es impo ni expo |
| `IC` | Importacion charter | Aereo | En el check es IMPO |
| `EC` | Exportacion charter | Aereo | En el check es EXPO |
| `DC` | Domestico charter | Aereo | No es impo ni expo |
| `AA` | Arrastre aereo | Aereo | El servicio es arrastre |
| `EM` | Exportacion maritima | Maritimo | En el check es EXPO |
| `IM` | Importacion maritima | Maritimo | En el check es IMPO |
| `AM` | Arrastre maritimo | Maritimo | El servicio es arrastre |
| `DT` | Domestico terrestre | Terrestre | No es impo ni expo |
| `ET` | Exportacion terrestre | Terrestre | En el check es EXPO |
| `IT` | Importacion terrestre | Terrestre | En el check es IMPO |
| `WH` | Warehouse | Terrestre | Check de almacenaje |
| `DPA` | Domestico proyecto aereo | Aereo | En el check domestico proyecto |
| `EPA` | Exportacion proyecto aereo | Aereo | En el check expo proyecto |
| `IPA` | Importacion proyecto aereo | Aereo | En el check impo proyecto |
| `APM` | Arrastre proyecto maritimo | Maritimo | Servicio arrastre maritimo, check arrastre proyecto maritimo |
| `EPM` | Exportacion proyecto maritimo | Maritimo | En el check expo proyecto |
| `IPM` | Importacion proyecto maritimo | Maritimo | En el check impo proyecto |
| `DPT` | Domestico proyecto terrestre | Terrestre | En el check domestico proyecto |
| `EPT` | Exportacion proyecto terrestre | Terrestre | En el check expo proyecto |
| `IPT` | Importacion proyecto terrestre | Terrestre | En el check impo proyecto |

## Nomenclaturas inactivas

Estas claves no deben usarse para clasificar operaciones nuevas:

| Clave | Descripcion |
| --- | --- |
| `DM` | Domestico maritimo |
| `DP` | Domestico proyecto |
| `EP` | Exportacion domestica |
| `IP` | Importacion proyecto |

Si aparecen en correos historicos, deben tratarse como contexto o como dato por validar, no como clasificacion activa automatica.

## Reglas para correo

- Una misma `INT` puede tener varias cadenas activas: cliente, CNEE, shipper, proveedor, agente o pricing.
- La alerta debe salir de la cadena especifica, no de la referencia agregada.
- Si el asunto trae numero de embarque, ese numero manda como `primary_operation_ref`.
- Si el asunto solo trae `INT`, la operacion queda como `int_provisional` hasta encontrar el embarque.
- En correos con CNEE o shipper, normalmente esas palabras aparecen en el asunto junto con el nombre del actor.
- En correos con proveedores, normalmente aparece el nombre del proveedor en el asunto sin una palabra estandar.

## Reglas para Google Sheet

- La columna `Referencia` conserva el `INT`.
- La columna `No de embarque` puede traer el embarque operativo cuando alguien lo captura.
- Si el Sheet dice `Cotizado Agentes` o `Cotizado Pricing`, la cotizacion ya esta cotizada.
- Si el Sheet dice `Pendiente de Coti. Pricing`, sigue pendiente real de Pricing salvo evidencia clara en correo de que Pricing ya respondio.
- A futuro, cuando el motor detecte con alta confianza que una `INT` ya tiene embarque, debe sugerir la actualizacion del Sheet. No debe editarlo automaticamente sin permiso explicito de Miguel.
