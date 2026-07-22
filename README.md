# Inventario Textil — Backend

API REST desarrollada en Node.js y Express que centraliza la lógica de negocio del **Sistema de Gestión y Trazabilidad de Inventario de Materia Prima mediante Códigos QR**, un proyecto de grado orientado a digitalizar el control de inventario de una fábrica del sector textil.

Este backend es el componente que conecta la plataforma web administrativa, la aplicación móvil de campo y la base de datos PostgreSQL, aplicando las reglas de negocio, la autenticación y el control de acceso por roles.

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración](#instalación-y-configuración)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Cómo correr el proyecto](#cómo-correr-el-proyecto)
- [Roles de usuario y permisos](#roles-de-usuario-y-permisos)
- [Referencia de la API](#referencia-de-la-api)
- [Estado del proyecto](#estado-del-proyecto)

## Descripción general

El sistema resuelve un problema operativo concreto: una fábrica textil que gestiona cajas de carretes de hilo, clasificadas por color y distribuidas en distintos almacenes, sin un mecanismo automatizado para saber con certeza cuántas cajas hay disponibles, dónde están y qué movimientos se han realizado.

Este backend expone una API REST que permite:

- Registrar el ingreso de cajas, generando un código QR único por cada una.
- Registrar la salida de cajas mediante el escaneo de su código QR (individual o por lote).
- Consultar el inventario disponible en tiempo real, con filtros por almacén y color.
- Consultar el historial completo de movimientos, con filtros por almacén y fecha.
- Consultar la información de una caja específica a partir de su código QR.
- Gestionar usuarios del sistema y sus roles (alta, edición, activación/desactivación, regeneración de contraseña).
- Autenticar usuarios mediante JWT y autorizar cada operación según el rol del usuario.

## Arquitectura del sistema

El proyecto completo está compuesto por cuatro piezas independientes que se comunican exclusivamente a través de esta API:

```
┌─────────────────────┐      ┌─────────────────────┐
│  Plataforma Web      │      │  Aplicación Móvil    │
│  (React)             │      │  (Flutter)           │
└──────────┬───────────┘      └───────────┬──────────┘
           │              REST API              │
           └───────────────┬───────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │   Backend (este     │
                  │   repositorio)      │
                  │   Node.js + Express │
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │   PostgreSQL        │
                  └─────────────────────┘
```

Ni la plataforma web ni la aplicación móvil acceden directamente a la base de datos: toda la comunicación pasa por este backend, que es quien aplica las reglas de negocio, genera los códigos QR y garantiza que la información esté siempre actualizada y sea consistente entre ambos clientes.

## Tecnologías utilizadas

| Categoría | Tecnología |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Base de datos | PostgreSQL (vía `pg`) |
| Autenticación | JSON Web Tokens (`jsonwebtoken`) |
| Hash de contraseñas | `bcrypt` |
| Generación de códigos QR | `qrcode` |
| Identificadores únicos | `uuid` |
| CORS | `cors` |
| Variables de entorno | `dotenv` |
| Recarga en desarrollo | `nodemon` |

## Requisitos previos

- Node.js 18 o superior.
- PostgreSQL 13 o superior, instalado y corriendo localmente (o accesible por red).
- npm.

## Instalación y configuración

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone <url-del-repositorio>
cd inventario-textil
npm install
```

### 2. Configurar la base de datos

Crea una base de datos en PostgreSQL y ejecuta el siguiente script para crear las tablas necesarias:

```sql
-- Almacenes
CREATE TABLE almacenes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

INSERT INTO almacenes (nombre) VALUES
('Almacén 1'),
('Almacén 2'),
('Almacén 3');

-- Cajas de materia prima
CREATE TABLE cajas (
    id SERIAL PRIMARY KEY,
    codigo_color VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    id_almacen INT REFERENCES almacenes(id),
    estado VARCHAR(20) DEFAULT 'DISPONIBLE',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    codigo_unico VARCHAR(100) UNIQUE
);

-- Movimientos (una fila por caja, para trazabilidad individual)
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(10) NOT NULL, -- ENTRADA / SALIDA
    codigo_color VARCHAR(50),
    cantidad INT,
    id_almacen INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    caja_id INT NOT NULL REFERENCES cajas(id) ON DELETE RESTRICT
);

CREATE INDEX idx_movimientos_caja_id ON movimientos(caja_id);

-- Usuarios del sistema
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    celular VARCHAR(20) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ALMACEN', 'ADMINISTRATIVO', 'ADMIN')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Crear el primer usuario administrador

Como no existe un endpoint público de registro (los usuarios se crean únicamente por un administrador ya autenticado), el primer usuario `ADMIN` debe insertarse manualmente. Genera el hash de la contraseña con Node:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('TU_CONTRASEÑA', 10).then(hash => console.log(hash));"
```

Y con el hash resultante, inserta el usuario:

```sql
INSERT INTO usuarios (nombre_completo, email, password_hash, celular, rol)
VALUES ('Nombre Apellido', 'correo@ejemplo.com', '<hash_generado>', '00000000', 'ADMIN');
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
PORT=3000

DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventario_textil

JWT_SECRET=una_cadena_larga_y_aleatoria
```

Para generar un valor seguro para `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Estructura de carpetas

```
inventario-textil/
├── index.js                          # Punto de entrada del servidor
├── src/
│   ├── app.js                        # Configuración de Express y montaje de rutas
│   ├── db/
│   │   └── index.js                  # Pool de conexión a PostgreSQL
│   ├── controllers/
│   │   ├── inventario.controller.js  # Lógica de cajas, movimientos, almacenes, colores
│   │   ├── auth.controller.js        # Login
│   │   └── usuarios.controller.js    # Gestión de usuarios (CRUD, roles, contraseñas)
│   ├── routes/
│   │   ├── inventario.routes.js
│   │   ├── auth.routes.js
│   │   └── usuarios.routes.js
│   └── middlewares/
│       ├── errorHandler.js           # Manejo centralizado de errores
│       ├── auth.middleware.js        # Verificación de JWT
│       └── rol.middleware.js         # Verificación de rol por ruta
├── package.json
└── .env                              # No versionado
```

## Cómo correr el proyecto

```bash
npm run dev
```

El servidor queda disponible en `http://localhost:3000`. Todas las rutas de la API están prefijadas con `/api`.

Para acceder desde un dispositivo físico en la misma red local (necesario para probar la aplicación móvil), reemplaza `localhost` por la dirección IP local de la máquina donde corre el backend, y asegúrate de que el firewall permita conexiones entrantes al puerto configurado.

## Roles de usuario y permisos

El sistema define tres roles, cada uno con acceso restringido a las rutas que le corresponden:

| Rol | Descripción | Puede registrar entradas/salidas | Puede consultar inventario/historial | Puede gestionar usuarios |
|---|---|:---:|:---:|:---:|
| `ALMACEN` | Personal de almacén y operaciones. Registra el flujo físico de cajas. | ✅ | ✅ | ❌ |
| `ADMINISTRATIVO` | Personal administrativo. Supervisa el inventario desde la plataforma web, sin operar físicamente. | ❌ | ✅ | ❌ |
| `ADMIN` | Administrador del sistema. Control total, incluida la gestión de usuarios. | ✅ | ✅ | ✅ |

Todas las rutas protegidas requieren un token JWT válido en el header:

```
Authorization: Bearer <token>
```

El token se obtiene mediante `POST /api/login` y tiene una vigencia de 12 horas.

## Referencia de la API

### Autenticación

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/api/login` | Inicia sesión y devuelve un JWT | Público |

### Inventario y movimientos

| Método | Ruta | Descripción | Roles permitidos |
|---|---|---|---|
| POST | `/api/entrada` | Registra el ingreso de N cajas y genera su QR | `ALMACEN`, `ADMIN` |
| POST | `/api/salida` | Registra salida manual (sin escaneo) por color/almacén | `ALMACEN`, `ADMIN` |
| POST | `/api/escanear` | Consulta los datos de una caja por su código QR | `ALMACEN`, `ADMINISTRATIVO`, `ADMIN` |
| POST | `/api/salida-qr` | Registra la salida de una sola caja escaneada | `ALMACEN`, `ADMIN` |
| POST | `/api/salida-multiple-qr` | Registra la salida de varias cajas escaneadas | `ALMACEN`, `ADMIN` |
| GET | `/api/inventario` | Resumen de stock disponible (filtros: `almacen`, `color`) | `ALMACEN`, `ADMINISTRATIVO`, `ADMIN` |
| GET | `/api/buscar` | Búsqueda de cajas por código o color | `ALMACEN`, `ADMINISTRATIVO`, `ADMIN` |
| GET | `/api/historial` | Historial de movimientos (filtros: `almacen`, `fecha`) | `ALMACEN`, `ADMINISTRATIVO`, `ADMIN` |
| GET | `/api/almacenes` | Lista de almacenes | `ALMACEN`, `ADMINISTRATIVO`, `ADMIN` |
| GET | `/api/colores` | Colores con stock disponible | `ALMACEN`, `ADMINISTRATIVO`, `ADMIN` |

### Gestión de usuarios

| Método | Ruta | Descripción | Roles permitidos |
|---|---|---|---|
| GET | `/api/usuarios` | Lista todos los usuarios | `ADMIN` |
| POST | `/api/usuarios` | Crea un usuario (genera contraseña aleatoria) | `ADMIN` |
| PUT | `/api/usuarios/:id` | Edita nombre, email, celular y rol | `ADMIN` |
| PATCH | `/api/usuarios/:id/estado` | Activa o desactiva un usuario | `ADMIN` |
| PATCH | `/api/usuarios/:id/password` | Regenera la contraseña de un usuario | `ADMIN` |

## Estado del proyecto

- ✅ Trazabilidad de movimientos a nivel de caja individual.
- ✅ Generación de códigos QR únicos por caja.
- ✅ Autenticación JWT y control de acceso por rol.
- ✅ Gestión completa de usuarios.
- ✅ Filtros de consulta por almacén, color y fecha.
- 🔲 Integración con impresoras térmicas para impresión directa de QR (planificado, sin desarrollar).
- 🔲 Reportes exportables desde la plataforma web.

---

Vidaurre Mejia Christian Paul — Ingeniería en Ciencias de la Computación — Universidad Mayor Real y Pontificia de San Francisco Xavier de Chuquisaca.