use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use chrono::{NaiveDate, Datelike, Duration as ChronoDuration, Weekday};
use console_error_panic_hook;
use std::cell::RefCell;

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq)]
pub enum Category {
    Normal,
    Evening,
    Night,
    Weekend,
    PublicHoliday,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OvertimeEntry {
    date: String,
    hours: f64,
    category: Category,
    description: String,
}

#[wasm_bindgen]
impl OvertimeEntry {
    #[wasm_bindgen(constructor)]
    pub fn new(date: String, hours: f64, category: Category, description: String) -> Self {
        OvertimeEntry { date, hours, category, description }
    }

    #[wasm_bindgen(getter)]
    pub fn date(&self) -> String { self.date.clone() }
    #[wasm_bindgen(getter)]
    pub fn hours(&self) -> f64 { self.hours }
    #[wasm_bindgen(getter)]
    pub fn category(&self) -> Category { self.category }
    #[wasm_bindgen(getter)]
    pub fn description(&self) -> String { self.description.clone() }
}

#[wasm_bindgen]
pub struct AppState {
    entries: RefCell<Vec<OvertimeEntry>>,
}

#[wasm_bindgen]
impl AppState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        AppState { entries: RefCell::new(Vec::new()) }
    }

    pub fn add_entry(&self, date: String, hours: f64, category: Category, description: String) -> String {
        {
            self.entries.borrow_mut().push(OvertimeEntry { date, hours, category, description });
        }
        self.get_entries_json()
    }

    pub fn add_smart_shift(&self, date: String, start_time: String, end_time: String, holidays_json: &str, description: String) -> String {
        let holidays: HashMap<String, String> = serde_json::from_str(holidays_json).unwrap_or_default();
        
        let start_decimal = self.time_to_decimal(&start_time);
        let mut end_decimal = self.time_to_decimal(&end_time);

        if end_decimal <= start_decimal {
            end_decimal += 24.0;
        }

        let mut new_entries_collected = Vec::new();
        let mut current = start_decimal;
        while current < end_decimal {
            let days_offset = (current / 24.0).floor() as i64;
            let current_date_str = self.increment_date(&date, days_offset);
            
            let is_holiday = holidays.contains_key(&current_date_str);
            let is_weekend = self.check_is_weekend(&current_date_str);
            
            let hour_of_day = current % 24.0;
            let (category, next_boundary) = self.get_category_for_hour(hour_of_day, is_holiday, is_weekend);
            
            let mut absolute_boundary = (current / 24.0).floor() * 24.0 + next_boundary;
            
            if absolute_boundary <= current {
                absolute_boundary += 24.0;
            }

            let chunk_end = f64::min(end_decimal, absolute_boundary);
            let duration = chunk_end - current;

            if duration > 0.0 {
                new_entries_collected.push(OvertimeEntry { 
                    date: current_date_str, 
                    hours: duration, 
                    category, 
                    description: description.clone() 
                });
            }
            
            current = f64::max(chunk_end, current + 0.001);
        }

        {
            self.entries.borrow_mut().extend(new_entries_collected);
        }

        self.get_entries_json()
    }

    fn increment_date(&self, date_str: &str, days: i64) -> String {
        if let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
            let new_date = date + ChronoDuration::days(days);
            new_date.format("%Y-%m-%d").to_string()
        } else {
            date_str.to_string()
        }
    }

    fn check_is_weekend(&self, date_str: &str) -> bool {
        if let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
            let wd = date.weekday();
            wd == Weekday::Sat || wd == Weekday::Sun
        } else {
            false
        }
    }

    fn time_to_decimal(&self, time: &str) -> f64 {
        let parts: Vec<&str> = time.split(':').collect();
        if parts.len() != 2 { return 0.0; }
        let h: f64 = parts[0].parse().unwrap_or(0.0);
        let m: f64 = parts[1].parse().unwrap_or(0.0);
        h + (m / 60.0)
    }

    fn get_category_for_hour(&self, hour: f64, is_holiday: bool, is_weekend: bool) -> (Category, f64) {
        if is_holiday {
            return (Category::PublicHoliday, 24.0);
        }
        if is_weekend {
            return (Category::Weekend, 24.0);
        }

        if hour >= 6.0 && hour < 17.0 {
            (Category::Normal, 17.0)
        } else if hour >= 17.0 && hour < 21.0 {
            (Category::Evening, 21.0)
        } else if hour >= 21.0 {
            (Category::Night, 24.0)
        } else {
            (Category::Night, 6.0)
        }
    }

    pub fn remove_entry(&self, index: usize) -> String {
        let mut entries = self.entries.borrow_mut();
        if index < entries.len() {
            entries.remove(index);
        }
        drop(entries);
        self.get_entries_json()
    }

    pub fn clear_entries(&self) -> String {
        self.entries.borrow_mut().clear();
        self.get_entries_json()
    }

    pub fn get_entries_json(&self) -> String {
        serde_json::to_string(&*self.entries.borrow()).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn generate_csv(&self, lang: &str, holidays_json: &str, monthly_salary: f64) -> String {
        let is_sv = lang == "sv";
        let holidays: HashMap<String, String> = serde_json::from_str(holidays_json).unwrap_or_default();
        let simple_rate = monthly_salary / 94.0;
        let qualified_rate = monthly_salary / 72.0;

        let header = if is_sv {
            "Datum,Timmar,Kategori,Beskrivning,Ersättning (SEK)\n"
        } else {
            "Date,Hours,Category,Description,Compensation (SEK)\n"
        };

        let mut csv = String::from(header);
        for entry in self.entries.borrow().iter() {
            let mut category_str = match entry.category {
                Category::Normal => if is_sv { "Normal" } else { "Normal" }.to_string(),
                Category::Evening => if is_sv { "Kväll" } else { "Evening" }.to_string(),
                Category::Night => if is_sv { "Natt" } else { "Night" }.to_string(),
                Category::Weekend => if is_sv { "Helg" } else { "Weekend" }.to_string(),
                Category::PublicHoliday => if is_sv { "Storhelg" } else { "Public Holiday" }.to_string(),
            };

            if let Some(h_name) = holidays.get(&entry.date) {
                category_str = format!("{} ({})", category_str, h_name);
            }

            let entry_sek = match entry.category {
                Category::Normal | Category::Evening => entry.hours * simple_rate,
                Category::Night | Category::Weekend | Category::PublicHoliday => entry.hours * qualified_rate,
            };

            let escaped_description = entry.description.replace("\"", "\"\"");
            csv.push_str(&entry.date);
            csv.push_str(&format!(",{:.2},", entry.hours));
            csv.push_str(&category_str);
            csv.push_str(&format!(",\"{}\",{:.2}\n", escaped_description, entry_sek));
        }
        csv
    }
}
