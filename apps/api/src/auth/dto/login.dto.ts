import { IsNotEmpty, IsString } from 'class-validator';

export class DemoLoginDto {
  @IsString()
  @IsNotEmpty()
  declare accountId: string;
}

export class FirebaseLoginDto {
  @IsString()
  @IsNotEmpty()
  declare idToken: string;
}
