<template>
  <div class="blog-post-wrap">
    <p v-if="loading" class="text-center text-secondary py-5" style="font-family: var(--font-mono);" role="status">
      Loading brief…
    </p>
    <div v-else-if="error" class="text-center py-5" role="alert">
      <p style="color: #fda4af;">{{ error }}</p>
      <a class="btn-cyber-outline d-inline-flex" href="/blog" @click.prevent="$emit('back')">Back to the blog</a>
    </div>
    <article v-else-if="post" class="blog-article" dir="rtl" lang="ar">
      <a class="blog-back" href="/blog" dir="ltr" @click.prevent="$emit('back')">← All briefs</a>
      <p class="blog-kicker" dir="ltr">CYPRWANA BRIEF</p>
      <h1>{{ post.title }}</h1>
      <time dir="ltr" :datetime="post.published_at">{{ post.date }}<template v-if="post.time"> · {{ post.time }}</template> · {{ post.timezone || 'Asia/Riyadh' }}</time>
      <div v-if="post.cves && post.cves.length" class="blog-cves blog-cves-post" dir="ltr">
        <a
          v-for="cve in post.cves"
          :key="cve"
          class="badge-tag"
          :href="'https://nvd.nist.gov/vuln/detail/' + cve"
          target="_blank"
          rel="noopener noreferrer"
        >{{ cve }}</a>
      </div>
      <div class="blog-body" v-html="post.html"></div>
    </article>
  </div>
</template>

<script>
export default {
  name: 'BlogPost',
  props: {
    slug: {
      type: String,
      required: true
    }
  },
  emits: ['back', 'loaded'],
  data() {
    return {
      post: null,
      loading: true,
      error: ''
    };
  },
  watch: {
    slug: {
      immediate: true,
      handler() {
        this.fetchPost();
      }
    }
  },
  methods: {
    async fetchPost() {
      this.loading = true;
      this.error = '';
      this.post = null;
      try {
        const res = await fetch('/api/blog/' + encodeURIComponent(this.slug));
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'This brief was not found.');
        this.post = json.data;
        this.$emit('loaded', this.post.title);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
