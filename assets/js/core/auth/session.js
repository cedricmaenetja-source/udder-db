import { HOSTNAME } from '../../utils/constants.js';

export async function isLoggedIn() {
  try {
    const res = await fetch("/api/session", {
      method: "GET",
      credentials: "include" 
    });

    if (!res.ok) return false;

    const data = await res.json();
    return data.loggedIn === true;

  } catch (err) {
    return false;
  }
}

export async function requireAuth(redirect = `${HOSTNAME}/login.html`) {
  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    window.location.href = redirect;
    return false;
  }

  return true;
}

export async function getCurrentUser(){
    try {
        const res = await fetch("/api/session", {
            method: "GET",
            credentials: "include" 
        });

        if (!res.ok) return false;

        const data = await res.json();
        return data;

    } catch (err) {
        return null;
    }
}