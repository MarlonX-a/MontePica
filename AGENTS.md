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

El login, el registro, el catálogo del cliente, productos/categorías, inventario diario, usuarios, mesas, visitas, pedidos locales y a domicilio del cliente y la bandeja de pedidos locales del mesero están conectados al backend. El carrito se conserva en memoria. Las solicitudes de cobertura admiten coordenadas opcionales obtenidas con `expo-location`; los comprobantes JPEG/PNG también usan la API. La bandeja administrativa de revisión de transferencias está conectada; su prueba real y el despacho siguen pendientes. No extiendas estas conexiones a otras operaciones sin solicitud del usuario. La sesión se conserva en memoria y SecureStore en iOS/Android; en web solo vive en memoria. `apiClient` adjunta el token de acceso a las rutas protegidas. El catálogo no entrega imágenes ni cantidades disponibles; las existencias sí se consultan desde los endpoints diarios de inventario. No deduzcas stock a partir de `tracksInventory`.

Flujo actual:

1. Al abrir la app se comprueba la sesión. `/` dirige al usuario según su rol; si no hay sesión, muestra la bienvenida pública de MontePica con acceso a login y registro.
2. Login y registro usan la API.
3. Desde Inicio, **Para servirse** abre el escáner. La cámara lee un QR y la app consulta `POST /table-access/resolve`; si el backend lo acepta, muestra el código de mesa real y permite continuar al menú. Resolver el QR no crea una participación ni aprueba el ingreso.
4. **Pedir a domicilio** abre el menú directamente.
5. El menú y el detalle consultan el catálogo del backend. En iOS y Android se conserva en SQLite una copia del último catálogo completo; solo ante un fallo de conexión se muestra como referencia sin conexión y se deshabilita agregar al carrito. La web requiere conexión. La búsqueda y los filtros se aplican en la app.
6. En el detalle, picante, nota y cantidad son controles locales. **Agregar** añade el producto al carrito en memoria. En servicio en salón, el menú conserva `visitId` hasta `/orders`; confirmar envía UUID y cantidades al backend, que valida participación aprobada, cuenta abierta e inventario. En domicilio, `/orders` consulta cobertura y tarifa; tras la aprobación, crea el pedido con el carrito. El detalle consulta su liquidación y permite enviar comprobante JPEG/PNG de hasta 5 MiB; `pendingVerification` significa que espera revisión y no que el pago esté confirmado. El carrito se conserva en memoria y la revisión administrativa del pago sigue pendiente.

La pantalla `/waiter` consulta y cambia pedidos reales de servicio en salón mediante las rutas administrativas del backend; no comparte el carrito ni el estado local del cliente. Los pedidos a domicilio quedan fuera de esa bandeja. El catálogo administrado desde `/admin/products` es el mismo que consulta el cliente; el panel administrativo ya consulta jornada, caja, pedidos, inventario y visitas de mesa desde el backend.

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
│   ├── (client)/                    # home, scan-table, menu, orders, rewards y product/[id]
│   ├── (waiter)/                    # waiter.jsx → /waiter
│   └── admin/                        # layout, dashboard, products, tables, users, rewards y deliveries
├── components/
│   ├── components.md
│   └── ui/Title.jsx
├── features/
│   ├── auth/                    # formularios, pantallas, API y validadores
│   ├── client/                  # pantallas, APIs, hooks, mappers, carrito y caché SQLite del catálogo
│   ├── waiter/                  # bandeja local del mesero
│   └── admin/                   # catálogo, inventario, usuarios, mesas/visitas, panel y domicilios
│       ├── api/                 # APIs administrativas de catálogo, inventario, mesas, visitas y domicilios
│       ├── components/          # UI administrativa, modal de visita/QR y configuración de domicilios
│       ├── hooks/               # Coordinación de consultas, configuración y operaciones administrativas
│       └── data/                # mappers y datos semilla de pantallas locales
└── shared/
    ├── api/apiClient.js        # cliente Axios
    ├── session/sessionStore.js # usuario y tokens; SecureStore en iOS/Android
    └── validators/              # validaciones puras reutilizadas por features
