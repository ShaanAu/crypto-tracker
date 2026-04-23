const OWNER = 'ShaanAu'
const REPO = 'crypto-tracker'
const BRANCH = 'main'
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
})

export async function getFile<T>(path: string): Promise<{ data: T | null; sha: string | null }> {
  const res = await fetch(`${BASE}/${path}`, { headers: headers() })
  if (res.status === 404) return { data: null, sha: null }
  if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status}`)
  const json = await res.json()
  const content = JSON.parse(atob(json.content.replace(/\n/g, ''))) as T
  return { data: content, sha: json.sha }
}

export async function putFile<T>(
  path: string,
  data: T,
  sha: string | null,
  message: string
): Promise<string> {
  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    branch: BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(`${BASE}/${path}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GitHub PUT ${path}: ${res.status}`)
  const json = await res.json()
  return json.content.sha as string
}
