import type { ToolId } from '../../sim/types';
import { ROAD_TOOLS, type ToolOptions } from '../port';
import { FlyoverTool } from './flyoverTool';
import { RoadTool } from './roadTool';
import { isRoadAct, JunctionTool, LineTool, ParkTool, RemoveTool, RoadActTool } from './tapTools';
import type { Tool, ToolCtx } from './tool';

/** The tool the player has picked up. */
export function makeTool(id: ToolId, o: ToolOptions, ctx: ToolCtx): Tool | null {
  const road = ROAD_TOOLS[id];
  if (road) return new RoadTool(ctx, road, o.oneWay ?? false);
  if (isRoadAct(id)) return new RoadActTool(ctx, id);
  switch (id) {
    case 'remove': return new RemoveTool(ctx);
    case 'junction': return new JunctionTool(ctx);
    case 'flyover': return new FlyoverTool(ctx, 1);
    case 'underpass': return new FlyoverTool(ctx, -1);
    case 'parking': return new ParkTool(ctx, o.park ?? 'lot');
    case 'bus': return new LineTool(ctx, o.express ? 'express' : 'bus');
    case 'tram': case 'metro': case 'boat': return new LineTool(ctx, id);
    default: return null; // 'zone' is the UI's alone
  }
}

/** Tools that sink the buildings while in hand. */
export const sinks = (id: ToolId | null): boolean => id !== null && id !== 'zone' && id !== 'junction';
