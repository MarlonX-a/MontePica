# Guía para agentes de MontePica

Lee estas instrucciones antes de modificar la aplicación. Mantén los cambios dentro del alcance solicitado y conserva los avances locales existentes.

## Forma de colaborar

- Comunícate en español salvo que el usuario pida otro idioma.
- Implementa la petición concreta. El proyecto se está construyendo por partes: trabaja en la pantalla o funcionalidad solicitada y no adelantes pantallas, rutas ni funciones que todavía no se han pedido.
- Usa las capturas adjuntas como referencia visual. Implementa únicamente la parte que el usuario solicitó; los elementos de otras pantallas que aparezcan en la misma captura no amplían el alcance.
- No pidas permiso para ediciones normales y reversibles ya autorizadas por la petición. Pregunta solo cuando falte un dato que impida tomar una decisión razonable.
- Al terminar, explica qué cambió, qué archivos principales tocaste y qué comprobaciones ejecutaste. No afirmes que algo funciona en un dispositivo si no lo probaste allí.
- No hagas commits, pushes, publicaciones ni envíos externos a menos que el usuario lo solicite.

## Proyecto y estado funcional

MontePica es una aplicación móvil para una cevichería. El catálogo del cliente se consulta al backend y debe limitarse a ceviches —por ejemplo, pescado, camarón y mixto— y bebidas como jugos, limonada y cola. No agregues platos ajenos a ese catálogo.

El login, el registro y la lectura del catálogo están conectados al backend. La sesión se conserva en memoria y SecureStore en iOS/Android; en web solo vive en memoria. El carrito, los pedidos del cliente y del mesero, y las pantallas de administración todavía usan simulaciones locales independientes. No conviertas esos flujos en llamadas de red hasta que el usuario solicite conectarlos. La API del catálogo todavía no entrega imágenes ni cantidades disponibles; no inventes stock.

Flujo actual:

1. `/` restaura la sesión y dirige al usuario según su rol; si no hay sesión, abre login.
2. Login y registro usan la API.
3. Desde Inicio, **Para servirse** abre el escáner. El escáner muestra una mesa reconocida simulada (Mesa 08) y continúa al menú.
4. **Pedir a domicilio** abre el menú directamente.
5. El menú y el detalle consultan el catálogo del backend. La búsqueda y los filtros se aplican en la app.
6. En el detalle, picante, nota y cantidad son controles locales. **Agregar** añade el producto al carrito en memoria; confirmar crea un pedido de demostración y muestra su seguimiento local.

La pantalla `/waiter` tiene pedidos de ejemplo propios y no está conectada al carrito ni a los pedidos del cliente. Las pantallas de administración también usan datos locales aislados: los cambios de producto no actualizan el catálogo que ve el cliente.

No conviertas una simulación visual en una llamada de red ni des por confirmados pedidos, pagos o datos persistentes.

## Arquitectura actual

El código de la aplicación vive en `src/`. `src/app/` declara rutas y layouts con Expo Router; cada feature contiene sus pantallas, componentes y lógica propios. `src/shared/` contiene estado o datos usados por más de una feature; `src/components/ui/` contiene UI transversal sin reglas de negocio.

```text
src/
├── app/
│   ├── _layout.jsx
│   ├── index.jsx
│   ├── (auth)/
│   │   ├── _layout.jsx
│   │   ├── login.jsx
│   │   └── register.jsx
│   ├── (client)/                    # home, scan-table, menu, orders y product/[id]
│   ├── (waiter)/                    # waiter.jsx → /waiter
│   └── admin/                        # layout, products, tables y users
├── components/
│   ├── components.md
│   └── ui/Title.jsx
├── features/
│   ├── auth/                    # formularios, pantallas, API y validadores
│   ├── client/                  # pantallas, API de catálogo, mapper, componentes y orderStore
│   ├── waiter/                  # bandeja local del mesero
│   └── admin/                   # administración y estado local
└── shared/
    ├── api/apiClient.js        # cliente Axios
    ├── session/sessionStore.js # usuario y tokens; SecureStore en iOS/Android
    └── validators/              # validaciones puras reutilizadas por features
```

El catálogo del cliente vive en el backend. `features/client/api/catalogApi.js` consulta productos y categorías; `features/client/data/menuProductMapper.js` adapta productos al formato visual. `features/admin/data/adminData.js` conserva los datos semilla locales e independientes de administración.

Otros archivos importantes:

- `assets/`: imágenes locales que todavía usa la administración; el catálogo del cliente usa `imageUrl` del backend cuando esté disponible.
- `app.json`: configuración de Expo, esquema de enlaces y permisos/plugins.
- `package.json` y `package-lock.json`: dependencias y comandos npm.
- `jsconfig.json`: alias `@/` hacia `src/`.
- `babel.config.js`, `metro.config.js`, `tailwind.config.js` y `global.css`: configuración de Babel, Metro y NativeWind.

