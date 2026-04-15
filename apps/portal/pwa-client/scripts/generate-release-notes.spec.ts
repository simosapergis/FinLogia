import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateReleaseNotes } from './generate-release-notes.js';

// Mock the VertexAI module
vi.mock('@google-cloud/vertexai', () => {
  class MockVertexAI {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            candidates: [
              {
                content: {
                  parts: [{ text: 'Mocked Greek Translation' }],
                },
              },
            ],
          },
        }),
      };
    }
  }
  return { VertexAI: MockVertexAI };
});

// Mock fs
vi.mock('fs');

describe('generateReleaseNotes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should parse changelog, call Vertex AI, and keep only 10 items in the array', async () => {
    const mockChangelogPath = '/mock/CHANGELOG.md';
    const mockReleaseNotesPath = '/mock/release-notes.json';

    // Mock CHANGELOG.md content
    const mockChangelogContent = `
## [1.2.0](https://github.com/...) (2026-05-01)

### Features
* new feature 1

# [1.1.0](https://github.com/...) (2026-04-15)
`;

    // Create an array of 10 existing release notes
    const existingNotes = Array.from({ length: 10 }, (_, i) => ({
      version: `1.1.${9 - i}`,
      date: '2026-04-01',
      notes: `Old note ${9 - i}`,
    }));

    // Mock fs.existsSync
    vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      if (filePath === mockChangelogPath) return true;
      if (filePath === mockReleaseNotesPath) return true;
      return false;
    });

    // Mock fs.readFileSync
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (filePath === mockChangelogPath) return mockChangelogContent;
      if (filePath === mockReleaseNotesPath) return JSON.stringify(existingNotes);
      return '';
    });

    // Mock fs.writeFileSync
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    const result = await generateReleaseNotes(mockChangelogPath, mockReleaseNotesPath);

    // Assertions
    expect(result).toBeDefined();
    expect(result?.length).toBe(10); // Should strictly be 10

    // The newest should be at the top
    expect(result?.[0].version).toBe('1.2.0');
    expect(result?.[0].notes).toBe('Mocked Greek Translation');

    // The oldest item (1.1.0) should have been removed
    // The previous array was [1.1.9, 1.1.8, ..., 1.1.0]
    // The new array should be [1.2.0, 1.1.9, 1.1.8, ..., 1.1.1]
    expect(result?.[9].version).toBe('1.1.1');
    expect(result?.find(n => n.version === '1.1.0')).toBeUndefined();

    // Verify writeFileSync was called with the correct data
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockReleaseNotesPath,
      JSON.stringify(result, null, 2),
      'utf8'
    );
  });
});
