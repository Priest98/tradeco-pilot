export async function register() {
  if(process.env.NEXT_RUNTIME!=="nodejs" || process.env.VERCEL || process.env.NEXT_PHASE==="phase-production-build" || process.env.DISABLE_SCHEDULERS==="1")return;
  const state=globalThis as typeof globalThis & { intelligenceTimers?: ReturnType<typeof setInterval>[] };
  if(state.intelligenceTimers)return;
  const {ingestorRegistry}=await import("./server/ingestors/registry");
  const {saveDailyBriefing}=await import("./server/intelligence/briefingSchedule");
  ingestorRegistry.startSchedulers();
  const timer=setInterval(()=>{if(new Date().getUTCHours()===6){try{saveDailyBriefing();}catch{console.error("Scheduled briefing failed");}}},60000);
  timer.unref();state.intelligenceTimers=[timer];
}
