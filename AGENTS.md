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

El login, el registro, el catálogo del cliente, productos/categorías, inventario diario, usuarios y el listado, creación y edición de mesas están conectados al backend. La sesión se conserva en memoria y SecureStore en iOS/Android; en web solo vive en memoria. `apiClient` adjunta el token de acceso a las rutas protegidas. El carrito, los pedidos del cliente y del mesero y el panel siguen usando simulaciones locales independientes. No conviertas esos flujos en llamadas de red hasta que el usuario solicite conectarlos. El catálogo no entrega imágenes ni cantidades disponibles; las existencias sí se consultan desde los endpoints diarios de inventario. No deduzcas stock a partir de `tracksInventory`.

Flujo actual:

1. `/` restaura la sesión y dirige al usuario según su rol; si no hay sesión, abre login.
2. Login y registro usan la API.
3. Desde Inicio, **Para servirse** abre el escáner. El escáner muestra una mesa reconocida simulada (Mesa 08) y continúa al menú.
4. **Pedir a domicilio** abre el menú directamente.
5. El menú y el detalle consultan el catálogo del backend. La búsqueda y los filtros se aplican en la app.
6. En el detalle, picante, nota y cantidad son controles locales. **Agregar** añade el producto al carrito en memoria; confirmar crea un pedido de demostración y muestra su seguimiento local.

La pantalla `/waiter` tiene pedidos de ejemplo propios y no está conectada al carrito ni a los pedidos del cliente. El catálogo administrado desde `/admin/products` es el mismo que consulta el cliente; el panel conserva su simulación independiente del catálogo, inventario, usuarios y mesas conectados.

La pantalla `/admin/products` consulta productos y categorías protegidos del backend y permite crear o editar ambos recursos. El usuario autenticado debe tener los permisos `catalog.read` y `catalog.write`; los errores de sesión o permisos se muestran en la pantalla. Esa pantalla no usa las existencias ficticias del inventario local. Las demás pantallas administrativas aún pueden mostrar semillas locales y no se sincronizan automáticamente con el catálogo real.

La pantalla `/admin/inventory` consulta la jornada operativa actual y sus existencias (permisos `operations.read` e `inventory.read`). Puede abrir la jornada si la cuenta tiene `operations.open`. Desde una fila se inicializa el stock o se registra un movimiento mediante `/admin/movement`; las operaciones requieren `inventory.initialize`, `inventory.move` o `inventory.adjust` según el tipo. Las solicitudes que modifican stock incluyen `Idempotency-Key`. La imagen del comprobante sigue siendo solo una vista previa local y no se envía.

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
│   └── admin/                   # catálogo/inventario/usuarios/mesas conectados y otras pantallas locales
│       ├── api/                 # APIs administrativas de catálogo, inventario, usuarios y mesas
│       ├── hooks/               # Coordinación y ciclo de solicitudes de mesas
│       └── data/                # mappers y datos semilla de pantallas locales
└── shared/
    ├── api/apiClient.js        # cliente Axios
    ├── session/sessionStore.js # usuario y tokens; SecureStore en iOS/Android
    └── validators/              # validaciones puras reutilizadas por features
