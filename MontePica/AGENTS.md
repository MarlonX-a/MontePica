# Instrucciones del proyecto

Esta es una aplicación móvil Expo y React Native. Prioriza patrones móviles, rendimiento y compatibilidad entre plataformas.

## Documentación de Expo

Las APIs de Expo pueden cambiar entre versiones. Antes de modificar una API de Expo, EAS o React Native:

1. Revisa la versión principal de `expo` en `package.json`.
2. Consulta la documentación de esa versión en `https://docs.expo.dev/versions/v<major>.0.0/`.
3. Para otros temas de Expo, consulta `https://docs.expo.dev/llms.txt` y sigue los enlaces pertinentes.

## Comandos del proyecto

Usa `bunx` en vez de `npx` si se incorpora un archivo `bun.lock`.

```bash
npx expo install <package>
npx expo start
npx expo lint
npx tsc --noEmit
npx expo-doctor
npx expo install --fix
```

## Navegación

- Usa Expo Router. Sus rutas viven en `src/app/`; los archivos `_layout.jsx` definen los navegadores.
- Mantén el código reutilizable y la lógica de negocio fuera de `src/app/`.
- Importa `Link`, `router` y `useLocalSearchParams` desde `expo-router` cuando sean necesarios.
- Referencia: https://docs.expo.dev/router/introduction.md

## EAS y código nativo

- Usa EAS para builds, envíos y actualizaciones. En proyectos sin Bun, invoca EAS CLI mediante `npx eas-cli@latest <command>`; en proyectos con Bun, mediante `bunx eas-cli <command>`.
- No crees ni edites manualmente `ios/` o `android/` cuando no existan: son directorios generados. Configura el comportamiento nativo en `app.json` o en plugins.
- Expo Go incluye solo sus módulos nativos. Una dependencia que agregue código nativo requiere un build de desarrollo.
- Prefiere módulos Expo recomendados y verifica compatibilidad con el SDK antes de añadir dependencias.

## Arquitectura por features

El código de la aplicación vive bajo `src/`. Cada feature contiene las pantallas y piezas que solo pertenecen a ese dominio; `components/` contiene UI transversal. Crea subcarpetas cuando exista código que las necesite.

```text
src/
├── app/                         # Rutas y layouts de Expo Router
│   ├── _layout.jsx              # Navegador raíz y estilos globales
│   ├── index.jsx                # Redirección inicial
│   └── (auth)/                  # Grupo de rutas de autenticación
├── components/ui/               # UI reutilizable sin conocimiento de negocio
│   └── Title.jsx
└── features/auth/
    ├── screens/                 # Composición de pantallas de autenticación
    │   └── LoginScreen.jsx
    └── components/              # Piezas propias de autenticación
        └── LoginForm.jsx
```

### Reglas para ubicar código

- `src/app/` contiene únicamente archivos de ruta y layouts. Una ruta importa y muestra la pantalla de su feature; no alberga lógica de negocio, formularios completos ni llamadas HTTP complejas.
- `src/features/<feature>/` contiene componentes y lógica que pertenecen exclusivamente a ese dominio. Por ejemplo, el formulario de acceso pertenece a `features/auth`.
- `src/components/` contiene UI independiente del negocio que puede reutilizarse entre features. `Title` es un ejemplo.
- Si aparece infraestructura compartida, ubícala en `src/services/`; estado global en `src/store/`; hooks transversales en `src/hooks/`; constantes en `src/constants/`; y funciones puras compartidas en `src/utils/`. No crees estas carpetas hasta que haya código para ellas.
- Mantén el sentido de dependencias: las rutas pueden importar pantallas de features; una feature puede importar UI compartida; la UI compartida no debe importar features ni rutas.

### Alias de imports

`jsconfig.json` configura `@/` como alias de `src/`. Úsalo en imports de aplicación, por ejemplo `@/features/auth/screens/LoginScreen` o `@/components/ui/Title`.

Para una explicación de la arquitectura, el flujo de ejecución y la configuración, consulta [README.md](README.md).
