import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) socket = io();
  return socket;
}

// Svaki browser dobija svoj "token", da bi mogao da se vrati u partiju posle osvežavanja stranice
export function playerToken(): string {
  const make = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    let t = localStorage.getItem("playerToken");
    if (!t) {
      t = make();
      localStorage.setItem("playerToken", t);
    }
    return t;
  } catch {
    return make();
  }
}

export function savedName(): string {
  try {
    return localStorage.getItem("playerName") ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem("playerName", name);
  } catch {
    /* nije bitno */
  }
}

// Partija u kojoj je igrač trenutno (da se posle osvežavanja stranice vrati direktno u nju)
export function activeMatch(): string | null {
  try {
    return localStorage.getItem("activeMatch");
  } catch {
    return null;
  }
}

export function setActiveMatch(code: string | null) {
  try {
    if (code) localStorage.setItem("activeMatch", code);
    else localStorage.removeItem("activeMatch");
  } catch {
    /* nije bitno */
  }
}
