import { QueryRunner } from 'typeorm';

/** Create a PostgreSQL ENUM type if it does not already exist. */
export async function createEnumType(
  queryRunner: QueryRunner,
  typeName: string,
  values: string[],
): Promise<void> {
  const quotedValues = values.map((value) => `'${value}'`).join(', ');
  await queryRunner.query(`
    DO $$ BEGIN
      CREATE TYPE ${typeName} AS ENUM (${quotedValues});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

/** Drop a type if it exists (used by down migrations). */
export async function dropTypeIfExists(
  queryRunner: QueryRunner,
  typeName: string,
): Promise<void> {
  await queryRunner.query(`DROP TYPE IF EXISTS ${typeName};`);
}

/** Add a named constraint only when missing. */
export async function addConstraintIfMissing(
  queryRunner: QueryRunner,
  tableName: string,
  constraintName: string,
  definitionSql: string,
): Promise<void> {
  await queryRunner.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${constraintName}'
      ) THEN
        ALTER TABLE ${tableName}
          ADD CONSTRAINT ${constraintName} ${definitionSql};
      END IF;
    END $$;
  `);
}

/** Make a column nullable if it currently is NOT NULL. */
export async function dropNotNullIfNeeded(
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string,
): Promise<void> {
  await queryRunner.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_name = '${columnName}'
          AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE ${tableName}
          ALTER COLUMN ${columnName} DROP NOT NULL;
      END IF;
    END $$;
  `);
}

/** Add a column only when missing. */
export async function addColumnIfMissing(
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string,
  columnDefinition: string,
): Promise<void> {
  await queryRunner.query(`
    ALTER TABLE ${tableName}
      ADD COLUMN IF NOT EXISTS ${columnName} ${columnDefinition};
  `);
}
