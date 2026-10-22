# Registrar movimientos desde los mensajes del banco

Cuando pagas, compras o te transfieren, el banco manda un SMS (o un correo)
que siempre tiene la misma forma; solo cambian el monto, el comercio y la
fecha. Smart Finance lee ese texto y abre el movimiento ya lleno: tipo,
monto, comercio, cuenta, categoría y fecha. Tú solo confirmas.

## Qué se puede y qué no en iPhone

| Opción | ¿Funciona? | Por qué |
|---|---|---|
| La app lee tus SMS sola | ❌ | iOS no deja que ninguna app lea los mensajes. |
| La app lee tu correo (Gmail) | ⚠️ No recomendado | Exige conectar la cuenta de Google y procesar tu correo en un servidor; rompe la regla de que tus datos se quedan en el teléfono. |
| **Atajo "Al recibir un mensaje"** | ✅ Recomendado | iOS 17 o superior ejecuta el atajo cuando llega el SMS del banco y le pasa el texto a la app. |
| Atajo "Al recibir un correo" (app Mail de Apple) | ✅ Si el banco solo manda correos | Igual que el anterior, pero con la app Mail (no con Gmail). |
| Copiar y pegar el mensaje | ✅ Siempre | Botón 💬 en Movimientos → "Mensaje del banco". Sirve también para correos y en Android. |

## Paso 1: nombra tus cuentas con los últimos dígitos

Así la app sabe a qué cuenta pertenece cada mensaje, aunque tengas varias en
el mismo banco. Ejemplos: `Bancolombia *1234`, `Davivienda 5678`, `Nequi`.
Si una cuenta solo lleva el nombre del banco, también funciona.

## Paso 2: crea la automatización en Atajos

1. Abre **Atajos** → pestaña **Automatización** → **+** (Nueva automatización).
2. Elige **Mensaje**.
3. En **El mensaje contiene** escribe una palabra que siempre trae el SMS
   (por ejemplo `$`), y en **Remitente** elige el número corto que aparece
   en los SMS de tu banco (míralo en la app Mensajes).
4. Marca **Ejecutar inmediatamente** (sin preguntar) → **Siguiente**.
5. Agrega la acción **Codificar URL** (URL Encode) con la variable
   **Entrada del atajo → Contenido**.
6. Agrega la acción **Abrir URL** con este texto, poniendo el resultado del
   paso anterior al final:

   ```
   financeai://transactions?guardar=1&mensaje=[URL codificada]
   ```

7. Guarda. Cuando llegue el próximo SMS del banco, Smart Finance se abre un
   momento, **registra el movimiento solo** y muestra "Movimiento registrado"
   con un botón **Deshacer**.

### Modo automático o con revisión

| URL | Qué pasa |
|---|---|
| `...?guardar=1&mensaje=...` | Se guarda solo. Recomendado. |
| `...?mensaje=...` | Abre el formulario lleno y tú confirmas. |

Aun en modo automático, la app **no guarda** y te abre el formulario si:

- no reconoce la cuenta (pon los últimos dígitos en su nombre);
- el mensaje está en otra moneda que la cuenta;
- es una transferencia a una cuenta tuya en otra moneda, o sin cuenta destino;
- ya hay un movimiento igual ese día en esa cuenta (evita duplicados si el
  banco manda el SMS dos veces);
- es un comercio nuevo y la IA no pudo sugerir la categoría (por ejemplo,
  sin internet).

> iOS siempre trae la app al frente al abrir un enlace. Registrar sin que la
> app se abra necesita una acción nativa de Atajos (App Intents en Swift);
> queda como una fase siguiente.

> Para correos: igual, pero en el paso 2 elige **Correo** y filtra por el
> remitente del banco (solo funciona con la app Mail de Apple).

## Cómo decide cada dato

| Dato | Cómo lo obtiene |
|---|---|
| Tipo | Palabras como "compraste", "pagaste", "enviaste" (gasto) o "recibiste", "abono" (ingreso). |
| Transferencia | Si los dígitos de destino coinciden con otra cuenta tuya, queda como transferencia entre cuentas; si es a otra persona, queda como gasto "Transferencia a …". |
| Monto | El número que sigue a `$`, `COP` o `USD`. Entiende `$45.900,00`, `$1.200.000` y `USD 12,99`. |
| Cuenta | Últimos dígitos (`*1234`, "terminada en 1234") o el nombre del banco. |
| Categoría | La que usaste la última vez en ese mismo comercio. Si es nuevo, la sugiere la IA al abrir el formulario. |
| Fecha | La del mensaje (`12/10/2026 15:32`); si no trae, la de hoy. |

No se registra nada si el mensaje es un código de seguridad, una compra
rechazada o no trae monto. Si ya registraste un movimiento igual ese día, la
pantalla de pegar lo avisa para evitar duplicados.

## Bancos probados

Bancolombia (formato nuevo y antiguo), Nequi, Davivienda, DaviPlata, Nu y
mensajes genéricos con `$`. Si un mensaje de tu banco no se reconoce, agrega
el ejemplo a `__tests__/bankMessage.test.ts` y ajusta
`src/utils/bankMessage.ts`.
