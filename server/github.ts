/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GitHubStats {
  stars: number;
  issues: number;
  commits: number;
  openPr: number;
  latestRelease: string;
}

/**
 * Parses the owner and repository name from a GitHub URL.
 * Supports SSH, HTTPS, and clean URLs.
 */
export function parseGithubUrl(urlStr: string): { owner: string; repo: string } | null {
  if (!urlStr) return null;
  let clean = urlStr.trim();

  // Remove trailing .git and trailing slash
  clean = clean.replace(/\.git$/, "").replace(/\/$/, "");

  // Check for SSH URL: git@github.com:owner/repo
  if (clean.startsWith("git@github.com:")) {
    const parts = clean.substring("git@github.com:".length).split("/");
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }

  // Handle standard HTTP/HTTPS URLs
  try {
    if (!/^https?:\/\//i.test(clean)) {
      clean = "https://" + clean;
    }
    const url = new URL(clean);
    if (url.hostname === "github.com" || url.hostname.endsWith(".github.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] };
      }
    }
  } catch (e) {
    console.error("Failed to parse GitHub URL:", urlStr, e);
  }
  return null;
}

/**
 * Fetches real metrics for a given repository URL and branch from GitHub's REST API.
 * Uses GITHUB_TOKEN environment variable for authenticated requests if available.
 */
export async function fetchGithubStats(repoUrl: string, branchName: string): Promise<GitHubStats | null> {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    console.warn("Invalid GitHub URL:", repoUrl);
    return null;
  }

  const { owner, repo } = parsed;
  const headers: HeadersInit = {
    "User-Agent": "DevVault-App",
    "Accept": "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    // 1. Fetch Repository Info (stars, open issues count)
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      console.warn(`GitHub Repo API returned status ${repoRes.status} for ${owner}/${repo}`);
      return null;
    }
    const repoData = await repoRes.json();

    // 2. Fetch Pull Requests count (per_page=1 to extract page count from Link header)
    let openPr = 0;
    try {
      const prsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=1`, { headers });
      if (prsRes.ok) {
        const linkHeader = prsRes.headers.get("Link");
        if (linkHeader) {
          const match = linkHeader.match(/&page=(\d+)>;\s*rel="last"/);
          if (match) {
            openPr = parseInt(match[1], 10);
          } else {
            const data = await prsRes.json();
            openPr = data.length;
          }
        } else {
          const data = await prsRes.json();
          openPr = data.length;
        }
      }
    } catch (e) {
      console.error("Failed to fetch PRs count:", e);
    }

    // 3. Fetch Commits count (per_page=1 to extract page count from Link header)
    let commits = 0;
    const targetBranch = branchName || repoData.default_branch || "main";
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${targetBranch}&per_page=1`, { headers });
      if (commitsRes.ok) {
        const linkHeader = commitsRes.headers.get("Link");
        if (linkHeader) {
          const match = linkHeader.match(/&page=(\d+)>;\s*rel="last"/);
          if (match) {
            commits = parseInt(match[1], 10);
          } else {
            const data = await commitsRes.json();
            commits = data.length;
          }
        } else {
          const data = await commitsRes.json();
          commits = data.length;
        }
      }
    } catch (e) {
      console.error("Failed to fetch commits count:", e);
    }

    // 4. Fetch Latest Release tag or Tag fallback
    let latestRelease = "v1.0.0";
    try {
      const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers });
      if (releaseRes.ok) {
        const releaseData = await releaseRes.json();
        latestRelease = releaseData.tag_name || "v1.0.0";
      } else {
        // Fallback to tags if no official release
        const tagsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`, { headers });
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          if (tagsData.length > 0) {
            latestRelease = tagsData[0].name;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch latest release:", e);
    }

    // GitHub's open_issues_count includes both issues and PRs.
    // Subtract open PRs to get the pure open issues count.
    const rawIssuesCount = repoData.open_issues_count || 0;
    const pureIssues = Math.max(0, rawIssuesCount - openPr);

    return {
      stars: repoData.stargazers_count || 0,
      issues: pureIssues,
      commits,
      openPr,
      latestRelease,
    };
  } catch (error) {
    console.error(`Error fetching GitHub data for ${owner}/${repo}:`, error);
    return null;
  }
}
