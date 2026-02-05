import { NextResponse } from "next/server";

interface Skill {
  name: string;
  slug: string;
  description: string;
  url: string;
  author?: string;
}

interface Category {
  name: string;
  id: string;
  count: number;
  skills: Skill[];
}

// Cache the parsed data for 1 hour
let cachedData: { categories: Category[]; fetchedAt: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.toLowerCase() || null;

  try {
    // Check cache
    if (cachedData && Date.now() - cachedData.fetchedAt < CACHE_DURATION) {
      return filterAndReturn(cachedData.categories, category, search);
    }

    // Fetch README from GitHub
    const res = await fetch(
      "https://raw.githubusercontent.com/VoltAgent/awesome-openclaw-skills/main/README.md",
      { next: { revalidate: 3600 } }
    );
    
    if (!res.ok) {
      throw new Error("Failed to fetch skills list");
    }

    const readme = await res.text();
    const categories = parseReadme(readme);

    // Cache the result
    cachedData = { categories, fetchedAt: Date.now() };

    return filterAndReturn(categories, category, search);
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
      categories: [],
    });
  }
}

function filterAndReturn(categories: Category[], categoryFilter: string | null, search: string | null) {
  let result = categories;

  // Filter by category
  if (categoryFilter) {
    result = result.filter(c => c.id === categoryFilter);
  }

  // Filter by search
  if (search) {
    result = result.map(cat => ({
      ...cat,
      skills: cat.skills.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search)
      ),
    })).filter(cat => cat.skills.length > 0);
  }

  const totalSkills = result.reduce((acc, c) => acc + c.skills.length, 0);

  return NextResponse.json({
    success: true,
    categories: result,
    totalCategories: categories.length,
    totalSkills,
  });
}

function parseReadme(readme: string): Category[] {
  const categories: Category[] = [];
  
  // Split by category headers (### or <summary><h3)
  const categoryRegex = /(?:<summary><h3[^>]*>|### )([^<\n]+)/g;
  const skillRegex = /- \[([^\]]+)\]\(([^)]+)\)(?: - (.+))?/g;

  // Find all categories in Table of Contents first
  const tocMatch = readme.match(/## Table of Contents\n([\s\S]*?)(?=<br|##)/);
  if (!tocMatch) return categories;

  const toc = tocMatch[1];
  const catMatches = Array.from(toc.matchAll(/- \[([^\]]+)\]\(#([^)]+)\) \((\d+)\)/g));

  for (const match of catMatches) {
    const name = match[1];
    const id = match[2];
    const count = parseInt(match[3]);

    // Find skills for this category
    const catHeaderRegex = new RegExp(
      `(?:<summary><h3[^>]*>|### )${escapeRegex(name)}[\\s\\S]*?(?=<\\/details>|<details|### |$)`,
      "i"
    );
    const catSection = readme.match(catHeaderRegex);
    
    const skills: Skill[] = [];
    if (catSection) {
      const skillMatches = Array.from(catSection[0].matchAll(skillRegex));
      for (const sm of skillMatches) {
        const skillName = sm[1];
        const url = sm[2];
        const description = sm[3] || "";
        
        // Extract slug from URL (match after /main/ or /master/ to skip repo name "skills")
        const slugMatch = url.match(/\/(?:main|master)\/skills\/([^/]+)\/([^/]+)/);
        const author = slugMatch?.[1] || "";
        const slug = slugMatch?.[2] || skillName;

        skills.push({
          name: skillName,
          slug,
          description: description.trim(),
          url,
          author,
        });
      }
    }

    categories.push({ name, id, count, skills });
  }

  return categories;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
