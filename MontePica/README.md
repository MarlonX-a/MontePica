# MontePica

Aplicación para una cevichería, construida con Expo, React Native, Expo Router y NativeWind. La interfaz y los datos actuales forman un prototipo local; todavía no hay servicios de backend ni almacenamiento persistente.

## Estructura del código

```text
MontePica/
├── assets/                              # Imágenes e iconos de la aplicación
├── src/
│   ├── app/                             # Entradas y layouts de Expo Router
│   │   ├── _layout.jsx                  # Stack raíz y estilos globales
│   │   ├── index.jsx                    # Redirección inicial al login
│   │   ├── (auth)/                      # Rutas /login y /register
│   │   ├── (client)/                    # /home, /scan-table, /menu, /orders, /product/[id]
│   │   ├── (waiter)/                    # /waiter
│   │   └── admin/                       # /admin/products, /admin/tables, /admin/users
│   ├── components/                      # Guía breve y UI transversal
│   │   ├── components.md                # Referencia a esta guía
│   │   └── ui/Title.jsx                 # Título genérico
│   ├── features/
│   │   ├── auth/                        # Formularios, pantallas, validadores y authStore
│   │   ├── client/                      # Inicio, escáner, menú, detalle, pedidos y UI cliente
│   │   ├── waiter/                      # Bandeja de pedidos de prueba del mesero
│   │   └── admin/                       # Productos, mesas, usuarios y su estado local
│   └── shared/
│       ├── data/menuProducts.js         # Catálogo compartido por cliente y administración
│       └── session/sessionStore.js      # Usuario actual en memoria y cierre de sesión
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
- `features/auth/` valida y procesa localmente el registro y el inicio de sesión. `authStore.js` mantiene la lista de cuentas de demostración en memoria.
- `features/client/` contiene el recorrido del cliente. `data/orderStore.js` conserva carrito y pedido activo en memoria.
- `features/waiter/` muestra pedidos de ejemplo y permite cambiar su estado localmente.
- `features/admin/` muestra y edita productos, mesas y usuarios de demostración dentro de su propio estado local.
- `shared/` contiene estado o datos que usan varias features. La sesión actual vive en memoria; el catálogo compartido está en `shared/data/menuProducts.js`.
- `components/ui/` contiene elementos visuales reutilizables que no conocen las reglas de una feature, como `Title.jsx`.
- `assets/` guarda las imágenes y los iconos locales.

## Recorrido de navegación

1. Expo Router toma `src/app/` como raíz; `src/app/_layout.jsx` monta el Stack principal.
2. `/` redirige a `/login`. Las rutas `/login` y `/register` muestran sus pantallas de autenticación.
3. El acceso simulado dirige al cliente a `/home` o a un usuario con rol mesero a `/waiter`.
4. Desde `/home`, **Pedir a domicilio** abre `/menu`; **Para servirse** abre `/scan-table`, donde la mesa se reconoce de forma simulada y luego se continúa al menú.
5. Desde el menú, elegir un producto abre `/product/[id]`. Agregarlo lleva a `/orders`, donde se puede ajustar el carrito y crear un pedido local para mostrar su seguimiento.
6. Las rutas `/admin/products`, `/admin/tables` y `/admin/users` muestran la administración de demostración.

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
- Un catálogo utilizado por cliente y administración pertenece a `shared/data/`.
- El usuario actual usado por autenticación y otras pantallas pertenece a `shared/session/`.
- Un título visual que puede usarse en varias pantallas sin reglas de negocio pertenece a `components/ui/`.
- Una ruta nueva se declara en `app/`; el JSX de la pantalla se coloca en la feature correspondiente.

## Estado local y límites actuales

El registro guarda cuentas en memoria durante la ejecución. El inicio de sesión encuentra una cuenta registrada o crea el usuario de demostración actual, y la sesión se conserva en `shared/session/sessionStore.js` mientras la app está abierta. Cerrar sesión limpia ese usuario. No hay autenticación de servidor ni persistencia después de reiniciar la aplicación.

El catálogo de ceviches y bebidas es una constante compartida; las ediciones de productos que aparecen en administración viven en el estado de administración y no modifican ese catálogo. El carrito y el pedido activo del cliente viven en `orderStore.js`; confirmar el pedido genera un seguimiento local. Los pedidos de la pantalla del mesero son datos de muestra independientes y no se conectan con los pedidos del cliente. Las mesas y usuarios de administración también son simulaciones locales.

El escáner solicita permiso para usar la cámara, pero la detección de Mesa 08 es simulada. No se envían pedidos, pagos ni datos a un servidor.

## Configuración y comandos

- `package.json` declara Expo SDK 57, React Native, Expo Router y NativeWind. Sus scripts son `start`, `android`, `ios` y `web`; no hay comandos de lint ni pruebas unitarias configuradas.
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
