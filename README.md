# FinanceAI

App móvil de finanzas personales con asistente de inteligencia artificial, hecha con **Expo SDK 57** (React Native 0.86) para iPhone y Android.

Los datos financieros se guardan **solo en el teléfono** (SQLite). La IA (Google Gemini) se usa a través de un servidor propio que protege la API key.

![Pruebas](https://github.com/CamiloMaartinez/FinanceAI/actions/workflows/tests.yml/badge.svg)

---

## Funciones

| Módulo | Qué hace |
|---|---|
| **Cuentas** | Ahorros, efectivo, billeteras digitales, tarjetas de crédito; en COP, USD o EUR |
| **Movimientos** | Gastos, ingresos y transferencias entre cuentas, con fecha, categoría y nota; búsqueda y filtros |
| **Recurrentes** | Salario, arriendo, servicios: se registran solos cada semana, quincena o mes |
| **Presupuestos** | Límite mensual con semáforo (verde / naranja / rojo) y alertas |
| **Metas de ahorro** | Progreso y cuánto ahorrar por semana o mes para llegar a tiempo |
| **Suscripciones** | Costo anual, recordatorios 7, 3 y 1 día antes de cada cobro |
| **Tarjetas, alertas y retos** | Seguimiento de tarjetas, alertas de gasto inusual y retos de ahorro |
| **Reportes** | Gráficas por categoría, comparación entre meses, patrimonio y exportación a PDF |
| **Asistente IA** | Responde preguntas con tus datos, evalúa compras, predice el gasto del mes y hace un resumen semanal |
| **Escáner de recibos** | Lee monto y comercio desde una foto del recibo |
| **Atajos de Siri / Apple Pay** | `financeai://transactions?monto=25000&nota=Starbucks` abre un movimiento precargado |
| **Seguridad** | Face ID / huella, PIN de respaldo, perfiles separados |
| **Respaldos** | Exportar e importar todos los datos; recordatorio semanal |
| **Exportar a Excel** | Movimientos en CSV listo para Excel en español |
| **Tasas de cambio** | USD y EUR se actualizan solas cada día (o manuales) |

---

## Arquitectura

```
iPhone / Android                         Servidor (EAS Hosting)            Google
┌──────────────────────────┐   HTTPS +   ┌───────────────────────┐        ┌────────┐
│ App Expo (React Native)  │  x-app-token│ Rutas app/api/*       │  API   │ Gemini │
│  • Pantallas (app/)      │ ──────────▶ │  • guard.ts: token,   │ ─────▶ │        │
│  • SQLite local (datos)  │             │    límite, tamaño     │  key   └────────┘
│  • Notificaciones locales│             │  • gemini.ts          │
└──────────────────────────┘             └───────────────────────┘
```

- **Los datos nunca salen del teléfono**, excepto los resúmenes que se envían a la IA cuando el usuario la usa.
- **La API key de Gemini solo vive en el servidor.** La app se autentica con un token propio y el servidor limita a 20 peticiones por minuto por IP.

### Estructura del código

```
app/                 Pantallas (Expo Router) y rutas de API del servidor
  (tabs)/            Inicio, Movimientos, Reportes, Perfil, Más y módulos
  api/               Rutas de IA: assistant, scan-receipt, suggest-category...
src/
  components/        Componentes de interfaz (formularios, tarjetas, modales)
  database/db.ts     Esquema SQLite, migraciones y todas las consultas
  hooks/             Lógica de cada pantalla (useTransactions, useBudgets...)
  services/          Respaldos, notificaciones, tasas de cambio, CSV, IA
  server/            Código que solo corre en el servidor (gemini.ts, guard.ts)
  utils/             Cálculos puros: presupuestos, metas, recurrencias, CSV...
__tests__/           Pruebas automáticas (Jest)
.github/workflows/   Integración continua y compilación de iOS y Android
```

---

## Desarrollo

Requisitos: **Node.js 22.13 o superior** y una cuenta de Expo.

```bash
npm install
cp .env.example .env      # completar GEMINI_API_KEY y APP_TOKEN
npx expo login
npx expo start --go       # abrir con Expo Go en el teléfono
```

### Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `GEMINI_API_KEY` | Servidor (EAS, `production`) | API key de Google Gemini |
| `APP_TOKEN` | Servidor (EAS, `production`) | Token que exige `guard.ts` |
| `EXPO_PUBLIC_APP_TOKEN` | App (secreto de GitHub Actions) | El mismo token, incrustado al compilar |
| `EXPO_PUBLIC_API_BASE_URL` | App | URL del servidor desplegado |

### Desplegar el servidor de IA

```bash
npm run deploy:api
```

El script exporta la web **sin** el token de la app, verifica que no se haya filtrado al código público y despliega en EAS Hosting.

---

## Pruebas

```bash
npm test                 # todas las pruebas
npm run test:watch       # se repiten al guardar
npm run test:coverage    # con reporte de cobertura
```

Las pruebas de base de datos ejecutan el **SQL real de `db.ts`** sobre un SQLite en memoria (`node:sqlite`), así que verifican saldos, transferencias y recurrentes sin necesidad de un teléfono.

| Área | Qué se verifica |
|---|---|
| Saldos y transferencias | Que cada movimiento mueva las cuentas correctas; editar, borrar y atomicidad |
| Recurrentes y suscripciones | Fechas pendientes, sin duplicados, 31 → 28 feb → 31 mar |
| Cálculos | Presupuestos, metas, predicción del mes, formatos de dinero |
| Tasas de cambio | Conversión de la API, caché de 12 h, sin internet, modo manual |
| CSV | Formato para Excel, comillas, protección contra fórmulas |
| Servidor | Token, límite de peticiones, tamaño máximo |

GitHub Actions corre TypeScript y todas las pruebas en cada push a `main` (workflow **Pruebas**).

---

## Instalar en el teléfono (gratis)

| Plataforma | Cómo |
|---|---|
| **iPhone** | GitHub → Actions → **iOS IPA (SideStore)** → descargar el `.ipa` → instalar con [iloader](https://docs.sidestore.io) por cable y Apple ID gratuito. La firma dura 7 días; se renueva reinstalando. |
| **Android** | GitHub → Actions → **Android APK** → descargar el `.apk` → abrirlo en el teléfono. Requiere los secretos `ANDROID_KEYSTORE_BASE64` y `ANDROID_KEYSTORE_PASSWORD`. |

---

## Tecnologías

Expo SDK 57 · React Native 0.86 · Expo Router · expo-sqlite · Reanimated · Google Gemini · EAS Hosting · Jest · GitHub Actions

Tasas de cambio: [Rates By Exchange Rate API](https://www.exchangerate-api.com)
