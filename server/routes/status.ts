import { Request, Response } from 'express';
import { ENV } from '../env';

export function vendorStatusHandler(_req: Request, res: Response) {
  res.json({
    supabase: Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_KEY),
    novita: Boolean(ENV.NOVITA_KEY),
    minimax: Boolean(ENV.NOVITA_KEY),
    gooey: Boolean(ENV.GOOEY_KEY),
  });
}
