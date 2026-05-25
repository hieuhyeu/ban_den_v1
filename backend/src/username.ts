const USERNAME_RE = /^[a-zA-Z0-9._-]{3,24}$/

export function normalizeUsername(input: string) {
  return input.trim().toLowerCase()
}

export function isValidUsername(username: string) {
  return USERNAME_RE.test(username)
}

export function usernameToEmail(username: string) {
  return `${username}@ban-den.local`
}

