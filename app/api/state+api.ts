import {
  errorMessage,
  forbidden,
  getAuthContext,
  json,
  touchUser,
  unauthorized,
} from '../../lib/api';
import { loadAppState } from '../../lib/state';

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    if (!context) return unauthorized();
    if (context.profile.status === 'suspended') {
      return forbidden('This account is suspended. Please contact the administrator.');
    }

    await touchUser(context.profile.id);
    const { state, revision } = await loadAppState(context.profile.id);

    return json({
      state,
      revision,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ error: errorMessage(error, 'Unable to load your data.') }, 500);
  }
}
