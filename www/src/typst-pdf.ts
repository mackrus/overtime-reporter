import { createTypstCompiler, preloadRemoteFonts } from '@myriaddreamin/typst.ts';

let compiler: any = null;
let compilerInitPromise: Promise<void> | null = null;
let isCompilerReady = false;

// Using standard CDN links for Roboto that are verified working
const FONT_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Regular.ttf';
const FONT_BOLD_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Bold.ttf';

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
  margin: (x: 2cm, y: 2.5cm),
  header: align(right)[
    #text(8pt, fill: luma(120))[${t.generatedAt} ${reportDate}]
  ],
  footer: locate(loc => {
    let page_number = counter(page).at(loc).first()
    let total_pages = counter(page).final(loc).first()
    grid(
      columns: (1fr, 1fr),
      align(left)[#text(8pt, fill: luma(120))[${t.footer}]],
      align(right)[#text(8pt, fill: luma(120))[Sida #page_number av #total_pages]]
    )
  })
)
#set text(font: "Roboto", size: 10pt, fill: luma(40))

#align(center)[
  #text(22pt, weight: "bold", fill: black)[${t.reportTitle.toUpperCase()}] \
  #v(0.1cm)
  #line(length: 20%, stroke: 2pt + black)
]

#v(1cm)

#grid(
  columns: (1fr, 1fr),
  stack(spacing: 0.5cm,
    [#text(size: 9pt, weight: "bold", fill: luma(100))[UPPGIFTER]],
    [*${salaryLabel}:* ${monthlySalary / 2} SEK],
    [*Anställningsform:* Timavlönad / Övertid]
  ),
  align(right)[
    #stack(spacing: 0.5cm,
      [#text(size: 9pt, weight: "bold", fill: luma(100))[REFERENS]],
      [*Datum:* ${refDate}],
      [*Status:* Utkast]
    )
  ]
)

#v(1cm)

#line(length: 100%, stroke: 0.5pt)
#table(
  columns: (auto, auto, auto, 1fr, auto),
  align: (left, right, left, left, right),
  stroke: none,
  inset: 10pt,
  [*${t.date}*], [*${t.hours}*], [*${t.category}*], [*${t.description}*], [*SEK*],
  ${tableRows}
)
#line(length: 100%, stroke: 0.5pt)

#v(0.5cm)

#grid(
  columns: (1.5fr, 1fr),
  [],
  block(
    width: 100%,
    fill: luma(250),
    inset: 15pt,
    radius: 4pt,
    stack(spacing: 0.3cm,
      grid(columns: (1fr, auto), [Bruttosumma:], [${financialEstimate.total_gross.toFixed(2)} kr]),
      grid(columns: (1fr, auto), [Semesterers. (12%):], [${financialEstimate.vacation_pay.toFixed(2)} kr]),
      line(length: 100%, stroke: 0.5pt + luma(200)),
      text(weight: "bold", fill: black, grid(columns: (1fr, auto), [TOTALT ATT BETALA:], [${financialEstimate.grand_total.toFixed(2)} kr]))
    )
  )
)

#v(2cm)

#grid(
  columns: (1fr, 1fr),
  gutter: 2cm,
  stack(spacing: 0.2cm,
    line(length: 100%, stroke: 0.5pt),
    text(8pt, fill: luma(100))[Signatur anställd]
  ),
  stack(spacing: 0.2cm,
    line(length: 100%, stroke: 0.5pt),
    text(8pt, fill: luma(100))[Signatur arbetsledare]
  )
)
  `;

  console.log("Compiling Typst Document...");
  await compiler.addSource('/main.typ', typstContent);
  const pdfBytes = await compiler.compile({ mainFilePath: '/main.typ', format: 'pdf' });
  return pdfBytes as Uint8Array;
}
