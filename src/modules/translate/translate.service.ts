import { Injectable, BadRequestException } from '@nestjs/common';
import { TranslateDto } from './dto/translate.dto';
import * as https from 'https';

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished: boolean;
  responseStatus: number;
}

@Injectable()
export class TranslateService {
  // MyMemory API - Free 10,000 words/day, no API key required
  private readonly MYMEMORY_API_URL = 'https://api.mymemory.translated.net';
  private readonly MYMEMORY_API_KEY = process.env.MYMEMORY_API_KEY; // Optional, for better rate limit
  private readonly MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || 'kanji-web@example.com'; // Optional email for tracking

  async translate(translateDto: TranslateDto) {
    const { text, sourceLang, targetLang } = translateDto;

    // Validate
    if (sourceLang === targetLang) {
      throw new BadRequestException('Ngôn ngữ nguồn và ngôn ngữ đích phải khác nhau');
    }

    try {
      const result = await this.myMemoryTranslate(text, sourceLang, targetLang);
      return {
        translatedText: result,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      };
    } catch (error) {
      console.error('MyMemory API error:', error);
      // Fallback to dictionary-based translation
      return this.fallbackTranslate(text, sourceLang, targetLang);
    }
  }

  private async myMemoryTranslate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    // MyMemory uses language pairs in format: en|it
    const langpair = `${sourceLang}|${targetLang}`;
    const encodedText = encodeURIComponent(text);
    const encodedEmail = encodeURIComponent(this.MYMEMORY_EMAIL);
    
    // Build URL with query parameters
    let url = `${this.MYMEMORY_API_URL}/get?q=${encodedText}&langpair=${langpair}&de=${encodedEmail}`;
    
    // Add API key if available (for better rate limit)
    if (this.MYMEMORY_API_KEY) {
      url += `&key=${this.MYMEMORY_API_KEY}`;
    }

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'KanjiWeb/1.0',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`MyMemory API returned status ${res.statusCode}: ${data}`));
              return;
            }

            const response: MyMemoryResponse = JSON.parse(data);
            
            // Check if quota is finished
            if (response.quotaFinished) {
              reject(new Error('MyMemory API quota exceeded for today'));
              return;
            }

            if (response.responseData && response.responseData.translatedText) {
              resolve(response.responseData.translatedText);
            } else {
              reject(new Error('Invalid response from MyMemory API'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  private fallbackTranslate(text: string, sourceLang: string, targetLang: string) {
    // Simple dictionary-based translation for common phrases
    const dictionary: Record<string, Record<string, string>> = {
      'ja-vi': {
        'こんにちは': 'Xin chào',
        'ありがとう': 'Cảm ơn',
        'さようなら': 'Tạm biệt',
        'おはよう': 'Chào buổi sáng',
        'おやすみ': 'Chúc ngủ ngon',
        'はい': 'Vâng',
        'いいえ': 'Không',
        'すみません': 'Xin lỗi',
        '私': 'Tôi',
        'あなた': 'Bạn',
        '日本': 'Nhật Bản',
        'ベトナム': 'Việt Nam',
        '学生': 'Học sinh',
        '先生': 'Giáo viên',
        '勉強': 'Học tập',
        '友達': 'Bạn bè',
        '家族': 'Gia đình',
        '食べる': 'Ăn',
        '飲む': 'Uống',
        '行く': 'Đi',
        '来る': 'Đến',
        '見る': 'Nhìn',
        '聞く': 'Nghe',
        '話す': 'Nói',
        '読む': 'Đọc',
        '書く': 'Viết',
      },
      'vi-ja': {
        'Xin chào': 'こんにちは',
        'Cảm ơn': 'ありがとう',
        'Tạm biệt': 'さようなら',
        'Chào buổi sáng': 'おはよう',
        'Chúc ngủ ngon': 'おやすみ',
        'Vâng': 'はい',
        'Không': 'いいえ',
        'Xin lỗi': 'すみません',
        'Tôi': '私',
        'Bạn': 'あなた',
        'Nhật Bản': '日本',
        'Việt Nam': 'ベトナム',
        'Học sinh': '学生',
        'Giáo viên': '先生',
        'Học tập': '勉強',
        'Bạn bè': '友達',
        'Gia đình': '家族',
        'Ăn': '食べる',
        'Uống': '飲む',
        'Đi': '行く',
        'Đến': '来る',
        'Nhìn': '見る',
        'Nghe': '聞く',
        'Nói': '話す',
        'Đọc': '読む',
        'Viết': '書く',
      },
    };

    const direction = `${sourceLang}-${targetLang}`;
    const translationDict = dictionary[direction] || {};

    // Try exact match first
    if (translationDict[text]) {
      return {
        translatedText: translationDict[text],
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        note: 'Sử dụng từ điển cơ bản. Để có bản dịch chính xác hơn, vui lòng cấu hình Google Translate API.',
      };
    }

    // Try word-by-word translation
    const words = text.split(/\s+/);
    const translatedWords = words.map(word => {
      const trimmedWord = word.trim();
      return translationDict[trimmedWord] || word;
    });

    return {
      translatedText: translatedWords.join(' '),
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      note: 'Bản dịch cơ bản dựa trên từ điển. Để có bản dịch chính xác hơn, vui lòng cấu hình Google Translate API.',
    };
  }
}
