import { Component, OnInit } from '@angular/core';

type CsvRow = Record<string, string>;

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

  async ngOnInit(): Promise<void> {
    try {
      const [a, b] = await Promise.all([
        fetch('research-data/two_model_metrics.csv'),
        fetch('research-data/metrics_all_splits.csv')
      ]);

      if (!a.ok || !b.ok) {
        throw new Error('CSV files not found');
      }

      this.models = this.parseCsv(await a.text());
      this.splits = this.parseCsv(await b.text());

      if (!this.models.length || !this.splits.length) {
        throw new Error('CSV files contain no data');
      }
    } catch {
      this.error = 'Could not load results. Check public/research-data and CSV filenames.';
    } finally {
      this.loading = false;
    }
  }

  private parseCsv(csv: string): CsvRow[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(x => x.trim());

    return lines.slice(1).filter(x => x.trim()).map(line => {
      const values = line.split(',');
      const row: CsvRow = {};
      headers.forEach((header, i) => row[header] = (values[i] ?? '').trim());
      return row;
    });
  }

  metric(row: CsvRow, ...keys: string[]): string {
    const key = keys.find(k => row[k] !== undefined && row[k] !== '');
    if (!key) return '—';
    const value = Number(row[key]);
    return Number.isFinite(value) ? (value * 100).toFixed(2) + '%' : row[key];
  }

  modelName(row: CsvRow): string {
    return row['Model'] || 'Unknown model';
  }

  splitName(row: CsvRow): string {
    return row['Split'] || '—';
  }

  number(row: CsvRow, ...keys: string[]): number {
    const key = keys.find(k => row[k] !== undefined && row[k] !== '');
    return key ? Number(row[key]) * 100 : 0;
  }
}
