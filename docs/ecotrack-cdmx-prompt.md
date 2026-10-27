# PROMPT MAESTRO DE INGENIERÍA — ECOTRACK CDMX (FITIA UI + KAHOOT LIVE BOARD)

Actúa como un Principal Full-Stack Architect y Product Designer. Construye una aplicación web interactiva y en tiempo real llamada **"EcoTrack CDMX"**: una calculadora de huella de carbono y ahorro de emisiones por transporte en la Ciudad de México con **interfaz móvil/personal inspirada en Fitia** y un **tablero grupal multijugador en vivo tipo Kahoot**.

---

## 1. ARQUITECTURA FUNCIONAL Y MODOS DE USO

La aplicación debe operar con dos vistas sincronizadas en tiempo real (vía WebSockets / estado compartido en servidor Express + fallback reactivo instantáneo):

1. **Vista Jugador / Calculadora Personal (UI estilo Fitia — Mobile-First):**
   - El usuario ingresa un **PIN de sala de 6 dígitos** y su **Nombre/Alias + Avatar de transporte** (o entra en modo individual).
   - **Header de Presupuesto Diario (Estilo Fitia):**
     - **Anillo Central Animado (SVG):** Muestra el total de **`g CO₂e Ahorrados`** frente a la meta diaria (ej. 1,500 g CO₂e) y en el sub-anillo las **`g CO₂e Emitidas`**.
     - **3 Barras de "Eco-Macros":**
       1. 🔥 **Combustión Directa** (`g CO₂e` de gasolina/diésel).
       2. ⚡ **Huella de Recarga Eléctrica** (`Wh` consumidos de la red CFE/SEN y sus `g CO₂e` asociados).
       3. 🏃 **Movilidad Activa** (`min` caminando/bici y `kcal` quemadas).
   - **Tarjetas de Trayectos por Momento del Día (Estilo Comidas de Fitia):**
     - Bloques: `🌅 Viaje de Ida`, `☀️ Trayecto Intermedio`, `🌆 Viaje de Regreso`, `⚡ Extra`.
     - Botón `+ Registrar Transporte` en cada bloque que abre un **Modal/Drawer interactivo de cálculo**.
   - **Calculadora Interactiva de Acción (Drawer de Registro):**
     - Selector visual de los **8 modos de transporte CDMX**:
       1. `Metrobús CDMX` (Con toggle opcional: Unidad Diésel Euro V/VI vs. Unidad Eléctrica L3/L4)
       2. `Autobús / RTP / Corredor`
       3. `Coche Gasolina (Carpooling)` — Incluye selector interactivo de ocupantes: `1 (Solo)`, `2`, `3`, `4`, `5` personas.
       4. `Coche Eléctrico (EV)` — Incluye desglose de recarga (`kWh` consumidos × factor SEN) + selector de ocupantes (`1 a 5`).
       5. `Scooter Eléctrico` — Muestra huella exacta del gasto de recarga en `Wh` y `g CO₂e`.
       6. `Bicicleta Eléctrica (E-Bike)` — Muestra huella del gasto de recarga en `Wh` y `g CO₂e`.
       7. `Bicicleta Normal / Ecobici` — `0 g CO₂e` + cálculo de ahorro por tiempo/distancia.
       8. `Caminando` — `0 g CO₂e` + cálculo de ahorro por tiempo/distancia.
     - **Toggle de Unidad de Entrada (`Por Tiempo [minutos]` vs. `Por Distancia [km]`):**
       - Slider fluido de `5 min a 120 min` (o `0.5 km a 50 km`).
       - Cuando el usuario mueve el slider de minutos, calcula automáticamente la distancia estimada según la velocidad promedio de ese transporte en CDMX y actualiza en vivo: **Emisión generada (`g CO₂e`)**, **Gasto de recarga (`Wh`)** y **Ahorro neto vs. Auto Particular (`g CO₂e`)**.
     - Al pulsar **"Enviar al Tablero"**, se guarda en su diario estilo Fitia y emite un evento en vivo al Tablero Kahoot.

