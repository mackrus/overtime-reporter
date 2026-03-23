// @ts-ignore
import { $typst } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';
// @ts-ignore
import templateContent from './report.typ?raw';

let compilerInitPromise: Promise<void> | null = null;
let isCompilerReady = false;

/**
 * Initializes the Typst compiler and renderer using the high-level $typst wrapper.
 */
export async function initTypst() {
  if (isCompilerReady) return;
  if (!compilerInitPromise) {
    compilerInitPromise = (async () => {
      console.log("Initializing Typst.ts ($typst v0.7.0-rc)...");
      
      try {
        $typst.setCompilerInitOptions({
          getModule: () => ({ module_or_path: 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2/pkg/typst_ts_web_compiler_bg.wasm' }) as any
        });

        $typst.setRendererInitOptions({
          getModule: () => ({ module_or_path: 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@0.7.0-rc2/pkg/typst_ts_renderer_bg.wasm' }) as any
        });

        isCompilerReady = true;
        console.log("Typst.ts ($typst) Ready!");
      } catch (initError) {
        console.error("Critical: Failed to initialize Typst $typst wrapper:", initError);
        throw initError;
      }
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

/**
 * Robustly escapes strings for Typst: backslashes first, then double quotes.
 */
function escapeTypst(str: string): string {
    if (!str) return '-';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ')
        .trim();
}

/**
 * Generates a PDF using the $typst high-level wrapper.
 */
export async function generateTypstPDF(data: ReportData): Promise<Uint8Array> {
  await initTypst();

  const { entries, lang, getCategoryDisplay, monthlySalary, financialEstimate, translations: t } = data;
  
  const now = new Date();
  const reportDate = now.toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const refDate = now.toISOString().split('T')[0];

  const salaryLabel = lang === 'sv' ? 'Periodersättning' : 'Period Compensation';
  const cleanSalaryValue = (monthlySalary / 2).toFixed(2);

  // Format table rows with robust escaping
  const rows = entries.map(e => {
    let entrySek = 0;
    const simpleRate = (monthlySalary) / 94.0;
    const qualifiedRate = (monthlySalary) / 72.0;

    if (e.category === 'Normal' || e.category === 'Evening' || e.category === 'Kväll') {
        entrySek = e.hours * simpleRate;
    } else {
        entrySek = e.hours * qualifiedRate;
    }
    
    const safeDesc = escapeTypst(e.description);
    const safeCat = escapeTypst(getCategoryDisplay(e.category, e.date));
    
    return `("${e.date}", "${e.hours.toFixed(2)}", "${safeCat}", "${safeDesc}", "${entrySek.toFixed(2)} kr")`;
  }).join(', ');

  const totals = lang === 'sv' ? `
    ("${t.categories.Normal}/${t.categories.Evening}:", "${financialEstimate.simple_sek.toFixed(2)} kr"),
    ("${t.categories.Night}/${t.categories.Weekend}/${t.categories.PublicHoliday}:", "${financialEstimate.qualified_sek.toFixed(2)} kr"),
    (table.hline(stroke: 0.5pt),),
    ([*Bruttosumma:*], [*${financialEstimate.total_gross.toFixed(2)} kr*]),
    ([*Semesterersättning (12%):*], [*${financialEstimate.vacation_pay.toFixed(2)} kr*]),
    (table.hline(stroke: 1pt),),
    ([*Totalsumma:*], [*${financialEstimate.grand_total.toFixed(2)} kr*])
  ` : `
    ("Simple Overtime:", "${financialEstimate.simple_sek.toFixed(2)} kr"),
    ("Qualified Overtime:", "${financialEstimate.qualified_sek.toFixed(2)} kr"),
    (table.hline(stroke: 0.5pt),),
    ([*Total Gross:*], [*${financialEstimate.total_gross.toFixed(2)} kr*]),
    ([*Vacation Pay (12%):*], [*${financialEstimate.vacation_pay.toFixed(2)} kr*]),
    (table.hline(stroke: 1pt),),
    ([*Grand Total:*], [*${financialEstimate.grand_total.toFixed(2)} kr*])
  `;

  // Construct the Typst script using the imported template
  const fullMonthSalary = monthlySalary.toFixed(2);
  const cSimpleRate = (monthlySalary / 94.0).toFixed(2);
  const cQualRate = (monthlySalary / 72.0).toFixed(2);

  const mainContent = `${templateContent}

#report(
  title: "${escapeTypst(t.reportTitle)}",
  date: "${escapeTypst(t.generatedAt)} ${reportDate}",
  salary_label: "${escapeTypst(salaryLabel)}",
  salary_value: "${cleanSalaryValue}",
  full_month_salary: "${fullMonthSalary}",
  ref_label: "Ref",
  ref_value: "${refDate}",
  headers: ("${escapeTypst(t.date)}", "${escapeTypst(t.hours)}", "${escapeTypst(t.category)}", "${escapeTypst(t.description)}", "SEK"),
  rows: (${rows}${entries.length === 1 ? ',' : ''}),
  totals: (${totals}),
  c_simple_rate: "${cSimpleRate}",
  c_qual_rate: "${cQualRate}",
  c_simple_h: "${financialEstimate.simple_hours.toFixed(2)}",
  c_simple_sek: "${financialEstimate.simple_sek.toFixed(2)}",
  c_qual_h: "${financialEstimate.qualified_hours.toFixed(2)}",
  c_qual_sek: "${financialEstimate.qualified_sek.toFixed(2)}",
  c_gross: "${financialEstimate.total_gross.toFixed(2)}",
  c_vacation: "${financialEstimate.vacation_pay.toFixed(2)}",
  c_total: "${financialEstimate.grand_total.toFixed(2)}",
  footer_text: "${escapeTypst(t.footer)}"
)`;

  console.log("Typst: Generating PDF with $typst...");
  
  // Use high-level $typst.pdf wrapper which abstracts the compiler/renderer pipeline
  const pdfData = await $typst.pdf({ mainContent });
  const pdfBytes = new Uint8Array(pdfData as any);

  // FINAL PDF VALIDATION: 0x25 = '%'
  if (pdfBytes[0] !== 0x25) {
      throw new Error("Invalid output structure: Missing %PDF signature.");
  }

  console.log(`Successfully generated PDF: ${pdfBytes.length} bytes`);
  return pdfBytes;
}
