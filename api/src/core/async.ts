import type { NextFunction, Request, Response } from "express";

// Express 4 does not catch rejected promises in handlers. Wrap every async
// route so errors reach the error middleware in index.ts instead of hanging.
export function ah(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
