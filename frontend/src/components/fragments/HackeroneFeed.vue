<template>
  <div class="hackerone-feed">
    <!-- Header Banner -->
    <div class="stat-box p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="d-flex align-items-center justify-content-center rounded-3" style="width: 44px; height: 44px; background: rgba(251, 113, 133, 0.12); border: 1px solid rgba(251, 113, 133, 0.3); color: #fb7185;">
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
            </svg>
          </div>
          <div>
            <h5 class="mb-1 fw-bold d-flex align-items-center gap-2">
              Bounty Disclosures &amp; Writeups
              <span class="cyber-badge badge-hackerone">BOUNTY RADAR</span>
            </h5>
            <p class="text-secondary mb-0" style="font-size: 0.88rem;">
              Publicly disclosed vulnerability reports from HackerOne and community writeups curated from PentesterLand.
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
          All Disclosures ({{ filteredItems.length }})
        </button>
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'hackerone' }"
          @click="subFilter = 'hackerone'"
        >
          HackerOne Reports
        </button>
        <button
          type="button"
          class="btn-cyber-outline"
          :class="{ 'btn-cyber-primary': subFilter === 'writeups' }"
          @click="subFilter = 'writeups'"
        >
          PentesterLand Writeups
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
      <div class="spinner-border text-info" role="status">
        <span class="visually-hidden">Loading disclosures...</span>
      </div>
      <p class="mt-3 text-secondary" style="font-family: var(--font-mono); font-size: 0.88rem;">
        INGESTING RECENT DISCLOSURES &amp; WRITEUPS...
      </p>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredItems.length === 0" class="text-center py-5">
      <p class="text-muted">No disclosures match your current query.</p>
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
  name: 'HackeroneFeed',
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
      if (this.subFilter === 'hackerone') {
        result = result.filter(i => (i.source || '').toLowerCase().includes('hackerone'));
      } else if (this.subFilter === 'writeups') {
        result = result.filter(i => (i.source || '').toLowerCase().includes('pentester'));
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
        const res = await fetch('/api/feeds/hackerone');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.items = json.data;
          this.$emit('loaded', { type: 'hackerone', count: this.items.length });
        }
      } catch (err) {
        console.error('Failed to load HackerOne disclosures:', err);
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
