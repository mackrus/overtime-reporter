import { createTypstCompiler, preloadRemoteFonts } from '@myriaddreamin/typst.ts';

let compiler: any = null;
let compilerInitPromise: Promise<void> | null = null;
let isCompilerReady = false;

// We need a font for Typst to work in the browser. 
// Using standard CDN links for Roboto that are more likely to stay active
const FONT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/roboto-font/0.1.0/fonts/Roboto/roboto-regular-webfont.ttf';
const FONT_BOLD_URL = 'https://cdnjs.cloudflare.com/ajax/libs/roboto-font/0.1.0/fonts/Roboto/roboto-bold-webfont.ttf';

export async function initTypst() {
  if (isCompilerReady) return;
  if (!compilerInitPromise) {
    compilerInitPromise = (async () => {
      console.log("Initializing Typst Compiler...");
      
      compiler = createTypstCompiler();
      
      await compiler.init({
        getModule: () => 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.4.1/pkg/typst_ts_web_compiler_bg.wasm',
        beforeBuild: [
          preloadRemoteFonts([FONT_URL, FONT_BOLD_URL])
        ]
      });
      
      isCompilerReady = true;
      console.log("Typst Compiler Ready!");
    })();
  }
  await compilerInitPromise;
}

export interface ReportData {
  entries: any[];
  lang: 'sv' | 'en';
  getCategoryDisplay: (cat: string, date: string) => string;
  monthlySalary: number;
  financialEstimate: any;
  translations: any;
}

export async function generateTypstPDF(data: ReportData): Promise<Uint8Array> {
  await initTypst();

  const { entries, lang, getCategoryDisplay, monthlySalary, financialEstimate, translations: t } = data;
  
  const now = new Date();
  const reportDate = now.toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const refDate = now.toISOString().split('T')[0];

  const salaryLabel = lang === 'sv' ? 'Periodersättning' : 'Period Compensation';

  const tableRows = entries.map(e => {
    let entrySek = 0;
    const simpleRate = (monthlySalary) / 94.0;
    const qualifiedRate = (monthlySalary) / 72.0;

    if (e.category === 'Normal' || e.category === 'Evening' || e.category === 'Kväll') {
        entrySek = e.hours * simpleRate;
    } else {
        entrySek = e.hours * qualifiedRate;
    }
    
    const desc = (e.description || '-').replace(/"/g, '\\"');
    const cat = getCategoryDisplay(e.category, e.date).replace(/"/g, '\\"');
    
    return `[${e.date}], [${e.hours.toFixed(2)}], [${cat}], [${desc}], [${entrySek.toFixed(2)}]`;
  }).join(',\n    ');

  const typstContent = `
#set document(title: "${t.reportTitle}")
#set page(
  paper: "a4",
  margin: (x: 2.5cm, y: 3cm),
  footer: locate(loc => {
    let page_number = counter(page).at(loc).first()
    align(center)[#text(9pt)[#page_number]]
  })
)
#set text(font: "Roboto", size: 11pt)

#align(center)[
  #text(18pt, weight: "bold")[${t.reportTitle.toUpperCase()}] \\
  #v(0.2cm)
  #text(10pt, style: "italic")[${t.generatedAt} ${reportDate}]
]

#v(1cm)

#grid(
  columns: (1fr, 1fr),
  [*${salaryLabel}:* ${monthlySalary / 2} SEK],
  align(right)[*Ref:* ${refDate}]
)

#v(0.8cm)

#line(length: 100%, stroke: 1pt)
#v(-0.2cm)
#table(
  columns: (auto, auto, auto, 1fr, auto),
  align: (left, right, left, left, right),
  stroke: none,
  inset: 8pt,
  [*${t.date}*], [*${t.hours}*], [*${t.category}*], [*${t.description}*], [*SEK*],
)
#v(-0.4cm)
#line(length: 100%, stroke: 0.5pt)
#v(-0.2cm)
#table(
  columns: (auto, auto, auto, 1fr, auto),
  align: (left, right, left, left, right),
  stroke: none,
  inset: 8pt,
  ${tableRows},
)
#v(-0.4cm)
#line(length: 100%, stroke: 1pt)

#v(0.5cm)

#align(right)[
  #block(width: 60%)[
    #set align(left)
    #table(
      columns: (1fr, auto),
      align: (left, right),
      stroke: none,
      inset: 4pt,
      [${lang === 'sv' ? 'Bruttosumma:' : 'Total Gross:'}], [${financialEstimate.total_gross.toFixed(2)} kr],
      [${lang === 'sv' ? 'Semesterersättning (12%):' : 'Vacation Pay (12%):'}], [${financialEstimate.vacation_pay.toFixed(2)} kr],
    )
    #v(-0.2cm)
    #line(length: 100%, stroke: 0.5pt)
    #v(-0.2cm)
    #table(
      columns: (1fr, auto),
      align: (left, right),
      stroke: none,
      inset: 4pt,
      [*${lang === 'sv' ? 'Totalsumma:' : 'Grand Total:'}*], [**${financialEstimate.grand_total.toFixed(2)} kr**],
    )
  ]
]

#v(2cm)
#line(length: 30%, stroke: 0.5pt)
#text(8pt, style: "italic")["${t.footer}"]
  `;

  console.log("Compiling Typst Document...");
  await compiler.addSource('/main.typ', typstContent);
  const pdfBytes = await compiler.compile({ mainFilePath: '/main.typ', format: 'pdf' });
  return pdfBytes as Uint8Array;
}
