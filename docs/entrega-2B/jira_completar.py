# -*- coding: utf-8 -*-
"""
Completa el proyecto Smart Finance (clave SF) en Jira Cloud – Grupo 6.

Qué hace (en este orden):
  1. Crea los ítems que faltan (SF-35 a SF-42) con historia, criterios, prioridad, puntos y responsable.
  2. Crea las 8 épicas (SF-E1 a SF-E8) y asigna cada ítem a su épica.
  3. Completa los ítems existentes SF-1 a SF-34: descripción (historia + criterios), prioridad, puntos y responsable.
  4. Organiza los Sprints 1 a 5 en el tablero: crea los que falten, mete cada ítem en su Sprint,
     cierra los Sprints 1 a 4 (con sus fechas) y deja activo el Sprint 5.
  5. Mueve cada ítem a su estado (Por hacer / En curso / Hecho).

Uso (Windows, en la carpeta donde guardaste este archivo):
  python jira_completar.py            -> SIMULACIÓN: muestra lo que haría, no cambia nada
  python jira_completar.py --aplicar  -> hace los cambios

Necesita solo Python 3 (sin librerías extra). Te pedirá tu correo de Atlassian y un token de API
(créalo en https://id.atlassian.com/manage-profile/security/api-tokens). El token no se guarda.
También los lee de las variables de entorno JIRA_EMAIL y JIRA_API_TOKEN si existen.
"""
import base64, getpass, json, re, sys, urllib.error, urllib.request

