import { useState, useEffect, useRef } from 'react';
import init, { AppState, Category } from './pkg/wasm_crate';
import { generateTypstPDF } from './typst-pdf';
import { Trash2, Plus, Download, FileText, Zap, List, Globe, CalendarCheck, Send, HelpCircle, Loader2 } from 'lucide-react';
import holidaysData from './pkg/holidays.json';

interface Entry {
  date: string;
  hours: number;
  category: string;
  description: string;
}

const holidays: Record<string, string> = holidaysData;

type Language = 'sv' | 'en';

const translations = {
  sv: {
    title: 'Övertid',
    smartTab: 'Smart läge',
    manualTab: 'Manuellt läge',
    date: 'Datum',
    startTime: 'Starttid',
    endTime: 'Sluttid',
    isHoliday: 'Storhelg/Röd dag',
    hours: 'Timmar',
    category: 'Kategori',
    description: 'Beskrivning',
    descriptionPlaceholder: 'Vad gjorde du?',
    addSmart: 'Lägg till',
    addManual: 'Lägg till',
    sessionSummary: 'Sammanfattning',
    entries: 'poster',
    clearAll: 'Rensa allt',
    noEntries: 'Inga poster ännu.',
    exportCSV: 'Exportera CSV',
    exportPDF: 'Exportera PDF',
    sendReport: 'Skicka Rapport',
    sendReportBody: `Hej,

Här är min övertidsrapport.

Mvh,
`,
    initializing: 'Laddar...',
    alertFill: 'Vänligen fyll i datum, starttid och sluttid.',
    alertValidHours: 'Vänligen fyll i datum och giltiga timmar.',
    reportTitle: 'Övertidsrapport',
    generatedAt: 'Skapad:',
    footer: '© 2026 Övertid',
    holidayDetected: 'Röd dag detekterad:',
    normalDay: 'Vanlig arbetsdag',
    instructionsTitle: 'Instruktioner',
    instructions: `
      <p><strong>Smart läge:</strong> Fyll in start- och sluttid. Appen delar automatiskt upp skiftet i korrekta kategorier (Normal, Kväll, Natt) och känner av helger och röda dagar.</p>
      <p><strong>Manuellt läge:</strong> Fyll in totala timmar och välj kategori själv. Använd detta för specialfall eller om du vill åsidosätta automatiken.</p>
      <p><strong>Rapporter:</strong> När du är klar kan du exportera som CSV/PDF eller klicka på "Skicka Rapport" för att öppna ett färdigt mejl (du måste bifoga filerna manuellt).</p>
    `,
    calcLogicTitle: 'Hur ersättningen beräknas',
    calcLogicContent: `
      <p>Beräkningarna baseras på din angivna <strong>Periodersättning</strong> (motsvarande 50% av en månadslön).</p>
      <ul>
        <li><strong>Vardagsövertid:</strong> [Månadslön] / 94. Gäller för kategorierna Normal och Kväll.</li>
        <li><strong>Kvalificerad övertid:</strong> [Månadslön] / 72. Gäller för Natt, Helg och Storhelg.</li>
        <li><strong>Semesterersättning:</strong> +12% läggs på den totala bruttosumman.</li>
      </ul>
      <p><em>Smart uppdelning:</em> Normal (06-17), Kväll (17-21), Natt (21-06). Helger och röda dagar räknas alltid som Kvalificerad övertid.</p>
    `,
    categories: {
      Normal: 'Normal',
      Evening: 'Kväll',
      Night: 'Natt',
      Weekend: 'Helg',
      PublicHoliday: 'Storhelg',
    }
  },
  en: {
    title: 'Overtime',
    smartTab: 'Smart Mode',
    manualTab: 'Manual Mode',
    date: 'Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    isHoliday: 'Public Holiday',
    hours: 'Hours',
    category: 'Category',
    description: 'Description',
    descriptionPlaceholder: 'What did you do?',
    addSmart: 'Add',
    addManual: 'Add',
    sessionSummary: 'Session Summary',
    entries: 'entries',
    clearAll: 'Clear All',
    noEntries: 'No entries yet.',
    exportCSV: 'Export CSV',
    exportPDF: 'Export PDF',
    sendReport: 'Send Report',
    sendReportBody: `Hi,

Here is my overtime report.

Regards,
`,
    initializing: 'Loading...',
    alertFill: 'Please fill in date, start time, and end time.',
    alertValidHours: 'Please fill in date and valid hours.',
    reportTitle: 'Overtime Report',
    generatedAt: 'Generated on:',
    footer: '© 2026 Overtime',
    holidayDetected: 'Public holiday detected:',
    normalDay: 'Regular workday',
    instructionsTitle: 'Instructions',
    instructions: `
      <p><strong>Smart Mode:</strong> Enter a start and end time. The app will automatically split the shift into the correct categories (Normal, Evening, Night) and detect weekends and public holidays.</p>
      <p><strong>Manual Mode:</strong> Enter the total hours and choose the category yourself. Use this for special cases or to override the automatic logic.</p>
      <p><strong>Reports:</strong> When you're done, you can export as CSV/PDF or click "Send Report" to open a pre-filled email (you must attach the files manually).</p>
    `,
    calcLogicTitle: 'How compensation is calculated',
    calcLogicContent: `
      <p>Calculations are based on your provided <strong>Period Compensation</strong> (equal to 50% of a monthly salary).</p>
      <ul>
        <li><strong>Simple Overtime:</strong> [Monthly Salary] / 94. Applied to Normal and Evening categories.</li>
        <li><strong>Qualified Overtime:</strong> [Monthly Salary] / 72. Applied to Night, Weekend, and Public Holidays.</li>
        <li><strong>Vacation Pay:</strong> +12% added to the total gross amount.</li>
      </ul>
      <p><em>Smart Splitting:</em> Normal (06-17), Evening (17-21), Night (21-06). Weekends and holidays are always counted as Qualified Overtime.</p>
    `,
    categories: {
      Normal: 'Normal',
      Evening: 'Evening',
      Night: 'Night',
      Weekend: 'Weekend',
      PublicHoliday: 'Public Holiday',
    }
  }
};

