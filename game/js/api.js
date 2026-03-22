export const API_BASE =
  window.STUDY_BUDDY_API_BASE || "http://localhost:8080/api";

let sessionExpiredHandler = null;

export function setSessionExpiredHandler(fn) {
  sessionExpiredHandler = typeof fn === "function" ? fn : null;
}

export function getToken() {
  return localStorage.getItem("sb_token") || "";
}

export function setToken(token) {
  localStorage.setItem("sb_token", token);
}

export function clearToken() {
  localStorage.removeItem("sb_token");
  localStorage.removeItem("sb_user");
}

export function getSavedUser() {
  try {
    const raw = localStorage.getItem("sb_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedUser(user) {
  localStorage.setItem("sb_user", JSON.stringify(user || null));
}

export function clearSavedUser() {
  localStorage.removeItem("sb_user");
}

export function logout() {
  clearToken();
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (res.status === 401) {
    clearToken();
    if (sessionExpiredHandler) {
      try {
        sessionExpiredHandler(data);
      } catch {}
    }
  }

  if (!res.ok) {
    const message = data?.error || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export async function apiGet(path, token = getToken()) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return parseResponse(res);
}

export async function apiPost(path, body, token = getToken()) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function apiPatch(path, body, token = getToken()) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

export async function apiDelete(path, token = getToken()) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return parseResponse(res);
}

export async function apiUpload(path, formData, token = getToken()) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return parseResponse(res);
}

export async function register(email, password, displayName) {
  const data = await apiPost("/auth/register", {
    email,
    password,
    displayName,
  });

  if (data?.token) setToken(data.token);
  if (data?.user) setSavedUser(data.user);
  return data;
}

export async function login(email, password) {
  const data = await apiPost("/auth/login", {
    email,
    password,
  });

  if (data?.token) setToken(data.token);
  if (data?.user) setSavedUser(data.user);
  return data;
}

export async function getCurrentUser() {
  const data = await apiGet("/auth/me");
  if (data?.user) setSavedUser(data.user);
  return data;
}

export async function bootAuth() {
  const token = getToken();
  if (!token) {
    clearSavedUser();
    return {
      ok: false,
      user: null,
    };
  }

  try {
    const data = await getCurrentUser();
    return {
      ok: true,
      user: data.user || null,
    };
  } catch {
    clearToken();
    return {
      ok: false,
      user: null,
    };
  }
}

export async function getLessons() {
  return apiGet("/lessons");
}

export async function createLesson(payload) {
  return apiPost("/lessons", payload);
}

export async function updateLesson(lessonId, payload) {
  return apiPatch(`/lessons/${encodeURIComponent(lessonId)}`, payload);
}

export async function deleteLesson(lessonId) {
  return apiDelete(`/lessons/${encodeURIComponent(lessonId)}`);
}

export async function uploadLessonImage(
  lessonId,
  file,
  imageKey = "",
  kind = "item"
) {
  const form = new FormData();
  form.append("lessonId", lessonId);
  form.append("kind", kind);

  if (imageKey) {
    form.append("itemKey", imageKey);
    form.append("imageKey", imageKey);
  }

  form.append("image", file);

  return apiUpload("/uploads/lesson-image", form);
}

export async function deleteLessonItemImage(lessonId, itemKey) {
  const q = new URLSearchParams({
    lessonId,
    itemKey,
  }).toString();

  return apiDelete(`/uploads/lesson-image?${q}`);
}

export async function getImageMetadata(imageId) {
  return apiGet(`/uploads/image/${encodeURIComponent(imageId)}`);
}

export function withImageVersion(path, version) {
  if (!path) return "";
  if (!version) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}v=${encodeURIComponent(version)}`;
}

export function getImageUrl(path, version = "") {
  if (!path) return "";
  const base = API_BASE.replace(/\/api$/, "");
  const finalPath = withImageVersion(path, version);
  return `${base}${finalPath}`;
}

export function wsUrl(path = "") {
  const custom = window.STUDY_BUDDY_WS_URL;
  if (custom) return custom + path;

  const base = API_BASE.replace(/\/api$/, "");

  if (base.startsWith("https://")) {
    return base.replace("https://", "wss://") + path;
  }

  if (base.startsWith("http://")) {
    return base.replace("http://", "ws://") + path;
  }

  return "ws://localhost:8080" + path;
}

// export const API_BASE =
//   window.STUDY_BUDDY_API_BASE || "http://localhost:8080/api";

// export function getToken() {
//   return localStorage.getItem("sb_token") || "";
// }

// export function setToken(token) {
//   localStorage.setItem("sb_token", token);
// }

// export function clearToken() {
//   localStorage.removeItem("sb_token");
// }

// async function parseResponse(res) {
//   const text = await res.text();
//   let data = null;

//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = { raw: text };
//   }

//   if (!res.ok) {
//     const message = data?.error || `HTTP ${res.status}`;
//     throw new Error(message);
//   }

//   return data;
// }

// export async function apiGet(path, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   });
//   return parseResponse(res);
// }

// export async function apiPost(path, body, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: JSON.stringify(body),
//   });
//   return parseResponse(res);
// }

// export async function apiPatch(path, body, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "PATCH",
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: JSON.stringify(body),
//   });
//   return parseResponse(res);
// }

// export async function apiDelete(path, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "DELETE",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   });
//   return parseResponse(res);
// }

// export async function apiUpload(path, formData, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: formData,
//   });
//   return parseResponse(res);
// }

// export async function register(email, password, displayName) {
//   const data = await apiPost("/auth/register", {
//     email,
//     password,
//     displayName,
//   });

//   if (data?.token) setToken(data.token);
//   return data;
// }

// export async function login(email, password) {
//   const data = await apiPost("/auth/login", {
//     email,
//     password,
//   });

//   if (data?.token) setToken(data.token);
//   return data;
// }

// export async function getLessons() {
//   return apiGet("/lessons");
// }

// export async function createLesson(payload) {
//   return apiPost("/lessons", payload);
// }

// export async function updateLesson(lessonId, payload) {
//   return apiPatch(`/lessons/${encodeURIComponent(lessonId)}`, payload);
// }

// export async function deleteLesson(lessonId) {
//   return apiDelete(`/lessons/${encodeURIComponent(lessonId)}`);
// }

// export async function uploadLessonImage(
//   lessonId,
//   file,
//   imageKey = "",
//   kind = "item"
// ) {
//   const form = new FormData();
//   form.append("lessonId", lessonId);
//   form.append("kind", kind);

//   if (imageKey) {
//     form.append("itemKey", imageKey);
//     form.append("imageKey", imageKey);
//   }

//   form.append("image", file);

//   return apiUpload("/uploads/lesson-image", form);
// }

// export async function deleteLessonItemImage(lessonId, itemKey) {
//   const q = new URLSearchParams({
//     lessonId,
//     itemKey,
//   }).toString();

//   return apiDelete(`/uploads/lesson-image?${q}`);
// }

// export async function getImageMetadata(imageId) {
//   return apiGet(`/uploads/image/${encodeURIComponent(imageId)}`);
// }

// export function withImageVersion(path, version) {
//   if (!path) return "";
//   if (!version) return path;
//   const joiner = path.includes("?") ? "&" : "?";
//   return `${path}${joiner}v=${encodeURIComponent(version)}`;
// }

// export function getImageUrl(path, version = "") {
//   if (!path) return "";
//   const base = API_BASE.replace(/\/api$/, "");
//   const finalPath = withImageVersion(path, version);
//   return `${base}${finalPath}`;
// }

// export function wsUrl(path = "") {
//   const custom = window.STUDY_BUDDY_WS_URL;
//   if (custom) return custom + path;

//   const base = API_BASE.replace(/\/api$/, "");

//   if (base.startsWith("https://")) {
//     return base.replace("https://", "wss://") + path;
//   }

//   if (base.startsWith("http://")) {
//     return base.replace("http://", "ws://") + path;
//   }

//   return "ws://localhost:8080" + path;
// }

// export const API_BASE =
//   window.STUDY_BUDDY_API_BASE || "http://localhost:8080/api";

// export function getToken() {
//   return localStorage.getItem("sb_token") || "";
// }

// export function setToken(token) {
//   localStorage.setItem("sb_token", token);
// }

// export function clearToken() {
//   localStorage.removeItem("sb_token");
// }

// async function parseResponse(res) {
//   const text = await res.text();
//   let data = null;

//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = { raw: text };
//   }

//   if (!res.ok) {
//     const message = data?.error || `HTTP ${res.status}`;
//     throw new Error(message);
//   }

//   return data;
// }

// export async function apiGet(path, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   });
//   return parseResponse(res);
// }

// export async function apiPost(path, body, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: JSON.stringify(body),
//   });
//   return parseResponse(res);
// }

// export async function apiPatch(path, body, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "PATCH",
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: JSON.stringify(body),
//   });
//   return parseResponse(res);
// }

// export async function apiDelete(path, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "DELETE",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   });
//   return parseResponse(res);
// }

// export async function apiUpload(path, formData, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: formData,
//   });
//   return parseResponse(res);
// }

// export async function register(email, password, displayName) {
//   const data = await apiPost("/auth/register", {
//     email,
//     password,
//     displayName,
//   });

//   if (data?.token) setToken(data.token);
//   return data;
// }

// export async function login(email, password) {
//   const data = await apiPost("/auth/login", {
//     email,
//     password,
//   });

//   if (data?.token) setToken(data.token);
//   return data;
// }

// export async function getLessons() {
//   return apiGet("/lessons");
// }

// export async function createLesson(payload) {
//   return apiPost("/lessons", payload);
// }

// export async function updateLesson(lessonId, payload) {
//   return apiPatch(`/lessons/${encodeURIComponent(lessonId)}`, payload);
// }

// export async function deleteLesson(lessonId) {
//   return apiDelete(`/lessons/${encodeURIComponent(lessonId)}`);
// }

// export async function uploadLessonImage(
//   lessonId,
//   file,
//   imageKey = "",
//   kind = "item"
// ) {
//   const form = new FormData();
//   form.append("lessonId", lessonId);
//   form.append("kind", kind);

//   if (imageKey) {
//     form.append("itemKey", imageKey);
//     form.append("imageKey", imageKey);
//   }

//   form.append("image", file);

//   return apiUpload("/uploads/lesson-image", form);
// }

// export async function deleteLessonItemImage(lessonId, itemKey) {
//   const q = new URLSearchParams({
//     lessonId,
//     itemKey,
//   }).toString();

//   return apiDelete(`/uploads/lesson-image?${q}`);
// }

// export async function getImageMetadata(imageId) {
//   return apiGet(`/uploads/image/${encodeURIComponent(imageId)}`);
// }

// export function getImageUrl(path) {
//   if (!path) return "";
//   const base = API_BASE.replace(/\/api$/, "");
//   return `${base}${path}`;
// }

// export function wsUrl(path = "") {
//   const custom = window.STUDY_BUDDY_WS_URL;
//   if (custom) return custom + path;

//   const base = API_BASE.replace(/\/api$/, "");

//   if (base.startsWith("https://")) {
//     return base.replace("https://", "wss://") + path;
//   }

//   if (base.startsWith("http://")) {
//     return base.replace("http://", "ws://") + path;
//   }

//   return "ws://localhost:8080" + path;
// }

// export const API_BASE = window.STUDY_BUDDY_API_BASE || "http://localhost:8080/api";

// export function getToken() {
//   return localStorage.getItem("sb_token") || "";
// }

// export function setToken(token) {
//   localStorage.setItem("sb_token", token);
// }

// export function clearToken() {
//   localStorage.removeItem("sb_token");
// }

// async function parseResponse(res) {
//   const text = await res.text();
//   let data = null;

//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = { raw: text };
//   }

//   if (!res.ok) {
//     const message = data?.error || `HTTP ${res.status}`;
//     throw new Error(message);
//   }

//   return data;
// }

// export async function apiGet(path, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   });
//   return parseResponse(res);
// }

// export async function apiPost(path, body, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: JSON.stringify(body),
//   });
//   return parseResponse(res);
// }

// export async function apiDelete(path, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "DELETE",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   });
//   return parseResponse(res);
// }

// // export async function apiDelete(path){
// //   const res = await fetch(API_BASE + path, {
// //     method: "DELETE",
// //     headers: getHeaders(false)
// //   });
// //   return await res.json();
// // }

// export async function deleteLesson(lessonId){
//   return await apiDelete(`/api/lessons/${lessonId}`);
// }

// export async function deleteLessonItemImage(lessonId, itemKey){
//   const q = new URLSearchParams({
//     lessonId,
//     itemKey
//   }).toString();

//   return await apiDelete(`/api/uploads/lesson-image?${q}`);
// }

// export async function apiUpload(path, formData, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: formData,
//   });
//   return parseResponse(res);
// }

// export async function register(email, password, displayName) {
//   const data = await apiPost("/auth/register", {
//     email,
//     password,
//     displayName,
//   });

//   if (data?.token) setToken(data.token);
//   return data;
// }

// export async function login(email, password) {
//   const data = await apiPost("/auth/login", {
//     email,
//     password,
//   });

//   if (data?.token) setToken(data.token);
//   return data;
// }

// export async function getLessons() {
//   return apiGet("/lessons");
// }

// export async function createLesson(payload){
//   return await apiPost("/api/lessons", payload);
// }

// export async function updateLesson(lessonId, payload){
//   return await apiPatch(`/api/lessons/${lessonId}`, payload);
// }

// export async function uploadLessonImage(lessonId, file, imageKey = "", kind = "item") {
//   const form = new FormData();
//   form.append("lessonId", lessonId);
//   form.append("kind", kind);

//   if (imageKey) {
//     form.append("imageKey", imageKey);
//   }

//   form.append("image", file);

//   return apiUpload("/uploads/lesson-image", form);
// }

// export async function getImageMetadata(imageId) {
//   return apiGet(`/uploads/image/${encodeURIComponent(imageId)}`);
// }

// export async function deleteLessonImage(imageId) {
//   return apiDelete(`/uploads/image/${encodeURIComponent(imageId)}`);
// }

// export function getImageUrl(path) {
//   if (!path) return "";
//   const base = API_BASE.replace(/\/api$/, "");
//   return `${base}${path}`;
// }

// export function wsUrl(path = "") {
//   const custom = window.STUDY_BUDDY_WS_URL;
//   if (custom) return custom + path;

//   const base = API_BASE.replace(/\/api$/, "");

//   if (base.startsWith("https://")) {
//     return base.replace("https://", "wss://") + path;
//   }

//   if (base.startsWith("http://")) {
//     return base.replace("http://", "ws://") + path;
//   }

//   return "ws://localhost:8080" + path;
// }

// const API_BASE = "http://localhost:8080";

// let authToken = localStorage.getItem("sb_token") || null;

// function setToken(token){
//   authToken = token;
//   localStorage.setItem("sb_token", token);
// }

// function getHeaders(includeJson = true){
//   const headers = {};

//   if(includeJson){
//     headers["Content-Type"] = "application/json";
//   }

//   if(authToken){
//     headers["Authorization"] = "Bearer " + authToken;
//   }

//   return headers;
// }

// export async function apiGet(path){
//   const res = await fetch(API_BASE + path, {
//     headers: getHeaders(false)
//   });
//   return await res.json();
// }

// export async function apiPost(path, body){
//   const res = await fetch(API_BASE + path, {
//     method: "POST",
//     headers: getHeaders(true),
//     body: JSON.stringify(body)
//   });
//   return await res.json();
// }

// export async function apiPatch(path, body){
//   const res = await fetch(API_BASE + path, {
//     method: "PATCH",
//     headers: getHeaders(true),
//     body: JSON.stringify(body)
//   });
//   return await res.json();
// }

// export async function register(email, password, displayName){
//   const data = await apiPost("/api/auth/register", {
//     email,
//     password,
//     displayName
//   });

//   if(data.token) setToken(data.token);
//   return data;
// }

// export async function login(email, password){
//   const data = await apiPost("/api/auth/login", {
//     email,
//     password
//   });

//   if(data.token) setToken(data.token);
//   return data;
// }

// export async function getLessons(){
//   const res = await fetch(API_BASE + "/api/lessons", {
//     headers: getHeaders(false)
//   });
//   return await res.json();
// }

// export async function createLesson(payload){
//   return await apiPost("/api/lessons", payload);
// }

// export async function updateLesson(lessonId, payload){
//   return await apiPatch(`/api/lessons/${lessonId}`, payload);
// }

// export async function uploadLessonImage(lessonId, file, itemKey){
//   const form = new FormData();
//   form.append("lessonId", lessonId);
//   form.append("kind", "item");
//   form.append("itemKey", itemKey);
//   form.append("image", file);

//   const headers = {};
//   if(authToken){
//     headers["Authorization"] = "Bearer " + authToken;
//   }

//   const res = await fetch(API_BASE + "/api/uploads/lesson-image", {
//     method: "POST",
//     headers,
//     body: form
//   });

//   return await res.json();
// }



// export function getImageUrl(path){
//   return API_BASE + path;
// }

// export async function apiDelete(path){
//   const res = await fetch(API_BASE + path, {
//     method: "DELETE",
//     headers: getHeaders(false)
//   });
//   return await res.json();
// }

// export async function deleteLesson(lessonId){
//   return await apiDelete(`/api/lessons/${lessonId}`);
// }

// export async function deleteLessonItemImage(lessonId, itemKey){
//   const q = new URLSearchParams({
//     lessonId,
//     itemKey
//   }).toString();

//   return await apiDelete(`/api/uploads/lesson-image?${q}`);
// }

// export function saveToken(token){
//   setToken(token);
// }

// export function getToken(){
//   return authToken;
// }

// export function logout(){
//   authToken = null;
//   localStorage.removeItem("sb_token");
// }

// export function wsUrl(path = "/ws"){
//   return API_BASE.replace(/^http/, "ws") + path;
// }

// const API_BASE = "http://localhost:8080";

// let authToken = localStorage.getItem("sb_token") || null;

// function setToken(token){
//   authToken = token;
//   localStorage.setItem("sb_token", token);
// }

// function getHeaders(includeJson = true){
//   const headers = {};

//   if(includeJson){
//     headers["Content-Type"] = "application/json";
//   }

//   if(authToken){
//     headers["Authorization"] = "Bearer " + authToken;
//   }

//   return headers;
// }

// export async function apiGet(path){
//   const res = await fetch(API_BASE + path, {
//     headers: getHeaders(false)
//   });
//   return await res.json();
// }

// export async function apiPost(path, body){
//   const res = await fetch(API_BASE + path, {
//     method: "POST",
//     headers: getHeaders(true),
//     body: JSON.stringify(body)
//   });
//   return await res.json();
// }

// export async function apiPatch(path, body){
//   const res = await fetch(API_BASE + path, {
//     method: "PATCH",
//     headers: getHeaders(true),
//     body: JSON.stringify(body)
//   });
//   return await res.json();
// }

// export async function register(email, password, displayName){
//   const data = await apiPost("/api/auth/register", {
//     email,
//     password,
//     displayName
//   });

//   if(data.token) setToken(data.token);
//   return data;
// }

// export async function login(email, password){
//   const data = await apiPost("/api/auth/login", {
//     email,
//     password
//   });

//   if(data.token) setToken(data.token);
//   return data;
// }

// export async function getLessons(){
//   const res = await fetch(API_BASE + "/api/lessons", {
//     headers: getHeaders(false)
//   });
//   return await res.json();
// }

// export async function createLesson(payload){
//   return await apiPost("/api/lessons", payload);
// }

// export async function updateLesson(lessonId, payload){
//   return await apiPatch(`/api/lessons/${lessonId}`, payload);
// }

// export async function uploadLessonImage(lessonId, file, itemKey){
//   const form = new FormData();
//   form.append("lessonId", lessonId);
//   form.append("kind", "item");
//   form.append("itemKey", itemKey);
//   form.append("image", file);

//   const headers = {};
//   if(authToken){
//     headers["Authorization"] = "Bearer " + authToken;
//   }

//   const res = await fetch(API_BASE + "/api/uploads/lesson-image", {
//     method: "POST",
//     headers,
//     body: form
//   });

//   return await res.json();
// }

// export function getImageUrl(path){
//   return API_BASE + path;
// }

// export function saveToken(token){
//   setToken(token);
// }

// export function getToken(){
//   return authToken;
// }

// export function logout(){
//   authToken = null;
//   localStorage.removeItem("sb_token");
// }

// export function wsUrl(path = "/ws"){
//   return API_BASE.replace(/^http/, "ws") + path;
// }

// const API_BASE = "http://localhost:8080";

// let authToken = localStorage.getItem("sb_token") || null;

// function setToken(token){
//   authToken = token;
//   localStorage.setItem("sb_token", token);
// }

// function getHeaders(includeJson = true){
//   const headers = {};

//   if(includeJson){
//     headers["Content-Type"] = "application/json";
//   }

//   if(authToken){
//     headers["Authorization"] = "Bearer " + authToken;
//   }

//   return headers;
// }

// export async function apiGet(path){
//   const res = await fetch(API_BASE + path, {
//     headers: getHeaders(false)
//   });
//   return await res.json();
// }

// export async function apiPost(path, body){
//   const res = await fetch(API_BASE + path, {
//     method: "POST",
//     headers: getHeaders(true),
//     body: JSON.stringify(body)
//   });
//   return await res.json();
// }

// export async function register(email, password, displayName){
//   const data = await apiPost("/api/auth/register", {
//     email,
//     password,
//     displayName
//   });

//   if(data.token) setToken(data.token);
//   return data;
// }

// export async function login(email, password){
//   const data = await apiPost("/api/auth/login", {
//     email,
//     password
//   });

//   if(data.token) setToken(data.token);
//   return data;
// }

// export async function getLessons(){
//   const res = await fetch(API_BASE + "/api/lessons", {
//     headers: getHeaders(false)
//   });
//   return await res.json();
// }

// export async function uploadLessonImage(lessonId, file, itemKey){
//   const form = new FormData();
//   form.append("lessonId", lessonId);
//   form.append("kind", "item");
//   form.append("itemKey", itemKey);
//   form.append("image", file);

//   const headers = {};
//   if(authToken){
//     headers["Authorization"] = "Bearer " + authToken;
//   }

//   const res = await fetch(API_BASE + "/api/uploads/lesson-image", {
//     method: "POST",
//     headers,
//     body: form
//   });

//   return await res.json();
// }

// export function getImageUrl(path){
//   return API_BASE + path;
// }

// export function saveToken(token){
//   setToken(token);
// }

// export function getToken(){
//   return authToken;
// }

// export function logout(){
//   authToken = null;
//   localStorage.removeItem("sb_token");
// }

// export function wsUrl(path="/ws"){
//   const base = API_BASE.replace("http","ws");
//   return base + path;
// }

// export const API_BASE = window.STUDY_BUDDY_API_BASE || "http://localhost:8080/api";

// export function getToken() {
//   return localStorage.getItem("sb_token") || "";
// }

// export function setToken(token) {
//   localStorage.setItem("sb_token", token);
// }

// async function parseResponse(res) {
//   const text = await res.text();
//   let data = null;
//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = { raw: text };
//   }

//   if (!res.ok) {
//     const message = data?.error || `HTTP ${res.status}`;
//     throw new Error(message);
//   }

//   return data;
// }

// export async function apiGet(path, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   });
//   return parseResponse(res);
// }

// export async function apiPost(path, body, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     body: JSON.stringify(body),
//   });
//   return parseResponse(res);
// }

// export async function apiUpload(path, formData, token = getToken()) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: formData,
//   });
//   return parseResponse(res);
// }

// export function wsUrl() {
//   const custom = window.STUDY_BUDDY_WS_URL;
//   if (custom) return custom;

//   if (location.protocol === "https:") {
//     return "wss://" + location.hostname + (location.port ? `:${location.port}` : "");
//   }
//   return "ws://localhost:8080";
// }
