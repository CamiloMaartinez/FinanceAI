# Atajos de iPhone y comandos de voz

Smart Finance se puede usar desde la app **Atajos** del iPhone, desde Siri y
desde el micrófono del teclado. Todo funciona con enlaces de la app
(`financeai://…`), así que **no hace falta código nativo ni librerías nuevas**
y sirve también en Android (con Google Assistant o cualquier app que abra URLs).

> Nada se guarda solo: la app abre el formulario ya lleno y tú confirmas con
> el deslizador. Así un error del dictado nunca crea un movimiento equivocado.

## Los dos enlaces

| Enlace | Para qué |
|---|---|
| `financeai://transactions?monto=25000&nota=Starbucks&tipo=gasto` | Movimiento con datos fijos o pedidos en el atajo |
| `financeai://comando?texto=gasté 25 mil en almuerzo con Nequi` | Frase libre (dictada): la app la entiende |

Parámetros de `transactions` (todos opcionales):

| Parámetro | Valores |
|---|---|
| `monto` | `25000`, `25.000`, `$25.000`, `25,50` |
| `nota` | Texto libre (comercio, descripción) |
| `tipo` | `gasto` (por defecto), `ingreso`, `transferencia` |
| `cuenta` / `destino` | Nombre de la cuenta de origen / destino (`Nequi`, `Bancolombia`). Sin tildes ni mayúsculas también sirve; el id interno también |
| `categoria` | Nombre de la categoría (`Alimentacion`, `Transporte`), solo gastos |
| `guardar` | `1` = guarda sin abrir el formulario si trae monto, cuenta y categoría; si falta algo, abre el formulario |

### Qué entiende `comando`

| Dices | La app hace |
|---|---|
| “Gasté 25 mil en almuerzo con Nequi” | Gasto de $25.000, nota “Almuerzo”, cuenta Nequi, categoría Alimentación |
| “Me pagaron 2 millones de salario” | Ingreso de $2.000.000, nota “Salario” |
| “Transfiere 100 mil de Bancolombia a Nequi” | Transferencia entre esas cuentas |
| “Pasa 50 lucas a efectivo” | Transferencia a Efectivo (“lucas” = mil, “palos” = millón) |
| “Abre presupuestos”, “muéstrame los reportes” | Abre ese módulo |
| “¿Cuánto gasté este mes?” | Se lo pregunta al asistente IA |

Montos en palabras también funcionan: “veinticinco mil”, “un millón doscientos
mil”, “un millón y medio”, “1,5 millones”, “50k”.

## Crear los atajos en el iPhone

### 1. “Gasto rápido” (monto, cuenta, categoría y nota opcional)

> Todo lo que escribe o elige la persona pasa por **Codificar URL**: sin ese
> paso, un espacio o una tilde rompen el enlace.

1. **Solicitar entrada** (Número, “¿Cuánto?”) → **Codificar URL** → **Establecer variable** `Monto`.
2. **Elegir de la lista** con los nombres de tus cuentas (como aparecen en la app) → **Codificar URL** → **Establecer variable** `Cuenta`.
3. **Elegir de la lista** con tus categorías → **Codificar URL** → **Establecer variable** `Categoria`.
4. **Solicitar entrada** (Texto, “Nota (opcional)”) → **Codificar URL** → **Establecer variable** `Nota`.
5. **Texto**:
   `financeai://transactions?tipo=gasto&monto=[Monto]&cuenta=[Cuenta]&categoria=[Categoria]&nota=[Nota]&guardar=1`
6. **Abrir URLs**.

Con `&guardar=1` el gasto se registra directamente y sale “Movimiento
registrado” con **Deshacer**. Sin él, abre el formulario lleno para confirmar.
Si la nota queda vacía, el movimiento toma el nombre de la categoría.

### 2. “Anotar en Smart Finance” (voz con Siri)

1. **Atajos** → **+** → agrega **Dictar texto** (idioma: Español).
2. Agrega **Codificar URL** con el **Texto dictado** (para que los espacios y las tildes viajen bien).
3. Agrega **URL**: `financeai://comando?texto=`**[Texto codificado]**
4. Agrega **Abrir URL**.
5. Nómbralo “Anotar en Smart Finance”.

Ahora basta con decir **“Oye Siri, anotar en Smart Finance”** y luego la frase
(“gasté 18 mil en Uber”).

### Dónde ponerlos para que sean rápidos

- **Pantalla de inicio**: widget de Atajos (muestra 1, 4 u 8 atajos).
- **Centro de control y pantalla bloqueada** (iOS 18+): control “Atajo”.
- **Botón de acción** (iPhone 15 Pro y posteriores): Ajustes → Botón de acción → Atajo.
- **Tocar atrás**: Ajustes → Accesibilidad → Tocar → Tocar atrás → doble toque → el atajo.
- **Automatización con Apple Pay/Wallet**: Atajos → Automatización → “Transacción” → usa
  Comercio e Importe en el enlace `transactions` (así ya funcionaba antes).

## Dentro de la app

En el **Asistente** se puede escribir o dictar con el micrófono del teclado
de iOS. Si la frase empieza con una orden y trae monto (“gasté 20 mil en
almuerzo”, “abre metas”), la app la ejecuta en vez de mandarla a la IA.

## Código

| Archivo | Rol (MVVM) |
|---|---|
| `src/utils/voiceCommand.ts` | Modelo: entiende la frase (pura, sin red, con pruebas) |
| `src/hooks/useVoiceCommand.ts` | ViewModel: carga cuentas y categorías y llama al parser |
| `app/comando.tsx` | Vista: recibe `financeai://comando` y redirige |
| `app/(tabs)/transactions.tsx` | Lee los parámetros y abre el formulario precargado |
| `__tests__/voiceCommand.test.ts` | Pruebas del parser |

## Siguiente fase (opcional): App Intents nativos

Con **App Intents** (Swift) los atajos aparecen solos en la app Atajos y en
Spotlight, y Siri podría guardar el movimiento **sin abrir la app**. El costo:

- Escribir un módulo nativo en Swift (módulo local de Expo + config plugin).
- Mover la base de datos SQLite a un **App Group** para que la extensión la lea,
  lo que exige migrar los datos de los usuarios actuales.
- Solo iOS 16+, no funciona en Expo Go y hay que mantener el código nativo.

Recomendación: empezar con los enlaces (ya funcionan) y pasar a App Intents
solo si guardar sin abrir la app se vuelve una necesidad real.
