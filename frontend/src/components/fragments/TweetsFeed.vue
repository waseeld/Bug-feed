<template>
  <div class="tweets-feed">
    <!-- Header -->
    <div class="stat-box p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="community-logo" aria-hidden="true">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="2"/>
              <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
            </svg>
          </div>
          <div>
            <h5 class="mb-1 fw-bold d-flex align-items-center gap-2 flex-wrap">
              Community Intel
              <span class="cyber-badge badge-tips">MASTODON · BLUESKY</span>
            </h5>
            <p class="text-secondary mb-0" style="font-size: 0.88rem;">
              Recent posts from security researchers on Mastodon and Bluesky, plus an archive of older X posts.
              Dates and counts come straight from each platform.
            </p>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 flex-wrap">
          <button type="button" class="btn-cyber-outline" :aria-expanded="showAddAccount" @click="togglePanel('account')">
            + Follow account
          </button>
          <button type="button" class="btn-cyber-outline" :aria-expanded="showAddTag" @click="togglePanel('tag')">
            + Track hashtag
          </button>
          <button
            type="button"
            class="btn-action-icon"
            :disabled="loading"
            aria-label="Refresh posts"
            title="Refresh posts"
            @click="fetchPosts"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm" role="status"></span>
            <svg v-else width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Add account -->
      <form v-if="showAddAccount" class="mt-3 pt-3 border-top add-panel" @submit.prevent="submitAddAccount">
        <label class="form-label small text-secondary mb-1" for="add-account-input">Mastodon or Bluesky account</label>
        <div class="d-flex gap-2 flex-wrap align-items-start">
          <input
            id="add-account-input"
            ref="accountInput"
            v-model="newAccountHandle"
            type="text"
            class="form-control form-control-sm themed-input"
            placeholder="user@infosec.exchange or name.bsky.social"
            autocomplete="off"
            :aria-invalid="!!accountError"
            aria-describedby="add-account-help"
          />
          <button type="submit" class="btn btn-sm btn-cyber-primary" :disabled="addingAccount || !newAccountHandle.trim()">
            <span v-if="addingAccount" class="spinner-border spinner-border-sm me-1" role="status"></span>
            Follow
          </button>
          <button type="button" class="btn btn-sm btn-cyber-outline" @click="showAddAccount = false">Cancel</button>
        </div>
        <p v-if="accountError" class="small text-danger mt-2 mb-0" role="alert">{{ accountError }}</p>
        <p id="add-account-help" class="small text-muted mt-2 mb-0">
          Profile links work too. X accounts can't be read without a paid X API key.
        </p>
      </form>

      <!-- Add hashtag -->
      <form v-if="showAddTag" class="mt-3 pt-3 border-top add-panel" @submit.prevent="submitAddHashtag">
        <label class="form-label small text-secondary mb-1" for="add-tag-input">Hashtag (searched on mastodon.social)</label>
        <div class="d-flex gap-2 flex-wrap align-items-start">
          <input
            id="add-tag-input"
            ref="tagInput"
            v-model="newHashtag"
            type="text"
            class="form-control form-control-sm themed-input"
            placeholder="cloudsecurity"
            autocomplete="off"
            :aria-invalid="!!tagError"
          />
          <button type="submit" class="btn btn-sm btn-cyber-primary" :disabled="!newHashtag.trim()">Track</button>
          <button type="button" class="btn btn-sm btn-cyber-outline" @click="showAddTag = false">Cancel</button>
        </div>
        <p v-if="tagError" class="small text-danger mt-2 mb-0" role="alert">{{ tagError }}</p>
      </form>
    </div>

    <!-- Source filter -->
    <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
      <span class="text-muted small fw-semibold me-1">SOURCE:</span>
      <div class="segmented" role="group" aria-label="Post source">
        <button
          v-for="opt in sourceOptions"
          :key="opt.value"
          type="button"
          class="segmented-btn"
          :class="{ active: source === opt.value }"
          :aria-pressed="source === opt.value"
          @click="setSource(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Hashtags -->
    <div class="mb-3">
      <div class="d-flex align-items-center gap-1 overflow-auto pb-2">
        <span class="text-muted small me-2 flex-shrink-0 fw-semibold">HASHTAGS:</span>
        <button
          type="button"
          class="btn-tag-pill"
          :class="{ active: selectedHashtag === null }"
          :aria-pressed="selectedHashtag === null"
          @click="selectHashtag(null)"
        >
          All
        </button>
        <span v-for="tag in hashtags" :key="tag" class="d-inline-flex align-items-center flex-shrink-0">
          <button
            type="button"
            class="btn-tag-pill"
            :class="{ active: selectedHashtag === tag }"
            :aria-pressed="selectedHashtag === tag"
            @click="selectHashtag(tag)"
          >
            {{ tag }}
          </button>
          <button
            v-if="customHashtags.includes(tag)"
            type="button"
            class="remove-btn"
            :aria-label="'Stop tracking ' + tag"
            :title="'Stop tracking ' + tag"
            @click="removeHashtag(tag)"
          >&times;</button>
        </span>
      </div>
    </div>

    <!-- Accounts -->
    <div class="mb-4">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="text-muted small fw-semibold">RESEARCHERS ({{ accounts.length }}):</span>
        <button
          v-if="selectedAccount"
          type="button"
          class="btn btn-sm btn-link text-warning text-decoration-none p-0"
          style="font-size: 0.78rem;"
          @click="selectAccount(null)"
        >
          &times; Clear account filter
        </button>
      </div>
      <div class="accounts-scroll d-flex gap-2 overflow-auto pb-2">
        <span v-if="!accounts.length && accountsLoading" class="text-muted small">Loading accounts…</span>
        <div v-for="acc in accounts" :key="acc.platform + ':' + acc.handle" class="d-inline-flex align-items-center flex-shrink-0">
          <button
            type="button"
            class="account-chip d-flex align-items-center gap-2"
            :class="{ active: selectedAccount === acc.handle, unreachable: acc.reachable === false }"
            :aria-pressed="selectedAccount === acc.handle"
            :title="accountTitle(acc)"
            @click="selectAccount(acc.handle)"
          >
            <img v-if="acc.avatar" :src="acc.avatar" class="account-avatar" alt="" loading="lazy" referrerpolicy="no-referrer" @error="acc.avatar = null" />
            <span v-else class="account-avatar avatar-fallback" aria-hidden="true">{{ initials(acc.name) }}</span>
            <span class="d-flex flex-column text-start" style="line-height: 1.15;">
              <span class="account-name">{{ acc.name }}</span>
              <span class="account-handle">
                <span class="platform-dot" :class="'platform-' + acc.platform"></span>{{ displayHandle(acc) }}
              </span>
            </span>
          </button>
          <button
            v-if="acc.custom"
            type="button"
            class="remove-btn"
            :aria-label="'Unfollow ' + acc.handle"
            :title="'Unfollow ' + acc.handle"
            @click="removeAccount(acc)"
          >&times;</button>
        </div>
      </div>
    </div>

    <!-- Active filter -->
    <div v-if="selectedHashtag || selectedAccount" class="filter-bar d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <div class="small d-flex align-items-center gap-2 flex-wrap">
        <span>Showing</span>
        <strong v-if="selectedAccount">{{ selectedAccount }}</strong>
        <strong v-if="selectedHashtag">{{ selectedHashtag }}</strong>
        <a
          v-if="selectedAccountProfile"
          :href="selectedAccountProfile"
          target="_blank"
          rel="noopener noreferrer"
          class="small"
        >Open profile &nearr;</a>
      </div>
      <button type="button" class="btn btn-sm btn-link text-info text-decoration-none p-0" @click="clearAllFilters">
        Reset filter
      </button>
    </div>

    <!-- Source errors -->
    <div v-if="sourceErrors.length" class="alert alert-warning py-2 px-3 small mb-3" role="status">
      {{ sourceErrors.length }} source{{ sourceErrors.length > 1 ? 's' : '' }} could not be reached:
      {{ sourceErrors.map(e => e.source).join(', ') }}.
      <span v-if="sourceErrors.length === 1">{{ sourceErrors[0].error }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading && !items.length" class="text-center py-5">
      <div class="spinner-border text-info" role="status">
        <span class="visually-hidden">Loading posts…</span>
      </div>
      <p class="mt-3 text-secondary" style="font-family: var(--font-mono); font-size: 0.88rem;">
        Loading posts from Mastodon and Bluesky…
      </p>
    </div>

    <!-- Load error -->
    <div v-else-if="loadError && !items.length" class="stat-box text-center py-5" role="alert">
      <p class="text-danger mb-3">{{ loadError }}</p>
      <button type="button" class="btn-cyber-outline" @click="fetchPosts">Try again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredItems.length === 0" class="stat-box text-center py-5">
      <p class="text-muted mb-2">No posts match these filters.</p>
      <button type="button" class="btn-cyber-outline btn-sm" @click="clearAllFilters">Show all posts</button>
    </div>

    <!-- Posts -->
    <div v-else class="row g-3" :class="{ 'is-loading': loading }" :aria-busy="loading">
      <div v-for="item in filteredItems" :key="item.id" class="col-12">
        <article class="cyber-card source-tips p-3" :class="{ archived: item.archived }">
          <div class="d-flex align-items-start gap-3 flex-nowrap" style="min-width: 0;">
            <a
              v-if="item.author"
              :href="item.author.profile_url || item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-shrink-0"
              :aria-label="'Profile of ' + item.author.name"
            >
              <img
                v-if="item.author.avatar"
                :src="item.author.avatar"
                class="tweet-avatar"
                alt=""
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="item.author.avatar = null"
              />
              <span v-else class="tweet-avatar avatar-fallback" aria-hidden="true">{{ initials(item.author.name) }}</span>
            </a>

            <div class="tweet-content-col" style="min-width: 0; flex: 1 1 0%;">
              <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
                <strong class="text-primary fs-6">{{ item.author ? item.author.name : 'Unknown author' }}</strong>
                <a
                  v-if="item.author"
                  :href="item.author.profile_url || item.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-decoration-none author-handle"
                >
                  @{{ item.author.handle }}
                </a>
                <span class="platform-badge" :class="'platform-' + item.platform">{{ platformLabel(item) }}</span>
                <time class="text-muted ms-auto post-time" :datetime="item.published_at" :title="fullDate(item.published_at)">
                  {{ relativeDate(item.published_at) }}
                </time>
              </div>

              <div class="tweet-text mb-3" v-html="renderPostText(item.title)" @click="handleTweetBodyClick"></div>

              <div v-if="item.tags && item.tags.length" class="d-flex flex-wrap gap-1 mb-3">
                <button
                  v-for="tag in item.tags"
                  :key="tag"
                  type="button"
                  class="badge-tag"
                  @click="handleTagClick(tag)"
                >
                  {{ tag }}
                </button>
              </div>

              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top" style="border-color: var(--border-color) !important;">
                <div class="d-flex align-items-center gap-3 text-muted metrics">
                  <span v-if="item.likes !== null && item.likes !== undefined" :title="item.likes + ' likes'">♥ {{ formatCount(item.likes) }}</span>
                  <span v-if="item.reposts !== null && item.reposts !== undefined" :title="item.reposts + ' reposts'">⟲ {{ formatCount(item.reposts) }}</span>
                  <span v-if="item.replies !== null && item.replies !== undefined" :title="item.replies + ' replies'">💬 {{ formatCount(item.replies) }}</span>
                  <span v-if="item.archived" class="small">Archived post · no live counts</span>
                </div>

                <div class="d-flex align-items-center gap-2">
                  <a :href="item.url" target="_blank" rel="noopener noreferrer" class="btn-open-post">
                    Open on {{ platformName(item.platform) }}
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                      <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                      <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                    </svg>
                  </a>

                  <button
                    type="button"
                    class="btn-action-icon"
                    :class="{ 'saved-active': isSaved(item.id) }"
                    :aria-pressed="isSaved(item.id)"
                    :aria-label="isSaved(item.id) ? 'Remove bookmark' : 'Bookmark post'"
                    :title="isSaved(item.id) ? 'Remove bookmark' : 'Bookmark post'"
                    @click="$emit('toggle-save', item)"
                  >
                    <svg v-if="isSaved(item.id)" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                    </svg>
                    <svg v-else width="15" height="15" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script>
const PLATFORM_NAMES = { mastodon: 'Mastodon', bluesky: 'Bluesky', x: 'X' };
const DEFAULT_HASHTAGS = ['#bugbounty', '#bugbountytips', '#threatintel', '#redteam', '#appsec', '#infosec', '#cve'];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Links, hashtags and @mentions (including @user@server) in one pass, so a "#" inside a URL is left alone.
const TOKEN_RE = /(https?:\/\/[^\s<>"]+)|(#[\p{L}\p{N}_]+)|(@[A-Za-z0-9_.]+(?:@[A-Za-z0-9.-]+\.[A-Za-z]{2,})?)/gu;

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
      source: 'all',
      sourceOptions: [
        { value: 'all', label: 'All' },
        { value: 'live', label: 'Live' },
        { value: 'archive', label: 'X archive' }
      ],
      sourceErrors: [],
      loading: false,
      loadError: '',
      accountsLoading: false,
      showAddAccount: false,
      showAddTag: false,
      newAccountHandle: '',
      newHashtag: '',
      accountError: '',
      tagError: '',
      addingAccount: false,
      controller: null
    };
  },
  computed: {
    customHashtags() {
      return this.hashtags.filter(t => !DEFAULT_HASHTAGS.includes(t));
    },
    selectedAccountProfile() {
      const acc = this.accounts.find(a => a.handle === this.selectedAccount);
      return acc && acc.profile_url ? acc.profile_url : null;
    },
    filteredItems() {
      const q = (this.searchQuery || '').trim().toLowerCase();
      if (!q) return this.items;
      return this.items.filter(i =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.author && i.author.name && i.author.name.toLowerCase().includes(q)) ||
        (i.author && i.author.handle && i.author.handle.toLowerCase().includes(q)) ||
        (i.tags && i.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
  },
  mounted() {
    this.fetchMetadata();
    this.fetchPosts();
  },
  beforeUnmount() {
    if (this.controller) this.controller.abort();
  },
  methods: {
    renderPostText(text) {
      if (!text) return '';
      const raw = String(text);
      let html = '';
      let last = 0;
      for (const match of raw.matchAll(TOKEN_RE)) {
        const [token, url, tag, mention] = match;
        const before = match.index > 0 ? raw[match.index - 1] : ' ';
        // Skip "#" or "@" glued to a word (e.g. emails, C#).
        if ((tag || mention) && /[\p{L}\p{N}_]/u.test(before)) continue;
        html += escapeHtml(raw.slice(last, match.index));
        if (url) {
          const clean = url.replace(/[.,;:!?)\]]+$/, '');
          html += `<a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(clean)}</a>`;
          html += escapeHtml(url.slice(clean.length));
        } else if (tag) {
          html += `<button type="button" class="badge-hashtag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
        } else {
          html += `<button type="button" class="mention-tag" data-account="${escapeHtml(mention.slice(1))}">${escapeHtml(mention)}</button>`;
        }
        last = match.index + token.length;
      }
      return html + escapeHtml(raw.slice(last));
    },
    handleTweetBodyClick(e) {
      const target = e.target.closest('button');
      if (!target) return;
      if (target.dataset.tag) this.selectHashtag(target.dataset.tag.toLowerCase());
      else if (target.dataset.account) this.selectAccount(target.dataset.account);
    },
    platformName(platform) {
      return PLATFORM_NAMES[platform] || 'source';
    },
    platformLabel(item) {
      return item.archived ? 'X archive' : this.platformName(item.platform);
    },
    displayHandle(acc) {
      return acc.platform === 'mastodon' ? '@' + acc.handle : acc.handle;
    },
    accountTitle(acc) {
      const parts = [acc.name, this.displayHandle(acc), this.platformName(acc.platform)];
      if (acc.bio) parts.push(acc.bio);
      if (acc.reachable === false) parts.push('(could not be reached just now)');
      return parts.join('\n');
    },
    initials(name) {
      return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    },
    formatCount(n) {
      if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(n);
    },
    relativeDate(iso) {
      const t = Date.parse(iso);
      if (Number.isNaN(t)) return '';
      const diff = (Date.now() - t) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
      return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    },
    fullDate(iso) {
      const t = Date.parse(iso);
      return Number.isNaN(t) ? '' : new Date(t).toLocaleString();
    },
    async fetchMetadata() {
      this.accountsLoading = true;
      try {
        const [accRes, tagRes] = await Promise.all([
          fetch('/api/twitter/accounts'),
          fetch('/api/twitter/hashtags')
        ]);
        const accJson = await accRes.json();
        const tagJson = await tagRes.json();
        if (Array.isArray(accJson.data)) this.accounts = accJson.data;
        if (Array.isArray(tagJson.data)) this.hashtags = tagJson.data;
      } catch (e) {
        console.warn('Failed to load community sources', e);
      } finally {
        this.accountsLoading = false;
      }
    },
    async fetchPosts() {
      if (this.controller) this.controller.abort();
      const controller = new AbortController();
      this.controller = controller;

      const params = new URLSearchParams({ source: this.source });
      if (this.selectedAccount) params.set('account', this.selectedAccount);
      if (this.selectedHashtag) params.set('hashtag', this.selectedHashtag);

      this.loading = true;
      this.loadError = '';
      try {
        const res = await fetch(`/api/feeds/tips?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`);
        this.items = Array.isArray(json.data) ? json.data : [];
        this.sourceErrors = Array.isArray(json.errors) ? json.errors : [];
        this.$emit('loaded', { type: 'tips', count: this.items.length });
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('Failed to load community feed:', e);
        this.loadError = 'Could not load posts. Check your connection and try again.';
      } finally {
        if (this.controller === controller) {
          this.loading = false;
          this.controller = null;
        }
      }
    },
    setSource(value) {
      if (this.source === value) return;
      this.source = value;
      this.fetchPosts();
    },
    selectAccount(handle) {
      this.selectedAccount = this.selectedAccount === handle ? null : handle;
      if (this.selectedAccount) this.selectedHashtag = null;
      this.fetchPosts();
    },
    selectHashtag(tag) {
      this.selectedHashtag = this.selectedHashtag === tag ? null : tag;
      if (this.selectedHashtag) this.selectedAccount = null;
      this.fetchPosts();
    },
    handleTagClick(tag) {
      if (tag.startsWith('#')) this.selectHashtag(tag.toLowerCase());
    },
    clearAllFilters() {
      this.selectedAccount = null;
      this.selectedHashtag = null;
      this.fetchPosts();
    },
    togglePanel(which) {
      this.accountError = '';
      this.tagError = '';
      if (which === 'account') {
        this.showAddAccount = !this.showAddAccount;
        this.showAddTag = false;
        if (this.showAddAccount) this.$nextTick(() => this.$refs.accountInput && this.$refs.accountInput.focus());
      } else {
        this.showAddTag = !this.showAddTag;
        this.showAddAccount = false;
        if (this.showAddTag) this.$nextTick(() => this.$refs.tagInput && this.$refs.tagInput.focus());
      }
    },
    async submitAddAccount() {
      const handle = this.newAccountHandle.trim();
      if (!handle) return;
      this.addingAccount = true;
      this.accountError = '';
      try {
        const res = await fetch('/api/twitter/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not add this account.');
        if (Array.isArray(json.accounts)) this.accounts = json.accounts;
        this.newAccountHandle = '';
        this.showAddAccount = false;
        this.selectedHashtag = null;
        this.selectedAccount = json.account.handle;
        this.fetchPosts();
      } catch (e) {
        this.accountError = e.message;
      } finally {
        this.addingAccount = false;
      }
    },
    async removeAccount(acc) {
      try {
        const res = await fetch(`/api/twitter/account/${encodeURIComponent(acc.handle)}`, { method: 'DELETE' });
        if (!res.ok) return;
        this.accounts = this.accounts.filter(a => a.handle !== acc.handle);
        if (this.selectedAccount === acc.handle) this.clearAllFilters();
      } catch (e) {
        console.error('Failed to remove account:', e);
      }
    },
    async submitAddHashtag() {
      const tag = this.newHashtag.trim();
      if (!tag) return;
      this.tagError = '';
      try {
        const res = await fetch('/api/twitter/hashtag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not add this hashtag.');
        if (Array.isArray(json.hashtags)) this.hashtags = json.hashtags;
        this.newHashtag = '';
        this.showAddTag = false;
        this.selectedAccount = null;
        this.selectedHashtag = json.tag;
        this.fetchPosts();
      } catch (e) {
        this.tagError = e.message;
      }
    },
    async removeHashtag(tag) {
      try {
        const res = await fetch(`/api/twitter/hashtag/${encodeURIComponent(tag.replace(/^#/, ''))}`, { method: 'DELETE' });
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json.hashtags)) this.hashtags = json.hashtags;
        if (this.selectedHashtag === tag) this.clearAllFilters();
      } catch (e) {
        console.error('Failed to remove hashtag:', e);
      }
    },
    isSaved(id) {
      return this.savedIds.includes(id);
    }
  }
};
</script>

<style scoped>
.community-logo {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 10px;
  color: #c084fc;
}
.add-panel {
  border-color: var(--border-color) !important;
}
.themed-input {
  max-width: 360px;
  background: var(--bg-main);
  color: var(--text-primary);
  border-color: var(--border-color);
}
.themed-input::placeholder {
  color: var(--text-muted);
}
.segmented {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.segmented-btn {
  background: var(--bg-surface);
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 5px 14px;
  cursor: pointer;
}
.segmented-btn + .segmented-btn {
  border-left: 1px solid var(--border-color);
}
.segmented-btn.active {
  background: var(--accent-cyan);
  color: #020817;
  font-weight: 700;
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
.remove-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1;
  padding: 0 6px;
  cursor: pointer;
}
.remove-btn:hover,
.remove-btn:focus-visible {
  color: var(--accent-ruby);
}
.account-chip {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  color: inherit;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.account-chip:hover {
  border-color: var(--accent-cyan);
  background: var(--bg-surface-hover);
}
.account-chip.active {
  border-color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.15);
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
}
.account-chip.unreachable {
  opacity: 0.6;
}
.account-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  object-fit: cover;
  flex-shrink: 0;
}
.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
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
.platform-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.platform-mastodon { --platform-color: #8b5cf6; }
.platform-bluesky { --platform-color: #0ea5e9; }
.platform-x { --platform-color: #94a3b8; }
.platform-dot { background: var(--platform-color, #94a3b8); }
.platform-badge {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--platform-color, var(--border-color));
  color: var(--platform-color, var(--text-secondary));
}
.filter-bar {
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.25);
  color: #38bdf8;
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
}
.tweet-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  object-fit: cover;
}
.author-handle {
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  font-size: 0.84rem;
  overflow-wrap: anywhere;
}
.post-time {
  font-family: var(--font-mono);
  font-size: 0.78rem;
}
.cyber-card.archived {
  opacity: 0.85;
}
.tweet-text {
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-line;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.tweet-text :deep(a) {
  color: var(--accent-cyan);
}
.tweet-text :deep(.badge-hashtag),
.tweet-text :deep(.mention-tag) {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
}
.tweet-text :deep(.badge-hashtag) {
  color: #c084fc;
}
.tweet-text :deep(.mention-tag) {
  color: #38bdf8;
}
.tweet-text :deep(.badge-hashtag:hover),
.tweet-text :deep(.mention-tag:hover) {
  text-decoration: underline;
}
.badge-tag {
  cursor: pointer;
}
.metrics {
  font-size: 0.85rem;
  font-family: var(--font-mono);
}
.btn-open-post {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #0284c7;
  color: #ffffff;
  border: 1px solid #38bdf8;
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease;
}
.btn-open-post:hover,
.btn-open-post:focus-visible {
  background: #38bdf8;
  color: #0b0f17;
}
.is-loading {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
</style>
