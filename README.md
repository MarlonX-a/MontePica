# MontePica

Aplicación para una cevichería, construida con Expo, React Native, Expo Router y NativeWind. El login, el registro, el catálogo del cliente y la gestión administrativa de productos/categorías, inventario, usuarios, mesas y visitas consultan el backend. El carrito, los pedidos y otras pantallas administrativas todavía conservan simulaciones locales.

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
│   │   │   ├── api/                     # Catálogo y resolución de QR de mesas
│   │   │   ├── hooks/                   # Coordinación del escaneo y resolución QR
│   │   │   └── data/                    # Mapper del catálogo y orderStore local
│   │   ├── waiter/                      # Bandeja de pedidos de prueba del mesero
│   │   └── admin/                       # Catálogo, inventario, usuarios, mesas/visitas API; panel demo
│   │       ├── api/                      # APIs administrativas de catálogo, inventario, usuarios, mesas y visitas
│   │       ├── components/               # Tarjetas, listas, modal de visita y QR administrativo
│   │       ├── hooks/                    # Coordinación de solicitudes de mesas, visitas y QR
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
- `features/client/` contiene el recorrido del cliente. `api/catalogApi.js` consulta productos y categorías, y `api/tableAccessApi.js` valida el token QR con el backend. `hooks/useTableQrScanner.js` coordina lectura, bloqueo, reintento y cancelación. `data/menuProductMapper.js` adapta los productos para la interfaz; `data/orderStore.js` conserva carrito y pedido activo en memoria.
- `features/waiter/` muestra pedidos de ejemplo y permite cambiar su estado localmente.
- `features/admin/` gestiona productos/categorías, inventario diario, usuarios, mesas y visitas desde el backend. El panel conserva datos de demostración independientes.
- `shared/` contiene módulos transversales como Axios y la sesión. Axios agrega el token de acceso al llamar endpoints protegidos. En iOS/Android, SecureStore conserva la sesión entre reinicios; en web solo se mantiene en memoria.
- `components/ui/` contiene elementos visuales reutilizables que no conocen las reglas de una feature, como `Title.jsx`.
- `assets/` guarda las imágenes y los iconos locales.

## Recorrido de navegación

1. Expo Router toma `src/app/` como raíz; `src/app/_layout.jsx` monta el Stack principal.
2. `/` redirige a `/login`. Las rutas `/login` y `/register` muestran sus pantallas de autenticación.
3. Login o registro validan la cuenta con el backend; la sesión restaura el destino correspondiente al rol.
4. Desde `/home`, **Pedir a domicilio** abre `/menu`; **Para servirse** abre `/scan-table`. La cámara lee un QR y `POST /table-access/resolve` valida su token. Si el backend lo acepta, la app muestra el código real de mesa y permite continuar al menú.
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
- Las llamadas del catálogo y la resolución QR pertenecen a `features/client/api/`; la adaptación del catálogo vive en `features/client/data/` y la coordinación asíncrona del escáner en `features/client/hooks/`.
- Las llamadas protegidas de gestión de productos/categorías pertenecen a `features/admin/api/catalogAdminApi.js`; su adaptación pertenece a `features/admin/data/adminCatalogMapper.js`.
- La consulta de jornadas, existencias y movimientos pertenece a `features/admin/api/inventoryAdminApi.js`; `features/admin/data/inventoryMapper.js` adapta cada existencia para la pantalla.
- La apertura, consulta y cierre de visitas administrativas pertenece a `features/admin/api/visitsAdminApi.js`; su coordinación vive en `features/admin/hooks/useAdminVisits.js` y el modal propio en `features/admin/components/TableVisitModal.jsx`.
- La emisión y el estado temporal del QR viven en `features/admin/hooks/useAdminVisitQr.js`; `features/admin/components/TableVisitQr.jsx` lo genera localmente con `react-native-qrcode-svg`.
- Los datos semilla que solo usa administración pertenecen a `features/admin/data/`.
- El usuario actual usado por autenticación y otras pantallas pertenece a `shared/session/`.
- Un título visual que puede usarse en varias pantallas sin reglas de negocio pertenece a `components/ui/`.
- Una regla de validación reutilizada por más de una feature pertenece a `shared/validators/`.
- Una ruta nueva se declara en `app/`; el JSX de la pantalla se coloca en la feature correspondiente.

## Estado local y límites actuales

