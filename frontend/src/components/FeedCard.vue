<template>
  <div class="cyber-card mb-3" :class="sourceCardClass">
    <div class="d-flex justify-content-between align-items-start gap-3">
      <div class="flex-grow-1">
        <!-- Metadata Header: Source pill, Category, Date -->
        <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
          <span class="cyber-badge" :class="sourceBadgeClass">
            {{ item.source || 'Intel' }}
          </span>
          <span v-if="item.category" class="cyber-badge" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid var(--border-color);">
            {{ item.category }}
          </span>
          <span class="ms-auto text-muted d-flex align-items-center gap-1" style="font-size: 0.78rem; font-family: var(--font-mono);">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
            </svg>
            {{ item.published_at }}
          </span>
        </div>

        <!-- Title & Direct External Link -->
        <h6 class="feed-title mb-2">
          <a :href="item.url" target="_blank" rel="noopener noreferrer" class="feed-link">
            {{ item.title }}
            <svg class="external-icon ms-1" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
              <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
            </svg>
          </a>
        </h6>

        <!-- Tag Chips -->
        <div v-if="item.tags && item.tags.length" class="d-flex flex-wrap gap-1 mt-2">
          <span
            v-for="(tag, idx) in item.tags"
            :key="idx"
            class="badge-tag"
          >
            {{ tag }}
          </span>
        </div>

        <!-- CVE Dedicated Direct Action Buttons -->
        <div v-if="item.category === 'cve'" class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-2 border-top" style="border-color: rgba(255, 255, 255, 0.07) !important;">
          <a
            v-if="isGithubPoc"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="cve-action-btn btn-poc"
            title="Open exploit Proof-of-Concept repository on GitHub"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>GitHub PoC ↗</span>
          </a>

          <a
            v-if="item.cve_url"
            :href="item.cve_url"
            target="_blank"
            rel="noopener noreferrer"
            class="cve-action-btn btn-cve"
            title="Open official CVE Record on CVE.org (MITRE)"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.072 1.199a8 8 0 0 1 5.856 0l5.18 2.15a1 1 0 0 1 .632.923c0 7.55-5.26 10.9-10.438 11.716a1 1 0 0 1-.604 0C5.26 15.172 0 11.822 0 4.272a1 1 0 0 1 .632-.923l5.072-2.15z"/>
            </svg>
            <span>CVE.org Record ↗</span>
          </a>

          <a
            v-if="item.nvd_url"
            :href="item.nvd_url"
            target="_blank"
            rel="noopener noreferrer"
            class="cve-action-btn btn-nvd"
            title="View National Vulnerability Database entry"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
              <path d="M4 4h8v2H4V4zm0 3h8v2H4V7zm0 3h5v2H4v-2z"/>
            </svg>
            <span>NVD NIST ↗</span>
          </a>

          <a
            v-if="item.osv_url"
            :href="item.osv_url"
            target="_blank"
            rel="noopener noreferrer"
            class="cve-action-btn btn-osv"
            title="View Open Source Vulnerability advisory"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <span>OSV Advisory ↗</span>
          </a>
        </div>
      </div>

      <!-- Action Buttons (Right) -->
      <div class="d-flex align-items-center gap-1 flex-shrink-0 ms-2">
        <!-- Bookmark -->
        <button
          class="btn-action-icon"
          :class="{ 'saved-active': isSaved }"
          @click="$emit('toggle-save', item)"
          :title="isSaved ? 'Remove from Saved' : 'Bookmark feed item'"
        >
          <svg v-if="isSaved" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
          </svg>
          <svg v-else width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
          </svg>
        </button>

        <!-- Copy Link -->
        <button
          class="btn-action-icon"
          @click="copyUrl"
          :title="copied ? 'Copied to clipboard!' : 'Copy direct link'"
        >
          <svg v-if="copied" width="15" height="15" fill="#10b981" viewBox="0 0 16 16">
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
          </svg>
          <svg v-else width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L7.336 10.994a1 1 0 0 1-1.414-1.414l.676-.676a2.001 2.001 0 0 1 0-2.828z"/>
            <path d="M6.786 10.73 5.414 12.1a3 3 0 0 0 4.242 4.241l1.828-1.828a3 3 0 0 0-4.242-4.243l-1.828 1.828z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FeedCard',
  props: {
    item: {
      type: Object,
      required: true
    },
    isSaved: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle-save'],
  data() {
    return {
      copied: false
    };
  },
  computed: {
    sourceCardClass() {
      const src = (this.item.source || '').toLowerCase();
      if (src.includes('hackerone')) return 'source-hackerone';
      if (src.includes('pentester')) return 'source-pentester';
      if (src.includes('poc') || src.includes('circl') || src.includes('cve')) return 'source-cve';
      if (src.includes('news') || src.includes('hacker news') || src.includes('bleeping')) return 'source-news';
      if (src.includes('reddit') || src.includes('twitter') || src.includes('tip')) return 'source-tips';
      return '';
    },
    sourceBadgeClass() {
      const src = (this.item.source || '').toLowerCase();
      if (src.includes('hackerone')) return 'badge-hackerone';
      if (src.includes('pentester')) return 'badge-pentester';
      if (src.includes('poc') || src.includes('circl') || src.includes('cve')) return 'badge-cve';
      if (src.includes('news') || src.includes('hacker news') || src.includes('bleeping')) return 'badge-news';
      if (src.includes('reddit') || src.includes('twitter') || src.includes('tip')) return 'badge-tips';
      return 'badge-tag';
    },
    isGithubPoc() {
      const src = (this.item.source || '').toLowerCase();
      const url = (this.item.url || '').toLowerCase();
      return src.includes('poc') || url.includes('github.com');
    }
  },
  methods: {
    async copyUrl() {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(this.item.url);
          this.copied = true;
          setTimeout(() => { this.copied = false; }, 1800);
        }
      } catch (e) {
        console.error('Failed to copy', e);
      }
    }
  }
};
</script>

<style scoped>
.feed-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.45;
  margin: 0;
}
.feed-link {
  color: var(--text-primary);
  display: inline-block;
  transition: color 0.15s ease;
}
.feed-link:hover {
  color: var(--accent-cyan) !important;
}
.external-icon {
  opacity: 0.5;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.feed-link:hover .external-icon {
  opacity: 1;
  transform: translate(2px, -2px);
}

.cve-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}
.btn-poc {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
}
.btn-poc:hover {
  background: rgba(245, 158, 11, 0.25);
  color: #fef08a;
  border-color: #fbbf24;
  transform: translateY(-1px);
}
.btn-cve {
  background: rgba(6, 182, 212, 0.12);
  color: #38bdf8;
  border-color: rgba(6, 182, 212, 0.3);
}
.btn-cve:hover {
  background: rgba(6, 182, 212, 0.25);
  color: #a5f3fc;
  border-color: #38bdf8;
  transform: translateY(-1px);
}
.btn-nvd {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  border-color: rgba(148, 163, 184, 0.25);
}
.btn-nvd:hover {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}
.btn-osv {
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.3);
}
.btn-osv:hover {
  background: rgba(168, 85, 247, 0.25);
  color: #e9d5ff;
  border-color: #c084fc;
  transform: translateY(-1px);
}
</style>
