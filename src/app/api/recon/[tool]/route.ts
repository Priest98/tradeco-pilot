import { NextResponse } from "next/server";
import { analyzeAsn } from "@/server/recon/asn";
import { analyzeCryptoAddress } from "@/server/recon/crypto";
import { analyzeCve } from "@/server/recon/cve";
export async function GET(request:Request, context:{params:Promise<{tool:string}>}) {
  const {tool}=await context.params;
  const query=new URL(request.url).searchParams.get("query")?.trim();
  if(!query || query.length>200)return NextResponse.json({error:"Invalid query"},{status:400});
  const result=tool==="asn" && /^\d+$/.test(query)?analyzeAsn(Number(query)):tool==="crypto"?analyzeCryptoAddress(query):tool==="cve"?analyzeCve(query):null;
  return result?NextResponse.json({result,provenance:"Static reference snapshot; not a live sanctions, routing or vulnerability check."}):NextResponse.json({error:"Invalid tool"},{status:400});
}
