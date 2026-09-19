import { NextResponse } from "next/server";
import { generateDailyBriefing } from "@/server/intelligence/briefingGenerator";
import { briefingPdf } from "@/server/intelligence/briefingPdf";
export const dynamic="force-dynamic";
export async function GET(request: Request) {
  try {
    const brief=generateDailyBriefing();
    const format=new URL(request.url).searchParams.get("format");
    if(format==="markdown")return new Response(brief.markdownContent,{headers:{"Content-Type":"text/markdown; charset=utf-8","Content-Disposition":`attachment; filename="${brief.briefingId}.md"`}});
    if(format==="pdf")return new Response(Buffer.from(await briefingPdf(brief.markdownContent)),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${brief.briefingId}.pdf"`}});
    return NextResponse.json(brief);
  } catch { return NextResponse.json({error:"Briefing unavailable"},{status:503}); }
}
