# D&D Industries — Sistema de Gestión

PWA de gestión para D&D Industries: bazar (POS/inventario), taller de maquinaria
(flota, diagnóstico, órdenes de trabajo), RRHH (asistencia, nómina) y finanzas.
React + TypeScript + Vite, con Dexie (IndexedDB) como base de datos local
"offline-first" y Firebase (Auth + Firestore) para autenticación real y respaldo
en la nube.

## Correr en local

**Requisitos:** Node.js 20+

1. `npm install`
2. Copia `.env.example` a `.env.local` y completa `GEMINI_API_KEY` con tu key de
   [Google AI Studio](https://aistudio.google.com/apikey). Sin esto, el resto de
   la app funciona igual — solo se deshabilitan las funciones de IA (reportes,
   diagnóstico de maquinaria, asistente de pañol).
3. `npm run dev`

> Nota: si el nombre de la carpeta del proyecto contiene un carácter `%`, el
> servidor de desarrollo de Vite falla con "URI malformed". `npm run build` y
> `npm run preview` no tienen ese problema.

## Primer despliegue a producción

Estos pasos solo se hacen una vez (o cuando cambian empleados/reglas):

### 0. Configurar la ubicación real del negocio

`logic/GeofenceService.ts` tiene coordenadas y radio de ejemplo para validar
que el marcaje de asistencia se haga cerca del negocio. Reemplaza
`BUSINESS_LOCATION` con las coordenadas reales (clic derecho en Google Maps
sobre el local → copiar coordenadas) y ajusta `ALLOWED_RADIUS_METERS` según el
tamaño del terreno.

### 1. Crear las cuentas reales de los empleados

El login ya no usa contraseñas locales — verifica contra Firebase Auth. Hay que
crear las cuentas una vez con el script `scripts/seedUsers.mjs`:

1. Firebase Console → Configuración del proyecto → Cuentas de servicio →
   "Generar nueva clave privada". Guarda el JSON como
   `scripts/service-account.json` (ya está en `.gitignore`, nunca se sube).
2. `cp scripts/seed-users.example.json scripts/seed-users.local.json` y pon
   contraseñas reales y únicas para cada persona (también gitignored).
3. Ejecuta:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./scripts/service-account.json npm run seed:users
   ```
4. Cada persona inicia sesión en la app con su `username` (tal cual aparece en
   `seed-users.local.json`, ej. `mama_admin`) y la contraseña que le asignaste.

### 2. Desplegar las reglas de seguridad de Firestore

`firestore.rules` ya está en el repo, pero **no se aplica solo** — hay que
desplegarlo explícitamente:

```bash
firebase login
firebase deploy --only firestore:rules
```

Sin este paso, los datos de ventas, sueldos y clientes pueden quedar expuestos
o la sincronización a la nube puede fallar en silencio, según cómo esté
configurado el proyecto actualmente en la consola de Firebase.

### 3. Restringir la API key de Gemini (mitigación gratuita)

La key de Gemini queda embebida en el JavaScript público del sitio (es
inevitable en una app puramente cliente sin backend). Para acotar el riesgo
sin pagar por Cloud Functions, restríngela en Google Cloud Console:

1. [console.cloud.google.com](https://console.cloud.google.com) → selecciona
   el proyecto de tu key de AI Studio → **APIs y servicios → Credenciales**.
2. Abre la key de Gemini → **Restricciones de la aplicación** → *Sitios web* →
   agrega exactamente los orígenes que vas a usar, ej.:
   - `https://dyd-system.web.app/*`
   - `https://dyd-industries.firebaseapp.com/*`
   - `http://localhost:3000/*` (solo mientras desarrollas)
3. En **Restricciones de la API**, limita la key a la Generative Language API
   únicamente.
4. Opcional pero recomendado: pon una cuota diaria de solicitudes en
   **APIs y servicios → Cuotas** para acotar el daño máximo si igual se filtra.

Esto no es tan fuerte como un backend (un ataque no-navegador puede falsificar
el header `Referer`), pero es gratis, no requiere el plan Blaze de Firebase, y
cubre el caso realista de alguien copiando la key desde el bundle. Si más
adelante quieres cerrarlo del todo, la opción correcta es mover las llamadas a
Gemini detrás de una Firebase Cloud Function (requiere plan Blaze — tiene capa
gratuita amplia, pero exige tarjeta asociada al proyecto).

### 4. Compilar y desplegar el sitio

```bash
npm run build
firebase deploy --only hosting
```

## Limitaciones conocidas

- **Sincronización de un solo sentido**: `logic/CloudSyncService.ts` solo
  empuja datos locales hacia Firestore, nunca los trae de vuelta. Cada
  dispositivo/navegador tiene su propia base local (Dexie/IndexedDB); no hay
  fusión automática de datos entre el dispositivo del bazar y el del taller,
  ni entre dos navegadores del mismo departamento.
- **Perfiles de usuario por dispositivo**: los roles/departamentos de cada
  persona viven en la base local de cada dispositivo (se vinculan a su cuenta
  real de Firebase Auth en el primer login). Un dispositivo nuevo necesita que
  alguien vuelva a poblar esos perfiles antes de que esa persona pueda entrar
  ahí.
- **Tabla de impuestos de nómina simplificada**: `logic/PayrollService.ts`
  usa una tabla de tramos de Impuesto Único aproximada. Válida esos montos con
  un contador antes de usarla para pagar sueldos reales.
