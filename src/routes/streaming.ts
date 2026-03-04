import { Router, Request, Response } from 'express';

const router = Router();

// types returned by the streaming APIs
export interface Frame {
  // placeholder properties – adjust to your real data
  id: number;
  data: any;
}

export interface FrameResponse {
  frames: Frame[];
  boxes: { [key: string]: number }[];
  times: number[];
  timeOffset: number;
  deltaTime: number;
}

// GET /trajectory/:trajectory                  -> metadata or all frames
router.get('/trajectory/:entry/start', (req: Request, res: Response) => {
  const traj = req.params.trajectory;

  // dummy response; replace with actual logic
  const response: FrameResponse = {
    frames: [],
    boxes: [],
    times: [],
    timeOffset: 0,
    deltaTime: 0,
  };

  res.json(response);
});

// GET /trajectory/:trajectory/offset/:fetchStart/:fetchEnd
router.get(
  '/trajectory/:trajectory/offset/:fetchStart/:fetchEnd',
  (req: Request, res: Response) => {
    const traj = req.params.trajectory;
    const start = parseFloat(req.params.fetchStart);
    const end = parseFloat(req.params.fetchEnd);

    // placeholder logic – replace with real data retrieval
    const response: FrameResponse = {
      frames: [],
      boxes: [],
      times: [],
      timeOffset: start,
      deltaTime: end - start,
    };

    res.json(response);
  },
);

export default router;