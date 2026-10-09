import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  createEnumType,
  dropTypeIfExists,
} from './utils/idempotent';

/**
 * Initial Tradie schema from the logical model.
 * Source of truth: database/schema.sql + .workflows/10-modelado/03-modelo-logico.md
 *
 * Creates the full domain DDL (enums, tables, indexes, FKs).
 * Idempotent: safe to re-run on a partially provisioned database.
 *
 * Sprint 1 Firebase identity columns are applied by a later migration.
 */
export class InitialSchema20261009000001 implements MigrationInterface {
  name = 'InitialSchema20261009000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // Enums
    await createEnumType(queryRunner, 'user_role', [
      'cliente',
      'profesional',
      'admin',
    ]);
    await createEnumType(queryRunner, 'user_status', [
      'activo',
      'suspendido',
      'bloqueado',
    ]);
    await createEnumType(queryRunner, 'validation_status', [
      'pendiente',
      'aprobado',
      'rechazado',
    ]);
    await createEnumType(queryRunner, 'availability_status', [
      'disponible',
      'en_servicio',
      'no_disponible',
    ]);
    await createEnumType(queryRunner, 'request_status', [
      'abierta',
      'cerrada',
      'cancelada',
    ]);
    await createEnumType(queryRunner, 'quote_status', [
      'enviado',
      'aceptado',
      'rechazado',
    ]);
    await createEnumType(queryRunner, 'service_status', [
      'acordado',
      'en_curso',
      'finalizado',
    ]);
    await createEnumType(queryRunner, 'sub_status', [
      'activa',
      'cancelada',
      'vencida',
    ]);
    await createEnumType(queryRunner, 'payment_status', [
      'pendiente',
      'aprobado',
      'fallido',
      'reembolsado',
    ]);
    await createEnumType(queryRunner, 'report_status', [
      'abierto',
      'en_revision',
      'resuelto',
      'descartado',
    ]);

    // 1. Identidad y perfil
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id_usuario           BIGSERIAL PRIMARY KEY,
        email                VARCHAR(150) NOT NULL UNIQUE,
        password_hash        VARCHAR(255) NOT NULL,
        rol                  user_role NOT NULL,
        estado               user_status NOT NULL DEFAULT 'activo',
        fecha_alta           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fecha_actualizacion  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS perfil_profesional (
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
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_perfil_ubicacion_gist
        ON perfil_profesional
        USING GIST (ubicacion);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_perfil_disponibilidad
        ON perfil_profesional (disponibilidad)
        WHERE estado_validacion = 'aprobado';
    `);

    // 2. Catálogo, documentos y portfolio
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categoria_oficio (
        id_categoria  BIGSERIAL PRIMARY KEY,
        nombre        VARCHAR(80) NOT NULL UNIQUE,
        descripcion   TEXT,
        activa        BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS perfil_categoria (
        id_perfil     BIGINT NOT NULL
                        REFERENCES perfil_profesional (id_perfil) ON DELETE CASCADE,
        id_categoria  BIGINT NOT NULL
                        REFERENCES categoria_oficio (id_categoria) ON DELETE RESTRICT,
        PRIMARY KEY (id_perfil, id_categoria)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS documento_respaldo (
        id_documento      BIGSERIAL PRIMARY KEY,
        id_perfil         BIGINT NOT NULL
                            REFERENCES perfil_profesional (id_perfil) ON DELETE CASCADE,
        tipo              VARCHAR(40) NOT NULL,
        url_archivo       VARCHAR(500) NOT NULL,
        estado_revision   VARCHAR(20) NOT NULL DEFAULT 'pendiente'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS item_portfolio (
        id_item       BIGSERIAL PRIMARY KEY,
        id_perfil     BIGINT NOT NULL
                        REFERENCES perfil_profesional (id_perfil) ON DELETE CASCADE,
        url_foto      VARCHAR(500) NOT NULL,
        descripcion   TEXT,
        fecha_alta    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Ciclo de contratación
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS solicitud_trabajo (
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
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_solicitud_cliente
        ON solicitud_trabajo (id_cliente);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_solicitud_categoria_estado
        ON solicitud_trabajo (id_categoria, estado);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_solicitud_punto_gist
        ON solicitud_trabajo
        USING GIST (punto_servicio);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS presupuesto (
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
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_presupuesto_solicitud
        ON presupuesto (id_solicitud);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_presupuesto_profesional
        ON presupuesto (id_profesional);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS servicio (
        id_servicio      BIGSERIAL PRIMARY KEY,
        id_presupuesto   BIGINT NOT NULL UNIQUE
                           REFERENCES presupuesto (id_presupuesto) ON DELETE RESTRICT,
        fecha_acuerdo    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        estado           service_status NOT NULL DEFAULT 'acordado',
        fecha_inicio     TIMESTAMPTZ,
        fecha_fin        TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS voucher (
        id_voucher      BIGSERIAL PRIMARY KEY,
        id_servicio     BIGINT NOT NULL UNIQUE
                          REFERENCES servicio (id_servicio) ON DELETE CASCADE,
        codigo          VARCHAR(40) NOT NULL UNIQUE,
        fecha_emision   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        datos_pedido    JSONB
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS calificacion (
        id_calificacion  BIGSERIAL PRIMARY KEY,
        id_servicio      BIGINT NOT NULL UNIQUE
                           REFERENCES servicio (id_servicio) ON DELETE CASCADE,
        id_cliente       BIGINT NOT NULL
                           REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
        puntaje          SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
        comentario       TEXT,
        fecha            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS conversacion (
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
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mensaje (
        id_mensaje        BIGSERIAL PRIMARY KEY,
        id_conversacion   BIGINT NOT NULL
                            REFERENCES conversacion (id_conversacion) ON DELETE CASCADE,
        id_emisor         BIGINT NOT NULL
                            REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
        contenido         TEXT NOT NULL,
        fecha_envio       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        leido             BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_mensaje_conversacion_fecha
        ON mensaje (id_conversacion, fecha_envio);
    `);

