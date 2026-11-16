# MontePica

Aplicación para una cevichería, construida con Expo, React Native, Expo Router y NativeWind. El login, el registro, el catálogo del cliente, los pedidos de servicio en salón y de domicilio, la bandeja del mesero y la gestión administrativa de productos/categorías, inventario, usuarios, mesas y visitas consultan el backend. El carrito permanece en memoria. El detalle del pedido a domicilio permite enviar un comprobante JPEG/PNG; su revisión administrativa sigue pendiente. Otras pantallas administrativas conservan simulaciones locales.

## Estructura del código

```text
./
├── assets/                              # Imágenes e iconos de la aplicación
├── src/
│   ├── app/                             # Entradas y layouts de Expo Router
│   │   ├── _layout.jsx                  # Stack raíz y estilos globales
│   │   ├── index.jsx                    # Bienvenida pública y restauración de sesión
│   │   ├── (auth)/                      # Rutas /login y /register
│   │   ├── (client)/                    # /home, /scan-table, /menu, /orders, /product/[id]
│   │   ├── (waiter)/                    # /waiter
│   │   └── admin/                       # /admin/dashboard, products, movement, mesas, usuarios y deliveries
│   ├── components/                      # Guía breve y UI transversal
│   │   ├── components.md                # Referencia a esta guía
│   │   └── ui/Title.jsx                 # Título genérico
│   ├── features/
│   │   ├── auth/                        # Formularios, pantallas, API y validadores
│   │   ├── client/                      # Inicio, escáner, menú, detalle, pedidos y UI cliente
│   │   │   ├── api/                     # Catálogo, QR, participación y pedidos
│   │   │   ├── hooks/                   # Escáner, participación y pedidos
│   │   │   └── data/                    # Mappers de catálogo/pedidos y carrito local
│   │   ├── waiter/                      # Bandeja de pedidos locales del backend
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
- `features/client/` contiene el recorrido del cliente. `api/catalogApi.js` consulta productos y categorías, `api/tableAccessApi.js` valida el QR, y `api/ordersApi.js` crea y consulta pedidos. `hooks/useTableQrScanner.js` coordina lectura, bloqueo, reintento y cancelación; `hooks/useClientOrders.js` coordina lista y envío idempotente. `data/menuProductMapper.js` adapta productos, `data/orderMapper.js` adapta el carrito y respuestas de pedidos, y `data/orderStore.js` conserva el carrito y el contexto de envío en memoria.
- `features/waiter/` contiene `api/waiterOrdersApi.js` para las rutas administrativas de pedidos, `hooks/useWaiterOrders.js` para permisos, consultas y transiciones, y `data/waiterOrderMapper.js` para mostrar los datos reales. La pantalla consulta pedidos locales, muestra detalle e historial, y permite iniciar preparación, cancelar, marcar listo o entregar según el estado y permisos.
- `features/admin/` gestiona productos/categorías, inventario diario, usuarios, mesas, visitas y solicitudes/configuración de domicilios desde el backend. El panel consulta jornada, caja, pedidos, inventario y mesas al backend; las métricas sin endpoint se retiraron.
- `shared/` contiene módulos transversales como Axios y la sesión. Axios agrega el token de acceso al llamar endpoints protegidos. En iOS/Android, SecureStore conserva la sesión entre reinicios; en web solo se mantiene en memoria.
- `components/ui/` contiene elementos visuales reutilizables que no conocen las reglas de una feature, como `Title.jsx`.
- `assets/` guarda las imágenes y los iconos locales.

## Recorrido de navegación

1. Expo Router toma `src/app/` como raíz; `src/app/_layout.jsx` monta el Stack principal.
2. `/` restaura la sesión y dirige según el rol; sin sesión muestra una bienvenida pública con información de MontePica, especialidades ilustrativas y accesos a `/login` y `/register`. No consulta el catálogo ni muestra precios o stock.
3. Login o registro validan la cuenta con el backend; la sesión restaura el destino correspondiente al rol.
4. Desde `/home`, **Pedir a domicilio** abre `/menu`; **Para servirse** abre `/scan-table`. La cámara lee un QR y `POST /table-access/resolve` valida su token. Si el backend lo acepta, la app muestra el código real de mesa y permite continuar al menú.
5. El menú obtiene productos y categorías del backend. En servicio en salón, el `visitId` real viaja del escáner al menú, al detalle y al carrito, sin enviar el token QR en la navegación. `/orders` envía el carrito a `POST /visits/:id/orders` y consulta pedidos en `GET /me/orders`. En domicilio solicita cobertura, crea el pedido tras una aprobación y permite enviar un comprobante desde el detalle; el envío no implica que el pago esté confirmado.
6. `/admin/products` consulta el catálogo administrativo y permite crear/editar productos y categorías con permisos `catalog.read` y `catalog.write`. `/admin/inventory` consulta la jornada actual y las existencias; `/admin/movement` inicializa o modifica el inventario según los permisos de la cuenta. El panel consulta datos operativos disponibles al backend y no presenta ventas por hora ni ticket medio simulados.

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

El catálogo del cliente y `/admin/products` usan los mismos productos del backend. `/admin/inventory` muestra existencias reales de la jornada actual; consultar operación e inventario requiere `operations.read` e `inventory.read`; abrir la jornada requiere `operations.open`; inicializar requiere `inventory.initialize`; registrar movimientos requiere `inventory.move`; y ajustar un conteo requiere `inventory.adjust`. Las operaciones de escritura usan claves idempotentes. El comprobante de movimiento solo se previsualiza en el dispositivo y no se envía. El catálogo no incluye imágenes ni stock: las cantidades vienen del servicio de inventario diario, no de `tracksInventory`. El carrito del cliente permanece en `orderStore.js`, pero los pedidos de servicio en salón y de domicilio se crean y consultan en el backend. La bandeja `/waiter` consulta pedidos de modalidad local, detalle e historial; los cambios requieren `orders.manage` y usan la versión esperada más una clave idempotente. Las solicitudes de cobertura y el envío de comprobantes de domicilio están conectados; la decisión administrativa del pago sigue pendiente. El panel administrativo consulta jornada, resumen de caja, pedidos, inventario y visitas abiertas de mesas.

`/admin/tables` permite abrir y cerrar la visita actual de una mesa, y emitir un QR para la visita abierta. Abrir y emitir QR requieren `visits.manage`, mesa activa y jornada abierta. Consultar fechas requiere `visits.read`; gestionar visitas no exige `tables.manage`. Cerrar requiere confirmación, finaliza participaciones y falla si hay consumos pendientes; la solicitud lleva una clave idempotente reutilizable ante reintentos. Para emitir un QR se confirma que se invalidará el anterior y se cancelarán las solicitudes de participación pendientes. El token QR se conserva solo en memoria mientras el modal permanece abierto y se codifica localmente; la API entrega ese token una sola vez.

`/scan-table` lee únicamente códigos QR y envía el contenido leído como `qrToken` a `POST /table-access/resolve` con la sesión actual. La respuesta muestra el `tableCode` y `visitId` reales y permite abrir `/menu` con el servicio en salón. Resolver el QR solo valida la mesa y su visita: no crea una participación ni confirma el ingreso. El token permanece en memoria durante la consulta y no se incluye en la navegación. El cliente solicita participación explícitamente y consulta su estado; para enviar pedidos locales el backend exige aprobación y una cuenta abierta.

## Pedidos locales del cliente

`/orders` consulta pedidos propios del local mediante `GET /me/orders`, con páginas de 20 y modalidad `local`. Para crear uno, `useClientOrders.js` coordina el carrito con `ordersApi.js` y envía `POST /visits/:id/orders`. El cuerpo contiene UUID de productos y cantidades. Variantes del mismo producto se agrupan porque el contrato no acepta UUID duplicados; picante y notas se envían como observaciones dentro del límite del backend. El servidor valida participación aprobada, cuenta abierta, jornada, caja e inventario, y calcula el total final.

La creación usa `Idempotency-Key`. Si la respuesta queda incierta, se bloquean cambios en el carrito y se permite reintentar el mismo cuerpo con la misma clave. Una respuesta confirmada limpia el carrito; si falla la recarga, la interfaz informa que el pedido se guardó y permite actualizar la lista sin volver a crearlo. La pantalla muestra estados, fechas, cantidades y totales del servidor; no inventa etapas de preparación.

El pedido de domicilio requiere enviar primero una solicitud de cobertura y dirección. `/orders` crea y consulta esa solicitud con el backend; `/admin/deliveries` configura la cobertura y permite revisar solicitudes. Tras la aprobación, el cliente confirma el pedido desde su carrito. En el detalle puede cargar un comprobante JPEG/PNG de hasta 5 MiB; la respuesta `pendingVerification` indica que el personal debe revisarlo. La bandeja del mesero consulta pedidos de salón del backend, de forma independiente al carrito del cliente.

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

El panel mantiene sus semillas de mesas independientes. El escáner resuelve QR reales mediante el backend, pero la existencia de una visita no se interpreta como permiso de ingreso: resolver el QR no crea una participación. La aprobación y el rechazo están conectados en el modal administrativo; la salida voluntaria del cliente está conectada.


## Participación del cliente desde el escáner

Después de resolver el QR, el escáner consulta las participaciones propias por páginas de hasta 100 y busca la visita reconocida. Si existe una, muestra su estado real y permite actualizarla con `GET /me/participants/:id`. Si no existe, permite solicitar ingreso con un alias de 1 a 80 caracteres y `POST /visits/:id/participants`, enviando `{qrToken, alias}` e `Idempotency-Key`.

`participationApi.js` contiene las llamadas Axios; `useVisitParticipation.js` coordina consulta, envío, bloqueo y respuestas obsoletas; `VisitParticipationPanel.jsx` presenta formulario y estados dentro del escáner. El hook del escáner conserva el QR solo en memoria y lo limpia al confirmar una participación, reiniciar, continuar o abandonar. Ante resultado incierto se conserva la clave y el alias para un reintento explícito; abandonar no revierte un envío recibido por el servidor. No hay consultas periódicas.

Ver menú permite explorar el catálogo. Los pedidos de servicio en salón y de domicilio se crean y consultan con el backend. El cliente puede enviar un comprobante JPEG/PNG para el pedido a domicilio, aunque la revisión administrativa del pago sigue pendiente. La bandeja del mesero gestiona pedidos locales del backend por separado del flujo del cliente. La consulta, aprobación y rechazo administrativos y la salida voluntaria del cliente están conectados; finalizar desde administración sigue pendiente.

Comprobaciones de esta etapa: Expo Export completó bundles web, iOS y Android; `git diff --check` pasó. Las comprobaciones aisladas con API simulada verificaron paginación, alias vacío, bloqueo de envíos simultáneos, reintento con cuerpo/clave idénticos, actualización de estado y respuesta posterior al desmontaje. No se probaron cámaras físicas ni escrituras contra el backend. SonarCloud consultado: último análisis del 30 de octubre de 2026, correspondiente a otra revisión; no confirma esta entrega. Lint, suite de pruebas y tipos siguen sin configuración.


## Aprobación y rechazo de participantes

El modal de visita de `/admin/tables` consulta y decide solicitudes con `participants.manage`, además de `tables.read` para entrar a la pantalla. No requiere `visits.read`, `visits.manage` ni `tables.manage` para esas acciones. Usa `participantsAdminApi.js`, `useAdminParticipants.js` y `VisitParticipants.jsx`: API, coordinación y presentación respectivamente. Muestra páginas de 20, filtros por estado y actualización manual. Aprobar envía `{}`; rechazar exige un motivo de 1 a 500 caracteres sin espacios exteriores. Ambos envíos llevan `Idempotency-Key`.

Los resultados inciertos conservan clave y cuerpo para reintento explícito. La reconciliación recorre páginas sin filtro antes de mostrar el estado encontrado; no atribuye el resultado a una escritura no confirmada. Durante el envío se bloquean cierre del modal y escrituras de visita/QR. Una recarga fallida después de confirmar la decisión solo requiere reintentar la consulta. Emitir QR refresca participantes; cambiar/cerrar visita desmonta la sección y cancela consultas. El cliente actualiza su estado manualmente desde el escáner.

- [ ] Verificar aprobación/rechazo con backend y cuentas de prueba, incluidos errores, concurrencia, QR renovado y plataformas físicas; confirmar SonarCloud de esta revisión.
- [ ] Conectar finalización administrativa y pedidos reales cuando se solicite.

Verificación administrativa de esta entrega: bundles web, iOS y Android exportados correctamente y `git diff --check` sin errores. Comprobaciones aisladas con API simulada: consulta filtrada, motivo vacío, bloqueo de envíos repetidos, reintento con la misma clave, recarga tras confirmación y respuesta posterior al desmontaje. No se realizaron escrituras reales ni pruebas con dispositivos. SonarCloud devuelve OK para el análisis del 30 de octubre de 2026, de otra revisión; la puerta actual queda pendiente. Lint, suite de pruebas y tipos no están configurados.


## Salida voluntaria del cliente

El panel del escáner permite cancelar solicitudes pendientes y salir de participaciones aprobadas mediante `POST /me/participants/:id/leave`, con `{}` e `Idempotency-Key`. `participationApi.js` realiza la solicitud, `useVisitParticipation.js` consulta el estado antes de confirmar y coordina el envío; `VisitParticipationPanel.jsx` presenta acciones, confirmaciones y resultado.

Si la solicitud cambia de estado durante la consulta previa, se exige otra confirmación. Una aprobación concurrente posterior puede convertir la cancelación en una salida; la confirmación lo explica. El backend rechaza salidas con consumos pendientes y conserva las participaciones canceladas o finalizadas, sin permitir otro ingreso en la misma visita.

La salida tiene su clave y contexto propios, separados del ingreso. Ante resultado incierto, consultar conserva la clave mientras el estado siga pendiente/aprobado; un estado terminal se muestra sin atribuirlo al envío no confirmado. Los reintentos son explícitos. Abandonar la pantalla no revierte una solicitud recibida por el servidor. No se agrega historial ni acceso global a participaciones.

- [ ] Verificar salida del cliente con backend y dispositivos de prueba y confirmar SonarCloud de esta revisión. Pruebas aisladas: consulta previa, cambio concurrente, cancelación, finalización, bloqueo de envíos, clave reutilizada, errores 400/401/403/404/409 y respuesta tardía.

## Configuración y revisión administrativa de domicilios

`/admin/deliveries` consulta la configuración versionada y lista solicitudes de todas las jornadas en páginas de 20. `deliveryAdminApi.js` realiza las solicitudes; `useAdminDeliverySettings.js` coordina carga, validación y guardado idempotente de la configuración; `DeliverySettingsPanel.jsx` presenta la configuración y el editor; `useAdminDeliveryRequests.js` mantiene la consulta y las decisiones de solicitudes. `adminDeliveryOperationStore.js` conserva temporalmente por usuario los envíos cuyo resultado quedó incierto y coordina un único bloqueo de escritura entre ambas responsabilidades.

Consultar configuración y solicitudes requiere `delivery.read`; cambiar la configuración requiere `delivery.configure`; aprobar o rechazar requiere `delivery.review`. El editor administra habilitación, descripción de cobertura, tarifa USD con precisión de centavos y plazo de envío de comprobante (60–86400 segundos). Cada guardado crea una nueva versión mediante `PUT /admin/delivery/settings` y una `Idempotency-Key`; si no hay cambios no se envía la solicitud. Antes de escribir se consulta la versión actual; si cambió desde que se abrió el formulario, se conservan los valores y se pide confirmación explícita. El backend sigue siendo la autoridad ante carreras concurrentes.

Un resultado incierto no se reenvía automáticamente: se puede consultar la configuración vigente y reintentar exactamente el mismo cuerpo con la misma clave. Una nueva configuración puede hacer que solicitudes pendientes con una versión anterior ya no cumplan las condiciones para ser aprobadas. Aprobar cobertura no crea un pedido automáticamente; el cliente confirma el pedido desde el carrito. La carga de comprobantes está implementada, pero la revisión administrativa y las pruebas reales con backend/cuentas autorizadas siguen pendientes. Expo Export web/iOS/Android y `git diff --check` se ejecutan para esta entrega; no hubo escrituras reales ni pruebas en dispositivos. La puerta SonarCloud consultada está OK en el análisis del 13 de noviembre de 2026, revisión `5189900a7de43d461a5c7a6c6c7256afc59c3b2d`, que no incluye estos cambios. Lint, pruebas unitarias y tipos no están configurados.

El detalle de pedidos a domicilio consulta su liquidación en `/me/settlements/:id` y permite enviar JPEG/PNG de hasta 5 MiB mediante `/me/settlements/:id/transfer-payments`. La app conserva en memoria el archivo y la clave durante un resultado incierto; el estado `pendingVerification` no representa un pago confirmado. Los formatos PDF y HEIC no se ofrecen. La revisión administrativa del comprobante sigue pendiente.


La interfaz utiliza verde profundo, oliva y crema, con detalles verdes, blancos y rojos inspirados en Manabí. La imagen de la tonga se usa únicamente como referencia de estilo; no se incorpora al contenido.
