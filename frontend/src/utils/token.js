export function setToken(token){
  localStorage.setItem('token', token);
}
export function getToken(){
  return localStorage.getItem('token');
}
export function removeToken(){
  localStorage.removeItem('token');
}

// basic token sanity check (not a substitute for server validation)
export function isValidToken(token){
  if (!token) return false;
  if (typeof token !== 'string') return false;
  if (token === 'null' || token === 'undefined') return false;
  // JWTs usually contain dots and have a reasonable length
  if (token.includes('.') && token.length > 20) return true;
  // fallback: treat longer strings as potentially valid
  return token.length > 10;
}