SITE = 'https://cm942995.atlassian.net'
PROJECT = 'SF'
BOARD = 1
APLICAR = '--aplicar' in sys.argv
DATA = json.loads(r'''{
 "epics": [
  {
   "id": "SF-E1",
   "name": "Fundación técnica y arquitectura",
   "desc": "Entorno Expo/React Native, base de datos local SQLite, navegación y tema."
  },
  {
   "id": "SF-E2",
   "name": "Cuentas y movimientos",
   "desc": "RF1 y RF2: cuentas, ingresos, gastos, transferencias, recurrentes, búsqueda."
  },
  {
   "id": "SF-E3",
   "name": "Planificación financiera",
   "desc": "Presupuestos, metas de ahorro, deudas y división de gastos, alertas."
  },
  {
   "id": "SF-E4",
   "name": "Suscripciones y recordatorios",
   "desc": "RF5: pagos recurrentes con notificaciones antes de cada cobro."
  },
  {
   "id": "SF-E5",
   "name": "Inteligencia artificial",
   "desc": "RF3 y RF4: servidor de IA protegido, asistente financiero, escáner de recibos, presupuesto sugerido."
  },
  {
   "id": "SF-E6",
   "name": "Reportes y datos",
   "desc": "RF6: reportes con gráficas, exportación PDF/CSV, respaldo e importación."
  },
  {
   "id": "SF-E7",
   "name": "Seguridad y acceso",
   "desc": "RF7: biometría, PIN de respaldo, perfiles."
  },
  {
   "id": "SF-E8",
   "name": "Calidad, despliegue y documentación",
   "desc": "Pruebas, integración continua, compilaciones, entregas académicas y sustentación."
  }
 ],
 "items": [
  {
   "id": "SF-01",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Definir problema, objetivos y roles Scrum (Entrega 1A)",
   "story": "Como equipo, queremos definir el problema, los objetivos y los roles para alinear el alcance del proyecto.",
   "criteria": "Documento 1A entregado; roles PO y SM asignados.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 1",
   "state": "Hecho",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-02",
   "epic": "SF-E1",
   "type": "Tarea",
   "summary": "Configurar entorno Expo + React Native y repositorio GitHub",
   "story": "Como desarrollador, quiero un entorno configurado y versionado para trabajar en equipo.",
   "criteria": "La app abre en Expo Go; repositorio con rama main protegida.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 1",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-03",
   "epic": "SF-E1",
   "type": "Historia",
   "summary": "Diseñar el esquema de la base de datos local SQLite",
   "story": "Como usuario, quiero que mis datos se guarden en mi teléfono para usar la app sin internet.",
   "criteria": "Tablas creadas con índices; los datos persisten al cerrar la app.",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 1",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-04",
   "epic": "SF-E1",
   "type": "Historia",
   "summary": "Estructura de navegación (Expo Router) y tema claro/oscuro",
   "story": "Como usuario, quiero navegar con pestañas y elegir tema claro u oscuro para usar la app con comodidad.",
   "criteria": "5 pestañas operativas; el tema cambia sin reiniciar.",
   "priority": "Media",
   "points": 3,
   "sprint": "Sprint 1",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-05",
   "epic": "SF-E2",
   "type": "Historia",
   "summary": "Dashboard: saldo total, tarjetas de resumen y gráfica ingresos vs gastos",
   "story": "Como usuario, quiero ver mi saldo y el resumen del mes al abrir la app para conocer mi situación de un vistazo.",
   "criteria": "Saldo total correcto; gráfica de 6 meses; carga < 2 s (RNF1).",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 1",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-06",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Datos de prueba y verificación en iPhone",
   "story": "Como equipo, queremos probar la app en un iPhone real para validar el incremento.",
   "criteria": "App instalada en iPhone con datos de prueba.",
   "priority": "Media",
   "points": 2,
   "sprint": "Sprint 1",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-07",
   "epic": "SF-E2",
   "type": "Historia",
   "summary": "RF1 · Gestión de cuentas (crear, editar, eliminar; COP/USD/EUR)",
   "story": "Como usuario, quiero registrar mis cuentas bancarias, billeteras y efectivo para consolidar mi dinero.",
   "criteria": "CRUD de cuentas; moneda COP/USD/EUR; total en pesos con tasa vigente.",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 2",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-08",
   "epic": "SF-E2",
   "type": "Historia",
   "summary": "RF2 · Registro de gastos e ingresos con categoría, fecha y nota",
   "story": "Como usuario, quiero registrar gastos e ingresos con categoría para saber en qué uso mi dinero.",
   "criteria": "Movimiento guardado y saldo actualizado de forma atómica (RNF2); funciona sin internet (RNF4).",
   "priority": "Alta",
   "points": 8,
   "sprint": "Sprint 2",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-09",
   "epic": "SF-E2",
   "type": "Historia",
   "summary": "Transferencias entre cuentas con actualización de saldos",
   "story": "Como usuario, quiero mover dinero entre mis cuentas sin que cuente como gasto.",
   "criteria": "Ambos saldos cambian en la misma transacción; soporta monedas distintas.",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 2",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-10",
   "epic": "SF-E2",
   "type": "Historia",
   "summary": "Búsqueda y filtros de movimientos",
   "story": "Como usuario, quiero buscar y filtrar movimientos para encontrar un gasto rápido.",
   "criteria": "Filtro por texto, categoría, cuenta, tipo y fechas.",
   "priority": "Media",
   "points": 3,
   "sprint": "Sprint 2",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-11",
   "epic": "SF-E2",
   "type": "Historia",
   "summary": "Movimientos recurrentes (salario, arriendo, servicios)",
   "story": "Como usuario, quiero que mis pagos fijos se registren solos para no olvidarlos.",
   "criteria": "Semanal, quincenal o mensual; sin duplicados; 31 → 28 feb → 31 mar.",
   "priority": "Media",
   "points": 5,
   "sprint": "Sprint 2",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-12",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Glosario y especificación de requerimientos RF1–RF7 (Entrega 1B)",
   "story": "Como equipo, queremos especificar los requerimientos funcionales para guiar el desarrollo.",
   "criteria": "Fichas RF1–RF7 aprobadas por el PO.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 2",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-13",
   "epic": "SF-E3",
   "type": "Historia",
   "summary": "Metas de ahorro con cálculo de aporte semanal/mensual",
   "story": "Como usuario, quiero crear metas y saber cuánto ahorrar por semana para cumplirlas a tiempo.",
   "criteria": "Progreso en %; aporte sugerido; meta completada al llegar al objetivo.",
   "priority": "Media",
   "points": 5,
   "sprint": "Sprint 3",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-14",
   "epic": "SF-E3",
   "type": "Historia",
   "summary": "Presupuestos mensuales con semáforo y alertas",
   "story": "Como usuario, quiero un límite mensual por categoría con semáforo para no gastar de más.",
   "criteria": "Verde < 80 %, naranja 80–99 %, rojo ≥ 100 %; notificación al 80 %.",
   "priority": "Media",
   "points": 5,
   "sprint": "Sprint 3",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-15",
   "epic": "SF-E4",
   "type": "Historia",
   "summary": "RF5 · Suscripciones y recordatorios antes de cada cobro",
   "story": "Como usuario, quiero registrar mis suscripciones y recibir recordatorios para evitar cobros sorpresa.",
   "criteria": "Recordatorios 7, 3 y 1 día antes; costo mensual y anual.",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 3",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-16",
   "epic": "SF-E6",
   "type": "Historia",
   "summary": "RF6 · Reportes con gráficas y exportación PDF/CSV",
   "story": "Como usuario, quiero ver reportes y exportarlos para analizarlos o compartirlos.",
   "criteria": "Gráfica por categoría, comparación mensual, PDF y CSV para Excel (RNF11).",
   "priority": "Alta",
   "points": 8,
   "sprint": "Sprint 3",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-17",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Casos de uso CU-001 a CU-007 y storyboard (Entrega 2A)",
   "story": "Como equipo, queremos modelar los casos de uso para validar el comportamiento esperado.",
   "criteria": "7 casos de uso especificados y storyboard inicial.",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 3",
   "state": "Hecho",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-18",
   "epic": "SF-E6",
   "type": "Historia",
   "summary": "Respaldo: exportar e importar todos los datos",
   "story": "Como usuario, quiero respaldar mis datos para no perderlos si cambio de teléfono.",
   "criteria": "Exportar → borrar → importar deja los mismos datos (RNF3).",
   "priority": "Media",
   "points": 3,
   "sprint": "Sprint 3",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-19",
   "epic": "SF-E7",
   "type": "Historia",
   "summary": "RF7 · Autenticación biométrica (Face ID/huella) con PIN de respaldo",
   "story": "Como usuario, quiero proteger la app con Face ID y un PIN para que nadie más vea mis finanzas.",
   "criteria": "Bloqueo al abrir; PIN en SecureStore; mensaje si el PIN es incorrecto (RNF9).",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-20",
   "epic": "SF-E5",
   "type": "Historia",
   "summary": "Servidor de IA protegido (token, 20 peticiones/min, tamaño máximo)",
   "story": "Como dueño del producto, quiero proteger el servidor de IA para que solo la app use la cuota.",
   "criteria": "401 sin token, 429 sobre 20/min, 413 por tamaño (RNF10).",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-21",
   "epic": "SF-E5",
   "type": "Historia",
   "summary": "RF4 · Asistente financiero con IA (Gemini) y contexto completo",
   "story": "Como usuario, quiero preguntarle a una IA sobre mis gastos para recibir consejos personalizados.",
   "criteria": "Respuesta con datos reales del usuario; error controlado sin internet.",
   "priority": "Alta",
   "points": 8,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-22",
   "epic": "SF-E5",
   "type": "Historia",
   "summary": "RF3 · Escáner de recibos con IA y foto adjunta al movimiento",
   "story": "Como usuario, quiero fotografiar un recibo para que el gasto se llene solo.",
   "criteria": "Monto y comercio precargados; foto adjunta; aviso si no se lee el monto.",
   "priority": "Alta",
   "points": 8,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-23",
   "epic": "SF-E5",
   "type": "Historia",
   "summary": "Presupuesto sugerido por IA y alertas inteligentes de gasto",
   "story": "Como usuario, quiero que la IA me sugiera un presupuesto para empezar sin calcularlo yo.",
   "criteria": "Sugerencia basada en 3 meses de historial; el usuario puede editarla.",
   "priority": "Media",
   "points": 5,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-24",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "201 pruebas automáticas e integración continua (GitHub Actions)",
   "story": "Como equipo, queremos pruebas automáticas en cada cambio para evitar regresiones.",
   "criteria": "Workflow de pruebas en verde en cada push (RNF6).",
   "priority": "Alta",
   "points": 8,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-25",
   "epic": "SF-E3",
   "type": "Historia",
   "summary": "Deudas y préstamos, división de gastos e importación de extractos",
   "story": "Como usuario, quiero llevar quién me debe y dividir gastos para no perder dinero entre amigos.",
   "criteria": "Abonos parciales; deuda saldada al completar; extractos CSV con vista previa.",
   "priority": "Baja",
   "points": 5,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-26",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Compilación iOS en la nube e instalación en iPhone",
   "story": "Como equipo, queremos compilar la app iOS en la nube para instalarla sin Mac.",
   "criteria": ".ipa generado por GitHub Actions e instalado.",
   "priority": "Media",
   "points": 3,
   "sprint": "Sprint 4",
   "state": "Hecho",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-27",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "EDT, informe de Sprints y backlog en Jira (Entrega 2A Parte 1)",
   "story": "Como equipo, queremos documentar la EDT y el backlog para gestionar el proyecto.",
   "criteria": "Entrega 2A Parte 1 enviada; backlog en Jira.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "En proceso",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-28",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Pruebas en dispositivo de la versión del Sprint 4",
   "story": "Como PO, quiero probar la versión en el teléfono para aceptar el incremento.",
   "criteria": "Lista de chequeo de pruebas firmada por el PO.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "En proceso",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-29",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Compilación Android (.apk firmado; secretos de firma en GitHub)",
   "story": "Como usuario de Android, quiero instalar la app en mi teléfono.",
   "criteria": ".apk firmado generado por GitHub Actions.",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 5",
   "state": "En proceso",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-30",
   "epic": "SF-E6",
   "type": "Historia",
   "summary": "Incluir las fotos de los recibos en el respaldo",
   "story": "Como usuario, quiero que el respaldo incluya las fotos de mis recibos para no perderlas.",
   "criteria": "Restaurar un respaldo recupera las fotos.",
   "priority": "Media",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Por hacer",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-31",
   "epic": "SF-E6",
   "type": "Historia",
   "summary": "Sincronización iPhone ↔ Android",
   "story": "Como usuario con dos teléfonos, quiero sincronizar mis datos entre ellos.",
   "criteria": "Los cambios de un teléfono aparecen en el otro.",
   "priority": "Baja",
   "points": 8,
   "sprint": "Sprint 5",
   "state": "Por hacer",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-32",
   "epic": "SF-E1",
   "type": "Tarea",
   "summary": "Actualización a Expo SDK 58",
   "story": "Como desarrollador, quiero actualizar a Expo SDK 58 para mantener el soporte.",
   "criteria": "App compila y pruebas en verde con SDK 58.",
   "priority": "Baja",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Por hacer",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-33",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Manual de usuario y documentación técnica",
   "story": "Como usuario, quiero un manual para aprender a usar la app.",
   "criteria": "Manual con capturas; README técnico actualizado.",
   "priority": "Media",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Por hacer",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-34",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Pruebas de aceptación con el Product Owner y sustentación final",
   "story": "Como PO, quiero validar el producto final antes de la sustentación.",
   "criteria": "Criterios de aceptación de RF1–RF7 verificados.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Por hacer",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-35",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Storyboard de interfaces con transiciones (Entrega 2B)",
   "story": "Como equipo, queremos un storyboard de las interfaces reales para comunicar cómo se comporta la app.",
   "criteria": "5 láminas con acción del usuario y respuesta del sistema.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Hecho",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-36",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Requerimientos no funcionales RNF1–RNF13 y restricciones técnicas",
   "story": "Como equipo, queremos definir los RNF por atributo de calidad para fijar los criterios del sistema.",
   "criteria": "13 RNF con ficha y criterio medible; tabla de tecnologías.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Hecho",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-37",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Diagramas UML: casos de uso, clases (2 propuestas), actividades, secuencia, estados y componentes",
   "story": "Como equipo, queremos modelar el sistema en UML para documentar la arquitectura.",
   "criteria": "Diagramas en PlantUML con imágenes; propuesta de clases seleccionada y justificada.",
   "priority": "Alta",
   "points": 5,
   "sprint": "Sprint 5",
   "state": "Hecho",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-38",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Informe 2B Parte 2 y presentación de sustentación",
   "story": "Como equipo, queremos entregar el informe y la presentación de la etapa de diseño.",
   "criteria": "ZIP Grupo6-DisenoUML con informe, UML y presentación.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Hecho",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  },
  {
   "id": "SF-39",
   "epic": "SF-E8",
   "type": "Historia",
   "summary": "Verificar rendimiento con 5.000 movimientos (RNF1)",
   "story": "Como usuario con mucho historial, quiero que la app siga rápida.",
   "criteria": "Dashboard < 2 s con 5.000 movimientos en gama media.",
   "priority": "Media",
   "points": 3,
   "sprint": "Backlog",
   "state": "Por hacer",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-40",
   "epic": "SF-E8",
   "type": "Historia",
   "summary": "Auditoría de accesibilidad con VoiceOver y TalkBack (RNF13)",
   "story": "Como usuario con baja visión, quiero usar la app con lector de pantalla.",
   "criteria": "Registrar un gasto completo con VoiceOver; contraste ≥ 4,5:1.",
   "priority": "Media",
   "points": 3,
   "sprint": "Backlog",
   "state": "Por hacer",
   "owner": "Mauro Romero"
  },
  {
   "id": "SF-41",
   "epic": "SF-E5",
   "type": "Historia",
   "summary": "Prueba de carga del servidor de IA (RNF12)",
   "story": "Como dueño del producto, quiero saber cuántos usuarios simultáneos soporta el servidor.",
   "criteria": "50 peticiones simultáneas sin errores 5xx propios.",
   "priority": "Baja",
   "points": 3,
   "sprint": "Backlog",
   "state": "Por hacer",
   "owner": "Juan Camilo Alfonso"
  },
  {
   "id": "SF-42",
   "epic": "SF-E8",
   "type": "Tarea",
   "summary": "Atender las observaciones de la sustentación parcial",
   "story": "Como equipo, queremos corregir el informe según las observaciones del docente para cumplir la rúbrica.",
   "criteria": "Problemática con referencias, alcance, actores, interoperabilidad, objetivos, casos de uso, storyboard y evidencias corregidos.",
   "priority": "Alta",
   "points": 3,
   "sprint": "Sprint 5",
   "state": "Hecho",
   "owner": "Mauro Romero y Juan Camilo Alfonso"
  }
 ],
 "sprint_dates": {
  "1": [
   "2026-08-17",
   "2026-08-28"
  ],
  "2": [
   "2026-08-31",
   "2026-09-11"
  ],
  "3": [
   "2026-09-14",
   "2026-09-25"
  ],
  "4": [
   "2026-09-28",
   "2026-10-09"
  ],
  "5": [
   "2026-10-12",
   "2026-10-23"
  ]
 }
}''')

