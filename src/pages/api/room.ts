import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "../../server/db/client";

const room = async (req: NextApiRequest, res: NextApiResponse) => {
  const examples = await prisma.meetingRoom.findMany();
  res.status(200).json(examples);
};

export default room;
