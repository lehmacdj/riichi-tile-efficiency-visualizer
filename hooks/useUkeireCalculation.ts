import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TileDefinition, WallState } from '../types';
import { sortTiles, calculateShanten } from '../utils/mahjong';
import type { UkeireResult } from '../utils/mahjong';
import UkeireWorker from '../workers/ukeire.worker?worker';
import type { WorkerResponse } from '../workers/ukeire.worker';

export type CalculationStatus = 'idle' | 'loading' | 'ready';

export interface UkeireCalculationResult {
  shanten: number;
  ukeire: UkeireResult;
  discardResults: Map<number, UkeireResult> | null;
}

export interface UseUkeireCalculationResult {
  status: CalculationStatus;
  result: UkeireCalculationResult | null;
  getDiscardUkeire: (sortedIndex: number) => UkeireResult | null;
}

interface UseUkeireCalculationOptions {
  hand: TileDefinition[];
  wall: WallState;
}

// Track pending requests for 14-tile batch
interface PendingBatch {
  batchId: number;
  totalRequests: number;
  completedRequests: number;
  results: Map<number, UkeireResult>;
  tileToIndices: Map<string, number[]>;
}

export function useUkeireCalculation(
  options: UseUkeireCalculationOptions
): UseUkeireCalculationResult {
  const { hand, wall } = options;

  const [status, setStatus] = useState<CalculationStatus>('idle');
  const [result, setResult] = useState<UkeireCalculationResult | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingBatchRef = useRef<PendingBatch | null>(null);

  const sortedHand = useMemo(() => sortTiles(hand), [hand]);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new UkeireWorker();

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { requestId, result: workerResult } = e.data;

      const pending = pendingBatchRef.current;

      // Check if this is part of a batch (14-tile case)
      if (pending && Math.floor(requestId / 1000) === pending.batchId) {
        const localIndex = requestId % 1000;

        // Find all indices that share this tile
        let tileStr: string | null = null;
        for (const [str, indices] of pending.tileToIndices.entries()) {
          if (indices.includes(localIndex)) {
            tileStr = str;
            break;
          }
        }

        if (tileStr) {
          // Store result for all indices with this tile
          const indices = pending.tileToIndices.get(tileStr)!;
          for (const idx of indices) {
            pending.results.set(idx, workerResult);
          }
        }

        pending.completedRequests++;

        // Check if batch is complete
        if (pending.completedRequests >= pending.totalRequests) {
          setResult({
            shanten: workerResult.shanten,
            ukeire: workerResult,
            discardResults: new Map(pending.results)
          });
          setStatus('ready');
          pendingBatchRef.current = null;
        }
      } else if (requestId === requestIdRef.current) {
        // Single request (13-tile case)
        setResult({
          shanten: workerResult.shanten,
          ukeire: workerResult,
          discardResults: null
        });
        setStatus('ready');
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Trigger calculation on hand/wall change
  useEffect(() => {
    if (hand.length < 13) {
      // Not enough tiles for meaningful ukeire calculation
      const shanten = hand.length > 0 ? calculateShanten(hand) : 8;
      setResult({
        shanten,
        ukeire: { shanten, shantenImprovement: [], shapeImprovement: [] },
        discardResults: null
      });
      setStatus('ready');
      return;
    }

    setStatus('loading');
    pendingBatchRef.current = null;

    if (hand.length === 13) {
      // Single request for 13-tile hand
      const reqId = ++requestIdRef.current;

      workerRef.current?.postMessage({
        requestId: reqId,
        hand: sortedHand,
        wall
      });
    } else if (hand.length === 14) {
      // Multiple requests for 14-tile hand (one per unique discard)
      const batchId = ++requestIdRef.current;

      // Group indices by tile string for deduplication
      const tileToIndices = new Map<string, number[]>();
      for (let i = 0; i < sortedHand.length; i++) {
        const tileStr = sortedHand[i].str;
        if (!tileToIndices.has(tileStr)) {
          tileToIndices.set(tileStr, []);
        }
        tileToIndices.get(tileStr)!.push(i);
      }

      // Only send one request per unique tile
      const uniqueTiles = Array.from(tileToIndices.keys());

      pendingBatchRef.current = {
        batchId,
        totalRequests: uniqueTiles.length,
        completedRequests: 0,
        results: new Map(),
        tileToIndices
      };

      // Send requests for each unique tile
      for (let i = 0; i < uniqueTiles.length; i++) {
        const tileStr = uniqueTiles[i];
        const indices = tileToIndices.get(tileStr)!;
        const firstIndex = indices[0];

        // Create 13-tile hand by removing this tile
        const hand13 = sortedHand.filter((_, idx) => idx !== firstIndex);

        // Use batchId * 1000 + local index for unique request ID
        const reqId = batchId * 1000 + firstIndex;

        workerRef.current?.postMessage({
          requestId: reqId,
          hand: hand13,
          wall
        });
      }
    }
  }, [sortedHand, wall, hand.length]);

  const getDiscardUkeire = useCallback((sortedIndex: number): UkeireResult | null => {
    if (!result?.discardResults) return null;
    return result.discardResults.get(sortedIndex) ?? null;
  }, [result]);

  return {
    status,
    result,
    getDiscardUkeire
  };
}
