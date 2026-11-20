import apiClient from "../../../shared/api/apiClient";

function authConfig(accessToken) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

export async function getOwnProfile(accessToken) {
  const { data } = await apiClient.get("/auth/profile/", authConfig(accessToken));
  return data;
}

export async function updateOwnProfile(accessToken, payload) {
  const { data } = await apiClient.patch("/auth/profile/", payload, authConfig(accessToken));
  return data;
}
