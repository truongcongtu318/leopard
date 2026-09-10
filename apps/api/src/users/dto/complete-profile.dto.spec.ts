import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CompleteProfileDto } from './complete-profile.dto.js';

const base = {
  name: 'X',
  consentTerms: true,
  consentService: true,
};

describe('CompleteProfileDto.email', () => {
  it('accepts an empty string and transforms it to null', async () => {
    const instance = plainToInstance(CompleteProfileDto, { ...base, email: '' });

    expect(instance.email).toBeNull();
    const errors = await validate(instance);
    expect(errors).toHaveLength(0);
  });

  it('accepts an omitted email', async () => {
    const instance = plainToInstance(CompleteProfileDto, base);

    expect(instance.email).toBeUndefined();
    const errors = await validate(instance);
    expect(errors).toHaveLength(0);
  });

  it('preserves a valid email', async () => {
    const instance = plainToInstance(CompleteProfileDto, { ...base, email: 'a@b.com' });

    expect(instance.email).toBe('a@b.com');
    const errors = await validate(instance);
    expect(errors).toHaveLength(0);
  });

  it('still rejects a non-empty invalid email', async () => {
    const instance = plainToInstance(CompleteProfileDto, {
      ...base,
      email: 'not-an-email',
    });

    const errors = await validate(instance);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
