import { NextResponse } from "next/server";
import { computeCalibrationAnalytics } from "@/server/intelligence/calibrationAnalytics";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json(computeCalibrationAnalytics());}catch{return NextResponse.json({error:"Analytics unavailable"},{status:503});}}
