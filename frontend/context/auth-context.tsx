"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { UserDto, TeamDto } from "@devpulse/shared";

interface AuthContextType {
  user: UserDto | null;
  team: TeamDto | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserDto, team?: TeamDto) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiClient.get<any>("/auth/me");
      if (res.data) {
        setUser(res.data);
        if (res.data.teams && res.data.teams.length > 0) {
          setTeam(res.data.teams[0]);
        }
      }
    } catch (err) {
      localStorage.removeItem("devpulse_token");
      setUser(null);
      setTeam(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("devpulse_token");
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (jwtToken: string, userData: UserDto, teamData?: TeamDto) => {
    localStorage.setItem("devpulse_token", jwtToken);
    setToken(jwtToken);
    setUser(userData);
    if (teamData) {
      setTeam(teamData);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem("devpulse_token");
      setUser(null);
      setTeam(null);
      setToken(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        team,
        token,
        isLoading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
