export class ProfileResponseDto {
  id: number;
  user_id: number;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  total_kanji: number;
  total_quiz: number;
  total_flashcard: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_at: Date;
  settings: any;
  user: {
    account: string;
    email: string;
    profile_image: string | null;
    create_at: Date;
  };
}
