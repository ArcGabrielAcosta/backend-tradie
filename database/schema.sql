-- Tradie — Modelo lógico / DDL (estado actual tras migraciones)
-- Motor: PostgreSQL 16 + PostGIS 3.4
-- Fuente: .workflows/10-modelado/03-modelo-logico.md + Excalidraw
--
-- Historial de migraciones TypeORM:
--   20261009000001-InitialSchema              → DDL de dominio completo
--   20261009000002-Sprint1AuthFirebaseIdentity → columnas Firebase / lockout en usuario
--
-- Preferir: npm run migration:run
-- Este archivo es la referencia DDL legible; las migraciones son la vía canónica.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Enums de dominio
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('cliente', 'profesional', 'admin');
CREATE TYPE user_status AS ENUM ('activo', 'suspendido', 'bloqueado');
CREATE TYPE validation_status AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE availability_status AS ENUM ('disponible', 'en_servicio', 'no_disponible');
CREATE TYPE request_status AS ENUM ('abierta', 'cerrada', 'cancelada');
CREATE TYPE quote_status AS ENUM ('enviado', 'aceptado', 'rechazado');
CREATE TYPE service_status AS ENUM ('acordado', 'en_curso', 'finalizado');
CREATE TYPE sub_status AS ENUM ('activa', 'cancelada', 'vencida');
CREATE TYPE payment_status AS ENUM ('pendiente', 'aprobado', 'fallido', 'reembolsado');
CREATE TYPE report_status AS ENUM ('abierto', 'en_revision', 'resuelto', 'descartado');

-- ---------------------------------------------------------------------------
-- 1. Identidad y perfil
-- ---------------------------------------------------------------------------

