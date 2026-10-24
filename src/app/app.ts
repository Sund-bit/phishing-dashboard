
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

type CsvRow = Record<string, string>;

type ChartMetric = {
  label: string;
  keys: string[];
};

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  models: CsvRow[] = [];
  splits: CsvRow[] = [];

  loading = true;
  error = '';

  chartMetrics: ChartMetric[] = [
    { label: 'Accuracy', keys: ['Accuracy'] },
    { label: 'Precision', keys: ['Precision', 'Precision_phishing'] },
    { label: 'Recall', keys: ['Recall', 'Recall_phishing'] },
    { label: 'F1-score', keys: ['F1', 'F1_phishing'] },
    { label: 'ROC-AUC', keys: ['ROC-AUC', 'ROC_AUC', 'ROC_AUC_phishing'] },
    { label: 'MCC', keys: ['MCC'] },
    { label: 'Specificity', keys: ['Specificity'] }
  ];

  splitMetrics: ChartMetric[] = [
    { label: 'Accuracy', keys: ['Accuracy'] },
    { label: 'Precision', keys: ['Precision_phishing', 'Precision'] },
    { label: 'Recall', keys: ['Recall_phishing', 'Recall'] },
    { label: 'F1-score', keys: ['F1_phishing', 'F1'] },
    { label: 'ROC-AUC', keys: ['ROC-AUC', 'ROC_AUC', 'ROC_AUC_phishing'] }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnInit(): Promise<void> {
    try {
      const base = document.querySelector('base')?.href ?? window.location.href;

      const [responseModels, responseSplits] = await Promise.all([
        fetch(new URL('research-data/two_model_metrics.csv', base)),
        fetch(new URL('research-data/metrics_all_splits.csv', base))
      ]);

      if (!responseModels.ok || !responseSplits.ok) {
        throw new Error(
          `CSV request failed: ${responseModels.status}, ${responseSplits.status}`
        );
      }

      const [csvModels, csvSplits] = await Promise.all([
        responseModels.text(),
        responseSplits.text()
      ]);

      this.models = this.parseCsv(csvModels);
      this.splits = this.parseCsv(csvSplits);

      if (!this.models.length || !this.splits.length) {
        throw new Error('CSV files contain no data rows.');
      }

      console.log('Loaded model results:', this.models);
      console.log('Loaded split results:', this.splits);
    } catch (error) {
      console.error('Dashboard loading error:', error);
      this.error =
        'Could not load research results. Please refresh the page or check the published CSV files.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private parseCsv(csv: string): CsvRow[] {
    const text = csv.replace(/^\uFEFF/, '').trim();

    if (!text) {
      return [];
    }

    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field.trim());
        field = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }

        row.push(field.trim());

        if (row.some(value => value !== '')) {
          rows.push(row);
        }

        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    row.push(field.trim());

    if (row.some(value => value !== '')) {
      rows.push(row);
    }

    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map(header => header.trim());

    return rows.slice(1).map(values => {
      const result: CsvRow = {};

      headers.forEach((header, index) => {
        result[header] = (values[index] ?? '').trim();
      });

      return result;
    });
  }

  private findMetricValue(
    row: CsvRow,
    keys: string[]
  ): number | null {
    for (const key of keys) {
      const raw = row[key];

      if (raw === undefined || raw.trim() === '') {
        continue;
      }

      const value = Number(raw);

      if (Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  metric(row: CsvRow, ...keys: string[]): string {
    const value = this.findMetricValue(row, keys);

    if (value === null) {
      return '—';
    }

    // Support metrics stored as either 0.95 or 95.
    const percentage = value > 1 ? value : value * 100;

    return percentage.toFixed(2) + '%';
  }

  chartMetric(row: CsvRow, keys: string[]): string {
    return this.metric(row, ...keys);
  }

  hasMetric(row: CsvRow, keys: string[]): boolean {
    return this.findMetricValue(row, keys) !== null;
  }

  barValue(row: CsvRow, keys: string[]): number {
    const value = this.findMetricValue(row, keys);

    if (value === null) {
      return 0;
    }

    // Metrics such as MCC may be negative; don't render a negative width.
    const percentage = value > 1 ? value : value * 100;

    return Math.max(0, Math.min(100, percentage));
  }

  modelName(row: CsvRow): string {
    return row['Model'] || 'Unknown model';
  }

  splitName(row: CsvRow): string {
    return row['Split'] || '—';
  }

  splitTone(split: string | undefined): boolean {
    return (split ?? '').toLowerCase().includes('test');
  }
}