El login y el registro llaman al backend. La sesión se conserva en memoria y en SecureStore para iOS/Android; en web se pierde al recargar. `apiClient` adjunta automáticamente el token de acceso a los endpoints protegidos.

El catálogo del cliente y `/admin/products` usan los mismos productos del backend. `/admin/inventory` muestra existencias reales de la jornada actual; consultar la operación y el inventario requiere `operations.read` e `inventory.read`; abrir la jornada requiere `operations.open`; inicializar requiere `inventory.initialize`; registrar movimientos requiere `inventory.move`; y ajustar un conteo requiere `inventory.adjust`. Las operaciones de escritura usan claves idempotentes. El comprobante de movimiento solo se previsualiza en el dispositivo y no se envía. El catálogo no incluye imágenes ni stock: las cantidades vienen del servicio de inventario diario, no de `tracksInventory`. El carrito y el pedido activo del cliente viven en `orderStore.js`; confirmar el pedido genera un seguimiento local. Los pedidos de la pantalla del mesero son datos de muestra independientes y no se conectan con los pedidos del cliente. El panel administrativo conserva su simulación local.

`/admin/tables` permite abrir y cerrar la visita actual de una mesa, y emitir un QR para la visita abierta. Abrir y emitir QR requieren `visits.manage`, mesa activa y jornada abierta. Consultar fechas requiere `visits.read`; gestionar visitas no exige `tables.manage`. Cerrar requiere confirmación, finaliza participaciones y falla si hay consumos pendientes; la solicitud lleva una clave idempotente reutilizable ante reintentos. Para emitir un QR se confirma que se invalidará el anterior y se cancelarán las solicitudes de participación pendientes. El token QR se conserva solo en memoria mientras el modal permanece abierto y se codifica localmente; la API entrega ese token una sola vez.

`/scan-table` lee únicamente códigos QR y envía el contenido leído como `qrToken` a `POST /table-access/resolve` con la sesión actual. La respuesta muestra el `tableCode` real y permite abrir `/menu` con el servicio en salón. Resolver el QR solo valida la mesa y su visita: no crea una participación ni confirma el ingreso. El token permanece en memoria durante la consulta y no se incluye en la navegación. La participación del cliente y los pedidos/pagos siguen sin conectarse al backend.

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

`/admin/tables` consulta, crea y edita mesas reales con `tablesAdminApi.js`. Requiere `tables.read` para listar y consultar una mesa, y `tables.manage` para crear o editarla. Solo se envía `{code}` (entre 1 y 40 caracteres sin espacios exteriores); la API normaliza el código y comprueba duplicados. Permite editar el código y activar o desactivar una mesa mediante PATCH. No se puede desactivar una mesa con visita abierta; el backend vuelve a comprobar esta restricción. Capacidad, zona y QR no forman parte de la gestión actual.

`adminTableMapper.js` adapta código, estado activo y visita abierta; una visita no equivale a ocupación física. `useAdminTables.js` coordina carga, edición, cancelación, permisos y recargas; `TablesList.jsx` presenta filtros, conteos y páginas de 20 mesas. Se recorren todas las páginas del backend (hasta 100 por solicitud) antes de filtrar. Tras crear o editar, se vuelve a consultar y se muestra la página de la mesa; si falla la recarga, se informa que el cambio ya fue confirmado.

La acción **Visita** consulta nuevamente la mesa y abre un modal con su estado. `visitsAdminApi.js` llama a la API; `useAdminVisits.js` coordina consulta, apertura, cierre, permisos e idempotencia; `TableVisitModal.jsx` presenta el detalle y la confirmación de cierre. `tables.read` permite consultar la mesa, `visits.read` permite ver estado y fechas de la visita, y `visits.manage` permite abrirla o cerrarla, sin requerir `tables.manage`. La apertura solo se permite en una mesa activa sin visita y el backend exige una jornada operativa abierta. El cierre finaliza participaciones y el backend lo rechaza si hay consumos pendientes. Los cierres envían una clave `Idempotency-Key`; los reintentos del mismo cierre reutilizan esa clave. Tras abrir o cerrar se actualiza el listado sin perder búsqueda ni filtros. La emisión de QR, el historial y la gestión de participantes siguen pendientes.

El panel mantiene sus semillas de mesas independientes. El escáner resuelve QR reales mediante el backend, pero la existencia de una visita no se interpreta como permiso de ingreso: resolver el QR no crea una participación. La participación del cliente sigue pendiente.
