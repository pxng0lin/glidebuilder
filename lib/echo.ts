import Echo from '@merit-systems/echo-next-sdk';

const appId = process.env.NEXT_PUBLIC_ECHO_APP_ID ?? '';
const environment = process.env.NEXT_PUBLIC_ECHO_ENV ?? 'sandbox';

if (!appId) {
  console.warn('[echo] NEXT_PUBLIC_ECHO_APP_ID is missing.');
}

const echo = Echo({
  appId,
  environment,
});

export const { handlers, isSignedIn, getUser, openai, anthropic, google } = echo;

export { echo };
