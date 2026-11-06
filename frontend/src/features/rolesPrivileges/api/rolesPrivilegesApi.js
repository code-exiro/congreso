import apiClient from "../../../shared/api/apiClient";

function authOptions(accessToken) {
  return {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}

export async function listAdminUsers(accessToken) {
  const { data } = await apiClient.get(
    "/admin/users/",
    authOptions(accessToken),
  );
  return data;
}

export async function updateAdminUserRoles(accessToken, userId, payload) {
  const body = Array.isArray(payload) ? { role_ids: payload } : payload;
  const { data } = await apiClient.put(
    `/admin/users/${userId}/roles/`,
    body,
    authOptions(accessToken),
  );
  return data;
}

export async function listAdminRoles(accessToken) {
  const { data } = await apiClient.get(
    "/admin/roles/",
    authOptions(accessToken),
  );
  return data;
}

export async function createAdminRole(accessToken, payload) {
  const { data } = await apiClient.post(
    "/admin/roles/",
    payload,
    authOptions(accessToken),
  );
  return data;
}

export async function updateAdminRole(accessToken, roleId, payload) {
  const { data } = await apiClient.patch(
    `/admin/roles/${roleId}/`,
    payload,
    authOptions(accessToken),
  );
  return data;
}

export async function listAdminPrivileges(accessToken) {
  const { data } = await apiClient.get(
    "/admin/privileges/",
    authOptions(accessToken),
  );
  return data;
}
