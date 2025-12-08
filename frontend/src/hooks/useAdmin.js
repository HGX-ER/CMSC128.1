// frontend/src/hooks/useAdmin.js

import { useState, useMemo, useCallback } from "react";
import api from "../lib/api";

export function useAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // FETCH ALL USERS - GET /api/admin/users
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.get("/api/admin/users");

      // Map backend fields to frontend fields
      const mappedUsers = data.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.full_name || "",
        role: u.role,
        department: u.specialty || "",
        room: u.room || "",
        floor: u.floor || "",
        status: u.status || "active",
        email: u.email || "",
        phone: u.phone || "",
      }));

      setUsers(mappedUsers);
      return { success: true, data: mappedUsers };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to load users";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // CREATE USER - POST /api/admin/users
  const createUser = useCallback(
    async (userData) => {
      try {
        setLoading(true);

        // Map frontend fields to backend fields
        const backendPayload = {
          username: userData.username?.toLowerCase(),
          password: userData.password,
          role: userData.role,
          full_name: userData.name,
          specialty: userData.department || null,
          room: userData.room || null,
          floor: userData.floor || null,
          email: userData.email || null,
          phone: userData.phone || null,
        };

        const { data } = await api.post(
          "/api/admin/users",
          backendPayload
        );

        await loadUsers(); // Refresh the list
        return { success: true, data };
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to create user";
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [loadUsers]
  );

  // UPDATE USER - PUT /api/admin/users/:id
  const updateUser = useCallback(
    async (id, userData) => {
      try {
        setLoading(true);

        // Map frontend fields to backend fields
        const backendPayload = {
          full_name: userData.name,
          specialty: userData.department || null,
          room: userData.room || null,
          floor: userData.floor || null,
          role: userData.role,
          email: userData.email || null,
          phone: userData.phone || null,
          status: userData.status || "active",
        };

        const { data } = await api.put(
          `/api/admin/users/${id}`,
          backendPayload
        );

        await loadUsers(); // Refresh the list
        return { success: true, data };
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to update user";
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [loadUsers]
  );

  // DELETE USER - DELETE /api/admin/users/:id
  const deleteUser = useCallback(
    async (id) => {
      try {
        setLoading(true);

        const { data } = await api.delete(
          `/api/admin/users/${id}`
        );

        await loadUsers(); // Refresh the list
        return { success: true, data };
      } catch (err) {
        const errorMsg =
          err.response?.data?.error || "Failed to delete user";
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [loadUsers]
  );

  // TOGGLE USER STATUS - PUT /api/admin/users/:id/status
  const toggleUserStatus = useCallback(
    async (id) => {
      try {
        setLoading(true);

        const user = users.find((u) => u.id === id);
        if (!user) {
          return { success: false, error: "User not found" };
        }

        const newStatus =
          user.status === "active" ? "inactive" : "active";

        const { data } = await api.put(
          `/api/admin/users/${id}`,
          {
            full_name: user.name,
            specialty: user.department,
            room: user.room,
            floor: user.floor,
            role: user.role,
            status: newStatus,
          }
        );

        await loadUsers();
        return { success: true, data, newStatus };
      } catch (err) {
        const errorMsg =
          err.response?.data?.error ||
          "Failed to toggle user status";
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [users, loadUsers]
  );

  // RESET PASSWORD - PUT /api/admin/users/:id/password
  const resetPassword = useCallback(
    async (id, newPassword) => {
      try {
        setLoading(true);

        const { data } = await api.put(
          `/api/admin/users/${id}/password`,
          {
            password: newPassword,
          }
        );

        return { success: true, data };
      } catch (err) {
        const errorMsg =
          err.response?.data?.error ||
          "Failed to reset password";
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return useMemo(
    () => ({
      loading,
      error,
      users,
      loadUsers,
      createUser,
      updateUser,
      deleteUser,
      toggleUserStatus,
      resetPassword,
    }),
    [
      loading,
      error,
      users,
      loadUsers,
      createUser,
      updateUser,
      deleteUser,
      toggleUserStatus,
      resetPassword,
    ]
  );
}
