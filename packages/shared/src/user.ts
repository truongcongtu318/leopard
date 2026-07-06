import type { VehicleType } from "./order";

export const roles = ["CUSTOMER", "DRIVER", "ADMIN"] as const;

export type Role = (typeof roles)[number];

export const driverAvailabilities = ["AVAILABLE", "BUSY", "OFFLINE"] as const;

export type DriverAvailability = (typeof driverAvailabilities)[number];

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: UserDto;
}

export interface DriverProfileDto {
  id: string;
  userId: string;
  vehicleType: VehicleType;
  availability: DriverAvailability;
  licensePlate: string | null;
}
