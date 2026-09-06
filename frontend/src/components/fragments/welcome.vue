<template>
  <div class="welcome-overview">
    <!-- Hero Banner -->
    <div class="hero-banner p-4 p-md-5 mb-4 rounded-4 position-relative overflow-hidden">
      <div class="hero-glow"></div>
      <div class="row align-items-center position-relative" style="z-index: 2;">
        <div class="col-lg-8 col-md-12">
          <div class="d-inline-flex align-items-center gap-2 brand-badge mb-3">
            <span>LIVE THREAT RADAR</span>
          </div>
          <h1 class="hero-title fw-bold mb-2">
            Bug Bounty &amp; Vulnerability Intelligence
          </h1>
          <p class="hero-desc text-secondary mb-4" style="max-width: 640px; font-size: 1.05rem;">
            Real-time automated stream of disclosed bug bounty reports, fresh Proof-of-Concept exploits, CVE vulnerabilities, and infosec techniques.
          </p>

          <div class="d-flex align-items-center gap-3 flex-wrap">
            <button class="btn-cyber-primary" @click="$emit('switch-tab', 'disclosures')">
              Explore Disclosures &rarr;
            </button>
            <button class="btn-cyber-outline" @click="$emit('switch-tab', 'cve')">
              Latest CVEs &amp; PoCs
            </button>
          </div>
        </div>

        <div class="col-lg-4 col-md-12 text-lg-end mt-4 mt-lg-0">
          <div class="clock-card p-3 rounded-3 d-inline-block text-start">
            <div class="text-muted text-uppercase" style="font-size: 0.72rem; letter-spacing: 1px; font-family: var(--font-mono);">
              SYSTEM LOCAL TIME
            </div>
            <div class="clock-time my-1" style="font-family: var(--font-mono); font-size: 1.85rem; font-weight: 700; color: var(--accent-cyan);">
              {{ currentTime }}
            </div>
            <div class="clock-date text-muted" style="font-size: 0.85rem;">
              {{ currentDate }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Automated Ingestion & Deduplication Status Bar -->
    <div class="stat-box p-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3" style="background: linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%); border-left: 4px solid var(--accent-cyan);">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <div class="d-flex align-items-center gap-2">
          <span class="spinner-grow spinner-grow-sm text-info" role="status" style="width: 10px; height: 10px;"></span>
          <span class="fw-bold text-light" style="font-size: 0.9rem; font-family: var(--font-mono);">
            AUTO-INGESTION ENGINE:
          </span>
          <span class="cyber-badge badge-cve">EVERY {{ workerStatus.interval_minutes || 15 }} MIN</span>
        </div>

        <div class="text-secondary small d-flex align-items-center gap-3 flex-wrap" style="font-family: var(--font-mono);">
          <span v-if="workerStatus.last_run_end">
            Last Synced: <strong class="text-light">{{ formatTimeAgo(workerStatus.last_run_end) }}</strong>
          </span>
          <span v-if="workerStatus.storage_stats">
            Database: <strong class="text-info">{{ workerStatus.storage_stats.total_items }} items</strong>
            (<span class="text-success">{{ workerStatus.storage_stats.total_seen_registry }} fingerprints tracked</span>)
          </span>
          <span v-if="workerStatus.last_result" class="text-warning">
            Last cycle: +{{ workerStatus.last_result.total_added }} new, {{ workerStatus.last_result.total_skipped_duplicates }} skipped duplicates
          </span>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button
          class="btn btn-sm btn-cyber-primary d-flex align-items-center gap-2"
          :disabled="syncing"
          @click="triggerSyncNow"
          style="font-size: 0.82rem;"
        >
          <span v-if="syncing" class="spinner-border spinner-border-sm" role="status"></span>
          <svg v-else width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
          </svg>
          <span>{{ syncing ? 'Deduplicating & Syncing...' : 'Sync Now' }}</span>
        </button>
      </div>
    </div>
    <div class="row g-3 mb-4">
      <!-- Disclosures -->
      <div class="col-6 col-lg-3">
        <div class="stat-box cursor-pointer" @click="$emit('switch-tab', 'disclosures')">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-muted text-uppercase fw-semibold d-flex align-items-center gap-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">
              <svg width="13" height="13" fill="#fb7185" viewBox="0 0 16 16">
                <path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
              </svg>
              Disclosures
            </span>
            <span class="cyber-badge badge-hackerone">H1 &amp; PL</span>
          </div>
          <div class="stat-number" style="color: #fb7185;">
            {{ stats.hackerone + stats.writeups }}
          </div>
          <div class="text-muted mt-2" style="font-size: 0.78rem;">
            Disclosed reports &amp; writeups
          </div>
        </div>
      </div>

      <!-- CVEs & PoCs -->
      <div class="col-6 col-lg-3">
        <div class="stat-box cursor-pointer" @click="$emit('switch-tab', 'cve')">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-muted text-uppercase fw-semibold d-flex align-items-center gap-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">
              <svg width="13" height="13" fill="#fbbf24" viewBox="0 0 16 16">
                <path d="M4.355.522a.5.5 0 0 1 .623.333l.291.956A4.979 4.979 0 0 1 8 1c1.007 0 1.946.298 2.731.811l.29-.956a.5.5 0 1 1 .957.29l-.415 1.362A5.002 5.002 0 0 1 13 6v.5a.5.5 0 0 1-1 0V6a4 4 0 0 0-3.5-3.969v1.442a.5.5 0 0 1-1 0V2.031A4 4 0 0 0 4 6v.5a.5.5 0 0 1-1 0V6c0-1.546.7-2.929 1.769-3.844l-.414-1.362a.5.5 0 0 1 .333-.623zM2.5 9a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm1 3a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5zm-2-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5zm12 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
              </svg>
              CVEs &amp; PoCs
            </span>
            <span class="cyber-badge badge-cve">PoC-in-GitHub</span>
          </div>
          <div class="stat-number" style="color: #fbbf24;">
            {{ (stats.cve || 0).toLocaleString() }}
          </div>
          <div class="text-muted mt-2" style="font-size: 0.78rem;">
            Fresh exploits &amp; advisories
          </div>
        </div>
      </div>

      <!-- Security News -->
      <div class="col-6 col-lg-3">
        <div class="stat-box cursor-pointer" @click="$emit('switch-tab', 'news')">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-muted text-uppercase fw-semibold d-flex align-items-center gap-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">
              <svg width="13" height="13" fill="#38bdf8" viewBox="0 0 16 16">
                <path d="M0 2.5A1.5 1.5 0 0 1 1.5 1h11A1.5 1.5 0 0 1 14 2.5v10.528c0 .3-.05.654-.238.972h.738a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 1 1 0v9a1.5 1.5 0 0 1-1.5 1.5H1.497A1.497 1.497 0 0 1 0 13.5v-11zM12 14c.37 0 .654-.211.85-.497A.993.993 0 0 0 13 13V2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v11c0 .278.111.525.295.707.18.178.43.293.705.293h10z"/>
              </svg>
              Threat News
            </span>
            <span class="cyber-badge badge-news">THN &amp; Bleeping</span>
          </div>
          <div class="stat-number" style="color: #38bdf8;">
            {{ stats.news }}
          </div>
          <div class="text-muted mt-2" style="font-size: 0.78rem;">
            Breaking threat intelligence
          </div>
        </div>
      </div>

      <!-- Bookmarks -->
      <div class="col-6 col-lg-3">
        <div class="stat-box cursor-pointer" @click="$emit('switch-tab', 'saved')">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-muted text-uppercase fw-semibold d-flex align-items-center gap-1" style="font-size: 0.75rem; letter-spacing: 0.5px;">
              <svg width="13" height="13" fill="#34d399" viewBox="0 0 16 16">
                <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
              </svg>
              Saved Vault
            </span>
            <span class="cyber-badge badge-pentester">Local Offline</span>
          </div>
          <div class="stat-number" style="color: #34d399;">
            {{ savedCount }}
          </div>
          <div class="text-muted mt-2" style="font-size: 0.78rem;">
            Saved items in storage
          </div>
        </div>
      </div>
    </div>

    <!-- Feed Sources & Architecture Highlight -->
    <div class="row g-3">
      <div class="col-md-6">
        <div class="stat-box h-100">
          <div class="d-flex align-items-center gap-2 mb-3">
            <div class="source-icon p-2 rounded" style="background: rgba(244, 63, 94, 0.15); color: #fb7185;">
              🛡️
            </div>
            <h6 class="mb-0 fw-bold">Disclosures &amp; Writeups Stream</h6>
          </div>
          <p class="text-secondary mb-3" style="font-size: 0.9rem;">
            Aggregates verified public bounty reports from HackerOne's Hacktivity GraphQL index and over 6,400 community-contributed writeups from Pentester Land.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <span class="badge-tag">HackerOne Reports</span>
            <span class="badge-tag">Pentester Land JSON</span>
            <span class="badge-tag">Bounty Amounts</span>
            <span class="badge-tag">Vulnerability Types</span>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="stat-box h-100">
          <div class="d-flex align-items-center gap-2 mb-3">
            <div class="source-icon p-2 rounded" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">
              ⚡
            </div>
            <h6 class="mb-0 fw-bold">Threat &amp; Exploit Radar</h6>
          </div>
          <p class="text-secondary mb-3" style="font-size: 0.9rem;">
            Monitors newly released Git repository exploits (PoC-in-GitHub), NVD published CVE advisories, Infosec news feeds, and Reddit / Twitter bug bounty methodologies.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <span class="badge-tag">GitHub PoC Commits</span>
            <span class="badge-tag">NVD / CIRCL CVEs</span>
            <span class="badge-tag">The Hacker News RSS</span>
            <span class="badge-tag">#bugbountytips</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Welcome',
  props: {
    savedCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['switch-tab'],
  data() {
    return {
      currentTime: '',
      currentDate: '',
      timer: null,
      statusTimer: null,
      syncing: false,
      workerStatus: {
        worker_active: true,
        interval_minutes: 15,
        last_run_end: null,
        last_result: null,
        storage_stats: null
      },
      stats: {
        hackerone: 0,
        writeups: 0,
        cve: 0,
        news: 0,
        tips: 0
      }
    };
  },
  mounted() {
    this.updateClock();
    this.timer = setInterval(this.updateClock, 1000);
    this.fetchMetrics();
    this.fetchWorkerStatus();
    this.statusTimer = setInterval(this.fetchWorkerStatus, 15000);
  },
  beforeUnmount() {
    if (this.timer) clearInterval(this.timer);
    if (this.statusTimer) clearInterval(this.statusTimer);
  },
  methods: {
    formatTimeAgo(isoString) {
      if (!isoString) return 'Just now';
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      return `${diffHrs}h ago`;
    },
    async fetchWorkerStatus() {
      try {
        const res = await fetch('/api/worker/status');
        const json = await res.json();
        if (json.status === 200 && json.data) {
          this.workerStatus = json.data;
        }
      } catch (e) {
        console.warn('Failed to fetch worker status', e);
      }
    },
    async triggerSyncNow() {
      this.syncing = true;
      try {
        const res = await fetch('/api/worker/sync', { method: 'POST' });
        const json = await res.json();
        if (json.data) {
          await this.fetchWorkerStatus();
          await this.fetchMetrics();
        }
      } catch (e) {
        console.error('Failed to trigger manual sync:', e);
      } finally {
        this.syncing = false;
      }
    },
    updateClock() {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString();
      this.currentDate = now.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },
    async fetchMetrics() {
      try {
        const res = await fetch('/api/feeds/metrics/todays');
        const json = await res.json();
        if (json.status === 200) {
          this.stats = {
            hackerone: json.hackerone || 0,
            writeups: json.writeups || 0,
            cve: json.cve || 0,
            news: json.news || 0,
            tips: json.tips || 0
          };
        }
      } catch (err) {
        console.warn('Failed to load metrics:', err);
      }
    }
  }
};
</script>

<style scoped>
.hero-banner {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(12px);
}
.hero-glow {
  position: absolute;
  top: -80px;
  right: -80px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, rgba(37, 99, 235, 0.05) 50%, transparent 70%);
  filter: blur(40px);
  pointer-events: none;
}
.hero-title {
  color: var(--text-primary);
  font-size: 2rem;
  letter-spacing: -0.5px;
}
.clock-card {
  background: var(--bg-main);
  border: 1px solid var(--border-color);
  min-width: 200px;
}
.cursor-pointer {
  cursor: pointer;
}
</style>