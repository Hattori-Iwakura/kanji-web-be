import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { Expose } from "class-transformer";

export class LoginDto {
  @ApiProperty()
  @IsString()
  account: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  account: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshDto {
  // if using cookie, no body needed
  // keep class for explicitness if you accept cookie only
}
