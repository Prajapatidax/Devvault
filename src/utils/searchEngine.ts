import { Project, Secret, Snippet, Note, RepositoryTracker, Bug } from "../types";

export interface SearchItem {
  id: string; // resourceType + ":" + resourceId
  resourceId: string;
  resourceType: "project" | "secret" | "note" | "snippet" | "tracker" | "task";
  title: string;
  subtitle: string;
  content: string;
  tags: string[];
  updatedAt: string;
  originalData: any;
}

const DB_NAME = "devvault_search_index";
const DB_VERSION = 1;
const STORE_NAME = "search_items";

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

// Clear search store
export async function clearSearchStore(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Put multiple search items into IndexedDB
export async function putSearchItems(items: SearchItem[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const item of items) {
      store.put(item);
    }
  });
}

// Get all search items from IndexedDB
export async function getAllSearchItems(): Promise<SearchItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fuzzy Match Ranker
export interface SearchResult {
  item: SearchItem;
  score: number;
  matches: {
    key: "title" | "content" | "tags";
    indices: [number, number][]; // [start, length][]
  }[];
}

// Helper to calculate Levenshtein distance
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

// Fuzzy Search Core
export function fuzzySearch(items: SearchItem[], query: string): SearchResult[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    // Return sorted alphabetically or by date
    return items.map((item) => ({ item, score: 0, matches: [] }));
  }

  const queryWords = cleanQuery.split(/\s+/);
  const results: SearchResult[] = [];

  for (const item of items) {
    let score = 0;
    const matches: SearchResult["matches"] = [];

    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();

    // 1. Check title exact match and prefix matches
    let titleMatch = false;
    const titleIndices: [number, number][] = [];
    
    // Check direct substring
    const exactTitleIndex = titleLower.indexOf(cleanQuery);
    if (exactTitleIndex !== -1) {
      score += 1000 - exactTitleIndex; // Prefer matches closer to start
      titleIndices.push([exactTitleIndex, cleanQuery.length]);
      titleMatch = true;
    } else {
      // Check prefix word match or word boundary
      let wordMatchesCount = 0;
      for (const word of queryWords) {
        const wordIndex = titleLower.indexOf(word);
        if (wordIndex !== -1) {
          score += 300 - wordIndex;
          titleIndices.push([wordIndex, word.length]);
          wordMatchesCount++;
        }
      }
      if (wordMatchesCount === queryWords.length) {
        titleMatch = true;
      }
    }

    if (titleIndices.length > 0) {
      matches.push({ key: "title", indices: titleIndices });
    }

    // 2. Check tags match
    const tagIndices: [number, number][] = [];
    item.tags.forEach((tag) => {
      const tagLower = tag.toLowerCase();
      queryWords.forEach((word) => {
        if (tagLower === word) {
          score += 150;
        } else if (tagLower.includes(word)) {
          score += 50;
        }
      });
    });

    // 3. Check content substring match
    const contentIndices: [number, number][] = [];
    queryWords.forEach((word) => {
      let idx = contentLower.indexOf(word);
      while (idx !== -1 && contentIndices.length < 5) {
        score += 30; // content match weight
        contentIndices.push([idx, word.length]);
        idx = contentLower.indexOf(word, idx + 1);
      }
    });

    if (contentIndices.length > 0) {
      matches.push({ key: "content", indices: contentIndices });
    }

    // 4. Fuzzy typo match on title if no substring match found
    if (!titleMatch && cleanQuery.length > 3) {
      const titleWords = titleLower.split(/[^a-z0-9]+/);
      for (const titleWord of titleWords) {
        if (titleWord.length > 3) {
          const dist = getLevenshteinDistance(cleanQuery, titleWord);
          if (dist <= 2) {
            score += 100 - dist * 30;
            const idx = titleLower.indexOf(titleWord);
            if (idx !== -1) {
              matches.push({ key: "title", indices: [[idx, titleWord.length]] });
            }
            break;
          }
        }
      }
    }

    if (score > 0) {
      results.push({ item, score, matches });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// Background Sync Index
export async function syncSearchIndex(apiFetch: any): Promise<void> {
  try {
    const promises = [
      apiFetch("/api/projects").then((r: any) => (r.ok ? r.json() : [])),
      apiFetch("/api/secrets").then((r: any) => (r.ok ? r.json() : [])),
      apiFetch("/api/notes").then((r: any) => (r.ok ? r.json() : [])),
      apiFetch("/api/snippets").then((r: any) => (r.ok ? r.json() : [])),
      apiFetch("/api/repositories").then((r: any) => (r.ok ? r.json() : [])),
      apiFetch("/api/bugs").then((r: any) => (r.ok ? r.json() : []))
    ];

    const [projects, secrets, notes, snippets, trackers, bugs] = await Promise.all(promises);

    const items: SearchItem[] = [];

    // Index Projects
    projects.forEach((proj: any) => {
      const envNames = proj.apiKeyNames ? proj.apiKeyNames.join(", ") : "";
      items.push({
        id: `project:${proj.id}`,
        resourceId: proj.id,
        resourceType: "project",
        title: proj.name,
        subtitle: `Project • ${proj.status} • Priority ${proj.priority}`,
        content: `${proj.description} ${proj.techStack.join(" ")} ${proj.database} ${proj.server} ${proj.domain} ${envNames} ${proj.notes}`,
        tags: proj.tags || proj.techStack || [],
        updatedAt: proj.updatedAt || proj.createdAt,
        originalData: proj
      });

      if (proj.apiKeyNames && proj.apiKeyNames.length > 0) {
        proj.apiKeyNames.forEach((keyName: string) => {
          items.push({
            id: `env:${proj.id}:${keyName}`,
            resourceId: proj.id,
            resourceType: "project",
            title: keyName,
            subtitle: `Environment Variable • Project: ${proj.name}`,
            content: `API Key Environment Variable ${keyName} for project ${proj.name}`,
            tags: ["api-key", "env", "credentials"],
            updatedAt: proj.updatedAt,
            originalData: proj
          });
        });
      }
    });

    // Index Secrets
    secrets.forEach((sec: any) => {
      items.push({
        id: `secret:${sec.id}`,
        resourceId: sec.id,
        resourceType: "secret",
        title: sec.label,
        subtitle: `Secret Key • Folder: ${sec.folder}`,
        content: `Secret label ${sec.label} Key: ${sec.key} folder: ${sec.folder}`,
        tags: ["secret", sec.folder, sec.key],
        updatedAt: sec.createdAt,
        originalData: sec
      });
    });

    // Index Notes & Docs
    notes.forEach((note: any) => {
      const isDoc = note.folder === "Documentation";
      items.push({
        id: `note:${note.id}`,
        resourceId: note.id,
        resourceType: "note",
        title: note.title,
        subtitle: isDoc ? `Documentation • Folder: ${note.folder}` : `Note • Folder: ${note.folder}`,
        content: note.content || "",
        tags: note.tags || [],
        updatedAt: note.updatedAt || note.createdAt,
        originalData: note
      });
    });

    // Index Snippets
    snippets.forEach((snip: any) => {
      items.push({
        id: `snippet:${snip.id}`,
        resourceId: snip.id,
        resourceType: "snippet",
        title: snip.title,
        subtitle: `Snippet • Language: ${snip.language} • Folder: ${snip.folder}`,
        content: `${snip.code} ${snip.language} ${snip.title}`,
        tags: snip.tags || [],
        updatedAt: snip.updatedAt || snip.createdAt,
        originalData: snip
      });
    });

    // Index Repository Trackers
    trackers.forEach((track: any) => {
      items.push({
        id: `tracker:${track.id}`,
        resourceId: track.id,
        resourceType: "tracker",
        title: track.name,
        subtitle: `Repository Tracker • Branch: ${track.branch}`,
        content: `Git Repo Tracker ${track.name} ${track.url} branch: ${track.branch}`,
        tags: ["git", "tracker", track.branch],
        updatedAt: track.updatedAt || track.createdAt,
        originalData: track
      });
    });

    // Index Tasks (Bugs)
    bugs.forEach((bug: any) => {
      items.push({
        id: `task:${bug.id}`,
        resourceId: bug.id,
        resourceType: "task",
        title: bug.title,
        subtitle: `Task Bug • Status: ${bug.status} • Priority: ${bug.priority}`,
        content: bug.description || "",
        tags: ["task", "bug", bug.status, bug.priority],
        updatedAt: bug.updatedAt || bug.createdAt,
        originalData: bug
      });
    });

    await clearSearchStore();
    await putSearchItems(items);
    console.log(`[Search Index] Synchronized ${items.length} items to IndexedDB.`);
  } catch (error) {
    console.error("Failed to synchronize search index:", error);
  }
}
