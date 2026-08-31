<template>
  <div class="tweets-feed">
    <!-- Twitter / X Hub Header -->
    <div class="stat-box p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="twitter-x-logo">
            𝕏
          </div>
          <div>
            <h5 class="mb-1 fw-bold d-flex align-items-center gap-2">
              Community Intel &amp; Tips
              <span class="cyber-badge badge-tips">COMMUNITY RADAR</span>
            </h5>
            <p class="text-secondary mb-0" style="font-size: 0.88rem;">
              Curated tips, zero-day advisories, and recon methodologies from top bounty hunters &amp; researchers.
            </p>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 flex-wrap">
          <a
            href="https://x.com/search?q=(%23bugbountytips%20OR%20%230day%20OR%20%23infosec)&f=live"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm d-flex align-items-center gap-2 py-1 px-3"
            style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-family: var(--font-mono); font-size: 0.82rem; border-radius: 6px;"
            title="Stream latest real-time tweets directly on X"
          >
            <span class="spinner-grow spinner-grow-sm text-danger" role="status" style="width: 8px; height: 8px;"></span>
            <span>Live Stream on 𝕏 &nearr;</span>
          </a>
          <button class="btn-cyber-outline" @click="showAddAccount = !showAddAccount">
            + Follow Account
          </button>
          <button class="btn-cyber-outline" @click="showAddTag = !showAddTag">
            + Track Hashtag
          </button>
          <button class="btn-action-icon" @click="fetchTweets" :disabled="loading" title="Refresh stream">
            <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
            <svg v-else width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Expandable Add Account Panel -->
      <div v-if="showAddAccount" class="mt-3 pt-3 border-top" style="border-color: var(--border-color) !important;">
        <div class="row g-2 align-items-center">
          <div class="col-sm-8 col-md-5">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-transparent text-secondary border-end-0">@</span>
              <input
                type="text"
                class="form-control border-start-0"
                style="background: var(--bg-main); color: var(--text-primary); border-color: var(--border-color);"
                placeholder="Enter Twitter handle (e.g. albinowax)"
                v-model="newAccountHandle"
                @keyup.enter="submitAddAccount"
              />
            </div>
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-cyber-primary" @click="submitAddAccount">
              Track Account
            </button>
            <button class="btn btn-sm btn-cyber-outline ms-1" @click="showAddAccount = false">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Expandable Add Hashtag Panel -->
      <div v-if="showAddTag" class="mt-3 pt-3 border-top" style="border-color: var(--border-color) !important;">
        <div class="row g-2 align-items-center">
          <div class="col-sm-8 col-md-5">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-transparent text-secondary border-end-0">#</span>
              <input
                type="text"
                class="form-control border-start-0"
                style="background: var(--bg-main); color: var(--text-primary); border-color: var(--border-color);"
                placeholder="Enter hashtag without # (e.g. cloudsecurity)"
                v-model="newHashtag"
                @keyup.enter="submitAddHashtag"
              />
            </div>
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-cyber-primary" @click="submitAddHashtag">
              Track Hashtag
            </button>
            <button class="btn btn-sm btn-cyber-outline ms-1" @click="showAddTag = false">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hashtag Selector Pills -->
    <div class="mb-3">
      <div class="d-flex align-items-center gap-1 overflow-auto pb-2">
        <span class="text-muted small me-2 flex-shrink-0 fw-semibold">HASHTAGS:</span>
        <button
          class="btn-tag-pill"
          :class="{ active: selectedHashtag === null }"
          @click="selectHashtag(null)"
        >
          #All
        </button>
        <button
          v-for="tag in hashtags"
          :key="tag"
          class="btn-tag-pill"
          :class="{ active: selectedHashtag === tag }"
          @click="selectHashtag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- Important Accounts Carousel / Horizontal Selector -->
    <div class="mb-4">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="text-muted small fw-semibold">IMPORTANT SECURITY RESEARCHERS:</span>
        <button
          v-if="selectedAccount"
          class="btn btn-sm btn-link text-warning text-decoration-none p-0"
          style="font-size: 0.78rem;"
          @click="selectAccount(null)"
        >
          &times; Clear Account Filter (@{{ selectedAccount }})
        </button>
      </div>
      <div class="accounts-scroll d-flex gap-2 overflow-auto pb-2">
        <div
          v-for="acc in accounts"
          :key="acc.handle"
          class="account-chip d-flex align-items-center gap-2"
          :class="{ active: selectedAccount === acc.handle }"
          @click="selectAccount(acc.handle)"
        >
          <img
            :src="'https://unavatar.io/x/' + acc.handle"
            class="account-avatar"
            :alt="acc.handle"
            @error="$event.target.style.display = 'none'"
          />
          <div class="d-flex flex-column" style="line-height: 1.1;">
            <div class="d-flex align-items-center gap-1">
              <span class="account-name">{{ acc.name }}</span>
              <svg v-if="acc.verified" width="10" height="10" fill="#38bdf8" viewBox="0 0 16 16">
                <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01-.622-.636zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z"/>
              </svg>
            </div>
            <span class="account-handle">@{{ acc.handle }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Filters Feedback bar with Live Search Button on X -->
    <div v-if="selectedHashtag || selectedAccount" class="alert alert-info py-2 px-3 d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2" style="background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.25); color: #38bdf8;">
      <div class="small d-flex align-items-center gap-2">
        <span>Filtering:</span>
        <strong v-if="selectedAccount">Researcher: @{{ selectedAccount }}</strong>
        <strong v-if="selectedHashtag">Hashtag: {{ selectedHashtag }}</strong>
      </div>
      <div class="d-flex align-items-center gap-3">
        <a
          v-if="selectedAccount"
          :href="'https://x.com/' + selectedAccount"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-sm btn-outline-info py-0 px-2"
          style="font-size: 0.78rem;"
        >
          View @{{ selectedAccount }} on 𝕏 &nearr;
        </a>
        <a
          v-if="selectedHashtag"
          :href="'https://x.com/search?q=' + encodeURIComponent(selectedHashtag) + '&f=live'"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-sm btn-outline-info py-0 px-2"
          style="font-size: 0.78rem;"
        >
          Search {{ selectedHashtag }} on 𝕏 &nearr;
        </a>
        <button class="btn btn-sm btn-link text-info text-decoration-none p-0" @click="clearAllFilters">
          Reset Filter
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-info" role="status">
        <span class="visually-hidden">Loading tweets...</span>
      </div>
      <p class="mt-3 text-secondary" style="font-family: var(--font-mono); font-size: 0.88rem;">
        STREAMING TWITTER / 𝕏 INTEL &amp; TIPS...
      </p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredItems.length === 0" class="stat-box text-center py-5">
      <p class="text-muted mb-2">No tweets match your selected filters.</p>
      <button class="btn-cyber-outline btn-sm" @click="clearAllFilters">
        Show All Tweets
      </button>
    </div>

    <!-- Tweets Stream -->
    <div v-else class="row g-3">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="col-12"
      >
        <div class="cyber-card source-tips p-3">
          <div class="d-flex align-items-start gap-3 flex-nowrap" style="min-width: 0;">
            <!-- Author Avatar -->
            <a
              v-if="item.author"
              :href="'https://x.com/' + (item.author.handle || '')"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-shrink-0"
            >
              <img
                :src="'https://unavatar.io/x/' + (item.author.handle || 'twitter')"
                class="tweet-avatar"
                :alt="item.author.name"
                @error="$event.target.src = '/assets/img/icon/bug.png'"
              />
            </a>

            <!-- Tweet Body & Details (constrained with min-width: 0 to guarantee proper text wrapping) -->
            <div class="tweet-content-col" style="min-width: 0; flex: 1 1 0%;">
              <!-- Author Header Row -->
              <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
                <strong class="text-primary fs-6">{{ item.author ? item.author.name : 'Security Researcher' }}</strong>
                <a
                  :href="'https://x.com/' + (item.author ? item.author.handle : '')"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-decoration-none"
                  style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 0.84rem;"
                >
                  @{{ item.author ? item.author.handle : 'researcher' }}
                </a>
                <span v-if="item.author && item.author.verified" class="badge-verified" title="Verified Researcher">
                  ✓
                </span>
                <span class="text-muted ms-auto" style="font-family: var(--font-mono); font-size: 0.78rem;">
                  {{ item.published_at }}
                </span>
              </div>

              <!-- Tweet Text with proper spaces and clickable tags -->
              <div
                class="tweet-text mb-3"
                v-html="renderTweetText(item.title)"
                @click="handleTweetBodyClick($event)"
              ></div>

              <!-- Tags / Hashtags Bar -->
              <div v-if="item.tags && item.tags.length" class="d-flex flex-wrap gap-1 mb-3">
                <span
                  v-for="(tag, tIdx) in item.tags"
                  :key="tIdx"
                  class="badge-tag cursor-pointer"
                  @click="handleTagClick(tag)"
                >
                  {{ tag }}
                </span>
              </div>

              <!-- Footer Bar: Metrics + Big Prominent Open on X Button -->
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top" style="border-color: var(--border-color) !important;">
                <div class="d-flex align-items-center gap-3 text-muted" style="font-size: 0.85rem; font-family: var(--font-mono);">
                  <span v-if="item.likes" title="Likes">
                    ❤️ {{ item.likes }}
                  </span>
                  <span v-if="item.retweets" title="Retweets">
                    🔁 {{ item.retweets }}
                  </span>
                </div>

                <!-- PROMINENT OPEN TWEET ON 𝕏 BUTTON + BOOKMARK BUTTON -->
                <div class="d-flex align-items-center gap-2">
                  <a
                    :href="item.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-open-x-prominent"
                    title="Open this specific tweet on 𝕏"
                  >
                    <span class="x-icon">𝕏</span>
                    <span>Open Tweet on 𝕏</span>
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                      <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                      <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                    </svg>
                  </a>

                  <button
                    class="btn-action-icon"
                    :class="{ 'saved-active': isSaved(item.id) }"
                    @click="$emit('toggle-save', item)"
                    :title="isSaved(item.id) ? 'Remove from Bookmarks' : 'Bookmark Tweet'"
                  >
                    <svg v-if="isSaved(item.id)" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                    </svg>
                    <svg v-else width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TweetsFeed',
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
      accounts: [],
      hashtags: [],
      selectedAccount: null,
      selectedHashtag: null,
      loading: false,
      showAddAccount: false,
      showAddTag: false,
      newAccountHandle: '',
      newHashtag: ''
    };
  },
  computed: {
    filteredItems() {
      let result = this.items;

      if (this.selectedAccount) {
        const target = this.selectedAccount.toLowerCase();
        result = result.filter(i => i.author && i.author.handle.toLowerCase() === target);
      }

      if (this.selectedHashtag) {
        const targetTag = this.selectedHashtag.toLowerCase();
        result = result.filter(i =>
          (i.tags && i.tags.some(t => t.toLowerCase() === targetTag)) ||
          (i.title && i.title.toLowerCase().includes(targetTag))
        );
      }

      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        result = result.filter(i =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.author && i.author.name && i.author.name.toLowerCase().includes(q)) ||
          (i.author && i.author.handle && i.author.handle.toLowerCase().includes(q)) ||
          (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
        );
      }

      return result;
    }
  },
  mounted() {
    this.fetchMetadata();
    this.fetchTweets();
  },
  methods: {
    renderTweetText(text) {
      if (!text) return '';
      // Escape HTML special characters
      let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Highlight hashtags (#word) with clickable class
      escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span class="badge-hashtag cursor-pointer">$1</span>');

      // Highlight user mentions (@word) with link styling
      escaped = escaped.replace(/(@[a-zA-Z0-9_]+)/g, '<span class="mention-tag cursor-pointer">$1</span>');

      return escaped;
    },
    handleTweetBodyClick(e) {
      const target = e.target;
      if (target && target.classList.contains('badge-hashtag')) {
        this.selectHashtag(target.innerText.trim());
      } else if (target && target.classList.contains('mention-tag')) {
        this.selectAccount(target.innerText.trim().replace(/^@/, ''));
      }
    },
    async fetchMetadata() {
      try {
        const [accRes, tagRes] = await Promise.all([
          fetch('/api/twitter/accounts'),
          fetch('/api/twitter/hashtags')
        ]);
        const accJson = await accRes.json();
        const tagJson = await tagRes.json();
        if (accJson.data) this.accounts = accJson.data;
        if (tagJson.data) this.hashtags = tagJson.data;
      } catch (e) {
        console.warn('Failed to load Twitter metadata', e);
      }
    },
    async fetchTweets() {
      this.loading = true;
      try {
        let url = '/api/feeds/tips';
        const params = [];
        if (this.selectedAccount) params.push(`account=${encodeURIComponent(this.selectedAccount)}`);
        if (this.selectedHashtag) params.push(`hashtag=${encodeURIComponent(this.selectedHashtag)}`);
        if (params.length) url += '?' + params.join('&');

        const res = await fetch(url);
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          this.items = json.data;
          this.$emit('loaded', { type: 'tips', count: this.items.length });
        }
      } catch (e) {
        console.error('Failed to load tweets feed:', e);
      } finally {
        this.loading = false;
      }
    },
    selectAccount(handle) {
      this.selectedAccount = this.selectedAccount === handle ? null : handle;
      this.fetchTweets();
    },
    selectHashtag(tag) {
      this.selectedHashtag = this.selectedHashtag === tag ? null : tag;
      this.fetchTweets();
    },
    handleTagClick(tag) {
      if (tag.startsWith('#')) {
        this.selectHashtag(tag);
      } else if (tag.startsWith('@')) {
        this.selectAccount(tag.replace(/^@/, ''));
      }
    },
    clearAllFilters() {
      this.selectedAccount = null;
      this.selectedHashtag = null;
      this.fetchTweets();
    },
    async submitAddAccount() {
      if (!this.newAccountHandle.trim()) return;
      try {
        const res = await fetch('/api/twitter/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: this.newAccountHandle.trim() })
        });
        const json = await res.json();
        if (json.status === 200 && json.accounts) {
          this.accounts = json.accounts;
          this.selectedAccount = this.newAccountHandle.replace(/^@/, '').trim();
          this.newAccountHandle = '';
          this.showAddAccount = false;
          this.fetchTweets();
        }
      } catch (e) {
        console.error('Failed to add account:', e);
      }
    },
    async submitAddHashtag() {
      if (!this.newHashtag.trim()) return;
      try {
        const res = await fetch('/api/twitter/hashtag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: this.newHashtag.trim() })
        });
        const json = await res.json();
        if (json.status === 200 && json.hashtags) {
          this.hashtags = json.hashtags;
          let tag = this.newHashtag.trim();
          if (!tag.startsWith('#')) tag = '#' + tag;
          this.selectedHashtag = tag;
          this.newHashtag = '';
          this.showAddTag = false;
          this.fetchTweets();
        }
      } catch (e) {
        console.error('Failed to add hashtag:', e);
      }
    },
    isSaved(id) {
      return this.savedIds.includes(id);
    }
  }
};
</script>

