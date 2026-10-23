import apiClient from "../../../shared/api/apiClient";

function authOptions(accessToken) {
  return {
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}

export async function listAdminLegalDocuments(accessToken) {
  const { data } = await apiClient.get(
    "/admin/legal-documents/",
    authOptions(accessToken),
  );
  return data;
}

export async function createAdminLegalDocument(accessToken, formData) {
  // Axios/browser gestiona multipart/form-data y su boundary automáticamente.
  const { data } = await apiClient.post(
    "/admin/legal-documents/",
    formData,
    authOptions(accessToken),
  );
  return data;
}

export async function updateAdminLegalDocument(accessToken, id, formData) {
  const { data } = await apiClient.patch(
    `/admin/legal-documents/${id}/`,
    formData,
    authOptions(accessToken),
  );
  return data;
}

export async function publishAdminLegalDocument(accessToken, id) {
  const { data } = await apiClient.post(
    `/admin/legal-documents/${id}/publish/`,
    {},
    authOptions(accessToken),
  );
  return data;
}

export async function deactivateAdminLegalDocument(accessToken, id) {
  const { data } = await apiClient.post(
    `/admin/legal-documents/${id}/deactivate/`,
    {},
    authOptions(accessToken),
  );
  return data;
}
