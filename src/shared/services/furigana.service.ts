import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Kuroshiro from 'kuroshiro';
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');
import * as path from 'path';

@Injectable()
export class FuriganaService implements OnModuleInit {
  private readonly logger = new Logger(FuriganaService.name);
  private kuroshiro: Kuroshiro;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async onModuleInit() {
    this.logger.log('🔤 Initializing Kuroshiro for furigana conversion...');
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        this.kuroshiro = new Kuroshiro();
        
        // Path to kuromoji dictionary
        // The dictionary is included in node_modules/kuromoji/dict
        const dictPath = path.join(
          process.cwd(),
          'node_modules',
          'kuromoji',
          'dict'
        );

        this.logger.log(`📚 Loading dictionary from: ${dictPath}`);

        await this.kuroshiro.init(
          new KuromojiAnalyzer({
            dictPath: dictPath,
          })
        );

        this.isInitialized = true;
        this.logger.log('✅ Kuroshiro initialized successfully!');
      } catch (error) {
        this.logger.error('❌ Failed to initialize Kuroshiro:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Convert Japanese text to HTML with furigana using <ruby> tags
   * @param text - Raw Japanese text
   * @returns HTML string with <ruby> tags
   * @example
   * Input: "日本"
   * Output: "<ruby>日本<rt>にほん</rt></ruby>"
   */
  async convertToFurigana(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Ensure initialization is complete
    await this.initialize();

    if (!this.isInitialized) {
      this.logger.warn('⚠️ Kuroshiro not initialized, returning original text');
      return text;
    }

    try {
      // Convert with furigana mode - Kuroshiro automatically creates <ruby> tags
      const htmlResult = await this.kuroshiro.convert(text, {
        to: 'hiragana',
        mode: 'furigana',
      });

      this.logger.log(`✅ Converted text (first 100 chars): ${htmlResult.substring(0, 100)}`);
      this.logger.log(`✅ Has <ruby> tags: ${htmlResult.includes('<ruby>')}`);
      
      return htmlResult;
    } catch (error) {
      this.logger.error(`❌ Error converting text to furigana: ${error.message}`);
      return text; // Return original text on error
    }
  }

  /**
   * Convert multiple paragraphs to furigana
   * @param paragraphs - Array of Japanese text paragraphs
   * @returns Array of HTML strings with furigana
   */
  async convertParagraphsToFurigana(paragraphs: string[]): Promise<string[]> {
    if (!paragraphs || paragraphs.length === 0) {
      return paragraphs;
    }

    await this.initialize();

    try {
      const results = await Promise.all(
        paragraphs.map(paragraph => this.convertToFurigana(paragraph))
      );
      return results;
    } catch (error) {
      this.logger.error(`❌ Error converting paragraphs: ${error.message}`);
      return paragraphs;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
