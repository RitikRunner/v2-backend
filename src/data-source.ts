import { DataSource } from "typeorm";
import { env } from "./config/env";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  synchronize: false,
  logging: env.NODE_ENV === "development",
  entities: ["src/entities/**/*.ts"],
  migrations: ["src/migration/**/*.ts"],
});
