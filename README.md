# MontePica

Aplicación para una cevichería, construida con Expo, React Native, Expo Router y NativeWind. El login, el registro, el catálogo del cliente y la gestión administrativa de productos/categorías, inventario, usuarios y mesas consultan el backend. El carrito, los pedidos y otras pantallas administrativas todavía conservan simulaciones locales.

## Estructura del código

```text
./
├── assets/                              # Imágenes e iconos de la aplicación
├── src/
│   ├── app/                             # Entradas y layouts de Expo Router
│   │   ├── _layout.jsx                  # Stack raíz y estilos globales
│   │   ├── index.jsx                    # Redirección inicial al login
│   │   ├── (auth)/                      # Rutas /login y /register
│   │   ├── (client)/                    # /home, /scan-table, /menu, /orders, /product/[id]
│   │   ├── (waiter)/                    # /waiter
│   │   └── admin/                       # /admin/dashboard, products, movement, mesas y usuarios
│   ├── components/                      # Guía breve y UI transversal
│   │   ├── components.md                # Referencia a esta guía
│   │   └── ui/Title.jsx                 # Título genérico
│   ├── features/
│   │   ├── auth/                        # Formularios, pantallas, API y validadores
│   │   ├── client/                      # Inicio, escáner, menú, detalle, pedidos y UI cliente
│   │   │   ├── api/catalogApi.js         # Consultas públicas de productos y categorías
│   │   │   └── data/                    # Mapper del catálogo y orderStore local
│   │   ├── waiter/                      # Bandeja de pedidos de prueba del mesero
│   │   └── admin/                       # Catálogo, inventario, usuarios y mesas API; panel demo
│   │       ├── api/                      # APIs administrativas de catálogo, inventario, usuarios y mesas
│   │       ├── hooks/                    # Coordinación de solicitudes de mesas
│   │       └── data/                     # Mappers API y semillas de pantallas demo
│   └── shared/
│       ├── api/apiClient.js             # Cliente Axios
│       ├── session/sessionStore.js      # Sesión en memoria y SecureStore nativo
│       └── validators/emailValidator.js # Validación de correo reutilizada
├── global.css                           # Directivas globales de Tailwind
├── app.json                             # Configuración de Expo y sus plugins
├── babel.config.js                      # Babel y preset de NativeWind
├── jsconfig.json                        # Alias @/ hacia src/
├── metro.config.js                      # Metro integrado con NativeWind
├── package.json                         # Dependencias y comandos npm
└── tailwind.config.js                   # Archivos que analiza Tailwind
```

### Responsabilidad de las carpetas

- `app/` solo declara navegación. Cada archivo de ruta conecta Expo Router con una pantalla o layout de una feature. Los nombres entre paréntesis agrupan rutas sin agregarse a la URL.
- `features/auth/` contiene los formularios y las llamadas de registro e inicio de sesión al backend.
- `features/client/` contiene el recorrido del cliente. `api/catalogApi.js` consulta productos y categorías; `data/menuProductMapper.js` adapta los productos para la interfaz. `data/orderStore.js` conserva carrito y pedido activo en memoria.
- `features/waiter/` muestra pedidos de ejemplo y permite cambiar su estado localmente.
- `features/admin/` gestiona productos/categorías e inventario diario desde el backend. El panel conserva datos de demostración independientes.
- `shared/` contiene módulos transversales como Axios y la sesión. Axios agrega el token de acceso al llamar endpoints protegidos. En iOS/Android, SecureStore conserva la sesión entre reinicios; en web solo se mantiene en memoria.
- `components/ui/` contiene elementos visuales reutilizables que no conocen las reglas de una feature, como `Title.jsx`.
- `assets/` guarda las imágenes y los iconos locales.

## Recorrido de navegación

1. Expo Router toma `src/app/` como raíz; `src/app/_layout.jsx` monta el Stack principal.
2. `/` redirige a `/login`. Las rutas `/login` y `/register` muestran sus pantallas de autenticación.
3. Login o registro validan la cuenta con el backend; la sesión restaura el destino correspondiente al rol.
4. Desde `/home`, **Pedir a domicilio** abre `/menu`; **Para servirse** abre `/scan-table`, donde la mesa se reconoce de forma simulada y luego se continúa al menú.
5. El menú obtiene productos y categorías del backend. Elegir un producto abre `/product/[id]`, que consulta el producto por su UUID. Agregarlo lleva a `/orders`, donde el carrito y el seguimiento siguen siendo locales.
6. `/admin/products` consulta el catálogo administrativo y permite crear/editar productos y categorías con permisos `catalog.read` y `catalog.write`. `/admin/inventory` consulta la jornada actual y las existencias; `/admin/movement` inicializa o modifica el inventario según los permisos de la cuenta. El panel conserva su simulación local.

Las rutas conservan sus URLs aunque cambien de grupo. Por ejemplo, `(waiter)/waiter.jsx` sigue siendo `/waiter`.

## Dependencias entre módulos

La dirección permitida es:

```text
app → features → shared
              → components/ui
```