```

El catálogo del cliente vive en el backend. `features/client/api/catalogApi.js` consulta todos los productos paginados y las categorías; `features/client/data/menuProductMapper.js` adapta productos al formato visual; `menuCatalogCache.native.js` guarda el último resultado completo en SQLite en iOS/Android y `menuCatalogCache.web.js` no habilita caché web. El menú usa la caché solo ante fallos de conexión, muestra su fecha y permite reintentar; errores HTTP no se ocultan con datos antiguos. El detalle puede mostrar un producto guardado como referencia, pero bloquea **Agregar** porque el precio podría estar desactualizado. La caché no conserva sesión, carrito, inventario ni pedidos y no habilita operaciones offline. `features/client/api/tableAccessApi.js` resuelve el token leído por el escáner; `features/client/hooks/useTableQrScanner.js` coordina estados, eventos repetidos, reintentos y cancelación. La administración usa `features/admin/api/catalogAdminApi.js` y `adminCatalogMapper.js` para gestionar productos/categorías y `features/admin/api/inventoryAdminApi.js` y `inventoryMapper.js` para la jornada y las existencias. `features/admin/data/adminData.js` conserva semillas locales usadas por el panel, que aún no está conectado.

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

- Conserva JavaScript/JSX, Expo Router, React Native y NativeWind. Mantén la paleta manabita: verde profundo #24543a, oliva #6f741b, crema #f8f5ec y acentos rojo #c72f32. La referencia de la tonga es solo visual; no forma parte del contenido ni del catálogo.
- Prioriza layouts móviles y revisa que el contenido funcione en web, iOS y Android. Ten cuidado con safe areas, alturas disponibles, teclado y overlays de cámara.
- Usa `Pressable` para acciones y agrega etiquetas de accesibilidad cuando no haya texto visible que describa el control.
- Mantén el menú y la pantalla de detalle conectados al catálogo de la API mediante `catalogApi.js` y el mapper de cliente.
- Mantén `/admin/products` conectado con `catalogAdminApi.js`; las rutas admin requieren un token y permisos otorgados por el backend. No reutilices las semillas de `adminData.js` como catálogo real.
- Mantén `/admin/inventory` y `/admin/movement` conectados con `inventoryAdminApi.js`; registra movimientos con clave idempotente y muestra cantidades del backend, no datos semilla.
- El catálogo no informa cantidades disponibles. No muestres stock real a partir de `tracksInventory`, que solo indica si se controla.
- No agregues una ruta para una pestaña inferior hasta que esa pantalla sea solicitada.
- El escáner usa `expo-camera` y solicita solo simbologías QR. Respeta sus permisos y no pongas elementos hijos dentro de `CameraView`; superpón el marco como una vista hermana. `tableAccessApi.js` envía el contenido leído sin transformarlo como `qrToken`; el token se mantiene en memoria y se limpia al reiniciar, continuar, perder foco o desmontar. La resolución valida QR/mesa, pero no solicita participación ni autoriza pedidos. No uses una mesa simulada cuando la cámara o el backend fallen.
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

`/admin/tables` consulta, crea y edita mesas reales con `tablesAdminApi.js`. Requiere `tables.read` para listar y consultar y `tables.manage` para crear o editar. Solo se envía `{code}` (entre 1 y 40 caracteres sin espacios exteriores); la API normaliza el código y comprueba duplicados. Permite editar el código y activar o desactivar una mesa mediante PATCH. No se puede desactivar una mesa con visita abierta; el backend vuelve a comprobar esta restricción. Capacidad, zona y QR no forman parte de la gestión actual.

`adminTableMapper.js` adapta código, estado activo y visita abierta; una visita no equivale a ocupación física. `useAdminTables.js` coordina carga, edición, cancelación, permisos y recargas; `TablesList.jsx` presenta filtros, conteos y páginas de 20 mesas. Se recorren todas las páginas del backend (hasta 100 por solicitud) antes de filtrar. Tras crear o editar, se vuelve a consultar y se muestra la página de la mesa; si falla la recarga, se informa que el cambio ya fue confirmado.

La acción **Visita** consulta nuevamente la mesa y abre un modal dentro de `/admin/tables`. `visitsAdminApi.js` contiene las solicitudes; `useAdminVisits.js` coordina consulta, apertura y cierre; `TableVisitModal.jsx` presenta los datos y confirmaciones. `tables.read` permite consultar la mesa; `visits.read` permite consultar el detalle, y `visits.manage` permite abrir, cerrar y emitir QR sin requerir `tables.manage`. La apertura requiere una mesa activa sin visita y una jornada operativa abierta. El cierre finaliza participaciones y el backend lo rechaza si hay consumos pendientes. Un cierre reintentado conserva su `Idempotency-Key`. Después de abrir o cerrar se actualiza el listado conservando búsqueda y filtros.

`useAdminVisitQr.js` comprueba la mesa y la visita antes de emitir; `TableVisitQr.jsx` genera el código localmente a partir del `qrToken` devuelto. La API entrega el token una sola vez. El estado del token vive únicamente en memoria y se limpia al cambiar mesa o visita, cerrar el modal, cerrar la visita o desmontar la pantalla. La emisión requiere confirmación porque invalida el QR anterior y cancela las solicitudes de participación pendientes. Ante un resultado incierto no se reintenta automáticamente, se oculta el QR anterior y se solicita actualizar la mesa antes de emitir otro. No se asegura que el QR siga vigente si otro administrador lo reemplaza.

El panel mantiene sus semillas de mesas independientes. El escáner del cliente resuelve QR reales mediante `/table-access/resolve`; la mesa real se pasa al menú, pero permite solicitar participación explícita y consultar su estado. Administración puede consultar, aprobar, rechazar y finalizar participaciones aprobadas; falta verificar esos flujos con backend/cuentas de prueba. No se deduce que exista un QR a partir de `openVisitId`.

## Actividades y seguimiento

Esta lista sirve para coordinar al equipo, no autoriza implementar todas las tareas a la vez. Antes de iniciar una actividad, revisa el código, el contrato y los avances actuales del backend; trabaja solo en la actividad que solicite el usuario. El backend local puede encontrarse en la carpeta vecina `Backend-Nestjs` y sus contratos pueden cambiar.

Usa `- [ ]` para actividades pendientes y `- [x]` para las terminadas. Marca una actividad como completada únicamente cuando su alcance esté implementado y las comprobaciones aplicables hayan pasado; si falta una prueba real o una puerta de calidad, deja la tarea abierta y anota qué falta. Si una tarea se entrega por etapas, divídela en subtareas concretas y marca solo las terminadas. Actualiza esta guía y el README cuando cambie el estado funcional; no taches trabajo de otra persona sin comprobarlo.

Actividades implementadas en el código actual (las pruebas reales y el análisis de cada revisión se registran por separado):

- [x] Conectar login, registro y consulta del catálogo del cliente al backend.
- [x] Conectar la gestión administrativa de productos, categorías e inventario diario.
- [x] Conectar el listado, la creación y la edición de usuarios administrativos.
- [x] Conectar el listado, la creación y la edición de código/estado de mesas administrativas.
- [x] Conectar puntos del cliente y catálogo público de recompensas; administrar configuración, saldos de clientes y catálogo desde `/admin/rewards`.

Actividades pendientes:

- [ ] Verificar en Android físico el aviso local y las push de aprobación y rechazo de cobertura en primer plano, segundo plano y con la app cerrada. El código usa `deliveryNotifications.android.js`, el panel de Pedidos y el registro autenticado `/me/push-device`. Comprobar que la pulsación abre Pedidos y consulta el estado real. Expo Export y las comprobaciones aisladas ya pasaron.

- [x] Implementar caché SQLite del catálogo completo para iOS/Android, recuperación ante fallos de conexión, fecha/reintento y bloqueo de compra con datos guardados; web conserva solo consulta online.
- [ ] Probar la caché del catálogo sin conexión en iOS y Android: primera carga online, reinicio de app, actualización correcta, caída de red, error HTTP, imagen remota ausente y bloqueo de **Agregar** desde un detalle guardado. Web debe seguir mostrando el error/reintento sin crear caché local. Registrar pruebas reales por plataforma.
- [ ] Verificar con el backend y cuentas de prueba autorizadas los flujos ya conectados, incluidos permisos, errores y persistencia. La edición de mesas aún requiere prueba real; documentar resultados y limitaciones por plataforma.
- [X] Verificar apertura y cierre de visitas en backend con cuentas de prueba: mesa activa/inactiva, visita existente, jornada cerrada, cierre con consumos pendientes, permisos, errores y reintento idempotente. El código de interfaz y API ya está implementado; falta la prueba real y el análisis de calidad de esta revisión.
- [X] Probar la emisión y renovación de QR con backend y cuentas de prueba autorizadas, incluidos permisos, errores, invalidación del token anterior y cancelación de solicitudes pendientes. La implementación administrativa está en el código; falta la prueba real y el análisis de calidad de esta revisión.
- [ ] Probar la resolución de QR con backend y cuentas/dispositivos de prueba autorizados: QR válido, inválido, renovado, visita cerrada, mesa inactiva, permisos, errores y pérdida de conexión. Verificar cámara en web, iOS y Android y documentar qué plataformas se probaron; la implementación está en el código, falta esta verificación real y el análisis de calidad de la revisión.
- [ ] Verificar solicitudes de participación del cliente con backend y dispositivos de prueba. La implementación está conectada; faltan pruebas reales y SonarCloud de esta revisión. Resolver QR por sí solo no registra participación.
- [ ] Verificar aprobación/rechazo administrativos con backend y dispositivos; la implementación está conectada.
- [ ] Verificar cancelación y salida voluntaria del cliente con backend y dispositivos. La implementación está conectada; faltan pruebas reales y SonarCloud de esta revisión.
- [x] Implementar finalización administrativa de participaciones aprobadas desde el modal de visita; falta verificar el flujo contra backend/cuentas autorizadas.
- [x] Conectar los indicadores disponibles del panel administrativo a jornada, caja, pedidos, inventario y visitas de mesa. Las ventas por hora, comparaciones y ticket medio no existen en los endpoints actuales y se retiraron.
- [x] Conectar la creación y consulta paginada de pedidos locales del cliente; el carrito conserva el `visitId` y envía pedidos con clave idempotente.
- [ ] Verificar pedidos locales del cliente con backend y cuentas de prueba: participación pendiente/aprobada, jornada/caja, inventario insuficiente, errores, resultado incierto y reintento con la misma clave; documentar plataformas y SonarCloud de esta revisión.
- [x] Conectar la consulta de cobertura y las solicitudes propias de domicilio desde `/orders`, con reintento idempotente.
- [x] Conectar configuración versionada de domicilios en `/admin/deliveries`; aprobación/rechazo ya está implementado y su verificación real permanece pendiente.
- [ ] Verificar configuración de domicilios y aprobación con backend/cuentas de prueba, permisos, actualización concurrente, reintentos idempotentes y errores; confirmar SonarCloud para esta revisión y probar en dispositivos.
- [x] Conectar la creación de pedidos a domicilio tras aprobar cobertura y el envío del comprobante JPEG/PNG desde el detalle.
- [ ] Verificar comprobantes de domicilio con cámara en iOS/Android, galería en las tres plataformas y backend/almacenamiento de prueba. Cubrir permiso denegado, cancelación, formatos inválidos, límites de tamaño, plazo vencido y reintentos inciertos. Comprobar que los dos orígenes lleguen a la bandeja administrativa.
- [ ] Verificar la consulta y revisión de transferencias administrativas con permisos, comprobante binario, referencia duplicada, errores, concurrencia y reintento idempotente; el código de bandeja está implementado, falta prueba real y SonarCloud de esta revisión.
- [x] Conectar la bandeja del mesero con pedidos locales: listado, detalle, conteos, transiciones y reintentos idempotentes.
- [x] Conectar pedidos de domicilio en la pestaña Pedidos de `/admin/deliveries`: listado, detalle, historial y transiciones idempotentes. La verificación real queda pendiente.
- [ ] Verificar la bandeja del mesero con backend y cuentas de prueba autorizadas, incluidos permisos, paginación, transiciones, conflictos, reintentos y código de mesa; confirmar SonarCloud de esta revisión.
- [ ] Revisar búsqueda, filtros y paginación de usuarios administrativos frente al contrato del backend y mostrar el detalle de permisos por rol si se solicita.
- [ ] Configurar lint y pruebas automatizadas si el equipo solicita incorporarlos; documentar comandos y ejecución en CI. Hasta entonces no afirmar que están configurados o aprobados.
- [ ] Verificar puntos y recompensas contra backend de prueba: saldo y movimientos del cliente, filtros/paginación, permisos `points.read`/`points.configure`/`rewards.read`/`rewards.manage`, alta/edición, productos no disponibles, conflictos de versión y reintentos idempotentes. Probar con cuentas autorizadas y revisar SonarCloud para esta revisión.

## Jornada, caja y finalización administrativa

El panel `/admin/dashboard` incorpora la gestión operativa existente sin agregar rutas. `operationsAdminApi.js` concentra los endpoints; `useAdminOperationsManagement.js` coordina permisos, consultas, conciliación y reintentos; `OperationsManagementPanel.jsx` presenta configuración, jornada, cajas, vistas previas y registros de cierre.

- `operations.read` consulta jornada, configuración, cajas históricas y vistas previas.
- `operations.open` abre la jornada o la caja de la jornada vigente. El fondo se envía en centavos exactos y la API no admite abrir caja sin jornada abierta. Si el resultado de una apertura no se confirma, la app consulta el estado antes de permitir otra acción; no repite automáticamente la escritura.
- `operations.manage` permite editar zona horaria IANA, horas de apertura/cierre y ventana de edición local. El PATCH envía solo campos cambiados y compara `updatedAt` con el servidor. Ante una respuesta incierta consulta la configuración actual; no reenvía automáticamente.
- `operations.closeCash` permite cerrar cajas sin bloqueos. La vista previa lista cada tipo de pendiente; el conteo se envía como centavos. Una diferencia exige motivo (1–500 caracteres). Antes de confirmar, la app actualiza la vista previa y compara su contenido; la escritura envía `Idempotency-Key`. El cierre queda como registro inmutable.
- `operations.closeDay` permite cerrar jornadas elegibles. La vista previa pagina los bloqueos y describe conteos, limpiezas y reembolsos pendientes; se exige confirmación y el backend vuelve a validar las condiciones. La operación conserva la clave idempotente y el resultado inmutable.

Si el cierre de caja o jornada queda incierto, la app consulta primero el registro de cierre. Si no aparece, mantiene el cuerpo y la clave originales para un reintento explícito; bloquea otras escrituras hasta resolver el estado. La consulta de cajas admite páginas de 20 y filtros abierta/cerrada o por UUID de jornada. No existe un listado general de jornadas, así que se puede consultar una jornada anterior ingresando su UUID. La apertura excepcional de una fecha actual con jornadas previas pendientes no está implementada; se muestra el rechazo del servidor sin abrir jornadas automáticamente.

En el modal de visita, `participants.manage` permite finalizar una participación **aprobada**. Se vuelve a consultar la solicitud antes de confirmar; el backend cierra la cuenta individual solo cuando permite su estado y rechaza consumos pendientes. El endpoint exige `Idempotency-Key`; las escrituras de participantes se coordinan con las de visita y QR para impedir acciones simultáneas. Los resultados inciertos conservan el contexto para reconciliación y reintento explícito.

- [ ] Verificar apertura de jornada/caja, permisos, restricciones y conflictos contra backend en cuentas de prueba autorizadas.
- [ ] Verificar finalización de participante con saldo resuelto y con consumos pendientes, incluidas carreras de estado y reintentos.
- [ ] Verificar cierres de caja con monto exacto, faltante/sobrante, motivo, bloqueos y resultado incierto.
- [ ] Verificar cierres de jornada con y sin caja, limpiezas previstas, bloqueos, reembolso pendiente y resultado incierto.
- [ ] Revisar SonarCloud/CI de la revisión correspondiente y completar los flujos en dispositivos; los resultados anteriores no acreditan esta etapa.

Los bundles de Expo, la revisión estática, las pruebas reales del backend y las pruebas en dispositivos deben registrarse por separado. No declarar lint, unit tests, tipos ni la puerta de SonarCloud aprobados si no existe una ejecución para esta revisión.

Verificación de la caché offline del catálogo: `npx expo export --platform all --output-dir dist/offline-catalog-check` generó bundles web, Android e iOS; `git diff --check` pasó. El modo avión y la persistencia tras reiniciar todavía requieren pruebas en dispositivos físicos; no se ejecutaron lint, pruebas unitarias ni tipos porque no están configurados.

Verificación de la etapa de jornada/caja en esta copia: `npx expo export --platform all --output-dir dist/operations-stage4-verified` completó web, Android e iOS; `git diff --check` pasó. `RUN_POSTGRES_E2E=1 npm run test:e2e -- test/table-access-postgres.e2e-spec.ts` en el backend vecino pasó 41 pruebas en su base de datos desechable; valida contratos y reglas del backend, no la interfaz Expo ni una conexión real frontend/backend. No se probaron dispositivos ni cuentas reales. SonarCloud se consultó: el último análisis disponible es del 16 de noviembre de 2026, revisión `e1fdab46fa155cde904cae87420b278e4d257e9f`, con Quality Gate OK y 28 issues abiertos. Ese análisis no incluye esta revisión; su puerta queda pendiente para estos cambios.

Al finalizar cada actividad, explica en el chat qué archivos y responsabilidades cambiaron, por qué, qué se verificó y qué queda pendiente. No hagas commits, pushes ni despliegues salvo solicitud explícita.


## Participación del cliente desde el escáner

Después de resolver el QR, el escáner consulta las participaciones propias por páginas de hasta 100 y busca la visita reconocida. Si existe una, muestra su estado real y permite actualizarla con `GET /me/participants/:id`. Si no existe, permite solicitar ingreso con un alias de 1 a 80 caracteres y `POST /visits/:id/participants`, enviando `{qrToken, alias}` e `Idempotency-Key`.

`participationApi.js` contiene las llamadas Axios; `useVisitParticipation.js` coordina consulta, envío, bloqueo y respuestas obsoletas; `VisitParticipationPanel.jsx` presenta formulario y estados dentro del escáner. El hook del escáner conserva el QR solo en memoria y lo limpia al confirmar una participación, reiniciar, continuar o abandonar. Ante resultado incierto se conserva la clave y el alias para un reintento explícito; abandonar no revierte un envío recibido por el servidor. No hay consultas periódicas.

Ver menú permite explorar el catálogo. Los pedidos de servicio en salón y de domicilio se crean y consultan con el backend; el flujo de domicilio requiere una solicitud aprobada. El cliente puede enviar un comprobante JPEG/PNG y consultar la respuesta de recepción, pero la revisión administrativa del pago sigue pendiente. La bandeja del mesero administra pedidos locales del backend por separado del flujo del cliente. La consulta, decisión y finalización administrativa y la salida voluntaria del cliente están conectadas; faltan pruebas reales en esta revisión.

Comprobaciones de esta etapa: Expo Export completó bundles web, iOS y Android; `git diff --check` pasó. Las comprobaciones aisladas con API simulada verificaron paginación, alias vacío, bloqueo de envíos simultáneos, reintento con cuerpo/clave idénticos, actualización de estado y respuesta posterior al desmontaje. No se probaron cámaras físicas ni escrituras contra el backend. SonarCloud consultado: último análisis del 30 de octubre de 2026, correspondiente a otra revisión; no confirma esta entrega. Lint, suite de pruebas y tipos siguen sin configuración.


## Aprobación y rechazo de participantes

El modal de visita de `/admin/tables` consulta y decide solicitudes con `participants.manage`, además de `tables.read` para entrar a la pantalla. No requiere `visits.read`, `visits.manage` ni `tables.manage` para esas acciones. Usa `participantsAdminApi.js`, `useAdminParticipants.js` y `VisitParticipants.jsx`: API, coordinación y presentación respectivamente. Muestra páginas de 20, filtros por estado y actualización manual. Aprobar envía `{}`; rechazar exige un motivo de 1 a 500 caracteres sin espacios exteriores. Ambos envíos llevan `Idempotency-Key`.

Los resultados inciertos conservan clave y cuerpo para reintento explícito. La reconciliación recorre páginas sin filtro antes de mostrar el estado encontrado; no atribuye el resultado a una escritura no confirmada. Durante el envío se bloquean cierre del modal y escrituras de visita/QR. Una recarga fallida después de confirmar la decisión solo requiere reintentar la consulta. Emitir QR refresca participantes; cambiar/cerrar visita desmonta la sección y cancela consultas. El cliente actualiza su estado manualmente desde el escáner.

- [ ] Verificar aprobación/rechazo con backend y cuentas de prueba, incluidos errores, concurrencia, QR renovado y plataformas físicas; confirmar SonarCloud de esta revisión.
- [x] Conectar finalización administrativa para participantes aprobados. La prueba real de consumos pendientes, concurrencia y permisos sigue abierta.

Verificación administrativa de esta entrega: bundles web, iOS y Android exportados correctamente y `git diff --check` sin errores. Comprobaciones aisladas con API simulada: consulta filtrada, motivo vacío, bloqueo de envíos repetidos, reintento con la misma clave, recarga tras confirmación y respuesta posterior al desmontaje. No se realizaron escrituras reales ni pruebas con dispositivos. SonarCloud devuelve OK para el análisis del 30 de octubre de 2026, de otra revisión; la puerta actual queda pendiente. Lint, suite de pruebas y tipos no están configurados.


## Salida voluntaria del cliente

El panel del escáner permite cancelar solicitudes pendientes y salir de participaciones aprobadas mediante `POST /me/participants/:id/leave`, con `{}` e `Idempotency-Key`. `participationApi.js` realiza la solicitud, `useVisitParticipation.js` consulta el estado antes de confirmar y coordina el envío; `VisitParticipationPanel.jsx` presenta acciones, confirmaciones y resultado.

Si la solicitud cambia de estado durante la consulta previa, se exige otra confirmación. Una aprobación concurrente posterior puede convertir la cancelación en una salida; la confirmación lo explica. El backend rechaza salidas con consumos pendientes y conserva las participaciones canceladas o finalizadas, sin permitir otro ingreso en la misma visita.

La salida tiene su clave y contexto propios, separados del ingreso. Ante resultado incierto, consultar conserva la clave mientras el estado siga pendiente/aprobado; un estado terminal se muestra sin atribuirlo al envío no confirmado. Los reintentos son explícitos. Abandonar la pantalla no revierte una solicitud recibida por el servidor. No se agrega historial ni acceso global a participaciones.

- [ ] Verificar salida del cliente con backend y dispositivos de prueba y confirmar SonarCloud de esta revisión. Pruebas aisladas: consulta previa, cambio concurrente, cancelación, finalización, bloqueo de envíos, clave reutilizada, errores 400/401/403/404/409 y respuesta tardía.


## Pedidos locales del cliente

`/orders` consulta pedidos propios de servicio en salón con `GET /me/orders` (páginas de 20 y modalidad `local`) y crea pedidos con `POST /visits/:id/orders`. `features/client/api/ordersApi.js` contiene las solicitudes; `hooks/useClientOrders.js` coordina carga, paginación, envío y reintentos; `data/orderMapper.js` convierte el carrito al DTO y adapta estados, fechas y totales; `data/orderStore.js` conserva el carrito y una operación idempotente pendiente en memoria.

El `visitId` real viaja desde la respuesta de resolver QR por el menú y el detalle hasta cada elemento del carrito; no se transmite el `qrToken` en rutas. Solo se envía un carrito de servicio en salón asociado a una única visita. Productos repetidos se agrupan por UUID porque el DTO prohíbe IDs duplicados; picante y notas se convierten en observaciones con límite de 500 caracteres por producto. El backend determina el precio final y valida visita abierta, participación aprobada, cuenta abierta, jornada/caja e inventario.

La escritura incluye `Idempotency-Key`. Si el resultado queda incierto se conserva el cuerpo y la clave, se bloquean cambios al carrito y el usuario decide cuándo reintentar. Al confirmar, se limpia el carrito y se consulta de nuevo la lista. Si falla esa consulta, el pedido confirmado sigue mostrándose y se ofrece actualizar la lista sin reenviar la creación. La interfaz muestra los estados reales; no inventa tiempos ni etapas de cocina.

La pantalla `/orders` consulta la cobertura, permite crear solicitudes con destinatario/dirección y muestra su estado desde `/me/delivery-requests`; los reintentos inciertos conservan cuerpo y clave en memoria por cliente. La solicitud no envía el carrito. Después de aprobarse, el cliente crea el pedido y puede seleccionar un comprobante JPEG/PNG de hasta 5 MiB desde el detalle. `useDeliveryReceipt.js` consulta la liquidación y vuelve a comprobar pedido, plazo y saldo antes de enviar `multipart/form-data` a `/me/settlements/:id/transfer-payments` con `Idempotency-Key`. Archivo y contexto de reintento viven solo en memoria; el estado `pendingVerification` espera revisión administrativa y no confirma el pago. La bandeja del mesero consulta `GET /admin/orders` limitado a `modality=local`, con `orders.read`; el detalle trae líneas e historial reales. Las transiciones disponibles usan `orders.manage`, vuelven a consultar estado/versión antes de confirmar y envían `expectedVersion` más una clave `Idempotency-Key`. La búsqueda de códigos de mesa solo se realiza con `tables.read`; si la visita ya no corresponde a una mesa abierta, se muestra su referencia sin inventar un código. La verificación de integración requiere prueba real con cuentas autorizadas y revisión SonarCloud de la revisión correspondiente; lint y pruebas unitarias no están configurados.

En el detalle de domicilio, `DeliveryReceiptPanel.jsx` usa `expo-image-picker` para tomar fotos en iOS y Android y elegir imágenes en las tres plataformas. Solicita permiso de cámara al iniciar una captura, valida JPEG/PNG de hasta 5 MiB para ambos orígenes y conserva la vista previa al cancelar o descartar un archivo. El panel ignora resultados del selector después de abandonar el pedido. La confirmación usa el diálogo del sistema en móvil y el del navegador en web.

Verificación de cámara y galería: Expo Export completó web, iOS y Android. Las comprobaciones aisladas del panel simularon permiso denegado, cancelación, tipo y tamaño inválidos, doble pulsación, quitar imagen, resultado después de salir, plazo vencido y confirmación web. Pasaron 42 pruebas de la suite del backend vecino con PostgreSQL desechable, incluidas las de comprobantes. La cámara física y el recorrido desde la app hasta la bandeja administrativa requieren pruebas de extremo a extremo.

La pestaña **Transferencias** de `/admin/deliveries` lista pagos `transfer` mediante `paymentsAdminApi.js` y `useAdminTransfers.js`. `payments.read` habilita lista y detalle; `payments.receipts.read` habilita la consulta autenticada del archivo; `payments.verify` habilita confirmar o rechazar. El endpoint no separa modalidad, por eso se advierte que reúne pagos de salón y domicilio. Confirmar normaliza referencia bancaria; rechazar requiere motivo. La decisión usa `Idempotency-Key` y los intentos inciertos se conservan en memoria. Se muestran imágenes JPEG/PNG y se identifica PDF sin visor. Aún faltan pruebas reales de permisos, almacenamiento, decisiones y dispositivos, además del análisis SonarCloud de esta revisión.

## Configuración y revisión administrativa de domicilios

`/admin/deliveries` consulta la configuración versionada y lista solicitudes de todas las jornadas en páginas de 20. `deliveryAdminApi.js` realiza las solicitudes HTTP. `useAdminDeliverySettings.js` coordina carga, validación, edición y guardado; `DeliverySettingsPanel.jsx` contiene el resumen y formulario. `useAdminDeliveryRequests.js` coordina listado y decisiones. `adminDeliveryOperationStore.js` retiene temporalmente las operaciones inciertas por usuario y coordina un bloqueo compartido entre escrituras de configuración y aprobación/rechazo.

Consultar la configuración y las solicitudes requiere `delivery.read`; editar requiere `delivery.configure`; aprobar o rechazar requiere `delivery.review`. El formulario controla habilitación, cobertura de 1 a 500 caracteres, tarifa USD con hasta dos decimales y plazo entero de 60 a 86400 segundos. No guarda si los valores no cambiaron. Cada escritura crea una versión nueva con `PUT /admin/delivery/settings` y `Idempotency-Key`; se consulta la versión vigente antes de guardar, se preservan los valores del formulario si cambió y se pide confirmación explícita. El backend sigue siendo la autoridad ante escrituras concurrentes.

Los resultados inciertos no se reintentan automáticamente. La pantalla permite consultar la versión vigente y reintentar el mismo cuerpo con su clave original. Emitir una nueva versión puede impedir aprobar solicitudes que usen una versión anterior. Aprobar cobertura no crea un pedido automáticamente: el cliente lo confirma después desde su carrito. La carga del comprobante ya está implementada; su revisión administrativa y las pruebas reales de este flujo siguen pendientes.

En el formulario del cliente, `useDeliveryLocation.js` captura ubicación una sola vez en primer plano, con permiso solicitado únicamente tras pulsar el botón, precisión equilibrada y timeout de 15 segundos después de concederlo. `DeliveryLocationControls.jsx` presenta las acciones de captura. El cliente puede cancelar y continuar con la dirección manual; si una actualización falla, conserva las coordenadas anteriores. `useDeliveryRequests.js` añade latitud y longitud juntas solo cuando ambas son válidas. La operación incierta conserva el mismo cuerpo y `Idempotency-Key`; tras confirmarse la solicitud se limpia la ubicación del borrador. La sesión distinta y la pérdida de foco cancelan lógicamente la captura e ignoran resultados tardíos. En el detalle de `/admin/deliveries` se muestran las coordenadas que devolvió el backend o **Sin ubicación adjunta**. No hay seguimiento, geocodificación ni mapas externos. El permiso de iOS se declara en `app.json`; permisos y GPS deben verificarse en dispositivos reales. Expo Export web/iOS/Android y `git diff --check` se ejecutan para la entrega. No se harán escrituras reales contra el backend ni pruebas en dispositivos sin un entorno de prueba. La puerta SonarCloud consultada está OK en el análisis del 13 de noviembre de 2026, revisión `5189900a7de43d461a5c7a6c6c7256afc59c3b2d`, que no incluye estos cambios; no confirma la calidad de esta entrega. Lint, pruebas unitarias y tipos no están configurados.

- [ ] Verificar ubicación opcional con API y dispositivos de prueba: con/sin coordenadas, permisos, servicios desactivados, timeout, cancelación, sesión/foco y reintentos del mismo cuerpo; revisar SonarCloud para esta revisión.

### Ciclo de sesión

La app valida las sesiones restauradas mediante `GET /auth/me` antes de mostrar rutas privadas. El rol del servidor determina el destino y el acceso. En móvil se usa SecureStore y en web la sesión vive en memoria.

Axios renueva los tokens una vez por sesión para varias respuestas 401 simultáneas. Cada petición puede repetirse una vez con sus datos originales. Los fallos temporales permiten reintentar y un refresh rechazado devuelve al login.

**Salir** revoca el refresh token vigente y borra la sesión local. Si no se confirma la revocación, el login muestra un aviso. **Cambiar contraseña** está disponible desde Inicio, la bandeja del mesero y el panel administrativo. Al cambiarla, el backend revoca todas las sesiones de la cuenta.

Esta entrega pasó Expo Export para web, iOS y Android, y `git diff --check`. Las comprobaciones aisladas con Axios y SecureStore simulados cubrieron renovación simultánea, conservación del cuerpo y la clave de idempotencia, cierre durante una renovación, respuesta de una cuenta anterior, fallos de red y persistencia.

- [ ] Verificar con cuentas de prueba los tres roles, la restauración en iOS y Android, el cierre remoto y el cambio de contraseña. Confirmar CI y SonarCloud para la revisión publicada.

### Recuperación de contraseña

La ruta pública `/recover-password` delega en `RecoverPasswordScreen.jsx` dentro de `auth`. `authApi.js` envía `{email}` a `POST /auth/forgot-password` y `{token, newPassword}` a `POST /auth/reset-password`. Ambas solicitudes se excluyen de la autenticación y renovación de sesión en Axios. Comparte el validador de contraseña nueva con el cambio autenticado. El código se pega manualmente y los valores sensibles se limpian al cambiar de paso, tras el éxito o al salir.

El mensaje de solicitud es uniforme para correos existentes, desconocidos y solicitudes limitadas. Un `204` confirma el restablecimiento y el servidor revoca las sesiones anteriores. Si la respuesta se pierde, la pantalla ofrece volver al login para comprobar la nueva contraseña.

- [ ] Verificar entrega de correo y revocación con SMTP y cuentas autorizadas en un backend de prueba. Registrar las plataformas probadas y el resultado de SonarCloud para la revisión publicada.

Verificación de esta implementación: Expo Export completó web, Android e iOS. La comprobación aislada del frontend con API simulada cubrió validación, solicitudes simultáneas, reenvío, errores y confirmación. La suite E2E del backend pasó 42 casos con PostgreSQL desechable y correo simulado. La API configurada no respondió a la consulta de disponibilidad. El último Quality Gate de SonarCloud consultado fue OK para `88646c2c`, una revisión anterior.

## Cuentas y cobros

`/admin/billing` consulta cuentas y liquidaciones mediante `billingAdminApi.js`, coordina el flujo en `useAdminBilling.js` y presenta listas/detalles en `BillingScreen.jsx`. Permisos: `accounts.read` para cuentas, `settlements.read` para liquidaciones, `settlements.manage` para preparar/anular y `payments.collect` para cobrar efectivo o liquidaciones en cero. La API valida caja, jornada, modalidad, pedidos entregados, transferencias pendientes y concurrencia. Las cuentas de domicilio no se preparan ni cobran en efectivo aquí; se liquidan desde el flujo del pedido y sus transferencias se revisan en `/admin/deliveries`.

En `/orders`, `AccountPaymentHistory.jsx` muestra cuentas y pagos propios mediante las consultas añadidas a `ordersApi.js`. El detalle refleja importes y estados del backend y permite consultar/ver el comprobante autenticado cuando existe. No guarda el archivo de forma persistente.

Las escrituras usan `Idempotency-Key`. Si una respuesta queda incierta, se conserva en memoria el mismo cuerpo y clave y se ofrecen consulta explícita y reintento manual. No hay reintentos automáticos.

Seguimiento de esta entrega:
- [x] Implementar listado/detalle de cuentas y liquidaciones, preparación y anulación, cobro en efectivo y finalización de total cero según permisos del backend.
- [x] Implementar en el cliente la consulta de cuentas/pagos propios, detalle y visualización autenticada de comprobantes disponibles.
- [ ] Probar en backend con cuentas autorizadas todos los permisos, modalidades, restricciones operativas, errores, reintentos idempotentes y respuestas inciertas.
- [ ] Generar Expo Export web/iOS/Android, revisar `git diff --check` y consultar el análisis SonarCloud correspondiente a esta entrega.
- [ ] Ejecutar pruebas en dispositivos y documentar las plataformas realmente probadas. Lint, pruebas unitarias y tipos siguen sin estar configurados.

## Cambios de pedidos, cancelaciones y reembolsos

`/orders` integra edición de salón con `expectedVersion`, cancelación directa de salón, solicitudes de cancelación y su retiro, y consultas de reembolsos propios. `orderLifecycleApi.js` centraliza las solicitudes y `useOrderLifecycle.js` verifica el estado actual y coordina las recargas. Los pagos de domicilio se consultan por liquidación para distinguir transferencia confirmada, pendiente y ausencia de pago.

`/admin/billing` presenta las bandejas paginadas de cancelaciones y reembolsos mediante `cancellationRefundsApi.js` y `useAdminCancellationRefunds.js`. El hook compartido de operaciones confirmadas retiene el cuerpo y la clave idempotente en memoria ante resultados inciertos y exige una consulta de reconciliación antes de ofrecer el mismo envío.

- [ ] Verificar el recorrido de frontend con cuentas de prueba en navegador y dispositivos. La suite de integración del backend aislado pasó 41 casos. Revisar CI y SonarCloud de la revisión publicada antes de dar por cerrada la etapa.

## Puntos, recompensas y canjes

La ruta del cliente `/rewards` muestra el saldo disponible, puntos pendientes/reservados, tasa pública, recompensas publicadas, movimientos paginados por tipo y canjes propios con filtros/paginación por estado. `features/client/api/rewardsApi.js` contiene lecturas de puntos y catálogo; `hooks/useClientRewards.js` coordina esas consultas. `features/client/api/redemptionsApi.js` contiene las consultas, creación y cancelación de canjes; `hooks/useClientRedemptions.js` coordina permisos de sesión del cliente, paginación, filtros, participación aprobada, versión de recompensa y reintentos.

La ruta administrativa `/admin/rewards` presenta la configuración de puntos, la consulta de saldo e historial por UUID de cliente y el catálogo administrativo de recompensas. `features/admin/api/pointsRewardsAdminApi.js` centraliza las llamadas; `hooks/useAdminPointsRewards.js` coordina permisos, filtros, consultas, validación, versiones y operaciones. La edición de usuarios ofrece un acceso al saldo cuando existe `clientId` y la cuenta posee `points.read`.

- `points.read` permite consultar configuración administrativa y saldos/movimientos por cliente.
- `points.configure` permite cambiar la tasa (entero de 1 a 1000) y habilitar o deshabilitar el programa. Cada PUT requiere confirmación, crea una nueva versión e incluye `Idempotency-Key`.
- `rewards.read` permite consultar detalles y catálogo administrativo paginado con búsqueda y filtro activo.
- `rewards.manage` permite crear y editar. Crear vincula un producto público existente; editar conserva fijo el producto y envía `expectedVersion` más solo los campos modificados. Ambas escrituras incluyen clave idempotente. Los resultados inciertos conservan clave y cuerpo en memoria para un reintento explícito.
- El catálogo del cliente usa `/rewards`, que solo expone recompensas activas y disponibles. Desde el panel de una visita se puede abrir `/rewards?visitId=...`; solicitar requiere una participación aprobada. Antes de enviar se vuelve a consultar la recompensa para comprobar estado y versión. El backend valida puntos, jornada, caja e inventario y reserva puntos; una solicitud pendiente se puede cancelar desde la lista propia. El estado se actualiza por consulta manual, sin sondeo en segundo plano.
- Una escritura incierta conserva en memoria su clave y cuerpo originales. Se puede consultar el detalle/listado antes de reintentar exactamente la misma operación; no se crean claves nuevas para un reintento pendiente. Abandonar la pantalla no revierte una operación que el servidor haya recibido.

La sección administrativa de `/admin/rewards` consulta `/admin/redemptions` con `redemptions.read`, y presenta detalle e historial. `redemptions.manage` habilita aprobación/rechazo; el rechazo exige motivo de 1 a 500 caracteres. `features/admin/api/redemptionsAdminApi.js` contiene las solicitudes y `hooks/useAdminRedemptions.js` coordina filtro, páginas, preconsulta del estado y escrituras idempotentes. Ante resultado incierto, la UI conserva clave y decisión/motivo, ofrece consulta del detalle y reintenta el mismo envío. El backend sigue siendo autoridad ante permisos y carreras.

Estas pantallas no afirman que los puntos pendientes ya estén acreditados. Los valores, movimientos y canjes se leen del backend. La aprobación crea el pedido asociado según el contrato del servidor. La implementación no equivale a verificación real: faltan pruebas con cuentas autorizadas, revisión SonarCloud de esta revisión y comprobación en dispositivos.

Verificación de puntos, recompensas y canjes en esta copia: Expo Export web, Android e iOS completado; `git diff --check` pasó. No se probaron escrituras con cuentas reales ni dispositivos. El último Quality Gate consultado en SonarCloud es `OK` (19 de noviembre de 2026, revisión `88646c2c06774d300f85127efc86c0de691aab6b`), pero no incluye estos cambios; la puerta de esta entrega queda pendiente. Lint, unit tests y tipos no están configurados.

Seguimiento de canjes:
- [x] Implementar consulta, filtros, paginación, solicitud/cancelación del cliente y gestión administrativa con detalle/historial, permisos y reintento idempotente.
- [ ] Probar con cuentas y backend de prueba: puntos insuficientes, recompensa/versiones, inventario, participación, visita/jornada/caja, cancelación y decisiones concurrentes; verificar roles y errores.
- [ ] Probar los recorridos en web, iOS y Android y registrar plataformas; revisar el Quality Gate SonarCloud de esta revisión.
