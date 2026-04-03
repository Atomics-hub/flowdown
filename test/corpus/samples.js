export const SAMPLES = [
  {
    name: 'Simple explanation',
    markdown: `The \`Array.prototype.map()\` method creates a new array populated with the results of calling a provided function on every element in the calling array.

**Syntax:**

\`\`\`javascript
const newArray = arr.map(callback(element, index, array), thisArg);
\`\`\`

**Parameters:**

- \`callback\` — Function that is called for every element of \`arr\`
- \`thisArg\` — Value to use as \`this\` when executing \`callback\`

**Return value:** A new array with each element being the result of the callback function.`,
  },

  {
    name: 'Code-heavy response',
    markdown: `## Setting Up Authentication

First, install the required dependencies:

\`\`\`bash
npm install jsonwebtoken bcrypt express-session
\`\`\`

Then create the auth middleware:

\`\`\`typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
\`\`\`

### Usage

\`\`\`typescript
app.get('/api/profile', authenticate, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});
\`\`\`

> **Note:** Always store your JWT secret in environment variables, never in source code.`,
  },

  {
    name: 'Table-heavy response',
    markdown: `## HTTP Status Codes

Here's a quick reference for common HTTP status codes:

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Success, no body returned |
| 301 | Moved Permanently | Resource has moved |
| 400 | Bad Request | Invalid request syntax |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 502 | Bad Gateway | Invalid upstream response |
| 503 | Service Unavailable | Server temporarily down |

### When to Use Each

- **200**: Default success response for GET, PUT, PATCH
- **201**: After successful POST that creates a resource
- **204**: After successful DELETE
- **400**: When request body validation fails
- **401** vs **403**: Use 401 when not authenticated, 403 when authenticated but not authorized`,
  },

  {
    name: 'Nested formatting',
    markdown: `# Understanding **Async/Await** in JavaScript

The \`async/await\` syntax provides a cleaner way to work with promises. Here's what you need to know:

1. **\`async\` functions** always return a promise
2. **\`await\`** pauses execution until the promise settles
3. Error handling uses standard **try/catch** blocks

### Key Differences from *.then()* Chains

The traditional approach:

\`\`\`javascript
fetchUser(id)
  .then(user => fetchPosts(user.id))
  .then(posts => renderPosts(posts))
  .catch(err => handleError(err));
\`\`\`

The async/await approach:

\`\`\`javascript
try {
  const user = await fetchUser(id);
  const posts = await fetchPosts(user.id);
  renderPosts(posts);
} catch (err) {
  handleError(err);
}
\`\`\`

> **Pro tip:** Use \`Promise.all()\` when you need to run multiple async operations *in parallel* rather than sequentially.

---

See the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) for more details.`,
  },

  {
    name: 'Blockquote with multiple paragraphs',
    markdown: `## Design Philosophy

Our approach is guided by several key principles:

> **Simplicity over complexity.** Every feature should justify its existence. If it can be removed without significantly impacting the user experience, it should be.
>
> This means we often say "no" to feature requests that would add complexity without proportional value.

> **Performance is a feature.** Users notice when things are fast. A 100ms response feels instant; a 1s response feels sluggish. We optimize for the common case.

### Implementation Guidelines

- Keep functions under 50 lines
- Prefer composition over inheritance
- Write tests for behavior, not implementation
- Document *why*, not *what*`,
  },

  {
    name: 'Mixed list types',
    markdown: `## Project Setup Checklist

1. Create the repository
2. Initialize the project
3. Install dependencies

**Required tools:**

- Node.js >= 18
- npm >= 9
- Git >= 2.30

**Optional tools:**

- Docker (for local development)
- Redis (for caching)
- PostgreSQL (for database)

### Configuration Steps

1. Copy \`.env.example\` to \`.env\`
2. Update the database URL
3. Run \`npm run db:migrate\`
4. Start the dev server with \`npm run dev\``,
  },

  {
    name: 'Emoji and special characters',
    markdown: `# 🚀 Release Notes v2.5.0

## ✨ New Features

- **Dark mode** — Full dark mode support across all pages
- **Search** — Full-text search with fuzzy matching
- **Export** — Export data to CSV, JSON, or PDF

## 🐛 Bug Fixes

- Fixed memory leak in WebSocket handler
- Resolved race condition in concurrent uploads
- Fixed incorrect timezone conversion for UTC-12

## ⚠️ Breaking Changes

- \`config.apiUrl\` renamed to \`config.baseUrl\`
- Minimum Node.js version bumped to 18.x
- Removed deprecated \`legacyMode\` option

## 📊 Performance

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| TTI | 3.2s | 1.8s | 44% faster |
| Bundle | 450KB | 280KB | 38% smaller |
| API P95 | 120ms | 45ms | 62% faster |`,
  },

  {
    name: 'Deep blockquote with code',
    markdown: `The error you're seeing is likely caused by a missing \`await\`:

> **Error:** \`TypeError: Cannot read properties of undefined\`
>
> This happens when you call an async function without \`await\`:
>
> \`\`\`javascript
> // Wrong
> const data = fetchData();
> console.log(data.name); // TypeError!
>
> // Correct
> const data = await fetchData();
> console.log(data.name); // Works!
> \`\`\`

Make sure all your async calls use \`await\` or handle the promise with \`.then()\`.`,
  },

  {
    name: 'Long code block',
    markdown: `## Full Example

\`\`\`python
import asyncio
import aiohttp
from dataclasses import dataclass
from typing import Optional

@dataclass
class Config:
    base_url: str
    api_key: str
    timeout: int = 30
    max_retries: int = 3

@dataclass
class Response:
    status: int
    data: dict
    headers: dict

class APIClient:
    def __init__(self, config: Config):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {self.config.api_key}"},
            timeout=aiohttp.ClientTimeout(total=self.config.timeout),
        )
        return self

    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()

    async def get(self, path: str, params: dict = None) -> Response:
        url = f"{self.config.base_url}{path}"
        for attempt in range(self.config.max_retries):
            try:
                async with self.session.get(url, params=params) as resp:
                    data = await resp.json()
                    return Response(
                        status=resp.status,
                        data=data,
                        headers=dict(resp.headers),
                    )
            except aiohttp.ClientError as e:
                if attempt == self.config.max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)

    async def post(self, path: str, body: dict) -> Response:
        url = f"{self.config.base_url}{path}"
        async with self.session.post(url, json=body) as resp:
            data = await resp.json()
            return Response(
                status=resp.status,
                data=data,
                headers=dict(resp.headers),
            )

async def main():
    config = Config(
        base_url="https://api.example.com",
        api_key="sk-test-key",
    )
    async with APIClient(config) as client:
        users = await client.get("/users", params={"limit": 10})
        print(f"Found {len(users.data)} users")

        new_user = await client.post("/users", body={
            "name": "Alice",
            "email": "alice@example.com",
        })
        print(f"Created user: {new_user.data['id']}")

if __name__ == "__main__":
    asyncio.run(main())
\`\`\`

This example demonstrates proper async HTTP client patterns with retry logic and context managers.`,
  },

  {
    name: 'Strikethrough and mixed inline',
    markdown: `## Migration Guide

### What Changed

- ~~\`oldMethod()\`~~ → Use \`newMethod()\` instead
- ~~\`config.legacy\`~~ → Use \`config.modern\` instead
- ~~\`utils.deprecated()\`~~ → Removed entirely, use native \`Array.from()\`

### Before and After

**Before (v1):**
\`\`\`javascript
const result = oldMethod(data, { legacy: true });
\`\`\`

**After (v2):**
\`\`\`javascript
const result = newMethod(data);
\`\`\`

> ~~The old API will continue to work until v3.~~ **Update:** The old API has been removed as of v2.1.`,
  },
]
