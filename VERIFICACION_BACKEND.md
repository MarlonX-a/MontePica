# Verificación de flujos conectados al backend

Fecha de revisión: 2026-11-08

## Estado actualizado del QR

La integración de QR ya está implementada en la aplicación:

- administración emite el token con `POST /admin/visits/:id/qr`;
- el token se convierte localmente en un código visible mediante
  `react-native-qrcode-svg` y no se persiste;
- la emisión exige confirmación porque invalida el QR anterior y cancela
  solicitudes pendientes;
- el escáner acepta únicamente códigos QR, resuelve el token con
  `POST /table-access/resolve` y muestra la mesa devuelta por el backend;
- se manejan estados de carga, QR vencido o inválido, sesión expirada,
  permisos, pérdida de conexión, reintento y cancelación al abandonar la
  pantalla.

La implementación fue validada con `npx expo export --platform web`,
`npm run build`, `npm run lint` y `npm test` del backend. Esto valida el
bundle y el contrato automatizado, pero no sustituye una prueba con cámara,
cuentas autorizadas ni datos persistidos.

## Alcance

Se revisaron los flujos que el proyecto declara conectados al backend:

- autenticación: inicio de sesión y registro;
- catálogo público y administración de productos/categorías;
- inventario operativo diario;
- usuarios y roles administrativos;
- listado, creación y edición de mesas;
- apertura/cierre de visitas y emisión/resolución de QR.

La edición de mesas se incluye como flujo pendiente de prueba real, tal como indica
`AGENTS.md`.

## Resultado de la verificación disponible

La revisión local confirmó que:

- las llamadas usan `apiClient`, que obtiene la URL desde
  `EXPO_PUBLIC_API_URL` y adjunta el token de sesión;
- las mesas se consultan paginando `/admin/tables`, se crean con `POST` y se
  editan con `PATCH`;
- la pantalla de mesas comprueba `tables.read` para consultar y
  `tables.manage` para crear o editar;
- el código muestra mensajes diferenciados para sesión expirada (`401`),
  permisos insuficientes (`403`), errores del backend y falta de conexión;
- después de crear o editar una mesa se vuelve a consultar el listado. Si esa
  recarga falla, la interfaz informa que la operación ya pudo haberse
  confirmado y evita repetirla automáticamente;
- las operaciones de inventario incluyen `Idempotency-Key`;
- el escáner ya no simula Mesa 08: resuelve QR reales; la participación
  posterior se consulta y solicita mediante los endpoints correspondientes;
- el proyecto conserva explícitamente como locales/simulados los pedidos, el
  carrito y la bandeja del mesero.

## Pruebas reales no ejecutadas

No fue posible completar pruebas funcionales contra el backend porque todavía
no se dispone de:

- cuentas de prueba autorizadas ni sus contraseñas;
- un dispositivo o sesión autenticada para probar persistencia con
  SecureStore.

La API vecina sí contiene `.env` y los contratos de visitas, QR y
participación, pero sus valores no se copian ni se muestran en este informe.

Por lo tanto, no se afirma que las solicitudes hayan llegado al backend ni que
los datos hayan persistido. Tampoco se realizaron escrituras de prueba para
evitar modificar datos reales sin un entorno autorizado.

## Matriz para ejecutar con cuentas autorizadas

| Flujo | Permisos/cuenta | Comprobaciones | Estado |
| --- | --- | --- | --- |
| Login y registro | Cuenta válida; cuenta inválida | Éxito, credenciales incorrectas, validación y sesión restaurada | Pendiente |
| Catálogo público | Sin permisos administrativos | Carga de productos/categorías, respuesta vacía y error de red | Pendiente |
| Catálogo administrativo | `catalog.read`, `catalog.write` | Lectura, creación, edición, `401`, `403`, validación y persistencia tras recargar | Pendiente |
| Inventario | `operations.read`, `inventory.read`, `operations.open`, `inventory.initialize`, `inventory.move`, `inventory.adjust` según acción | Jornada, existencias, idempotencia, permisos, errores y cantidades tras recargar | Pendiente |
| Usuarios y roles | `users.read`, `roles.read`, `users.create`, `users.update` según acción | Lectura, creación, edición, duplicados, restricciones de rol/estado y persistencia | Pendiente |
| Listado de mesas | `tables.read` | Paginación, filtros, estados y error `401`/`403` | Pendiente |
| Creación de mesas | `tables.read`, `tables.manage` | Código válido, espacios, duplicado, respuesta de error y persistencia | Pendiente |
| **Edición de mesas** | `tables.read`, `tables.manage` | Cambio de código, activar/desactivar, mesa con visita abierta, recarga y persistencia | **Pendiente de prueba real** |
| Apertura/cierre de visita | `visits.manage`, `visits.read` | Mesa activa/inactiva, visita existente, permisos, cierre con consumos pendientes e idempotencia | Pendiente |
| Emisión de QR | `visits.manage` | Token de un solo retorno, invalidación del anterior, cancelación de solicitudes y permisos | Pendiente |
| Resolución de QR | Cliente autenticado | QR válido, vencido, renovado, visita cerrada, mesa inactiva, sesión y conexión | Pendiente |

Para las pruebas de escritura debe usarse un código de mesa o producto
reservado para pruebas y eliminar/restaurar los datos según el procedimiento
del backend. No repetir una operación solo porque falle la recarga posterior:
primero debe verificarse el estado en el backend.

## Limitaciones por plataforma

- **Web:** la sesión solo vive en memoria; al recargar la página debe
  repetirse el inicio de sesión. La persistencia entre reinicios no puede
  certificarse en web con el diseño actual.
- **iOS y Android:** la sesión usa SecureStore, pero requiere prueba en
  dispositivo o emulador autorizado para confirmar restauración, expiración y
  permisos.
- **Todas:** la URL del backend debe estar disponible desde la plataforma
  probada. Un `localhost` configurado en el host no representa necesariamente
  al dispositivo físico.
- **QR:** la emisión conserva el token solo en memoria de la pantalla
  administrativa; cerrar esa vista exige emitir otro y el backend invalida el
  anterior. La cámara y el backend aún requieren prueba física autorizada.
- **Pedidos y pagos:** continúan siendo simulados/locales y no deben incluirse
  como flujos backend aprobados.

## Validación local ejecutada

- Inspección de contratos y manejo de errores en las APIs de autenticación,
  catálogo, inventario, usuarios y mesas.
- Inspección de permisos y estados de carga, error, reintento y persistencia
  posterior a escritura en la pantalla y hook de mesas.
- Comprobación de configuración local: Expo cargó la configuración de entorno
  disponible y las dependencias se instalaron con `npm ci --ignore-scripts`;
  no se registran valores secretos en este informe.
- No se ejecutaron lint ni pruebas unitarias porque `package.json` no define
  esos scripts.
- `npx expo export --platform web` completó correctamente.
- `npm run build` y `npm run lint` del backend completaron correctamente.
- `npm test` del backend pasó: 12 archivos y 46 pruebas.

## Próximo paso

Repetir la matriz en un entorno de staging con cuentas autorizadas separadas
por permisos. Registrar para cada fila la fecha, plataforma, endpoint,
resultado HTTP, mensaje visible y estado observado después de volver a cargar.
Solo entonces se podrá marcar la actividad de `AGENTS.md` como completada.
