import request from "supertest";
import { createApp } from "../../app";

export const app = createApp();
export const API = "/api/v1";
export const api = () => request(app);
