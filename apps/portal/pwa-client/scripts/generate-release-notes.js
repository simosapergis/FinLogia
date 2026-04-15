import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VertexAI } from '@google-cloud/vertexai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANGELOG_PATH = path.join(__dirname, '../CHANGELOG.md');
const RELEASE_NOTES_PATH = path.join(__dirname, '../public/release-notes.json');

// GCP Project ID from environment variable
const projectId = process.env.GCP_PROJECT_ID || 'finlogia-demo';
const location = 'europe-west3'; // Same region as your existing Vertex AI usage

export async function generateReleaseNotes(changelogPath = CHANGELOG_PATH, releaseNotesPath = RELEASE_NOTES_PATH) {
  try {
    // 1. Read CHANGELOG.md
    if (!fs.existsSync(changelogPath)) {
      console.warn('CHANGELOG.md not found. Skipping release notes generation.');
      return;
    }
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');

    // 2. Extract the latest version and its commits
    // Assuming semantic-release format:
    // ## [1.1.1](...) (2026-04-15) or # [1.1.0](...) (2026-04-15)
    // Followed by commits until the next header
    const versionRegex = /#+ \[?(\d+\.\d+\.\d+)\]?.*?\(([^)]+)\)/g;
    let match = versionRegex.exec(changelogContent);
    
    if (!match) {
      console.warn('No version found in CHANGELOG.md. Skipping.');
      return;
    }

    const latestVersion = match[1];
    const latestDate = match[2];
    const startIndex = versionRegex.lastIndex;
    
    // Find the start of the *next* version block to know where to stop
    const nextMatch = versionRegex.exec(changelogContent);
    const endIndex = nextMatch ? nextMatch.index : changelogContent.length;

    const latestCommitsContent = changelogContent.substring(startIndex, endIndex).trim();

    if (!latestCommitsContent) {
      console.log(`No commits found for version ${latestVersion}.`);
      return;
    }

    console.log(`Processing release notes for version ${latestVersion}...`);

    // 3. Initialize Vertex AI
    const vertexAI = new VertexAI({ project: projectId, location: location });
    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2,
      },
    });

    const prompt = `
You are a Product Manager for "FinLogia", a financial and accounting web application. 
Your task is to take a list of technical commit messages and write a short, user-friendly release notes summary in Greek.

Target Audience: Business owners and accountants in Greece. They are not software developers.

Rules:
1. Translate the meaning of the updates into natural, professional Greek.
2. Focus on the user value. What can they do now that they couldn't before? What is fixed?
3. IGNORE purely technical commits (e.g., "CI/CD pipeline", "dry run", "bump dependencies", "refactor components", "update tests").
4. Do not use technical jargon (e.g., do not use words like UI, API, frontend, backend, commits, PRs).
5. Format the output as a simple, clean list of bullet points. Do not include markdown headers like "# Release Notes", just the bullet points.
6. If all commits are purely technical and there is no user-facing change, return exactly this string: "Βελτιώσεις απόδοσης και σταθερότητας του συστήματος." (Performance and stability improvements).

Here are the technical commit messages for this release:
${latestCommitsContent}
`;

    // 4. Call Vertex AI
    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };
    
    const result = await generativeModel.generateContent(request);
    let translatedNotes = result.response.candidates[0].content.parts[0].text.trim();

    // 5. Read existing release notes
    let existingNotes = [];
    if (fs.existsSync(releaseNotesPath)) {
      try {
        existingNotes = JSON.parse(fs.readFileSync(releaseNotesPath, 'utf8'));
      } catch (e) {
        console.error('Failed to parse existing release-notes.json. Starting fresh.', e);
      }
    }

    // Check if we already processed this version (e.g. if script ran multiple times)
    if (existingNotes.length > 0 && existingNotes[0].version === latestVersion) {
      console.log(`Version ${latestVersion} is already the latest in release-notes.json. Skipping.`);
      return;
    }

    // 6. Create new release object and unshift
    const newRelease = {
      version: latestVersion,
      date: latestDate,
      notes: translatedNotes,
    };
    
    existingNotes.unshift(newRelease);

    // 7. Slice to keep only the last 10 releases
    existingNotes = existingNotes.slice(0, 10);

    // 8. Save back to file
    fs.writeFileSync(releaseNotesPath, JSON.stringify(existingNotes, null, 2), 'utf8');
    console.log(`Successfully generated release notes for version ${latestVersion}.`);
    return existingNotes;

  } catch (error) {
    console.error('Error generating release notes:', error);
    throw error;
  }
}

// Only run if executed directly (not imported)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateReleaseNotes().catch(() => process.exit(1));
}
