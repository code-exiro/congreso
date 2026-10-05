// src/features/auth/api/authApi.js

import apiClient from "../../../shared/api/apiClient";

export const login = async (credentials) => {
  const response = await apiClient.post(
    "/auth/login/",
    credentials
  );

  return response.data;
};

export const getMe = async (accessToken) => {
  const response = await apiClient.get(
    "/auth/me/",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};