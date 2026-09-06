<template>
  <div class="saved-feed">
    <!-- Header Banner -->
    <div class="stat-box p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="d-flex align-items-center justify-content-center rounded-3" style="width: 44px; height: 44px; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.3); color: #34d399;">
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
            </svg>
          </div>
          <div>
            <h5 class="mb-1 fw-bold d-flex align-items-center gap-2">
              Saved Intelligence Vault
              <span class="cyber-badge badge-pentester">LOCAL ARCHIVE</span>
            </h5>
            <p class="text-secondary mb-0" style="font-size: 0.88rem;">
              Offline-persisted bug bounty writeups, CVE records, and threat news saved in local storage.
            </p>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button
            v-if="savedItems.length > 0"
            class="btn-cyber-outline text-danger d-flex align-items-center gap-1"
            style="border-color: rgba(244, 63, 94, 0.3);"
            @click="$emit('clear-all')"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
            <span>Clear All</span>
          </button>
          <button
            v-if="savedItems.length > 0"
            class="btn-cyber-outline d-flex align-items-center gap-1"
            @click="exportJson"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>
            <span>Export JSON</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="savedItems.length === 0" class="stat-box text-center py-5">
      <div class="mb-3 text-warning" style="opacity: 0.6;">
        <svg width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
        </svg>
      </div>
      <h5 class="fw-bold mb-2">No Bookmarks Saved Yet</h5>
      <p class="text-secondary mx-auto" style="max-width: 480px; font-size: 0.95rem;">
        Click the bookmark icon on any vulnerability disclosure, CVE, or security article to save it offline here.
      </p>
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
          :is-saved="true"
          @toggle-save="$emit('toggle-save', item)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import FeedCard from '../FeedCard.vue';

export default {
  name: 'SavedFeed',
  components: {
    FeedCard
  },
  props: {
    savedItems: {
      type: Array,
      default: () => []
    },
    searchQuery: {
      type: String,
      default: ''
    }
  },
  emits: ['toggle-save', 'clear-all'],
  computed: {
    filteredItems() {
      let result = this.savedItems;
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
  methods: {
    exportJson() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.savedItems, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `bug-feed-bookmarks-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  }
};
</script>
