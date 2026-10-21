# CityPulse: guía de aprendizaje full stack (Node + Prisma + Socket.io + Next.js)

Oct 15, 2026 · @Jazmin

## Cómo usar esta guía

CityPulse es tu curso: 8 módulos, unas 12 semanas a 8–10 h semanales, y cada ejercicio añade una pieza real al proyecto. No hay ejercicios sueltos; al terminar el módulo 8 tienes un portfolio desplegado.

**El método, para cada ejercicio**

1. Lee la clase del módulo (concepto + ejemplo corto).
2. Intenta la consigna 20–30 minutos sin mirar nada más. Atascarse forma parte del aprendizaje.
3. Consulta la documentación o el vídeo recomendado y vuelve a intentarlo.
4. Comprueba el criterio de "terminado" y haz un commit con mensaje claro (`feat(api): ...`).
5. Escribe 3 líneas en `LEARNING-LOG.md`: qué aprendiste, qué te costó, qué te preguntarían en una entrevista.

Si llevas más de una hora bloqueada, pásame tu código y el error: te doy pistas, no la solución.

**Estructura de repo recomendada**

```
citypulse/
  api/    # Node + Express + TypeScript + Prisma
  web/    # Next.js + TypeScript
  README.md
  LEARNING-LOG.md
```

Son dos proyectos independientes, cada uno con su `package.json`. Es más simple que un monorepo y es lo habitual en equipos pequeños.

**Plan semanal**

| Semana | Módulo | Lo que ves funcionando al final |
| --- | --- | --- |
| 1–2 | 1. Fundamentos de Node | API en capas con `/health`, errores centralizados y config validada |
| 3–4 | 2. PostgreSQL + Prisma | Schema migrado y endpoints que leen y escriben mediciones |
| 5 | 3. APIs externas + ETL | Un job que trae datos reales de Valencia cada pocos minutos |
| 6 | 4. Socket.io | Cliente de prueba que recibe mediciones nuevas sin recargar |
| 7–8 | 5. Next.js | Dashboard con App Router, Server y Client Components |
| 9–10 | 6. Recharts + Leaflet | Gráficos y mapa con datos reales actualizándose en vivo |
| 11 | 7. JWT | Zona protegida (alertas o favoritos por usuario) |
| 12 | 8. Testing, deploy, docs | CityPulse online y README de portfolio |

**Hilo conductor de los datos.** Empiezas con una sola fuente (estado del tráfico, que cambia con frecuencia) y en cada módulo sumas otra: calidad del aire, ruido, clima, bicis, EMT, turismo y empleo. Así cada concepto nuevo se aplica a un caso que ya conoces.

**Dónde están los datos de Valencia**

