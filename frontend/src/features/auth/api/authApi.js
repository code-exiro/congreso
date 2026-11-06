import apiClient from "../../../shared/api/apiClient";

export async function login({ email, password }) {
  const { data } = await apiClient.post("/auth/login/", {
    email,
    password,
  });

  return data;
}

export async function getMe(accessToken) {
  const { data } = await apiClient.get("/auth/me/", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data;
}