```

El catálogo del cliente vive en el backend. `features/client/api/catalogApi.js` consulta productos y categorías; `features/client/data/menuProductMapper.js` adapta productos al formato visual. La administración usa `features/admin/api/catalogAdminApi.js` y `adminCatalogMapper.js` para gestionar productos/categorías y `features/admin/api/inventoryAdminApi.js` y `inventoryMapper.js` para la jornada y las existencias. `features/admin/data/adminData.js` conserva semillas locales usadas por el panel, que aún no está conectado.

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
- Mantén `/admin/products` conectado con `catalogAdminApi.js`; las rutas admin requieren un token y permisos otorgados por el backend. No reutilices las semillas de `adminData.js` como catálogo real.
- Mantén `/admin/inventory` y `/admin/movement` conectados con `inventoryAdminApi.js`; registra movimientos con clave idempotente y muestra cantidades del backend, no datos semilla.
- El catálogo no informa cantidades disponibles. No muestres stock real a partir de `tracksInventory`, que solo indica si se controla.
- No agregues una ruta para una pestaña inferior hasta que esa pantalla sea solicitada.
- El escáner usa `expo-camera`. Respeta sus permisos y no pongas elementos hijos dentro de `CameraView`; superpón el marco como una vista hermana. El reconocimiento de mesa sigue simulado.
- Conserva las validaciones de login y registro; sus resultados dependen de la respuesta de la API. No presentes simulaciones locales como autenticación real.

## Dependencias y APIs de Expo

Antes de cambiar una API de Expo o React Native:

1. Comprueba la versión de `expo` en `package.json`.
2. Consulta documentación compatible con ese SDK en `https://docs.expo.dev/versions/v<major>.0.0/`.
3. Para instalar una dependencia, prefiere `npx expo install <paquete>` para conservar compatibilidad con el SDK.
4. No edites manualmente directorios nativos generados (`ios/` o `android/`) si no forman parte del proyecto. Configura plugins y permisos desde `app.json`.

Usa `bunx` en lugar de `npx` solo si el proyecto incorpora un lockfile de Bun.

## Comprobaciones

### Calidad y buenas prácticas

- Mantén funciones y componentes con responsabilidades claras, nombres descriptivos y validaciones en el lugar adecuado. Evita duplicar lógica, propiedades duplicadas, ternarios anidados innecesarios y promesas sin manejo de errores.
- Mantén los estados de carga, éxito, error y reintento claros para el usuario; evita presentar datos simulados como reales. No expongas tokens ni contraseñas en logs, código, capturas o documentación.
- Conserva las puertas de calidad de CI y SonarCloud. Corrige los problemas que introduzca el cambio y no desactives reglas, excluyas código ni reduzcas umbrales para hacer pasar el análisis.
- Si hay acceso autorizado a SonarCloud, consulta los hallazgos relevantes sin mostrar el token. El resultado publicado corresponde al último análisis: solo afirma que la puerta pasó para una revisión cuando el análisis de esa revisión lo confirme. Si CI o SonarCloud no están disponibles, informa la limitación y los hallazgos pendientes.
- Revisa el diff, los imports y las dependencias entre features. Para flujos con API comprueba permisos, validación, errores y estados asíncronos; no hagas escrituras de prueba en datos reales sin un entorno de prueba adecuado.

Los scripts actuales de `package.json` son `start`, `android`, `ios` y `web`. No hay scripts de lint ni de pruebas, tampoco una configuración de TypeScript. No inventes resultados de lint, tests o tipos ni los presentes como aprobados.

Para cambios de rutas o JSX, ejecuta una comprobación de bundle apropiada cuando el entorno y las dependencias lo permitan, por ejemplo `npx expo export`. Para cambios pequeños de texto o documentación, revisa el diff y ejecuta `git diff --check`. Si una herramienta no está configurada o falla por el entorno, informa la limitación concreta.

Comandos de desarrollo:

```bash
npx expo start
npx expo start --android
npx expo start --ios
npx expo start --web
```

## Usuarios y mesas conectados

`/admin/users` consulta usuarios y roles y permite crear y actualizar cuentas mediante `usersAdminApi.js`. Requiere `users.read` y `roles.read` para la consulta, `users.create` para crear y `users.update` para editar. La contraseña inicial solo se envía al crear; la API controla duplicados y restricciones de rol/estado.

`/admin/tables` consulta, crea y edita mesas reales con `tablesAdminApi.js`. Requiere `tables.read` para listar y `tables.manage` para crear. Solo se envía `{code}` (entre 1 y 40 caracteres sin espacios exteriores); la API normaliza el código y comprueba duplicados. Permite editar el código y activar o desactivar una mesa mediante PATCH, sujeto a `tables.manage`. No se puede desactivar una mesa con visita abierta; el backend comprueba esta restricción. Capacidad, zona y QR permanecen fuera de esta etapa.

