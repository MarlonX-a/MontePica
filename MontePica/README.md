# MontePica

Aplicación móvil construida con Expo, React Native, Expo Router y NativeWind. El código de la aplicación está en `src/` y se organiza separando navegación, funcionalidades del negocio y componentes visuales reutilizables.

## Estructura

```text
MontePica/
├── assets/                       # Iconos e imágenes de la aplicación
├── src/
│   ├── app/                       # Rutas de Expo Router
│   │   ├── _layout.jsx            # Stack raíz; importa los estilos globales
│   │   ├── index.jsx              # Entrada inicial; redirige al acceso
│   │   └── (auth)/                # Grupo de navegación de autenticación
│   │       ├── _layout.jsx        # Stack del grupo (auth)
│   │       └── login.jsx          # Ruta /login; conecta ruta con pantalla
│   ├── components/
│   │   ├── components.md          # Referencia a esta guía
│   │   └── ui/                    # Piezas visuales transversales
│   │       └── Title.jsx          # Título y subtítulo configurables
│   └── features/
│       └── auth/                  # Funcionalidad de autenticación
│           ├── screens/
│           │   └── LoginScreen.jsx # Composición visual de la pantalla
│           └── components/
│               └── LoginForm.jsx  # Etiquetas, campos y botón de acceso
├── global.css                     # Directivas base de Tailwind
├── app.json                       # Configuración de Expo
├── babel.config.js                # Babel y preset de NativeWind
├── jsconfig.json                  # Alias de imports @/ hacia src/
├── metro.config.js                # Metro integrado con NativeWind
├── package.json                   # Dependencias y comandos
└── tailwind.config.js             # Archivos escaneados y preset NativeWind
```

Las carpetas `services`, `store`, `hooks`, `constants` y `utils` no existen todavía porque el código actual no las necesita. Si se agrega una función transversal que las justifique, pueden crearse entonces.

## Cómo llega la app al login

1. `package.json` inicia Expo Router mediante `expo-router/entry`.
2. Expo Router encuentra `src/app/_layout.jsx`, que carga `global.css` y crea el Stack raíz sin encabezados visibles.
3. La ruta inicial `src/app/index.jsx` redirige a `/(auth)/login`.
4. `src/app/(auth)/_layout.jsx` define el Stack del grupo de autenticación y registra la ruta `login`.
5. `src/app/(auth)/login.jsx` es una entrada pequeña: renderiza `LoginScreen` desde la feature.
6. `src/features/auth/screens/LoginScreen.jsx` compone el contenedor, el encabezado `Title`, el formulario y los textos inferiores.
7. `src/features/auth/components/LoginForm.jsx` presenta las etiquetas, los campos editables, el campo de contraseña oculta y el botón.

El grupo `(auth)` organiza las rutas de autenticación y no forma parte de la URL. Por eso la ruta de acceso queda como `/login`.

## Dónde poner código nuevo

- Una pieza exclusiva del acceso o de autenticación, como un formulario, su estado o una validación, va en `src/features/auth/`.
- Una pieza visual genérica que sirva a varias funcionalidades, como un título, botón o campo de entrada sin conocimiento del negocio, va en `src/components/`.
- La pantalla que combina esas piezas va en `features/<nombre>/screens/`; el archivo de `app/` solo conecta la navegación con ella.
- Clientes HTTP y almacenamiento que sean infraestructura común pueden ir en `src/services/` cuando realmente se incorporen.

La dirección de imports debe ser: **rutas → features → componentes compartidos**. Los componentes compartidos no importan pantallas, rutas ni lógica de autenticación.

## Configuración

- `package.json` declara Expo SDK 57, React Native, Expo Router y NativeWind, además de los comandos `start`, `android`, `ios` y `web`. No declara un comando de lint ni una suite de pruebas.
- `app.json` contiene el nombre, iconos, orientación, plataformas y plugin de Expo Router.
- `jsconfig.json` permite importar desde `src/` con el prefijo `@/`, por ejemplo `@/features/auth/screens/LoginScreen`.
- `babel.config.js` usa `babel-preset-expo` y el preset de NativeWind para transformar la app.
- `metro.config.js` integra NativeWind con Metro y señala `global.css` como entrada de estilos.
- `tailwind.config.js` limita la búsqueda de clases a archivos dentro de `src/` y configura el preset NativeWind.
- `global.css` incluye las directivas base, componentes y utilidades de Tailwind.
- `assets/` contiene los iconos de la app usados por `app.json`.

## Estado actual del acceso

El login implementa la presentación visual y permite escribir en los campos nativos. El botón no envía credenciales y los textos para recuperar la contraseña y crear una cuenta aún no navegan. No hay conexión de autenticación, llamadas al servidor, validación ni persistencia de sesión.

## Comandos

```bash
npx expo start
npx expo start --android
npx expo start --ios
npx expo start --web
```

Consulta [AGENTS.md](AGENTS.md) para las reglas de trabajo del proyecto.
