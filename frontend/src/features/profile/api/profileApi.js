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

export async function getProfileCatalogs(accessToken) {
  const { data } = await apiClient.get("/catalogs/profile/", authConfig(accessToken));
  return data;
}

export async function getStatesByCountry(accessToken, countryId) {
  if (!countryId) return [];
  const { data } = await apiClient.get("/catalogs/states/", {
    ...authConfig(accessToken),
    params: { country: countryId },
  });
  return Array.isArray(data) ? data : [];
}

export async function getCampusesByInstitution(accessToken, institutionId) {
  if (!institutionId) return [];
  const { data } = await apiClient.get("/catalogs/campuses/", {
    ...authConfig(accessToken),
    params: { institution: institutionId },
  });
  return Array.isArray(data) ? data : [];
}

export async function changeOwnPassword(accessToken, payload) {
  const { data } = await apiClient.post("/auth/change-password/", payload, authConfig(accessToken));
  return data;
}

export async function changeOwnEmail(accessToken, payload) {
  const { data } = await apiClient.post("/auth/change-email/", payload, authConfig(accessToken));
  return data;
}
