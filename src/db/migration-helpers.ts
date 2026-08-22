import { QueryRunner } from "typeorm";

export async function createEnum(
  queryRunner: QueryRunner,
  name: string,
  values: readonly string[],
): Promise<void> {
  const list = values.map((value) => `'${value}'`).join(", ");
  await queryRunner.query(
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN CREATE TYPE "${name}" AS ENUM (${list}); END IF; END $$;`,
  );
}
 
export async function dropEnum(
  queryRunner: QueryRunner,
  name: string,
): Promise<void> {
  await queryRunner.query(`DROP TYPE IF EXISTS "${name}"`);
}
