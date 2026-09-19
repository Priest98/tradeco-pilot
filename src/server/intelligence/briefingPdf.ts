import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export async function briefingPdf(markdown: string): Promise<Uint8Array> {
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let page=pdf.addPage([595,842]), y=785;
  const newPage=()=>{page=pdf.addPage([595,842]);y=785;};
  for(const raw of markdown.split("\n")) {
    const heading=raw.startsWith("#");
    const font=heading?bold:regular, size=heading?13:10;
    const text=raw.replace(/^#+\s*/,"").replace(/[^\x20-\x7E]/g," ");
    if(!text){y-=8;continue;}
    let line="";
    for(const word of text.split(/\s+/)) {
      for(const chunk of word.match(/.{1,65}/g) || [""]) {
        if(font.widthOfTextAtSize(line+" "+chunk,size)>495 && line) { if(y<60)newPage();page.drawText(line,{x:50,y,size,font,color:rgb(.08,.15,.2)});y-=16;line=""; }
        line+=(line?" ":"")+chunk;
      }
    }
    if(y<60)newPage();page.drawText(line,{x:50,y,size,font,color:rgb(.08,.15,.2)});y-=heading?23:16;
  }
  pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:50,y:42},end:{x:545,y:42},thickness:0.5,color:rgb(.2,.5,.6)});p.drawText(`TRADECO-PILOT | PERSONAL OSINT | ${i+1} / ${pdf.getPageCount()}`,{x:50,y:28,size:8,font:regular});});
  return pdf.save();
}
