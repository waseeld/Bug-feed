<template>
  <section class="blog-list" aria-labelledby="blog-heading">
    <div class="stat-box p-4 mb-4">
      <div class="d-flex align-items-center gap-3">
        <div class="blog-mark" aria-hidden="true">
          <svg width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
            <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
          </svg>
        </div>
        <div>
          <h1 id="blog-heading" class="h5 mb-1 fw-bold d-flex align-items-center gap-2 flex-wrap">
            Blog
            <span class="cyber-badge badge-tips">CYPRWANA</span>
          </h1>
          <p class="text-secondary mb-0" style="font-size: 0.9rem;">
            Cyber threat briefs in the original wording. Each post keeps its items, sources, and CVE identifiers. Times are Asia/Riyadh.
          </p>
        </div>
      </div>
    </div>

    <p v-if="loading" class="text-center text-secondary py-5" style="font-family: var(--font-mono);" role="status">
      Loading briefs…
    </p>
    <p v-else-if="error" class="text-center py-5" role="alert" style="color: #fda4af;">
      {{ error }}
    </p>
    <p v-else-if="filtered.length === 0" class="text-center text-secondary py-5">
      No briefs match this search.
    </p>

    <div v-else class="blog-grid">
      <article v-for="post in filtered" :key="post.slug" class="blog-card">
        <a
          class="blog-card-link"
          :href="'/blog/' + post.slug"
          @click.prevent="$emit('open', post.slug)"
        >
          <time dir="ltr" :datetime="post.published_at">{{ post.date }}<template v-if="post.time"> · {{ post.time }}</template> · {{ post.timezone || 'Asia/Riyadh' }}</time>
          <h2 dir="rtl" lang="ar">{{ post.title }}</h2>
          <p v-if="post.excerpt" dir="rtl" lang="ar">{{ post.excerpt }}</p>
          <div v-if="post.cves && post.cves.length" class="blog-cves" dir="ltr">
            <span v-for="cve in post.cves" :key="cve" class="badge-tag">{{ cve }}</span>
          </div>
        </a>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'BlogList',
  props: {
    searchQuery: {
      type: String,
      default: ''
    }
  },
  emits: ['open'],
  data() {
    return {
      posts: [],
      loading: true,
      error: ''
    };
  },
  computed: {
    filtered() {
      const query = (this.searchQuery || '').trim().toLowerCase();
      if (!query) return this.posts;
      return this.posts.filter((post) => {
        const haystack = [post.title, post.excerpt, post.text, ...(post.cves || [])].join('\n').toLowerCase();
        return haystack.includes(query);
      });
    }
  },
  mounted() {
    this.fetchPosts();
  },
  methods: {
    async fetchPosts() {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch('/api/blog');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load the blog.');
        this.posts = Array.isArray(json.data) ? json.data : [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
