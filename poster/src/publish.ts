import { ApiResponseError, TwitterApi } from 'twitter-api-v2';
import { config, hasX } from './config.js';

export type XFailureKind = 'usage-cap' | 'rate-limit' | 'forbidden' | 'auth' | 'other';

/** A publish failure with X's raw error translated into something actionable. */
export class XPublishError extends Error {
  constructor(
    message: string,
    readonly kind: XFailureKind,
    /** Epoch ms when X says the limit lifts — absent when X doesn't say. */
    readonly resetAt?: number,
  ) {
    super(message);
    this.name = 'XPublishError';
  }
}

/**
 * Translates twitter-api-v2 errors into actionable messages. The one that
 * matters most: 429 UsageCapExceeded — the tier's post allowance is spent and
 * X wants money (or patience) before it accepts another post.
 */
function classify(err: unknown): Error {
  if (!(err instanceof ApiResponseError)) return err as Error;
  const body = err.data as { title?: string; detail?: string } | undefined;
  // The 24-hour per-user post limit reports via the `day` headers; the plain
  // 15-minute window via the standard ones. Prefer whichever actually ran out.
  const day = err.rateLimit?.day;
  const reset = day && day.remaining === 0 ? day.reset : err.rateLimit?.reset;
  const resetAt = reset ? reset * 1000 : undefined;
  if (err.code === 429 && body?.title === 'UsageCapExceeded') {
    return new XPublishError(
      `X post cap hit (${body.detail ?? 'usage cap exceeded'}) — the tier's post allowance is spent. ` +
        'Wait for the cap to reset or upgrade the plan at developer.x.com.',
      'usage-cap',
      resetAt,
    );
  }
  if (err.rateLimitError) {
    const when = resetAt ? ` — resets ${new Date(resetAt).toISOString()}` : '';
    return new XPublishError(`X rate limit hit (429)${when}.`, 'rate-limit', resetAt);
  }
  if (err.code === 403) {
    return new XPublishError(
      `X refused the post (403: ${body?.detail ?? err.message}) — check the app has Read+Write ` +
        'permissions and the tier allows posting.',
      'forbidden',
    );
  }
  if (err.code === 401) {
    return new XPublishError(
      'X rejected the credentials (401) — regenerate the OAuth 1.0a access token/secret ' +
        '(required after changing app permissions) and update .env.',
      'auth',
    );
  }
  return err;
}

function xClient(): TwitterApi {
  if (!hasX()) {
    throw new Error(
      'X credentials missing. Set X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET in .env.',
    );
  }
  return new TwitterApi({
    appKey: config.x.appKey,
    appSecret: config.x.appSecret,
    accessToken: config.x.accessToken,
    accessSecret: config.x.accessSecret,
  });
}

/** Publishes a text post to X. Returns the created tweet's id. */
export async function publishToX(text: string): Promise<string> {
  const client = xClient();
  try {
    const { data } = await client.v2.tweet(text);
    return data.id;
  } catch (err) {
    throw classify(err);
  }
}

/** Deletes a previously published post from X (used by the card's Delete button). */
export async function deleteFromX(tweetId: string): Promise<void> {
  const client = xClient();
  try {
    await client.v2.deleteTweet(tweetId);
  } catch (err) {
    throw classify(err);
  }
}
