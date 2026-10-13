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

MontePica es una aplicación móvil para una cevichería. El menú de muestra debe limitarse a ceviches —por ejemplo, pescado, camarón y mixto— y bebidas como jugos, limonada y cola. No agregues platos ajenos a ese catálogo.

La aplicación sigue siendo un prototipo local: no hay backend, persistencia de pedidos ni sesión real. Conserva este límite hasta que el usuario solicite integrar esos servicios. Los precios, disponibilidad, mesa y productos actuales son datos de muestra.

Flujo actual:

1. `/` redirige al login.
2. El login permite entrar al inicio localmente, sin autenticación de servidor.
3. Desde Inicio, **Para servirse** abre el escáner. El escáner muestra una mesa reconocida simulada (Mesa 08) y continúa al menú.
4. **Pedir a domicilio** abre el menú directamente.
5. El menú permite buscar y filtrar productos localmente; al tocar una tarjeta abre el detalle del producto.
6. En el detalle, picante, nota y cantidad son controles locales. **Agregar** todavía no envía ni guarda pedidos.

No conviertas una simulación visual en una llamada de red ni des por confirmados pedidos, pagos o datos persistentes.

## Arquitectura actual

El código de la aplicación vive en `src/`. `src/app/` define rutas con Expo Router; las pantallas y los componentes propios del negocio viven en `src/features/`.

```text
src/
├── app/
│   ├── _layout.jsx
│   ├── index.jsx
│   ├── (auth)/
│   │   ├── _layout.jsx
│   │   ├── login.jsx
│   │   └── register.jsx
│   └── (client)/
│       ├── home.jsx
│       ├── scan-table.jsx
│       ├── menu.jsx
│       └── product/
│           └── [id].jsx
├── components/
│   └── ui/
│       └── Title.jsx
└── features/
    ├── auth/
    │   ├── components/          # LoginForm y RegisterForm
    │   ├── screens/             # LoginScreen y RegisterScreen
    │   └── validators/          # Validaciones locales de auth
    └── client/
        ├── components/          # BottomNavigation y MenuProductCard
        ├── data/                 # Catálogo local compartido por menú y detalle
        └── screens/              # Home, escáner, menú y detalle
```

Otros archivos importantes:

- `assets/`: iconos e imágenes locales; las fotos de ceviches se usan en el detalle.
- `app.json`: configuración de Expo, esquema de enlaces y permisos/plugins.
- `package.json` y `package-lock.json`: dependencias y comandos npm.
- `jsconfig.json`: alias `@/` hacia `src/`.
- `babel.config.js`, `metro.config.js`, `tailwind.config.js` y `global.css`: configuración de Babel, Metro y NativeWind.

### Dónde poner cada cambio

- Una ruta de `src/app/` debe ser pequeña: importa y renderiza la pantalla de su feature. Mantén ahí layouts y configuración de navegación, no el JSX completo de una pantalla.
- Una pantalla va en `src/features/<feature>/screens/`.
- Una pieza propia de una feature que tenga suficiente UI o responsabilidad para entenderse y mantenerse aparte va en `src/features/<feature>/components/`. Por ejemplo, las tarjetas del menú pertenecen a `features/client/components/`.
- Un componente sencillo que solo se usa dentro de una pantalla puede quedarse definido en esa pantalla. No crees un archivo por cada fragmento pequeño sin una razón clara.
- Coloca datos locales compartidos por pantallas de una misma feature en `src/features/<feature>/data/`; evita duplicar el catálogo en el menú y en el detalle.
- `src/components/` es solo para UI transversal sin dependencia de autenticación, cliente ni otra feature. No muevas ahí componentes específicos del menú o del login.
- Crea `services/`, `hooks/`, `store/`, `constants/` o `utils/` solo cuando una necesidad real lo justifique.

Dirección de dependencias: **rutas → pantallas de features → componentes de la feature o UI compartida**. Los componentes compartidos no importan features ni rutas; una feature no importa archivos de `src/app/`.

Usa el alias `@/` para imports desde `src/`, por ejemplo:

```js
import MenuScreen from '@/features/client/screens/MenuScreen';
```

## Interfaz y navegación

- Conserva JavaScript/JSX, Expo Router, React Native y NativeWind. Mantén consistencia con los colores crema, terracota y café que ya usa la aplicación.
- Prioriza layouts móviles y revisa que el contenido funcione en web, iOS y Android. Ten cuidado con safe areas, alturas disponibles, teclado y overlays de cámara.
- Usa `Pressable` para acciones y agrega etiquetas de accesibilidad cuando no haya texto visible que describa el control.
- Mantén el menú y la pantalla de detalle conectados al mismo catálogo local.
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
