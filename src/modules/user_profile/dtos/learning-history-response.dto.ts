export class LearningHistoryResponseDto {
  id: number;
  user_id: number;
  activity_type: string;
  activity_data: any;
  points_earned: number;
  create_at: Date;
}
