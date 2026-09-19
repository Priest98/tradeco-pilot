import { getDatabase } from "../db/client";
import { generateDailyBriefing } from "./briefingGenerator";
export function saveDailyBriefing(now=Date.now()) {
  const briefing=generateDailyBriefing(now);
  getDatabase().prepare("INSERT OR IGNORE INTO daily_briefings(id,generated_at,markdown) VALUES (?,?,?)").run(briefing.briefingId,now,briefing.markdownContent);
  return briefing.briefingId;
}
