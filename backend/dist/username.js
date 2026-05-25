const USERNAME_RE = /^[a-zA-Z0-9._-]{3,24}$/;
export function normalizeUsername(input) {
    return input.trim().toLowerCase();
}
export function isValidUsername(username) {
    return USERNAME_RE.test(username);
}
export function usernameToEmail(username) {
    return `${username}@ban-den.local`;
}