    // 4. Suscripción, pagos y reportes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plan_suscripcion (
        id_plan      BIGSERIAL PRIMARY KEY,
        nombre       VARCHAR(80) NOT NULL UNIQUE,
        precio       NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
        beneficios   TEXT,
        activo       BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS suscripcion (
        id_suscripcion  BIGSERIAL PRIMARY KEY,
        id_usuario      BIGINT NOT NULL
                          REFERENCES usuario (id_usuario) ON DELETE CASCADE,
        id_plan         BIGINT NOT NULL
                          REFERENCES plan_suscripcion (id_plan) ON DELETE RESTRICT,
        fecha_inicio    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fecha_fin       TIMESTAMPTZ,
        estado          sub_status NOT NULL DEFAULT 'activa'
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_suscripcion_usuario
        ON suscripcion (id_usuario);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pago (
        id_pago          BIGSERIAL PRIMARY KEY,
        id_suscripcion   BIGINT NOT NULL
                           REFERENCES suscripcion (id_suscripcion) ON DELETE RESTRICT,
        monto            NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
        fecha            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        estado           payment_status NOT NULL DEFAULT 'pendiente',
        referencia       VARCHAR(100)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS devolucion (
        id_devolucion  BIGSERIAL PRIMARY KEY,
        id_pago        BIGINT NOT NULL UNIQUE
                         REFERENCES pago (id_pago) ON DELETE RESTRICT,
        motivo         TEXT NOT NULL,
        monto          NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
        estado         VARCHAR(20) NOT NULL DEFAULT 'pendiente'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reporte (
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
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS reporte CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS devolucion CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pago CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS suscripcion CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS plan_suscripcion CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS mensaje CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS conversacion CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS calificacion CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS voucher CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS servicio CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS presupuesto CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS solicitud_trabajo CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS item_portfolio CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS documento_respaldo CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS perfil_categoria CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS categoria_oficio CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS perfil_profesional CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS usuario CASCADE;`);

    await dropTypeIfExists(queryRunner, 'report_status');
    await dropTypeIfExists(queryRunner, 'payment_status');
    await dropTypeIfExists(queryRunner, 'sub_status');
    await dropTypeIfExists(queryRunner, 'service_status');
    await dropTypeIfExists(queryRunner, 'quote_status');
    await dropTypeIfExists(queryRunner, 'request_status');
    await dropTypeIfExists(queryRunner, 'availability_status');
    await dropTypeIfExists(queryRunner, 'validation_status');
    await dropTypeIfExists(queryRunner, 'user_status');
    await dropTypeIfExists(queryRunner, 'user_role');
  }
}
