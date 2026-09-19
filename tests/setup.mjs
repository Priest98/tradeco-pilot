import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DATA_DIR=mkdtempSync(join(tmpdir(),"tradeco-test-"));
process.env.DATABASE_NAME="test.db";
process.env.DISABLE_SCHEDULERS="1";
