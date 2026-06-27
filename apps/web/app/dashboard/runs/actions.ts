'use server';

import { api } from '../../../lib/api';

export async function getRunDetails(runId: string) {
  try {
    return await api.runs.detail(runId);
  } catch (err) {
    console.error(`Error in getRunDetails server action for runId ${runId}:`, err);
    throw err;
  }
}
