export function passwordMeetsRules(pw: string): boolean {
  return pw.length >= 8 && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

export function passwordsMatch(a: string, b: string): boolean {
  return a.length > 0 && a === b;
}

export function passwordFormValid(password: string, confirmation: string): boolean {
  return passwordMeetsRules(password) && passwordsMatch(password, confirmation);
}
