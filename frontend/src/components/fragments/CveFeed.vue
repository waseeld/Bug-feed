<template>
  <div class="cve-feed">
    <!-- Header Banner -->
    <div class="stat-box p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="d-flex align-items-center justify-content-center rounded-3" style="width: 44px; height: 44px; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.3); color: #fbbf24;">
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.355.522a.5.5 0 0 1 .623.333l.291.956A4.979 4.979 0 0 1 8 1c1.007 0 1.946.298 2.731.811l.29-.956a.5.5 0 1 1 .957.29l-.415 1.362A5.002 5.002 0 0 1 13 6v.5a.5.5 0 0 1-1 0V6a4 4 0 0 0-3.5-3.969v1.442a.5.5 0 0 1-1 0V2.031A4 4 0 0 0 4 6v.5a.5.5 0 0 1-1 0V6c0-1.546.7-2.929 1.769-3.844l-.414-1.362a.5.5 0 0 1 .333-.623zM2.5 9a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm1 3a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5zm-2-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5zm12 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </div>
          <div>
            <h5 class="mb-1 fw-bold d-flex align-items-center gap-2">
              CVE Vulnerabilities &amp; Exploit PoCs
              <span class="cyber-badge badge-cve">CVE REPOSITORY</span>
            </h5>
            <p class="text-secondary mb-0" style="font-size: 0.88rem;">
              Authoritative CVE bulletins, CISA KEV catalog, and weaponized GitHub Proof-of-Concept exploits.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter & Controls bar -->
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'all' }"
          @click="setSubFilter('all')"
        >
          All CVEs ({{ totalCountFormatted }})
        </button>
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'pocs' }"
          @click="setSubFilter('pocs')"
        >
          GitHub PoCs ({{ pocsCountFormatted }})
        </button>
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'circl' }"
          @click="setSubFilter('circl')"
        >
          Advisories &amp; KEV ({{ advisoriesCountFormatted }})
        </button>
      </div>

      <div class="d-flex align-items-center gap-2">
        <!-- Page size selector -->
        <div class="d-flex align-items-center gap-1 text-secondary small" style="font-family: var(--font-mono);">
          <span>Per page:</span>
          <select v-model.number="pageSize" class="form-select form-select-sm bg-dark text-light border-secondary" style="width: 75px; font-size: 0.8rem;" @change="currentPage = 1">
            <option :value="30">30</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>

        <button class="btn-cyber-outline d-flex align-items-center gap-1" @click="fetchData" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
          <svg v-else width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Status Bar with Range & Pagination Summary -->
    <div v-if="!loading && filteredItems.length > 0" class="d-flex justify-content-between align-items-center mb-3 px-3 py-2 rounded-2 flex-wrap gap-2" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 0.82rem;">
      <div class="text-secondary">
        Showing <strong class="text-info">{{ itemRangeStart.toLocaleString() }} – {{ itemRangeEnd.toLocaleString() }}</strong> of <strong class="text-light">{{ filteredItems.length.toLocaleString() }}</strong> CVE records
        <span v-if="searchQuery" class="ms-1 text-warning">(filtered by "{{ searchQuery }}")</span>
      </div>

      <!-- Quick Pagination Mini-Nav -->
      <div class="d-flex align-items-center gap-1">
        <button
          class="btn-pagination-nav"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
          title="Previous page"
        >
          &larr; Prev
        </button>
        <span class="px-2 text-light fw-bold">Page {{ currentPage }} / {{ totalPages }}</span>
        <button
          class="btn-pagination-nav"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
          title="Next page"
        >
          Next &rarr;
        </button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status">
        <span class="visually-hidden">Loading CVEs...</span>
      </div>
      <p class="mt-3 text-secondary" style="font-family: var(--font-mono); font-size: 0.88rem;">
        STREAMING COMPLETE CVE &amp; POC INTELLIGENCE ARCHIVE...
      </p>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredItems.length === 0" class="text-center py-5">
      <p class="text-muted">No CVEs match your query.</p>
    </div>

    <!-- Feed list (Paginated) -->
    <div v-else class="row g-2">
      <div
        v-for="item in paginatedItems"
        :key="item.id"
        class="col-12"
      >
        <FeedCard
          :item="item"
          :is-saved="isSaved(item.id)"
          @toggle-save="$emit('toggle-save', item)"
        />
      </div>
    </div>

    <!-- Bottom Full Pagination Navigation -->
    <div v-if="!loading && totalPages > 1" class="d-flex justify-content-center align-items-center gap-1 my-4 flex-wrap">
      <button
        class="btn-pagination-nav"
        :disabled="currentPage === 1"
        @click="goToPage(1)"
        title="First page"
      >
        &laquo; First
      </button>
      <button
        class="btn-pagination-nav"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
        title="Previous page"
      >
        &lsaquo; Prev
      </button>

      <!-- Page Numbers Range -->
      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === '...'" class="px-2 text-muted">&hellip;</span>
        <button
          v-else
          class="btn-pagination-num"
          :class="{ 'active': p === currentPage }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
      </template>

      <button
        class="btn-pagination-nav"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
        title="Next page"
      >
        Next &rsaquo;
      </button>
      <button
        class="btn-pagination-nav"
        :disabled="currentPage === totalPages"
        @click="goToPage(totalPages)"
        title="Last page"
      >
        Last &raquo;
      </button>
    </div>
  </div>