- [Portal Opendatasoft del Ayuntamiento](https://valencia.opendatasoft.com): datasets como estaciones, barrios o velocidad de calles, con API de consulta.
- [Portal CKAN opendata.vlci.valencia.es](https://opendata.vlci.valencia.es): ficheros CSV y el feed GTFS de la EMT.
- [Geoportal de datos abiertos](https://geoportal.valencia.es/apps/GeoportalHome/es/inicio/geodatos-abiertos): capas geoespaciales, incluido el estado del tráfico.
- [Casos de uso de Gobierno Abierto](https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/reutilizacion/reutilizacion-datos-abiertos/casos-de-uso): proyectos que ya reutilizan estos datos, útiles como inspiración.

Los identificadores de dataset y los endpoints concretos pueden cambiar. Por eso el ejercicio 3.1 te enseña a descubrirlos tú, en lugar de dártelos. Ten en cuenta también que los datos diarios de calidad del aire que publica el portal llegan hasta 2022; para el tiempo real tendrás que localizar otra fuente o dataset actualizado.

**Tu argumento de portfolio.** Una recopilación académica de movilidad de València señala que los portales oficiales solo exponen el estado en vivo y no conservan histórico. CityPulse guarda ese histórico en PostgreSQL, y esa decisión de diseño es una buena historia para una entrevista.

**Recursos transversales**

- [Node.js Learn](https://nodejs.org/en/learn): guías oficiales de fundamentos.
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Prisma Docs](https://www.prisma.io/docs)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [Next.js Learn](https://nextjs.org/learn): curso oficial interactivo.
- [roadmap.sh/nodejs](https://roadmap.sh/nodejs): mapa para ver qué te falta del ecosistema Node.

Para vídeos, te indico título y canal en cada módulo: búscalos por título en YouTube, porque así te sale siempre la versión más reciente.

## Módulo 1: Fundamentos de Node (semanas 1–2)

Al terminar tendrás una API Express + TypeScript con arquitectura en capas, configuración validada, middlewares propios y errores centralizados, todavía sin base de datos. Esa base es la que luego sostiene Prisma, el ETL y Socket.io.

### Clase 1: el event loop

Node ejecuta tu JavaScript en un solo hilo. Cuando haces algo lento de entrada/salida (red, disco, base de datos), lo delega al sistema operativo y sigue atendiendo otras cosas. Al terminar, su callback entra en una cola, y el event loop es el bucle que saca tareas de esas colas y las ejecuta.

Tres colas que debes distinguir:

- **Call stack:** el código síncrono que se está ejecutando ahora.
- **Microtasks:** callbacks de promesas (`.then`, lo que viene tras un `await`). Se vacían por completo antes de pasar a lo siguiente. En CommonJS, `process.nextTick` va incluso antes.
- **Macrotasks:** `setTimeout`, `setInterval`, `setImmediate` y callbacks de I/O.

Predice la salida de este ejemplo antes de ejecutarlo:

```ts
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('E');
```

La salida es A, E, C, B: primero lo síncrono, después las microtasks y al final las macrotasks, aunque el timeout sea 0.

La consecuencia práctica es que **un cálculo largo y síncrono bloquea a todos los usuarios**. Un `for` de 3 segundos congela la API entera. Tu ETL transformará miles de filas; si lo haces de golpe y de forma síncrona, la API dejará de responder mientras tanto.

### Clase 2: async/await avanzado

`async` hace que una función devuelva siempre una promesa. `await` pausa **esa función**, no el hilo: el event loop sigue atendiendo otras tareas.

La diferencia entre secuencial y paralelo se nota en el tiempo total:

```ts
// Secuencial: tarda a + b
const a = await getA();
const b = await getB();

// Paralelo: tarda max(a, b)
const [a2, b2] = await Promise.all([getA(), getB()]);
```

Los combinadores de promesas se eligen según qué quieres que pase si una falla:

| Combinador | Qué hace | Cuándo usarlo |
| --- | --- | --- |
| `Promise.all` | Falla en cuanto falla una | Todas son imprescindibles |
| `Promise.allSettled` | Espera a todas y devuelve estado de cada una | ETL con varias fuentes: una API caída no tumba las demás |
| `Promise.race` | Gana la primera en terminar (o fallar) | Timeouts manuales |
| `Promise.any` | Gana la primera que tenga éxito | Varias fuentes equivalentes |

`allSettled` devuelve objetos con la forma `{ status: 'fulfilled', value }` o `{ status: 'rejected', reason }`.

Otros tres conceptos que usarás en el ETL:

- **Timeout y cancelación:** `fetch(url, { signal: AbortSignal.timeout(5000) })` aborta la petición si tarda más de 5 s.
- **Reintentos con backoff exponencial:** reintentas esperando 1 s, 2 s, 4 s... para no saturar a una API que ya está mal.
- **Trampa clásica:** `await` dentro de `array.forEach` no espera nada. Usa `for...of` (secuencial) o `Promise.all(array.map(...))` (paralelo).

### Clase 3: middlewares

Un middleware es una función `(req, res, next)`. Express las ejecuta **en el orden en que las registras**, y cada una puede responder, modificar `req`/`res` o llamar a `next()` para pasar el testigo. Si no hace ninguna de las dos cosas, la petición se queda colgada.

```ts
import { Request, Response, NextFunction } from 'express';

export function miMiddleware(req: Request, res: Response, next: NextFunction) {
  // trabajo aquí...
  next();
}
```

Patrón útil: la **factoría de middleware**, una función que recibe configuración y devuelve el middleware (usa una closure). Así harás `validate(miSchema)` en el ejercicio 1.4.

Orden típico: parsers del body, id de petición, logger, rutas, 404 y, el último, el manejador de errores.

### Clase 4: errores centralizados

Express reconoce un middleware de errores por tener **cuatro parámetros**. Debe registrarse después de todas las rutas:

```ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // un único sitio donde decides status y formato de respuesta
});
```

Ideas clave:

- **Errores operacionales** (recurso no encontrado, validación, API externa caída) son esperables y se responden con un 4xx/5xx concreto. **Errores de programador** (un `undefined` inesperado) son bugs: responden 500 genérico y se loguean con todo detalle.
- Una clase `AppError` con `statusCode` y `code` permite lanzar `throw new NotFoundError(...)` desde cualquier capa sin saber nada de HTTP.
- En Express 5 (la versión por defecto actual, confírmalo en su documentación) las promesas rechazadas en handlers async llegan solas a `next(err)`. En Express 4 necesitas un wrapper `asyncHandler`.
- Nunca devuelvas el stack trace en producción.

### Clase 5: variables de entorno

`process.env` solo contiene strings o `undefined`. Un `PORT` mal escrito en producción no debe descubrirse a las 3 a.m., así que **validas todo al arrancar y fallas rápido** (fail fast). Para eso se usa [zod](https://zod.dev), que además te da el tipo de TypeScript.

- `.env` no se sube a git; `.env.example` sí, con valores de ejemplo.
- Desde Node 20.6 puedes cargar el fichero con `node --env-file=.env`, sin librerías.
- Principio 12-factor: la configuración vive en el entorno, no en el código.

### Clase 6: arquitectura en capas

Cada capa tiene una única responsabilidad y solo conoce a la de abajo:

1. **Routes:** asocian URL y método con un controller.
2. **Controller:** capa HTTP. Lee `req`, llama al service, escribe `res`.
3. **Service:** lógica de negocio. No sabe qué es Express.
4. **Repository:** acceso a datos. Hoy será memoria; en el módulo 2 será Prisma.

La regla comprobable es que **nada de `services/` importa de `express`**. Si la cumples, puedes testear la lógica sin levantar un servidor y cambiar la base de datos sin tocar el negocio.

### Ejercicios

#### Ejercicio 1.1: bootstrap y configuración tipada

- **Objetivo:** un servidor Express + TypeScript que arranca con configuración validada.
- **Conceptos nuevos:** `tsconfig` estricto, `.env` + zod, fail fast, separar `app` de `server`.
- **Consigna:**
  - Crea la carpeta `api/`, inicializa npm e instala `express`, `zod`, `typescript`, `tsx`, `@types/node` y `@types/express`.
  - Configura `tsconfig.json` con `strict: true`, salida en `dist/` y módulos/target modernos.
  - Crea `src/config/env.ts`: lee `PORT`, `NODE_ENV`, `VALENCIA_API_BASE_URL` y `FETCH_INTERVAL_MINUTES`, valídalos con zod y exporta un objeto `env` tipado. Si falla algo, el proceso termina con un mensaje que diga qué variable es la culpable.
  - Crea `src/app.ts` (construye y exporta la app, sin `listen`) y `src/server.ts` (importa la app y escucha). `GET /health` devuelve `{ status, uptime, timestamp }`.
  - Scripts `dev` (con `tsx watch`), `build` y `start`; añade `.env.example` y `.gitignore`.
- **Terminado cuando:** `npm run dev` levanta el servidor y `curl localhost:PORT/health` da 200. Si borras `PORT` o pones `FETCH_INTERVAL_MINUTES=abc`, el arranque falla con un mensaje claro. `tsc --noEmit` no da errores y `npm run build && npm start` funciona.
- **Para entrevistas:** «¿Cómo gestionas la configuración entre entornos?» es una pregunta habitual, y responder con 12-factor + validación al arrancar suena a experiencia real. Separar `app` de `server` demuestra que piensas en testabilidad.

#### Ejercicio 1.2: laboratorio del event loop

- **Objetivo:** predecir el orden de ejecución y detectar un bloqueo con tus propios ojos.
- **Conceptos nuevos:** colas de microtasks y macrotasks, bloqueo del hilo, ceder el control.
- **Consigna:** en `api/scratch/eventloop/` crea tres scripts.
  - **a)** Un script con `console.log`, `setTimeout(0)`, `setImmediate`, una promesa y un `await` dentro de una función async. **Escribe tu predicción como comentario antes de ejecutarlo** y compárala con la realidad.
  - **b)** Un monitor de lag: un `setInterval` cada 100 ms que imprime cuánto se retrasó respecto a lo esperado. Lanza a la vez un cálculo síncrono de unos 2 s (por ejemplo, ordenar un array enorme) y observa el lag.
  - **c)** Reescribe ese cálculo en lotes, cediendo el control entre lote y lote con `setImmediate`. Compara el lag con el de (b).
  - **d)** En la API, añade `GET /debug/block` (bloquea 3 s) y `GET /debug/fast`. Llama a ambos desde dos terminales. Después elimínalos o restríngelos a `NODE_ENV !== 'production'`.
- **Terminado cuando:** tienes las predicciones escritas, el lag de (b) supera con claridad el segundo, el de (c) se mantiene en unos pocos cientos de ms como mucho, y puedes explicar en tres frases por qué `/debug/fast` se quedó esperando.
- **Para entrevistas:** «Explica el event loop» es de las preguntas más repetidas en entrevistas de JS/Node. Y para frontend es el mismo modelo: un cálculo largo congela la UI de React por la misma razón.

#### Ejercicio 1.3: cliente HTTP resiliente

- **Objetivo:** traer datos externos sin que una API caída tumbe tu aplicación.
- **Conceptos nuevos:** `AbortSignal.timeout`, reintentos con backoff, `Promise.allSettled`, funciones genéricas en TypeScript.
- **Consigna:**
  - En `src/lib/http.ts` escribe `fetchJson<T>(url, opciones)`. Debe tener timeout configurable, lanzar un `ExternalApiError` propio si la respuesta no es 2xx y reintentar N veces con backoff exponencial **solo** ante errores de red o 5xx (nunca ante 4xx).
  - Abre el [portal Opendatasoft de Valencia](https://valencia.opendatasoft.com), localiza el endpoint de registros de tres datasets y llámalos en paralelo con `Promise.allSettled` desde un script. Imprime un resumen: cuántos fueron bien, cuántos fallaron y por qué.
  - Provoca fallos a propósito: una URL inexistente (404), un dominio inválido y un timeout de 50 ms.
  - Extra: limita la concurrencia a 2 peticiones simultáneas sin librerías.
- **Terminado cuando:** con tres URLs buenas obtienes tres `fulfilled`. Con una mala, las otras dos siguen funcionando. Los logs muestran reintentos con esperas crecientes y el 404 no se reintenta.
- **Para entrevistas:** retries, backoff y timeouts demuestran que has integrado sistemas externos de verdad. La diferencia entre `all`, `allSettled`, `race` y `any` es pregunta de manual.

#### Ejercicio 1.4: middlewares propios

- **Objetivo:** escribir tus propios middlewares y entender la cadena de ejecución.
- **Conceptos nuevos:** firma `(req, res, next)`, factorías de middleware con closures, `res.locals`, eventos de `res`, orden de registro.
- **Consigna:**
  - `requestId`: genera un id único por petición con `crypto.randomUUID()`, lo guarda en `res.locals` y lo devuelve en la cabecera `X-Request-Id`.
  - `requestLogger`: registra método, ruta, status, duración e id **cuando la respuesta termina**. Pista: el evento que necesitas es de `res`, no de `req`.
  - `validate(schema)`: factoría que recibe un esquema zod, valida `req.query` y responde 400 con el detalle si falla. Aplícala a un endpoint de prueba `GET /api/echo?limit=...`.
  - Registra todo en el orden correcto y justifica ese orden por escrito en `LEARNING-LOG.md`.
- **Terminado cuando:** cada respuesta lleva `X-Request-Id`, los logs muestran duración y el mismo id. `/api/echo?limit=abc` devuelve 400 con un mensaje legible, y `/api/echo?limit=5` devuelve 200 con `limit` como número, no como string.
- **Para entrevistas:** «¿Qué es un middleware y cómo se encadenan?» aparece en casi toda entrevista de Express, y las factorías con closures son un patrón que sirve también en React (HOCs, hooks personalizados).

#### Ejercicio 1.5: errores centralizados

- **Objetivo:** un único lugar donde se decide cómo falla tu API.
- **Conceptos nuevos:** jerarquía de errores propios, middleware de 4 parámetros, errores operacionales frente a bugs, `unhandledRejection`.
- **Consigna:**
  - Crea `AppError extends Error` con `statusCode`, `code` e `isOperational`, y las subclases `NotFoundError`, `ValidationError` y `ExternalApiError` (reutiliza la del 1.3).
  - Añade el middleware `notFound` y el `errorHandler` (4 parámetros) al final de la cadena. La respuesta tiene un formato uniforme, por ejemplo `{ error: { code, message, requestId } }`. En desarrollo incluye el stack; en producción no.
  - Los errores no operacionales responden 500 con mensaje genérico y se loguean completos.
  - Comprueba que un handler `async` que lanza llega al `errorHandler`. Si usas Express 4, escribe tú el `asyncHandler`.
  - Escucha `unhandledRejection` y `uncaughtException`: registra el error y cierra el proceso de forma ordenada.
  - Haz que `validate` del 1.4 lance `ValidationError` en vez de responder él mismo.
- **Terminado cuando:** una ruta inexistente devuelve un 404 JSON con el formato uniforme. Una ruta temporal `/debug/error` que lanza un `Error` genérico responde 500 **sin stack** con `NODE_ENV=production`. Una promesa rechazada dentro de un handler no deja la petición colgada.
- **Para entrevistas:** «¿Cómo manejas errores en una API?» es casi seguro. Distinguir errores operacionales de bugs y tener un formato de error consistente es lo que diferencia una respuesta junior de una sólida.

#### Ejercicio 1.6: arquitectura en capas

- **Objetivo:** reorganizar la API en capas para que el cambio a Prisma del módulo 2 afecte solo a una.
- **Conceptos nuevos:** separación de responsabilidades, interfaces de repositorio, inyección de dependencias manual.
- **Consigna:**
  - Estructura: `src/routes`, `controllers`, `services`, `repositories`, `middlewares`, `lib`, `config` y `types`.
  - Define el tipo `TrafficReading` (id, nombre de calle, estado, coordenadas, momento de medición).
  - Implementa `GET /api/traffic?limit=10&status=...` pasando por route, controller, service y repository.
  - Define la interfaz `TrafficRepository`. Su implementación actual es en memoria, y carga un JSON de ejemplo que descargas una vez de la API real y guardas en `api/data/sample-traffic.json`.
  - El service recibe el repositorio como parámetro (constructor o función), no lo importa directamente.
  - Comprueba la regla de oro con `grep -r "express" src/services`: no debe devolver nada.
- **Terminado cuando:** el endpoint devuelve JSON paginado y filtrado, sin `any`. Puedes sustituir el repositorio por uno falso de 2 elementos y el service y el controller siguen funcionando sin tocarse.
- **Para entrevistas:** capas, separación de responsabilidades e inyección de dependencias son las palabras que buscan al hablar de «cómo estructuras un backend». Además, esta separación es la que hace posible el testing del módulo 8.

### Autoevaluación del módulo

Responde en voz alta, sin mirar, antes de pasar al módulo 2:

1. ¿En qué orden se ejecutan una promesa resuelta, un `setTimeout(0)` y el código síncrono siguiente?
2. ¿Por qué un `for` de 3 s en un handler afecta a otros usuarios?
3. ¿Cuándo usarías `allSettled` en lugar de `all`?
4. ¿Por qué el middleware de errores debe ir el último?
5. ¿Qué ganas con que `services/` no importe Express?

### Recursos del módulo

- Vídeo: «What the heck is the event loop anyway?», Philip Roberts (JSConf EU 2014). Es la explicación visual de referencia.
- Vídeo: «In The Loop», Jake Archibald (JSConf.Asia 2018). Aplica el mismo modelo al navegador y a las microtasks, muy útil para ti como frontend.
- Lectura: [The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick), guía oficial.
- Lectura: [Express: manejo de errores](https://expressjs.com/en/guide/error-handling.html).
- Lectura: [Documentación de zod](https://zod.dev).

## Módulo 2: PostgreSQL + Prisma (semanas 3–4)

Al terminar, tu API guarda y consulta mediciones reales en PostgreSQL a través de Prisma, con un schema versionado por migraciones y consultas pensadas para series temporales. Como ya trabajas con PostgreSQL, te centras en lo nuevo: modelar para un ETL y manejar bien el ORM.

### Clase 1: modelar datos para un dashboard

CityPulse tiene muchas fuentes (tráfico, aire, ruido...) con formas distintas. Antes de escribir el schema hay que decidir qué es una **entidad** (cosa que existe: un sensor, un barrio) y qué es una **medición** (un valor en un instante). Las entidades cambian poco; las mediciones crecen sin parar.

Conceptos que vas a usar:

- **Clave primaria y foránea:** una medición apunta a su sensor con una clave foránea.
- **Relación 1-N:** un sensor tiene muchas mediciones; un barrio tiene muchos sensores.
- **Restricción única:** `(sensor, métrica, instante)` no puede repetirse. Es lo que protege tu ETL de insertar duplicados al reejecutarse.
- **Índice:** estructura que acelera una búsqueda a cambio de espacio y de escrituras algo más lentas. En un índice compuesto importa el orden de las columnas: sirve para filtrar por la primera, o por la primera y la segunda, pero no solo por la segunda.

Tu consulta más frecuente será «últimas mediciones de este sensor entre estas dos fechas». Los índices se diseñan para esa consulta, no al revés.

### Clase 2: el schema de Prisma

Prisma describe tu base de datos en un fichero `schema.prisma`, y de él genera migraciones SQL y un cliente con tipos. Así tu código TypeScript conoce los campos de cada tabla.

Ejemplo genérico (no es tu schema) de una relación 1-N con índice:

```prisma
model Author {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   Author @relation(fields: [authorId], references: [id])
  authorId Int

  @@index([authorId])
}
```

Léelo así: `Post` guarda la clave foránea real (`authorId`); la línea `author` es solo una vía de navegación para el cliente, no una columna. Otros elementos que usarás: `enum`, `@unique`, `@@unique([a, b, c])`, `@default(now())` y `@map` / `@@map` para que las tablas SQL sigan el estilo `snake_case`.

**Versión de Prisma.** La documentación oficial indica ahora Prisma 8 como versión vigente. Desde Prisma 7 el cliente exige un **driver adapter** (para PostgreSQL, `@prisma/adapter-pg` junto con el driver `pg`), la conexión se configura en `prisma.config.ts` y los ficheros `.env` ya no se cargan solos. Sigue la [guía de inicio oficial](https://www.prisma.io/docs/getting-started) para el arranque, porque estos detalles cambian entre versiones.

### Clase 3: migraciones

Una migración es un fichero SQL versionado que lleva la base de datos de un estado al siguiente. Se guardan en git junto al código, así cualquier máquina reconstruye el mismo schema.

- `prisma migrate dev`: en desarrollo. Compara tu schema con la base de datos, genera la migración y la aplica.
- `prisma migrate deploy`: en producción. Solo aplica migraciones ya existentes, sin generar nada.
- **Regla de oro:** nunca edites una migración ya aplicada; crea una nueva.

### Clase 4: consultas con Prisma Client

```ts
const authors = await prisma.author.findMany({
  where: { name: { startsWith: 'A' } },
  include: { posts: { take: 3, orderBy: { id: 'desc' } } },
});
```

Puntos a dominar:

- **`select` frente a `include`:** `select` elige columnas concretas (menos datos por el cable); `include` añade relaciones completas.
- **Paginación:** `skip`/`take` (offset) es simple pero se degrada con tablas grandes; la paginación por cursor es más estable para series temporales.
- **El problema N+1:** pedir una lista y luego lanzar una consulta por cada elemento para traer su relación. Se evita con `include` o con una sola consulta con `where: { id: { in: [...] } }`.
- **Transacciones:** `prisma.$transaction([...])` agrupa operaciones para que se apliquen todas o ninguna.
- **Idempotencia:** una operación idempotente puede ejecutarse dos veces sin cambiar el resultado. `upsert` y `createMany({ skipDuplicates: true })` sirven para eso. Tu ETL lo necesitará, porque un job puede reintentarse o solaparse.
- **Cuándo salir del ORM:** para agrupar por hora (`date_trunc`) o hacer consultas analíticas, `prisma.$queryRaw` es perfectamente válido. Un ORM no sustituye saber SQL.

### Ejercicios

#### Ejercicio 2.1: PostgreSQL local con Docker

- **Objetivo:** tener una base de datos reproducible que cualquiera pueda levantar con un comando.
- **Conceptos nuevos:** contenedores como entorno de desarrollo, volúmenes, `docker compose`.
- **Consigna:**
  - En la raíz del repo crea un `docker-compose.yml` con un servicio PostgreSQL (imagen oficial, puerto 5432, volumen con nombre para que los datos sobrevivan, usuario, contraseña y base de datos definidos por variables).
  - Conéctate con `psql` o con tu cliente favorito y crea a mano una tabla de prueba con una clave foránea; inserta, haz un `JOIN` y bórrala.
  - Añade `DATABASE_URL` a tu `.env`, a `.env.example` y al esquema zod del ejercicio 1.1.
- **Terminado cuando:** `docker compose up -d` levanta la base, sobrevive a `docker compose down` + `up` conservando los datos, y tu API falla al arrancar con un mensaje claro si `DATABASE_URL` no existe.
- **Para entrevistas:** saber levantar dependencias con Docker Compose es esperado hoy en cualquier puesto full stack, aunque no se pregunte directamente.

#### Ejercicio 2.2: diseña el modelo de datos

- **Objetivo:** pensar el modelo antes de teclear el schema.
- **Conceptos nuevos:** entidad frente a medición, 1-N, restricciones únicas, índices guiados por consultas.
- **Consigna:**
  - En papel (o en un diagrama), dibuja las entidades mínimas: `District` (barrio), `Sensor` (con tipo: tráfico, aire, ruido, clima, bicis, EMT) y `Reading` (medición). Decide qué campos lleva cada una y qué relaciones hay.
  - Responde por escrito: ¿qué identifica de forma única una medición? ¿Qué consulta será la más frecuente? ¿Qué índice la sirve? ¿`Float` o `Decimal` para un valor de ruido, y por qué?
  - Pensando en el ETL, añade una tabla `IngestionRun` (fuente, inicio, fin, filas leídas, filas guardadas, estado) para saber qué pasó en cada ejecución.
- **Terminado cuando:** tienes un diagrama con relaciones y cardinalidades, y respuestas escritas a las cuatro preguntas. Puedes defender cada decisión sin mirar tus notas.
- **Para entrevistas:** el diseño de un modelo de datos a partir de un requisito es un ejercicio clásico de pizarra, y «¿cómo guardarías datos de sensores?» es una versión muy habitual.

#### Ejercicio 2.3: schema, primera migración y cliente

- **Objetivo:** pasar de tu diagrama a tablas reales y a consultas con tipos.
- **Conceptos nuevos:** `schema.prisma`, `migrate dev`, driver adapter, singleton del cliente, Prisma Studio.
- **Consigna:**
  - Sigue la guía de inicio oficial para instalar Prisma y su adapter de PostgreSQL y configurar `prisma.config.ts`.
  - Traduce tu diagrama a `schema.prisma`: enums para los tipos, `@@unique` para la identidad de la medición, `@@index` para tu consulta frecuente y `@map`/`@@map` para nombres `snake_case` en SQL.
  - Genera la primera migración con un nombre descriptivo y revisa el SQL que se creó.
  - Crea `src/lib/prisma.ts` que exporte **una sola instancia** del cliente. Explica en `LEARNING-LOG.md` por qué no conviene crear un cliente nuevo por petición.
  - Abre Prisma Studio y comprueba que ves las tablas.
- **Terminado cuando:** `migrate dev` aplica la migración sin errores, existe la carpeta de migraciones en git, ves las tablas en Studio y un script mínimo logra insertar y leer un `District`.
- **Para entrevistas:** «¿Qué es una migración y por qué se versiona?» y «¿qué ventajas y desventajas tiene un ORM?» son preguntas frecuentes. Tener una opinión argumentada pesa más que una definición.

#### Ejercicio 2.4: seed y consultas básicas

- **Objetivo:** llenar la base con datos reales y consultarla de varias formas.
- **Conceptos nuevos:** seed, `findMany`, `where`/`orderBy`, `select` frente a `include`, paginación por cursor.
- **Consigna:**
  - Escribe `prisma/seed.ts`: con los JSON de ejemplo que ya descargaste, crea barrios, sensores y un puñado de mediciones. Debe poder ejecutarse varias veces sin romperse.
  - Crea una función que devuelva las últimas N mediciones de un sensor usando `select` para traer solo lo necesario.
  - Crea otra que devuelva sensores con sus 3 últimas mediciones usando `include`.
  - Implementa la paginación por cursor sobre las mediciones (el cursor es el id o el instante de la última recibida).
- **Terminado cuando:** el seed se ejecuta dos veces seguidas sin errores ni duplicados, y el log de queries de Prisma (actívalo) muestra el SQL real de cada función. Puedes explicar por qué `select` genera una consulta más ligera.
- **Para entrevistas:** «offset frente a cursor» y «cuándo usar `select`» demuestran que miras el SQL que hay debajo y no solo el código TypeScript.

#### Ejercicio 2.5: idempotencia y transacciones

- **Objetivo:** guardar lotes de mediciones de forma segura, aunque el mismo lote llegue dos veces.
- **Conceptos nuevos:** `createMany` con `skipDuplicates`, `upsert`, `$transaction`, idempotencia.
- **Consigna:**
  - Escribe `readingsService.saveBatch(readings)` que recibe un lote y lo guarda en la base.
  - Primero inserta los sensores que falten (`upsert`) y luego las mediciones, todo dentro de una transacción.
  - Llama a la función dos veces con el mismo lote y comprueba que la segunda no duplica nada.
  - Provoca un fallo a mitad (por ejemplo, una medición con un sensor inexistente) y verifica que la transacción deshace todo.
  - Traduce los errores de Prisma (`P2002` por duplicado, `P2025` por registro no encontrado) a tus `AppError` del módulo 1.
- **Terminado cuando:** guardar el mismo lote dos veces deja el mismo número de filas, y un lote con una fila inválida no guarda ninguna.
- **Para entrevistas:** idempotencia y transacciones son conceptos centrales de cualquier pipeline de datos, y salen en conversaciones sobre fiabilidad y reintentos.

#### Ejercicio 2.6: consultas analíticas e índices

- **Objetivo:** responder preguntas como «¿cuál fue el nivel medio de ruido por hora?» y entender qué hace un índice.
- **Conceptos nuevos:** `groupBy`, agregaciones, `$queryRaw`, `EXPLAIN ANALYZE`.
- **Consigna:**
  - Haz un script que genere unas 200 000 mediciones sintéticas de varios sensores (solo para este ejercicio) usando lotes.
  - Obtén la media, el máximo y el mínimo por sensor con `groupBy`.
  - Obtén la media por hora de un sensor entre dos fechas con `$queryRaw` y `date_trunc`. Usa parámetros, nunca concatenes strings en el SQL.
  - Ejecuta `EXPLAIN ANALYZE` de tu consulta «últimas mediciones de un sensor» con y sin el índice compuesto, y anota la diferencia de tiempo.
- **Terminado cuando:** tienes los tres resultados, una nota con los tiempos antes y después del índice y una explicación escrita de por qué en `$queryRaw` hay que usar parámetros (inyección SQL).
- **Para entrevistas:** leer un `EXPLAIN` y justificar un índice con números te distingue de quien solo dice «añadí un índice». Las consultas agregadas por tiempo son además el corazón de un dashboard.

#### Ejercicio 2.7: Prisma sustituye al repositorio en memoria

- **Objetivo:** comprobar que la arquitectura en capas del módulo 1 valió la pena.
- **Consigna:**
  - Crea `PrismaReadingRepository` que implemente tu interfaz de repositorio.
  - Cámbialo en el punto donde construyes el service, sin tocar controllers ni services.
  - Añade `GET /api/sensors/:id/readings?from=&to=&limit=` con validación zod, y `GET /api/sensors` con su tipo y barrio.
  - Un sensor inexistente debe responder 404 con tu formato uniforme de errores.
- **Terminado cuando:** los endpoints funcionan con datos de la base, y el diff del cambio de repositorio solo toca el repositorio y el punto de composición.
- **Para entrevistas:** puedes contar un caso real en el que una buena separación de capas te permitió cambiar una pieza sin romper el resto, que es mucho más convincente que la teoría.

### Autoevaluación del módulo

1. ¿Por qué tu restricción única incluye el instante de la medición y no solo el sensor?
2. ¿En qué consulta el orden de columnas de un índice compuesto marca la diferencia?
3. ¿Qué diferencia hay entre `migrate dev` y `migrate deploy`?
4. ¿Qué es un problema N+1 y cómo lo reconoces en el log de queries?
5. ¿Cuándo usarías `$queryRaw` en lugar de la API de Prisma?

### Recursos del módulo

- [Documentación de Prisma](https://www.prisma.io/docs): empieza por la guía de inicio y revisa luego las secciones de relaciones, migraciones y consultas.
- [Use The Index, Luke](https://use-the-index-luke.com): libro gratuito y muy claro sobre cómo funcionan los índices.
- [Tutorial oficial de PostgreSQL](https://www.postgresql.org/docs/current/tutorial.html)
- Vídeo: «Prisma in 100 Seconds», Fireship. Sirve para el concepto general; la sintaxis de configuración de aquel vídeo puede estar desfasada, así que usa la documentación para el arranque.
- Vídeos: busca la lista de tutoriales del canal oficial de Prisma en YouTube y filtra por los más recientes.

## Módulo 3: APIs externas reales y ETL con node-cron (semana 5)

Al terminar, tu backend trae datos reales del Ayuntamiento de Valencia cada pocos minutos, los valida, los transforma a tu modelo y los guarda, registrando qué pasó en cada ejecución. Es el corazón del proyecto y la parte que más se parece a tu trabajo actual con IoT, así que aquí puedes lucirte.

### Clase 1: qué es un ETL y cómo se diseña bien

**ETL** son tres fases: *Extract* (traer datos de la fuente), *Transform* (limpiarlos y convertirlos a tu formato) y *Load* (guardarlos). Mantenerlas separadas en tu código es lo que hace que el pipeline sea testeable y fácil de ampliar.

Principios que aplicarás:

- **No confíes en datos externos.** Una API pública puede cambiar un campo, devolver `null` o dejar de responder. Validas cada registro al entrar con zod y descartas (contando) los que no sirvan, sin tumbar el lote.
- **Funciones puras en la transformación.** `transform(raw) => Reading` no toca la red ni la base de datos. Así se prueba con un ejemplo y un `expect`.
- **Idempotencia.** Ejecutar dos veces el mismo ciclo no duplica datos; ya lo resolviste en el ejercicio 2.5.
- **Normaliza al guardar.** Guarda instantes en UTC y unidades homogéneas (por ejemplo, decibelios y µg/m³). Convertir a la hora de Madrid es trabajo del frontend.
- **Registra cada ejecución.** La tabla `IngestionRun` del módulo 2 te dice cuándo falló qué fuente y por qué.

### Clase 2: consumir la API de datos abiertos

El portal del Ayuntamiento usa Opendatasoft, que ofrece la [API Explore v2](https://help.opendatasoft.com/apis/ods-explore-v2/). En términos generales, cada dataset tiene un endpoint de registros al que se le pasa un límite, un desplazamiento, un orden y un filtro. Hay un tope de registros por petición, así que si un dataset es grande tendrás que paginar.

La forma exacta de la URL y de los parámetros de cada dataset la ves en la pestaña **API** de su página en el portal. No la des por buena sin probarla con `curl` o desde el navegador.

Un detalle sobre estado vivo: según una recopilación académica de movilidad de València, los portales oficiales exponen sobre todo el estado actual y no conservan histórico. Por eso tu ETL no es un adorno: **estás construyendo el histórico que el portal no da**.

### Clase 3: programar tareas con node-cron

[node-cron](https://www.npmjs.com/package/node-cron) ejecuta una función según una expresión cron de cinco campos (minuto, hora, día del mes, mes, día de la semana). Por ejemplo, `*/5 * * * *` significa «cada 5 minutos». La web [crontab.guru](https://crontab.guru) te traduce cualquier expresión.

Problemas reales que debes resolver tú:

- **Solapamiento:** si una ejecución tarda más que el intervalo, la siguiente empieza con la anterior aún en marcha. Necesitas una guarda por fuente.
- **Zona horaria:** configúrala explícitamente (`Europe/Madrid`), para que un despliegue en un servidor en otra zona no cambie el comportamiento.
- **Cierre ordenado:** al recibir `SIGTERM` (lo que hace una plataforma al reiniciarte) debes parar las tareas y esperar a las que estén en curso.
- **Alternativas en producción:** colas como BullMQ (con Redis) dan reintentos, concurrencia y persistencia. Conocer su existencia, y cuándo hacen falta, suma en una entrevista.

### Clase 4: el patrón adaptador para varias fuentes

Cada fuente (tráfico, aire, ruido...) cambia en cuatro cosas: la URL, la forma del dato crudo, cómo se transforma y cada cuánto se consulta. Todo lo demás (reintentos, validación, guardado, registro de ejecuciones) es común. Modelarlo con una interfaz por fuente evita copiar y pegar:

```ts
interface SourceAdapter<TRaw> {
  name: string;
  schedule: string;
  extract(): Promise<unknown[]>;
  rawSchema: z.ZodType<TRaw>;
  transform(raw: TRaw): NewReading;
}
```

Es un esqueleto para fijar la idea; los tipos exactos los decides tú en el ejercicio 3.6.

### Ejercicios

#### Ejercicio 3.1: explora y documenta las fuentes

- **Objetivo:** saber con certeza qué datos hay, con qué forma y con qué frecuencia se actualizan.
- **Conceptos nuevos:** leer documentación de una API real, descubrir datasets, distinguir datos en vivo de históricos.
- **Consigna:**
  - Crea `docs/DATA_SOURCES.md`.
  - Para **tráfico**, **calidad del aire** y **ruido**, localiza el dataset en el portal de Valencia y anota: nombre, identificador, URL de la API que probaste, frecuencia de actualización, campos principales con su tipo, y cualquier rareza (campos vacíos, formatos de fecha, coordenadas).
  - Haz al menos una petición real a cada una con `curl` y guarda un ejemplo de respuesta en `api/data/samples/`.
  - Haz una lista de fuentes pendientes por localizar: clima, bicis, EMT (viajeros por línea), turismo y empleo. Para cada una anota si existe en tiempo real o solo en periodos mensuales o anuales.
  - Si una fuente solo tiene datos diarios o mensuales, decide cómo la mostrarás en el dashboard (por ejemplo, como KPI y no como gráfico en vivo).
- **Terminado cuando:** tres fuentes están documentadas y probadas con una petición real, con un ejemplo de respuesta guardado, y las demás tienen una nota honesta sobre su disponibilidad.
- **Para entrevistas:** saber evaluar una API ajena (límites, frescura, calidad, licencia) antes de construir sobre ella es una señal de criterio de ingeniería. Contarlo con un ejemplo real es mucho mejor que decirlo en abstracto.

#### Ejercicio 3.2: extracción y validación con zod

- **Objetivo:** que un registro defectuoso no rompa el pipeline.
- **Conceptos nuevos:** esquemas zod para datos externos, `safeParse`, separar válidos de inválidos, paginación.
- **Consigna:**
  - Para la fuente de tráfico, escribe un esquema zod del registro crudo (solo los campos que usas). Ten en cuenta que pueden venir nulos.
  - Escribe `extractTraffic()` que use tu `fetchJson` del 1.3, pagine si hace falta y devuelva todos los registros crudos.
  - Escribe una función que reciba esos registros y devuelva `{ valid, invalid }` usando `safeParse`, con un contador y una muestra de los errores.
  - Mete a propósito un registro roto en un fixture y comprueba que se cuenta como inválido sin detener el proceso.
- **Terminado cuando:** un lote con un registro roto devuelve el resto como válidos y el log dice cuántos se descartaron y por qué.
- **Para entrevistas:** «¿Cómo validas datos de una API externa?» enlaza con TypeScript: los tipos desaparecen en tiempo de ejecución, y zod es la forma de unir tipos estáticos y validación real.

#### Ejercicio 3.3: transformación como funciones puras

- **Objetivo:** convertir el dato crudo a tu modelo de dominio sin efectos secundarios.
- **Conceptos nuevos:** funciones puras, normalización de unidades y fechas, mapeo de estados a una escala propia.
- **Consigna:**
  - Escribe `transformTraffic(raw) => NewReading`. Convierte la fecha a UTC, extrae las coordenadas y mapea el estado de tráfico del portal a una escala numérica tuya (por ejemplo, de fluido a cortado) más una etiqueta.
  - La función no importa nada de red, base de datos ni logger.
  - Escribe un script de comprobación con 3 o 4 fixtures reales guardados del ejercicio 3.1: uno normal, uno con campo nulo y uno con un estado desconocido. Decide qué hace tu transformación en cada caso (descartar, valor por defecto, error) y justifícalo en un comentario.
- **Terminado cuando:** las funciones se ejecutan con los fixtures sin red ni base de datos y producen la salida esperada. Los tres casos tienen un comportamiento decidido y documentado.
- **Para entrevistas:** las funciones puras son la base de «código testeable», y es un buen momento para conectar con programación funcional en React (componentes y reducers puros).

#### Ejercicio 3.4: carga y registro de ejecuciones

- **Objetivo:** cerrar el pipeline E-T-L de punta a punta, ejecutado a mano.
- **Conceptos nuevos:** orquestación, scripts de CLI, registro de ejecuciones.
- **Consigna:**
  - Escribe `runIngestion(adapter)` que haga extract, validate, transform y load (usando `saveBatch` del ejercicio 2.5) y devuelva un resumen.
  - Crea una fila en `IngestionRun` al empezar y actualízala al terminar con: filas leídas, válidas, inválidas, guardadas, duración y estado (éxito, parcial, error). Si algo explota, el estado es error y guardas el mensaje.
  - Añade un script `npm run etl:run -- --source=traffic` que ejecute una vez la fuente indicada.
- **Terminado cuando:** ejecutas el script y aparecen mediciones reales en la base y una fila en `IngestionRun`. Si lo ejecutas de nuevo sin que haya datos nuevos, no se duplican filas. Si desconectas internet y lo ejecutas, queda una fila con estado error.
- **Para entrevistas:** puedes explicar un pipeline completo y cómo lo observas, que es justo lo que se espera cuando dices «trabajo con ETLs».

#### Ejercicio 3.5: programación con node-cron

- **Objetivo:** que el ETL se ejecute solo, de forma fiable.
- **Conceptos nuevos:** expresiones cron, solapamiento, zona horaria, cierre ordenado.
- **Consigna:**
  - Crea `src/jobs/scheduler.ts` que programe cada fuente con su propia expresión cron.
  - Protege cada tarea contra solapamiento con una guarda propia. Provócalo: simula un ETL de 10 s con una tarea cada 5 s y comprueba que la segunda ejecución se salta y deja un log.
  - Configura la zona horaria explícitamente y permite activar o desactivar el scheduler con una variable de entorno (útil para tests y para tener varias instancias).
  - Gestiona `SIGTERM` y `SIGINT`: deja de programar nuevas ejecuciones y espera a las que están en curso antes de salir.
- **Terminado cuando:** con el servidor en marcha, aparecen mediciones nuevas en la base sin que hagas nada. La guarda evita ejecuciones solapadas y al pulsar Ctrl+C el proceso espera a la ejecución en curso antes de terminar.
- **Para entrevistas:** «¿cómo programarías tareas periódicas y qué problemas hay?» abre conversación sobre solapamiento, escalado a varias instancias y colas. Sabes decir cuándo node-cron deja de bastar.

#### Ejercicio 3.6: varias fuentes con el patrón adaptador

- **Objetivo:** añadir una fuente nueva solo escribiendo un adaptador.
- **Conceptos nuevos:** interfaces genéricas en TypeScript, patrón estrategia/adaptador, registro de módulos.
- **Consigna:**
  - Define tu interfaz `SourceAdapter` (parte del esqueleto de la clase 4, pero decide tú los tipos).
  - Refactoriza el tráfico como un adaptador y añade dos más: calidad del aire y ruido, según lo que documentaste en el 3.1.
  - El orquestador y el scheduler recorren una lista de adaptadores registrados y no conocen detalles de ninguna fuente.
- **Terminado cuando:** puedes añadir un cuarto adaptador (por ejemplo, clima o bicis) creando un solo fichero y registrándolo en una línea, sin editar el orquestador ni el scheduler.
- **Para entrevistas:** el principio abierto/cerrado (abierto a extensión, cerrado a modificación) y los genéricos de TypeScript aplicados a un caso real son un buen ejemplo para cualquier pregunta de diseño.

#### Ejercicio 3.7: estado de las fuentes

- **Objetivo:** saber, y poder mostrar, si los datos están frescos.
- **Conceptos nuevos:** observabilidad básica, detección de datos obsoletos (staleness).
- **Consigna:**
  - Crea `GET /api/status` que devuelva, por fuente: última ejecución con su estado, hora de la última medición guardada y un indicador `stale` si esa medición supera el doble de la frecuencia esperada.
  - Añade `GET /api/sources` con la lista de fuentes y su frecuencia de actualización.
  - Cuida la consulta: no debe leer toda la tabla para sacar la última medición por fuente.
- **Terminado cuando:** apagas el scheduler 15 minutos y `/api/status` marca como obsoletas las fuentes afectadas; al reactivarlo, vuelven a salir como frescas.
- **Para entrevistas:** mostrar «última actualización hace X minutos» y avisar cuando los datos están viejos es un detalle de producto que valoran mucho, porque demuestra que piensas en el usuario y no solo en la tecnología.

### Autoevaluación del módulo

1. ¿Por qué validar con zod si ya tienes tipos de TypeScript?
2. ¿Qué pasa si una ejecución del ETL tarda más que el intervalo y qué lo evita?
3. ¿Por qué guardar fechas en UTC y no en hora local?
4. ¿Qué ganas al hacer `transform` una función pura?
5. ¿Qué cambiarías si tuvieras que correr dos instancias de la API a la vez?

### Recursos del módulo

- [API Explore v2 de Opendatasoft](https://help.opendatasoft.com/apis/ods-explore-v2/): referencia de parámetros de consulta.
- [Portal de datos abiertos de Valencia](https://valencia.opendatasoft.com) y [portal CKAN](https://opendata.vlci.valencia.es).
- [node-cron](https://www.npmjs.com/package/node-cron) y [crontab.guru](https://crontab.guru).
- Vídeo: busca «ETL explained» (el canal IBM Technology tiene explicaciones cortas) para ver el concepto en dos minutos.
- Lectura opcional: el capítulo sobre procesamiento por lotes y flujos de *Designing Data-Intensive Applications*, de Martin Kleppmann.

## Módulo 4: tiempo real con Socket.io (semana 6)

Al terminar, cada vez que el ETL guarda datos nuevos, los clientes conectados los reciben al instante sin recargar nada, y un hook de React los consume de forma limpia. Primero construyes el servidor, luego el cliente.

### Clase 1: WebSocket, Socket.io y las alternativas

HTTP funciona por petición y respuesta: el cliente pregunta y el servidor contesta. Para un dashboard vivo, preguntar cada pocos segundos (*polling*) funciona pero malgasta recursos y llega tarde. Con **WebSocket** se abre una conexión persistente y bidireccional, y el servidor puede enviar datos cuando quiere.

**Socket.io** es una librería construida *encima* de WebSocket. No es un WebSocket puro: un cliente `ws` normal no puede hablar con un servidor Socket.io. Lo que añade:

- Reconexión automática y vuelta a *long polling* si el WebSocket no es posible.
- **Eventos con nombre** y datos JSON (`socket.emit('reading:new', datos)`).
- **Rooms** (salas) para enviar solo a quien interesa, y **acknowledgements** (confirmaciones de recepción).
- Middleware de conexión, útil para autenticar (lo verás en el módulo 7).

Conviene conocer también **Server-Sent Events (SSE)**: una conexión HTTP en la que solo el servidor envía datos. Para un dashboard de solo lectura puede bastar y es más simple. Elegiste Socket.io por razones de aprendizaje y de interactividad futura; en una entrevista, saber justificar esa elección frente a SSE y polling es lo que cuenta.

### Clase 2: la API básica de Socket.io

Estos son los bloques que vas a combinar (los nombres exactos los compruebas en la documentación):

- `io.on('connection', socket => ...)`: se ejecuta por cada cliente que se conecta; `socket` representa a ese cliente.
- `socket.emit(...)`: envía a **ese** cliente. `io.emit(...)`: envía a **todos**. `io.to('sala').emit(...)`: envía a **una sala**.
- `socket.on('evento', (datos, ack) => ...)`: escucha un evento del cliente; el segundo argumento opcional es la función de confirmación.
- `socket.join('sala')` y `socket.leave('sala')`.
- Tipado: Socket.io acepta genéricos con los eventos que van del cliente al servidor y del servidor al cliente, de modo que TypeScript te avise si te equivocas en un nombre o en la forma de los datos.

Importante: para usar Socket.io necesitas un servidor HTTP propio, creado con `http.createServer(app)`. Por eso en el ejercicio 1.1 separaste `app` de `server`.

### Clase 3: diseñar los eventos y desacoplar el ETL

Una API de tiempo real también se diseña. Piensa en qué mensajes existen, quién los envía y qué llevan:

- **Servidor a cliente:** un evento de lote de mediciones nuevas, un evento de estado de fuentes, y una instantánea inicial al suscribirse.
- **Cliente a servidor:** suscribirse a fuentes concretas y darse de baja.
- **Un mensaje por lote**, no por fila. Enviar 500 mensajes pequeños satura al cliente y a la red.

Otro principio: **el ETL no debe conocer los sockets**. Si lo importas dentro del ETL, los acoplas. La solución limpia es un bus de eventos interno con `EventEmitter` de Node: el ETL emite «guardé estas mediciones» y la capa de sockets, que escucha, las reenvía. Mañana podrías añadir notificaciones por correo escuchando el mismo evento sin tocar el ETL.

### Clase 4: el cliente en React

Un socket es un **recurso externo** a React, como una suscripción. Reglas para integrarlo bien:

- Crea la conexión **una sola vez**, fuera de los componentes (o dentro de un provider), no en cada render.
- Suscríbete a eventos dentro de `useEffect` y **limpia** en el retorno (`socket.off`). En desarrollo con `StrictMode` los efectos se montan dos veces; sin limpieza recibirías cada mensaje duplicado.
- Los datos que llegan van a un estado con un **tope** (por ejemplo, las últimas 200 mediciones por sensor). Sin tope, la memoria y los gráficos crecen sin límite.
- Expone el estado de la conexión (conectado, reconectando, caído) en la interfaz: es parte de la experiencia de usuario.

### Ejercicios

#### Ejercicio 4.1: laboratorio de conexión

- **Objetivo:** ver con tus propios ojos qué pasa en una conexión Socket.io.
- **Conceptos nuevos:** handshake, transportes, eventos, acknowledgements.
- **Consigna:**
  - En una carpeta de pruebas dentro de `api/scratch/`, monta un servidor mínimo con Socket.io que responda a un evento `ping` con un `pong` mediante acknowledgement, y que emita cada 3 segundos la hora a todos.
  - Escribe un cliente de línea de comandos con `socket.io-client` que se conecte, envíe `ping` y muestre lo que reciba.
  - Conéctate también desde una página HTML sencilla y abre la pestaña de red de las herramientas del navegador, filtrando por WS. Observa el handshake y los mensajes.
  - Mata el servidor y vuélvelo a levantar mientras el cliente sigue abierto. Anota qué hace el cliente.
- **Terminado cuando:** puedes describir en tu `LEARNING-LOG.md` los pasos de la conexión, qué transporte usó el navegador y cómo se comportó la reconexión.
- **Para entrevistas:** «¿Qué diferencia hay entre HTTP, WebSocket y Socket.io?» es una pregunta típica, y haberlo visto en la pestaña de red te permite responder sin memorizar.

#### Ejercicio 4.2: integra Socket.io en CityPulse

- **Objetivo:** que tu API tenga un servidor de tiempo real bien configurado y tipado.
- **Conceptos nuevos:** servidor HTTP compartido, CORS, eventos tipados, cierre ordenado.
- **Consigna:**
  - Refactoriza `server.ts` para crear el servidor HTTP con `http.createServer(app)` y colgar de él la instancia de Socket.io.
  - Define en `src/types/socket.ts` las interfaces de eventos servidor a cliente y cliente a servidor, y úsalas como genéricos.
  - Configura el origen permitido por CORS desde una variable de entorno (validada con zod). Nunca uses `*` en producción.
  - Registra en el log cada conexión y desconexión con el `socket.id` y el motivo.
  - Extiende tu cierre ordenado del 3.5: cierra Socket.io y el servidor HTTP antes de salir.
- **Terminado cuando:** te conectas desde un cliente de prueba y ves los logs de conexión y desconexión. Intentar usar un nombre de evento mal escrito en el servidor da un error de TypeScript en tiempo de compilación.
- **Para entrevistas:** configurar CORS con criterio, y no con un `*` por comodidad, es una de las primeras cosas que revisan en una revisión de código.

#### Ejercicio 4.3: rooms y suscripciones

- **Objetivo:** que cada cliente reciba solo lo que le interesa.
- **Conceptos nuevos:** rooms, validación de eventos entrantes, acknowledgements.
- **Consigna:**
  - Cada fuente (tráfico, aire, ruido...) tiene su sala, con un nombre predecible.
  - El cliente envía `subscribe` con la lista de fuentes que quiere. El servidor valida el mensaje con zod (nunca confíes en lo que manda un cliente), mete el socket en las salas correspondientes y responde por acknowledgement con las fuentes aceptadas y las rechazadas.
  - Añade `unsubscribe`.
  - Limita el número máximo de salas por cliente.
- **Terminado cuando:** un cliente suscrito solo a tráfico no recibe nada de aire, y un mensaje de suscripción con una fuente inventada recibe un rechazo en el acknowledgement sin romper al servidor.
- **Para entrevistas:** validar la entrada también en tiempo real y limitar recursos por cliente demuestra mentalidad de seguridad, que se suele preguntar con «¿qué pasa si un cliente malicioso hace X?».

#### Ejercicio 4.4: conecta el ETL con los sockets mediante un bus de eventos

- **Objetivo:** que los datos viajen del ETL al cliente sin que ambos se conozcan.
- **Conceptos nuevos:** `EventEmitter`, arquitectura dirigida por eventos, envío por lotes.
- **Consigna:**
  - Crea un bus de eventos interno tipado con `EventEmitter` de Node.
  - Al terminar `saveBatch`, el ETL emite un evento con las mediciones **realmente guardadas** (si llegan duplicados que se ignoraron, no se reenvían).
  - Una capa de sockets escucha ese evento y envía **un solo mensaje por lote** a la sala de la fuente correspondiente.
  - Comprueba con `grep` que `src/jobs/` y `src/services/` no importan nada de `socket.io`.
- **Terminado cuando:** con un cliente de línea de comandos suscrito a tráfico y el scheduler en marcha, ves llegar lotes nuevos sin hacer nada. Si ejecutas el ETL dos veces con los mismos datos, el cliente no recibe el segundo lote.
- **Para entrevistas:** el desacoplamiento por eventos y la diferencia entre acoplar y no acoplar capas es tema de arquitectura de nivel medio, que te separa de un perfil que solo sigue tutoriales.

#### Ejercicio 4.5: instantánea inicial y reconexión

- **Objetivo:** que un cliente que llega tarde, o que se reconecta, no vea una pantalla vacía.
- **Conceptos nuevos:** estado inicial frente a actualizaciones incrementales, recuperación tras desconexión.
- **Consigna:**
  - Al suscribirse, el servidor envía una **instantánea**: la última medición de cada sensor de esa fuente, leída de la base de datos.
  - Al reconectarse, el cliente envía el instante de la última medición que vio y el servidor responde con lo que se perdió, con un máximo razonable.
  - Prueba: conecta un cliente, apaga el servidor 20 segundos con el ETL funcionando por otro lado (o ejecuta el ETL a mano), reconecta y verifica que el cliente se pone al día.
- **Terminado cuando:** un cliente nuevo recibe datos inmediatos al suscribirse (no espera al siguiente ciclo del ETL), y tras una desconexión corta se recupera sin huecos ni duplicados.
- **Para entrevistas:** casi todos los tutoriales de tiempo real se quedan en el «chat feliz». Haber resuelto el estado inicial y la reconexión es un diferenciador claro en una conversación técnica.

#### Ejercicio 4.6: el cliente en React (`useLiveReadings`)

- **Objetivo:** consumir el tiempo real desde React sin fugas ni duplicados.
- **Conceptos nuevos:** socket como recurso externo, `useEffect` con limpieza, `StrictMode`, estado acotado, estado de conexión.
- **Consigna:**
  - Crea el proyecto `web/` con el asistente de Next.js (`create-next-app`, con TypeScript y App Router). No te preocupes de entender toda su estructura todavía: es el módulo 5. Para este ejercicio usa una sola página marcada como componente cliente.
  - Crea una única instancia del cliente de Socket.io fuera de los componentes, con la URL desde una variable de entorno pública.
  - Escribe el hook `useLiveReadings(sources)` que se suscribe a esas fuentes, mantiene un estado con las últimas N mediciones por sensor y devuelve también el estado de conexión.
  - Muestra en la página una lista simple de los sensores con su último valor y un indicador de conexión.
  - Comprueba en desarrollo que no recibes cada lote dos veces. Si ocurre, falta la limpieza.
- **Terminado cuando:** la página se actualiza sola al llegar datos, el indicador cambia al apagar el servidor y volver a encenderlo, y el estado nunca supera el tope que fijaste, aunque dejes la página abierta mucho rato.
- **Para entrevistas:** «¿Cómo integras una suscripción externa en React?» y «¿por qué un efecto se ejecuta dos veces en desarrollo?» son preguntas de React que aparecen mucho. Aquí las contestas con un caso propio.

### Autoevaluación del módulo

1. ¿Por qué un cliente WebSocket normal no puede conectarse a un servidor Socket.io?
2. ¿Cuándo preferirías SSE en lugar de Socket.io?
3. ¿Qué ventaja da el bus de eventos frente a importar `io` dentro del ETL?
4. ¿Qué problema aparece si envías un mensaje por fila en lugar de por lote?
5. ¿Qué habría que añadir para correr dos instancias de la API con Socket.io? (Pista: un *adapter* y sesiones pegajosas, o *sticky sessions*.)

### Recursos del módulo

- [Tutorial oficial de Socket.io](https://socket.io/docs/v4/tutorial/introduction): una aplicación de chat paso a paso, buena para tu primera vuelta.
- [Documentación de Socket.io](https://socket.io/docs/v4/): consulta rooms, acknowledgements y uso con TypeScript.
- [MDN: WebSockets API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) y [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) para entender el nivel de protocolo.
- Vídeo: «WebSockets Crash Course» o «WebSockets in 100 Seconds», del canal Fireship.
- Vídeo: busca «Learn Socket.io in 30 minutes» (Web Dev Simplified) para una primera práctica guiada.

## Módulo 5: Next.js con App Router (semanas 7–8)

Al terminar, `web/` es un dashboard con rutas, layouts y secciones que se pintan en el servidor con datos reales de tu API y pasan a ser «vivas» en el navegador gracias a tu hook de Socket.io. Ya sabes React; aquí aprendes **dónde se ejecuta cada cosa**, que es lo que más se pregunta de Next.js.

**Versión.** Las guías y docs actuales sitúan Next.js 16 como la línea vigente del App Router, y muchas empresas aún mantienen proyectos en 14 o 15. Comprueba qué versión instala `create-next-app@latest` en tu máquina y consulta siempre la [documentación oficial](https://nextjs.org/docs), porque el caché y las APIs de petición (`cookies()`, `headers()`, `params`, `searchParams`) cambiaron entre versiones.

### Clase 1: enrutamiento por carpetas

En el App Router, **las carpetas dentro de `app/` definen las rutas** y ficheros con nombres especiales definen qué se muestra:

| Fichero | Qué hace |
| --- | --- |
| `page.tsx` | La interfaz de esa ruta |
| `layout.tsx` | Estructura compartida por la ruta y sus hijas; se conserva al navegar |
| `loading.tsx` | Lo que se ve mientras la ruta carga (usa Suspense por debajo) |
| `error.tsx` | Qué mostrar si algo falla en esa sección |
| `not-found.tsx` | La página 404 |
| `[id]/page.tsx` | Segmento dinámico (por ejemplo, `/sensors/42`) |
| `(grupo)/` | Agrupa rutas para compartir layout sin cambiar la URL |

Para navegar sin recargar la página entera usa el componente `Link`.

### Clase 2: Server Components frente a Client Components

Esta es la idea central del módulo. En el App Router, **todos los componentes son Server Components por defecto**: se ejecutan en el servidor, pueden ser `async`, acceder a datos directamente y **no envían su JavaScript al navegador**. Un Client Component se declara con `'use client'` arriba del fichero, se ejecuta en el navegador (y también se pre-renderiza en el servidor) y es el único que puede usar estado, efectos, eventos y APIs del navegador.

```tsx
// app/items/page.tsx: Server Component (sin 'use client')
export default async function Page() {
  const res = await fetch(`${process.env.API_URL}/api/items`);
  const items = await res.json();
  return <ItemList items={items} />;
}
```

Reglas que debes interiorizar:

- Un Server Component puede renderizar Client Components, pero no al revés a través de `import`. Sí puedes pasarle un Server Component como `children`.
- Las props que cruzan de servidor a cliente deben ser **serializables**: valores, objetos y arrays, no funciones ni instancias de clase.
- `'use client'` marca una **frontera**: todo lo que ese fichero importa también se ejecuta en el cliente. Por eso conviene empujar la frontera hacia las hojas del árbol y mantener pequeños los componentes cliente.
- Las variables de entorno solo llegan al navegador si empiezan por `NEXT_PUBLIC_`. El resto se queda en el servidor, y debe quedarse ahí.

Patrón para CityPulse: el servidor pinta la **instantánea inicial** (HTML ya con datos, rápido y sin pantalla vacía) y un Client Component se engancha después a Socket.io para las actualizaciones.

### Clase 3: datos, renderizado y caché

- **Estático o dinámico:** una página puede generarse una vez y servirse igual a todos, o generarse en cada petición. Un dashboard de tiempo real es casi todo dinámico.
- **Streaming y Suspense:** puedes envolver partes lentas en `<Suspense fallback={...}>` para que el resto de la página se muestre ya, y la parte lenta llegue después.
- **Caché explícita:** en las versiones recientes el caché es opt-in y se controla con la directiva `'use cache'` y funciones como `cacheLife` y `cacheTag`, dentro de lo que la documentación llama *Cache Components*. En versiones anteriores el caché de `fetch` funcionaba de otra forma, así que lee la guía de caché de tu versión antes de decidir.
- **Datos en paralelo:** si una página necesita tres datos independientes, lánzalos con `Promise.all` para no encadenar esperas (el mismo principio que viste en el módulo 1).
- **Hidratación:** el HTML del servidor y el primer render del cliente deben coincidir. Los errores típicos vienen de fechas formateadas con la zona horaria del servidor frente a la del navegador, o de `Math.random()` en el render.

### Clase 4: Route Handlers, Server Actions y el papel de tu Express

Tienes un backend Express con la lógica, la base de datos y los sockets. Por eso **no debes duplicar la API dentro de Next.js**. Las funciones de servidor de Next tienen aquí otros usos:

- **Route Handlers** (`app/api/.../route.ts`): endpoints de «backend para el frontend» (BFF). Útiles para exportar un CSV, para establecer cookies seguras en el módulo 7 o para recibir un aviso y revalidar caché.
- **Server Actions** (`'use server'`): funciones que se ejecutan en el servidor y se llaman desde formularios o eventos del cliente, útiles para mutaciones.
- Evita hacer `fetch` desde un Server Component a tus propios Route Handlers solo para reutilizar lógica: llama directamente a la función o a tu API Express.

### Ejercicios

#### Ejercicio 5.1: mapa de rutas y layouts

- **Objetivo:** esqueleto navegable de CityPulse con las secciones principales.
- **Conceptos nuevos:** rutas por carpetas, layouts anidados, `loading.tsx`, `error.tsx`, `not-found.tsx`, `Link`.
- **Consigna:**
  - Crea las rutas: `/` (resumen), `/traffic`, `/air`, `/noise`, `/sensors`, `/sensors/[id]` y `/status`.
  - Un `layout.tsx` raíz con barra de navegación y pie, y un segundo layout dentro de un grupo de rutas para las secciones de datos, con su propia cabecera.
  - Añade `loading.tsx` y `error.tsx` al menos a una sección y un `not-found.tsx` global. Provoca el error a propósito para verlo.
  - Usa `Link` para toda la navegación interna y marca visualmente el enlace activo.
- **Terminado cuando:** navegar entre secciones no recarga la página completa (compruébalo en la pestaña de red), `/sensors/999999` muestra tu 404 propio y el error provocado aparece dentro del layout, sin romper la barra de navegación.
- **Para entrevistas:** «¿Qué es un layout y qué conserva al navegar?» y «¿cómo se gestionan errores y estados de carga por ruta?» son preguntas de Next.js muy comunes.

#### Ejercicio 5.2: Server Component con datos de tu API

- **Objetivo:** pintar datos reales desde el servidor.
- **Conceptos nuevos:** componentes `async`, `fetch` en servidor, variables de entorno privadas, validación de respuestas.
- **Consigna:**
  - Crea `web/lib/api.ts` con funciones tipadas (`getSensors`, `getSensor`, `getReadings`...) que llamen a tu API Express usando una variable `API_URL` **sin** `NEXT_PUBLIC_`.
  - Valida las respuestas con zod: tu frontend no debe confiar en que el backend nunca cambie.
  - En `/sensors`, un Server Component `async` lista los sensores con su tipo y barrio. En `/sensors/[id]`, el detalle con las últimas mediciones (recuerda que `params` es asíncrono en las versiones recientes: confirma en tu versión).
  - Gestiona el error cuando la API no responde con tu `error.tsx`, no con un `try/catch` silencioso.
- **Terminado cuando:** al hacer «ver código fuente» de `/sensors` el HTML ya contiene los sensores (no se rellena después con JavaScript) y en la pestaña de red no hay una petición del navegador a tu API para esa página.
- **Para entrevistas:** «¿Qué ventajas tiene renderizar en el servidor?» se responde con rendimiento percibido, SEO y menos JavaScript enviado, y tú lo has comprobado en el navegador.

#### Ejercicio 5.3: la frontera servidor/cliente con datos en vivo

- **Objetivo:** primera pintura con datos y actualizaciones en vivo después.
- **Conceptos nuevos:** `'use client'`, props serializables, datos iniciales + suscripción, hidratación.
- **Consigna:**
  - En `/traffic`, el Server Component obtiene la instantánea inicial y se la pasa como prop a un Client Component `LiveTrafficPanel`.
  - `LiveTrafficPanel` usa tu hook `useLiveReadings` del 4.6, partiendo de los datos iniciales, y sigue actualizándose por sockets.
  - Muestra la hora de la última medición. **Fórmatela con una zona horaria fija** (`Europe/Madrid`) tanto en servidor como en cliente. Prueba qué pasa si no lo haces cambiando la zona horaria de tu sistema.
  - Revisa la consola del navegador: no debe haber avisos de hidratación.
- **Terminado cuando:** con JavaScript desactivado ves la página con datos, y con JavaScript activado se actualiza sola. No hay avisos de hidratación en consola y la hora es la misma en servidor y cliente.
- **Para entrevistas:** los errores de hidratación (*hydration mismatch*) son una de las preguntas favoritas de Next.js. Responder con tu caso de la hora lo hace memorable.

#### Ejercicio 5.4: streaming con Suspense

- **Objetivo:** que una parte lenta de la página no bloquee al resto.
- **Conceptos nuevos:** Suspense, streaming, esqueletos de carga, datos en paralelo.
- **Consigna:**
  - En `/`, crea cuatro widgets independientes como Server Components `async` (por ejemplo: resumen de tráfico, última calidad del aire, nivel de ruido y estado de las fuentes), cada uno con su propia llamada a la API.
  - Envuelve cada uno en `Suspense` con un esqueleto que ocupe el mismo espacio que el widget final, para evitar saltos de diseño.
  - Mete un retraso artificial de unos 3 segundos en uno de ellos y comprueba que los otros aparecen antes.
  - Después, quita el retraso y asegúrate de que las llamadas se hacen en paralelo y no encadenadas.
- **Terminado cuando:** con el retraso, tres widgets aparecen enseguida y el cuarto llega después sin mover el resto del contenido. Sin retraso, el tiempo total es el del widget más lento y no la suma de los cuatro.
- **Para entrevistas:** hablar de rendimiento percibido, del *layout shift* y de Core Web Vitals (LCP, CLS) con un ejemplo propio te coloca por encima de quien solo menciona «lazy loading».

#### Ejercicio 5.5: la URL como estado

- **Objetivo:** filtros compartibles que sobreviven a recargar y funcionan con el botón Atrás.
- **Conceptos nuevos:** `searchParams`, navegación programática, estado en la URL frente a estado en memoria.
- **Consigna:**
  - En `/sensors`, añade filtros por tipo y por barrio, orden y paginación, todos guardados en la query string.
  - El Server Component lee `searchParams` y consulta a la API con esos filtros.
  - Un Client Component de filtros actualiza la URL (con `useRouter` o `Link`) sin recargar la página completa. Añade un pequeño retardo (*debounce*) al campo de búsqueda de texto.
  - Valida los parámetros con zod y define valores por defecto sensatos si son inválidos.
- **Terminado cuando:** copiar la URL y abrirla en otra pestaña da exactamente la misma vista, el botón Atrás deshace el último filtro y una URL con parámetros basura no rompe la página.
- **Para entrevistas:** «¿Dónde guardarías el estado de los filtros?» es una pregunta de diseño de frontend muy frecuente. La URL es una respuesta sólida que muchas candidatas no consideran.

#### Ejercicio 5.6: Route Handler como BFF (exportar CSV)

- **Objetivo:** crear un endpoint propio de Next con una función clara.
- **Conceptos nuevos:** Route Handlers, `Response` con cabeceras, descarga de ficheros, separación de responsabilidades con Express.
- **Consigna:**
  - Crea `app/api/sensors/[id]/export/route.ts` que obtenga las mediciones de tu API Express para un rango de fechas y devuelva un CSV descargable con las cabeceras correctas.
  - Valida los parámetros y devuelve errores HTTP coherentes (400, 404, 502 si Express no responde).
  - Añade un botón «Descargar CSV» en el detalle del sensor.
  - Escribe en `LEARNING-LOG.md` por qué este endpoint vive en Next y no en Express, o por qué lo moverías. No hay una única respuesta correcta; lo que importa es que argumentes.
- **Terminado cuando:** el botón descarga un CSV que se abre bien en una hoja de cálculo (con las tildes correctas) y un rango de fechas inválido devuelve un 400 claro.
- **Para entrevistas:** saber decir cuándo un Route Handler es adecuado y cuándo es duplicar un backend demuestra criterio arquitectónico.

#### Ejercicio 5.7: layout base y sistema de diseño

- **Objetivo:** que CityPulse se vea cuidado desde el principio, no al final.
- **Conceptos nuevos:** tokens de diseño con variables CSS, tema claro y oscuro, diseño responsive, accesibilidad básica, `next/font`.
- **Consigna:**
  - Define tokens (colores, espaciados, radios, tipografía) como variables CSS, y úsalos en todo. Con Tailwind (que ofrece el asistente de Next), mapea esos tokens a su configuración.
  - Implementa tema claro y oscuro que respete la preferencia del sistema y permita elegir manualmente. Piensa cómo evitar el parpadeo del tema equivocado al cargar.
  - Diseña una rejilla de tarjetas responsive que se vea bien desde 375 px hasta pantallas anchas.
  - Carga una tipografía con `next/font`.
  - Revisa la accesibilidad: contraste suficiente, navegación completa con teclado, foco visible, `aria-label` en botones de solo icono y jerarquía de encabezados.
  - Elige una paleta pensada para visualización de datos: que distinga bien las series también para personas con daltonismo.
- **Terminado cuando:** puedes usar toda la aplicación solo con el teclado, el tema persiste al recargar sin parpadeo, y Lighthouse (o una herramienta equivalente) no marca fallos graves de accesibilidad ni de contraste.
- **Para entrevistas:** en un puesto con foco en frontend, accesibilidad, responsive y design tokens son tema de conversación habitual, y tu portfolio se evalúa en buena parte por esto.

### Autoevaluación del módulo

1. ¿Qué ocurre con el JavaScript de un Server Component respecto al navegador?
2. ¿Qué significa `'use client'` y por qué conviene colocarlo lo más abajo posible en el árbol?
3. ¿Por qué no debes exponer `API_URL` con el prefijo `NEXT_PUBLIC_` si es un secreto?
4. ¿Qué es un error de hidratación y cómo se evita en el caso de las fechas?
5. ¿Cuándo tiene sentido un Route Handler si ya tienes un backend Express?

### Recursos del módulo

- [Curso oficial Next.js Learn](https://nextjs.org/learn): hazlo en paralelo a los ejercicios.
- [Documentación de Next.js](https://nextjs.org/docs): empieza por la sección de App Router y su guía de caché.
- [React: Server Components](https://react.dev/reference/rsc/server-components): el concepto desde la propia documentación de React.
- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect): mejora cómo usas `useEffect`.
- [Making Sense of React Server Components](https://www.joshwcomeau.com/react/server-components/), de Josh Comeau: la mejor explicación visual que existe.
- Vídeos: busca las charlas y vídeos sobre React Server Components del canal Jack Herrington (Blue Collar Coder) y el contenido de Next.js en el canal oficial de Vercel, filtrando por los de este año.

## Módulo 6: visualización con Recharts y Leaflet (semanas 9–10)

Al terminar, CityPulse tiene gráficos de series temporales, comparativas, tarjetas de KPI y un mapa interactivo de Valencia, todo alimentado con datos reales y actualizándose en vivo. Este es el módulo que más se ve en tu portfolio, así que dedícale tiempo al detalle.

### Clase 1: elegir el gráfico según la pregunta

Antes de escribir código, pregunta qué quiere saber quien mira:

| Pregunta | Gráfico adecuado |
| --- | --- |
| ¿Cómo evoluciona X en el tiempo? | Línea (o área si importa el volumen) |
| ¿Cómo se comparan estas categorías? | Barras ordenadas |
| ¿Cuánto hay de cada parte en un total? | Barras apiladas; evita tartas con más de 3 o 4 trozos |
| ¿Cuándo ocurre más, por hora y día? | Mapa de calor (rejilla de celdas) |
| ¿Dónde pasa? | Mapa |
| ¿Cómo voy respecto al mes pasado? | Tarjeta KPI con variación y minigráfico |

Reglas de oficio que se notan en un portfolio:

- Etiqueta siempre unidades y ejes, y formatea las fechas en la hora de Madrid.
- Diseña **estados vacío, carga y error** de cada gráfico, no solo el caso feliz.
- Elige una paleta distinguible por personas con daltonismo ([ColorBrewer](https://colorbrewer2.org) permite filtrarlas) y no dependas solo del color: usa también etiquetas, formas o patrones.
- Ofrece una alternativa de texto: un resumen en una frase o una tabla accesible.
- Indica siempre la **fecha de la última actualización**.

### Clase 2: Recharts y rendimiento en vivo

[Recharts](https://recharts.org) es una librería declarativa: compones el gráfico con componentes de React (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ReferenceLine`, `ResponsiveContainer`...). Como usa estado y mide el DOM, siempre va en un **Client Component**.

Puntos clave para tiempo real:

- **Datos pre-agregados.** No pintes 50 000 puntos: pide al backend ya agrupados por intervalo (por ejemplo, cada 5 minutos, cada hora o cada día) y limita a unos cientos de puntos.
- **Desactiva las animaciones** en gráficos que se actualizan con frecuencia; cada dato nuevo reanimaría todo el gráfico y parecería que tiembla.
- **Estabilidad de referencias.** Si recreas el array de datos en cada render, el gráfico se redibuja entero. Usa `useMemo` donde tenga sentido y guarda un número acotado de puntos.
- **Agrupa las actualizaciones.** Si llegan 20 mensajes por segundo, acumula y actualiza la interfaz cada 500 ms o 1 s.
- **Huecos honestos.** Si falta un dato, muestra un hueco; unir los puntos con una línea inventa información. Decide conscientemente cómo tratar los valores nulos.

### Clase 3: mapas con Leaflet en Next.js

[Leaflet](https://leafletjs.com/examples/quick-start/) es la librería de mapas más usada y [React Leaflet](https://react-leaflet.js.org) la envuelve en componentes (`MapContainer`, `TileLayer`, `Marker`, `Popup`, `GeoJSON`, `Polyline`). Hay cuatro trampas conocidas:

1. **No funciona en el servidor.** Leaflet usa `window` al importarse. Carga el mapa con `next/dynamic` y `ssr: false`, desde un Client Component.
2. **El mapa no se ve.** Su contenedor necesita una **altura explícita** y la hoja de estilos de Leaflet importada.
3. **Los iconos de los marcadores salen rotos** con los empaquetadores modernos, porque Leaflet resuelve mal las rutas de las imágenes por defecto. Se arregla configurando el icono manualmente o usando `divIcon`, que además te permite diseñar marcadores propios.
4. **`GeoJSON` no se actualiza al cambiar sus datos.** El componente trata `data` como inmutable; para forzar el redibujado se le cambia la `key`. Con muchos tramos esto es caro, y por eso en el ejercicio 6.6 buscarás alternativas.

Además, comprueba las versiones compatibles: las versiones recientes de React Leaflet declaran en sus dependencias qué versión de React soportan.

Sobre los **mosaicos del mapa** (*tiles*): los de OpenStreetMap tienen una [política de uso](https://operations.osmfoundation.org/policies/tiles/) que exige atribución y limita el uso intensivo. Para un portfolio basta con respetarla; si el proyecto recibe tráfico, valora un proveedor con plan gratuito.

Para rendimiento con miles de elementos: `preferCanvas` en el mapa, filtrado por el área visible, y agrupación de marcadores (*clustering*) cuando hay muchos puntos juntos.

### Ejercicios

#### Ejercicio 6.1: endpoint de series agregadas (backend)

- **Objetivo:** que el frontend reciba pocos puntos y ya preparados.
- **Conceptos nuevos:** agregación temporal en SQL, elección automática del intervalo, contrato de API pensado para gráficos.
- **Consigna:**
  - En tu API, crea `GET /api/series` con parámetros: sensor (o fuente), métrica, rango de fechas e intervalo (5 minutos, 1 hora, 1 día).
  - Usa `$queryRaw` con `date_trunc` (o el equivalente para 5 minutos) y devuelve por intervalo: la media, el mínimo, el máximo y el número de muestras.
  - Si el cliente no pasa intervalo, elígelo tú según el rango pedido, de forma que nunca se devuelvan más de unos 500 puntos.
  - Valida todo con zod y devuelve los instantes en UTC (formato ISO).
- **Terminado cuando:** pedir 24 horas, 7 días y 30 días devuelve siempre menos de 500 puntos y el tiempo de respuesta se mantiene razonable con tus 200 000 filas de pruebas (compáralo con tu `EXPLAIN` del 2.6).
- **Para entrevistas:** diseñar un endpoint pensando en quién lo consume (el gráfico) y no en cómo es la tabla es una señal de criterio de producto.

#### Ejercicio 6.2: tu primer gráfico de series temporales

- **Objetivo:** un gráfico de línea completo, con todos sus estados.
- **Conceptos nuevos:** `ResponsiveContainer`, ejes y formato de fechas, tooltips personalizados, estados vacío/carga/error.
- **Consigna:**
  - Crea un Client Component `TimeSeriesChart` que reciba datos, unidad y título. El Server Component de la página obtiene los datos con tu cliente de API y se los pasa.
  - Formatea el eje X en la zona horaria de Madrid y el eje Y con la unidad. Escribe un tooltip propio con fecha completa, media y rango mínimo-máximo.
  - Añade un selector de rango (24 h, 7 d, 30 d) cuyo valor viva en la URL, como en el ejercicio 5.5.
  - Diseña los tres estados no felices: sin datos en el rango, cargando (esqueleto) y error con botón de reintento.
- **Terminado cuando:** el gráfico se adapta al ancho de la ventana, cambiar de rango actualiza la URL y los datos, y los tres estados se pueden provocar y se ven cuidados.
- **Para entrevistas:** «¿Cómo manejas estados de carga y error en una interfaz de datos?» es pregunta de frontend casi segura, y aquí tienes un ejemplo propio con los tres.

#### Ejercicio 6.3: gráficos en vivo sin que tiemblen

- **Objetivo:** añadir puntos en tiempo real manteniendo el gráfico fluido.
- **Conceptos nuevos:** búfer circular, agrupación de actualizaciones, `useMemo`, React Profiler.
- **Consigna:**
  - Combina el gráfico del 6.2 con tu hook `useLiveReadings`: los puntos nuevos se añaden al final y los antiguos salen cuando superas un tope.
  - Desactiva la animación y agrupa las actualizaciones para no repintar más de una vez por segundo, aunque lleguen más mensajes.
  - Añade un botón «Pausar» que congele el gráfico (los datos siguen acumulándose por debajo) y otro «Reanudar» que lo ponga al día.
  - Usa el Profiler de las herramientas de React para medir cuántas veces se renderiza el gráfico por minuto antes y después de tu optimización. Anota los números.
- **Terminado cuando:** con datos entrando constantemente el gráfico no parpadea ni salta, el Profiler confirma que solo se renderiza lo necesario, y tienes anotada la mejora medida.
- **Para entrevistas:** optimizar con medidas y no por intuición es lo que separa una respuesta senior de una junior. Dices «medí, cambié esto y bajó de X a Y».

#### Ejercicio 6.4: biblioteca de visualizaciones coherentes

- **Objetivo:** un conjunto de componentes de gráficos con el mismo estilo y reutilizables.
- **Conceptos nuevos:** diseño de componentes reutilizables, tokens de tema en gráficos, accesibilidad en visualización.
- **Consigna:**
  - **Barras:** comparar, por ejemplo, el nivel de ruido por barrio o los viajeros por línea de la EMT (según lo que localizaste en el 3.1).
  - **Área con umbrales:** una contaminante del aire con líneas de referencia en los límites legales u orientativos que elijas citar (anota de dónde sale cada umbral).
  - **Tarjeta KPI:** valor, variación frente al periodo anterior con flecha y color (más texto, no solo color) y un minigráfico. Úsala para turismo, empleo u otros indicadores mensuales.
  - Opcional: un **mapa de calor** hora del día por día de la semana, hecho con una rejilla CSS y una escala de color.
  - Todos leen colores y tipografía de tus tokens (ejercicio 5.7), funcionan en tema claro y oscuro y tienen una descripción de texto accesible.
- **Terminado cuando:** cambiar un token de color cambia todos los gráficos a la vez, y con un lector de pantalla (o inspeccionando el árbol de accesibilidad) cada visualización tiene un resumen comprensible.
- **Para entrevistas:** un sistema de componentes coherente enseña que sabes diseñar para reutilizar, que es lo que se espera de quien aspira a trabajar en frontend con un equipo.

#### Ejercicio 6.5: mapa base con Leaflet

- **Objetivo:** un mapa de Valencia funcionando dentro de Next.js.
- **Conceptos nuevos:** carga dinámica sin SSR, ciclo de vida de Leaflet en React, iconos personalizados, atribución.
- **Consigna:**
  - Crea un Client Component `CityMap` y cárgalo con `next/dynamic` y `ssr: false`. Dale altura explícita y centra el mapa en Valencia con un zoom adecuado.
  - Configura la capa de mosaicos con la atribución correcta y cumple la política del proveedor.
  - Pinta un marcador por sensor con un `divIcon` propio (distinto por tipo de sensor). Al hacer clic, un `Popup` muestra el nombre, el valor más reciente y la hora.
  - Comprueba que no hay errores de `window is not defined`, que los iconos se ven y que el mapa funciona en móvil.
  - Los marcadores se leen de tu API (con el Server Component), no se escriben a mano.
- **Terminado cuando:** el mapa se muestra en desarrollo y en la build de producción, sin errores en consola, con marcadores propios y un popup con datos reales.
- **Para entrevistas:** haber resuelto el problema de SSR de una librería que depende del navegador es un caso muy concreto que se puede explicar en un minuto.

#### Ejercicio 6.6: capa de tráfico por tramos, en vivo

- **Objetivo:** pintar el estado del tráfico sobre las calles y actualizarlo con sockets.
- **Conceptos nuevos:** geometrías (líneas), estilo por dato, actualización parcial, rendimiento con muchos elementos.
- **Consigna:**
  - Guarda la geometría de cada tramo (si tu fuente la ofrece) y exponla en la API como GeoJSON; si no, usa los puntos con los que cuentes.
  - Dibuja los tramos coloreados según tu escala de estado, con una leyenda accesible que no dependa solo del color.
  - Cuando llegue un lote por sockets, actualiza **solo los tramos que cambiaron**, sin redibujar toda la capa. Compara el rendimiento con la versión que cambia la `key` de `GeoJSON`.
  - Activa `preferCanvas` y pide a la API solo lo que está dentro del área visible del mapa si la capa es grande.
- **Terminado cuando:** el color de un tramo cambia sin recargar y sin parpadeo del resto, y puedes decir cuántos tramos redibujas por actualización y el tiempo que tarda.
- **Para entrevistas:** actualizar de forma incremental frente a repintar todo es el mismo problema que la reconciliación de React. Conectarlo con un caso real de mapas es una excelente respuesta.

#### Ejercicio 6.7: mapa y gráficos conectados

- **Objetivo:** que las partes del dashboard hablen entre sí.
- **Conceptos nuevos:** estado compartido en la URL, interacción entre componentes, capas conmutables.
- **Consigna:**
  - Al hacer clic en un sensor del mapa, se abre un panel lateral con su gráfico y sus KPIs, y la URL pasa a incluir el sensor seleccionado.
  - Añade un control para activar o desactivar capas (tráfico, aire, ruido) y un selector del rango temporal compartido por todos los gráficos.
  - El botón Atrás del navegador cierra el panel, y compartir la URL reproduce la misma vista.
  - El panel debe ser accesible: foco al abrirse, cierre con la tecla Escape y orden de tabulación lógico.
- **Terminado cuando:** abres una URL con un sensor y un rango y obtienes la vista idéntica, y todo el flujo se puede recorrer con el teclado.
- **Para entrevistas:** gestionar el estado compartido entre componentes y decidir dónde vive (URL, contexto, estado local) es uno de los temas centrales de cualquier entrevista de frontend.

#### Ejercicio 6.8: pulido y rendimiento del dashboard

- **Objetivo:** que la portada se vea y se comporte como un producto terminado.
- **Conceptos nuevos:** presupuesto de rendimiento, análisis de bundle, carga diferida, jerarquía visual.
- **Consigna:**
  - Compón la portada con una fila de KPIs, el mapa, los gráficos principales, el estado de conexión y la hora de la última actualización de cada fuente.
  - Revisa los tamaños de JavaScript con un analizador de bundle y asegúrate de que Leaflet y Recharts solo se cargan en las páginas que los usan, con carga diferida cuando proceda.
  - Mide con Lighthouse en una build de producción, anota las puntuaciones y trabaja una mejora concreta (imágenes, fuentes, JavaScript sin usar).
  - Revisa la portada en 375 px, en una tableta y en una pantalla ancha.
- **Terminado cuando:** tienes una captura de Lighthouse con tus números, una nota con qué reduciste y cuánto, y la portada se ve bien en los tres tamaños.
- **Para entrevistas:** Core Web Vitals y análisis de bundle son vocabulario esperado en un puesto con foco en frontend, y los números propios dan credibilidad.

### Autoevaluación del módulo

1. ¿Por qué pedir al backend datos agregados en lugar de pintar todos los puntos?
2. ¿Por qué hay que desactivar las animaciones en un gráfico en vivo?
3. ¿Qué dos cosas necesita un mapa de Leaflet para verse bien en Next.js?
4. ¿Qué ventaja tiene actualizar solo los tramos que cambian?
5. ¿Qué información da tu gráfico a alguien que no puede distinguir los colores?

### Recursos del módulo

- [Documentación de Recharts](https://recharts.org) y [de React Leaflet](https://react-leaflet.js.org).
- [Guía rápida de Leaflet](https://leafletjs.com/examples/quick-start/) para entender la librería base.
- [ColorBrewer](https://colorbrewer2.org): paletas para visualización, con opción apta para daltonismo.
- [Datawrapper Academy](https://academy.datawrapper.de): artículos prácticos sobre qué gráfico elegir y cómo diseñarlo.
- [Política de uso de mosaicos de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
- Vídeos: busca «React Leaflet tutorial» y «Recharts tutorial» y quédate con los más recientes; las versiones de las librerías cambian y los de hace años pueden no encajar con tu instalación.

## Módulo 7: autenticación con JWT (semana 11)

Al terminar, CityPulse tiene registro, login, sesiones seguras y una función que solo existe para usuarias registradas: **favoritos y alertas personales** («avísame si el ruido en este sensor supera X»). Construyes la autenticación a mano para entenderla; en un producto real valorarías una biblioteca (como Auth.js) o un servicio gestionado, y saber explicar por qué es parte de la respuesta de entrevista.

### Clase 1: conceptos que no se pueden confundir

- **Autenticación:** comprobar *quién eres* (email y contraseña). **Autorización:** decidir *qué puedes hacer* (solo ver tus alertas). Un 401 significa «no sé quién eres» y un 403 «sé quién eres, pero no puedes».
- **Hash de contraseñas:** nunca se guarda la contraseña, sino su hash con un algoritmo lento y con sal, diseñado para esto (argon2 o bcrypt). Un hash rápido como SHA-256 no es adecuado para contraseñas. La [guía de OWASP sobre almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) detalla las recomendaciones vigentes.
- **JWT (JSON Web Token):** un texto con tres partes (cabecera, contenido y firma). El contenido está **firmado, no cifrado**: cualquiera puede leerlo, pero nadie puede modificarlo sin que la firma falle. Por eso nunca se pone en él nada secreto. Puedes inspeccionar uno en [jwt.io](https://jwt.io/introduction).
- **Token de acceso y de refresco:** el de acceso dura poco (minutos) y se envía en cada petición; así, si se roba, sirve poco tiempo. El de refresco dura días, se usa solo para pedir otro de acceso, se guarda **hasheado en la base de datos** y se *rota* en cada uso. Esto permite cerrar sesiones y detectar robos, algo que un JWT único de larga duración no permite.

### Clase 2: dónde guardar el token en el navegador

| Opción | Ventaja | Riesgo principal |
| --- | --- | --- |
| `localStorage` | Fácil de usar | Cualquier script inyectado (XSS) puede leerlo |
| Cookie `httpOnly`, `Secure`, `SameSite` | JavaScript no puede leerla | Hay que proteger contra CSRF y cuidar los dominios |

La opción recomendada es la cookie con `httpOnly`, `Secure` y `SameSite`. El matiz es que tu frontend (Next.js) y tu API (Express) pueden estar en dominios distintos, y las cookies entre sitios distintos son más delicadas (`SameSite=None`, `credentials` en CORS...). Hay dos salidas limpias:

1. **Next.js como intermediario (BFF):** el navegador habla solo con Next.js; este guarda la cookie en su propio dominio y llama a Express por detrás con el token. Aprovecha lo que viste en el módulo 5.
2. **Mismo sitio:** desplegar frontend y API bajo subdominios del mismo dominio, de modo que la cookie sea del mismo sitio.

Elige una y justifica por qué en tu `LEARNING-LOG.md`.

### Clase 3: protección de rutas en Next.js y en Express

- En **Express**, un middleware `requireAuth` verifica el token y deja el usuario en `req`; otro, `requireRole`, comprueba permisos. La verificación real siempre está en el servidor.
- En **Next.js**, el *proxy* (en versiones anteriores llamado *middleware*; confirma el nombre en tu versión) sirve para redirigir rápido a quien no tiene sesión, pero es solo una **comprobación optimista**. La autorización de verdad se vuelve a verificar en el servidor, donde se leen los datos. Recuerda que `cookies()` es asíncrona en las versiones recientes.
- **Socket.io** también necesita autenticarse: el token viaja en el *handshake* y un middleware (`io.use`) lo valida antes de aceptar la conexión.

### Clase 4: riesgos básicos que debes saber nombrar

- **Fuerza bruta:** limita los intentos de login por IP y por cuenta.
- **Enumeración de usuarios:** el mensaje de error de login debe ser el mismo si el email no existe o la contraseña es incorrecta.
- **XSS y CSRF:** XSS inyecta scripts (por eso `httpOnly`); CSRF hace que el navegador de la víctima envíe peticiones con su cookie (por eso `SameSite` y, según el caso, tokens anti-CSRF).
- **Secretos:** la clave de firma vive en variables de entorno, es larga y aleatoria, y se rota si se filtra.
- **Cabeceras de seguridad:** `helmet` activa varias de golpe en Express.

### Ejercicios

#### Ejercicio 7.1: usuarios y registro seguro

- **Objetivo:** guardar usuarios sin almacenar contraseñas.
- **Conceptos nuevos:** hash lento con sal, validación de contraseñas, conflictos de unicidad.
- **Consigna:**
  - Añade el modelo `User` (email único, hash, fecha de creación, rol) con una nueva migración.
  - Crea `POST /api/auth/register`: valida con zod (email válido, contraseña con longitud mínima razonable), hashea con argon2 o bcrypt y guarda. Nunca devuelves el hash en ninguna respuesta.
  - Un email repetido devuelve 409 (traduce el error de Prisma `P2002`) y una contraseña débil devuelve 400.
  - Respeta tus capas: el hash se hace en el service, no en el controller.
- **Terminado cuando:** al abrir Prisma Studio ves un hash, no la contraseña; el email duplicado da 409 y ningún endpoint filtra el hash en su respuesta.
- **Para entrevistas:** «¿Cómo guardas contraseñas?» es una pregunta casi garantizada. Responder con «hash lento con sal, nunca cifrado reversible» y por qué es lo mínimo esperado.

#### Ejercicio 7.2: login y emisión de tokens

- **Objetivo:** comprobar credenciales y emitir un token de acceso de vida corta.
- **Conceptos nuevos:** firma y verificación de JWT, claims (`sub`, `exp`), mensaje de error uniforme.
- **Consigna:**
  - Crea `POST /api/auth/login`. Si el email no existe o la contraseña no coincide, responde exactamente lo mismo (mismo código y mismo mensaje).
  - Firma un JWT de acceso con una librería (`jsonwebtoken` o `jose`), con contenido mínimo (identificador de usuario y rol), caducidad corta y el algoritmo fijado explícitamente.
  - La clave de firma viene de tu configuración validada con zod, con una longitud mínima exigida.
  - Pega un token en jwt.io, lee su contenido, y comprueba qué pasa si modificas una letra del contenido y lo envías a tu API.
- **Terminado cuando:** un login correcto devuelve un token que se decodifica con el contenido esperado y caduca solo, y un token alterado a mano es rechazado.
- **Para entrevistas:** «¿Un JWT está cifrado?» y «¿qué pones en el payload?» son preguntas típicas. Tú has visto un token abierto en jwt.io y puedes explicar la respuesta con un ejemplo.

#### Ejercicio 7.3: rutas protegidas y roles

- **Objetivo:** que solo usuarios autenticados accedan a ciertas rutas, y solo los autorizados a otras.
- **Conceptos nuevos:** middleware de autenticación, ampliar los tipos de `Request`, 401 frente a 403.
- **Consigna:**
  - Escribe el middleware `requireAuth` que lea el token, lo verifique y deje el usuario en `req.user` con tipo propio (extiende el tipo de `Request` de Express con *declaration merging*).
  - Escribe la factoría `requireRole(...roles)` que devuelva 403 si el rol no basta.
  - Protege `GET /api/me` y un endpoint de administración (por ejemplo, el de `/api/status` detallado de tu ejercicio 3.7).
  - Usa tus `AppError` para devolver el 401 y el 403 con tu formato uniforme.
- **Terminado cuando:** sin token da 401, con token de usuario normal en la ruta de administración da 403, y con token válido de administradora da 200.
- **Para entrevistas:** distinguir 401 de 403 y modelar la autorización como middleware reutilizable es un clásico de las pruebas técnicas de backend.

#### Ejercicio 7.4: tokens de refresco con rotación

- **Objetivo:** sesiones largas sin dejar tokens de acceso de larga vida.
- **Conceptos nuevos:** tokens opacos aleatorios, almacenamiento hasheado, rotación, detección de reutilización.
- **Consigna:**
  - Añade el modelo `RefreshToken` (usuario, hash del token, caducidad, fecha de revocación, y una referencia a la «familia» de sesión).
  - En el login emites además un token de refresco aleatorio (no un JWT) y guardas **solo su hash**.
  - `POST /api/auth/refresh` valida el token, lo revoca y emite uno nuevo y un acceso nuevo (rotación).
  - Si llega un token de refresco ya usado, trátalo como posible robo: revoca toda la familia de esa sesión.
  - `POST /api/auth/logout` revoca el token actual.
  - Escribe un script que pruebe: refresco correcto, reutilización del token viejo y logout.
- **Terminado cuando:** tu script demuestra que el token viejo deja de funcionar tras rotar, que reutilizarlo revoca la familia entera y que tras el logout no se puede refrescar.
- **Para entrevistas:** la rotación de tokens de refresco con detección de reutilización es lo que diferencia una respuesta de nivel medio-alto de la típica «guardo el JWT y ya».

#### Ejercicio 7.5: seguridad básica de la API

- **Objetivo:** cerrar las puertas más comunes.
- **Conceptos nuevos:** limitación de tasa, cabeceras de seguridad, CORS con credenciales.
- **Consigna:**
  - Añade `helmet` y revisa qué cabeceras pone.
  - Aplica un limitador de peticiones a las rutas de autenticación, con un límite más estricto en login (por ejemplo, unos pocos intentos por minuto) y respuesta 429 con la cabecera de espera.
  - Revisa tu configuración de CORS: orígenes concretos, y `credentials` solo si lo necesitas.
  - Revisa los logs: no deben aparecer contraseñas, tokens ni hashes. Prueba lanzando un login erróneo y comprobando la salida.
  - Escribe una lista breve de amenazas (fuerza bruta, enumeración, XSS, CSRF, robo de token) y la medida que aplicas a cada una.
- **Terminado cuando:** tras varios logins fallidos seguidos recibes 429, la lista de amenazas está en el repositorio y no hay secretos en los logs.
- **Para entrevistas:** conocer las defensas básicas y mapearlas a amenazas concretas es el nivel de seguridad que se espera de un perfil full stack, aunque no seas especialista.

#### Ejercicio 7.6: sesión en Next.js

- **Objetivo:** que el navegador nunca pueda leer el token.
- **Conceptos nuevos:** cookies `httpOnly` desde el servidor de Next, Server Actions o Route Handlers como BFF, protección de rutas en capas.
- **Consigna:**
  - Crea la página de login y registro con validación en cliente (React Hook Form o equivalente con zod) y mensajes de error accesibles.
  - El envío va a un Server Action o a un Route Handler de Next que llama a Express y guarda los tokens en cookies `httpOnly`, `Secure` (en producción) y `SameSite`.
  - Crea una función de servidor que lea la sesión (recuerda el acceso asíncrono a `cookies()`) y úsala en los layouts y páginas protegidas, además del *proxy*/middleware que redirige rápido a quien no tiene cookie.
  - Implementa el logout y la renovación del token de acceso cuando caduque, sin que la usuaria lo note.
- **Terminado cuando:** en las herramientas del navegador no hay ningún token en `localStorage` ni accesible con `document.cookie`, acceder directamente a una URL protegida sin sesión redirige al login y cerrar sesión invalida la anterior.
- **Para entrevistas:** la pregunta «¿dónde guardas el token y por qué?» es de las más comunes en frontend. Con esto respondes con una implementación y no con una opinión.

#### Ejercicio 7.7: favoritos y alertas personales en tiempo real

- **Objetivo:** una función de producto que usa todo lo anterior.
- **Conceptos nuevos:** relaciones muchos a muchos en Prisma, salas por usuario, autenticación del socket, evaluación de reglas en el ETL.
- **Consigna:**
  - Modela `Favorite` (relación muchos a muchos entre usuarios y sensores) y `AlertRule` (usuario, sensor, métrica, operador, umbral). Crea la migración.
  - Endpoints protegidos para listar, crear y borrar favoritos y reglas, siempre limitados a los datos de la usuaria autenticada (comprueba que no puedes tocar los de otra).
  - Autentica el socket con un middleware `io.use` que lea el token del *handshake* y meta al socket en una sala `user:ID`.
  - Escucha el bus de eventos del ejercicio 4.4: por cada lote guardado, evalúa las reglas de los sensores afectados y emite `alert:triggered` solo a la sala del usuario dueño de la regla. Evita repetir la misma alerta en cada ciclo (decide una estrategia, por ejemplo, una por cruce de umbral).
  - En la interfaz: una estrella para marcar favoritos, un formulario de reglas y un aviso visible (*toast* accesible) al recibir la alerta.
- **Terminado cuando:** fijas un umbral por debajo del valor actual de un sensor y la alerta llega en el siguiente ciclo del ETL; otra usuaria con otro token no la recibe, y la misma regla no dispara una alerta en cada ciclo.
- **Para entrevistas:** puedes presentar una funcionalidad de principio a fin (base de datos, API, tiempo real, seguridad e interfaz) y contar qué decisiones tomaste. Es exactamente la historia que busca quien contrata.

### Autoevaluación del módulo

1. ¿Por qué el hash de una contraseña debe ser lento?
2. ¿Por qué un JWT no es un buen lugar para guardar datos sensibles?
3. ¿Qué amenaza evita `httpOnly` y cuál `SameSite`?
4. ¿Qué ganas con la rotación de tokens de refresco frente a un único JWT largo?
5. ¿Por qué un redirect del proxy de Next.js no basta como protección?

### Recursos del módulo

- [Introducción a JWT](https://jwt.io/introduction): con el depurador de tokens.
- [OWASP: almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) y [OWASP: autenticación](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- [Guía de autenticación de Next.js](https://nextjs.org/docs/app/guides/authentication): lee la de la versión que uses.
- Vídeos: busca «JWT authentication explained» y «cookies vs sessions vs JWT»; elige los más recientes y contrasta siempre lo que digan con la guía de OWASP.

## Módulo 8: testing, deploy y documentación para el portfolio (semana 12)

Al terminar, CityPulse tiene tests que protegen lo importante, una integración continua que los ejecuta, está desplegado con un enlace público que funciona las 24 horas y tiene un README que vende el proyecto en 30 segundos. Un proyecto sin demo ni documentación es invisible para quien contrata, así que esta semana es tan importante como las anteriores.

### Clase 1: qué testear y con qué herramientas

No se trata de llegar al 100 % de cobertura, sino de proteger lo que más duele si se rompe. Una distribución razonable para tu proyecto:

| Tipo | Qué prueba | Herramienta | Dónde en CityPulse |
| --- | --- | --- | --- |
| Unitario | Funciones puras, sin red ni base de datos | [Vitest](https://vitest.dev) | `transform`, esquemas zod, elección de intervalo, reglas de alerta |
| Integración | Varias capas juntas con una base real de pruebas | Vitest + [Supertest](https://github.com/ladjs/supertest) | Endpoints de la API, autenticación, errores |
| Componente | Cómo se ve y reacciona una pieza de interfaz | [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | Filtros, estados vacío/error, tarjetas KPI |
| Extremo a extremo (E2E) | El flujo completo en un navegador real | [Playwright](https://playwright.dev) | Login, ver dashboard, crear una alerta |

Ideas que debes interiorizar:

- Prueba **comportamiento visible**, no detalles internos. Un test que se rompe por refactorizar sin cambiar el resultado es un mal test. Esa es la idea de [«Write tests. Not too many. Mostly integration.»](https://kentcdodds.com/blog/write-tests) de Kent C. Dodds.
- Cada test debe ser **independiente** y **determinista**: sin depender del orden, de la hora actual ni de internet. Para la hora, inyecta un reloj o usa el reloj falso de la herramienta.
- Las pruebas de integración usan una **base de datos de test separada** que se limpia entre tests. Nunca apuntes tus tests a la base de desarrollo.
- Tu arquitectura en capas (módulo 1) es lo que hace esto fácil: puedes probar un service con un repositorio falso, o toda la API con uno real.

### Clase 2: dónde alojar cada pieza (y una trampa importante)

Tu proyecto tiene tres piezas con necesidades distintas:

- **Frontend Next.js:** encaja de forma natural en [Vercel](https://vercel.com/docs).
- **Backend Express con Socket.io y el ETL:** necesita un proceso que esté **siempre encendido**, con conexiones persistentes y tareas programadas. Las funciones *serverless* de plataformas como Vercel no sirven para mantener un servidor de WebSockets. Por eso usarás un servicio de procesos persistentes, como [Railway](https://railway.com) o [Render](https://render.com/docs).
- **PostgreSQL gestionado:** lo ofrecen esas plataformas o proveedores especializados.

**La trampa:** algunos planes gratuitos *duermen* el servicio tras un tiempo sin tráfico. Si tu API duerme, `node-cron` deja de ejecutarse y tu histórico tiene huecos. Revisa las condiciones y precios **actuales** de cada plataforma antes de decidir, porque cambian a menudo. Si eliges un plan que duerme, necesitas una alternativa (un plan siempre activo, o un disparador externo que llame a un endpoint protegido que ejecute el ETL), y explicar esa decisión es buen material de entrevista.

Otros puntos de producción: las migraciones se aplican con `prisma migrate deploy` (nunca `migrate dev`), el CORS permite solo tu dominio real, el frontend se conecta por `wss://` y tu base de datos tiene un tamaño máximo, lo que obliga a decidir cuánto histórico guardas.

### Clase 3: documentar un proyecto para que contrate

Quien revisa portfolios dedica un minuto o dos a cada uno. Tu README es la página de venta:

1. **Arriba del todo:** una frase que diga qué es y para quién, el enlace a la demo y un GIF corto o captura del dashboard.
2. **Qué problema resuelve y por qué es interesante** (los portales de datos abiertos solo muestran el estado actual; CityPulse conserva histórico y lo muestra en vivo).
3. **Arquitectura:** un diagrama (GitHub renderiza [Mermaid](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams) directamente en el README).
4. **Decisiones técnicas y *trade-offs*:** por qué Socket.io y no SSE, por qué Express separado de Next, por qué cursor en vez de offset. Las [decisiones de arquitectura documentadas](https://adr.github.io) son una práctica profesional reconocible.
5. **Cómo ejecutarlo en local** en menos de 5 comandos.
6. **Qué mejorarías con más tiempo.** Reconocer límites suena a criterio, no a debilidad.
7. **Atribución de datos.** Comprueba la licencia de cada dataset: muchos del portal de Valencia usan CC-BY 4.0, que exige citar la fuente.

### Ejercicios

#### Ejercicio 8.1: tests unitarios de la lógica pura

- **Objetivo:** proteger las funciones donde un error pasa desapercibido.
- **Conceptos nuevos:** Vitest, casos límite, tests deterministas, nombres de test que documentan.
- **Consigna:**
  - Configura Vitest en `api/` y en `web/`.
  - Escribe tests para: las funciones `transform` de tus adaptadores (caso normal, campo nulo, estado desconocido, como definiste en el 3.3), los esquemas zod de entrada, la elección automática del intervalo de `/api/series` (6.1) y la evaluación de reglas de alerta (7.7).
  - Cada test se llama como una frase que describe el comportamiento esperado.
  - Incluye al menos tres casos límite que no estén en el «camino feliz» (por ejemplo, un rango de fechas invertido o un umbral justo igual al valor).
- **Terminado cuando:** `npm test` tarda pocos segundos, pasa en una máquina limpia, y si rompes a propósito una función (cambiando un operador) algún test falla.
- **Para entrevistas:** «¿Qué testearías primero en este proyecto?» es una excelente pregunta. Responder «la lógica de negocio pura y los flujos críticos» y poder mostrarlo suena a experiencia.

#### Ejercicio 8.2: tests de integración de la API

- **Objetivo:** probar la API completa contra una base de datos real de pruebas.
- **Conceptos nuevos:** Supertest, base de datos de test, limpieza entre tests, pruebas de autenticación.
- **Consigna:**
  - Crea una base de datos de test (otro nombre en tu Docker Compose) y una variable de entorno que el entorno de tests use.
  - Prepara un arranque que aplique las migraciones y una limpieza entre tests (vaciar tablas o envolver cada test en una transacción).
  - Prueba con Supertest, sin levantar el puerto (recuerda que separaste `app` de `server` en el 1.1): el formato uniforme de errores, la validación de parámetros, el flujo de registro y login, el acceso a una ruta protegida con y sin token, el rechazo de un token manipulado, y que una usuaria no puede leer las reglas de otra.
  - Prueba también la idempotencia del 2.5: guardar dos veces el mismo lote deja las mismas filas.
- **Terminado cuando:** la suite se puede ejecutar varias veces seguidas con el mismo resultado, sin depender del orden de los tests, y nunca toca tu base de desarrollo.
- **Para entrevistas:** «¿Cómo testeas una API con base de datos?» es un clásico. Hablar de aislar la base de pruebas y limpiar entre tests demuestra que has tenido que resolverlo.

#### Ejercicio 8.3: componentes y un flujo de extremo a extremo

- **Objetivo:** probar la interfaz como la usaría una persona.
- **Conceptos nuevos:** Testing Library (consultas por rol y texto), sustituir el socket por uno falso, Playwright.
- **Consigna:**
  - Con Testing Library, prueba al menos tres componentes: los filtros de `/sensors` (la URL cambia), el gráfico con sus estados vacío, carga y error, y la tarjeta KPI (el texto de la variación, no solo el color).
  - Para los componentes con sockets, inyecta una conexión falsa y comprueba que los datos nuevos aparecen en pantalla.
  - Con Playwright, escribe **un** test E2E del flujo clave: registrarse, iniciar sesión, abrir el mapa, marcar un sensor como favorito y crear una alerta. Usa datos de prueba controlados.
  - Localiza los elementos por rol y nombre accesible, no por clases CSS. Así tus tests refuerzan la accesibilidad.
- **Terminado cuando:** los tests de componentes y el E2E pasan de forma estable (ejecútalos diez veces seguidas), y el E2E falla si rompes el flujo a propósito.
- **Para entrevistas:** consultar por rol y por texto accesible es la forma que recomienda Testing Library, y conecta tests con accesibilidad, un tema que une frontend y calidad.

#### Ejercicio 8.4: retención de datos y salud en producción

- **Objetivo:** que tu base de datos no crezca sin límite y que puedas saber si el sistema está sano.
- **Conceptos nuevos:** retención y agregación histórica, comprobaciones de salud profundas, logs estructurados.
- **Consigna:**
  - Decide cuánto detalle guardas: por ejemplo, mediciones completas durante 30 días y agregados por hora después. Documenta la decisión y el cálculo del tamaño aproximado.
  - Crea un job programado que agregue y borre lo antiguo en lotes, sin bloquear la API (recuerda el módulo 1) y registrando qué hizo en `IngestionRun` o una tabla equivalente.
  - Amplía `/health` para comprobar también la conexión a la base de datos y devolver 503 si falla.
  - Cambia los logs a formato JSON estructurado con el identificador de petición del 1.4.
- **Terminado cuando:** tras ejecutar el job sobre tus datos de prueba, el número de filas baja a lo esperado, los agregados conservan la información útil y apagar la base de datos hace que `/health` responda 503.
- **Para entrevistas:** «¿Qué pasa cuando tu tabla tiene cien millones de filas?» es una pregunta de escalado muy típica. Tú puedes responder con retención, agregación e índices que ya has probado.

#### Ejercicio 8.5: integración continua

- **Objetivo:** que cada cambio se compruebe automáticamente antes de fusionarse.
- **Conceptos nuevos:** GitHub Actions, servicios en contenedores dentro del CI, cachés de dependencias.
- **Consigna:**
  - Crea un flujo de trabajo de [GitHub Actions](https://docs.github.com/en/actions) que, en cada *pull request*, instale dependencias (con caché), ejecute el chequeo de tipos, el *linter*, los tests y la compilación de `api/` y `web/`.
  - Para los tests de integración, levanta PostgreSQL como servicio dentro del propio flujo.
  - Añade al README la insignia del estado del flujo.
  - Protege la rama principal para exigir que el flujo pase antes de fusionar.
- **Terminado cuando:** abres un PR con un test roto y el flujo se pone rojo y bloquea la fusión; al corregirlo, se pone verde.
- **Para entrevistas:** conocer CI/CD, aunque sea a nivel básico, es esperado en cualquier equipo, y poder mostrar una insignia verde en tu repositorio es una prueba fácil de verificar.

#### Ejercicio 8.6: despliegue del backend y de la base de datos

- **Objetivo:** tu API, tu ETL y tus sockets funcionando en internet sin que tú hagas nada.
- **Conceptos nuevos:** variables de entorno por entorno, migraciones en producción, comprobaciones de salud, cierre ordenado ante reinicios.
- **Consigna:**
  - Elige Railway o Render tras comprobar sus condiciones actuales (en especial, si el plan duerme el servicio) y anota en tu `LEARNING-LOG.md` por qué lo elegiste.
  - Crea la base de datos gestionada y el servicio de la API. Configura las variables de entorno de producción (sin subir secretos al repositorio).
  - Define el comando de arranque de modo que aplique las migraciones con `prisma migrate deploy` antes de iniciar la API.
  - Configura la comprobación de salud con tu `/health`.
  - Ajusta el CORS al dominio real del frontend.
  - Verifica que tu ETL ejecuta en producción y que un reinicio de la plataforma no deja ejecuciones a medias (tu cierre ordenado del 3.5).
- **Terminado cuando:** tras 24 horas sin tocar nada, la base de producción tiene mediciones nuevas de todas tus fuentes y `/api/status` las marca como frescas.
- **Para entrevistas:** haber desplegado un servicio con estado (base de datos), tareas programadas y conexiones persistentes te da muchas historias reales sobre qué falla en producción.

#### Ejercicio 8.7: despliegue del frontend en Vercel

- **Objetivo:** el dashboard público, con tiempo real funcionando.
- **Conceptos nuevos:** variables de entorno públicas y privadas, despliegues de vista previa, `wss://`.
- **Consigna:**
  - Conecta el repositorio a Vercel (indicando que el proyecto está en la carpeta `web/`).
  - Configura `API_URL` (privada) y la URL pública del socket, apuntando a tu backend desplegado.
  - Comprueba que el socket conecta por `wss://` y que el login con cookies funciona en el dominio de producción (revisa tu decisión del módulo 7).
  - Aprovecha los despliegues de vista previa: cada PR tiene su propio enlace. Anota cómo usas ese flujo.
  - Pasa Lighthouse sobre la URL de producción y compara con tus mediciones del 6.8.
- **Terminado cuando:** cualquier persona puede abrir la URL, ver datos en vivo, registrarse, crear una alerta y recibirla, sin hacer nada en local.
- **Para entrevistas:** puedes decir «aquí está en producción, probadlo», y eso pesa más que cualquier descripción. Es la diferencia entre un proyecto de tutorial y uno propio.

#### Ejercicio 8.8: README y caso de estudio

- **Objetivo:** que alguien entienda y valore tu proyecto en menos de un minuto.
- **Conceptos nuevos:** comunicación técnica, diagramas de arquitectura, documentación de decisiones.
- **Consigna:**
  - Escribe el README siguiendo la estructura de la clase 3: frase, demo, GIF, problema, diagrama de arquitectura con Mermaid, decisiones y *trade-offs*, ejecución en local, mejoras futuras y atribución de datos.
  - Graba un GIF o vídeo corto (30–60 s) del dashboard actualizándose en vivo y del flujo de alertas.
  - Escribe tres decisiones de arquitectura (formato breve: contexto, decisión, consecuencias) con la información de tu `LEARNING-LOG.md`.
  - Prepara un guion de 5 minutos para presentarlo en una entrevista: problema, demo, una decisión difícil, algo que saliera mal y qué aprendiste.
  - Opcional: publica un artículo con el caso de estudio y compártelo en LinkedIn.
- **Terminado cuando:** una persona que no es técnica entiende qué es en 30 segundos, y una persona técnica puede entender la arquitectura y probar el proyecto en menos de 5 minutos, sin preguntarte nada.
- **Para entrevistas:** «Háblame de un proyecto del que estés orgullosa» es la pregunta más abierta y más importante. Tu guion de 5 minutos es la respuesta.

#### Ejercicio 8.9: simulacro de entrevista

- **Objetivo:** convertir lo que has hecho en respuestas claras y practicadas.
- **Consigna:**
  - Recopila las preguntas de entrevista de los ejercicios de los módulos 1 a 8 y las 5 preguntas de cada autoevaluación.
  - Responde en voz alta a cada una con un ejemplo de tu proyecto, en dos minutos como máximo.
  - Elige las tres decisiones de CityPulse que cambiarías si empezaras de nuevo y explica por qué (a quien entrevista le gusta oír esto).
  - Pásame tu README y tu guion, y te hago una entrevista simulada con preguntas técnicas y de comportamiento sobre tu propio proyecto.
- **Terminado cuando:** puedes responder a cualquier pregunta de la lista sin mirar tus notas, citando una decisión o un número de tu proyecto.

### Autoevaluación final

1. ¿Qué tests escribirías primero en un proyecto nuevo y por qué?
2. ¿Por qué tu backend no puede vivir en funciones serverless?
3. ¿Qué pasa con tu ETL si el plan de alojamiento duerme el servicio?
4. ¿Qué diferencia hay entre `migrate dev` y `migrate deploy` en un despliegue?
5. ¿Qué tres cosas verá primero alguien que abra tu README?

### Recursos del módulo

- [Vitest](https://vitest.dev), [Playwright](https://playwright.dev) y [Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- [Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests), de Kent C. Dodds.
- [Documentación de GitHub Actions](https://docs.github.com/en/actions).
- [Documentación de Vercel](https://vercel.com/docs), [Railway](https://railway.com) y [Render](https://render.com/docs). Comprueba siempre sus planes y límites actuales.
- [Architecture Decision Records](https://adr.github.io): formato y ejemplos de decisiones documentadas.
- Vídeos: busca «Playwright tutorial» en el canal oficial de Playwright y «GitHub Actions tutorial» para ver un primer flujo de CI paso a paso.
