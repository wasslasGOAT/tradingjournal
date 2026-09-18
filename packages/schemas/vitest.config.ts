import { defineProject } from 'vitest/config';

export default defineProject({
  test: { name: 'schemas', include: ['src/**/*.test.ts'] },
});
