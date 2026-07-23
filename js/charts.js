// ============================================================
//  SHUROQ ERP – CHARTS (Chart.js)
// ============================================================

const CHART_DEFAULTS = {
  color: '#334155',
  gridColor: 'rgba(0,0,0,0.05)',
  font: 'Inter',
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.font.family = CHART_DEFAULTS.font;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;

function chartColors() {
  return ['#6366f1', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#ec4899'];
}

function makeLineChart(canvasId, labels, datasets) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: d.data,
        borderColor: chartColors()[i],
        backgroundColor: chartColors()[i] + '22',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: chartColors()[i],
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { font: { size: 11 } } },
        y: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { font: { size: 11 } }, beginAtZero: true },
      },
    },
  });
}

function makeBarChart(canvasId, labels, datasets, opts = {}) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: d.data,
        backgroundColor: (chartColors()[i]) + 'cc',
        borderColor: chartColors()[i],
        borderWidth: 1.5,
        borderRadius: 6,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { font: { size: 11 } }, stacked: opts.stacked },
        y: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { font: { size: 11 } }, beginAtZero: true, stacked: opts.stacked },
      },
    },
  });
}

function makeDoughnutChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: chartColors().slice(0, data.length).map(c => c + 'dd'),
        borderColor: chartColors().slice(0, data.length),
        borderWidth: 1.5,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, padding: 14 } },
      },
    },
  });
}

function makePolarChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  return new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: chartColors().slice(0, data.length).map(c => c + 'aa'),
        borderColor: chartColors().slice(0, data.length),
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { font: { size: 11 }, padding: 14 } } },
      scales: { r: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { display: false } } },
    },
  });
}

// Destroy existing chart before re-creating
function destroyChart(id) {
  const existing = Chart.getChart(id);
  if (existing) existing.destroy();
}
