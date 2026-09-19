export interface Baseline { count: number; mean: number | null; variance: number | null; zScore: number | null; status: "ready" | "insufficient_history" | "zero_variance" }
export function calculateBaseline(samples: number[], value: number, minimum = 30): Baseline {
  const valid=samples.filter(Number.isFinite);
  if(valid.length<minimum || !Number.isFinite(value))return {count:valid.length,mean:null,variance:null,zScore:null,status:"insufficient_history"};
  let mean=0,m2=0,count=0;
  for(const x of valid){count++;const delta=x-mean;mean+=delta/count;m2+=delta*(x-mean);}
  const variance=m2/(count-1);
  return {count,mean,variance,zScore:variance>0?(value-mean)/Math.sqrt(variance):null,status:variance>0?"ready":"zero_variance"};
}
