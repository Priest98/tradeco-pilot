"use client";
type CesiumModule = typeof import("cesium");
type CesiumWindow = Window & { Cesium?: CesiumModule; CESIUM_BASE_URL?: string };
let loading: Promise<CesiumModule> | undefined;
/** Use the vendor browser build so Next does not rewrite Cesium's embedded worker sources. */
export function loadCesium(): Promise<CesiumModule> {
  const browser = window as CesiumWindow;
  if (browser.Cesium) return Promise.resolve(browser.Cesium);
  if (loading) return loading;
  browser.CESIUM_BASE_URL = "/cesium/";
  loading = new Promise<CesiumModule>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/cesium/Cesium.js";
    script.async = true;
    script.onload = () => browser.Cesium ? resolve(browser.Cesium) : reject(new Error("Cesium runtime unavailable"));
    script.onerror = () => { script.remove(); reject(new Error("Cesium assets unavailable")); };
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}