let wasmInitPromise: Promise<any> | null = null; // Declare outside the component

export default function App() {
  const [lang, setLang] = useState<Language>('sv');
  const t = translations[lang];

  const [wasmReady, setWasmReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [appState, setAppState] = useState<AppState | null>(null); // Use useState directly
  
  // UI State
  const [entryMethod, setEntryMethod] = useState<'smart' | 'manual'>('smart');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Smart Entry State
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('22:00');
  
  // Holiday State
  const [isHolidayManual, setIsHolidayManual] = useState(false);
  const holidayName = holidays[date] || null;
  const isDateHoliday = !!holidayName;

  // Manual Entry State
  const [hours, setHours] = useState(1);
  const [category, setCategory] = useState(Category.Normal);

  // Financial State
  const [periodCompensation, setPeriodCompensation] = useState(12899);

  // Auto-sync holiday status when date changes
  useEffect(() => {
    setIsHolidayManual(isDateHoliday);
  }, [date, isDateHoliday]);

  useEffect(() => {
    if (!wasmInitPromise) { // Ensure init() is only called once globally
      wasmInitPromise = init();
    }

    wasmInitPromise.then(() => {
      // If AppState already exists (e.g., from a previous StrictMode render), reuse it
      if (appState) return; 
      
      const state = new AppState();
      const saved = localStorage.getItem('overtime_entries');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((e: any) => {
              if (e && e.date && typeof e.hours === 'number' && e.category) {
                 state.add_entry(e.date, e.hours, getCategoryEnum(e.category), e.description || '');
              }
            });
            setEntries(parsed as Entry[]);
          } else {
             localStorage.removeItem('overtime_entries'); // Clear corrupted data
          }
        } catch(e) {
             localStorage.removeItem('overtime_entries'); // Clear corrupted data
        }
      }
      setAppState(state); // Set AppState in React state
      setWasmReady(true);
    });
  }, [appState]); // Depend on appState to ensure it's set once

  const getCategoryEnum = (cat: string): Category => {
    if (cat === 'Normal') return Category.Normal;
    if (cat === 'Evening' || cat === 'Kväll') return Category.Evening;
    if (cat === 'Night' || cat === 'Natt') return Category.Night;
    if (cat === 'Weekend' || cat === 'Helg') return Category.Weekend;
    if (cat === 'Public Holiday' || cat === 'Storhelg' || cat === 'PublicHoliday') return Category.PublicHoliday;
    return Category.Normal;
  };

  const getCategoryDisplay = (catName: string, entryDate: string): string => {
    let display = '';
    if (catName === 'Normal') display = t.categories.Normal;
    else if (catName === 'Evening') display = t.categories.Evening;
    else if (catName === 'Night') display = t.categories.Night;
    else if (catName === 'Weekend') display = t.categories.Weekend;
    else if (catName === 'PublicHoliday') display = t.categories.PublicHoliday;
    else display = catName;

    const hName = holidays[entryDate];
    if (hName) {
      return `${display} (${hName})`;
    }
    return display;
  };

  const updateEntriesAndLocalStorage = (newState: AppState) => {
    const newEntries = newState.get_entries_json() as Entry[];
    setEntries(newEntries);
    localStorage.setItem('overtime_entries', JSON.stringify(newEntries));
  };

  const handleAddSmartShift = () => {
    if (!appState) return;
    if (!date || !startTime || !endTime) {
      alert(t.alertFill);
      return;
    }
    console.log("Adding smart shift", { date, startTime, endTime, description });
    appState.add_smart_shift(date, startTime, endTime, JSON.stringify(holidays), description);
    updateEntriesAndLocalStorage(appState);
    setDescription('');
  };

  const handleAddManualEntry = () => {
    if (!appState) return;
    if (!date || hours <= 0) {
      alert(t.alertValidHours);
      return;
    }
    const finalCategory = isHolidayManual ? Category.PublicHoliday : category;
    console.log("Adding manual entry", { date, hours, finalCategory, description });
    appState.add_entry(date, hours, finalCategory, description);
    updateEntriesAndLocalStorage(appState);
    setDescription('');
  };

  const handleRemoveEntry = (index: number) => {
    if (!appState) return;
    appState.remove_entry(index);
    updateEntriesAndLocalStorage(appState);
  };

  const handleClear = () => {
    if (!appState) return;
    appState.clear_entries();
    setEntries([]); // Clear React state directly
    localStorage.removeItem('overtime_entries'); // Clear all localStorage too
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const exportCSV = () => {
    if (!appState) return;
    const monthlySalary = periodCompensation * 2;
    const csv = appState.generate_csv(lang, JSON.stringify(holidays), monthlySalary);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overtime_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!appState || entries.length === 0) return;
    setIsGeneratingPDF(true);
    
    try {
      const financialEstimate = JSON.parse(appState.calculate_estimate(periodCompensation * 2));
      
      const pdfBytes = await generateTypstPDF({
        entries,
        lang,
        getCategoryDisplay,
        monthlySalary: periodCompensation * 2,
        financialEstimate,
        translations: t
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `overtime_report_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Ett fel uppstod vid skapandet av PDF:en. Kontrollera konsolen.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendReport = async () => {
    exportCSV();
    await exportPDF();
    const subject = encodeURIComponent("Övertidsrapport");
    const body = encodeURIComponent(t.sendReportBody);
    window.location.href = `mailto:skogstorp.overtid@stockholm.se?subject=${subject}&body=${body}`;
  };

  if (!wasmReady) return <div style={{ padding: 20, color: '#fff' }}>{t.initializing}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <details style={styles.details}>
          <summary style={styles.summary}>
            <HelpCircle size={16} style={{ marginRight: 6 }} /> {t.instructionsTitle}
          </summary>
          <div style={styles.instructions} dangerouslySetInnerHTML={{ __html: t.instructions }} />
        </details>
        <button onClick={() => setLang(lang === 'sv' ? 'en' : 'sv')} style={styles.langButton}>
          <Globe size={16} style={{ marginRight: 6 }} /> {lang === 'sv' ? 'English' : 'Svenska'}
        </button>
      </div>

      <header style={styles.header}>
        <h1 style={styles.title}>{t.title}</h1>
      </header>

      <div style={styles.tabs}>
        <button 
          onClick={() => setEntryMethod('smart')} 
          style={{...styles.tab, ...(entryMethod === 'smart' ? styles.activeTab : {})}}
        >
          <Zap size={16} style={{ marginRight: 8 }} /> {t.smartTab}
        </button>
        <button 
          onClick={() => setEntryMethod('manual')} 
          style={{...styles.tab, ...(entryMethod === 'manual' ? styles.activeTab : {})}}
        >
          <List size={16} style={{ marginRight: 8 }} /> {t.manualTab}
        </button>
      </div>

      <div style={styles.formCard}>
        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.date} *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={styles.input} required />
          </div>

          {entryMethod === 'smart' ? (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{t.startTime} *</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{t.endTime} *</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{t.isHoliday}</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 8 }}>
                   {isDateHoliday ? (
                     <span style={{ fontSize: '0.9rem', color: '#10b981', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                       <CalendarCheck size={18} style={{ marginRight: 6 }} /> {holidayName}
                     </span>
                   ) : (
                     <span style={{ fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center' }}>
                       {t.normalDay}
                     </span>
                   )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{t.hours} *</label>
                <input type="number" step="0.5" value={hours} onChange={e => setHours(parseFloat(e.target.value))} style={styles.input} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{t.isHoliday}</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 8 }}>
                   <input 
                     type="checkbox" 
                     checked={isHolidayManual} 
                     onChange={e => setIsHolidayManual(e.target.checked)} 
                     style={{ width: 20, height: 20 }} 
                   />
                   {isDateHoliday && (
                     <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center' }}>
                       <CalendarCheck size={14} style={{ marginRight: 4 }} /> {holidayName}
                     </span>
                   )}
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>{t.category} *</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(parseInt(e.target.value))} 
                  style={{...styles.input, opacity: isHolidayManual ? 0.5 : 1}}
                  disabled={isHolidayManual}
                >
                  <option value={Category.Normal}>{t.categories.Normal}</option>
                  <option value={Category.Evening}>{t.categories.Evening}</option>
                  <option value={Category.Night}>{t.categories.Night}</option>
                  <option value={Category.Weekend}>{t.categories.Weekend}</option>
                  <option value={Category.PublicHoliday}>{t.categories.PublicHoliday}</option>
                </select>
              </div>
            </>
          )}

          <div style={styles.inputGroupFull}>
            <label style={styles.label}>{t.description}</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t.descriptionPlaceholder} style={styles.input} />
          </div>
        </div>
        <button onClick={entryMethod === 'smart' ? handleAddSmartShift : handleAddManualEntry} style={styles.addButton}>
          <Plus size={18} style={{ marginRight: 8 }} /> {entryMethod === 'smart' ? t.addSmart : t.addManual}
        </button>
      </div>

      <div style={styles.listCard}>
        <div style={styles.listHeader}>
          <h2 style={styles.cardTitle}>{t.sessionSummary} ({entries.length} {t.entries})</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{...styles.label, marginBottom: 0}}>Periodersättning (SEK):</label>
            <input 
              type="number" 
              value={periodCompensation} 
              onChange={e => setPeriodCompensation(parseInt(e.target.value) || 0)} 
              style={{...styles.input, width: 100, padding: '6px 8px'}} 
            />
          </div>
          {entries.length > 0 && (
            <button onClick={handleClear} style={styles.clearButton}>
              <Trash2 size={16} /> {t.clearAll}
            </button>
          )}
        </div>
        
        {entries.length === 0 ? (
          <p style={styles.emptyText}>{t.noEntries}</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t.date}</th>
                  <th style={styles.th}>{t.hours}</th>
                  <th style={styles.th}>{t.category}</th>
                  <th style={styles.th}>{t.description}</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>{e.date}</td>
                    <td style={tdStyle(e.hours)}>{e.hours.toFixed(2)}</td>
                    <td style={styles.td}>{getCategoryDisplay(e.category, e.date)}</td>
                    <td style={styles.td}>{e.description}</td>
                    <td style={styles.td}>
                      <button onClick={() => handleRemoveEntry(i)} style={styles.deleteButton}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Financial Summary */}
            {appState && (
              <div style={{ marginTop: 20, padding: 15, background: '#2a2a2a', borderRadius: 8, fontSize: '0.9rem', color: '#eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Estimerad Ersättning (SEK)</h3>
                  <details style={{ position: 'relative' }}>
                    <summary style={{ listStyle: 'none', cursor: 'pointer', color: '#888', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                      <HelpCircle size={14} style={{ marginRight: 4 }} /> {t.calcLogicTitle}
                    </summary>
                    <div style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: '100%', 
                      background: '#333', 
                      border: '1px solid #444', 
                      borderRadius: 8, 
                      padding: '12px', 
                      zIndex: 10, 
                      width: 280, 
                      color: '#ccc',
                      fontSize: '0.8rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      marginTop: 8
                    }} dangerouslySetInnerHTML={{ __html: t.calcLogicContent }} />
                  </details>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                   <span>Vardagsövertid ({JSON.parse(appState.calculate_estimate(periodCompensation * 2)).simple_hours}h):</span>
                   <span>{JSON.parse(appState.calculate_estimate(periodCompensation * 2)).simple_sek.toFixed(2)} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                   <span>Kvalificerad övertid ({JSON.parse(appState.calculate_estimate(periodCompensation * 2)).qualified_hours}h):</span>
                   <span>{JSON.parse(appState.calculate_estimate(periodCompensation * 2)).qualified_sek.toFixed(2)} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, borderTop: '1px solid #444', paddingTop: 4 }}>
                   <span>Bruttosumma:</span>
                   <span>{JSON.parse(appState.calculate_estimate(periodCompensation * 2)).total_gross.toFixed(2)} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                   <span>Semesterersättning (12%):</span>
                   <span>{JSON.parse(appState.calculate_estimate(periodCompensation * 2)).vacation_pay.toFixed(2)} kr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#10b981', borderTop: '1px solid #444', paddingTop: 4, marginTop: 4 }}>
                   <span>Totalt:</span>
                   <span>{JSON.parse(appState.calculate_estimate(periodCompensation * 2)).grand_total.toFixed(2)} kr</span>
                </div>
              </div>
            )}
          </div>
        )}

        {entries.length > 0 && (
          <div style={styles.actions}>
            <button onClick={exportCSV} style={{...styles.exportButton, background: '#333'}}>
              <Download size={18} style={{ marginRight: 8 }} /> {t.exportCSV}
            </button>
            <button onClick={exportPDF} disabled={isGeneratingPDF} style={{...styles.exportButton, background: '#333', opacity: isGeneratingPDF ? 0.7 : 1}}>
              {isGeneratingPDF ? <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> : <FileText size={18} style={{ marginRight: 8 }} />} 
              {isGeneratingPDF ? (lang === 'sv' ? 'Skapar PDF...' : 'Generating PDF...') : t.exportPDF}
            </button>
            <button onClick={handleSendReport} disabled={isGeneratingPDF} style={{...styles.exportButton, background: '#10b981', gridColumn: '1 / -1', opacity: isGeneratingPDF ? 0.7 : 1}}>
              {isGeneratingPDF ? <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} /> : <Send size={18} style={{ marginRight: 8 }} />}
              {t.sendReport}
            </button>
          </div>
        )}
      </div>
      
      <footer style={styles.footer}>
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}

const tdStyle = (hours: number) => ({
  ...styles.td,
  fontWeight: hours > 0 ? 600 : 400,
});

const styles = {
  container: { maxWidth: 900, margin: '0 auto', padding: '40px 20px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  details: { position: 'relative' as const },
  summary: { cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#888' },
  instructions: { 
    position: 'absolute' as const, 
    left: 0, 
    top: '100%', 
    background: '#2d2d2d', 
    border: '1px solid #444', 
    borderRadius: 8, 
    padding: '12px 16px', 
    zIndex: 10, 
    width: 300, 
    color: '#ccc',
    fontSize: '0.85rem'
  },
  langButton: { background: '#2d2d2d', color: '#ccc', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.8rem' },
  header: { textAlign: 'center' as const, marginBottom: 20 },
  title: { fontSize: '2.5rem', margin: 0, color: '#fff' },
  tabs: { display: 'flex', gap: 10, marginBottom: 20 },
  tab: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#2d2d2d', color: '#888', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: 600 },
  activeTab: { background: '#1e1e1e', color: '#3b82f6', borderBottom: '2px solid #3b82f6' },
  formCard: { background: '#1e1e1e', padding: 24, borderRadius: '0 0 12px 12px', marginBottom: 24, boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  cardTitle: { fontSize: '1.25rem', margin: '0 0 20px 0', color: '#fff' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16, marginBottom: 20 },
  inputGroup: {},
  inputGroupFull: { gridColumn: '1 / -1' },
  label: { display: 'block', fontSize: '0.875rem', color: '#888', marginBottom: 6 },
  input: { width: '100%', background: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' as const },
  addButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  listCard: { background: '#1e1e1e', padding: 24, borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  clearButton: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem' },
  emptyText: { textAlign: 'center' as const, color: '#666', padding: '20px 0' },
  tableWrapper: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, color: '#ccc' },
  th: { textAlign: 'left' as const, padding: '12px 8px', borderBottom: '1px solid #333', color: '#888', fontSize: '0.875rem' },
  tr: { borderBottom: '1px solid #2a2a2a' },
  td: { padding: '12px 8px' },
  deleteButton: { background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' },
  actions: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 24 },
  exportButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#333', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.9rem', cursor: 'pointer' },
  footer: { textAlign: 'center' as const, marginTop: 40, color: '#444', fontSize: '0.8rem' },
};
