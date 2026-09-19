import { NextResponse } from "next/server";
import { tripwireEngine } from "@/server/intelligence/tripwireEngine";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({tripwires:tripwireEngine.getTripwires()});}
