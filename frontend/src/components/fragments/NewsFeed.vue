<template>
  <div class="news-feed">
    <!-- Header Banner -->
    <div class="stat-box p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="d-flex align-items-center justify-content-center rounded-3" style="width: 44px; height: 44px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8;">
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 2.5A1.5 1.5 0 0 1 1.5 1h11A1.5 1.5 0 0 1 14 2.5v10.528c0 .3-.05.654-.238.972h.738a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 1 1 0v9a1.5 1.5 0 0 1-1.5 1.5H1.497A1.497 1.497 0 0 1 0 13.5v-11zM12 14c.37 0 .654-.211.85-.497A.993.993 0 0 0 13 13V2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v11c0 .278.111.525.295.707.18.178.43.293.705.293h10z"/>
            </svg>
          </div>
          <div>
            <h5 class="mb-1 fw-bold d-flex align-items-center gap-2">
              Cyber Threat News &amp; Intelligence
              <span class="cyber-badge badge-news">THREAT WIRES</span>
            </h5>
            <p class="text-secondary mb-0" style="font-size: 0.88rem;">
              Breaking cybersecurity reports, zero-day threat analysis, and security updates from top infosec publications.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
      <div class="d-flex gap-2 flex-wrap">
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'all' }"
          @click="subFilter = 'all'"
        >
          All Threat News ({{ filteredItems.length }})
        </button>
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'thn' }"
          @click="subFilter = 'thn'"
        >
          The Hacker News
        </button>
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'bleeping' }"
          @click="subFilter = 'bleeping'"
        >
          BleepingComputer
        </button>
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

    <!-- Loading indicator -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading news...</span>
      </div>
      <p class="mt-3 text-secondary" style="font-family: var(--font-mono); font-size: 0.88rem;">
        PARSING INFOSEC RSS FEEDS...
      </p>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredItems.length === 0" class="text-center py-5">
      <p class="text-muted">No news articles match your current query.</p>
    </div>

    <!-- Feed list -->
    <div v-else class="row g-2">
      <div
        v-for="item in filteredItems"
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
  </div>
</template>

<script>
import FeedCard from '../FeedCard.vue';

export default {
  name: 'NewsFeed',
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
      subFilter: 'all'
    };
  },
  computed: {
    filteredItems() {
      let result = this.items;
      if (this.subFilter === 'thn') {
        result = result.filter(i => (i.source || '').toLowerCase().includes('hacker news'));
      } else if (this.subFilter === 'bleeping') {
        result = result.filter(i => (i.source || '').toLowerCase().includes('bleeping'));
      }

      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        result = result.filter(i =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.tags && i.tags.some(t => t.toLowerCase().includes(q))) ||
          (i.source && i.source.toLowerCase().includes(q))
        );
      }
      return result;
    }
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      this.loading = true;
      try {
        const res = await fetch('/api/feeds/news');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.items = json.data;
          this.$emit('loaded', { type: 'news', count: this.items.length });
        }
      } catch (err) {
        console.error('Failed to load news feed:', err);
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