</template>

<script>
import FeedCard from '../FeedCard.vue';

export default {
  name: 'CveFeed',
  components: {
    FeedCard
  },
  props: {
    searchQuery: {
      type: String,
      default: ''
    },
    savedIds: {
      type: Array,
      default: () => []
    }
  },
  emits: ['toggle-save', 'loaded'],
  data() {
    return {
      items: [],
      loading: false,
      subFilter: 'all',
      currentPage: 1,
      pageSize: 50
    };
  },
  computed: {
    totalCountFormatted() {
      return this.items.length.toLocaleString();
    },
    pocsCountFormatted() {
      return this.items.filter(i => (i.source || '').toLowerCase().includes('poc')).length.toLocaleString();
    },
    advisoriesCountFormatted() {
      return this.items.filter(i => !(i.source || '').toLowerCase().includes('poc')).length.toLocaleString();
    },
    filteredItems() {
      let result = this.items;
      if (this.subFilter === 'pocs') {
        result = result.filter(i => (i.source || '').toLowerCase().includes('poc'));
      } else if (this.subFilter === 'circl') {
        result = result.filter(i => !(i.source || '').toLowerCase().includes('poc'));
      }

      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        result = result.filter(i =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.cve_id && i.cve_id.toLowerCase().includes(q)) ||
          (i.tags && i.tags.some(t => t.toLowerCase().includes(q))) ||
          (i.source && i.source.toLowerCase().includes(q))
        );
      }
      return result;
    },
    totalPages() {
      return Math.ceil(this.filteredItems.length / this.pageSize) || 1;
    },
    itemRangeStart() {
      if (this.filteredItems.length === 0) return 0;
      return (this.currentPage - 1) * this.pageSize + 1;
    },
    itemRangeEnd() {
      return Math.min(this.currentPage * this.pageSize, this.filteredItems.length);
    },
    paginatedItems() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredItems.slice(start, start + this.pageSize);
    },
    visiblePages() {
      const total = this.totalPages;
      const current = this.currentPage;
      if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      const pages = [];
      pages.push(1);
      if (current > 3) {
        pages.push('...');
      }
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (current < total - 2) {
        pages.push('...');
      }
      pages.push(total);
      return pages;
    }
  },
  watch: {
    searchQuery() {
      this.currentPage = 1;
    },
    subFilter() {
      this.currentPage = 1;
    }
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    setSubFilter(val) {
      this.subFilter = val;
      this.currentPage = 1;
    },
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        window.scrollTo({ top: 180, behavior: 'smooth' });
      }
    },
    async fetchData() {
      this.loading = true;
      try {
        const res = await fetch('/api/feeds/cve');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.items = json.data;
          this.$emit('loaded', { type: 'cve', count: this.items.length });
        }
      } catch (err) {
        console.error('Failed to load CVE feed:', err);
      } finally {
        this.loading = false;
      }
    },
    isSaved(id) {
      return this.savedIds.includes(id);
    }
  }
};
</script>

<style scoped>
.btn-pagination-nav {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.15s ease;
  cursor: pointer;
}
.btn-pagination-nav:hover:not(:disabled) {
  background: var(--accent-cyan);
  color: #020817;
  border-color: var(--accent-cyan);
}
.btn-pagination-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.btn-pagination-num {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  cursor: pointer;
}
.btn-pagination-num:hover:not(.active) {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-cyan);
  border-color: rgba(6, 182, 212, 0.4);
}
.btn-pagination-num.active {
  background: var(--accent-cyan);
  color: #020817;
  border-color: var(--accent-cyan);
  font-weight: 700;
}
</style>
