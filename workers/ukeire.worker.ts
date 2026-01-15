// Web Worker for ukeire calculations
// Single responsibility: calculate ukeire for a 13-tile hand

import { TileDefinition, WallState } from '../types';
import { calculateHandUkeire } from '../utils/mahjong/_expensive';
import type { UkeireResult } from '../utils/mahjong';

export interface WorkerRequest {
  requestId: number;
  hand: TileDefinition[];  // Always 13 tiles
  wall: WallState;
}

export interface WorkerResponse {
  requestId: number;
  result: UkeireResult;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { requestId, hand, wall } = e.data;

  const result = calculateHandUkeire(hand, wall);

  const response: WorkerResponse = { requestId, result };
  self.postMessage(response);
};
