// this file is a wrapper with defaults to be used in both API routes and `getServerSideProps` functions
import { IncomingMessage, ServerResponse } from "http";
import { getIronSession, IronSessionOptions } from "iron-session";
import { withIronSessionSsr } from "iron-session/next";
import { GetServerSidePropsContext, GetServerSidePropsResult, NextApiRequest, NextApiResponse } from "next";
import { User } from "../types/User";

const sessionOptions: IronSessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  ttl: 86400, // 1 day
  cookieName: "nextjs-iron-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export const getSession = async (request : { req: NextApiRequest | IncomingMessage, res: NextApiResponse | ServerResponse }) => {
  const session = await getIronSession(request.req, request.res, sessionOptions);
  return session;
};


export const isLoggedIn = async (request : { req: NextApiRequest | IncomingMessage, res: NextApiResponse | ServerResponse }) => {
  const session = await getSession(request);
  return session.user !== undefined;
};

export const login = async (request : { req: NextApiRequest | IncomingMessage, res: NextApiResponse | ServerResponse }, user: User) => {
  const session = await getSession(request)
  session.user = user;
  await session.save();
};

export const logout = async (request : { req: NextApiRequest | IncomingMessage, res: NextApiResponse | ServerResponse }) => {
  const session = await getSession(request)
  session.destroy();
};

// Theses types are compatible with InferGetStaticPropsType https://nextjs.org/docs/basic-features/data-fetching#typescript-use-getstaticprops
export function withSessionSsr<
  P extends { [key: string]: unknown } = { [key: string]: unknown },
>(
  handler: (
    context: GetServerSidePropsContext,
  ) => GetServerSidePropsResult<P> | Promise<GetServerSidePropsResult<P>>,
) {
  return withIronSessionSsr(handler, sessionOptions);
}

// This is where we specify the typings of req.session.*
declare module "iron-session" {
  interface IronSessionData {
    user?: User;
  }
}