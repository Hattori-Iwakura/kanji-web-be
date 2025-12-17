import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as xml2js from 'xml2js';
import { FuriganaService } from '../../shared/services/furigana.service';

// Helper function để tạo ngày trong quá khứ
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// Helper function để tạo ngày với giờ cụ thể
function dateWithHour(daysAgo: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  publishedAt: string;
  source: string;
  category: string;
  tags?: string[];
  level?: string;
}

export interface NewsCategory {
  id: string;
  name: string;
  nameJp: string;
  icon: string;
}

export enum NewsLevel {
  EASY = 'easy',
  NORMAL = 'normal',
  ALL = 'all'
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private articleCache: Map<string, any> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly furiganaService: FuriganaService,
  ) {}

  async getFormattedNews(category?: string, limit: number = 20, page: number = 1, level?: string): Promise<any> {
    try {
      this.logger.log('📰 Fetching news from NHK News Web Easy...');
      
      const allNews = await this.fetchNHKNewsWebEasy();

      if (allNews.length > 0) {
        this.logger.log(`✅ Got ${allNews.length} articles from NHK Easy`);
        return this.processRealNews(allNews, category, limit, page, level);
      }
    } catch (error) {
      this.logger.error('❌ Failed to fetch NHK Easy news, using mock data', error);
    }
    
    this.logger.log('📦 Using mock data for formatted news feed');
    return this.getMockNews(category, limit, page, level);
  }

  private async fetchNHKNewsWebEasy(): Promise<any[]> {
    try {
      this.logger.log('📰 Fetching from Asahi Shimbun RSS feeds...');
      
      // Asahi Shimbun RSS feeds - major Japanese newspaper
      const rssFeeds = [
        'https://www.asahi.com/rss/asahi/newsheadlines.rdf',  // Top headlines
        'https://www.asahi.com/rss/asahi/national.rdf',       // National news
        'https://www.asahi.com/rss/asahi/politics.rdf',       // Politics
        'https://www.asahi.com/rss/asahi/business.rdf',       // Business
        'https://www.asahi.com/rss/asahi/international.rdf',  // International
        'https://www.asahi.com/rss/asahi/sports.rdf',         // Sports
        'https://www.asahi.com/rss/asahi/culture.rdf',        // Culture
      ];

      const allArticles: any[] = [];

      // Fetch from all RSS feeds in parallel
      const results = await Promise.allSettled(
        rssFeeds.map(url => this.fetchSingleRSS(url))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          this.logger.log(`✅ Feed ${index + 1}: ${result.value.length} articles`);
          allArticles.push(...result.value);
        } else if (result.status === 'rejected') {
          this.logger.warn(`⚠️ Feed ${index + 1} failed: ${result.reason}`);
        }
      });

      this.logger.log(`📊 Total articles fetched: ${allArticles.length}`);

      // Deduplicate by URL
      const uniqueArticles = this.deduplicateByUrl(allArticles);
      this.logger.log(`✅ Unique articles after dedup: ${uniqueArticles.length}`);

      // Update cache timestamp
      this.cacheTimestamp = Date.now();

      return uniqueArticles;
    } catch (error) {
      this.logger.error('❌ Error fetching Asahi Shimbun News', error);
      return [];
    }
  }

  private async fetchSingleRSS(rssUrl: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml',
          },
          timeout: 10000,
        })
      );

      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
      });

      const result = await parser.parseStringPromise(response.data);
      
      // Asahi Shimbun uses RDF format: <rdf:RDF><item>...</item></rdf:RDF>
      let items = result['rdf:RDF']?.item || result.rss?.channel?.item || [];
      
      if (!Array.isArray(items)) {
        items = [items];
      }
      
      if (items.length === 0) {
        return [];
      }

      // Process articles - limit to 5 per feed for faster loading
      const articles = await Promise.all(
        items.slice(0, 5).map(async (item: any, index: number) => {
          const description = this.cleanDescription(item.description || '');
          
          // Use stable ID based on article URL
          const articleId = this.generateStableId(item.link);
          
          // Asahi RSS doesn't have media, need to scrape from HTML
          let imageUrl: string | undefined;
          let audioUrl: string | undefined;
          let videoUrl: string | undefined;
          let fullContent: string = '';
          
          try {
            const html = await this.fetchArticleHTML(item.link);
            imageUrl = this.extractImageFromHTML(html);
            audioUrl = this.extractAudioFromHTML(html);
            videoUrl = this.extractVideoFromHTML(html);
            fullContent = this.extractArticleContentFromHTML(html);
            
            if (imageUrl) {
              this.logger.debug(`📸 Image found: ${imageUrl.substring(0, 50)}...`);
            }
            if (audioUrl) {
              this.logger.log(`🔊 Audio found: ${audioUrl}`);
            }
            if (fullContent) {
              this.logger.debug(`📄 Content extracted: ${fullContent.length} chars`);
            }
          } catch (error) {
            this.logger.debug(`⚠️ Failed to fetch HTML for ${item.link}: ${error.message}`);
          }
          
          // Use full content if available, otherwise fall back to description
          const content = fullContent || this.createReadableContent(description, item.title);
          
          // Handle both RDF and standard RSS date formats
          const dateField = item['dc:date'] || item.pubDate || item.date || new Date().toISOString();
          const category = item['dc:subject'] || this.mapNHKCategory(item.title);
          
          const article = {
            id: articleId,
            title: item.title,
            description: description.substring(0, 150) + (description.length > 150 ? '...' : ''),
            content: content,
            url: item.link,
            imageUrl: imageUrl || this.getDefaultNHKEasyImage(index),
            audioUrl: audioUrl || undefined, // Audio URL from article HTML (rare for Asahi)
            videoUrl: videoUrl || undefined, // Video URL from article HTML (rare)
            publishedAt: new Date(dateField).toISOString(),
            source: 'Asahi Shimbun',
            category: category,
            tags: this.extractTags(item.title),
            level: 'beginner',
            // Store content for TTS generation (fallback if no audio available)
            ttsText: this.extractTextForTTS(description, item.title),
          };
          
          // Cache article for later retrieval
          this.articleCache.set(articleId, article);
          
          return article;
        })
      );
      
      // Update cache timestamp
      this.cacheTimestamp = Date.now();

      return articles;
    } catch (error) {
      return [];
    }
  }

  private async fetchArticleHTML(url: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 5000, // Faster timeout for better UX
      })
    );
    return response.data;
  }

  private extractImageFromHTML(html: string): string | undefined {
    // Asahi Shimbun and general news image patterns
    const patterns = [
      // OG image (Asahi uses this)
      /<meta property="og:image" content="([^"]+)"/i,
      // Twitter image
      /<meta name="twitter:image" content="([^"]+)"/i,
      // Article images
      /<img[^>]+class="[^"]*article-image[^"]*"[^>]+src="([^"]+)"/i,
      /<img[^>]+src="([^"]+)"[^>]*class="[^"]*article-image[^"]*"/i,
      // Photo containers
      /<div[^>]+class="[^"]*photo[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i,
      // Asahi specific - srcset
      /<img[^>]+srcset="\/\/www\.asahicom\.jp\/imgopt\/img\/[^/]+\/comm_L\/([^"\s]+)"/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let url = match[1];
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url.startsWith('/')) {
          // Try to determine base domain from HTML
          if (html.includes('asahi.com')) {
            url = 'https://www.asahi.com' + url;
          } else {
            url = 'https://www3.nhk.or.jp' + url;
          }
        }
        return url;
      }
    }
    return undefined;
  }

  private extractAudioFromHTML(html: string): string | undefined {
    // Note: Asahi Shimbun doesn't provide audio files in articles
    // This is for other news sources that might have audio
    const patterns = [
      /<audio[^>]+src="([^"]+)"/i,
      /<source[^>]+src="([^"]+\.mp3)"/i,
      /<source[^>]+type="audio\/[^"]+"[^>]+src="([^"]+)"/i,
      /data-audio-src="([^"]+)"/i,
      /<a[^>]+href="([^"]+\.mp3)"/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let url = match[1];
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url.startsWith('/')) {
          if (html.includes('asahi.com')) {
            url = 'https://www.asahi.com' + url;
          } else {
            url = 'https://www3.nhk.or.jp' + url;
          }
        }
        this.logger.log(`🔊 Found audio URL: ${url}`);
        return url;
      }
    }
    return undefined;
  }

  private extractVideoFromHTML(html: string): string | undefined {
    const patterns = [
      /<video[^>]+src="([^"]+)"/i,
      /<source[^>]+src="([^"]+\.mp4)"/i,
      /data-video-src="([^"]+)"/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let url = match[1];
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url.startsWith('/')) url = 'https://www3.nhk.or.jp' + url;
        return url;
      }
    }
    return undefined;
  }

  private extractArticleContentFromHTML(html: string): string {
    try {
      // Asahi Shimbun article content is in <p> tags within the article body
      // Pattern: Find all <p> tags that contain Japanese text
      const paragraphs: string[] = [];
      
      // Match all <p> tags with content
      const pTagPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let match;
      
      while ((match = pTagPattern.exec(html)) !== null) {
        let text = match[1];
        
        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, '');
        
        // Decode HTML entities
        text = text
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&hellip;/g, '…');
        
        // Clean up whitespace
        text = text.trim();
        
        // Only keep paragraphs with Japanese content and reasonable length
        if (text.length > 20 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
          // Skip common UI elements
          if (!text.includes('PR') && 
              !text.includes('広告') && 
              !text.includes('cookie') &&
              !text.includes('ログイン') &&
              !text.includes('会員登録') &&
              !text.includes('購読') &&
              !text.match(/^\d+$/)) {
            paragraphs.push(text);
          }
        }
      }
      
      if (paragraphs.length > 0) {
        // Limit to reasonable article length (first 15 paragraphs)
        const content = paragraphs.slice(0, 15).join('\n\n');
        return content;
      }
      
      return '';
    } catch (error) {
      this.logger.debug(`Failed to extract content: ${error.message}`);
      return '';
    }
  }

  private deduplicateByUrl(articles: any[]): any[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const unique: any[] = [];

    for (const article of articles) {
      const urlKey = article.url || article.id;
      const titleKey = article.title?.toLowerCase().trim();
      
      // Check both URL and title to catch duplicates with different URLs
      if (!seenUrls.has(urlKey) && (!titleKey || !seenTitles.has(titleKey))) {
        seenUrls.add(urlKey);
        if (titleKey) {
          seenTitles.add(titleKey);
        }
        unique.push(article);
      }
    }

    return unique;
  }

  private generateStableId(url: string): string {
    // Extract article ID from NHK URL
    // Example: https://www3.nhk.or.jp/news/easy/k10014321321000/k10014321321000.html
    // Pattern: /news/easy/{id}/{id}.html or /news/html/{date}/{id}.html
    
    // Try to match k10... pattern (most common)
    let match = url.match(/\/(k\d+)\//);
    if (match && match[1]) {
      this.logger.debug(`📝 Extracted ID from URL: ${match[1]} (${url})`);
      return match[1];
    }
    
    // Try to match the full path segment before .html
    match = url.match(/\/([^\/]+)\.html/);
    if (match && match[1]) {
      this.logger.debug(`📝 Extracted ID from filename: ${match[1]} (${url})`);
      return match[1];
    }
    
    // Fallback: create hash from full URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const generatedId = 'nhk-' + Math.abs(hash).toString(36);
    this.logger.debug(`📝 Generated hash ID: ${generatedId} (${url})`);
    return generatedId;
  }

  private extractImageFromRSSItem(item: any): string | undefined {
    // Try different RSS image fields
    // 1. media:thumbnail
    if (item['media:thumbnail']) {
      const thumb = item['media:thumbnail'];
      if (typeof thumb === 'string') return thumb;
      if (thumb.url) return thumb.url;
      if (thumb.$?.url) return thumb.$.url;
    }
    
    // 2. media:content (can be image or video)
    if (item['media:content']) {
      const media = Array.isArray(item['media:content']) 
        ? item['media:content'] 
        : [item['media:content']];
      
      for (const m of media) {
        const type = m.type || m.$?.type || '';
        const url = m.url || m.$?.url;
        if (type.startsWith('image/') && url) {
          return url;
        }
      }
    }
    
    // 3. enclosure with image type
    if (item.enclosure) {
      const enc = item.enclosure;
      const type = enc.type || enc.$?.type || '';
      const url = enc.url || enc.$?.url;
      if (type.startsWith('image/') && url) {
        return url;
      }
    }
    
    // 4. Look in description for img tags
    if (item.description) {
      const imgMatch = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
    }
    
    return undefined;
  }

  private extractAudioFromRSSItem(item: any): string | undefined {
    // 1. media:content with audio type
    if (item['media:content']) {
      const media = Array.isArray(item['media:content']) 
        ? item['media:content'] 
        : [item['media:content']];
      
      for (const m of media) {
        const type = m.type || m.$?.type || '';
        const url = m.url || m.$?.url;
        if (type.startsWith('audio/') && url) {
          return url;
        }
        // Check for .mp3 extension
        if (url && url.endsWith('.mp3')) {
          return url;
        }
      }
    }
    
    // 2. enclosure with audio type
    if (item.enclosure) {
      const enc = item.enclosure;
      const type = enc.type || enc.$?.type || '';
      const url = enc.url || enc.$?.url;
      if (type.startsWith('audio/') && url) {
        return url;
      }
      if (url && url.endsWith('.mp3')) {
        return url;
      }
    }
    
    return undefined;
  }

  private extractVideoFromRSSItem(item: any): string | undefined {
    // 1. media:content with video type
    if (item['media:content']) {
      const media = Array.isArray(item['media:content']) 
        ? item['media:content'] 
        : [item['media:content']];
      
      for (const m of media) {
        const type = m.type || m.$?.type || '';
        const url = m.url || m.$?.url;
        if (type.startsWith('video/') && url) {
          return url;
        }
        // Check for video extensions
        if (url && (url.endsWith('.mp4') || url.endsWith('.webm'))) {
          return url;
        }
      }
    }
    
    // 2. enclosure with video type
    if (item.enclosure) {
      const enc = item.enclosure;
      const type = enc.type || enc.$?.type || '';
      const url = enc.url || enc.$?.url;
      if (type.startsWith('video/') && url) {
        return url;
      }
      if (url && (url.endsWith('.mp4') || url.endsWith('.webm'))) {
        return url;
      }
    }
    
    return undefined;
  }

  private getDefaultNHKEasyImage(index: number): string {
    const images = [
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=400&fit=crop', // Japan culture
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&h=400&fit=crop', // Tokyo
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop', // Tech
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop', // News
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop', // Sports
      'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=800&h=400&fit=crop', // Nature
      'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&h=400&fit=crop', // People
      'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=400&fit=crop', // World
    ];
    return images[index % images.length];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private deduplicateNews(articles: any[]): any[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = article.title.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }



  private async fetchRSSFeed(url: string, level: string, categoryName: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 8000, // 8 second timeout
        })
      );

      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
      });

      const result = await parser.parseStringPromise(response.data);
      const items = result.rss?.channel?.item || [];
      
      if (!Array.isArray(items)) {
        return [];
      }

      const articles = items.slice(0, 4).map((item: any) => {
        // Create a simple, readable content from description
        const description = this.cleanDescription(item.description || item.title);
        const content = this.createReadableContent(description, item.title);

        return {
          id: `nhk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: item.title,
          description: description.substring(0, 180) + (description.length > 180 ? '...' : ''),
          content: content,
          url: item.link,
          imageUrl: this.extractImageFromRSS(item) || this.getDefaultImage(categoryName),
          audioUrl: undefined,
          videoUrl: undefined,
          publishedAt: new Date(item.pubDate).toISOString(),
          source: 'NHK Japan',
          category: categoryName,
          tags: this.extractTags(item.title),
          level: level,
        };
      });

      return articles;
    } catch (error) {
      this.logger.error(`Error fetching RSS from ${url}`, error);
      return [];
    }
  }

  private getDefaultImage(category: string): string {
    const images = {
      'All News': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop',
      'Social': 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&h=400&fit=crop',
      'Culture': 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=400&fit=crop',
      'Science': 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&h=400&fit=crop',
      'Politics': 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=400&fit=crop',
      'Economy': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
      'International': 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=400&fit=crop',
      'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop',
    };
    return images[category] || images['All News'];
  }

  private extractImageFromRSS(item: any): string | undefined {
    // Try to get image from various RSS fields
    if (item['media:thumbnail']?.url) {
      return item['media:thumbnail'].url;
    }
    if (item['media:content']?.url) {
      return item['media:content'].url;
    }
    if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url;
    }
    return undefined;
  }

  private createReadableContent(description: string, title: string): string {
    // Create structured, readable content suitable for Japanese learners
    let content = `【${title}】\n\n`;
    
    // Split description into sentences
    const sentences = description
      .replace(/。/g, '。\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    // Add sentences with proper spacing
    sentences.forEach((sentence, index) => {
      if (index > 0 && index % 3 === 0) {
        content += '\n'; // Add extra line break every 3 sentences
      }
      content += sentence;
      if (!sentence.endsWith('。') && !sentence.endsWith('」')) {
        content += '。';
      }
      content += '\n';
    });

    // Ensure minimum length
    if (content.length < 100) {
      content += '\n\n詳しい情報は元の記事をご覧ください。';
    }

    return content.trim();
  }

  private async fetchArticleDetail(url: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch article detail: ${url}`, error);
      return '';
    }
  }

  private extractImageFromHtml(html: string): string {
    // Tìm ảnh trong HTML của NHK
    const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch && imgMatch[1]) {
      const imgUrl = imgMatch[1];
      // Nếu là relative URL, thêm domain NHK
      if (imgUrl.startsWith('/')) {
        return `https://www3.nhk.or.jp${imgUrl}`;
      }
      return imgUrl;
    }
    // Fallback to placeholder
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop';
  }

  private extractAudioFromHtml(html: string): string | undefined {
    // NHK News Web Easy thường có audio file
    const audioMatch = html.match(/<audio[^>]+src="([^">]+)"/i) || 
                       html.match(/src:\s*["']([^"']+\.mp3)["']/i);
    if (audioMatch && audioMatch[1]) {
      const audioUrl = audioMatch[1];
      if (audioUrl.startsWith('/')) {
        return `https://www3.nhk.or.jp${audioUrl}`;
      }
      return audioUrl;
    }
    return undefined;
  }

  private extractVideoFromHtml(html: string): string | undefined {
    // Tìm video nếu có
    const videoMatch = html.match(/<video[^>]+src="([^">]+)"/i) ||
                       html.match(/src:\s*["']([^"']+\.mp4)["']/i);
    if (videoMatch && videoMatch[1]) {
      const videoUrl = videoMatch[1];
      if (videoUrl.startsWith('/')) {
        return `https://www3.nhk.or.jp${videoUrl}`;
      }
      return videoUrl;
    }
    return undefined;
  }

  private cleanDescription(text: string): string {
    if (!text) return '';
    
    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&hellip;/g, '...');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  private extractContentFromHtml(html: string): string {
    try {
      this.logger.log('🔍 Extracting content from HTML...');
      
      // NHK News Web Easy specific structure
      // Content is usually in <div id="js-article-body"> or <div class="article-body">
      
      // Method 1: Extract all paragraphs with specific classes used by NHK
      const nhkParagraphs: string[] = [];
      
      // Find article-main or article-body div
      const articleMainMatch = html.match(/<div[^>]*class=["'][^"']*(?:article-main|article-body|js-article-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (articleMainMatch) {
        const articleContent = articleMainMatch[1];
        
        // Extract all <p> tags from this section
        const pMatches = articleContent.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        for (const match of pMatches) {
          const text = this.cleanHtmlContent(match[1]);
          if (text && text.length > 15) {
            nhkParagraphs.push(text);
          }
        }
        
        if (nhkParagraphs.length > 0) {
          this.logger.log(`✅ Found ${nhkParagraphs.length} paragraphs from article-main`);
          return nhkParagraphs.join('\n\n');
        }
      }

      // Method 2: Extract from body tag, filtering carefully
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        const bodyContent = bodyMatch[1];
        
        // Remove header, footer, nav, script, style
        let cleanBody = bodyContent
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '');
        
        // Extract all paragraphs
        const allParagraphs = cleanBody.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        const validParagraphs: string[] = [];
        
        for (const match of allParagraphs) {
          const text = this.cleanHtmlContent(match[1]);
          // More strict filtering
          if (text && 
              text.length > 20 && 
              !text.includes('メニュー') &&
              !text.includes('Copyright') &&
              !text.includes('シェア') &&
              !text.includes('ログイン') &&
              !text.includes('アカウント') &&
              !text.includes('受信料') &&
              !text.startsWith('NHK') &&
              !text.includes('http://') &&
              !text.includes('https://')) {
            validParagraphs.push(text);
          }
        }
        
        if (validParagraphs.length > 0) {
          this.logger.log(`✅ Found ${validParagraphs.length} valid paragraphs from body`);
          return validParagraphs.join('\n\n');
        }
      }

      // Method 3: Last resort - get description from meta tags
      const metaDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (metaDescription && metaDescription[1]) {
        this.logger.log('✅ Using meta description');
        return this.cleanDescription(metaDescription[1]);
      }

      this.logger.warn('⚠️ No content found, returning empty string');
      return '';
    } catch (error) {
      this.logger.error('❌ Failed to extract content from HTML', error);
      return '';
    }
  }

  private cleanHtmlContent(htmlContent: string): string {
    // Remove script and style tags
    let content = htmlContent
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
    
    // Convert breaks to newlines
    content = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n');
    
    // Remove all HTML tags
    content = content.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    content = content
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
    
    // Clean up whitespace
    content = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.includes('メニュー'))
      .filter(line => !line.includes('Copyright'))
      .filter(line => !line.includes('シェアする'))
      .filter(line => !line.startsWith('{'))
      .filter(line => line.length > 5) // Remove very short lines
      .join('\n\n');
    
    // Remove multiple newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content.trim();
  }

  private extractTags(title: string): string[] {
    const tags: string[] = [];
    const keywords = ['AI', '経済', 'スポーツ', '健康', '科学', '政治', '国際', '社会'];
    keywords.forEach(keyword => {
      if (title.includes(keyword)) {
        tags.push(keyword);
      }
    });
    return tags.length > 0 ? tags : ['ニュース'];
  }

  private processRealNews(articles: any[], category?: string, limit: number = 20, page: number = 1, level?: string): any {
    // Sắp xếp theo thời gian mới nhất
    articles.sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // Filter by category
    let filteredArticles = articles;
    if (category && category !== 'all') {
      filteredArticles = articles.filter(article => article.category === category);
    }

    // Filter by level
    if (level && level !== 'all') {
      filteredArticles = filteredArticles.filter(article => article.level === level);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        articles: paginatedArticles,
        totalResults: filteredArticles.length,
        page,
        limit,
      },
    };
  }

  private mapNHKCategory(title: string): string {
    const keywords: { [key: string]: string[] } = {
      business: ['経済', 'ビジネス', '企業', '株', '市場', '金融', 'GDP'],
      technology: ['IT', 'AI', 'デジタル', '技術', 'テクノロジー', 'スマホ', 'アプリ'],
      sports: ['スポーツ', 'サッカー', '野球', 'オリンピック', '大会', '優勝'],
      entertainment: ['芸能', '映画', '音楽', 'アニメ', 'ドラマ', 'エンタメ'],
      health: ['健康', '医療', '病院', 'ワクチン', 'コロナ', '病気'],
      science: ['科学', '研究', '宇宙', '実験', '発見'],
      politics: ['政治', '政府', '首相', '選挙', '国会', '大臣'],
      international: ['国際', '海外', '世界', 'アメリカ', '中国', 'ヨーロッパ'],
      social: ['社会', '事件', '事故', '災害', '地震', '台風'],
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => title.includes(word))) {
        return category;
      }
    }

    return 'general';
  }

  async getCategories(): Promise<any> {
    const categories: NewsCategory[] = [
      { id: 'all', name: 'All', nameJp: 'Tất cả', icon: '📚' },
      { id: 'business', name: 'Business', nameJp: 'Kinh doanh', icon: '💼' },
      { id: 'entertainment', name: 'Entertainment', nameJp: 'Giải trí', icon: '🎬' },
      { id: 'technology', name: 'Technology', nameJp: 'Công nghệ', icon: '💻' },
      { id: 'health', name: 'Health', nameJp: 'Sức khỏe', icon: '🏥' },
      { id: 'sports', name: 'Sports', nameJp: 'Thể thao', icon: '⚽' },
      { id: 'science', name: 'Science', nameJp: 'Khoa học', icon: '🔬' },
      { id: 'politics', name: 'Politics', nameJp: 'Chính trị', icon: '🏛️' },
      { id: 'international', name: 'International', nameJp: 'Quốc tế', icon: '🌍' },
      { id: 'social', name: 'Social', nameJp: 'Xã hội', icon: '👥' },
      { id: 'general', name: 'General', nameJp: 'Tổng hợp', icon: '📰' },
    ];

    return {
      success: true,
      data: categories,
    };
  }



  private getMockNews(category?: string, limit: number = 20, page: number = 1, level?: string): any {
    // Template bài báo cho mỗi category
    const articleTemplates = {
      technology: [
        { title: '日本の最新AI技術が世界を驚かせる', description: '革新的なAI技術が発表されました', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop', tags: ['AI', 'テクノロジー'] },
        { title: '新しいスマートフォンが発売', description: '最新機能を搭載した新製品', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=400&fit=crop', tags: ['スマホ', '技術'] },
        { title: '量子コンピューター研究が進展', description: '次世代コンピューター技術の開発', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop', tags: ['科学', '技術'] },
        { title: '5G通信網が全国に拡大', description: '高速通信サービスの普及', image: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=800&h=400&fit=crop', tags: ['通信', '5G'] },
        { title: 'ロボット技術の新展開', description: 'AI搭載ロボットが進化', image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop', tags: ['ロボット', 'AI'] },
      ],
      entertainment: [
        { title: '東京で大規模な音楽フェスティバル', description: '人気アーティストが集結', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop', tags: ['音楽', 'イベント'] },
        { title: '日本映画が国際映画祭で受賞', description: '世界が認めた日本の作品', image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=400&fit=crop', tags: ['映画', '文化'] },
        { title: 'アニメ産業が過去最高売上', description: '世界中で日本アニメ人気', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=400&fit=crop', tags: ['アニメ', 'エンタメ'] },
        { title: '伝統工芸品が海外で人気', description: '日本の職人技が注目', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&h=400&fit=crop', tags: ['工芸', '文化'] },
        { title: '新しい美術館がオープン', description: '現代アートの新拠点', image: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&h=400&fit=crop', tags: ['美術', '文化'] },
      ],
      sports: [
        { title: '日本代表が強化合宿開始', description: 'ワールドカップに向けて準備', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=400&fit=crop', tags: ['サッカー', 'スポーツ'] },
        { title: 'オリンピック施設が市民に開放', description: 'スポーツ振興に活用', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop', tags: ['オリンピック', '施設'] },
        { title: '野球チームが世界大会優勝', description: '日本代表が世界一に', image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=400&fit=crop', tags: ['野球', 'スポーツ'] },
        { title: 'eスポーツ大会が盛況', description: 'プロゲーマーの活躍', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop', tags: ['eスポーツ', 'ゲーム'] },
        { title: 'マラソン大会に過去最多参加', description: 'ランニングブーム継続', image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=400&fit=crop', tags: ['マラソン', '健康'] },
      ],
      health: [
        { title: '新しいがん治療法が成功', description: '画期的な医療技術の進歩', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=400&fit=crop', tags: ['医療', '研究'] },
        { title: '健康寿命延伸の秘訣が判明', description: '長寿社会の実現へ', image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=400&fit=crop', tags: ['健康', '長寿'] },
        { title: 'AIによる医療診断が進化', description: '早期発見率が向上', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=400&fit=crop', tags: ['AI', '医療'] },
        { title: '新型ワクチンの開発完了', description: '予防医療の新時代', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop', tags: ['ワクチン', '医療'] },
        { title: '国民皆保険制度が高評価', description: '世界が注目する日本の医療', image: 'https://images.unsplash.com/photo-1584432743501-7d5c27a39189?w=800&h=400&fit=crop', tags: ['医療', '制度'] },
      ],
      business: [
        { title: 'グリーンエネルギーに大規模投資', description: '再生可能エネルギーへの転換', image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=400&fit=crop', tags: ['ビジネス', '環境'] },
        { title: 'スタートアップ企業が急成長', description: '新しいビジネスモデルが人気', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop', tags: ['ビジネス', 'スタートアップ'] },
        { title: 'リモートワークが定着', description: '新しい働き方が広がる', image: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&h=400&fit=crop', tags: ['働き方', 'ビジネス'] },
        { title: 'デジタル通貨の実証実験', description: 'キャッシュレス社会へ', image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop', tags: ['金融', 'デジタル'] },
        { title: '企業のグローバル展開加速', description: '世界市場での成功', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop', tags: ['ビジネス', 'グローバル'] },
      ],
      science: [
        { title: '宇宙開発計画が進展', description: '月探査ミッションの準備', image: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=400&fit=crop', tags: ['宇宙', '科学'] },
        { title: 'iPS細胞研究で新発見', description: '再生医療の可能性拡大', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=400&fit=crop', tags: ['科学', '研究'] },
        { title: '再生可能エネルギー技術革新', description: '太陽光・風力発電の進化', image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=400&fit=crop', tags: ['エネルギー', '環境'] },
        { title: '海洋プラスチック削減技術', description: '環境保護の新アプローチ', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=400&fit=crop', tags: ['環境', '海洋'] },
        { title: '気候変動対策の研究成果', description: '地球温暖化への取り組み', image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=400&fit=crop', tags: ['環境', '科学'] },
      ],
      politics: [
        { title: 'G7サミット開催準備進む', description: '各国首脳が東京に集結', image: 'https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8?w=800&h=400&fit=crop', tags: ['政治', '国際'] },
        { title: '新しい経済政策が発表', description: '景気回復への施策', image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&h=400&fit=crop', tags: ['政治', '経済'] },
        { title: '少子化対策が強化', description: '子育て支援の拡充', image: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=800&h=400&fit=crop', tags: ['政治', '少子化'] },
        { title: '地方創生の新プログラム', description: '地域活性化への取り組み', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=400&fit=crop', tags: ['地方創生', '政策'] },
        { title: '国会で重要法案可決', description: '新制度が来年施行へ', image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=400&fit=crop', tags: ['政治', '法律'] },
      ],
      international: [
        { title: '日本文化が世界で評価', description: '和食がユネスコ遺産に', image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=400&fit=crop', tags: ['食文化', '和食'] },
        { title: '観光客が日本に殺到', description: 'インバウンド需要回復', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop', tags: ['観光', 'インバウンド'] },
        { title: '日本の鉄道技術を海外輸出', description: '新幹線システムが人気', image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&h=400&fit=crop', tags: ['鉄道', '技術'] },
        { title: '四季折々の祭りが開催', description: '伝統行事に海外注目', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=400&fit=crop', tags: ['祭り', '文化'] },
        { title: '日本語学習者が急増', description: '世界で日本語ブーム', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop', tags: ['言語', '教育'] },
      ],
      social: [
        { title: '高齢者向けサービス充実', description: '見守り・介護の新システム', image: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=800&h=400&fit=crop', tags: ['高齢者', '福祉'] },
        { title: '子供の教育環境が改善', description: 'デジタル教育の推進', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop', tags: ['教育', '社会'] },
        { title: '防災技術の開発進む', description: '災害に強い街づくり', image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&h=400&fit=crop', tags: ['防災', '安全'] },
        { title: '地域コミュニティ活性化', description: '住民交流の新しい形', image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=400&fit=crop', tags: ['地域', '社会'] },
        { title: 'ボランティア活動が活発', description: '社会貢献への意識向上', image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&h=400&fit=crop', tags: ['ボランティア', '社会'] },
      ],
    };

    const categories = ['technology', 'entertainment', 'sports', 'health', 'business', 'science', 'politics', 'international', 'social'];
    const levels = ['easy', 'normal'];
    const sources = ['NHK', 'Asahi', 'Mainichi', 'Yomiuri', 'Sports Nippon'];
    
    const allArticles: NewsArticle[] = [];
    let articleId = 1;
    
    // Tạo bài báo cho 7 ngày gần nhất (từ hôm nay đến 6 ngày trước)
    for (let day = 0; day < 7; day++) {
      const articlesPerDay = day === 0 ? 6 : 5; // Hôm nay có 6 bài, các ngày khác 5 bài
      
      for (let i = 0; i < articlesPerDay; i++) {
        const categoryIndex = (day * articlesPerDay + i) % categories.length;
        const cat = categories[categoryIndex];
        const templates = articleTemplates[cat];
        // Sử dụng articleId để đảm bảo mỗi bài có template khác nhau
        const templateIndex = (articleId - 1) % templates.length;
        const template = templates[templateIndex];
        
        // Tạo giờ giảm dần trong ngày (20h, 18h, 16h, ...)
        const hour = 20 - (i * 2);
        
        allArticles.push({
          id: String(articleId++),
          title: template.title,
          description: template.description,
          content: `${template.description}。日本の最新ニュースをお届けします。この記事では、${cat}に関する重要な情報を詳しく解説しています。\n\n専門家によると、この動きは今後さらに加速すると予測されています。多くの人々が注目しており、社会に大きな影響を与えることが期待されています。\n\n関係者は「今後の展開に期待している」とコメントしています。`,
          url: 'https://www3.nhk.or.jp/news/easy/',
          imageUrl: template.image,
          publishedAt: dateWithHour(day, hour),
          source: sources[i % sources.length],
          category: cat,
          tags: template.tags,
          level: levels[i % 2],
        });
      }
    }
    
    // Sắp xếp theo thời gian mới nhất lên đầu
    allArticles.sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // Filter by category if specified
    let filteredArticles = allArticles;
    if (category && category !== 'all') {
      filteredArticles = allArticles.filter(article => article.category === category);
    }

    // Filter by level if specified
    if (level && level !== 'all') {
      filteredArticles = filteredArticles.filter(article => article.level === level);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        articles: paginatedArticles,
        totalResults: filteredArticles.length,
        page,
        limit,
      },
    };
  }

  async getArticleById(id: string): Promise<any> {
    this.logger.log(`🔍 [getArticleById] Requested ID: ${id}`);
    
    // Check cache first
    if (this.articleCache.has(id)) {
      const cachedArticle = this.articleCache.get(id);
      this.logger.log(`✅ [getArticleById] Found in cache: ID=${cachedArticle.id}, Title="${cachedArticle.title}"`);
      
      // Add TTS flag for frontend
      const articleWithTTS = {
        ...cachedArticle,
        hasTTS: true,
        ttsEndpoint: `/api/news/${id}/tts`,
      };
      
      return {
        success: true,
        data: articleWithTTS,
      };
    }
    
    // If cache is old or empty, refresh it
    const cacheAge = Date.now() - this.cacheTimestamp;
    if (cacheAge > this.CACHE_DURATION || this.articleCache.size === 0) {
      this.logger.log(`🔄 [getArticleById] Cache expired or empty, refreshing...`);
      try {
        const realNews = await this.fetchNHKNewsWebEasy();
        if (realNews && realNews.length > 0) {
          this.logger.log(`✅ [getArticleById] Refreshed cache with ${realNews.length} articles`);
          
          // Check cache again after refresh
          if (this.articleCache.has(id)) {
            const article = this.articleCache.get(id);
            this.logger.log(`✅ [getArticleById] Found after refresh: ID=${article.id}, Title="${article.title}"`);
            
            // Add TTS flag for frontend
            const articleWithTTS = {
              ...article,
              hasTTS: true,
              ttsEndpoint: `/api/news/${id}/tts`,
            };
            
            return {
              success: true,
              data: articleWithTTS,
            };
          }
        }
      } catch (error) {
        this.logger.error('❌ [getArticleById] Failed to refresh cache', error);
      }
    }
    
    this.logger.warn(`⚠️ [getArticleById] Article with ID ${id} not found in cache`);
    
    // Fallback to mock data
    const mockData = this.getMockNews('all', 100, 1);
    this.logger.log(`📦 [getArticleById] Mock data has ${mockData.data.articles.length} articles`);
    
    const article = mockData.data.articles.find((a: any) => a.id === id);
    
    if (!article) {
      this.logger.error(`❌ [getArticleById] Article not found with ID: ${id}`);
      this.logger.log(`📋 [getArticleById] Available IDs: ${mockData.data.articles.map(a => a.id).join(', ')}`);
      throw new Error('Article not found');
    }

    this.logger.log(`✅ [getArticleById] Found mock article: ID=${article.id}, Title="${article.title}"`);
    
    // Add TTS flag for frontend
    const articleWithTTS = {
      ...article,
      hasTTS: true,
      ttsEndpoint: `/api/news/${id}/tts`,
    };
    
    return {
      success: true,
      data: articleWithTTS,
    };
  }

  // TTS Helper Methods
  private extractTextForTTS(description: string, title: string): string {
    // Extract clean Japanese text for TTS
    let text = `${title}。${description}`;
    
    // Remove URLs
    text = text.replace(/https?:\/\/[^\s]+/g, '');
    
    // Remove special characters but keep Japanese punctuation
    text = text.replace(/[^\u3000-\u9FFF\u3040-\u309F\u30A0-\u30FF々〆〤ー。、！？]/g, ' ');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, '');
    
    // Limit to 500 characters for TTS
    if (text.length > 500) {
      text = text.substring(0, 500) + '。';
    }
    
    return text;
  }

  async generateTTSAudio(articleId: string): Promise<string> {
    this.logger.log(`🎤 Generating TTS audio for article: ${articleId}`);
    
    // Get article from cache
    const article = this.articleCache.get(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    const text = article.ttsText || this.extractTextForTTS(article.description, article.title);
    
    try {
      // Option 1: Use OpenAI TTS (requires API key)
      // return await this.generateOpenAITTS(text);
      
      // Option 2: Use Google Cloud TTS (requires API key)
      // return await this.generateGoogleTTS(text);
      
      // Option 3: Return a placeholder URL that frontend can use with Web Speech API
      // Frontend will handle TTS using browser's built-in Japanese voice
      return 'client-side-tts'; // Special flag for frontend to use Web Speech API
      
    } catch (error) {
      this.logger.error(`❌ Error generating TTS: ${error.message}`);
      throw error;
    }
  }

  // Uncomment and configure if you have OpenAI API key
  /*
  private async generateOpenAITTS(text: string): Promise<string> {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          voice: 'nova', // or 'alloy', 'echo', 'fable', 'onyx', 'shimmer'
          input: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      )
    );

    // Save audio file or return base64
    const audioBuffer = Buffer.from(response.data);
    const base64Audio = audioBuffer.toString('base64');
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  */

  getLevels() {
    return {
      success: true,
      data: [
        { id: 'all', name: 'All Levels', nameJp: 'すべて', icon: '📚' },
        { id: 'beginner', name: 'Beginner (Easy News)', nameJp: '初級', icon: '🟢' },
        { id: 'intermediate', name: 'Intermediate', nameJp: '中級', icon: '🟡' },
        { id: 'advanced', name: 'Advanced', nameJp: '上級', icon: '🔴' },
      ],
    };
  }

  /**
   * Convert article content to furigana format
   * @param articleId - Article ID
   * @returns Article content with furigana in HTML format
   */
  async getArticleWithFurigana(articleId: string): Promise<any> {
    try {
      // Get article from cache
      const article = this.articleCache.get(articleId);
      
      if (!article) {
        throw new Error('Article not found');
      }

      // Check if furigana service is ready
      if (!this.furiganaService.isReady()) {
        this.logger.warn('⚠️ Furigana service not ready yet');
        return {
          success: true,
          data: {
            ...article,
            contentWithFurigana: article.content,
          },
        };
      }

      // Convert content to furigana
      const paragraphs = article.content.split('\n').filter(p => p.trim().length > 0);
      const paragraphsWithFurigana = await this.furiganaService.convertParagraphsToFurigana(paragraphs);
      const contentWithFurigana = paragraphsWithFurigana.join('\n\n');

      this.logger.log(`✅ Converted article ${articleId} to furigana`);

      return {
        success: true,
        data: {
          ...article,
          content: contentWithFurigana, // Replace content with furigana version
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error getting article with furigana: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert arbitrary Japanese text to furigana
   * @param text - Japanese text
   * @returns Text with furigana in HTML format
   */
  async convertTextToFurigana(text: string): Promise<string> {
    try {
      if (!this.furiganaService.isReady()) {
        this.logger.warn('⚠️ Furigana service not ready yet');
        return text;
      }

      return await this.furiganaService.convertToFurigana(text);
    } catch (error) {
      this.logger.error(`❌ Error converting text to furigana: ${error.message}`);
      return text;
    }
  }
}
