import { NextResponse } from "next/server";
import { verifySystemKey } from "@/server/security/auth";
import { saveDailyBriefing } from "@/server/intelligence/briefingSchedule";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  if(!verifySystemKey(request.headers.get("authorization")?.replace(/^Bearer /,"") || null,process.env.CRON_SECRET))return NextResponse.json({error:"Unauthorized"},{status:401});
  try{return NextResponse.json({id:saveDailyBriefing()});}catch{return NextResponse.json({error:"Scheduled briefing failed"},{status:503});}
}