`adminTableMapper.js` adapta código, estado activo y visita abierta; una visita no equivale a ocupación física. `useAdminTables.js` coordina carga, cancelación, permisos y creación; `TablesList.jsx` presenta filtros, conteos y páginas de 20 mesas. Se recorren todas las páginas del backend (hasta 100 por solicitud) antes de filtrar. Tras crear, se vuelve a consultar y se muestra la página de la nueva mesa; si falla la recarga, se informa que la creación ya fue confirmada.

El panel mantiene sus semillas de mesas independientes. El escáner sigue simulando Mesa 08. Abrir visitas y emitir QR desde administración queda para otra etapa; no se deduce la existencia de un QR de `openVisitId`.

## Actividades y seguimiento

Esta lista sirve para coordinar al equipo, no autoriza implementar todas las tareas a la vez. Antes de iniciar una actividad, revisa el código, el contrato y los avances actuales del backend; trabaja solo en la actividad que solicite el usuario. El backend local puede encontrarse en la carpeta vecina `Backend-Nestjs` y sus contratos pueden cambiar.

Usa `- [ ]` para actividades pendientes y `- [x]` para las terminadas. Marca una actividad como completada únicamente cuando su alcance esté implementado y las comprobaciones aplicables hayan pasado; si falta una prueba real o una puerta de calidad, deja la tarea abierta y anota qué falta. Si una tarea se entrega por etapas, divídela en subtareas concretas y marca solo las terminadas. Actualiza esta guía y el README cuando cambie el estado funcional; no taches trabajo de otra persona sin comprobarlo.

Actividades implementadas en el código actual (las pruebas reales y el análisis de cada revisión se registran por separado):

- [x] Conectar login, registro y consulta del catálogo del cliente al backend.
- [x] Conectar la gestión administrativa de productos, categorías e inventario diario.
- [x] Conectar el listado, la creación y la edición de usuarios administrativos.
- [x] Conectar el listado, la creación y la edición de código/estado de mesas administrativas.

Actividades pendientes:

- [ ] Verificar con el backend y cuentas de prueba autorizadas los flujos ya conectados, incluidos permisos, errores y persistencia. La edición de mesas aún requiere prueba real; documentar resultados y limitaciones por plataforma.
- [ ] Conectar la apertura y cierre de visitas de mesa en administración, según los endpoints, permisos y reglas vigentes del backend.
- [ ] Conectar la emisión y presentación de QR reales de visitas; definir con el equipo cómo mostrarlos y usarlos. La emisión de un QR nuevo invalida el anterior y puede cancelar solicitudes pendientes: comprobar el contrato actual antes de implementarlo.
- [ ] Sustituir el reconocimiento simulado de Mesa 08 por lectura y resolución de QR reales en el escáner del cliente. Revisar autenticación, permisos de cámara, errores y experiencia en web, iOS y Android.
- [ ] Conectar el flujo de participación en una visita y su gestión administrativa o del mesero, de acuerdo con los permisos y endpoints disponibles y con el alcance solicitado.
- [ ] Evaluar y conectar los datos operativos disponibles del panel administrativo; conservar explícitamente como simuladas las métricas que no tenga el backend.
- [ ] Conectar carrito, pedidos del cliente y pedidos del mesero cuando existan contratos de backend adecuados y el usuario solicite esa integración. Mantener los flujos locales identificados hasta entonces.
- [ ] Revisar búsqueda, filtros y paginación de usuarios administrativos frente al contrato del backend y mostrar el detalle de permisos por rol si se solicita.
- [ ] Revisar y completar la gestión de sesión con el contrato vigente del backend, incluidos renovación y cierre de sesión remotos cuando corresponda; verificar el comportamiento en web y dispositivos.
- [ ] Configurar lint y pruebas automatizadas si el equipo solicita incorporarlos; documentar comandos y ejecución en CI. Hasta entonces no afirmar que están configurados o aprobados.

Al finalizar cada actividad, explica en el chat qué archivos y responsabilidades cambiaron, por qué, qué se verificó y qué queda pendiente. No hagas commits, pushes ni despliegues salvo solicitud explícita.
