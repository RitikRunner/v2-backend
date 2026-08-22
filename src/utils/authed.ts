import { NextFunction, Request, RequestHandler, Response } from "express";
import { User } from "../entities/User";
import { UnauthorizedError } from "./app-error";

export type AuthedHandler = (
  user: User,
  req: Request,
  res: Response,
) => Promise<unknown> | unknown;

export function authed(handler: AuthedHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    Promise.resolve(handler(req.user, req, res)).catch(next);
  };
}
