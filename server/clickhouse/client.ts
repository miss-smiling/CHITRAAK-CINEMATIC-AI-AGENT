import { createClient } from "@clickhouse/client";
import "dotenv/config";

export const clickhouse = createClient({
  url: `https://${process.env.CH_HOST}:${process.env.CH_PORT || 8443}`,
  username: process.env.CH_USER,
  password: process.env.CH_PASSWORD,
  database: process.env.CH_DATABASE,
});