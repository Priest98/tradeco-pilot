import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({resolve:{alias:{"@":path.resolve("src")}},test:{include:["tests/**/*.test.ts"],setupFiles:["./tests/setupVitest.ts"],fileParallelism:false}});