Una feature puede usar sus propios componentes y datos, además de módulos compartidos. Las features no deben importar otras features. `shared/` y `components/ui/` no deben importar rutas ni código de features. Mantener esta dirección permite reutilizar catálogo y sesión sin que cliente, autenticación, mesero y administración dependan directamente entre sí.

Para decidir dónde poner código nuevo:

- Un formulario exclusivo de registro pertenece a `features/auth/components/`.
- Una tarjeta usada solo por el menú pertenece a `features/client/components/`.
- Las llamadas del catálogo del cliente y su adaptación visual pertenecen a `features/client/api/` y `features/client/data/`.
- Las llamadas protegidas de gestión de productos/categorías pertenecen a `features/admin/api/catalogAdminApi.js`; su adaptación pertenece a `features/admin/data/adminCatalogMapper.js`.
- La consulta de jornadas, existencias y movimientos pertenece a `features/admin/api/inventoryAdminApi.js`; `features/admin/data/inventoryMapper.js` adapta cada existencia para la pantalla.
- Los datos semilla que solo usa administración pertenecen a `features/admin/data/`.
- El usuario actual usado por autenticación y otras pantallas pertenece a `shared/session/`.
- Un título visual que puede usarse en varias pantallas sin reglas de negocio pertenece a `components/ui/`.
- Una regla de validación reutilizada por más de una feature pertenece a `shared/validators/`.
- Una ruta nueva se declara en `app/`; el JSX de la pantalla se coloca en la feature correspondiente.

## Estado local y límites actuales

El login y el registro llaman al backend. La sesión se conserva en memoria y en SecureStore para iOS/Android; en web se pierde al recargar. `apiClient` adjunta automáticamente el token de acceso a los endpoints protegidos.

El catálogo del cliente y `/admin/products` usan los mismos productos del backend. `/admin/inventory` muestra existencias reales de la jornada actual; consultar la operación y el inventario requiere `operations.read` e `inventory.read`; abrir la jornada requiere `operations.open`; inicializar requiere `inventory.initialize`; registrar movimientos requiere `inventory.move`; y ajustar un conteo requiere `inventory.adjust`. Las operaciones de escritura usan claves idempotentes. El comprobante de movimiento solo se previsualiza en el dispositivo y no se envía. El catálogo no incluye imágenes ni stock: las cantidades vienen del servicio de inventario diario, no de `tracksInventory`. El carrito y el pedido activo del cliente viven en `orderStore.js`; confirmar el pedido genera un seguimiento local. Los pedidos de la pantalla del mesero son datos de muestra independientes y no se conectan con los pedidos del cliente. El panel administrativo conserva su simulación local.

El escáner solicita permiso para usar la cámara, pero la detección de Mesa 08 es simulada. Los pedidos y pagos no se envían al backend.

## Configuración y comandos

- `package.json` declara Expo SDK 58, React Native, Expo Router y NativeWind. Sus scripts son `start`, `android`, `ios` y `web`; no hay comandos de lint ni pruebas unitarias configuradas.
- `app.json` configura nombre, iconos, plataformas y plugins de Expo.
- `jsconfig.json` resuelve imports `@/` hacia `src/`.
- `babel.config.js` usa `babel-preset-expo` y el preset de NativeWind.
- `metro.config.js` integra NativeWind con Metro y carga `global.css`.
- `tailwind.config.js` indica a Tailwind qué archivos revisar para encontrar clases.
- `global.css` activa las capas base, componentes y utilidades de Tailwind.

Desde esta carpeta, inicia el proyecto con:

```bash
npx expo start
npx expo start --android
npx expo start --ios
npx expo start --web
```

Las reglas de colaboración y mantenimiento del proyecto están en [AGENTS.md](AGENTS.md).

## Usuarios y mesas conectados

`/admin/users` consulta usuarios y roles y permite crear y actualizar cuentas mediante `usersAdminApi.js`. Requiere `users.read` y `roles.read` para la consulta, `users.create` para crear y `users.update` para editar. La contraseña inicial solo se envía al crear; la API controla duplicados y restricciones de rol/estado.

`/admin/tables` consulta y crea mesas reales con `tablesAdminApi.js`. Requiere `tables.read` para listar y `tables.manage` para crear. Solo se envía `{code}` (entre 1 y 40 caracteres sin espacios exteriores); la API normaliza el código y comprueba duplicados. No permite editar capacidad, zona, estado ni generar QR.

`adminTableMapper.js` adapta código, estado activo y visita abierta; una visita no equivale a ocupación física. `useAdminTables.js` coordina carga, cancelación, permisos y creación; `TablesList.jsx` presenta filtros, conteos y páginas de 20 mesas. Se recorren todas las páginas del backend (hasta 100 por solicitud) antes de filtrar. Tras crear, se vuelve a consultar y se muestra la página de la nueva mesa; si falla la recarga, se informa que la creación ya fue confirmada.

El panel mantiene sus semillas de mesas independientes. El escáner sigue simulando Mesa 08. Abrir visitas y emitir QR desde administración queda para otra etapa; no se deduce la existencia de un QR de `openVisitId`.
