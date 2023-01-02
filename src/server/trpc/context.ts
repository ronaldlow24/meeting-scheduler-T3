import { type inferAsyncReturnType } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

import { prisma } from "../db/client";


export const createContext = async (opts: CreateNextContextOptions) => {
  const request = { req : opts.req, res : opts.res};
 
  return {
    prisma,
    request,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;