AUTH = None
def api(method, path, body=None, ok_404=False):
    req = urllib.request.Request(SITE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': AUTH, 'Accept': 'application/json',
                                          'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read().decode() or 'null'
            return json.loads(txt)
    except urllib.error.HTTPError as e:
        if ok_404 and e.code == 404: return None
        raise SystemExit(f'\nError {e.code} en {method} {path}:\n{e.read().decode()[:800]}')

def write(method, path, body=None, what=''):
    print(('  [hace]   ' if APLICAR else '  [haría]  ') + what)
    return api(method, path, body) if APLICAR else None

def adf(historia, criterios, responsable):
    def p(t, bold=False):
        n = {'type': 'text', 'text': t}
        if bold: n['marks'] = [{'type': 'strong'}]
        return n
    crit = [c.strip() for c in re.split(r';\s*', criterios) if c.strip()]
    return {'type': 'doc', 'version': 1, 'content': [
        {'type': 'paragraph', 'content': [p('Historia de usuario: ', True), p(historia)]},
        {'type': 'paragraph', 'content': [p('Criterios de aceptación:', True)]},
        {'type': 'bulletList', 'content': [{'type': 'listItem', 'content': [{'type': 'paragraph', 'content': [p(c)]}]} for c in crit]},
        {'type': 'paragraph', 'content': [p('Responsable: ', True), p(responsable)]},
    ]}

def main():
    global AUTH
    print(__doc__.split('Uso')[0])
    print('MODO:', 'APLICAR CAMBIOS' if APLICAR else 'SIMULACIÓN (no cambia nada; usa --aplicar para hacerlo)', '\n')
    import os
    email = os.environ.get('JIRA_EMAIL') or input('Correo de tu cuenta Atlassian: ').strip()
    token = os.environ.get('JIRA_API_TOKEN') or getpass.getpass('Token de API (no se muestra al escribir): ').strip()
    AUTH = 'Basic ' + base64.b64encode(f'{email}:{token}'.encode()).decode()
    me = api('GET', '/rest/api/3/myself'); print(f'\nConectado como {me["displayName"]}.\n')

    # --- tipos de incidencia, campos, prioridades
    proj = api('GET', f'/rest/api/3/project/{PROJECT}')
    types = [t for t in proj['issueTypes'] if not t.get('subtask')]
    epic_t = next(t for t in types if t.get('hierarchyLevel') == 1)
    def find_type(names):
        for t in types:
            if t.get('hierarchyLevel', 0) == 0 and t['name'].lower() in names: return t
        return next(t for t in types if t.get('hierarchyLevel', 0) == 0)
    type_of = {'Historia': find_type({'story', 'historia'}), 'Tarea': find_type({'task', 'tarea'})}
    fields = api('GET', '/rest/api/3/field')
    sp = next((f['id'] for f in fields if f['name'].lower() in ('story point estimate', 'estimación de puntos de historia')), None) \
        or next((f['id'] for f in fields if 'story point' in f['name'].lower() or 'puntos de historia' in f['name'].lower()), None)
    prios = {p['name'].lower(): p['id'] for p in api('GET', '/rest/api/3/priority')}
    def prio(es):
        for n in {'Alta': ('high', 'alta'), 'Media': ('medium', 'media'), 'Baja': ('low', 'baja')}[es]:
            if n in prios: return {'id': prios[n]}
        return None
    users = {}
    for u in api('GET', f'/rest/api/3/user/assignable/search?project={PROJECT}&maxResults=50'):
        users[u['displayName'].lower()] = u['accountId']
    def account(resp):
        if ' y ' in resp: return None
        first = resp.split()[0].lower()
        return next((a for n, a in users.items() if first in n), None)
    print(f'Tipos: épica="{epic_t["name"]}", historia="{type_of["Historia"]["name"]}", tarea="{type_of["Tarea"]["name"]}". '
          f'Campo de puntos: {sp or "NO ENCONTRADO (se omiten los puntos)"}.')
    print('Personas asignables:', ', '.join(users) or 'ninguna', '\n')

    # --- incidencias existentes
    existing, token_ = {}, None
    while True:
        body = {'jql': f'project = {PROJECT} ORDER BY key ASC', 'fields': ['summary', 'issuetype', 'status', 'parent'], 'maxResults': 100}
        if token_: body['nextPageToken'] = token_
        res = api('POST', '/rest/api/3/search/jql', body)
        for it in res.get('issues', []): existing[it['key']] = it
        token_ = res.get('nextPageToken')
        if not token_ or res.get('isLast'): break
    nums = sorted(int(k.split('-')[1]) for k in existing)
    print(f'El proyecto tiene {len(existing)} incidencias (última: {PROJECT}-{nums[-1] if nums else 0}).')

    def jkey(item_id): return f'{PROJECT}-{int(item_id.split("-")[1])}'
    items = DATA['items']
    missing = [it for it in items if jkey(it['id']) not in existing]
    print('\nComparación de los ítems existentes (revisa que coincidan):')
    for it in items:
        k = jkey(it['id'])
        if k in existing:
            print(f'  {k:7} Jira: {existing[k]["fields"]["summary"][:55]:55} | plan: {it["summary"][:45]}')
    if nums and missing and nums[-1] + 1 != int(missing[0]['id'].split('-')[1]):
        print(f'\nAVISO: los ítems nuevos no quedarán con las claves {missing[0]["id"]}… porque la última clave es {PROJECT}-{nums[-1]}.')

    # 1. crear ítems faltantes (primero, para que tomen las claves siguientes)
    print(f'\n1) Crear {len(missing)} ítems nuevos')
    for it in missing:
        f = {'project': {'key': PROJECT}, 'issuetype': {'id': type_of[it['type']]['id']}, 'summary': it['summary'],
             'description': adf(it['story'], it['criteria'], it['owner']), 'labels': ['smart-finance']}
        r = write('POST', '/rest/api/3/issue', {'fields': f}, f'crear {it["id"]} · {it["summary"][:60]}')
        if r: existing[r['key']] = {'key': r['key'], 'fields': {'summary': it['summary'], 'status': {'statusCategory': {'key': 'new'}}}}
        if r and r['key'] != jkey(it['id']): print(f'           (quedó como {r["key"]})'); it['real'] = r['key']

    # 2. épicas
    print('\n2) Crear las 8 épicas')
    epic_keys = {}
    for k, it in existing.items():
        m = re.match(r'(SF-E\d)\b', it['fields']['summary'])
        if m: epic_keys[m.group(1)] = k
    for e in DATA['epics']:
        if e['id'] in epic_keys: print(f'  [ya está] {e["id"]} = {epic_keys[e["id"]]}'); continue
        f = {'project': {'key': PROJECT}, 'issuetype': {'id': epic_t['id']}, 'summary': f'{e["id"]} · {e["name"]}',
             'description': {'type': 'doc', 'version': 1, 'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': e['desc']}]}]},
             'labels': ['smart-finance']}
        r = write('POST', '/rest/api/3/issue', {'fields': f}, f'crear épica {e["id"]} · {e["name"]}')
        epic_keys[e['id']] = r['key'] if r else f'<{e["id"]}>'

    # 3. completar todos los ítems
    print('\n3) Completar épica, descripción, prioridad, puntos y responsable de cada ítem')
    for it in items:
        k = it.get('real', jkey(it['id']))
        f = {'parent': {'key': epic_keys[it['epic']]}, 'description': adf(it['story'], it['criteria'], it['owner'])}
        pr = prio(it['priority']);  acc = account(it['owner'])
        if pr: f['priority'] = pr
        if sp: f[sp] = it['points']
        if acc: f['assignee'] = {'accountId': acc}
        write('PUT', f'/rest/api/3/issue/{k}', {'fields': f},
              f'{k}: épica {it["epic"]}, prioridad {it["priority"]}, {it["points"]} pts, {it["owner"]}')

    # 4. sprints
    print('\n4) Sprints del tablero')
    sprints, start = {}, 0
    while True:
        res = api('GET', f'/rest/agile/1.0/board/{BOARD}/sprint?startAt={start}&maxResults=50')
        for s in res['values']:
            m = re.search(r'(\d+)\s*$', s['name'])
            if m: sprints[int(m.group(1))] = s
        if res.get('isLast', True): break
        start += 50
    for n, (ini, fin) in DATA['sprint_dates'].items():
        n = int(n); s = sprints.get(n)
        keys = [it.get('real', jkey(it['id'])) for it in items if it['sprint'] == f'Sprint {n}']
        if not s:
            r = write('POST', '/rest/agile/1.0/sprint', {'name': f'{PROJECT} Sprint {n}', 'originBoardId': BOARD,
                      'startDate': ini + 'T08:00:00.000-05:00', 'endDate': fin + 'T18:00:00.000-05:00'}, f'crear "{PROJECT} Sprint {n}" ({ini} a {fin})')
            s = r or {'id': None, 'state': 'future', 'name': f'{PROJECT} Sprint {n}'}
            sprints[n] = s
        if s['state'] == 'closed':
            print(f'  [ya cerrado] {s["name"]}: no se pueden agregar ítems a un Sprint cerrado.'); continue
        if s['id'] and keys:
            write('POST', f'/rest/agile/1.0/sprint/{s["id"]}/issue', {'issues': keys}, f'meter {len(keys)} ítems en {s["name"]}')
        elif keys: print(f'  [haría]  meter {len(keys)} ítems en {s["name"]}')
        # estados de los ítems de este sprint antes de cerrarlo
        set_states([it for it in items if it['sprint'] == f'Sprint {n}'], jkey)
        if n < 5:
            if s['state'] == 'future':
                write('POST', f'/rest/agile/1.0/sprint/{s["id"]}', {'state': 'active', 'startDate': ini + 'T08:00:00.000-05:00',
                      'endDate': fin + 'T18:00:00.000-05:00'}, f'iniciar {s["name"]}')
            write('POST', f'/rest/agile/1.0/sprint/{s["id"]}', {'state': 'closed'}, f'cerrar {s["name"]}')
        elif s['state'] == 'future':
            write('POST', f'/rest/agile/1.0/sprint/{s["id"]}', {'state': 'active', 'startDate': ini + 'T08:00:00.000-05:00',
                  'endDate': fin + 'T18:00:00.000-05:00'}, f'iniciar {s["name"]} (Sprint actual)')
    print('\n5) Estados de los ítems sin Sprint (Backlog)')
    set_states([it for it in items if it['sprint'] == 'Backlog'], jkey)
    print('\nListo.' if APLICAR else '\nSimulación terminada. Si todo se ve bien, ejecuta:  python jira_completar.py --aplicar')

TARGET = {'Hecho': 'done', 'En proceso': 'indeterminate', 'Por hacer': 'new'}
def set_states(its, jkey):
    for it in its:
        k = it.get('real', jkey(it['id'])); want = TARGET[it['state']]
        if not APLICAR:
            print(f'  [haría]  {k} → {it["state"]}'); continue
        cur = api('GET', f'/rest/api/3/issue/{k}?fields=status')['fields']['status']['statusCategory']['key']
        if cur == want: continue
        tr = api('GET', f'/rest/api/3/issue/{k}/transitions')['transitions']
        t = next((t for t in tr if t['to']['statusCategory']['key'] == want), None)
        if t: write('POST', f'/rest/api/3/issue/{k}/transitions', {'transition': {'id': t['id']}}, f'{k} → {t["to"]["name"]}')
        else: print(f'  [aviso]  {k}: no hay transición hacia "{it["state"]}"')

if __name__ == '__main__':
    main()