2. **Vista Host / Tablero Interactivo Grupal (UI estilo Kahoot — Pantalla Completa / Proyector):**
   - **Lobby Superior:** Muestra el **PIN de la Sala** en tipografía gigante, contador de jugadores conectados en vivo y botón para simular/agregar participantes de prueba para demos.
   - **KPIs Colectivos en Tiempo Real:**
     - Total de **`kg CO₂e Ahorrados por el Grupo`**.
     - Total de **`kWh de Recarga Eléctrica`** contabilizados y su huella en la red mexicana.
     - Equivalencias tangibles en CDMX (ej. kilómetros de auto evitados en Insurgentes/Periférico, árboles equivalentes, litros de gasolina no quemados).
   - **Modos de Dinámica del Host (Tabs en vivo):**
     - **Tab 1: Leaderboard & Podium en Vivo:** Podium animado Top 3 + lista clasificada de jugadores mostrando su avatar, modos usados, `g CO₂e` emitidos y `g CO₂e` ahorrados.
     - **Tab 2: Quiz Rápido CDMX (Kahoot Challenge):** 4 preguntas interactivas con temporizador sobre mitos reales de huella de carbono en CDMX (ej. *¿Cuánto contamina la recarga de un EV en México vs. Metrobús?*, *¿Cuánto ahorras en 30 min de Ecobici?*).
     - **Tab 3: Comparador Visual de Modos (Laboratorio CDMX):** Gráfica comparativa interactiva donde el Host mueve un slider de minutos o kilómetros y toda la sala ve en tiempo real cómo compiten los 8 transportes en emisiones directas, huella de recarga y ahorro.

---

## 2. MOTOR MATEMÁTICO EXACTO (CONSTANTES OFICIALES CDMX / MÉXICO)

Implementa un módulo dedicado `src/lib/carbonEngine.ts` con funciones puras y tipadas que utilicen exactamente estas constantes oficiales:

- **Factor de Emisión del Sistema Eléctrico Nacional (FESEN - SEMARNAT/CRE):**
  `GRID_EMISSION_FACTOR_G_PER_KWH = 444` (`0.444 kg CO₂e / kWh`).
- **Línea Base de Comparación (Auto particular gasolina 1 ocupante en tráfico CDMX):**
  `BASELINE_CAR_G_PER_KM = 218` (`g CO₂e / km`).

### Parámetros por Modo de Transporte:
1. **`caminando`**:
   - Velocidad CDMX: `4.8 km/h` (`0.08 km/min`)
   - Emisión directa: `0 g/km` | Consumo eléctrico: `0 kWh/km`
   - Ahorro por minuto: `17.44 g CO₂e / min` | Calorías: `4.2 kcal / min`
2. **`bici_normal` (Bicicleta mecánica / Ecobici)**:
   - Velocidad CDMX: `15.0 km/h` (`0.25 km/min`)
   - Emisión directa: `0 g/km` | Consumo eléctrico: `0 kWh/km`
   - Ahorro por minuto: `54.50 g CO₂e / min` | Calorías: `7.5 kcal / min`
3. **`bici_electrica` (E-Bike)**:
   - Velocidad CDMX: `18.0 km/h` (`0.30 km/min`)
   - Consumo en enchufe (incl. 88% eficiencia de cargador): `0.011 kWh / km` (`11 Wh/km`)
   - Huella de recarga: `0.011 * 444 = 4.88 g CO₂e / km`
   - Ahorro vs. auto solo: `213.12 g CO₂e / km` (`63.94 g CO₂e / min`) | Calorías: `4.0 kcal / min`
4. **`scooter_electrico`**:
   - Velocidad CDMX: `16.0 km/h` (`0.2667 km/min`)
   - Consumo en enchufe (incl. 88% eficiencia de cargador): `0.016 kWh / km` (`16 Wh/km`)
   - Huella de recarga: `0.016 * 444 = 7.10 g CO₂e / km`
   - Ahorro vs. auto solo: `210.90 g CO₂e / km` (`56.24 g CO₂e / min`) | Calorías: `1.5 kcal / min`
