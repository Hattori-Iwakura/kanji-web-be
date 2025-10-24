import { IsEnum } from 'class-validator';

export enum PublishRequestAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewPublishRequestDto {
  @IsEnum(PublishRequestAction)
  action: PublishRequestAction;
}
