import axios from "axios";

// VITE_API_URL admite tanto https://servidor/api como https://servidor.
const configuredUrl = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const baseURL = configuredUrl.endsWith("/api")
  ? configuredUrl
  : `${configuredUrl}/api`;

const apiClient = axios.create({ baseURL });

// No forzar application/json: las cargas FormData necesitan que Axios
// construya Content-Type: multipart/form-data con el boundary correcto.
export default apiClient;
