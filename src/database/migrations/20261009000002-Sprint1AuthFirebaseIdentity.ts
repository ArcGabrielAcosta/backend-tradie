import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addColumnIfMissing,
  dropNotNullIfNeeded,
} from './utils/idempotent';

/**
 * Sprint 1 — Firebase identity extensions on `usuario`.
 *
 * Runs AFTER InitialSchema. Idempotent: safe if columns already exist
 * (e.g. DB previously provisioned with TYPEORM_SYNC).
 *
 * Changes:
 * - firebase_uid, nombre_completo, telefono
 * - intentos_login_fallidos, bloqueado_hasta (login lockout)
 * - password_hash becomes nullable (Firebase owns credentials)
 */
export class Sprint1AuthFirebaseIdentity20261009000002
  implements MigrationInterface
{
  name = 'Sprint1AuthFirebaseIdentity20261009000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      queryRunner,
      'usuario',
      'firebase_uid',
      'VARCHAR(128)',
    );
    await addColumnIfMissing(
      queryRunner,
      'usuario',
      'nombre_completo',
      'VARCHAR(150)',
    );
    await addColumnIfMissing(
      queryRunner,
      'usuario',
      'telefono',
      'VARCHAR(30)',
    );
    await addColumnIfMissing(
      queryRunner,
      'usuario',
      'intentos_login_fallidos',
      'INT NOT NULL DEFAULT 0',
    );
    await addColumnIfMissing(
      queryRunner,
      'usuario',
      'bloqueado_hasta',
      'TIMESTAMPTZ',
    );

    await dropNotNullIfNeeded(queryRunner, 'usuario', 'password_hash');

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_firebase_uid
        ON usuario (firebase_uid)
        WHERE firebase_uid IS NOT NULL;
    `);

    // Deduplicate unique constraint name if a previous sync created another one.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'uq_usuario_firebase_uid'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'usuario' AND column_name = 'firebase_uid'
        ) THEN
          BEGIN
            ALTER TABLE usuario
              ADD CONSTRAINT uq_usuario_firebase_uid UNIQUE (firebase_uid);
          EXCEPTION
            WHEN duplicate_table THEN NULL;
            WHEN duplicate_object THEN NULL;
            WHEN unique_violation THEN NULL;
          END;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuario DROP CONSTRAINT IF EXISTS uq_usuario_firebase_uid;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_usuario_firebase_uid;
    `);

    await queryRunner.query(`
      ALTER TABLE usuario
        DROP COLUMN IF EXISTS firebase_uid,
        DROP COLUMN IF EXISTS nombre_completo,
        DROP COLUMN IF EXISTS telefono,
        DROP COLUMN IF EXISTS intentos_login_fallidos,
        DROP COLUMN IF EXISTS bloqueado_hasta;
    `);

    // Restore NOT NULL only when every row has a password_hash value.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM usuario WHERE password_hash IS NULL
        ) THEN
          ALTER TABLE usuario
            ALTER COLUMN password_hash SET NOT NULL;
        END IF;
      END $$;
    `);
  }
}