<style scoped>
.twitter-x-logo {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 10px;
  font-size: 1.4rem;
  font-weight: 800;
  color: #c084fc;
}
.btn-tag-pill {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.btn-tag-pill:hover {
  border-color: var(--accent-purple);
  color: #c084fc;
  background: rgba(168, 85, 247, 0.1);
}
.btn-tag-pill.active {
  background: var(--accent-purple);
  color: #fff;
  border-color: var(--accent-purple);
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
}
.account-chip {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.account-chip:hover {
  border-color: var(--accent-cyan);
  background: var(--bg-surface-hover);
  transform: translateY(-2px);
}
.account-chip.active {
  border-color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.15);
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
}
.account-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  object-fit: cover;
}
.account-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}
.account-handle {
  font-size: 0.68rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
}
.tweet-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  object-fit: cover;
}
.tweet-text {
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
:deep(.badge-hashtag) {
  color: #c084fc;
  text-decoration: none;
  font-weight: 600;
  font-family: var(--font-mono);
}
:deep(.badge-hashtag:hover) {
  text-decoration: underline;
  color: #e9d5ff;
}
:deep(.mention-tag) {
  color: #38bdf8;
  font-family: var(--font-mono);
  font-weight: 600;
}
:deep(.mention-tag:hover) {
  text-decoration: underline;
}
.badge-verified {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 50%;
  font-weight: bold;
}
.btn-open-x-prominent {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #0284c7 !important;
  color: #ffffff !important;
  border: 1px solid #38bdf8;
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none !important;
  box-shadow: 0 0 12px rgba(14, 165, 233, 0.4);
  transition: all 0.2s ease;
}
.btn-open-x-prominent:hover {
  background: #38bdf8 !important;
  color: #0b0f17 !important;
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.7);
  transform: translateY(-1px);
}
.x-icon {
  font-weight: 800;
  font-size: 0.95rem;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