5. **`metrobus` (Metrobús CDMX)**:
   - Velocidad CDMX: `19.5 km/h` (`0.325 km/min`)
   - Submodo Estándar (Diésel Euro V/VI articulado): `22.0 g CO₂e / pasajero-km`
   - Submodo Eléctrico (Línea 3 / Línea 4 BRT Eléctrico): Consumo `0.0128 kWh / p-km` -> `5.68 g CO₂e / pasajero-km`
   - Ahorro vs. auto solo (estándar): `196.0 g CO₂e / km` (`63.70 g CO₂e / min`)
6. **`autobus` (Autobús / RTP / Transporte Concesionado)**:
   - Velocidad CDMX: `13.5 km/h` (`0.225 km/min`)
   - Emisión por pasajero: `36.7 g CO₂e / pasajero-km`
   - Ahorro vs. auto solo: `181.3 g CO₂e / km` (`40.79 g CO₂e / min`)
7. **`coche_electrico` (EV en CDMX)**:
   - Velocidad CDMX: `17.0 km/h` (`0.2833 km/min`)
   - Consumo en enchufe (incl. 90% eficiencia del cargador): `0.165 kWh / km` (`165 Wh/km`)
   - Huella de recarga del vehículo: `0.165 * 444 = 73.26 g CO₂e / km`
   - Huella por pasajero (con `N` ocupantes, default `1`): `73.26 / N g CO₂e / p-km`
   - Ahorro por pasajero vs. auto gasolina solo: `218 - (73.26 / N) g CO₂e / km`
8. **`coche_carpool` (Auto Gasolina con Carpooling)**:
   - Velocidad CDMX: `17.0 km/h` (`0.2833 km/min`)
   - Emisión total del vehículo: `218.0 g CO₂e / km`
   - Emisión por pasajero (con `N` ocupantes, $N \in \{1..5\}$): `218.0 / N g CO₂e / p-km`
   - Ahorro individual por compartir: `218.0 * (1 - 1/N) g CO₂e / km`

---

## 3. DIRECCIÓN DE DISEÑO Y SISTEMA VISUAL

- **Estética Híbrida Fitia + Kahoot:**
  - **Modo Calculadora (Fitia):** Tarjetas limpias de alto contraste, bordes redondeados `rounded-2xl`, anillos SVG con trazos suaves (`stroke-linecap="round"`), tipografía numérica tabular (`tabular-nums`) para gramos, watt-hora y minutos, y micro-interacciones fluidas al mover sliders.
  - **Modo Tablero En Vivo (Kahoot):** Fondo profundo de alto contraste (`#0B132B` / `#0F172A`) para proyección en aula/oficina, tarjetas vibrantes con acentos cromáticos semánticos:
    - Verde Fitia (`#10B981`) para Ahorro y Movilidad Activa.
    - Cian Eléctrico (`#06B6D4`) para Micromovilidad y Recarga Eléctrica (SEN).
    - Naranja Metrobús/Transporte Público (`#F59E0B`).
    - Violeta/Índigo Kahoot (`#6366F1`) para el Lobby, PIN de sala y Podium.
- **Navegación Fluida:** Permite alternar en un clic entre **"📱 Mi Calculadora (Vista Fitia)"**, **"🏆 Tablero en Vivo (Vista Kahoot Host)"** y **"🔬 Desglose Técnico de Fórmulas CDMX"** (modal o pestaña educativa donde se explican los factores de SEMARNAT y SEDEMA).

---

## 4. STACK TÉCNICO Y REQUERIMIENTOS DE IMPLEMENTACIÓN

- **Frontend:** React 19 + TypeScript + Tailwind CSS + `lucide-react` + `motion` (Framer Motion) para animaciones de anillos, barras y podium.
- **Backend / Sincronización en Vivo:**
  - Servidor Express (`server.ts`) con API REST (`/api/room`, `/api/room/join`, `/api/room/action`, `/api/room/quiz`) y soporte de polling rápido / Server-Sent Events (SSE) para que varios dispositivos o pestañas abiertos con el mismo PIN vean actualizarse el Leaderboard y el Termómetro de Carbono en tiempo real, además de persistencia local e inicialización con participantes semilla realistas de CDMX para que el tablero luzca vivo desde el primer segundo.
