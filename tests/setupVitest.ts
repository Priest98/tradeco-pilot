import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { closeDatabase } from "../src/server/db/client";
process.env.DATA_DIR=mkdtempSync(join(tmpdir(),"tradeco-unit-"));
process.env.DATABASE_NAME="test.db";
process.env.DISABLE_SCHEDULERS="1";
afterAll(closeDatabase);
