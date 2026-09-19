import { cpSync } from "node:fs";
cpSync("node_modules/cesium/Build/Cesium", "public/cesium", { recursive: true });
