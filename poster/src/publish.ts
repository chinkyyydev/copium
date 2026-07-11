import { TwitterApi } from 'twitter-api-v2';
import { config, hasX } from './config.js';

/** Publishes a text post to X. Returns the created tweet's id. */
export async function publishToX(text: string): Promise<string> {
  if (!hasX()) {
    throw new Error(
      'X credentials missing. Set X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_SECRET in .env.',
    );
  }
  const client = new TwitterApi({
    appKey: config.x.appKey,
    appSecret: config.x.appSecret,
    accessToken: config.x.accessToken,
    accessSecret: config.x.accessSecret,
  });
  const { data } = await client.v2.tweet(text);
  return data.id;
}
