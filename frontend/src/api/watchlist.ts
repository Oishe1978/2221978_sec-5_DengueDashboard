import type { WatchCreateInput, WatchItem, WatchUpdateInput } from "../types";
import { request } from "./http";

// READ LIST   GET /api/v1/watchlist   (only your own items)
export function listWatchItems(): Promise<WatchItem[]> {
  return request<WatchItem[]>("/api/v1/watchlist");
}

// READ SINGLE   GET /api/v1/watchlist/{id}
export function getWatchItem(id: string): Promise<WatchItem> {
  return request<WatchItem>(`/api/v1/watchlist/${id}`);
}

// CREATE   POST /api/v1/watchlist
export function createWatchItem(data: WatchCreateInput): Promise<WatchItem> {
  return request<WatchItem>("/api/v1/watchlist", { method: "POST", body: JSON.stringify(data) });
}

// UPDATE   PATCH /api/v1/watchlist/{id}
export function updateWatchItem(id: string, data: WatchUpdateInput): Promise<WatchItem> {
  return request<WatchItem>(`/api/v1/watchlist/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// DELETE   DELETE /api/v1/watchlist/{id}
export function deleteWatchItem(id: string): Promise<void> {
  return request<void>(`/api/v1/watchlist/${id}`, { method: "DELETE" });
}