### Dónde poner cada cambio

- Una ruta de `src/app/` debe ser pequeña: importa y renderiza la pantalla de su feature. Mantén ahí layouts y configuración de navegación, no el JSX completo de una pantalla.
- Una pantalla va en `src/features/<feature>/screens/`.
- Una pieza propia de una feature que tenga suficiente UI o responsabilidad para entenderse y mantenerse aparte va en `src/features/<feature>/components/`. Por ejemplo, las tarjetas del menú pertenecen a `features/client/components/`.
- Un componente sencillo que solo se usa dentro de una pantalla puede quedarse definido en esa pantalla. No crees un archivo por cada fragmento pequeño sin una razón clara.
- Coloca datos locales usados solo por una feature en `src/features/<feature>/data/`. Si varias features usan el mismo dato o estado, colócalo en `src/shared/`.
- Coloca validadores puros en la feature que los usa. Si varias features comparten la misma regla, muévela a `src/shared/validators/`.
- `src/components/ui/` es solo para UI transversal sin dependencia de autenticación, cliente, mesero, administración u otra feature. No muevas ahí componentes específicos de una pantalla.
- Crea `services/`, `hooks/`, `store/`, `constants/` o `utils/` solo cuando una necesidad real lo justifique.

Dirección de dependencias: **rutas → features → shared o components/ui**. Una feature puede importar sus propios módulos y los módulos compartidos, pero no debe importar otra feature ni archivos de `src/app/`. `shared/` y `components/ui/` no deben importar features ni rutas. Los archivos de `app/` deben limitarse a conectar rutas con pantallas o layouts de features.

Usa el alias `@/` para imports desde `src/`, por ejemplo:

```js
import MenuScreen from '@/features/client/screens/MenuScreen';
```

Ejemplos de módulos compartidos:

```js
import apiClient from '@/shared/api/apiClient';
import { logoutUser } from '@/shared/session/sessionStore';
import { isValidEmail } from '@/shared/validators/emailValidator';
```

## Interfaz y navegación

- Conserva JavaScript/JSX, Expo Router, React Native y NativeWind. Mantén consistencia con los colores crema, terracota y café que ya usa la aplicación.
- Prioriza layouts móviles y revisa que el contenido funcione en web, iOS y Android. Ten cuidado con safe areas, alturas disponibles, teclado y overlays de cámara.
- Usa `Pressable` para acciones y agrega etiquetas de accesibilidad cuando no haya texto visible que describa el control.
- Mantén el menú y la pantalla de detalle conectados al catálogo de la API mediante `catalogApi.js` y el mapper de cliente.
- El catálogo no informa cantidades disponibles. No muestres stock real a partir de `tracksInventory`, que solo indica si se controla.
- No agregues una ruta para una pestaña inferior hasta que esa pantalla sea solicitada.
- El escáner usa `expo-camera`. Respeta sus permisos y no pongas elementos hijos dentro de `CameraView`; superpón el marco como una vista hermana. El reconocimiento de mesa sigue simulado.
- Conserva las validaciones locales existentes de login y registro. No afirmes que crean cuentas ni autentican usuarios contra un servidor.

## Dependencias y APIs de Expo

Antes de cambiar una API de Expo o React Native:

1. Comprueba la versión de `expo` en `package.json`.
2. Consulta documentación compatible con ese SDK en `https://docs.expo.dev/versions/v<major>.0.0/`.
3. Para instalar una dependencia, prefiere `npx expo install <paquete>` para conservar compatibilidad con el SDK.
4. No edites manualmente directorios nativos generados (`ios/` o `android/`) si no forman parte del proyecto. Configura plugins y permisos desde `app.json`.

Usa `bunx` en lugar de `npx` solo si el proyecto incorpora un lockfile de Bun.

## Comprobaciones

Los scripts actuales de `package.json` son `start`, `android`, `ios` y `web`. No hay scripts de lint ni de pruebas, tampoco una configuración de TypeScript. No inventes resultados de lint, tests o tipos ni los presentes como aprobados.

Para cambios de rutas o JSX, ejecuta una comprobación de bundle apropiada cuando el entorno y las dependencias lo permitan, por ejemplo `npx expo export`. Para cambios pequeños de texto o documentación, revisa el diff y ejecuta `git diff --check`. Si una herramienta no está configurada o falla por el entorno, informa la limitación concreta.

Comandos de desarrollo:

```bash
npx expo start
npx expo start --android
npx expo start --ios
npx expo start --web
```
