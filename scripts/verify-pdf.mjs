import { mkdirSync, writeFileSync } from 'node:fs';
process.env.DATA_DIR='tmp/pdf-check';
const {generateDailyBriefing}=await import('../src/server/intelligence/briefingGenerator.ts');
const {briefingPdf}=await import('../src/server/intelligence/briefingPdf.ts');
mkdirSync('output/pdf',{recursive:true});
writeFileSync('output/pdf/pdb-verification.pdf',await briefingPdf(generateDailyBriefing().markdownContent));
