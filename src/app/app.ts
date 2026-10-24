
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
    console.log('Dashboard initialized');

    try {
      const base = document.querySelector('base')?.href ?? window.location.href;

      const [a, b] = await Promise.all([
        fetch(new URL('research-data/two_model_metrics.csv', base)),
        fetch(new URL('research-data/metrics_all_splits.csv', base))
      ]);

      console.log('CSV response statuses:', a.status, b.status);

      if (!a.ok || !b.ok) {
        throw new Error(`CSV request failed: ${a.status}, ${b.status}`);
      }

      const [csvA, csvB] = await Promise.all([a.text(), b.text()]);

      this.models = this.parseCsv(csvA);
      this.splits = this.parseCsv(csvB);

      if (!this.models.length || !this.splits.length) {
        throw new Error('CSV files contain no data rows');
      }
    } catch (e) {
      console.error('Dashboard loading error:', e);
      this.error = 'Could not load research results. Please refresh the page.';
    } finally {
      this.loading = false;
      console.log('Dashboard loading finished');
    }
  }

  private parseCsv(csv: string): CsvRow[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(x => x.trim());

    return lines.slice(1).filter(x => x.trim()).map(line => {
      const values = line.split(',');
      const row: CsvRow = {};
      headers.forEach((header, i) => {
        row[header] = (values[i] ?? '').trim();
      });
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
