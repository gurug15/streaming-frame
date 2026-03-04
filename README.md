# Streaming Server Backend

A simple TypeScript Express backend running on port 5000 with JWT authentication.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables (optional):
   ```bash
   export PORT=5000
   export JWT_SECRET=your_secret
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```

## APIs

The backend exposes two GET endpoints under `/api/stream`:

- `GET /api/stream/trajectory/:trajectory` – fetch metadata or all frames for a trajectory.
- `GET /api/stream/trajectory/:trajectory/offset/:fetchStart/:fetchEnd` – retrieve frames in a given offset range.

Both return a JSON object matching the `FrameResponse` shape:

```ts
export interface FrameResponse {
  frames: Frame[];
  boxes: { [key: string]: number }[];
  times: number[];
  timeOffset: number;
  deltaTime: number;
}
```