CREATE TABLE usuario (
  id_usuario               BIGSERIAL PRIMARY KEY,
  firebase_uid             VARCHAR(128) UNIQUE,              -- Sprint 1
  email                    VARCHAR(150) NOT NULL UNIQUE,
  nombre_completo          VARCHAR(150),                     -- Sprint 1
  telefono                 VARCHAR(30),                      -- Sprint 1
  -- Nullable desde Sprint 1: credenciales en Firebase Auth
  password_hash            VARCHAR(255),
  rol                      user_role NOT NULL,
  estado                   user_status NOT NULL DEFAULT 'activo',
  intentos_login_fallidos  INT NOT NULL DEFAULT 0,            -- Sprint 1
  bloqueado_hasta          TIMESTAMPTZ,                      -- Sprint 1
  fecha_alta               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usuario_firebase_uid
  ON usuario (firebase_uid)
  WHERE firebase_uid IS NOT NULL;

CREATE TABLE perfil_profesional (
  id_perfil                 BIGSERIAL PRIMARY KEY,
  id_usuario                BIGINT NOT NULL UNIQUE
                              REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  zona_trabajo              VARCHAR(100),
  descripcion               TEXT,
  reputacion                NUMERIC(3, 2) NOT NULL DEFAULT 0
                              CHECK (reputacion >= 0 AND reputacion <= 5),
  estado_validacion         validation_status NOT NULL DEFAULT 'pendiente',
  disponibilidad            availability_status NOT NULL DEFAULT 'no_disponible',
  ubicacion                 GEOGRAPHY(POINT, 4326),
  ubicacion_actualizada_en  TIMESTAMPTZ
);

CREATE INDEX idx_perfil_ubicacion_gist
  ON perfil_profesional
  USING GIST (ubicacion);

CREATE INDEX idx_perfil_disponibilidad
  ON perfil_profesional (disponibilidad)
  WHERE estado_validacion = 'aprobado';

-- ---------------------------------------------------------------------------
-- 2. Catálogo, documentos y portfolio
-- ---------------------------------------------------------------------------

CREATE TABLE categoria_oficio (
  id_categoria  BIGSERIAL PRIMARY KEY,
  nombre        VARCHAR(80) NOT NULL UNIQUE,
  descripcion   TEXT,
  activa        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE perfil_categoria (
  id_perfil     BIGINT NOT NULL
                  REFERENCES perfil_profesional (id_perfil) ON DELETE CASCADE,
  id_categoria  BIGINT NOT NULL
                  REFERENCES categoria_oficio (id_categoria) ON DELETE RESTRICT,
  PRIMARY KEY (id_perfil, id_categoria)
);

CREATE TABLE documento_respaldo (
  id_documento      BIGSERIAL PRIMARY KEY,
  id_perfil         BIGINT NOT NULL
                      REFERENCES perfil_profesional (id_perfil) ON DELETE CASCADE,
  tipo              VARCHAR(40) NOT NULL,
  url_archivo       VARCHAR(500) NOT NULL,
  estado_revision   VARCHAR(20) NOT NULL DEFAULT 'pendiente'
);

CREATE TABLE item_portfolio (
  id_item       BIGSERIAL PRIMARY KEY,
  id_perfil     BIGINT NOT NULL
                  REFERENCES perfil_profesional (id_perfil) ON DELETE CASCADE,
  url_foto      VARCHAR(500) NOT NULL,
  descripcion   TEXT,
  fecha_alta    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. Ciclo de contratación
-- ---------------------------------------------------------------------------

CREATE TABLE solicitud_trabajo (
  id_solicitud       BIGSERIAL PRIMARY KEY,
  id_cliente         BIGINT NOT NULL
                       REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  id_categoria       BIGINT NOT NULL
                       REFERENCES categoria_oficio (id_categoria) ON DELETE RESTRICT,
  titulo             VARCHAR(120) NOT NULL,
  descripcion        TEXT NOT NULL,
  zona               VARCHAR(100),
  estado             request_status NOT NULL DEFAULT 'abierta',
  fecha_publicacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  punto_servicio     GEOGRAPHY(POINT, 4326)
);

CREATE INDEX idx_solicitud_cliente ON solicitud_trabajo (id_cliente);
CREATE INDEX idx_solicitud_categoria_estado ON solicitud_trabajo (id_categoria, estado);
CREATE INDEX idx_solicitud_punto_gist
  ON solicitud_trabajo
  USING GIST (punto_servicio);

CREATE TABLE presupuesto (
  id_presupuesto   BIGSERIAL PRIMARY KEY,
  id_solicitud     BIGINT NOT NULL
                     REFERENCES solicitud_trabajo (id_solicitud) ON DELETE CASCADE,
  id_profesional   BIGINT NOT NULL
                     REFERENCES perfil_profesional (id_perfil) ON DELETE RESTRICT,
  monto            NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  alcance          TEXT,
  condiciones      TEXT,
  estado           quote_status NOT NULL DEFAULT 'enviado',
  fecha_envio      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_solicitud, id_profesional)
);

CREATE INDEX idx_presupuesto_solicitud ON presupuesto (id_solicitud);
CREATE INDEX idx_presupuesto_profesional ON presupuesto (id_profesional);

CREATE TABLE servicio (
  id_servicio      BIGSERIAL PRIMARY KEY,
  id_presupuesto   BIGINT NOT NULL UNIQUE
                     REFERENCES presupuesto (id_presupuesto) ON DELETE RESTRICT,
  fecha_acuerdo    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado           service_status NOT NULL DEFAULT 'acordado',
  fecha_inicio     TIMESTAMPTZ,
  fecha_fin        TIMESTAMPTZ
);

CREATE TABLE voucher (
  id_voucher      BIGSERIAL PRIMARY KEY,
  id_servicio     BIGINT NOT NULL UNIQUE
                    REFERENCES servicio (id_servicio) ON DELETE CASCADE,
  codigo          VARCHAR(40) NOT NULL UNIQUE,
  fecha_emision   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  datos_pedido    JSONB
);

CREATE TABLE calificacion (
  id_calificacion  BIGSERIAL PRIMARY KEY,
  id_servicio      BIGINT NOT NULL UNIQUE
                     REFERENCES servicio (id_servicio) ON DELETE CASCADE,
  id_cliente       BIGINT NOT NULL
                     REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  puntaje          SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario       TEXT,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversacion (
  id_conversacion  BIGSERIAL PRIMARY KEY,
  id_solicitud     BIGINT NOT NULL UNIQUE
                     REFERENCES solicitud_trabajo (id_solicitud) ON DELETE CASCADE,
  id_cliente       BIGINT NOT NULL
                     REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  id_profesional   BIGINT NOT NULL
                     REFERENCES perfil_profesional (id_perfil) ON DELETE RESTRICT,
  estado           VARCHAR(20) NOT NULL DEFAULT 'activa',
  fecha_inicio     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mensaje (
  id_mensaje        BIGSERIAL PRIMARY KEY,
  id_conversacion   BIGINT NOT NULL
                      REFERENCES conversacion (id_conversacion) ON DELETE CASCADE,
  id_emisor         BIGINT NOT NULL
                      REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  contenido         TEXT NOT NULL,
  fecha_envio       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  leido             BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_mensaje_conversacion_fecha
  ON mensaje (id_conversacion, fecha_envio);

-- ---------------------------------------------------------------------------
-- 4. Suscripción, pagos y reportes
-- ---------------------------------------------------------------------------

CREATE TABLE plan_suscripcion (
  id_plan      BIGSERIAL PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL UNIQUE,
  precio       NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
  beneficios   TEXT,
  activo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE suscripcion (
  id_suscripcion  BIGSERIAL PRIMARY KEY,
  id_usuario      BIGINT NOT NULL
                    REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  id_plan         BIGINT NOT NULL
                    REFERENCES plan_suscripcion (id_plan) ON DELETE RESTRICT,
  fecha_inicio    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_fin       TIMESTAMPTZ,
  estado          sub_status NOT NULL DEFAULT 'activa'
);

CREATE INDEX idx_suscripcion_usuario ON suscripcion (id_usuario);

CREATE TABLE pago (
  id_pago          BIGSERIAL PRIMARY KEY,
  id_suscripcion   BIGINT NOT NULL
                     REFERENCES suscripcion (id_suscripcion) ON DELETE RESTRICT,
  monto            NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  fecha            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado           payment_status NOT NULL DEFAULT 'pendiente',
  referencia       VARCHAR(100)
);

CREATE TABLE devolucion (
  id_devolucion  BIGSERIAL PRIMARY KEY,
  id_pago        BIGINT NOT NULL UNIQUE
                   REFERENCES pago (id_pago) ON DELETE RESTRICT,
  motivo         TEXT NOT NULL,
  monto          NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente'
);

CREATE TABLE reporte (
  id_reporte      BIGSERIAL PRIMARY KEY,
  id_reportante   BIGINT NOT NULL
                    REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  id_reportado    BIGINT NOT NULL
                    REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  motivo          TEXT NOT NULL,
  estado          report_status NOT NULL DEFAULT 'abierto',
  fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id_reportante <> id_reportado)
);

-- ---------------------------------------------------------------------------
-- Consulta de referencia: profesionales cercanos (radio 10 km)
-- ---------------------------------------------------------------------------
-- SELECT p.*
-- FROM perfil_profesional p
-- WHERE p.estado_validacion = 'aprobado'
--   AND p.disponibilidad = 'disponible'
--   AND p.ubicacion IS NOT NULL
--   AND ST_DWithin(
--         p.ubicacion,
--         ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
--         10000
--       )
-- ORDER BY p.ubicacion <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography;
